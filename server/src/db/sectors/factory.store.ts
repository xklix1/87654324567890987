import { pool, getIsPostgresAvailable, withTransaction } from '../pool';
import {
  FactoryProductionLine,
  UserFactoryOverview,
  TransactionRecord,
} from '../../types';
import { AppError } from '../../middleware/error.middleware';

interface QueryResultRow {
  [column: string]: unknown;
}

export interface RawMaterialPrice {
  type: string;
  unit_price: number;
}

export const rawMaterialCatalog: RawMaterialPrice[] = [
  { type: 'IRON_ORE', unit_price: 15.0 },
  { type: 'SILICON_INGOT', unit_price: 45.0 },
  { type: 'MICROCHIPS', unit_price: 120.0 },
  { type: 'POLYMERS', unit_price: 25.0 },
];

export interface ProductionBlueprint {
  product_name: string;
  raw_material_type: string;
  raw_material_units: number;
  output_units: number;
  output_unit_value: number;
  cycle_duration_seconds: number;
}

export const factoryBlueprints: ProductionBlueprint[] = [
  {
    product_name: 'Structural Steel Beams',
    raw_material_type: 'IRON_ORE',
    raw_material_units: 50,
    output_units: 35,
    output_unit_value: 32.0,
    cycle_duration_seconds: 60,
  },
  {
    product_name: 'Solar Cell Wafers',
    raw_material_type: 'SILICON_INGOT',
    raw_material_units: 30,
    output_units: 25,
    output_unit_value: 85.0,
    cycle_duration_seconds: 90,
  },
  {
    product_name: 'Avionics Control Units',
    raw_material_type: 'MICROCHIPS',
    raw_material_units: 20,
    output_units: 15,
    output_unit_value: 280.0,
    cycle_duration_seconds: 120,
  },
  {
    product_name: 'Industrial Composite Casing',
    raw_material_type: 'POLYMERS',
    raw_material_units: 40,
    output_units: 30,
    output_unit_value: 55.0,
    cycle_duration_seconds: 60,
  },
];

interface MemFactory {
  userId: string;
  factoryName: string;
  automationLevel: number;
  storageCapacity: number;
  hourlyOperatingCost: number;
  materials: Map<string, number>;
}

const memFactories = new Map<string, MemFactory>();
const memLines = new Map<number, FactoryProductionLine>();
let lineIdCounter = 1;

export class FactoryStore {
  public static async getOverview(userId: string): Promise<UserFactoryOverview> {
    if (getIsPostgresAvailable()) {
      try {
        let facRes = await pool.query<QueryResultRow>(
          `SELECT factory_name, automation_level, storage_capacity, hourly_operating_cost 
           FROM user_factories 
           WHERE user_id = $1 LIMIT 1`,
          [userId]
        );

        if (facRes.rows.length === 0) {
          await pool.query(
            `INSERT INTO user_factories (user_id, factory_name, automation_level, storage_capacity, hourly_operating_cost)
             VALUES ($1, 'Apex Industrial Complex', 1, 1000, 50.00)
             ON CONFLICT (user_id) DO NOTHING`,
            [userId]
          );
          facRes = await pool.query<QueryResultRow>(
            `SELECT factory_name, automation_level, storage_capacity, hourly_operating_cost 
             FROM user_factories 
             WHERE user_id = $1 LIMIT 1`,
            [userId]
          );
        }

        const facRow = facRes.rows[0];
        const factoryName = facRow ? String(facRow.factory_name) : 'Apex Industrial Complex';
        const automationLevel = facRow ? Number(facRow.automation_level) : 1;
        const storageCapacity = facRow ? Number(facRow.storage_capacity) : 1000;
        const hourlyOperatingCost = facRow ? Number(facRow.hourly_operating_cost) : 50.0;

        const matRes = await pool.query<QueryResultRow>(
          'SELECT material_type, quantity FROM factory_materials WHERE user_id = $1',
          [userId]
        );
        const materials: Record<string, number> = {};
        for (const row of matRes.rows) {
          materials[String(row.material_type)] = Number(row.quantity);
        }

        const linesRes = await pool.query<QueryResultRow>(
          `SELECT id, user_id, product_name, raw_material_type, raw_material_units, 
                  output_units, output_unit_value, cycle_duration_seconds, is_active, last_cycle_completed_at
           FROM factory_production_lines
           WHERE user_id = $1
           ORDER BY id ASC`,
          [userId]
        );

        const lines: FactoryProductionLine[] = linesRes.rows.map((r) => ({
          id: Number(r.id),
          user_id: String(r.user_id),
          product_name: String(r.product_name),
          raw_material_type: String(r.raw_material_type),
          raw_material_units: Number(r.raw_material_units),
          output_units: Number(r.output_units),
          output_unit_value: Number(r.output_unit_value),
          cycle_duration_seconds: Number(r.cycle_duration_seconds),
          is_active: Boolean(r.is_active),
          last_cycle_completed_at: new Date(String(r.last_cycle_completed_at)),
        }));

        return {
          factory_name: factoryName,
          automation_level: automationLevel,
          storage_capacity: storageCapacity,
          hourly_operating_cost: hourlyOperatingCost,
          materials,
          lines,
        };
      } catch (err: unknown) {
        process.stdout.write(
          `[FactoryStore] Error in getOverview: ${err instanceof Error ? err.message : String(err)}\n`
        );
      }
    }

    let fac = memFactories.get(userId);
    if (!fac) {
      fac = {
        userId,
        factoryName: 'Apex Industrial Complex',
        automationLevel: 1,
        storageCapacity: 1000,
        hourlyOperatingCost: 50.0,
        materials: new Map<string, number>(),
      };
      memFactories.set(userId, fac);
    }

    const materials: Record<string, number> = {};
    for (const [k, v] of fac.materials.entries()) {
      materials[k] = v;
    }

    const lines: FactoryProductionLine[] = [];
    for (const l of memLines.values()) {
      if (l.user_id === userId) {
        lines.push({ ...l });
      }
    }

    return {
      factory_name: fac.factoryName,
      automation_level: fac.automationLevel,
      storage_capacity: fac.storageCapacity,
      hourly_operating_cost: fac.hourlyOperatingCost,
      materials,
      lines,
    };
  }

