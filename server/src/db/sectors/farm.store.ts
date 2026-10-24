import { pool, getIsPostgresAvailable, withTransaction } from '../pool';
import {
  FarmBatchRecord,
  UserFarmOverview,
  TransactionRecord,
} from '../../types';
import { AppError } from '../../middleware/error.middleware';

interface QueryResultRow {
  [column: string]: unknown;
}

export interface FarmCultivationOption {
  id: number;
  category: 'CROP' | 'LIVESTOCK';
  name: string;
  acres_required: number;
  base_operational_cost: number;
  base_yield_value: number;
  base_growth_seconds: number;
}

export const farmCultivationCatalog: FarmCultivationOption[] = [
  {
    id: 1,
    category: 'CROP',
    name: 'Organic Golden Wheat',
    acres_required: 4,
    base_operational_cost: 1200.0,
    base_yield_value: 2600.0,
    base_growth_seconds: 60,
  },
  {
    id: 2,
    category: 'CROP',
    name: 'Royal Medjool Date Palms',
    acres_required: 8,
    base_operational_cost: 4500.0,
    base_yield_value: 11800.0,
    base_growth_seconds: 120,
  },
  {
    id: 3,
    category: 'LIVESTOCK',
    name: 'Dairy Cattle Herd',
    acres_required: 6,
    base_operational_cost: 3200.0,
    base_yield_value: 7500.0,
    base_growth_seconds: 90,
  },
  {
    id: 4,
    category: 'LIVESTOCK',
    name: 'Arabian Thoroughbred Stables',
    acres_required: 12,
    base_operational_cost: 15000.0,
    base_yield_value: 42000.0,
    base_growth_seconds: 240,
  },
];

interface MemFarm {
  userId: string;
  landAcres: number;
  irrigationTier: number;
  greenhouseTier: number;
  machineryTier: number;
  hourlyUtilityCost: number;
}

const memFarms = new Map<string, MemFarm>();
const memBatches = new Map<number, FarmBatchRecord>();
let batchIdCounter = 1;

export class FarmStore {
  public static async listCatalog(): Promise<FarmCultivationOption[]> {
    return [...farmCultivationCatalog];
  }

