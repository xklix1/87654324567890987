import { DatabaseStore } from '../../db/store';
import { StockStore } from '../../db/sectors/stock.store';
import { BudgetStore } from '../../db/sectors/budget.store';
import { AuthoritativeTickSummary } from '../../types';
import { AppError } from '../../middleware/error.middleware';

export class SimulationEngine {
  private static marketInterval: NodeJS.Timeout | null = null;
  private static readonly MAX_OFFLINE_HOURS = 24.0;

  public static startBackgroundLoops(): void {
    if (this.marketInterval) {
      return;
    }

    // Server-authoritative periodic stock price volatility walk every 60 seconds
    this.marketInterval = setInterval(async () => {
      try {
        await StockStore.tickStockVolatility();
      } catch (err: unknown) {
        process.stdout.write(
          `[SimulationEngine] Error updating stock prices: ${err instanceof Error ? err.message : String(err)}\n`
        );
      }
    }, 60000);

    if (this.marketInterval.unref) {
      this.marketInterval.unref();
    }
  }

  public static stopBackgroundLoops(): void {
    if (this.marketInterval) {
      clearInterval(this.marketInterval);
      this.marketInterval = null;
    }
  }

  /**
   * Authoritative progression computation for a user using General Budget mechanics.
   * Calculates salary and passive business yields from all automated sectors,
   * deducts balanced economic sinks and taxes, applies policy levers, and enforces freeze safety.
   */
  public static async tickAuthoritativeProgression(userId: string): Promise<AuthoritativeTickSummary> {
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found for progression calculation', 404, 'USER_NOT_FOUND');
    }

    const now = new Date();
    const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - user.last_synced_at.getTime()) / 1000));
    const rawElapsedHours = elapsedSeconds / 3600;
    const cappedHours = Math.min(rawElapsedHours, this.MAX_OFFLINE_HOURS);

    // Retrieve full authoritative budget statement for user
    const statement = await BudgetStore.getStatement(userId);

    let totalEarned = 0;
    let sinksDeducted = 0;
    let salaryEarned = 0;
    let passiveIncome = 0;

    const jobSector = statement.sectors.find((s) => s.sector_id === 'jobs');
    const hourlySalary = jobSector ? jobSector.inflow_hourly : 0;

    if (cappedHours > 0) {
      // Check maintenance freeze: if balance is 0 and net flow is negative, halt sinks
      if (user.balance <= 0 && statement.net_hourly_flow <= 0) {
        // In freeze: only manual activities earn; no further drain
        totalEarned = 0;
        sinksDeducted = 0;
      } else {
        salaryEarned = Number((hourlySalary * cappedHours).toFixed(2));
        const businessInflowRate = Math.max(0, statement.total_hourly_inflow - hourlySalary);
        passiveIncome = Number((businessInflowRate * cappedHours).toFixed(2));
        totalEarned = Number((salaryEarned + passiveIncome).toFixed(2));

        const potentialSinks = Number((statement.total_hourly_outflow * cappedHours).toFixed(2));
        // Deduct sinks from current balance + earnings, but never drop below 0
        const availableLiquid = user.balance + totalEarned;
        sinksDeducted = Math.min(availableLiquid, potentialSinks);
      }
    }

    let netCashFlow = Number((totalEarned - sinksDeducted).toFixed(2));
    let bufferCredited = 0;

    // Apply Emergency Buffer policy: if positive net gains, route 10% into protected reserve
    if (statement.policies.emergency_buffer && netCashFlow > 0) {
      bufferCredited = Number((netCashFlow * 0.10).toFixed(2));
      netCashFlow = Number((netCashFlow - bufferCredited).toFixed(2));
      await BudgetStore.creditEmergencyReserve(userId, bufferCredited);
    }

    const freshUser = await DatabaseStore.findUserById(userId);
    const baseBal = freshUser ? freshUser.balance : user.balance;
    const finalBalance = Math.max(0, Number((baseBal + netCashFlow).toFixed(2)));

    await DatabaseStore.updateUserBalanceAndSyncTime(userId, finalBalance, now);

    if (salaryEarned > 0) {
      await DatabaseStore.createTransaction(
        null,
        userId,
        salaryEarned,
        'OFFLINE_SALARY',
        0,
        'COMPLETED'
      );
    }

    if (passiveIncome > 0) {
      await DatabaseStore.createTransaction(
        userId,
        userId,
        passiveIncome,
        'REAL_ESTATE_YIELD',
        0,
        'COMPLETED'
      );
    }

    return {
      user_id: userId,
      elapsed_seconds: elapsedSeconds,
      salary_earned: salaryEarned,
      passive_business_income: passiveIncome,
      economic_sinks_deducted: sinksDeducted,
      net_cash_flow: netCashFlow,
      new_balance: finalBalance,
      timestamp: now.toISOString(),
    };
  }
}
