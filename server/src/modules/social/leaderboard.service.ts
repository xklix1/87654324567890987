import { DatabaseStore } from '../../db/store';
import { StockStore } from '../../db/sectors/stock.store';
import { RealEstateStore } from '../../db/sectors/real-estate.store';
import { DealershipStore } from '../../db/sectors/dealership.store';
import { AirportStore } from '../../db/sectors/airport.store';
import { FactoryStore } from '../../db/sectors/factory.store';
import { FarmStore } from '../../db/sectors/farm.store';
import { ImportExportStore } from '../../db/sectors/import-export.store';
import { CryptoStore } from '../../db/sectors/crypto.store';
import {
  LeaderboardEntry,
  PlayerAssetBreakdown,
  PlayerProfile,
} from '../../types';
import { AppError } from '../../middleware/error.middleware';

// Progression store in memory for XP/Level
interface UserProgressionData {
  userId: string;
  xp: number;
  level: number;
  title: string;
}

const memUserProgression = new Map<string, UserProgressionData>();

export class LeaderboardService {
  public static determineTitle(netWorth: number, level: number): string {
    if (netWorth >= 10000000) return 'Apex Global Oligarch';
    if (netWorth >= 2000000) return 'High-Roller Sovereign';
    if (netWorth >= 500000) return 'Financial Titan';
    if (netWorth >= 100000) return 'Venture Capitalist';
    if (netWorth >= 25000) return 'Corporate Magnate';
    if (level >= 10) return 'Senior Executive';
    if (level >= 5) return 'Aspiring Tycoon';
    return 'Novice Entrepreneur';
  }

  public static getProgression(userId: string): UserProgressionData {
    let p = memUserProgression.get(userId);
    if (!p) {
      p = {
        userId,
        xp: 0,
        level: 1,
        title: 'Novice Entrepreneur',
      };
      memUserProgression.set(userId, p);
    }
    return p;
  }

  public static addXp(userId: string, xpGained: number): { level: number; xp: number; title: string; leveledUp: boolean } {
    const p = this.getProgression(userId);
    p.xp += xpGained;
    const oldLevel = p.level;
    const newLevel = Math.floor(Math.sqrt(p.xp / 100)) + 1;
    const leveledUp = newLevel > oldLevel;
    p.level = newLevel;
    return { level: p.level, xp: p.xp, title: p.title, leveledUp };
  }

