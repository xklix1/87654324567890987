import { SocketService } from './socket.service';
import { SyncService, AuthService } from './auth-and-sync.service';
import { SyncResponseData } from '../types/sync';
import { UserProfile } from '../types/user';

export type ForegroundSyncListener = (syncing: boolean, data?: SyncResponseData | null) => void;

export class AppLifecycleService {
  private static backgroundTimestamp: number | null = null;
  private static backgroundTimer: NodeJS.Timeout | null = null;
  private static isPaused: boolean = false;
  private static isSyncing: boolean = false;
  private static syncListeners: Set<ForegroundSyncListener> = new Set();
  private static isInitialized: boolean = false;

  private static BACKGROUND_THRESHOLD_MS = 15000; // 15 seconds

  public static initialize(
    getToken: () => string | null,
    onStateSynced: (data: SyncResponseData, profile: UserProfile) => void,
    onSessionRevoked: () => void
  ): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Standard HTML5 Page Visibility API
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.handleEnterBackground();
      } else if (document.visibilityState === 'visible') {
        this.handleResumeForeground(getToken, onStateSynced, onSessionRevoked);
      }
    });

    // 2. Native Capacitor App State Listener (if running inside Android APK)
    const win = window as unknown as {
      Capacitor?: {
        Plugins?: {
          App?: {
            addListener: (
              event: string,
              callback: (state: { isActive: boolean }) => void
            ) => Promise<unknown>;
          };
        };
      };
    };

    if (win.Capacitor?.Plugins?.App) {
      try {
        win.Capacitor.Plugins.App.addListener('appStateChange', (state) => {
          if (!state.isActive) {
            this.handleEnterBackground();
          } else {
            this.handleResumeForeground(getToken, onStateSynced, onSessionRevoked);
          }
        });
      } catch {
        // Fallback to visibilitychange
      }
    }
  }

  private static handleEnterBackground(): void {
    this.backgroundTimestamp = Date.now();

    // Start 15-second background countdown
    if (this.backgroundTimer) clearTimeout(this.backgroundTimer);
    this.backgroundTimer = setTimeout(() => {
      this.isPaused = true;
      // Pause high-frequency telemetry over socket to save VPS bandwidth and phone battery
      SocketService.pauseTelemetry();
    }, this.BACKGROUND_THRESHOLD_MS);
  }

  private static async handleResumeForeground(
    getToken: () => string | null,
    onStateSynced: (data: SyncResponseData, profile: UserProfile) => void,
    onSessionRevoked: () => void
  ): Promise<void> {
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
      this.backgroundTimer = null;
    }

    const wasBackgrounded = this.backgroundTimestamp !== null;
    const elapsed = wasBackgrounded ? Date.now() - (this.backgroundTimestamp || 0) : 0;
    this.backgroundTimestamp = null;

    // Always resume telemetry
    if (this.isPaused) {
      this.isPaused = false;
      SocketService.resumeTelemetry();
    }

    const token = getToken();
    if (!token) return;

    // Only trigger full sync lock if backgrounded for more than 2 seconds
    if (elapsed > 2000) {
      this.setSyncingState(true);

      try {
        // Execute silent sync and session verification in parallel
        const [syncData, profile] = await Promise.all([
          SyncService.syncState(token),
          AuthService.verifySession(token),
        ]);

        onStateSynced(syncData, profile);
      } catch (err: unknown) {
        const error = err as { code?: string };
        if (error?.code === 'SESSION_REVOKED' || error?.code === 'UNAUTHORIZED') {
          onSessionRevoked();
        }
      } finally {
        this.setSyncingState(false);
      }
    }
  }

  public static onSyncStateChange(listener: ForegroundSyncListener): () => void {
    this.syncListeners.add(listener);
    listener(this.isSyncing);
    return () => this.syncListeners.delete(listener);
  }

  private static setSyncingState(syncing: boolean, data?: SyncResponseData): void {
    this.isSyncing = syncing;
    this.syncListeners.forEach((fn) => fn(syncing, data));
  }
}
