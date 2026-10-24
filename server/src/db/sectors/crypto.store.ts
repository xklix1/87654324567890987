import { pool, getIsPostgresAvailable, withTransaction } from '../pool';
import {
  CryptoCoinCatalog,
  MiningRigRecord,
  UserCryptoMiningOverview,
  TransactionRecord,
} from '../../types';
import { AppError } from '../../middleware/error.middleware';

interface QueryResultRow {
  [column: string]: unknown;
}

export interface GpuRigCatalogItem {
  id: number;
  gpu_model: string;
  hashrate_mhs: number;
  power_watts: number;
  purchase_price: number;
}

export const gpuRigCatalog: GpuRigCatalogItem[] = [
  {
    id: 1,
    gpu_model: 'GeForce RTX 4080 Super Miner',
    hashrate_mhs: 115.0,
    power_watts: 320,
    purchase_price: 3200.0,
  },
  {
    id: 2,
    gpu_model: 'GeForce RTX 4090 Tycoon Rig',
    hashrate_mhs: 190.0,
    power_watts: 450,
    purchase_price: 5800.0,
  },
  {
    id: 3,
    gpu_model: 'ASIC AntMiner Hydropower X1',
    hashrate_mhs: 850.0,
    power_watts: 1800,
    purchase_price: 24000.0,
  },
  {
    id: 4,
    gpu_model: 'Quantum Superconducting Hash Blade',
    hashrate_mhs: 3200.0,
    power_watts: 4800,
    purchase_price: 95000.0,
  },
];

const seedCoins: CryptoCoinCatalog[] = [
  {
    id: 1,
    symbol: 'BTC',
    name: 'Bitcoin Hash',
    market_price: 64500.0,
    network_difficulty: 82.5,
    block_reward: 0.00045,
    last_updated: new Date(),
  },
  {
    id: 2,
    symbol: 'ETH',
    name: 'Ethereum Compute',
    market_price: 3450.0,
    network_difficulty: 14.2,
    block_reward: 0.0085,
    last_updated: new Date(),
  },
  {
    id: 3,
    symbol: 'SLV',
    name: 'Silver Coin Chain',
    market_price: 120.0,
    network_difficulty: 2.1,
    block_reward: 0.25,
    last_updated: new Date(),
  },
];

interface MemMiningOp {
  userId: string;
  selectedCoinId: number;
  totalHashrateMhs: number;
  powerConsumptionWatts: number;
  electricityRateKwh: number;
  minedUnclaimedBalance: number;
  lastMinedAt: Date;
}

const memCoins = new Map<number, CryptoCoinCatalog>(seedCoins.map((c) => [c.id, { ...c }]));
const memOps = new Map<string, MemMiningOp>();
const memRigs = new Map<number, MiningRigRecord>();
let rigIdCounter = 1;

