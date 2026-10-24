import { env } from '../../config/env';
import { DatabaseStore } from '../../db/store';
import { AppError } from '../../middleware/error.middleware';
import { SimulationEngine } from '../engine/simulation.engine';
import {
  SyncResponseData,
  OfflineProgressionAccrual,
  JobRecord,
  UserRecord,
} from '../../types';

export class SyncService {
  public static async executeSync(userId: string): Promise<SyncResponseData> {
    const user: UserRecord | null = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User account not found during synchronization.', 404, 'USER_NOT_FOUND');
    }

    const tickSummary = await SimulationEngine.tickAuthoritativeProgression(userId);

    const updatedUser = await DatabaseStore.findUserById(userId);
    if (!updatedUser) {
      throw new AppError('Failed to fetch updated user state', 500, 'DATABASE_ERROR');
    }

    let currentJob: JobRecord | null = null;
    let hourlySalary = 0;
    let jobTitle: string | null = null;

    if (updatedUser.current_job_id !== null) {
      currentJob = await DatabaseStore.getJobById(updatedUser.current_job_id);
      if (currentJob) {
        hourlySalary = currentJob.hourly_salary;
        jobTitle = currentJob.title;
      }
    }

    const elapsedSeconds = tickSummary.elapsed_seconds;
    const elapsedHours = elapsedSeconds / 3600;
    const maxHours = env.OFFLINE_PROGRESSION_MAX_HOURS;
    const cappedHours = Math.min(elapsedHours, maxHours);

    const offlineProgression: OfflineProgressionAccrual = {
      elapsed_seconds: elapsedSeconds,
      elapsed_hours: Number(elapsedHours.toFixed(4)),
      capped_hours: Number(cappedHours.toFixed(4)),
      accrued_amount: tickSummary.salary_earned,
      hourly_rate: hourlySalary,
      job_title: jobTitle,
    };

    const recentTransactions = await DatabaseStore.getUserTransactions(userId, 10);

    return {
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        balance: updatedUser.balance,
        current_job_id: updatedUser.current_job_id,
        last_synced_at: updatedUser.last_synced_at.toISOString(),
        created_at: updatedUser.created_at.toISOString(),
        transfers_frozen: Boolean(updatedUser.transfers_frozen),
        is_suspended: Boolean(updatedUser.is_suspended),
        suspension_reason: updatedUser.suspension_reason || null,
      },
      job: currentJob,
      offline_progression: offlineProgression,
      recent_transactions: recentTransactions,
      server_time: new Date().toISOString(),
      server_timestamp: Date.now(),
    };
  }
}
