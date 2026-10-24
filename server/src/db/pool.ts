import { Pool, PoolConfig, PoolClient, types } from 'pg';
import { env } from '../config/env';

// Strict handling of NUMERIC(18, 2) to prevent string concatenation or floating-point drift
types.setTypeParser(1700, (val: string) => {
  const num = parseFloat(val);
  return Number.isNaN(num) ? 0 : Math.round(num * 100) / 100;
});

const poolConfig: PoolConfig = {
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
};

export const pool = new Pool(poolConfig);

let isPostgresAvailable = false;
let activeTransactionsCount = 0;

export function getActiveTransactionsCount(): number {
  return activeTransactionsCount;
}

export async function waitForActiveTransactions(timeoutMs: number = 10000): Promise<void> {
  const start = Date.now();
  while (activeTransactionsCount > 0 && Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      isPostgresAvailable = true;
      return true;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown connection error';
    process.stdout.write(`[Database] PostgreSQL direct connection check notice: ${message}. Using fallback transactional in-memory store.\n`);
    isPostgresAvailable = false;
    return false;
  }
}

export function getIsPostgresAvailable(): boolean {
  return isPostgresAvailable;
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  activeTransactionsCount++;
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    activeTransactionsCount--;
    client.release();
  }
}