  public static async getOverview(userId: string): Promise<UserFarmOverview> {
    const now = new Date();

    if (getIsPostgresAvailable()) {
      try {
        let farmRes = await pool.query<QueryResultRow>(
          `SELECT land_acres, irrigation_tier, greenhouse_tier, machinery_tier, hourly_utility_cost 
           FROM user_farms 
           WHERE user_id = $1 LIMIT 1`,
          [userId]
        );

        if (farmRes.rows.length === 0) {
          await pool.query(
            `INSERT INTO user_farms (user_id, land_acres, irrigation_tier, greenhouse_tier, machinery_tier, hourly_utility_cost)
             VALUES ($1, 15, 1, 0, 1, 20.00)
             ON CONFLICT (user_id) DO NOTHING`,
            [userId]
          );
          farmRes = await pool.query<QueryResultRow>(
            `SELECT land_acres, irrigation_tier, greenhouse_tier, machinery_tier, hourly_utility_cost 
             FROM user_farms 
             WHERE user_id = $1 LIMIT 1`,
            [userId]
          );
        }

        const farmRow = farmRes.rows[0];
        const landAcres = farmRow ? Number(farmRow.land_acres) : 15;
        const irrigationTier = farmRow ? Number(farmRow.irrigation_tier) : 1;
        const greenhouseTier = farmRow ? Number(farmRow.greenhouse_tier) : 0;
        const machineryTier = farmRow ? Number(farmRow.machinery_tier) : 1;
        const hourlyUtilityCost = farmRow ? Number(farmRow.hourly_utility_cost) : 20.0;

        const batchRes = await pool.query<QueryResultRow>(
          `SELECT id, user_id, category, batch_name, acres_utilized, operational_cost, 
                  yield_market_value, growth_duration_seconds, planted_at, harvested
           FROM farm_batches
           WHERE user_id = $1 AND harvested = FALSE
           ORDER BY planted_at ASC`,
          [userId]
        );

        let acresInUse = 0;
        const batches: FarmBatchRecord[] = batchRes.rows.map((r) => {
          const acres = Number(r.acres_utilized);
          acresInUse += acres;
          const plantedAt = new Date(String(r.planted_at));
          const durationSec = Number(r.growth_duration_seconds);
          const readyToHarvest = now.getTime() >= plantedAt.getTime() + durationSec * 1000;

          return {
            id: Number(r.id),
            user_id: String(r.user_id),
            category: r.category as 'CROP' | 'LIVESTOCK',
            batch_name: String(r.batch_name),
            acres_utilized: acres,
            operational_cost: Number(r.operational_cost),
            yield_market_value: Number(r.yield_market_value),
            growth_duration_seconds: durationSec,
            planted_at: plantedAt,
            harvested: false,
            ready_to_harvest: readyToHarvest,
          };
        });

        return {
          land_acres: landAcres,
          acres_in_use: acresInUse,
          irrigation_tier: irrigationTier,
          greenhouse_tier: greenhouseTier,
          machinery_tier: machineryTier,
          hourly_utility_cost: hourlyUtilityCost,
          batches,
        };
      } catch (err: unknown) {
        process.stdout.write(
          `[FarmStore] Error in getOverview: ${err instanceof Error ? err.message : String(err)}\n`
        );
      }
    }

    let farm = memFarms.get(userId);
    if (!farm) {
      farm = {
        userId,
        landAcres: 15,
        irrigationTier: 1,
        greenhouseTier: 0,
        machineryTier: 1,
        hourlyUtilityCost: 20.0,
      };
      memFarms.set(userId, farm);
    }

    let acresInUse = 0;
    const batches: FarmBatchRecord[] = [];
    for (const b of memBatches.values()) {
      if (b.user_id === userId && !b.harvested) {
        acresInUse += b.acres_utilized;
        const readyToHarvest = now.getTime() >= b.planted_at.getTime() + b.growth_duration_seconds * 1000;
        batches.push({
          ...b,
          ready_to_harvest: readyToHarvest,
        });
      }
    }

    return {
      land_acres: farm.landAcres,
      acres_in_use: acresInUse,
      irrigation_tier: farm.irrigationTier,
      greenhouse_tier: farm.greenhouseTier,
      machinery_tier: farm.machineryTier,
      hourly_utility_cost: farm.hourlyUtilityCost,
      batches,
    };
  }