  public static async buyMaterials(
    userId: string,
    materialType: string,
    quantity: number
  ): Promise<{ materials: Record<string, number>; cost: number; newBalance: number }> {
    const matInfo = rawMaterialCatalog.find((m) => m.type === materialType);
    if (!matInfo) {
      throw new AppError(`Unknown raw material type: ${materialType}`, 400, 'INVALID_MATERIAL_TYPE');
    }

    const cost = Number((matInfo.unit_price * quantity).toFixed(2));
    const now = new Date();

    if (getIsPostgresAvailable()) {
      return withTransaction(async (client) => {
        const facRes = await client.query<QueryResultRow>(
          'SELECT storage_capacity FROM user_factories WHERE user_id = $1 FOR UPDATE',
          [userId]
        );
        const capacity = facRes.rows.length > 0 && facRes.rows[0] ? Number(facRes.rows[0].storage_capacity) : 1000;

        const currentMatRes = await client.query<QueryResultRow>(
          'SELECT COALESCE(SUM(quantity), 0) AS total_materials FROM factory_materials WHERE user_id = $1',
          [userId]
        );
        const totalMaterials = currentMatRes.rows.length > 0 && currentMatRes.rows[0] ? Number(currentMatRes.rows[0].total_materials) : 0;

        if (totalMaterials + quantity > capacity) {
          throw new AppError(
            `Storage limit exceeded. Current: ${totalMaterials}/${capacity}. Upgrade factory storage.`,
            400,
            'STORAGE_LIMIT_EXCEEDED'
          );
        }

        const userRes = await client.query<QueryResultRow>(
          'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
          [userId]
        );
        if (userRes.rows.length === 0 || !userRes.rows[0]) {
          throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        const balance = Number(userRes.rows[0].balance);
        if (balance < cost) {
          throw new AppError(
            `Insufficient funds to purchase materials. Cost: $${cost.toFixed(2)}, Balance: $${balance.toFixed(2)}`,
            400,
            'INSUFFICIENT_FUNDS'
          );
        }

        const newBalance = Number((balance - cost).toFixed(2));
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

        await client.query(
          `INSERT INTO factory_materials (user_id, material_type, quantity, updated_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, material_type)
           DO UPDATE SET quantity = factory_materials.quantity + EXCLUDED.quantity, updated_at = EXCLUDED.updated_at`,
          [userId, materialType, quantity, now]
        );

        await client.query(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'FACTORY_EXPENSE', $3)`,
          [userId, cost, now]
        );

        const allMatsRes = await client.query<QueryResultRow>(
          'SELECT material_type, quantity FROM factory_materials WHERE user_id = $1',
          [userId]
        );
        const materials: Record<string, number> = {};
        for (const row of allMatsRes.rows) {
          materials[String(row.material_type)] = Number(row.quantity);
        }

        return { materials, cost, newBalance };
      });
    }

    const { DatabaseStore } = await import('../store');
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    if (user.balance < cost) {
      throw new AppError('Insufficient funds for materials', 400, 'INSUFFICIENT_FUNDS');
    }

    const fac = (await this.getOverview(userId)) as UserFactoryOverview;
    let totalStored = 0;
    for (const q of Object.values(fac.materials)) {
      totalStored += q;
    }

    if (totalStored + quantity > fac.storage_capacity) {
      throw new AppError('Storage limit exceeded', 400, 'STORAGE_LIMIT_EXCEEDED');
    }

    const newBalance = Number((user.balance - cost).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, now);

    const memFac = memFactories.get(userId)!;
    const currentQty = memFac.materials.get(materialType) ?? 0;
    memFac.materials.set(materialType, currentQty + quantity);

    await DatabaseStore.createTransaction(userId, userId, cost, 'FACTORY_EXPENSE', 0, 'COMPLETED');

    const materials: Record<string, number> = {};
    for (const [k, v] of memFac.materials.entries()) {
      materials[k] = v;
    }

    return { materials, cost, newBalance };
  }

  public static async addProductionLine(
    userId: string,
    blueprintIndex: number
  ): Promise<FactoryProductionLine> {
    const blueprint = factoryBlueprints[blueprintIndex];
    if (!blueprint) {
      throw new AppError('Invalid factory blueprint index', 400, 'INVALID_BLUEPRINT');
    }

    const overview = await this.getOverview(userId);
    const maxLines = overview.automation_level * 2;
    if (overview.lines.length >= maxLines) {
      throw new AppError(
        `Production line limit reached (${overview.lines.length}/${maxLines}). Upgrade automation level.`,
        400,
        'PRODUCTION_LINE_LIMIT_REACHED'
      );
    }

    const now = new Date();

    if (getIsPostgresAvailable()) {
      const res = await pool.query<QueryResultRow>(
        `INSERT INTO factory_production_lines 
         (user_id, product_name, raw_material_type, raw_material_units, output_units, output_unit_value, cycle_duration_seconds, is_active, last_cycle_completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8)
         RETURNING id, user_id, product_name, raw_material_type, raw_material_units, output_units, output_unit_value, cycle_duration_seconds, is_active, last_cycle_completed_at`,
        [
          userId,
          blueprint.product_name,
          blueprint.raw_material_type,
          blueprint.raw_material_units,
          blueprint.output_units,
          blueprint.output_unit_value,
          blueprint.cycle_duration_seconds,
          now,
        ]
      );
      const row = res.rows[0];
      if (!row) {
        throw new AppError('Failed to create production line', 500, 'DATABASE_ERROR');
      }

      return {
        id: Number(row.id),
        user_id: userId,
        product_name: blueprint.product_name,
        raw_material_type: blueprint.raw_material_type,
        raw_material_units: blueprint.raw_material_units,
        output_units: blueprint.output_units,
        output_unit_value: blueprint.output_unit_value,
        cycle_duration_seconds: blueprint.cycle_duration_seconds,
        is_active: true,
        last_cycle_completed_at: now,
      };
    }

    const id = lineIdCounter++;
    const line: FactoryProductionLine = {
      id,
      user_id: userId,
      product_name: blueprint.product_name,
      raw_material_type: blueprint.raw_material_type,
      raw_material_units: blueprint.raw_material_units,
      output_units: blueprint.output_units,
      output_unit_value: blueprint.output_unit_value,
      cycle_duration_seconds: blueprint.cycle_duration_seconds,
      is_active: true,
      last_cycle_completed_at: now,
    };
    memLines.set(id, line);
    return line;
  }

  public static async executeProductionCycle(
    userId: string,
    lineId: number
  ): Promise<{ line: FactoryProductionLine; revenueEarned: number; newBalance: number; transaction: TransactionRecord }> {
    const overview = await this.getOverview(userId);
    const line = overview.lines.find((l) => l.id === lineId);
    if (!line) {
      throw new AppError('Production line not found', 404, 'LINE_NOT_FOUND');
    }

    const currentQty = overview.materials[line.raw_material_type] ?? 0;
    if (currentQty < line.raw_material_units) {
      throw new AppError(
        `Insufficient raw materials (${line.raw_material_type}). Required: ${line.raw_material_units}, Available: ${currentQty}`,
        400,
        'INSUFFICIENT_MATERIALS'
      );
    }

    // Automation level adds 10% bonus yield per level
    const automationBonus = 1 + (overview.automation_level - 1) * 0.1;
    const finalRevenue = Number((line.output_units * line.output_unit_value * automationBonus).toFixed(2));
    const now = new Date();

    if (getIsPostgresAvailable()) {
      return withTransaction(async (client) => {
        await client.query(
          `UPDATE factory_materials 
           SET quantity = quantity - $1, updated_at = $2
           WHERE user_id = $3 AND material_type = $4`,
          [line.raw_material_units, now, userId, line.raw_material_type]
        );

        const userRes = await client.query<QueryResultRow>(
          'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
          [userId]
        );
        if (userRes.rows.length === 0 || !userRes.rows[0]) {
          throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        const balance = Number(userRes.rows[0].balance);
        const newBalance = Number((balance + finalRevenue).toFixed(2));
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

        await client.query(
          'UPDATE factory_production_lines SET last_cycle_completed_at = $1 WHERE id = $2',
          [now, lineId]
        );

        const txRes = await client.query<QueryResultRow>(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'FACTORY_REVENUE', $3)
           RETURNING id, sender_id, receiver_id, amount, fee, status, type, created_at`,
          [userId, finalRevenue, now]
        );
        const txRow = txRes.rows[0];
        if (!txRow) {
          throw new AppError('Failed to record transaction', 500, 'DATABASE_ERROR');
        }

        const updatedLine: FactoryProductionLine = {
          ...line,
          last_cycle_completed_at: now,
        };

        const transaction: TransactionRecord = {
          id: Number(txRow.id),
          sender_id: userId,
          receiver_id: userId,
          amount: finalRevenue,
          fee: 0,
          status: 'COMPLETED',
          type: 'FACTORY_REVENUE',
          created_at: now,
        };

        return { line: updatedLine, revenueEarned: finalRevenue, newBalance, transaction };
      });
    }

    const { DatabaseStore } = await import('../store');
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const memFac = memFactories.get(userId)!;
    const cur = memFac.materials.get(line.raw_material_type) ?? 0;
    memFac.materials.set(line.raw_material_type, cur - line.raw_material_units);

    const newBalance = Number((user.balance + finalRevenue).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, now);

    const memLine = memLines.get(lineId)!;
    memLine.last_cycle_completed_at = now;

    const tx = await DatabaseStore.createTransaction(
      userId,
      userId,
      finalRevenue,
      'FACTORY_REVENUE',
      0,
      'COMPLETED'
    );

    return { line: { ...memLine }, revenueEarned: finalRevenue, newBalance, transaction: tx };
  }

