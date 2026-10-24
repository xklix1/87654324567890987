import crypto from 'crypto';
import { pool, getIsPostgresAvailable, withTransaction } from './pool';
import {
  UserRecord,
  JobRecord,
  TransactionRecord,
  SystemVersionRecord,
  TransactionType,
  TransactionStatus,
  P2PTransferReceipt,
  SearchUserItem,
} from '../types';
import { AppError } from '../middleware/error.middleware';
import { env } from '../config/env';

interface QueryResultRow {
  [column: string]: unknown;
}

// Simple AsyncMutex to enforce serialized atomic operations in in-memory mode
class AsyncMutex {
  private mutex = Promise.resolve();

  public lock(): Promise<() => void> {
    let unlock: () => void = () => {};
    const nextPromise = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    const willLock = this.mutex.then(() => unlock);
    this.mutex = this.mutex.then(() => nextPromise);
    return willLock;
  }

  public async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const unlock = await this.lock();
    try {
      return await fn();
    } finally {
      unlock();
    }
  }
}

const memoryMutex = new AsyncMutex();

// In-Memory Seed Storage for resilient operation and fallback
const seedJobs: JobRecord[] = [
  { id: 1, title: 'Intern Financial Clerk', hourly_salary: 25.0, required_level: 1, created_at: new Date() },
  { id: 2, title: 'Junior Credit Analyst', hourly_salary: 60.0, required_level: 2, created_at: new Date() },
  { id: 3, title: 'Corporate Trader', hourly_salary: 150.0, required_level: 4, created_at: new Date() },
  { id: 4, title: 'Investment Portfolio Manager', hourly_salary: 380.0, required_level: 7, created_at: new Date() },
  { id: 5, title: 'Hedge Fund Managing Director', hourly_salary: 950.0, required_level: 10, created_at: new Date() },
];

let memSystemVersion: SystemVersionRecord = {
  id: 1,
  current_version: '1.0.0',
  minimum_supported_version: '1.0.0',
  updated_at: new Date(),
};

const memUsers = new Map<string, UserRecord>();
const memJobs = new Map<number, JobRecord>(seedJobs.map((j) => [j.id, j]));
const memTransactions: TransactionRecord[] = [];
let transactionIdCounter = 1;

