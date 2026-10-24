import { pool, getIsPostgresAvailable, withTransaction } from '../pool';
import {
  DealershipVehicle,
  UserDealershipProfile,
  TransactionRecord,
} from '../../types';
import { AppError } from '../../middleware/error.middleware';

interface QueryResultRow {
  [column: string]: unknown;
}

export interface VehicleContractCatalog {
  id: number;
  model_name: string;
  category: string;
  purchase_cost: number;
  base_retail_price: number;
  required_tier: number;
}

export const seedVehicleContracts: VehicleContractCatalog[] = [
  {
    id: 1,
    model_name: 'Sedan EcoRunner 2000',
    category: 'SEDAN',
    purchase_cost: 12000.0,
    base_retail_price: 15500.0,
    required_tier: 1,
  },
  {
    id: 2,
    model_name: 'Urban Cross SUV Turbo',
    category: 'SUV',
    purchase_cost: 26000.0,
    base_retail_price: 33800.0,
    required_tier: 1,
  },
  {
    id: 3,
    model_name: 'Executive Grand Limousine',
    category: 'LUXURY',
    purchase_cost: 65000.0,
    base_retail_price: 88000.0,
    required_tier: 2,
  },
  {
    id: 4,
    model_name: 'Apex Hypercar V12',
    category: 'EXOTIC',
    purchase_cost: 240000.0,
    base_retail_price: 340000.0,
    required_tier: 3,
  },
];

interface MemDealership {
  userId: string;
  showroomCapacity: number;
  customerServiceLevel: number;
  showroomTier: number;
}

const memDealerships = new Map<string, MemDealership>();
const memVehicles = new Map<number, DealershipVehicle>();
let vehicleIdCounter = 1;

export class DealershipStore {
  public static async listVehicleContracts(): Promise<VehicleContractCatalog[]> {
    return [...seedVehicleContracts];
  }

  public static async getProfile(userId: string): Promise<UserDealershipProfile> {
    if (getIsPostgresAvailable()) {
      try {
        let dealerRes = await pool.query<QueryResultRow>(
          `SELECT showroom_capacity, customer_service_level, showroom_tier 
           FROM user_car_dealerships 
           WHERE user_id = $1 LIMIT 1`,
          [userId]
        );

        if (dealerRes.rows.length === 0) {
          await pool.query(
            `INSERT INTO user_car_dealerships (user_id, showroom_capacity, customer_service_level, showroom_tier)
             VALUES ($1, 4, 1, 1)
             ON CONFLICT (user_id) DO NOTHING`,
            [userId]
          );
          dealerRes = await pool.query<QueryResultRow>(
            `SELECT showroom_capacity, customer_service_level, showroom_tier 
             FROM user_car_dealerships 
             WHERE user_id = $1 LIMIT 1`,
            [userId]
          );
        }

        const dealerRow = dealerRes.rows[0];
        const showroomCapacity = dealerRow ? Number(dealerRow.showroom_capacity) : 4;
        const customerServiceLevel = dealerRow ? Number(dealerRow.customer_service_level) : 1;
        const showroomTier = dealerRow ? Number(dealerRow.showroom_tier) : 1;

        const vehiclesRes = await pool.query<QueryResultRow>(
          `SELECT id, user_id, model_name, category, purchase_cost, retail_price, status, acquired_at
           FROM dealership_vehicles
           WHERE user_id = $1 AND status = 'DISPLAY'
           ORDER BY acquired_at DESC`,
          [userId]
        );

        const vehicles: DealershipVehicle[] = vehiclesRes.rows.map((r) => ({
          id: Number(r.id),
          user_id: String(r.user_id),
          model_name: String(r.model_name),
          category: String(r.category),
          purchase_cost: Number(r.purchase_cost),
          retail_price: Number(r.retail_price),
          status: 'DISPLAY',
          acquired_at: new Date(String(r.acquired_at)),
        }));

        return {
          showroom_capacity: showroomCapacity,
          customer_service_level: customerServiceLevel,
          showroom_tier: showroomTier,
          vehicles_on_display: vehicles,
        };
      } catch (err: unknown) {
        process.stdout.write(
          `[DealershipStore] Error in getProfile: ${err instanceof Error ? err.message : String(err)}\n`
        );
      }
    }

    let dealer = memDealerships.get(userId);
    if (!dealer) {
      dealer = {
        userId,
        showroomCapacity: 4,
        customerServiceLevel: 1,
        showroomTier: 1,
      };
      memDealerships.set(userId, dealer);
    }

    const vehicles: DealershipVehicle[] = [];
    for (const v of memVehicles.values()) {
      if (v.user_id === userId && v.status === 'DISPLAY') {
        vehicles.push({ ...v });
      }
    }

    return {
      showroom_capacity: dealer.showroomCapacity,
      customer_service_level: dealer.customerServiceLevel,
      showroom_tier: dealer.showroomTier,
      vehicles_on_display: vehicles,
    };
  }

