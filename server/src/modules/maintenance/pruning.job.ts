import { pool, getIsPostgresAvailable } from '../../db/pool';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { AntiReplayService } from '../security/anti-replay.service';

export class MaintenancePruningJob {
  private static timer: NodeJS.Timeout | null = null;
  private static PRUNING_INTERVAL_MS = 60 * 60 * 1000; // Run every 1 hour

  public static start(): void {
    if (this.timer) return;

    // Run first pruning cycle after 30 seconds, then every hour
    setTimeout(() => {
      this.executePruningCycle().catch((err: unknown) => {
        process.stderr.write(`[MaintenanceJob] Initial pruning cycle error: ${String(err)}\n`);
      });
    }, 30000);

    this.timer = setInterval(() => {
      this.executePruningCycle().catch((err: unknown) => {
        process.stderr.write(`[MaintenanceJob] Scheduled pruning cycle error: ${String(err)}\n`);
      });
    }, this.PRUNING_INTERVAL_MS);

    process.stdout.write('[MaintenanceJob] Database bloat pruning background job scheduled (1h interval).\n');
  }

  public static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public static async executePruningCycle(): Promise<{
    idempotencyKeysPruned: number;
    noncesPruned: number;
    chatMessagesPruned: number;
    sinkLogsPruned: number;
  }> {
    process.stdout.write('[MaintenanceJob] Starting database maintenance and bloat pruning cycle...\n');

    // 1. Purge expired idempotency keys (>24h)
    const idempotencyKeysPruned = await IdempotencyService.pruneExpiredKeys();

    // 2. Purge expired security nonces
    const noncesPruned = await AntiReplayService.pruneExpiredNonces();

    // 3. Trim routine chat messages (keep last 500 messages per channel or purge older than 14 days)
    let chatMessagesPruned = 0;
    if (getIsPostgresAvailable()) {
      try {
        const chatRes = await pool.query(
          "DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL '14 DAYS'"
        );
        chatMessagesPruned = chatRes.rowCount || 0;
      } catch (err: unknown) {
        process.stderr.write(`[MaintenanceJob] Error pruning old chat messages in Postgres: ${String(err)}\n`);
      }
    }

    // 4. Trim routine economic sink transaction logs older than 30 days
    let sinkLogsPruned = 0;
    if (getIsPostgresAvailable()) {
      try {
        const sinkRes = await pool.query(
          `DELETE FROM transactions 
           WHERE type LIKE 'ECONOMIC_SINK_%' 
             AND created_at < NOW() - INTERVAL '30 DAYS'`
        );
        sinkLogsPruned = sinkRes.rowCount || 0;
      } catch (err: unknown) {
        process.stderr.write(`[MaintenanceJob] Error pruning routine sink logs in Postgres: ${String(err)}\n`);
      }
    }

    process.stdout.write(
      `[MaintenanceJob] Pruning cycle complete: ${idempotencyKeysPruned} idempotency keys, ${noncesPruned} nonces, ${chatMessagesPruned} chat messages, ${sinkLogsPruned} sink records pruned.\n`
    );

    return {
      idempotencyKeysPruned,
      noncesPruned,
      chatMessagesPruned,
      sinkLogsPruned,
    };
  }
}
