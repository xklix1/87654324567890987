import { DatabaseStore } from '../../db/store';
import { StockStore } from '../../db/sectors/stock.store';
import { RealEstateStore } from '../../db/sectors/real-estate.store';
import { DealershipStore } from '../../db/sectors/dealership.store';
import { AirportStore } from '../../db/sectors/airport.store';
import { FactoryStore } from '../../db/sectors/factory.store';
import { FarmStore } from '../../db/sectors/farm.store';
import { ImportExportStore } from '../../db/sectors/import-export.store';
import { CryptoStore } from '../../db/sectors/crypto.store';
import { LeaderboardService } from '../social/leaderboard.service';
import {
  AchievementCatalogItem,
  UserAchievementItem,
  ClaimAchievementResult,
} from '../../types';
import { AppError } from '../../middleware/error.middleware';

export const coreAchievementsCatalog: AchievementCatalogItem[] = [
  {
    id: 1,
    code: 'FIRST_TRADE',
    title: 'Market Initiate',
    description: 'Execute your first stock trade on the securities exchange',
    category: 'MARKET',
    reward_cash: 500.0,
    reward_xp: 100,
    target_value: 1,
  },
  {
    id: 2,
    code: 'ESTATE_ACQUISITION',
    title: 'Property Landlord',
    description: 'Acquire your first real estate commercial property',
    category: 'REAL_ESTATE',
    reward_cash: 2000.0,
    reward_xp: 250,
    target_value: 1,
  },
  {
    id: 3,
    code: 'SHOWROOM_SHOWCASE',
    title: 'Automotive Mogul',
    description: 'Order a vehicle and display it in your showroom',
    category: 'DEALERSHIP',
    reward_cash: 1500.0,
    reward_xp: 200,
    target_value: 1,
  },
  {
    id: 4,
    code: 'AVIATION_DISPATCH',
    title: 'Flight Commander',
    description: 'Dispatch your first commercial aircraft on a flight route',
    category: 'AVIATION',
    reward_cash: 2500.0,
    reward_xp: 300,
    target_value: 1,
  },
  {
    id: 5,
    code: 'INDUSTRIAL_CYCLE',
    title: 'Master Fabricator',
    description: 'Complete a full manufacturing cycle in your factory',
    category: 'PRODUCTION',
    reward_cash: 1800.0,
    reward_xp: 250,
    target_value: 1,
  },
  {
    id: 6,
    code: 'AGRICULTURAL_HARVEST',
    title: 'Harvest Tycoon',
    description: 'Successfully cultivate and harvest a crop or livestock batch',
    category: 'AGRICULTURE',
    reward_cash: 1200.0,
    reward_xp: 180,
    target_value: 1,
  },
  {
    id: 7,
    code: 'GLOBAL_EXPEDITION',
    title: 'Maritime Merchant',
    description: 'Dispatch an international cargo shipping voyage',
    category: 'LOGISTICS',
    reward_cash: 3000.0,
    reward_xp: 350,
    target_value: 1,
  },
  {
    id: 8,
    code: 'CRYPTO_PROSPECTOR',
    title: 'Blockchain Miner',
    description: 'Install an active GPU mining rig and compute hashrate',
    category: 'CRYPTO',
    reward_cash: 1500.0,
    reward_xp: 220,
    target_value: 1,
  },
  {
    id: 9,
    code: 'WEALTH_TIER_1',
    title: 'Six-Figure Capitalist',
    description: 'Accumulate a total net worth exceeding $100,000.00',
    category: 'WEALTH',
    reward_cash: 10000.0,
    reward_xp: 1000,
    target_value: 100000,
  },
  {
    id: 10,
    code: 'WEALTH_TIER_2',
    title: 'Half-Millionaire Club',
    description: 'Accumulate a total net worth exceeding $500,000.00',
    category: 'WEALTH',
    reward_cash: 50000.0,
    reward_xp: 2500,
    target_value: 500000,
  },
  {
    id: 11,
    code: 'SOCIAL_NETWORKER',
    title: 'Connected Executive',
    description: 'Send your first peer-to-peer money transfer to another tycoon',
    category: 'SOCIAL',
    reward_cash: 500.0,
    reward_xp: 150,
    target_value: 1,
  },
];

interface MemAchievementProgress {
  userId: string;
  code: string;
  progress: number;
  unlocked: boolean;
  claimed: boolean;
  unlockedAt: string | null;
  claimedAt: string | null;
}

const memUserAchievements = new Map<string, MemAchievementProgress>();

export class AchievementService {
  public static async listCatalog(): Promise<AchievementCatalogItem[]> {
    return [...coreAchievementsCatalog];
  }

