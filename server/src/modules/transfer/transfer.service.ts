import { DatabaseStore } from '../../db/store';
import { env } from '../../config/env';
import { TransferInput } from './transfer.schema';
import { P2PTransferReceipt, DailyTransferQuota, SearchUserItem } from '../../types';
import { FeatureFlagsService } from '../security/feature-flags.service';
import { DeviceGuardService } from '../security/device-guard.service';
import { EconomicWatchdogService } from '../security/economic-watchdog.service';
import { LeaderboardService } from '../social/leaderboard.service';
import { AppError } from '../../middleware/error.middleware';

export class TransferService {
  public static async executeTransfer(
    senderId: string,
    input: TransferInput,
    senderDeviceId?: string,
    senderIp?: string
  ): Promise<P2PTransferReceipt> {
    // 1. Feature Flag Kill-Switch Check
    const isTransfersEnabled = await FeatureFlagsService.isEnabledAsync('P2P_TRANSFERS_ENABLED');
    if (!isTransfersEnabled) {
      throw new AppError(
        'P2P money transfers are temporarily suspended for scheduled maintenance or market rebalancing.',
        503,
        'SECTOR_MAINTENANCE',
        { flag: 'P2P_TRANSFERS_ENABLED' }
      );
    }

    // 2. Anti-Collusion & Device Hardware Checks (Perimeter Defense)
    await DeviceGuardService.assertNoCollusion(senderId, input.receiver_id, senderDeviceId, senderIp);

    // 3. Progression Gatekeeping: Level 3 Required
    const senderProgression = LeaderboardService.getProgression(senderId);
    if (senderProgression.level < 3) {
      throw new AppError(
        `Progression Gatekeeping: You must reach at least Level 3 before unlocking outgoing peer transfers (Current Level: ${senderProgression.level}).`,
        403,
        'TRANSFER_LEVEL_LOCKED',
        { current_level: senderProgression.level, required_level: 3 }
      );
    }

    // 4. Calculate Fee
    const feePercent = env.P2P_TRANSACTION_FEE_PERCENT;
    const feeAmount = Number(((input.amount * feePercent) / 100).toFixed(2));
    const totalDeducted = Number((input.amount + feeAmount).toFixed(2));

    // 5. Economic Anomaly Watchdog Check
    const sender = await DatabaseStore.findUserById(senderId);
    if (!sender) {
      throw new AppError('Sender account not found.', 404, 'SENDER_NOT_FOUND');
    }
    await EconomicWatchdogService.inspectFinancialDelta(senderId, sender.balance, -totalDeducted, 'PEER_TRANSFER');

    // 6. Execute Atomic Transfer with Row-Level Locking and SQL Arithmetic
    return await DatabaseStore.executeAtomicP2PTransfer({
      senderId,
      receiverId: input.receiver_id,
      amount: input.amount,
      fee: feeAmount,
      note: input.note,
    });
  }

  public static async getDailyQuota(userId: string): Promise<DailyTransferQuota> {
    const transferredToday = await DatabaseStore.getDailyTransferredTotal(userId);
    const dailyLimit = env.P2P_DAILY_TRANSFER_LIMIT;
    const remaining = Math.max(0, Number((dailyLimit - transferredToday).toFixed(2)));

    return {
      daily_limit: dailyLimit,
      transferred_today: transferredToday,
      remaining_limit: remaining,
      fee_percentage: env.P2P_TRANSACTION_FEE_PERCENT,
    };
  }

  public static async getAvailableRecipients(userId: string): Promise<SearchUserItem[]> {
    return await DatabaseStore.listRecipients(userId);
  }
}

