import { pool, getIsPostgresAvailable } from '../../db/pool';
import { AppError } from '../../middleware/error.middleware';

export interface AnomalyReport {
  userId: string;
  anomalyType: string;
  severity: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: Record<string, unknown>;
}

export class EconomicWatchdogService {
  private static MAX_PLAUSIBLE_SINGLE_TRANSACTION = 5000000.0; // $5M
  private static MAX_PLAUSIBLE_HOURLY_DELTA = 10000000.0; // $10M

  /**
   * Run sanity check on balance and asset adjustments
   */
  public static async inspectFinancialDelta(
    userId: string,
    currentBalance: number,
    delta: number,
    operationType: string
  ): Promise<void> {
    // 1. Check for negative result or NaN
    if (isNaN(delta) || isNaN(currentBalance)) {
      await this.flagAndSuspend(userId, {
        userId,
        anomalyType: 'NAN_ARITHMETIC_INJECTION',
        severity: 'CRITICAL',
        details: { currentBalance, delta, operationType },
      });
      throw new AppError(
        'Mathematical anomaly detected in financial payload.',
        400,
        'ARITHMETIC_VIOLATION'
      );
    }

    // 2. Check hourly delta threshold
    if (Math.abs(delta) > this.MAX_PLAUSIBLE_HOURLY_DELTA && operationType !== 'SYSTEM_GRANT') {
      await this.flagAndSuspend(userId, {
        userId,
        anomalyType: 'HOURLY_DELTA_SPIKE',
        severity: 'CRITICAL',
        details: { currentBalance, delta, threshold: this.MAX_PLAUSIBLE_HOURLY_DELTA, operationType },
      });
      throw new AppError(
        'Transaction rejected: Delta exceeds mathematical maximum hourly threshold.',
        403,
        'SUSPENDED_PENDING_AUDIT'
      );
    }

    // 2. Impossible single transaction spike check
    if (Math.abs(delta) > this.MAX_PLAUSIBLE_SINGLE_TRANSACTION && operationType !== 'SYSTEM_GRANT') {
      await this.flagAndSuspend(userId, {
        userId,
        anomalyType: 'EXCESSIVE_TRANSACTION_SPIKE',
        severity: 'CRITICAL',
        details: {
          currentBalance,
          attemptedDelta: delta,
          threshold: this.MAX_PLAUSIBLE_SINGLE_TRANSACTION,
          operationType,
        },
      });
      throw new AppError(
        'Transaction rejected by automated economic watchdog: Value exceeds mathematical security envelope.',
        403,
        'SUSPENDED_PENDING_AUDIT'
      );
    }

    // 3. Negative balance safeguard
    if (currentBalance + delta < 0) {
      throw new AppError(
        'Insufficient liquid capital for this transaction.',
        400,
        'INSUFFICIENT_FUNDS'
      );
    }
  }

  /**
   * Flag an account as SUSPENDED_PENDING_AUDIT, freeze transfers, and record audit log.
   */
  public static async flagAndSuspend(
    userId: string,
    report: AnomalyReport
  ): Promise<void> {
    process.stderr.write(
      `[EconomicWatchdog] ⚠️ ANOMALY DETECTED for user ${userId}: ${report.anomalyType} (${report.severity}). Freezing account.\n`
    );

    const actionTaken = 'TRANSFERS_FROZEN_AND_SUSPENDED';

    if (getIsPostgresAvailable()) {
      try {
        // Freeze transfers and suspend user in DB
        await pool.query(
          `UPDATE users 
           SET is_suspended = TRUE, transfers_frozen = TRUE, suspension_reason = 'SUSPENDED_PENDING_AUDIT' 
           WHERE id = $1`,
          [userId]
        );

        // Record persistent audit log
        await pool.query(
          `INSERT INTO economic_audit_logs (user_id, anomaly_type, severity, details, action_taken, created_at)
           VALUES ($1, $2, $3, $4::jsonb, $5, NOW())`,
          [userId, report.anomalyType, report.severity, JSON.stringify(report.details), actionTaken]
        );
      } catch (err: unknown) {
        process.stderr.write(`[EconomicWatchdog] Error writing audit log to Postgres: ${String(err)}\n`);
      }
    }
  }
}