  public static async orderVehicle(
    userId: string,
    contractId: number
  ): Promise<{ vehicle: DealershipVehicle; newBalance: number; transaction: TransactionRecord }> {
    const contract = seedVehicleContracts.find((c) => c.id === contractId);
    if (!contract) {
      throw new AppError('Vehicle contract does not exist', 404, 'CONTRACT_NOT_FOUND');
    }

    const profile = await this.getProfile(userId);
    if (profile.showroom_tier < contract.required_tier) {
      throw new AppError(
        `Contract requires Showroom Tier ${contract.required_tier}. Your tier: ${profile.showroom_tier}`,
        400,
        'INSUFFICIENT_TIER'
      );
    }

    if (profile.vehicles_on_display.length >= profile.showroom_capacity) {
      throw new AppError(
        `Showroom capacity full (${profile.vehicles_on_display.length}/${profile.showroom_capacity}). Upgrade capacity or sell vehicles.`,
        400,
        'SHOWROOM_CAPACITY_FULL'
      );
    }

    // Customer service level provides a small markup bonus to the retail sale price
    const serviceBonus = 1 + (profile.customer_service_level - 1) * 0.05;
    const finalRetailPrice = Number((contract.base_retail_price * serviceBonus).toFixed(2));
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
        if (balance < contract.purchase_cost) {
          throw new AppError(
            `Insufficient funds to purchase vehicle. Cost: $${contract.purchase_cost.toFixed(2)}, Balance: $${balance.toFixed(2)}`,
            400,
            'INSUFFICIENT_FUNDS'
          );
        }

        const newBalance = Number((balance - contract.purchase_cost).toFixed(2));
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

        const vehRes = await client.query<QueryResultRow>(
          `INSERT INTO dealership_vehicles (user_id, model_name, category, purchase_cost, retail_price, status, acquired_at)
           VALUES ($1, $2, $3, $4, $5, 'DISPLAY', $6)
           RETURNING id, user_id, model_name, category, purchase_cost, retail_price, status, acquired_at`,
          [userId, contract.model_name, contract.category, contract.purchase_cost, finalRetailPrice, now]
        );
        const vehRow = vehRes.rows[0];
        if (!vehRow) {
          throw new AppError('Failed to record vehicle in inventory', 500, 'DATABASE_ERROR');
        }

        const txRes = await client.query<QueryResultRow>(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'CAR_PURCHASE', $3)
           RETURNING id, sender_id, receiver_id, amount, fee, status, type, created_at`,
          [userId, contract.purchase_cost, now]
        );
        const txRow = txRes.rows[0];
        if (!txRow) {
          throw new AppError('Failed to record transaction', 500, 'DATABASE_ERROR');
        }

        const vehicle: DealershipVehicle = {
          id: Number(vehRow.id),
          user_id: userId,
          model_name: contract.model_name,
          category: contract.category,
          purchase_cost: contract.purchase_cost,
          retail_price: finalRetailPrice,
          status: 'DISPLAY',
          acquired_at: now,
        };

        const transaction: TransactionRecord = {
          id: Number(txRow.id),
          sender_id: userId,
          receiver_id: userId,
          amount: contract.purchase_cost,
          fee: 0,
          status: 'COMPLETED',
          type: 'CAR_PURCHASE',
          created_at: now,
        };

        return { vehicle, newBalance, transaction };
      });
    }

    const { DatabaseStore } = await import('../store');
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    if (user.balance < contract.purchase_cost) {
      throw new AppError('Insufficient funds to purchase vehicle', 400, 'INSUFFICIENT_FUNDS');
    }

    const newBalance = Number((user.balance - contract.purchase_cost).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, now);

    const vehicleId = vehicleIdCounter++;
    const vehicle: DealershipVehicle = {
      id: vehicleId,
      user_id: userId,
      model_name: contract.model_name,
      category: contract.category,
      purchase_cost: contract.purchase_cost,
      retail_price: finalRetailPrice,
      status: 'DISPLAY',
      acquired_at: now,
    };
    memVehicles.set(vehicleId, vehicle);

    const tx = await DatabaseStore.createTransaction(
      userId,
      userId,
      contract.purchase_cost,
      'CAR_PURCHASE',
      0,
      'COMPLETED'
    );

    return { vehicle, newBalance, transaction: tx };
  }

  public static async sellVehicle(
    userId: string,
    vehicleId: number
  ): Promise<{ soldVehicle: DealershipVehicle; saleProceeds: number; newBalance: number; transaction: TransactionRecord }> {
    const now = new Date();

    if (getIsPostgresAvailable()) {
      return withTransaction(async (client) => {
        const vehRes = await client.query<QueryResultRow>(
          `SELECT id, user_id, model_name, category, purchase_cost, retail_price, status, acquired_at 
           FROM dealership_vehicles 
           WHERE id = $1 AND user_id = $2 AND status = 'DISPLAY' FOR UPDATE`,
          [vehicleId, userId]
        );
        if (vehRes.rows.length === 0 || !vehRes.rows[0]) {
          throw new AppError('Vehicle not available on display in showroom', 404, 'VEHICLE_NOT_FOUND');
        }

        const vehRow = vehRes.rows[0];
        const saleProceeds = Number(vehRow.retail_price);

        const userRes = await client.query<QueryResultRow>(
          'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
          [userId]
        );
        if (userRes.rows.length === 0 || !userRes.rows[0]) {
          throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        const currentBalance = Number(userRes.rows[0].balance);
        const newBalance = Number((currentBalance + saleProceeds).toFixed(2));

        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);
        await client.query("UPDATE dealership_vehicles SET status = 'SOLD' WHERE id = $1", [vehicleId]);

        const txRes = await client.query<QueryResultRow>(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'CAR_SALE', $3)
           RETURNING id, sender_id, receiver_id, amount, fee, status, type, created_at`,
          [userId, saleProceeds, now]
        );
        const txRow = txRes.rows[0];
        if (!txRow) {
          throw new AppError('Failed to record sale transaction', 500, 'DATABASE_ERROR');
        }