  public static async calculateAssetBreakdown(userId: string): Promise<PlayerAssetBreakdown> {
    const user = await DatabaseStore.findUserById(userId);
    const liquidCash = user ? user.balance : 0;

    // 1. Stock Market Portfolio Value
    const portfolio = await StockStore.getUserPortfolio(userId);
    let stocksValue = 0;
    for (const pos of portfolio) {
      stocksValue += pos.total_market_value;
    }

    // 2. Real Estate Properties Value
    const properties = await RealEstateStore.getUserProperties(userId);
    let realEstateValue = 0;
    for (const prop of properties) {
      // Asset value equals purchase price plus upgrades investment
      realEstateValue += prop.current_hourly_income * 60.0;
    }

    // 3. Car Dealership Inventory Value
    const dealership = await DealershipStore.getProfile(userId);
    let dealershipValue = dealership.showroom_capacity * 5000.0;
    for (const v of dealership.vehicles_on_display) {
      dealershipValue += v.retail_price;
    }

    // 4. Airport Fleet & Hub Value
    const airport = await AirportStore.getHub(userId);
    let airportFleetValue = airport.runways_count * 120000.0 + airport.waiting_lounges_tier * 35000.0;
    for (const a of airport.fleet) {
      airportFleetValue += a.passenger_capacity * 1000.0;
    }

    // 5. Production Factory Value
    const factory = await FactoryStore.getOverview(userId);
    let factoryValue = factory.automation_level * 40000.0 + factory.storage_capacity * 30.0;
    for (const q of Object.values(factory.materials)) {
      factoryValue += q * 25.0;
    }

    // 6. Agricultural Farm Value
    const farm = await FarmStore.getOverview(userId);
    let farmValue = farm.land_acres * 1200.0 + farm.irrigation_tier * 18000.0;
    for (const b of farm.batches) {
      if (!b.harvested) {
        farmValue += b.yield_market_value;
      }
    }

    // 7. Import/Export Logistics Value
    const importExport = await ImportExportStore.getOverview(userId);
    let shippingValue = importExport.warehouse_capacity_teu * 140.0 + importExport.logistics_level * 75000.0;
    for (const v of importExport.active_voyages) {
      if (v.status !== 'COLLECTED') {
        shippingValue += v.contract_value * 0.5;
      }
    }

    // 8. Cryptocurrency Mining Rigs Value
    const crypto = await CryptoStore.getOverview(userId);
    let cryptoRigsValue = crypto.unclaimed_usd_value;
    for (const r of crypto.rigs) {
      cryptoRigsValue += r.purchase_price;
    }

    const totalAssetsValue = Number(
      (
        stocksValue +
        realEstateValue +
        dealershipValue +
        airportFleetValue +
        factoryValue +
        farmValue +
        shippingValue +
        cryptoRigsValue
      ).toFixed(2)
    );

    const netWorth = Number((liquidCash + totalAssetsValue).toFixed(2));

    return {
      liquid_cash: liquidCash,
      stocks_value: Number(stocksValue.toFixed(2)),
      real_estate_value: Number(realEstateValue.toFixed(2)),
      dealership_value: Number(dealershipValue.toFixed(2)),
      airport_fleet_value: Number(airportFleetValue.toFixed(2)),
      factory_value: Number(factoryValue.toFixed(2)),
      farm_value: Number(farmValue.toFixed(2)),
      shipping_value: Number(shippingValue.toFixed(2)),
      crypto_rigs_value: Number(cryptoRigsValue.toFixed(2)),
      total_assets_value: totalAssetsValue,
      net_worth: netWorth,
    };
  }

  public static async getLeaderboard(limit = 25): Promise<LeaderboardEntry[]> {
    const allUsers = await DatabaseStore.getAllUsers();
    const entries: LeaderboardEntry[] = [];

    for (const user of allUsers) {
      const breakdown = await this.calculateAssetBreakdown(user.id);
      const prog = this.getProgression(user.id);
      const title = this.determineTitle(breakdown.net_worth, prog.level);
      prog.title = title;

      entries.push({
        rank: 0,
        user_id: user.id,
        username: user.username,
        level: prog.level,
        title,
        net_worth: breakdown.net_worth,
        liquid_cash: breakdown.liquid_cash,
        assets_valuation: breakdown.total_assets_value,
      });
    }

    // Sort descending by net worth
    entries.sort((a, b) => b.net_worth - a.net_worth);

    // Assign 1-indexed ranks
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e) {
        e.rank = i + 1;
      }
    }

    return entries.slice(0, limit);
  }

  public static async getPlayerProfile(userId: string): Promise<PlayerProfile> {
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('Player profile not found', 404, 'PLAYER_NOT_FOUND');
    }

    const breakdown = await this.calculateAssetBreakdown(userId);
    const prog = this.getProgression(userId);
    const title = this.determineTitle(breakdown.net_worth, prog.level);
    prog.title = title;

    let currentJobTitle: string | null = null;
    if (user.current_job_id) {
      const job = await DatabaseStore.getJobById(user.current_job_id);
      if (job) currentJobTitle = job.title;
    }

    const xpForNextLevel = Math.pow(prog.level, 2) * 100;

    // Count unlocked achievements
    const { AchievementService } = await import('../progression/achievement.service');
    const achievements = await AchievementService.getUserAchievements(userId);
    const unlockedCount = achievements.filter((a) => a.unlocked).length;

    return {
      user_id: user.id,
      username: user.username,
      level: prog.level,
      title,
      xp: prog.xp,
      xp_for_next_level: xpForNextLevel,
      net_worth: breakdown.net_worth,
      liquid_cash: breakdown.liquid_cash,
      current_job: currentJobTitle,
      joined_at: user.created_at.toISOString(),
      asset_breakdown: breakdown,
      unlocked_achievements_count: unlockedCount,
      total_achievements_count: achievements.length,
    };
  }
}