export class CryptoStore {
  public static async listCoins(): Promise<CryptoCoinCatalog[]> {
    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          `SELECT id, symbol, name, market_price, network_difficulty, block_reward, last_updated 
           FROM crypto_coins 
           ORDER BY market_price DESC`
        );
        if (result.rows.length > 0) {
          return result.rows.map((r) => ({
            id: Number(r.id),
            symbol: String(r.symbol),
            name: String(r.name),
            market_price: Number(r.market_price),
            network_difficulty: Number(r.network_difficulty),
            block_reward: Number(r.block_reward),
            last_updated: new Date(String(r.last_updated)),
          }));
        }
      } catch (err: unknown) {
        process.stdout.write(
          `[CryptoStore] Error querying crypto coins: ${err instanceof Error ? err.message : String(err)}\n`
        );
      }
    }
    return Array.from(memCoins.values());
  }

  public static async listRigCatalog(): Promise<GpuRigCatalogItem[]> {
    return [...gpuRigCatalog];
  }

  public static async getOverview(userId: string): Promise<UserCryptoMiningOverview> {
    const coins = await this.listCoins();
    const defaultCoin = coins[0] ?? seedCoins[0]!;
    const now = new Date();

    if (getIsPostgresAvailable()) {
      try {
        let opRes = await pool.query<QueryResultRow>(
          `SELECT selected_coin_id, total_hashrate_mhs, power_consumption_watts, 
                  electricity_rate_kwh, mined_unclaimed_balance, last_mined_at
           FROM user_crypto_mining 
           WHERE user_id = $1 LIMIT 1`,
          [userId]
        );

        if (opRes.rows.length === 0) {
          await pool.query(
            `INSERT INTO user_crypto_mining 
             (user_id, selected_coin_id, total_hashrate_mhs, power_consumption_watts, electricity_rate_kwh, mined_unclaimed_balance, last_mined_at)
             VALUES ($1, $2, 0.00, 0, 0.12, 0.00000000, $3)
             ON CONFLICT (user_id) DO NOTHING`,
            [userId, defaultCoin.id, now]
          );
          opRes = await pool.query<QueryResultRow>(
            `SELECT selected_coin_id, total_hashrate_mhs, power_consumption_watts, 
                    electricity_rate_kwh, mined_unclaimed_balance, last_mined_at
             FROM user_crypto_mining 
             WHERE user_id = $1 LIMIT 1`,
            [userId]
          );
        }

        const opRow = opRes.rows[0];
        const selectedCoinId = opRow ? Number(opRow.selected_coin_id) : defaultCoin.id;
        const selectedCoin = coins.find((c) => c.id === selectedCoinId) ?? defaultCoin;
        const totalHashrate = opRow ? Number(opRow.total_hashrate_mhs) : 0;
        const powerWatts = opRow ? Number(opRow.power_consumption_watts) : 0;
        const electricityRate = opRow ? Number(opRow.electricity_rate_kwh) : 0.12;
        let unclaimedBalance = opRow ? Number(opRow.mined_unclaimed_balance) : 0;
        const lastMinedAt = opRow ? new Date(String(opRow.last_mined_at)) : now;

        // Authoritative on-the-fly mining yield accrual
        if (totalHashrate > 0) {
          const elapsedHours = (now.getTime() - lastMinedAt.getTime()) / (1000 * 3600);
          if (elapsedHours > 0.001) {
            // Formula: (hashrate / difficulty) * block_reward * elapsed_hours
            const newlyMined = (totalHashrate / (selectedCoin.network_difficulty * 100)) * selectedCoin.block_reward * elapsedHours;
            unclaimedBalance += newlyMined;

            await pool.query(
              `UPDATE user_crypto_mining 
               SET mined_unclaimed_balance = $1, last_mined_at = $2 
               WHERE user_id = $3`,
              [unclaimedBalance, now, userId]
            );
          }
        }

        const rigsRes = await pool.query<QueryResultRow>(
          `SELECT id, user_id, gpu_model, hashrate_mhs, power_watts, purchase_price, installed_at
           FROM user_mining_rigs
           WHERE user_id = $1
           ORDER BY installed_at DESC`,
          [userId]
        );

        const rigs: MiningRigRecord[] = rigsRes.rows.map((r) => ({
          id: Number(r.id),
          user_id: String(r.user_id),
          gpu_model: String(r.gpu_model),
          hashrate_mhs: Number(r.hashrate_mhs),
          power_watts: Number(r.power_watts),
          purchase_price: Number(r.purchase_price),
          installed_at: new Date(String(r.installed_at)),
        }));

        const hourlyCost = Number(((powerWatts / 1000) * electricityRate).toFixed(4));
        const unclaimedUsd = Number((unclaimedBalance * selectedCoin.market_price).toFixed(2));

        return {
          selected_coin: selectedCoin,
          total_hashrate_mhs: totalHashrate,
          power_consumption_watts: powerWatts,
          electricity_rate_kwh: electricityRate,
          hourly_electricity_cost: hourlyCost,
          mined_unclaimed_balance: Number(unclaimedBalance.toFixed(8)),
          unclaimed_usd_value: unclaimedUsd,
          rigs,
        };
      } catch (err: unknown) {
        process.stdout.write(
          `[CryptoStore] Error in getOverview: ${err instanceof Error ? err.message : String(err)}\n`
        );
      }
    }

    let op = memOps.get(userId);
    if (!op) {
      op = {
        userId,
        selectedCoinId: defaultCoin.id,
        totalHashrateMhs: 0,
        powerConsumptionWatts: 0,
        electricityRateKwh: 0.12,
        minedUnclaimedBalance: 0,
        lastMinedAt: now,
      };
      memOps.set(userId, op);
    }

    const selectedCoin = coins.find((c) => c.id === op!.selectedCoinId) ?? defaultCoin;
    if (op.totalHashrateMhs > 0) {
      const elapsedHours = (now.getTime() - op.lastMinedAt.getTime()) / (1000 * 3600);
      if (elapsedHours > 0.001) {
        const newlyMined = (op.totalHashrateMhs / (selectedCoin.network_difficulty * 100)) * selectedCoin.block_reward * elapsedHours;
        op.minedUnclaimedBalance += newlyMined;
        op.lastMinedAt = now;
      }
    }

    const rigs: MiningRigRecord[] = [];
    for (const r of memRigs.values()) {
      if (r.user_id === userId) {
        rigs.push({ ...r });
      }
    }

    const hourlyCost = Number(((op.powerConsumptionWatts / 1000) * op.electricityRateKwh).toFixed(4));
    const unclaimedUsd = Number((op.minedUnclaimedBalance * selectedCoin.market_price).toFixed(2));

    return {
      selected_coin: selectedCoin,
      total_hashrate_mhs: op.totalHashrateMhs,
      power_consumption_watts: op.powerConsumptionWatts,
      electricity_rate_kwh: op.electricityRateKwh,
      hourly_electricity_cost: hourlyCost,
      mined_unclaimed_balance: Number(op.minedUnclaimedBalance.toFixed(8)),
      unclaimed_usd_value: unclaimedUsd,
      rigs,
    };
  }

  public static async selectCoin(userId: string, coinId: number): Promise<CryptoCoinCatalog> {
    const coins = await this.listCoins();
    const targetCoin = coins.find((c) => c.id === coinId);
    if (!targetCoin) {
      throw new AppError('Crypto coin not found', 404, 'COIN_NOT_FOUND');
    }

    // Refresh and bank current mining progress before switching algorithm
    await this.getOverview(userId);

    if (getIsPostgresAvailable()) {
      await pool.query('UPDATE user_crypto_mining SET selected_coin_id = $1 WHERE user_id = $2', [
        coinId,
        userId,
      ]);
    } else {
      const op = memOps.get(userId);
      if (op) {
        op.selectedCoinId = coinId;
      }
    }

    return targetCoin;
  }

  public static async buyMiningRig(
    userId: string,
    catalogId: number
  ): Promise<{ rig: MiningRigRecord; newBalance: number; transaction: TransactionRecord }> {
    const catalogItem = gpuRigCatalog.find((r) => r.id === catalogId);
    if (!catalogItem) {
      throw new AppError('GPU Mining rig model not found', 404, 'RIG_NOT_FOUND');
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
        if (balance < catalogItem.purchase_price) {
          throw new AppError(
            `Insufficient funds for mining hardware. Cost: $${catalogItem.purchase_price.toFixed(2)}, Balance: $${balance.toFixed(2)}`,
            400,
            'INSUFFICIENT_FUNDS'
          );
        }

        const newBalance = Number((balance - catalogItem.purchase_price).toFixed(2));
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

        const rigRes = await client.query<QueryResultRow>(
          `INSERT INTO user_mining_rigs (user_id, gpu_model, hashrate_mhs, power_watts, purchase_price, installed_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, user_id, gpu_model, hashrate_mhs, power_watts, purchase_price, installed_at`,
          [userId, catalogItem.gpu_model, catalogItem.hashrate_mhs, catalogItem.power_watts, catalogItem.purchase_price, now]
        );
        const rigRow = rigRes.rows[0];
        if (!rigRow) {
          throw new AppError('Failed to record mining hardware installation', 500, 'DATABASE_ERROR');
        }

        await client.query(
          `UPDATE user_crypto_mining 
           SET total_hashrate_mhs = total_hashrate_mhs + $1,
               power_consumption_watts = power_consumption_watts + $2
           WHERE user_id = $3`,
          [catalogItem.hashrate_mhs, catalogItem.power_watts, userId]
        );

        const txRes = await client.query<QueryResultRow>(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'CRYPTO_EQUIPMENT', $3)
           RETURNING id, sender_id, receiver_id, amount, fee, status, type, created_at`,
          [userId, catalogItem.purchase_price, now]
        );
        const txRow = txRes.rows[0];
        if (!txRow) {
          throw new AppError('Failed to record transaction', 500, 'DATABASE_ERROR');
        }

        const rig: MiningRigRecord = {
          id: Number(rigRow.id),
          user_id: userId,
          gpu_model: catalogItem.gpu_model,
          hashrate_mhs: catalogItem.hashrate_mhs,
          power_watts: catalogItem.power_watts,
          purchase_price: catalogItem.purchase_price,
          installed_at: now,
        };

        const transaction: TransactionRecord = {
          id: Number(txRow.id),
          sender_id: userId,
          receiver_id: userId,
          amount: catalogItem.purchase_price,
          fee: 0,
          status: 'COMPLETED',
          type: 'CRYPTO_EQUIPMENT',
          created_at: now,
        };

        return { rig, newBalance, transaction };
      });
    }

    const { DatabaseStore } = await import('../store');
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    if (user.balance < catalogItem.purchase_price) {
      throw new AppError('Insufficient funds for mining hardware', 400, 'INSUFFICIENT_FUNDS');
    }

    const newBalance = Number((user.balance - catalogItem.purchase_price).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, now);

    const rId = rigIdCounter++;
    const rig: MiningRigRecord = {
      id: rId,
      user_id: userId,
      gpu_model: catalogItem.gpu_model,
      hashrate_mhs: catalogItem.hashrate_mhs,
      power_watts: catalogItem.power_watts,
      purchase_price: catalogItem.purchase_price,
      installed_at: now,
    };
    memRigs.set(rId, rig);

    const op = memOps.get(userId) ?? {
      userId,
      selectedCoinId: 1,
      totalHashrateMhs: 0,
      powerConsumptionWatts: 0,
      electricityRateKwh: 0.12,
      minedUnclaimedBalance: 0,
      lastMinedAt: now,
    };
    op.totalHashrateMhs += catalogItem.hashrate_mhs;
    op.powerConsumptionWatts += catalogItem.power_watts;
    memOps.set(userId, op);

    const tx = await DatabaseStore.createTransaction(
      userId,
      userId,
      catalogItem.purchase_price,
      'CRYPTO_EQUIPMENT',
      0,
      'COMPLETED'
    );

    return { rig, newBalance, transaction: tx };
  }

  public static async claimMinedCrypto(
    userId: string
  ): Promise<{ claimedAmount: number; usdPayout: number; newBalance: number; transaction: TransactionRecord }> {
    const overview = await this.getOverview(userId);
    if (overview.mined_unclaimed_balance <= 0 || overview.unclaimed_usd_value <= 0) {
      throw new AppError('No mined crypto available to claim', 400, 'NO_REWARDS_AVAILABLE');
    }

    const claimedAmount = overview.mined_unclaimed_balance;
    const usdPayout = overview.unclaimed_usd_value;
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
        const newBalance = Number((balance + usdPayout).toFixed(2));
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

        await client.query(
          `UPDATE user_crypto_mining 
           SET mined_unclaimed_balance = 0.00000000, last_mined_at = $1 
           WHERE user_id = $2`,
          [now, userId]
        );

        const txRes = await client.query<QueryResultRow>(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'CRYPTO_CLAIM', $3)
           RETURNING id, sender_id, receiver_id, amount, fee, status, type, created_at`,
          [userId, usdPayout, now]
        );
        const txRow = txRes.rows[0];
        if (!txRow) {
          throw new AppError('Failed to record transaction', 500, 'DATABASE_ERROR');
        }

        const transaction: TransactionRecord = {
          id: Number(txRow.id),
          sender_id: userId,
          receiver_id: userId,
          amount: usdPayout,
          fee: 0,
          status: 'COMPLETED',
          type: 'CRYPTO_CLAIM',
          created_at: now,
        };

        return { claimedAmount, usdPayout, newBalance, transaction };
      });
    }

    const { DatabaseStore } = await import('../store');
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const newBalance = Number((user.balance + usdPayout).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, now);

    const op = memOps.get(userId)!;
    op.minedUnclaimedBalance = 0;
    op.lastMinedAt = now;

    const tx = await DatabaseStore.createTransaction(userId, userId, usdPayout, 'CRYPTO_CLAIM', 0, 'COMPLETED');

    return { claimedAmount, usdPayout, newBalance, transaction: tx };
  }
}