        const soldVehicle: DealershipVehicle = {
          id: Number(vehRow.id),
          user_id: userId,
          model_name: String(vehRow.model_name),
          category: String(vehRow.category),
          purchase_cost: Number(vehRow.purchase_cost),
          retail_price: saleProceeds,
          status: 'SOLD',
          acquired_at: new Date(String(vehRow.acquired_at)),
        };

        const transaction: TransactionRecord = {
          id: Number(txRow.id),
          sender_id: userId,
          receiver_id: userId,
          amount: saleProceeds,
          fee: 0,
          status: 'COMPLETED',
          type: 'CAR_SALE',
          created_at: now,
        };

        return { soldVehicle, saleProceeds, newBalance, transaction };
      });
    }

    const { DatabaseStore } = await import('../store');
    const veh = memVehicles.get(vehicleId);
    if (!veh || veh.user_id !== userId || veh.status !== 'DISPLAY') {
      throw new AppError('Vehicle not available on display in showroom', 404, 'VEHICLE_NOT_FOUND');
    }

    const saleProceeds = veh.retail_price;
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const newBalance = Number((user.balance + saleProceeds).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, now);

    veh.status = 'SOLD';
    const tx = await DatabaseStore.createTransaction(
      userId,
      userId,
      saleProceeds,
      'CAR_SALE',
      0,
      'COMPLETED'
    );

    return { soldVehicle: { ...veh }, saleProceeds, newBalance, transaction: tx };
  }

  public static async upgradeShowroom(
    userId: string,
    upgradeType: 'CAPACITY' | 'SERVICE' | 'TIER'
  ): Promise<{ profile: UserDealershipProfile; newBalance: number; upgradeCost: number }> {
    const profile = await this.getProfile(userId);
    let upgradeCost = 0;

    if (upgradeType === 'CAPACITY') {
      upgradeCost = profile.showroom_capacity * 5000.0;
    } else if (upgradeType === 'SERVICE') {
      upgradeCost = profile.customer_service_level * 8000.0;
    } else if (upgradeType === 'TIER') {
      upgradeCost = profile.showroom_tier * 50000.0;
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
            `Insufficient funds for upgrade. Cost: $${upgradeCost.toFixed(2)}, Balance: $${balance.toFixed(2)}`,
            400,
            'INSUFFICIENT_FUNDS'
          );
        }

        const newBalance = Number((balance - upgradeCost).toFixed(2));
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

        let nextCapacity = profile.showroom_capacity;
        let nextService = profile.customer_service_level;
        let nextTier = profile.showroom_tier;

        if (upgradeType === 'CAPACITY') {
          nextCapacity += 2;
          await client.query('UPDATE user_car_dealerships SET showroom_capacity = $1 WHERE user_id = $2', [
            nextCapacity,
            userId,
          ]);
        } else if (upgradeType === 'SERVICE') {
          nextService += 1;
          await client.query('UPDATE user_car_dealerships SET customer_service_level = $1 WHERE user_id = $2', [
            nextService,
            userId,
          ]);
        } else if (upgradeType === 'TIER') {
          nextTier += 1;
          await client.query('UPDATE user_car_dealerships SET showroom_tier = $1 WHERE user_id = $2', [
            nextTier,
            userId,
          ]);
        }

        await client.query(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'BUSINESS_INVESTMENT', $3)`,
          [userId, upgradeCost, now]
        );

        const updatedProfile: UserDealershipProfile = {
          showroom_capacity: nextCapacity,
          customer_service_level: nextService,
          showroom_tier: nextTier,
          vehicles_on_display: profile.vehicles_on_display,
        };

        return { profile: updatedProfile, newBalance, upgradeCost };
      });
    }

    const { DatabaseStore } = await import('../store');
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    if (user.balance < upgradeCost) {
      throw new AppError('Insufficient funds for upgrade', 400, 'INSUFFICIENT_FUNDS');
    }

    const newBalance = Number((user.balance - upgradeCost).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, now);

    const dealer = memDealerships.get(userId) ?? {
      userId,
      showroomCapacity: 4,
      customerServiceLevel: 1,
      showroomTier: 1,
    };

    if (upgradeType === 'CAPACITY') {
      dealer.showroomCapacity += 2;
    } else if (upgradeType === 'SERVICE') {
      dealer.customerServiceLevel += 1;
    } else if (upgradeType === 'TIER') {
      dealer.showroomTier += 1;
    }
    memDealerships.set(userId, dealer);

    await DatabaseStore.createTransaction(userId, userId, upgradeCost, 'BUSINESS_INVESTMENT', 0, 'COMPLETED');

    const updatedProfile: UserDealershipProfile = {
      showroom_capacity: dealer.showroomCapacity,
      customer_service_level: dealer.customerServiceLevel,
      showroom_tier: dealer.showroomTier,
      vehicles_on_display: profile.vehicles_on_display,
    };

    return { profile: updatedProfile, newBalance, upgradeCost };
  }
}