  public static async upgradeFactory(
    userId: string,
    upgradeType: 'AUTOMATION' | 'STORAGE'
  ): Promise<{ overview: UserFactoryOverview; newBalance: number; upgradeCost: number }> {
    const overview = await this.getOverview(userId);
    let upgradeCost = 0;

    if (upgradeType === 'AUTOMATION') {
      upgradeCost = overview.automation_level * 40000.0;
    } else if (upgradeType === 'STORAGE') {
      upgradeCost = (overview.storage_capacity / 500) * 15000.0;
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

        let automation = overview.automation_level;
        let storage = overview.storage_capacity;

        if (upgradeType === 'AUTOMATION') {
          automation += 1;
          await client.query('UPDATE user_factories SET automation_level = $1 WHERE user_id = $2', [
            automation,
            userId,
          ]);
        } else if (upgradeType === 'STORAGE') {
          storage += 500;
          await client.query('UPDATE user_factories SET storage_capacity = $1 WHERE user_id = $2', [
            storage,
            userId,
          ]);
        }

        await client.query(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'BUSINESS_INVESTMENT', $3)`,
          [userId, upgradeCost, now]
        );

        const updatedOverview: UserFactoryOverview = {
          factory_name: overview.factory_name,
          automation_level: automation,
          storage_capacity: storage,
          hourly_operating_cost: overview.hourly_operating_cost + (upgradeType === 'AUTOMATION' ? 25.0 : 10.0),
          materials: overview.materials,
          lines: overview.lines,
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

    const memFac = memFactories.get(userId)!;
    if (upgradeType === 'AUTOMATION') {
      memFac.automationLevel += 1;
    } else if (upgradeType === 'STORAGE') {
      memFac.storageCapacity += 500;
    }

    await DatabaseStore.createTransaction(userId, userId, upgradeCost, 'BUSINESS_INVESTMENT', 0, 'COMPLETED');

    const updatedOverview = await this.getOverview(userId);
    return { overview: updatedOverview, newBalance, upgradeCost };
  }
}