  public static async getUserAchievements(userId: string): Promise<UserAchievementItem[]> {
    // 1. Evaluate on-the-fly progress across player state
    const portfolio = await StockStore.getUserPortfolio(userId);
    const properties = await RealEstateStore.getUserProperties(userId);
    const dealership = await DealershipStore.getProfile(userId);
    const airport = await AirportStore.getHub(userId);
    const factory = await FactoryStore.getOverview(userId);
    const farm = await FarmStore.getOverview(userId);
    const importExport = await ImportExportStore.getOverview(userId);
    const crypto = await CryptoStore.getOverview(userId);
    const transactions = await DatabaseStore.getUserTransactions(userId, 50);
    const assetBreakdown = await LeaderboardService.calculateAssetBreakdown(userId);

    const hasStockTrade = portfolio.length > 0 || transactions.some((t) => t.type === 'STOCK_BUY' || t.type === 'STOCK_SELL');
    const hasProperty = properties.length > 0;
    const hasVehicle = dealership.vehicles_on_display.length > 0 || transactions.some((t) => t.type === 'CAR_PURCHASE' || t.type === 'CAR_SALE');
    const hasFlight = airport.fleet.some((a) => a.status === 'IN_FLIGHT') || transactions.some((t) => t.type === 'FLIGHT_EXPENSE' || t.type === 'FLIGHT_REVENUE');
    const hasFactoryCycle = factory.lines.length > 0 || transactions.some((t) => t.type === 'FACTORY_REVENUE');
    const hasFarmHarvest = farm.batches.some((b) => b.harvested) || transactions.some((t) => t.type === 'FARM_HARVEST');
    const hasVoyage = importExport.active_voyages.length > 0 || transactions.some((t) => t.type === 'TRADE_VOYAGE_EXPENSE');
    const hasCryptoRig = crypto.rigs.length > 0;
    const hasP2PTransfer = transactions.some((t) => t.type === 'PEER_TRANSFER' && t.sender_id === userId);

    const now = new Date();
    const resultItems: UserAchievementItem[] = [];

    for (const catItem of coreAchievementsCatalog) {
      let currentProgress = 0;

      switch (catItem.code) {
        case 'FIRST_TRADE':
          currentProgress = hasStockTrade ? 1 : 0;
          break;
        case 'ESTATE_ACQUISITION':
          currentProgress = hasProperty ? 1 : 0;
          break;
        case 'SHOWROOM_SHOWCASE':
          currentProgress = hasVehicle ? 1 : 0;
          break;
        case 'AVIATION_DISPATCH':
          currentProgress = hasFlight ? 1 : 0;
          break;
        case 'INDUSTRIAL_CYCLE':
          currentProgress = hasFactoryCycle ? 1 : 0;
          break;
        case 'AGRICULTURAL_HARVEST':
          currentProgress = hasFarmHarvest ? 1 : 0;
          break;
        case 'GLOBAL_EXPEDITION':
          currentProgress = hasVoyage ? 1 : 0;
          break;
        case 'CRYPTO_PROSPECTOR':
          currentProgress = hasCryptoRig ? 1 : 0;
          break;
        case 'WEALTH_TIER_1':
        case 'WEALTH_TIER_2':
          currentProgress = assetBreakdown.net_worth;
          break;
        case 'SOCIAL_NETWORKER':
          currentProgress = hasP2PTransfer ? 1 : 0;
          break;
        default:
          currentProgress = 0;
      }

      const isUnlocked = currentProgress >= catItem.target_value;

      // Sync with in-memory state
      const key = `${userId}:${catItem.code}`;
      let userAch = memUserAchievements.get(key);
      if (!userAch) {
        userAch = {
          userId,
          code: catItem.code,
          progress: currentProgress,
          unlocked: isUnlocked,
          claimed: false,
          unlockedAt: isUnlocked ? now.toISOString() : null,
          claimedAt: null,
        };
        memUserAchievements.set(key, userAch);
      } else {
        userAch.progress = currentProgress;
        if (!userAch.unlocked && isUnlocked) {
          userAch.unlocked = true;
          userAch.unlockedAt = now.toISOString();
        }
      }

      resultItems.push({
        achievement_id: catItem.id,
        code: catItem.code,
        title: catItem.title,
        description: catItem.description,
        category: catItem.category,
        reward_cash: catItem.reward_cash,
        reward_xp: catItem.reward_xp,
        target_value: catItem.target_value,
        current_progress: Number(currentProgress.toFixed(2)),
        unlocked: userAch.unlocked,
        claimed: userAch.claimed,
        unlocked_at: userAch.unlockedAt,
        claimed_at: userAch.claimedAt,
      });
    }

    return resultItems;
  }

  public static async claimAchievement(userId: string, code: string): Promise<ClaimAchievementResult> {
    const achievements = await this.getUserAchievements(userId);
    const item = achievements.find((a) => a.code === code);
    if (!item) {
      throw new AppError('Achievement milestone not recognized', 404, 'ACHIEVEMENT_NOT_FOUND');
    }

    if (!item.unlocked) {
      throw new AppError(
        `Achievement requirements not met. Progress: ${item.current_progress}/${item.target_value}`,
        400,
        'ACHIEVEMENT_LOCKED'
      );
    }

    if (item.claimed) {
      throw new AppError('Reward for this achievement milestone has already been claimed', 400, 'ALREADY_CLAIMED');
    }

    const key = `${userId}:${code}`;
    const userAch = memUserAchievements.get(key);
    if (!userAch) {
      throw new AppError('Achievement state mismatch', 500, 'INTERNAL_ERROR');
    }

    const now = new Date();
    userAch.claimed = true;
    userAch.claimedAt = now.toISOString();

    // 1. Award Cash Prize
    const user = await DatabaseStore.findUserById(userId);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    const newBalance = Number((user.balance + item.reward_cash).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, now);

    if (item.reward_cash > 0) {
      await DatabaseStore.createTransaction(
        null,
        userId,
        item.reward_cash,
        'ACHIEVEMENT_REWARD',
        0,
        'COMPLETED'
      );
    }

    // 2. Award XP and determine Level & Title
    const xpResult = LeaderboardService.addXp(userId, item.reward_xp);

    const updatedItem: UserAchievementItem = {
      ...item,
      claimed: true,
      claimed_at: now.toISOString(),
    };

    return {
      achievement: updatedItem,
      cash_reward: item.reward_cash,
      xp_reward: item.reward_xp,
      new_balance: newBalance,
      new_xp: xpResult.xp,
      new_level: xpResult.level,
      new_title: xpResult.title,
      leveled_up: xpResult.leveledUp,
    };
  }
}
