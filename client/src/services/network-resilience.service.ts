/**
 * Network Resilience & Latency Engine
 * Measures RTT latency, calibrates clock offset, detects connection drops vs weak signal,
 * dynamically adjusts request timeouts, and manages exponential backoff reconnect counters.
 */

export interface LatencyState {
  latencyMs: number;
  rttMs: number;
  isHighLatency: boolean; // Latency > 500ms
  signalQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'WEAK' | 'CRITICAL';
}

export type LatencyListener = (state: LatencyState) => void;
export type DisconnectionListener = (isDisconnected: boolean, retryAttempt: number, nextRetryMs: number) => void;

export class NetworkResilienceService {
  private static clockOffset: number = 0; // serverTime - localTime
  private static lastLatency: LatencyState = {
    latencyMs: 35,
    rttMs: 70,
    isHighLatency: false,
    signalQuality: 'EXCELLENT',
  };

  private static isDisconnected: boolean = false;
  private static retryAttempt: number = 0;
  private static nextRetryMs: number = 0;
  private static retryTimer: NodeJS.Timeout | null = null;
  private static countdownTimer: NodeJS.Timeout | null = null;

  private static latencyListeners: Set<LatencyListener> = new Set();
  private static disconnectionListeners: Set<DisconnectionListener> = new Set();

  /**
   * Set official server timestamp to calibrate Android device clock offset
   */
  public static setServerTimestamp(serverTimestampMs: number): void {
    const localNow = Date.now();
    this.clockOffset = serverTimestampMs - localNow;
  }

  /**
   * Get current server time calibrated using clock offset
   */
  public static getCalibratedServerTime(): number {
    return Date.now() + this.clockOffset;
  }

  public static getClockOffset(): number {
    return this.clockOffset;
  }

  /**
   * Record Ping-Pong result and compute RTT & Latency
   */
  public static recordHeartbeat(clientTime: number, serverTime?: number): void {
    const now = Date.now();
    const rtt = Math.max(1, now - clientTime);
    const latency = Math.round(rtt / 2);

    if (serverTime) {
      // Re-calibrate clock offset taking half RTT into account
      this.clockOffset = serverTime - (clientTime + latency);
    }

    let signalQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'WEAK' | 'CRITICAL' = 'EXCELLENT';
    if (latency > 1000) signalQuality = 'CRITICAL';
    else if (latency > 500) signalQuality = 'WEAK';
    else if (latency > 250) signalQuality = 'FAIR';
    else if (latency > 100) signalQuality = 'GOOD';

    this.lastLatency = {
      latencyMs: latency,
      rttMs: rtt,
      isHighLatency: latency > 500,
      signalQuality,
    };

    // If previously marked disconnected, clear it on successful heartbeat
    if (this.isDisconnected) {
      this.setDisconnected(false);
    }

    this.notifyLatencyListeners();
  }

  /**
   * Return dynamically calculated HTTP/Socket timeout based on latency conditions
   */
  public static getDynamicTimeout(): number {
    if (this.lastLatency.isHighLatency) {
      // Scale timeout up to 35 seconds during high latency / weak signal
      return Math.min(45000, Math.max(30000, this.lastLatency.latencyMs * 40));
    }
    return 12000; // Standard 12s timeout
  }

  public static getLatencyState(): LatencyState {
    return this.lastLatency;
  }

  public static getIsDisconnected(): boolean {
    return this.isDisconnected;
  }

  public static getRetryAttempt(): number {
    return this.retryAttempt;
  }

  public static getNextRetryMs(): number {
    return this.nextRetryMs;
  }

  /**
   * Trigger disconnection state with exponential backoff retry calculation
   */
  public static setDisconnected(disconnected: boolean, onRetryCallback?: () => void): void {
    this.isDisconnected = disconnected;

    if (!disconnected) {
      this.retryAttempt = 0;
      this.nextRetryMs = 0;
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
      this.notifyDisconnectionListeners();
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, up to 15s max
    this.retryAttempt += 1;
    const backoffSeconds = Math.min(15, Math.pow(2, Math.min(4, this.retryAttempt - 1)));
    this.nextRetryMs = backoffSeconds * 1000;

    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);

    // Countdown tick every 200ms for smooth UI display
    const targetTime = Date.now() + this.nextRetryMs;
    this.countdownTimer = setInterval(() => {
      this.nextRetryMs = Math.max(0, targetTime - Date.now());
      this.notifyDisconnectionListeners();
      if (this.nextRetryMs <= 0 && this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
    }, 200);

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (onRetryCallback) {
        onRetryCallback();
      }
    }, backoffSeconds * 1000);

    this.notifyDisconnectionListeners();
  }

  public static onLatencyChange(listener: LatencyListener): () => void {
    this.latencyListeners.add(listener);
    listener(this.lastLatency);
    return () => this.latencyListeners.delete(listener);
  }

  public static onDisconnectionChange(listener: DisconnectionListener): () => void {
    this.disconnectionListeners.add(listener);
    listener(this.isDisconnected, this.retryAttempt, this.nextRetryMs);
    return () => this.disconnectionListeners.delete(listener);
  }

  private static notifyLatencyListeners(): void {
    this.latencyListeners.forEach((fn) => fn(this.lastLatency));
  }

  private static notifyDisconnectionListeners(): void {
    this.disconnectionListeners.forEach((fn) =>
      fn(this.isDisconnected, this.retryAttempt, this.nextRetryMs)
    );
  }
}