export class DatabaseStore {
  // --- System Version Operations ---
  public static async getSystemVersion(): Promise<SystemVersionRecord> {
    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          'SELECT id, current_version, minimum_supported_version, updated_at FROM system_version ORDER BY id DESC LIMIT 1'
        );
        if (result.rows.length > 0) {
          const row = result.rows[0];
          if (row) {
            return {
              id: Number(row.id),
              current_version: String(row.current_version),
              minimum_supported_version: String(row.minimum_supported_version),
              updated_at: new Date(String(row.updated_at)),
            };
          }
        }
      } catch (err: unknown) {
        process.stdout.write(`[Database] Error querying PostgreSQL version, reading fallback: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }
    return { ...memSystemVersion };
  }

  // --- User Operations ---
  public static async findUserByUsername(username: string): Promise<UserRecord | null> {
    const normalizedUsername = username.trim().toLowerCase();
    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          `SELECT id, username, password_hash, balance, current_job_id, last_synced_at, created_at,
                  active_session_id, registered_device_id, last_device_id, last_ip_address,
                  is_suspended, transfers_frozen, suspension_reason 
           FROM users WHERE LOWER(username) = $1 LIMIT 1`,
          [normalizedUsername]
        );
        if (result.rows.length > 0) {
          const row = result.rows[0];
          if (row) {
            return {
              id: String(row.id),
              username: String(row.username),
              password_hash: String(row.password_hash),
              balance: Number(row.balance),
              current_job_id: row.current_job_id !== null ? Number(row.current_job_id) : null,
              last_synced_at: new Date(String(row.last_synced_at)),
              created_at: new Date(String(row.created_at)),
              active_session_id: row.active_session_id ? String(row.active_session_id) : null,
              registered_device_id: row.registered_device_id ? String(row.registered_device_id) : null,
              last_device_id: row.last_device_id ? String(row.last_device_id) : null,
              last_ip_address: row.last_ip_address ? String(row.last_ip_address) : null,
              is_suspended: Boolean(row.is_suspended),
              transfers_frozen: Boolean(row.transfers_frozen),
              suspension_reason: row.suspension_reason ? String(row.suspension_reason) : null,
            };
          }
        }
        return null;
      } catch (err: unknown) {
        process.stdout.write(`[Database] Query error in findUserByUsername: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }

    for (const user of memUsers.values()) {
      if (user.username.toLowerCase() === normalizedUsername) {
        return { ...user };
      }
    }
    return null;
  }

  public static async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalizedEmail = email.trim().toLowerCase();
    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          `SELECT id, username, email, password_hash, balance, current_job_id, last_synced_at, created_at,
                  active_session_id, registered_device_id, last_device_id, last_ip_address,
                  is_suspended, transfers_frozen, suspension_reason 
           FROM users WHERE LOWER(email) = $1 LIMIT 1`,
          [normalizedEmail]
        );
        if (result.rows.length > 0 && result.rows[0]) {
          const row = result.rows[0];
          return {
            id: String(row.id),
            username: String(row.username),
            email: row.email ? String(row.email) : null,
            password_hash: String(row.password_hash),
            balance: Number(row.balance),
            current_job_id: row.current_job_id !== null ? Number(row.current_job_id) : null,
            last_synced_at: new Date(String(row.last_synced_at)),
            created_at: new Date(String(row.created_at)),
            active_session_id: row.active_session_id ? String(row.active_session_id) : null,
            registered_device_id: row.registered_device_id ? String(row.registered_device_id) : null,
            last_device_id: row.last_device_id ? String(row.last_device_id) : null,
            last_ip_address: row.last_ip_address ? String(row.last_ip_address) : null,
            is_suspended: Boolean(row.is_suspended),
            transfers_frozen: Boolean(row.transfers_frozen),
            suspension_reason: row.suspension_reason ? String(row.suspension_reason) : null,
          };
        }
        return null;
      } catch (err: unknown) {
        process.stdout.write(`[Database] Query error in findUserByEmail: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }

    for (const user of memUsers.values()) {
      if (user.email && user.email.toLowerCase() === normalizedEmail) {
        return { ...user };
      }
    }
    return null;
  }

  public static async findUserById(id: string): Promise<UserRecord | null> {
    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          `SELECT id, username, password_hash, balance, current_job_id, last_synced_at, created_at,
                  active_session_id, registered_device_id, last_device_id, last_ip_address,
                  is_suspended, transfers_frozen, suspension_reason 
           FROM users WHERE id = $1 LIMIT 1`,
          [id]
        );
        if (result.rows.length > 0) {
          const row = result.rows[0];
          if (row) {
            return {
              id: String(row.id),
              username: String(row.username),
              password_hash: String(row.password_hash),
              balance: Number(row.balance),
              current_job_id: row.current_job_id !== null ? Number(row.current_job_id) : null,
              last_synced_at: new Date(String(row.last_synced_at)),
              created_at: new Date(String(row.created_at)),
              active_session_id: row.active_session_id ? String(row.active_session_id) : null,
              registered_device_id: row.registered_device_id ? String(row.registered_device_id) : null,
              last_device_id: row.last_device_id ? String(row.last_device_id) : null,
              last_ip_address: row.last_ip_address ? String(row.last_ip_address) : null,
              is_suspended: Boolean(row.is_suspended),
              transfers_frozen: Boolean(row.transfers_frozen),
              suspension_reason: row.suspension_reason ? String(row.suspension_reason) : null,
            };
          }
        }
        return null;
      } catch (err: unknown) {
        process.stdout.write(`[Database] Query error in findUserById: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }

    const found = memUsers.get(id);
    return found ? { ...found } : null;
  }

  public static async createUser(params: {
    username: string;
    email?: string | null;
    password_hash: string;
    initialBalance: number;
    initialJobId: number | null;
    activeSessionId?: string | null;
    registeredDeviceId?: string | null;
    lastDeviceId?: string | null;
    lastIpAddress?: string | null;
  }): Promise<UserRecord> {
    const now = new Date();
    const id = crypto.randomUUID();

    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          `INSERT INTO users (id, username, password_hash, balance, current_job_id, last_synced_at, created_at,
                              active_session_id, registered_device_id, last_device_id, last_ip_address)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id, username, password_hash, balance, current_job_id, last_synced_at, created_at,
                     active_session_id, registered_device_id, last_device_id, last_ip_address,
                     is_suspended, transfers_frozen, suspension_reason`,
          [
            id,
            params.username,
            params.password_hash,
            params.initialBalance,
            params.initialJobId,
            now,
            now,
            params.activeSessionId || null,
            params.registeredDeviceId || null,
            params.lastDeviceId || null,
            params.lastIpAddress || null,
          ]
        );
        const row = result.rows[0];
        if (row) {
          return {
            id: String(row.id),
            username: String(row.username),
            password_hash: String(row.password_hash),
            balance: Number(row.balance),
            current_job_id: row.current_job_id !== null ? Number(row.current_job_id) : null,
            last_synced_at: new Date(String(row.last_synced_at)),
            created_at: new Date(String(row.created_at)),
            active_session_id: row.active_session_id ? String(row.active_session_id) : null,
            registered_device_id: row.registered_device_id ? String(row.registered_device_id) : null,
            last_device_id: row.last_device_id ? String(row.last_device_id) : null,
            last_ip_address: row.last_ip_address ? String(row.last_ip_address) : null,
            is_suspended: Boolean(row.is_suspended),
            transfers_frozen: Boolean(row.transfers_frozen),
            suspension_reason: row.suspension_reason ? String(row.suspension_reason) : null,
          };
        }
      } catch (err: unknown) {
        process.stdout.write(`[Database] Error in createUser PostgreSQL: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }

    const newUser: UserRecord = {
      id,
      username: params.username,
      email: params.email || null,
      password_hash: params.password_hash,
      balance: params.initialBalance,
      current_job_id: params.initialJobId,
      last_synced_at: now,
      created_at: now,
      active_session_id: params.activeSessionId || null,
      registered_device_id: params.registeredDeviceId || null,
      last_device_id: params.lastDeviceId || null,
      last_ip_address: params.lastIpAddress || null,
      is_suspended: false,
      transfers_frozen: false,
      suspension_reason: null,
    };
    memUsers.set(id, newUser);
    return { ...newUser };
  }

  public static async updateUserSession(
    userId: string,
    activeSessionId: string,
    deviceId?: string | null,
    ipAddress?: string | null
  ): Promise<void> {
    const user = memUsers.get(userId);
    if (user) {
      user.active_session_id = activeSessionId;
      if (deviceId) user.last_device_id = deviceId;
      if (ipAddress) user.last_ip_address = ipAddress;
    }

    if (getIsPostgresAvailable()) {
      try {
        await pool.query(
          `UPDATE users 
           SET active_session_id = $1,
               last_device_id = COALESCE($2, last_device_id),
               last_ip_address = COALESCE($3, last_ip_address)
           WHERE id = $4`,
          [activeSessionId, deviceId || null, ipAddress || null, userId]
        );
      } catch (err: unknown) {
        process.stderr.write(`[Database] Error updating user session: ${String(err)}\n`);
      }
    }
  }

  public static async freezeUserTransfers(userId: string, reason: string): Promise<void> {
    const user = memUsers.get(userId);
    if (user) {
      user.transfers_frozen = true;
      user.suspension_reason = reason;
    }

    if (getIsPostgresAvailable()) {
      try {
        await pool.query(
          `UPDATE users SET transfers_frozen = TRUE, suspension_reason = $1 WHERE id = $2`,
          [reason, userId]
        );
      } catch (err: unknown) {
        process.stderr.write(`[Database] Error freezing user transfers: ${String(err)}\n`);
      }
    }
  }


  public static async updateUserBalanceAndSyncTime(
    userId: string,
    newBalance: number,
    syncTime: Date
  ): Promise<UserRecord> {
    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          `UPDATE users 
           SET balance = $1, last_synced_at = $2
           WHERE id = $3
           RETURNING id, username, password_hash, balance, current_job_id, last_synced_at, created_at`,
          [newBalance, syncTime, userId]
        );
        const row = result.rows[0];
        if (row) {
          return {
            id: String(row.id),
            username: String(row.username),
            password_hash: String(row.password_hash),
            balance: Number(row.balance),
            current_job_id: row.current_job_id !== null ? Number(row.current_job_id) : null,
            last_synced_at: new Date(String(row.last_synced_at)),
            created_at: new Date(String(row.created_at)),
          };
        }
      } catch (err: unknown) {
        process.stdout.write(`[Database] Error updating balance in PostgreSQL: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }

    return memoryMutex.runExclusive(async () => {
      const existing = memUsers.get(userId);
      if (!existing) {
        throw new Error(`User not found: ${userId}`);
      }
      const updated: UserRecord = {
        ...existing,
        balance: newBalance,
        last_synced_at: syncTime,
      };
      memUsers.set(userId, updated);
      return { ...updated };
    });
  }

  // --- Job Operations ---
  public static async getJobById(id: number): Promise<JobRecord | null> {
    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          'SELECT id, title, hourly_salary, required_level, created_at FROM jobs WHERE id = $1 LIMIT 1',
          [id]
        );
        if (result.rows.length > 0) {
          const row = result.rows[0];
          if (row) {
            return {
              id: Number(row.id),
              title: String(row.title),
              hourly_salary: Number(row.hourly_salary),
              required_level: Number(row.required_level),
              created_at: new Date(String(row.created_at)),
            };
          }
        }
        return null;
      } catch (err: unknown) {
        process.stdout.write(`[Database] Error getting job by ID: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }

    const job = memJobs.get(id);
    return job ? { ...job } : null;
  }

  public static async listJobs(): Promise<JobRecord[]> {
    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          'SELECT id, title, hourly_salary, required_level, created_at FROM jobs ORDER BY required_level ASC'
        );
        return result.rows.map((row) => ({
          id: Number(row.id),
          title: String(row.title),
          hourly_salary: Number(row.hourly_salary),
          required_level: Number(row.required_level),
          created_at: new Date(String(row.created_at)),
        }));
      } catch (err: unknown) {
        process.stdout.write(`[Database] Error listing jobs: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }

    return Array.from(memJobs.values()).sort((a, b) => a.required_level - b.required_level);
  }

  // --- Transaction Operations ---
  public static async createTransaction(
    senderId: string | null,
    receiverId: string,
    amount: number,
    type: TransactionType,
    fee: number = 0,
    status: TransactionStatus = 'COMPLETED'
  ): Promise<TransactionRecord> {
    const now = new Date();

    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, sender_id, receiver_id, amount, fee, status, type, created_at`,
          [senderId, receiverId, amount, fee, status, type, now]
        );
        const row = result.rows[0];
        if (row) {
          return {
            id: Number(row.id),
            sender_id: row.sender_id !== null ? String(row.sender_id) : null,
            receiver_id: String(row.receiver_id),
            amount: Number(row.amount),
            fee: Number(row.fee ?? 0),
            status: (row.status as TransactionStatus) ?? 'COMPLETED',
            type: row.type as TransactionType,
            created_at: new Date(String(row.created_at)),
          };
        }
      } catch (err: unknown) {
        process.stdout.write(`[Database] Error inserting transaction: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }

    const tx: TransactionRecord = {
      id: transactionIdCounter++,
      sender_id: senderId,
      receiver_id: receiverId,
      amount,
      fee,
      status,
      type,
      created_at: now,
    };
    memTransactions.unshift(tx);
    return { ...tx };
  }

  public static async getUserTransactions(userId: string, limit: number = 20): Promise<TransactionRecord[]> {
    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          `SELECT id, sender_id, receiver_id, amount, fee, status, type, created_at
           FROM transactions
           WHERE sender_id = $1 OR receiver_id = $1
           ORDER BY created_at DESC
           LIMIT $2`,
          [userId, limit]
        );
        return result.rows.map((row) => ({
          id: Number(row.id),
          sender_id: row.sender_id !== null ? String(row.sender_id) : null,
          receiver_id: String(row.receiver_id),
          amount: Number(row.amount),
          fee: Number(row.fee ?? 0),
          status: (row.status as TransactionStatus) ?? 'COMPLETED',
          type: row.type as TransactionType,
          created_at: new Date(String(row.created_at)),
        }));
      } catch (err: unknown) {
        process.stdout.write(`[Database] Error getting user transactions: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }

    return memTransactions
      .filter((t) => t.sender_id === userId || t.receiver_id === userId)
      .slice(0, limit);
  }

  // --- Phase 2: Anti-Fraud Daily Volume Aggregation ---
  public static async getDailyTransferredTotal(senderId: string): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          `SELECT COALESCE(SUM(amount), 0) AS daily_total
           FROM transactions
           WHERE sender_id = $1 
             AND type = 'PEER_TRANSFER' 
             AND status = 'COMPLETED'
             AND created_at >= $2`,
          [senderId, twentyFourHoursAgo]
        );
        const row = result.rows[0];
        if (row && row.daily_total !== undefined) {
          return Number(row.daily_total);
        }
      } catch (err: unknown) {
        process.stdout.write(`[Database] Error querying daily transfer sum: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }

    let sum = 0;
    for (const tx of memTransactions) {
      if (
        tx.sender_id === senderId &&
        tx.type === 'PEER_TRANSFER' &&
        tx.status === 'COMPLETED' &&
        tx.created_at >= twentyFourHoursAgo
      ) {
        sum += tx.amount;
      }
    }
    return sum;
  }

  // --- Phase 2: Database Concurrency & Atomic P2P Transfer with Row-Level Locking & SQL Arithmetic ---
  public static async executeAtomicP2PTransfer(params: {
    senderId: string;
    receiverId: string;
    amount: number;
    fee: number;
    note?: string;
  }): Promise<P2PTransferReceipt> {
    const { senderId, receiverId, amount, fee } = params;
    const totalDeducted = Number((amount + fee).toFixed(2));

    // Self-transfer validation
    if (senderId === receiverId) {
      throw new AppError('Self-transfers are strictly prohibited by anti-fraud policy.', 400, 'SELF_TRANSFER_PROHIBITED');
    }

    // Daily Cap Verification
    const dailyTransferred = await this.getDailyTransferredTotal(senderId);
    const dailyLimit = env.P2P_DAILY_TRANSFER_LIMIT;

    if (dailyTransferred + amount > dailyLimit) {
      const remainingLimit = Math.max(0, dailyLimit - dailyTransferred);
      throw new AppError(
        `Daily transfer cap exceeded. Your remaining 24-hour limit is $${remainingLimit.toFixed(2)}.`,
        403,
        'DAILY_LIMIT_EXCEEDED',
        { daily_limit: dailyLimit, transferred_today: dailyTransferred, remaining_limit: remainingLimit }
      );
    }

    if (getIsPostgresAvailable()) {
      return await withTransaction(async (client) => {
        // DEADLOCK PREVENTION: Order lock acquisition lexicographically by UUID
        const [firstLockId, secondLockId] = [senderId, receiverId].sort();

        // Lock row 1
        const res1 = await client.query<QueryResultRow>(
          `SELECT id, username, balance, is_suspended, transfers_frozen, last_device_id, registered_device_id, last_ip_address 
           FROM users WHERE id = $1 FOR UPDATE`,
          [firstLockId]
        );
        // Lock row 2
        const res2 = await client.query<QueryResultRow>(
          `SELECT id, username, balance, is_suspended, transfers_frozen, last_device_id, registered_device_id, last_ip_address 
           FROM users WHERE id = $1 FOR UPDATE`,
          [secondLockId]
        );

        if (res1.rows.length === 0 || res2.rows.length === 0) {
          throw new AppError('One or both transfer participant accounts do not exist.', 404, 'USER_NOT_FOUND');
        }

        const rowMap = new Map<string, {
          id: string;
          username: string;
          balance: number;
          is_suspended: boolean;
          transfers_frozen: boolean;
        }>();

        const r1 = res1.rows[0];
        const r2 = res2.rows[0];
        if (r1) {
          rowMap.set(String(r1.id), {
            id: String(r1.id),
            username: String(r1.username),
            balance: Number(r1.balance),
            is_suspended: Boolean(r1.is_suspended),
            transfers_frozen: Boolean(r1.transfers_frozen),
          });
        }
        if (r2) {
          rowMap.set(String(r2.id), {
            id: String(r2.id),
            username: String(r2.username),
            balance: Number(r2.balance),
            is_suspended: Boolean(r2.is_suspended),
            transfers_frozen: Boolean(r2.transfers_frozen),
          });
        }

        const senderRow = rowMap.get(senderId);
        const receiverRow = rowMap.get(receiverId);

        if (!senderRow) {
          throw new AppError('Sender account record not found.', 404, 'SENDER_NOT_FOUND');
        }
        if (!receiverRow) {
          throw new AppError('Recipient account record not found in system.', 404, 'RECEIVER_NOT_FOUND');
        }

        // Security check: Frozen or suspended accounts
        if (senderRow.transfers_frozen || senderRow.is_suspended) {
          throw new AppError('Your account has been frozen or suspended pending security audit. Outgoing transfers are locked.', 403, 'TRANSFERS_FROZEN');
        }
        if (receiverRow.is_suspended) {
          throw new AppError('Recipient account is currently suspended and cannot receive funds.', 403, 'RECIPIENT_SUSPENDED');
        }

        // Direct SQL-level arithmetic with atomic balance condition
        const deductRes = await client.query<QueryResultRow>(
          `UPDATE users 
           SET balance = ROUND((balance - $1)::numeric, 2) 
           WHERE id = $2 AND balance >= $1 
           RETURNING balance`,
          [totalDeducted, senderId]
        );

        if (deductRes.rows.length === 0 || !deductRes.rows[0]) {
          throw new AppError(
            `Insufficient liquid capital. Required: $${totalDeducted.toFixed(2)} ($${amount.toFixed(2)} + $${fee.toFixed(2)} fee), Available: $${senderRow.balance.toFixed(2)}.`,
            400,
            'INSUFFICIENT_FUNDS',
            { available: senderRow.balance, required: totalDeducted, fee }
          );
        }

        const senderNewBalance = Number(deductRes.rows[0].balance);

        // Direct SQL-level arithmetic credit to receiver
        await client.query(
          `UPDATE users 
           SET balance = ROUND((balance + $1)::numeric, 2) 
           WHERE id = $2`,
          [amount, receiverId]
        );

        const now = new Date();

        // Record atomic transfer transaction
        const txInsert = await client.query<QueryResultRow>(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $2, $3, $4, 'COMPLETED', 'PEER_TRANSFER', $5)
           RETURNING id, created_at`,
          [senderId, receiverId, amount, fee, now]
        );

        const txRow = txInsert.rows[0];
        const txId = txRow ? Number(txRow.id) : 0;
        const createdAt = txRow ? String(txRow.created_at) : now.toISOString();

        return {
          transaction_id: txId,
          sender_id: senderId,
          sender_username: senderRow.username,
          receiver_id: receiverId,
          receiver_username: receiverRow.username,
          amount,
          fee,
          total_deducted: totalDeducted,
          sender_new_balance: senderNewBalance,
          daily_transferred_today: Number((dailyTransferred + amount).toFixed(2)),
          daily_cap_remaining: Number((dailyLimit - (dailyTransferred + amount)).toFixed(2)),
          created_at: createdAt,
        };
      });
    }

    // In-Memory Concurrency Handling via Mutex Lock
    return await memoryMutex.runExclusive(async () => {
      const sender = memUsers.get(senderId);
      const receiver = memUsers.get(receiverId);

      if (!sender) {
        throw new AppError('Sender account record not found.', 404, 'SENDER_NOT_FOUND');
      }
      if (!receiver) {
        throw new AppError('Recipient account record not found in system.', 404, 'RECEIVER_NOT_FOUND');
      }

      if (sender.transfers_frozen || sender.is_suspended) {
        throw new AppError('Your account has been frozen or suspended pending security audit. Outgoing transfers are locked.', 403, 'TRANSFERS_FROZEN');
      }
      if (receiver.is_suspended) {
        throw new AppError('Recipient account is currently suspended and cannot receive funds.', 403, 'RECIPIENT_SUSPENDED');
      }

      if (sender.balance < totalDeducted) {
        throw new AppError(
          `Insufficient liquid capital. Required: $${totalDeducted.toFixed(2)} ($${amount.toFixed(2)} + $${fee.toFixed(2)} fee), Available: $${sender.balance.toFixed(2)}.`,
          400,
          'INSUFFICIENT_FUNDS',
          { available: sender.balance, required: totalDeducted, fee }
        );
      }

      const senderNewBalance = Number((sender.balance - totalDeducted).toFixed(2));
      const receiverNewBalance = Number((receiver.balance + amount).toFixed(2));
      const now = new Date();

      sender.balance = senderNewBalance;
      receiver.balance = receiverNewBalance;

      const tx: TransactionRecord = {
        id: transactionIdCounter++,
        sender_id: senderId,
        receiver_id: receiverId,
        amount,
        fee,
        status: 'COMPLETED',
        type: 'PEER_TRANSFER',
        created_at: now,
      };
      memTransactions.unshift(tx);

      return {
        transaction_id: tx.id,
        sender_id: senderId,
        sender_username: sender.username,
        receiver_id: receiverId,
        receiver_username: receiver.username,
        amount,
        fee,
        total_deducted: totalDeducted,
        sender_new_balance: senderNewBalance,
        daily_transferred_today: Number((dailyTransferred + amount).toFixed(2)),
        daily_cap_remaining: Number((dailyLimit - (dailyTransferred + amount)).toFixed(2)),
        created_at: now.toISOString(),
      };
    });
  }

  // --- Phase 2: Recipient Listing & Discovery ---
  public static async listRecipients(excludeUserId: string): Promise<SearchUserItem[]> {
    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          `SELECT id, username, created_at FROM users WHERE id != $1 ORDER BY created_at DESC LIMIT 20`,
          [excludeUserId]
        );
        return result.rows.map((row) => ({
          id: String(row.id),
          username: String(row.username),
          created_at: new Date(String(row.created_at)).toISOString(),
        }));
      } catch (err: unknown) {
        process.stdout.write(`[Database] Error listing recipients: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }

    const items: SearchUserItem[] = [];
    for (const user of memUsers.values()) {
      if (user.id !== excludeUserId) {
        items.push({
          id: user.id,
          username: user.username,
          created_at: user.created_at.toISOString(),
        });
      }
    }
    return items.slice(0, 20);
  }

  public static async getAllUsers(): Promise<UserRecord[]> {
    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          'SELECT id, username, password_hash, balance, current_job_id, last_synced_at, created_at FROM users ORDER BY created_at ASC'
        );
        return result.rows.map((row) => ({
          id: String(row.id),
          username: String(row.username),
          password_hash: String(row.password_hash),
          balance: Number(row.balance),
          current_job_id: row.current_job_id !== null ? Number(row.current_job_id) : null,
          last_synced_at: new Date(String(row.last_synced_at)),
          created_at: new Date(String(row.created_at)),
        }));
      } catch (err: unknown) {
        process.stdout.write(`[Database] Error getting all users: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }
    return Array.from(memUsers.values()).map((u) => ({ ...u }));
  }
}
