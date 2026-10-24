import { pool, getIsPostgresAvailable, withTransaction } from '../pool';
import {
  TradeContractCatalog,
  UserTradeVoyage,
  UserImportExportOverview,
  TransactionRecord,
} from '../../types';
import { AppError } from '../../middleware/error.middleware';

interface QueryResultRow {
  [column: string]: unknown;
}

const seedTradeContracts: TradeContractCatalog[] = [
  {
    id: 1,
    origin_region: 'Middle East Gateway',
    destination_region: 'North Sea Ports',
    cargo_type: 'Refined Chemical Compounds',
    contract_value: 18000.0,
    prep_cost: 3200.0,
    duration_seconds: 120,
    required_logistics_level: 1,
  },
  {
    id: 2,
    origin_region: 'East Asian Hub',
    destination_region: 'Mediterranean Basin',
    cargo_type: 'Precision Microelectronics',
    contract_value: 45000.0,
    prep_cost: 8500.0,
    duration_seconds: 240,
    required_logistics_level: 2,
  },
  {
    id: 3,
    origin_region: 'Americas Terminals',
    destination_region: 'Arabian Gulf',
    cargo_type: 'Heavy Industrial Machinery',
    contract_value: 110000.0,
    prep_cost: 22000.0,
    duration_seconds: 480,
    required_logistics_level: 4,
  },
];

interface MemImportExport {
  userId: string;
  companyName: string;
  warehouseCapacityTeu: number;
  logisticsLevel: number;
}

const memCompanies = new Map<string, MemImportExport>();
const memVoyages = new Map<number, UserTradeVoyage>();
let voyageIdCounter = 1;

