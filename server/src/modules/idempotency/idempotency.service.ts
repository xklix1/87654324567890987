import crypto from 'crypto';
import { pool, getIsPostgresAvailable } from '../../db/pool';
import { IdempotencyRecord } from '../../types';

interface MemIdempotencyEntry {
  key: string;
  userId: string;
  endpoint: string;
  status: 'PROCESSING' | 'COMPLETED';
  responseStatus?: number;
  responseBody?: unknown;
  createdAt: number;
  expiresAt: number;
}

export class IdempotencyService {
  private static memStore = new Map<string, MemIdempotencyEntry>();
  private static TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Acquire an idempotency lock on a key.
   */
  public static async lockKey(
    key: string,
    userId: string,
    endpoint: string
  ): Promise<{ state: 'NEW' | 'PROCESSING' | 'COMPLETED'; record?: IdempotencyRecord }> {
    const now = Date.now();

    // 1. Check PostgreSQL if available
    if (getIsPostgresAvailable()) {
      try {
        const queryRes = await pool.query<{
          key: string;
          user_id: string;
          endpoint: string;
          response_status: number;
          response_body: unknown;
          created_at: Date;
          expires_at: Date;
        }>(
          'SELECT key, user_id, endpoint, response_status, response_body, created_at, expires_at FROM idempotency_keys WHERE key = $1 LIMIT 1',
          [key]
        );

        if (queryRes.rows.length > 0 && queryRes.rows[0]) {
          const row = queryRes.rows[0];
          return {
            state: 'COMPLETED',
            record: {
              key: row.key,
              user_id: String(row.user_id),
              endpoint: row.endpoint,
              response_status: Number(row.response_status),
              response_body: row.response_body,
              created_at: new Date(row.created_at),
              expires_at: new Date(row.expires_at),
            },
          };
        }
      } catch (err: unknown) {
        // Fallback to in-memory store
      }
    }

    // 2. Check in-memory store
    const existing = this.memStore.get(key);
    if (existing) {
      if (existing.expiresAt > now) {
        if (existing.status === 'COMPLETED') {
          return {
            state: 'COMPLETED',
            record: {
              key: existing.key,
              user_id: existing.userId,
              endpoint: existing.endpoint,
              response_status: existing.responseStatus || 200,
              response_body: existing.responseBody,
              created_at: new Date(existing.createdAt),
              expires_at: new Date(existing.expiresAt),
            },
          };
        }
        return { state: 'PROCESSING' };
      }
      this.memStore.delete(key);
    }

    // 3. Mark as PROCESSING in-memory to prevent simultaneous concurrent duplicate calls
    this.memStore.set(key, {
      key,
      userId,
      endpoint,
      status: 'PROCESSING',
      createdAt: now,
      expiresAt: now + this.TTL_MS,
    });

    return { state: 'NEW' };
  }

  /**
   * Complete and persist an idempotency key with response
   */
  public static async completeKey(
    key: string,
    userId: string,
    endpoint: string,
    statusCode: number,
    responseBody: unknown
  ): Promise<void> {
    const now = Date.now();
    const expiresAt = now + this.TTL_MS;

    // In-memory update
    this.memStore.set(key, {
      key,
      userId,
      endpoint,
      status: 'COMPLETED',
      responseStatus: statusCode,
      responseBody,
      createdAt: now,
      expiresAt,
    });

    // PostgreSQL persistence
    if (getIsPostgresAvailable()) {
      try {
        const bodyJson = JSON.stringify(responseBody);
        const reqHash = crypto.createHash('sha256').update(`${endpoint}:${userId}:${key}`).digest('hex').substring(0, 32);

        await pool.query(
          `INSERT INTO idempotency_keys (key, user_id, endpoint, request_hash, response_status, response_body, created_at, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW() + INTERVAL '24 HOURS')
           ON CONFLICT (key) DO UPDATE 
           SET response_status = $5, response_body = $6::jsonb, expires_at = NOW() + INTERVAL '24 HOURS'`,
          [key, userId, endpoint, reqHash, statusCode, bodyJson]
        );
      } catch (err: unknown) {
        process.stderr.write(`[Idempotency] Failed to persist key ${key} to Postgres: ${String(err)}\n`);
      }
    }
  }

  /**
   * Release key if operation failed with non-repeatable server error
   */
  public static releaseKey(key: string): void {
    const existing = this.memStore.get(key);
    if (existing && existing.status === 'PROCESSING') {
      this.memStore.delete(key);
    }
  }

  /**
   * Prune expired idempotency keys (> 24 hours)
   */
  public static async pruneExpiredKeys(): Promise<number> {
    const now = Date.now();
    let memPruned = 0;
    for (const [key, entry] of this.memStore.entries()) {
      if (entry.expiresAt <= now) {
        this.memStore.delete(key);
        memPruned++;
      }
    }

    let pgPruned = 0;
    if (getIsPostgresAvailable()) {
      try {
        const res = await pool.query('DELETE FROM idempotency_keys WHERE expires_at < NOW()');
        pgPruned = res.rowCount || 0;
      } catch (err: unknown) {
        process.stderr.write(`[Idempotency] Error pruning expired keys in Postgres: ${String(err)}\n`);
      }
    }

    return Math.max(memPruned, pgPruned);
  }
}
