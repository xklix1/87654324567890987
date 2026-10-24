import { pool, getIsPostgresAvailable } from '../../db/pool';

export class AntiReplayService {
  private static memNonces = new Map<string, { userId?: string; timestamp: number; expiresAt: number }>();
  private static MAX_SKEW_MS = 30000; // 30 seconds
  private static NONCE_TTL_MS = 60000; // 60 seconds

  /**
   * Validate timestamp against server clock and verify nonce uniqueness
   */
  public static async validateRequest(
    nonce: string,
    requestTimestamp: number,
    userId?: string
  ): Promise<{ valid: boolean; error?: string; code?: string }> {
    const serverNow = Date.now();
    const skew = Math.abs(serverNow - requestTimestamp);

    // 1. Check timestamp age / skew
    if (skew > this.MAX_SKEW_MS) {
      return {
        valid: false,
        error: `Request expired or clock out of sync. Client timestamp delta is ${skew}ms (exceeds ${this.MAX_SKEW_MS}ms threshold).`,
        code: 'REQUEST_TIMESTAMP_EXPIRED',
      };
    }

    // 2. Check nonce in memory
    const existing = this.memNonces.get(nonce);
    if (existing && existing.expiresAt > serverNow) {
      return {
        valid: false,
        error: 'Security replay attack detected. Reused request nonce.',
        code: 'REPLAY_ATTACK_DETECTED',
      };
    }

    // 3. Check nonce in PostgreSQL if available
    if (getIsPostgresAvailable()) {
      try {
        const queryRes = await pool.query(
          'SELECT nonce FROM security_nonces WHERE nonce = $1 LIMIT 1',
          [nonce]
        );
        if (queryRes.rows.length > 0) {
          return {
            valid: false,
            error: 'Security replay attack detected. Reused request nonce.',
            code: 'REPLAY_ATTACK_DETECTED',
          };
        }

        // Store nonce in Postgres
        await pool.query(
          `INSERT INTO security_nonces (nonce, user_id, timestamp, created_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (nonce) DO NOTHING`,
          [nonce, userId || null, requestTimestamp]
        );
      } catch (err: unknown) {
        // Fall back to memory map
      }
    }

    // 4. Save nonce in memory
    this.memNonces.set(nonce, {
      userId,
      timestamp: requestTimestamp,
      expiresAt: serverNow + this.NONCE_TTL_MS,
    });

    return { valid: true };
  }

  /**
   * Periodic pruning of expired nonces
   */
  public static async pruneExpiredNonces(): Promise<number> {
    const serverNow = Date.now();
    let memPruned = 0;
    for (const [nonce, item] of this.memNonces.entries()) {
      if (item.expiresAt <= serverNow) {
        this.memNonces.delete(nonce);
        memPruned++;
      }
    }

    let pgPruned = 0;
    if (getIsPostgresAvailable()) {
      try {
        const res = await pool.query(
          "DELETE FROM security_nonces WHERE created_at < NOW() - INTERVAL '2 MINUTES'"
        );
        pgPruned = res.rowCount || 0;
      } catch {
        // Silent fallback
      }
    }

    return Math.max(memPruned, pgPruned);
  }
}