  public static async plantBatch(
    userId: string,
    catalogOptionId: number
  ): Promise<{ batch: FarmBatchRecord; newBalance: number; transaction: TransactionRecord }> {
    const option = farmCultivationCatalog.find((c) => c.id === catalogOptionId);
    if (!option) {
      throw new AppError('Cultivation option not found in catalog', 404, 'OPTION_NOT_FOUND');
    }

    const overview = await this.getOverview(userId);
    const availableAcres = overview.land_acres - overview.acres_in_use;
    if (availableAcres < option.acres_required) {
      throw new AppError(
        `Insufficient land available. Required: ${option.acres_required} acres, Available: ${availableAcres} acres. Expand land holding.`,
        400,
        'INSUFFICIENT_LAND'
      );
    }

    // Machinery tier reduces operational costs by 8% per level (up to 40%)
    const costDiscount = Math.max(0.6, 1 - (overview.machinery_tier - 1) * 0.08);
    const operationalCost = Number((option.base_operational_cost * costDiscount).toFixed(2));

    // Irrigation tier reduces growth duration by 10% per level
    const timeFactor = Math.max(0.5, 1 - (overview.irrigation_tier - 1) * 0.1);
    const growthSeconds = Math.max(20, Math.round(option.base_growth_seconds * timeFactor));

    // Greenhouse tier increases yield market value by 15% per level
    const yieldMultiplier = 1 + overview.greenhouse_tier * 0.15;
    const yieldValue = Number((option.base_yield_value * yieldMultiplier).toFixed(2));

    const now = new Date();

    if (getIsPostgresAvailable()) {
      return withTransaction(async (client) => {
        const userRes = await client.query<QueryResultRow>(
          'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
          [userId]
        );
        if (userRes.rows.length === 0 || !userRes.rows[0]) {
          throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        const balance = Number(userRes.rows[0].balance);
        if (balance < operationalCost) {
          throw new AppError(
            `Insufficient funds for planting operational costs. Required: $${operationalCost.toFixed(2)}, Available: $${balance.toFixed(2)}`,
            400,
            'INSUFFICIENT_FUNDS'
          );
        }

        const newBalance = Number((balance - operationalCost).toFixed(2));
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

        const batchRes = await client.query<QueryResultRow>(
          `INSERT INTO farm_batches 
           (user_id, category, batch_name, acres_utilized, operational_cost, yield_market_value, growth_duration_seconds, planted_at, harvested)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE)
           RETURNING id, user_id, category, batch_name, acres_utilized, operational_cost, yield_market_value, growth_duration_seconds, planted_at, harvested`,
          [
            userId,
            option.category,
            option.name,
            option.acres_required,
            operationalCost,
            yieldValue,
            growthSeconds,
            now,
          ]
        );
        const batchRow = batchRes.rows[0];
        if (!batchRow) {
          throw new AppError('Failed to record cultivation batch', 500, 'DATABASE_ERROR');
        }

        const txRes = await client.query<QueryResultRow>(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'FARM_EXPENSE', $3)
           RETURNING id, sender_id, receiver_id, amount, fee, status, type, created_at`,
          [userId, operationalCost, now]
        );
        const txRow = txRes.rows[0];
        if (!txRow) {
          throw new AppError('Failed to record transaction', 500, 'DATABASE_ERROR');
        }

        const batch: FarmBatchRecord = {
          id: Number(batchRow.id),
          user_id: userId,
          category: option.category,
          batch_name: option.name,
          acres_utilized: option.acres_required,
          operational_cost: operationalCost,
          yield_market_value: yieldValue,
          growth_duration_seconds: growthSeconds,
          planted_at: now,
          harvested: false,
          ready_to_harvest: false,
        };

        const transaction: TransactionRecord = {
          id: Number(txRow.id),
          sender_id: userId,
          receiver_id: userId,
          amount: operationalCost,
          fee: 0,
          status: 'COMPLETED',
          type: 'FARM_EXPENSE',
          created_at: now,
        };

        return { batch, newBalance, transaction };
      });
    }

    const { DatabaseStore } = await import('../store');
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    if (user.balance < operationalCost) {
      throw new AppError('Insufficient funds for cultivation', 400, 'INSUFFICIENT_FUNDS');
    }

    const newBalance = Number((user.balance - operationalCost).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, now);

    const id = batchIdCounter++;
    const batch: FarmBatchRecord = {
      id,
      user_id: userId,
      category: option.category,
      batch_name: option.name,
      acres_utilized: option.acres_required,
      operational_cost: operationalCost,
      yield_market_value: yieldValue,
      growth_duration_seconds: growthSeconds,
      planted_at: now,
      harvested: false,
      ready_to_harvest: false,
    };
    memBatches.set(id, batch);

    const tx = await DatabaseStore.createTransaction(
      userId,
      userId,
      operationalCost,
      'FARM_EXPENSE',
      0,
      'COMPLETED'
    );

    return { batch, newBalance, transaction: tx };
  }

  public static async harvestBatch(
    userId: string,
    batchId: number
  ): Promise<{ batch: FarmBatchRecord; revenue: number; newBalance: number; transaction: TransactionRecord }> {
    const now = new Date();

    if (getIsPostgresAvailable()) {
      return withTransaction(async (client) => {
        const batchRes = await client.query<QueryResultRow>(
          `SELECT id, user_id, category, batch_name, acres_utilized, operational_cost, 
                  yield_market_value, growth_duration_seconds, planted_at, harvested 
           FROM farm_batches 
           WHERE id = $1 AND user_id = $2 FOR UPDATE`,
          [batchId, userId]
        );
        if (batchRes.rows.length === 0 || !batchRes.rows[0]) {
          throw new AppError('Agricultural batch not found', 404, 'BATCH_NOT_FOUND');
        }

        const batchRow = batchRes.rows[0];
        if (Boolean(batchRow.harvested)) {
          throw new AppError('Batch has already been harvested', 400, 'ALREADY_HARVESTED');
        }

        const plantedAt = new Date(String(batchRow.planted_at));
        const durationSec = Number(batchRow.growth_duration_seconds);
        if (now.getTime() < plantedAt.getTime() + durationSec * 1000) {
          const remainingSec = Math.ceil((plantedAt.getTime() + durationSec * 1000 - now.getTime()) / 1000);
          throw new AppError(
            `Crops or livestock are not ready for harvest yet. Remaining: ${remainingSec} seconds.`,
            400,
            'NOT_MATURED_YET'
          );
        }

        const revenue = Number(batchRow.yield_market_value);

        const userRes = await client.query<QueryResultRow>(
          'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
          [userId]
        );
        if (userRes.rows.length === 0 || !userRes.rows[0]) {
          throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        const balance = Number(userRes.rows[0].balance);
        const newBalance = Number((balance + revenue).toFixed(2));
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

        await client.query('UPDATE farm_batches SET harvested = TRUE WHERE id = $1', [batchId]);

        const txRes = await client.query<QueryResultRow>(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'FARM_HARVEST', $3)
           RETURNING id, sender_id, receiver_id, amount, fee, status, type, created_at`,
          [userId, revenue, now]
        );
        const txRow = txRes.rows[0];
        if (!txRow) {
          throw new AppError('Failed to record transaction', 500, 'DATABASE_ERROR');
        }

        const batch: FarmBatchRecord = {
          id: batchId,
          user_id: userId,
          category: batchRow.category as 'CROP' | 'LIVESTOCK',
          batch_name: String(batchRow.batch_name),
          acres_utilized: Number(batchRow.acres_utilized),
          operational_cost: Number(batchRow.operational_cost),
          yield_market_value: revenue,
          growth_duration_seconds: durationSec,
          planted_at: plantedAt,
          harvested: true,
          ready_to_harvest: true,
        };

        const transaction: TransactionRecord = {
          id: Number(txRow.id),
          sender_id: userId,
          receiver_id: userId,
          amount: revenue,
          fee: 0,
          status: 'COMPLETED',
          type: 'FARM_HARVEST',
          created_at: now,
        };

        return { batch, revenue, newBalance, transaction };
      });
    }

    const { DatabaseStore } = await import('../store');
    const batch = memBatches.get(batchId);
    if (!batch || batch.user_id !== userId) {
      throw new AppError('Agricultural batch not found', 404, 'BATCH_NOT_FOUND');
    }
    if (batch.harvested) {
      throw new AppError('Batch has already been harvested', 400, 'ALREADY_HARVESTED');
    }

    if (now.getTime() < batch.planted_at.getTime() + batch.growth_duration_seconds * 1000) {
      const remainingSec = Math.ceil(
        (batch.planted_at.getTime() + batch.growth_duration_seconds * 1000 - now.getTime()) / 1000
      );
      throw new AppError(`Not matured yet. Remaining: ${remainingSec}s`, 400, 'NOT_MATURED_YET');
    }

    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const revenue = batch.yield_market_value;
    const newBalance = Number((user.balance + revenue).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, now);

    batch.harvested = true;
    batch.ready_to_harvest = true;

    const tx = await DatabaseStore.createTransaction(userId, userId, revenue, 'FARM_HARVEST', 0, 'COMPLETED');

    return { batch: { ...batch }, revenue, newBalance, transaction: tx };
  }

