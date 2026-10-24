import { io, Socket } from 'socket.io-client';
import { ChatMessageRecord, LeaderboardEntry } from '../types/social';
import { NetworkResilienceService } from './network-resilience.service';

export type SocketStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface ChatNotification {
  message: string;
  sender_id: string;
  sender_username: string;
  created_at: string;
}

export interface DeltaPayload {
  type: 'STOCK_TICK' | 'BALANCE_DIFF' | 'LEADERBOARD_RANK' | 'SYSTEM_ALERT';
  entity_id: string;
  field: string;
  value: number | string | boolean;
  diff?: number;
  timestamp: number;
}

export type MessageListener = (message: ChatMessageRecord) => void;
export type NotificationListener = (notification: ChatNotification) => void;
export type LeaderboardListener = (entries: LeaderboardEntry[]) => void;
export type StatusListener = (status: SocketStatus) => void;
export type DeltaListener = (delta: DeltaPayload) => void;
export type SessionRevokedListener = (reason: string) => void;

export class SocketService {
  private static instance: Socket | null = null;
  private static currentToken: string | null = null;
  private static heartbeatInterval: NodeJS.Timeout | null = null;

  private static messageListeners: Set<MessageListener> = new Set();
  private static notificationListeners: Set<NotificationListener> = new Set();
  private static leaderboardListeners: Set<LeaderboardListener> = new Set();
  private static statusListeners: Set<StatusListener> = new Set();
  private static deltaListeners: Set<DeltaListener> = new Set();
  private static sessionRevokedListeners: Set<SessionRevokedListener> = new Set();

  private static currentStatus: SocketStatus = 'disconnected';

  public static getStatus(): SocketStatus {
    return this.currentStatus;
  }

  private static updateStatus(status: SocketStatus): void {
    this.currentStatus = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  public static connect(token: string): void {
    this.currentToken = token;

    if (this.instance) {
      if (this.instance.connected) return;
      this.instance.disconnect();
    }

    this.updateStatus('connecting');

    const serverUrl =
      window.location.port === '3000'
        ? `${window.location.protocol}//${window.location.hostname}:5000`
        : window.location.origin;

    const socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => {
      this.updateStatus('connected');
      NetworkResilienceService.setDisconnected(false);
      this.startHeartbeat();
    });

    socket.on('disconnect', () => {
      this.updateStatus('disconnected');
      this.stopHeartbeat();
      NetworkResilienceService.setDisconnected(true, () => {
        this.reconnect();
      });
    });

    socket.on('connect_error', () => {
      this.updateStatus('error');
      NetworkResilienceService.setDisconnected(true, () => {
        this.reconnect();
      });
    });

    // 1. WebSocket Heartbeat: listen for pong from server
    socket.on('system:pong', (payload: { client_time: number; server_time: number }) => {
      NetworkResilienceService.recordHeartbeat(payload.client_time, payload.server_time);
    });

    // 2. Single Active Session Eviction
    socket.on('session:invalidated', (payload: { reason: string; message: string }) => {
      this.sessionRevokedListeners.forEach((fn) => fn(payload.reason || 'LOGGED_IN_FROM_ANOTHER_DEVICE'));
    });

    // 3. Telemetry Batched Updates
    socket.on('telemetry:batch', (data: { timestamp: number; updates: DeltaPayload[] }) => {
      if (data && Array.isArray(data.updates)) {
        data.updates.forEach((delta) => {
          this.deltaListeners.forEach((fn) => fn(delta));
        });
      }
    });

    // 4. Single Delta Mutated Field
    socket.on('telemetry:delta', (delta: DeltaPayload) => {
      this.deltaListeners.forEach((fn) => fn(delta));
    });

    // Chat and Social
    socket.on('chat:message', (msg: ChatMessageRecord) => {
      this.messageListeners.forEach((listener) => listener(msg));
    });

    socket.on('notification:direct_message', (notif: ChatNotification) => {
      this.notificationListeners.forEach((listener) => listener(notif));
    });

    socket.on('leaderboard:update', (data: { leaderboard: LeaderboardEntry[] } | LeaderboardEntry[]) => {
      const list = Array.isArray(data) ? data : data?.leaderboard;
      if (Array.isArray(list)) {
        this.leaderboardListeners.forEach((listener) => listener(list));
      }
    });

    this.instance = socket;
  }

  public static reconnect(): void {
    if (this.instance) {
      this.instance.connect();
    } else if (this.currentToken) {
      this.connect(this.currentToken);
    }
  }

  public static disconnect(): void {
    this.stopHeartbeat();
    if (this.instance) {
      this.instance.disconnect();
      this.instance = null;
    }
    this.updateStatus('disconnected');
  }

  // --- Real-Time Heartbeat Loop ---
  private static startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.instance && this.instance.connected) {
        this.instance.emit('system:ping', { client_time: Date.now() });
      }
    }, 3500); // Send heartbeat every 3.5s
  }

  private static stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // --- Background Lifecycle Telemetry Pause / Resume ---
  public static pauseTelemetry(): void {
    if (this.instance && this.instance.connected) {
      this.instance.emit('telemetry:pause');
    }
  }

  public static resumeTelemetry(): void {
    if (this.instance && this.instance.connected) {
      this.instance.emit('telemetry:resume');
    }
  }

  public static sendChatMessage(
    channel: 'GLOBAL' | 'DIRECT',
    content: string,
    receiver_id?: string
  ): void {
    if (this.instance && this.instance.connected) {
      this.instance.emit('chat:send', { channel, content, receiver_id });
    }
  }

  public static requestLeaderboard(): void {
    if (this.instance && this.instance.connected) {
      this.instance.emit('leaderboard:get');
    }
  }

  public static onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  public static onNotification(listener: NotificationListener): () => void {
    this.notificationListeners.add(listener);
    return () => this.notificationListeners.delete(listener);
  }

  public static onLeaderboard(listener: LeaderboardListener): () => void {
    this.leaderboardListeners.add(listener);
    return () => this.leaderboardListeners.delete(listener);
  }

  public static onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  public static onDelta(listener: DeltaListener): () => void {
    this.deltaListeners.add(listener);
    return () => this.deltaListeners.delete(listener);
  }

  public static onSessionRevoked(listener: SessionRevokedListener): () => void {
    this.sessionRevokedListeners.add(listener);
    return () => this.sessionRevokedListeners.delete(listener);
  }
}