export class ImportExportStore {
  public static async listContracts(): Promise<TradeContractCatalog[]> {
    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          `SELECT id, origin_region, destination_region, cargo_type, contract_value, 
                  prep_cost, duration_seconds, required_logistics_level 
           FROM trade_contracts 
           ORDER BY contract_value ASC`
        );
        if (result.rows.length > 0) {
          return result.rows.map((r) => ({
            id: Number(r.id),
            origin_region: String(r.origin_region),
            destination_region: String(r.destination_region),
            cargo_type: String(r.cargo_type),
            contract_value: Number(r.contract_value),
            prep_cost: Number(r.prep_cost),
            duration_seconds: Number(r.duration_seconds),
            required_logistics_level: Number(r.required_logistics_level),
          }));
        }
      } catch (err: unknown) {
        process.stdout.write(
          `[ImportExportStore] Error querying trade contracts: ${err instanceof Error ? err.message : String(err)}\n`
        );
      }
    }
    return [...seedTradeContracts];
  }

  public static async getOverview(userId: string): Promise<UserImportExportOverview> {
    const contracts = await this.listContracts();
    const contractMap = new Map<number, TradeContractCatalog>(contracts.map((c) => [c.id, c]));
    const now = new Date();

    if (getIsPostgresAvailable()) {
      try {
        let compRes = await pool.query<QueryResultRow>(
          `SELECT company_name, warehouse_capacity_teu, logistics_level 
           FROM user_import_export 
           WHERE user_id = $1 LIMIT 1`,
          [userId]
        );

        if (compRes.rows.length === 0) {
          await pool.query(
            `INSERT INTO user_import_export (user_id, company_name, warehouse_capacity_teu, logistics_level)
             VALUES ($1, 'TransGlobal Maritime Logistics', 250, 1)
             ON CONFLICT (user_id) DO NOTHING`,
            [userId]
          );
          compRes = await pool.query<QueryResultRow>(
            `SELECT company_name, warehouse_capacity_teu, logistics_level 
             FROM user_import_export 
             WHERE user_id = $1 LIMIT 1`,
            [userId]
          );
        }

        const compRow = compRes.rows[0];
        const companyName = compRow ? String(compRow.company_name) : 'TransGlobal Maritime Logistics';
        const warehouseCapacityTeu = compRow ? Number(compRow.warehouse_capacity_teu) : 250;
        const logisticsLevel = compRow ? Number(compRow.logistics_level) : 1;

        const voyRes = await pool.query<QueryResultRow>(
          `SELECT id, user_id, contract_id, vessel_name, started_at, completes_at, status
           FROM user_trade_voyages
           WHERE user_id = $1 AND status != 'COLLECTED'
           ORDER BY started_at DESC`,
          [userId]
        );

        const activeVoyages: UserTradeVoyage[] = voyRes.rows.map((r) => {
          const contractId = Number(r.contract_id);
          const contract = contractMap.get(contractId);
          const completesAt = new Date(String(r.completes_at));
          let status = r.status as 'IN_TRANSIT' | 'COMPLETED' | 'COLLECTED';
          if (status === 'IN_TRANSIT' && now.getTime() >= completesAt.getTime()) {
            status = 'COMPLETED';
          }

          return {
            id: Number(r.id),
            user_id: String(r.user_id),
            contract_id: contractId,
            contract_name: contract ? `${contract.origin_region} -> ${contract.destination_region}` : 'Trade Route',
            vessel_name: String(r.vessel_name),
            started_at: new Date(String(r.started_at)),
            completes_at: completesAt,
            status,
            contract_value: contract ? contract.contract_value : 0,
          };
        });

        return {
          company_name: companyName,
          warehouse_capacity_teu: warehouseCapacityTeu,
          logistics_level: logisticsLevel,
          active_voyages: activeVoyages,
        };
      } catch (err: unknown) {
        process.stdout.write(
          `[ImportExportStore] Error in getOverview: ${err instanceof Error ? err.message : String(err)}\n`
        );
      }
    }

    let company = memCompanies.get(userId);
    if (!company) {
      company = {
        userId,
        companyName: 'TransGlobal Maritime Logistics',
        warehouseCapacityTeu: 250,
        logisticsLevel: 1,
      };
      memCompanies.set(userId, company);
    }

    const activeVoyages: UserTradeVoyage[] = [];
    for (const v of memVoyages.values()) {
      if (v.user_id === userId && v.status !== 'COLLECTED') {
        const contract = contractMap.get(v.contract_id);
        let status = v.status;
        if (status === 'IN_TRANSIT' && now.getTime() >= v.completes_at.getTime()) {
          status = 'COMPLETED';
        }
        activeVoyages.push({
          ...v,
          status,
          contract_value: contract ? contract.contract_value : 0,
        });
      }
    }

    return {
      company_name: company.companyName,
      warehouse_capacity_teu: company.warehouseCapacityTeu,
      logistics_level: company.logisticsLevel,
      active_voyages: activeVoyages,
    };
  }

  public static async dispatchVoyage(
    userId: string,
    contractId: number,
    vesselName: string
  ): Promise<{ voyage: UserTradeVoyage; prepCost: number; newBalance: number; transaction: TransactionRecord }> {
    const contracts = await this.listContracts();
    const contract = contracts.find((c) => c.id === contractId);
    if (!contract) {
      throw new AppError('Trade contract not found', 404, 'CONTRACT_NOT_FOUND');
    }

    const overview = await this.getOverview(userId);
    if (overview.logistics_level < contract.required_logistics_level) {
      throw new AppError(
        `Contract requires Logistics Level ${contract.required_logistics_level}. Current level: ${overview.logistics_level}`,
        400,
        'INSUFFICIENT_LOGISTICS_LEVEL'
      );
    }

    const maxActiveVoyages = overview.logistics_level * 2;
    if (overview.active_voyages.length >= maxActiveVoyages) {
      throw new AppError(
        `Maximum concurrent shipping voyages reached (${overview.active_voyages.length}/${maxActiveVoyages}). Upgrade logistics level.`,
        400,
        'VOYAGE_LIMIT_REACHED'
      );
    }

    const now = new Date();
    const completesAt = new Date(now.getTime() + contract.duration_seconds * 1000);

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
        if (balance < contract.prep_cost) {
          throw new AppError(
            `Insufficient funds for customs and vessel prep fees. Required: $${contract.prep_cost.toFixed(2)}, Balance: $${balance.toFixed(2)}`,
            400,
            'INSUFFICIENT_FUNDS'
          );
        }

        const newBalance = Number((balance - contract.prep_cost).toFixed(2));
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

        const voyRes = await client.query<QueryResultRow>(
          `INSERT INTO user_trade_voyages (user_id, contract_id, vessel_name, started_at, completes_at, status)
           VALUES ($1, $2, $3, $4, $5, 'IN_TRANSIT')
           RETURNING id, user_id, contract_id, vessel_name, started_at, completes_at, status`,
          [userId, contractId, vesselName.trim(), now, completesAt]
        );
        const voyRow = voyRes.rows[0];
        if (!voyRow) {
          throw new AppError('Failed to record trade voyage', 500, 'DATABASE_ERROR');
        }

        const txRes = await client.query<QueryResultRow>(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'TRADE_VOYAGE_EXPENSE', $3)
           RETURNING id, sender_id, receiver_id, amount, fee, status, type, created_at`,
          [userId, contract.prep_cost, now]
        );
        const txRow = txRes.rows[0];
        if (!txRow) {
          throw new AppError('Failed to record transaction', 500, 'DATABASE_ERROR');
        }

        const voyage: UserTradeVoyage = {
          id: Number(voyRow.id),
          user_id: userId,
          contract_id: contractId,
          contract_name: `${contract.origin_region} -> ${contract.destination_region}`,
          vessel_name: vesselName.trim(),
          started_at: now,
          completes_at: completesAt,
          status: 'IN_TRANSIT',
          contract_value: contract.contract_value,
        };

        const transaction: TransactionRecord = {
          id: Number(txRow.id),
          sender_id: userId,
          receiver_id: userId,
          amount: contract.prep_cost,
          fee: 0,
          status: 'COMPLETED',
          type: 'TRADE_VOYAGE_EXPENSE',
          created_at: now,
        };

        return { voyage, prepCost: contract.prep_cost, newBalance, transaction };
      });
    }

    const { DatabaseStore } = await import('../store');
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    if (user.balance < contract.prep_cost) {
      throw new AppError('Insufficient funds for customs & vessel prep', 400, 'INSUFFICIENT_FUNDS');
    }

    const newBalance = Number((user.balance - contract.prep_cost).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, now);

    const vId = voyageIdCounter++;
    const voyage: UserTradeVoyage = {
      id: vId,
      user_id: userId,
      contract_id: contractId,
      contract_name: `${contract.origin_region} -> ${contract.destination_region}`,
      vessel_name: vesselName.trim(),
      started_at: now,
      completes_at: completesAt,
      status: 'IN_TRANSIT',
      contract_value: contract.contract_value,
    };
    memVoyages.set(vId, voyage);

    const tx = await DatabaseStore.createTransaction(
      userId,
      userId,
      contract.prep_cost,
      'TRADE_VOYAGE_EXPENSE',
      0,
      'COMPLETED'
    );

    return { voyage, prepCost: contract.prep_cost, newBalance, transaction: tx };
  }

  public static async collectVoyage(
    userId: string,
    voyageId: number
  ): Promise<{ voyage: UserTradeVoyage; contractPayout: number; newBalance: number; transaction: TransactionRecord }> {
    const contracts = await this.listContracts();
    const contractMap = new Map<number, TradeContractCatalog>(contracts.map((c) => [c.id, c]));
    const now = new Date();

    if (getIsPostgresAvailable()) {
      return withTransaction(async (client) => {
        const voyRes = await client.query<QueryResultRow>(
          `SELECT id, user_id, contract_id, vessel_name, started_at, completes_at, status 
           FROM user_trade_voyages 
           WHERE id = $1 AND user_id = $2 FOR UPDATE`,
          [voyageId, userId]
        );
        if (voyRes.rows.length === 0 || !voyRes.rows[0]) {
          throw new AppError('Trade voyage not found', 404, 'VOYAGE_NOT_FOUND');
        }

        const voyRow = voyRes.rows[0];
        if (voyRow.status === 'COLLECTED') {
          throw new AppError('Trade contract proceeds have already been collected', 400, 'ALREADY_COLLECTED');
        }

        const completesAt = new Date(String(voyRow.completes_at));
        if (now.getTime() < completesAt.getTime()) {
          const remainingSec = Math.ceil((completesAt.getTime() - now.getTime()) / 1000);
          throw new AppError(
            `Vessel is still navigating international waters. Port arrival in ${remainingSec} seconds.`,
            400,
            'VESSEL_STILL_IN_TRANSIT'
          );
        }

        const contract = contractMap.get(Number(voyRow.contract_id));
        const contractPayout = contract ? contract.contract_value : 25000.0;

        const userRes = await client.query<QueryResultRow>(
          'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
          [userId]
        );
        if (userRes.rows.length === 0 || !userRes.rows[0]) {
          throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        const balance = Number(userRes.rows[0].balance);
        const newBalance = Number((balance + contractPayout).toFixed(2));
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

        await client.query("UPDATE user_trade_voyages SET status = 'COLLECTED' WHERE id = $1", [voyageId]);

        const txRes = await client.query<QueryResultRow>(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'TRADE_VOYAGE_REVENUE', $3)
           RETURNING id, sender_id, receiver_id, amount, fee, status, type, created_at`,
          [userId, contractPayout, now]
        );
        const txRow = txRes.rows[0];
        if (!txRow) {
          throw new AppError('Failed to record transaction', 500, 'DATABASE_ERROR');
        }

        const voyage: UserTradeVoyage = {
          id: voyageId,
          user_id: userId,
          contract_id: Number(voyRow.contract_id),
          contract_name: contract ? `${contract.origin_region} -> ${contract.destination_region}` : 'Trade Route',
          vessel_name: String(voyRow.vessel_name),
          started_at: new Date(String(voyRow.started_at)),
          completes_at: completesAt,
          status: 'COLLECTED',
          contract_value: contractPayout,
        };

        const transaction: TransactionRecord = {
          id: Number(txRow.id),
          sender_id: userId,
          receiver_id: userId,
          amount: contractPayout,
          fee: 0,
          status: 'COMPLETED',
          type: 'TRADE_VOYAGE_REVENUE',
          created_at: now,
        };

        return { voyage, contractPayout, newBalance, transaction };
      });
    }

    const { DatabaseStore } = await import('../store');
    const voy = memVoyages.get(voyageId);
    if (!voy || voy.user_id !== userId) {
      throw new AppError('Trade voyage not found', 404, 'VOYAGE_NOT_FOUND');
    }
    if (voy.status === 'COLLECTED') {
      throw new AppError('Trade contract already collected', 400, 'ALREADY_COLLECTED');
    }

    if (now.getTime() < voy.completes_at.getTime()) {
      const remainingSec = Math.ceil((voy.completes_at.getTime() - now.getTime()) / 1000);
      throw new AppError(`Vessel still in transit. Remaining: ${remainingSec}s`, 400, 'VESSEL_STILL_IN_TRANSIT');
    }

    const contract = contractMap.get(voy.contract_id);
    const contractPayout = contract ? contract.contract_value : 25000.0;

    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const newBalance = Number((user.balance + contractPayout).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, now);

    voy.status = 'COLLECTED';
    const tx = await DatabaseStore.createTransaction(
      userId,
      userId,
      contractPayout,
      'TRADE_VOYAGE_REVENUE',
      0,
      'COMPLETED'
    );

    return { voyage: { ...voy }, contractPayout, newBalance, transaction: tx };
  }

  public static async upgradeCompany(
    userId: string,
    upgradeType: 'WAREHOUSE' | 'LOGISTICS'
  ): Promise<{ overview: UserImportExportOverview; newBalance: number; upgradeCost: number }> {
    const overview = await this.getOverview(userId);
    let upgradeCost = 0;

    if (upgradeType === 'WAREHOUSE') {
      upgradeCost = (overview.warehouse_capacity_teu / 250) * 35000.0;
    } else if (upgradeType === 'LOGISTICS') {
      upgradeCost = overview.logistics_level * 75000.0;
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
            `Insufficient funds for trade company upgrade. Cost: $${upgradeCost.toFixed(2)}, Balance: $${balance.toFixed(2)}`,
            400,
            'INSUFFICIENT_FUNDS'
          );
        }

        const newBalance = Number((balance - upgradeCost).toFixed(2));
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

        let warehouse = overview.warehouse_capacity_teu;
        let logistics = overview.logistics_level;

        if (upgradeType === 'WAREHOUSE') {
          warehouse += 250;
          await client.query(
            'UPDATE user_import_export SET warehouse_capacity_teu = $1 WHERE user_id = $2',
            [warehouse, userId]
          );
        } else if (upgradeType === 'LOGISTICS') {
          logistics += 1;
          await client.query(
            'UPDATE user_import_export SET logistics_level = $1 WHERE user_id = $2',
            [logistics, userId]
          );
        }

        await client.query(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'BUSINESS_INVESTMENT', $3)`,
          [userId, upgradeCost, now]
        );

        const updatedOverview: UserImportExportOverview = {
          company_name: overview.company_name,
          warehouse_capacity_teu: warehouse,
          logistics_level: logistics,
          active_voyages: overview.active_voyages,
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
      throw new AppError('Insufficient funds for upgrade', 400, 'INSUFFICIENT_FUNDS');
    }

    const newBalance = Number((user.balance - upgradeCost).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, now);

    const comp = memCompanies.get(userId)!;
    if (upgradeType === 'WAREHOUSE') {
      comp.warehouseCapacityTeu += 250;
    } else if (upgradeType === 'LOGISTICS') {
      comp.logisticsLevel += 1;
    }

    await DatabaseStore.createTransaction(userId, userId, upgradeCost, 'BUSINESS_INVESTMENT', 0, 'COMPLETED');

    const updatedOverview = await this.getOverview(userId);
    return { overview: updatedOverview, newBalance, upgradeCost };
  }
}