  public static async upgradeFarm(
    userId: string,
    upgradeType: 'EXPAND_LAND' | 'IRRIGATION' | 'GREENHOUSE' | 'MACHINERY'
  ): Promise<{ overview: UserFarmOverview; newBalance: number; upgradeCost: number }> {
    const overview = await this.getOverview(userId);
    let upgradeCost = 0;

    if (upgradeType === 'EXPAND_LAND') {
      upgradeCost = overview.land_acres * 1200.0;
    } else if (upgradeType === 'IRRIGATION') {
      upgradeCost = overview.irrigation_tier * 18000.0;
    } else if (upgradeType === 'GREENHOUSE') {
      upgradeCost = (overview.greenhouse_tier + 1) * 28000.0;
    } else if (upgradeType === 'MACHINERY') {
      upgradeCost = overview.machinery_tier * 22000.0;
    }

    const now = new Date();

    if (getIsPostgresAvailable()) {
      return withTransaction(async (client) => {
        const userRes = await client.query<QueryResultRow>(
          'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
          [userId]
        );
        if (userRes.rows.length === 0 || !userRes.rows[0]) {
          throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        const balance = Number(userRes.rows[0].balance);
        if (balance < upgradeCost) {
          throw new AppError(
            `Insufficient funds for farm upgrade. Cost: $${upgradeCost.toFixed(2)}, Balance: $${balance.toFixed(2)}`,
            400,
            'INSUFFICIENT_FUNDS'
          );
        }

        const newBalance = Number((balance - upgradeCost).toFixed(2));
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

        let land = overview.land_acres;
        let irrigation = overview.irrigation_tier;
        let greenhouse = overview.greenhouse_tier;
        let machinery = overview.machinery_tier;

        if (upgradeType === 'EXPAND_LAND') {
          land += 10;
          await client.query('UPDATE user_farms SET land_acres = $1 WHERE user_id = $2', [land, userId]);
        } else if (upgradeType === 'IRRIGATION') {
          irrigation += 1;
          await client.query('UPDATE user_farms SET irrigation_tier = $1 WHERE user_id = $2', [irrigation, userId]);
        } else if (upgradeType === 'GREENHOUSE') {
          greenhouse += 1;
          await client.query('UPDATE user_farms SET greenhouse_tier = $1 WHERE user_id = $2', [greenhouse, userId]);
        } else if (upgradeType === 'MACHINERY') {
          machinery += 1;
          await client.query('UPDATE user_farms SET machinery_tier = $1 WHERE user_id = $2', [machinery, userId]);
        }

        await client.query(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'BUSINESS_INVESTMENT', $3)`,
          [userId, upgradeCost, now]
        );

        const updatedOverview: UserFarmOverview = {
          land_acres: land,
          acres_in_use: overview.acres_in_use,
          irrigation_tier: irrigation,
          greenhouse_tier: greenhouse,
          machinery_tier: machinery,
          hourly_utility_cost: overview.hourly_utility_cost + (upgradeType === 'IRRIGATION' ? 10.0 : 5.0),
          batches: overview.batches,
        };

        return { overview: updatedOverview, newBalance, upgradeCost };
      });
    }

    const { DatabaseStore } = await import('../store');
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    if (user.balance < upgradeCost) {
      throw new AppError('Insufficient funds for farm upgrade', 400, 'INSUFFICIENT_FUNDS');
    }

    const newBalance = Number((user.balance - upgradeCost).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, now);

    const farm = memFarms.get(userId)!;
    if (upgradeType === 'EXPAND_LAND') {
      farm.landAcres += 10;
    } else if (upgradeType === 'IRRIGATION') {
      farm.irrigationTier += 1;
    } else if (upgradeType === 'GREENHOUSE') {
      farm.greenhouseTier += 1;
    } else if (upgradeType === 'MACHINERY') {
      farm.machineryTier += 1;
    }

    await DatabaseStore.createTransaction(userId, userId, upgradeCost, 'BUSINESS_INVESTMENT', 0, 'COMPLETED');

    const updatedOverview = await this.getOverview(userId);
    return { overview: updatedOverview, newBalance, upgradeCost };
  }
}
