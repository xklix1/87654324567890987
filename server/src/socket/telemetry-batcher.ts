import { SocketServer } from './socket.server';
import { DeltaUpdate } from '../types';

export class TelemetryBatcher {
  private static buffer: DeltaUpdate[] = [];
  private static intervalTimer: NodeJS.Timeout | null = null;
  private static BATCH_INTERVAL_MS = 1500; // 1.5 seconds throttling window

  public static start(): void {
    if (this.intervalTimer) return;

    this.intervalTimer = setInterval(() => {
      this.flush();
    }, this.BATCH_INTERVAL_MS);

    process.stdout.write('[TelemetryBatcher] High-frequency telemetry batching and throttling engine started (1.5s interval).\n');
  }

  public static stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.buffer = [];
  }

  /**
   * Queue a delta update to be batched and emitted
   */
  public static queueDelta(delta: DeltaUpdate): void {
    // Deduplicate: If an update for the same entity & field exists in buffer, update it in place
    const existingIndex = this.buffer.findIndex(
      (d) => d.type === delta.type && d.entity_id === delta.entity_id && d.field === delta.field
    );

    if (existingIndex >= 0) {
      this.buffer[existingIndex] = delta;
    } else {
      this.buffer.push(delta);
    }
  }

  /**
   * Flush queued updates to connected clients in room:telemetry
   */
  public static flush(): void {
    if (this.buffer.length === 0) return;

    const io = SocketServer.getIo();
    if (!io) return;

    const updates = [...this.buffer];
    this.buffer = [];

    // Broadcast batched delta updates to clients subscribed to room:telemetry
    io.to('room:telemetry').emit('telemetry:batch', {
      timestamp: Date.now(),
      count: updates.length,
      updates,
    });
  }

  /**
   * Send an immediate single mutated delta update to an individual user
   */
  public static sendDirectUserDelta(userId: string, delta: DeltaUpdate): void {
    const io = SocketServer.getIo();
    if (io) {
      io.to(`room:user:${userId}`).emit('telemetry:delta', delta);
    }
  }
}
