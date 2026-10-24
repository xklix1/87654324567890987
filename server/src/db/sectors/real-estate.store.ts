import { pool, getIsPostgresAvailable, withTransaction } from '../pool';
import {
  RealEstatePropertyCatalog,
  UserPropertyRecord,
  TransactionRecord,
} from '../../types';
import { AppError } from '../../middleware/error.middleware';

interface QueryResultRow {
  [column: string]: unknown;
}

const seedPropertyCatalog: RealEstatePropertyCatalog[] = [
  {
    id: 1,
    name: 'Downtown Convenience Store',
    category: 'RETAIL',
    purchase_price: 15000.0,
    base_hourly_income: 180.0,
    hourly_maintenance_cost: 30.0,
    property_tax_rate: 0.015,
    required_level: 1,
  },
  {
    id: 2,
    name: 'Boutique Espresso Bar',
    category: 'RETAIL',
    purchase_price: 28000.0,
    base_hourly_income: 340.0,
    hourly_maintenance_cost: 50.0,
    property_tax_rate: 0.015,
    required_level: 2,
  },
  {
    id: 3,
    name: 'Suburban Commercial Plaza',
    category: 'COMMERCIAL',
    purchase_price: 95000.0,
    base_hourly_income: 1150.0,
    hourly_maintenance_cost: 180.0,
    property_tax_rate: 0.02,
    required_level: 3,
  },
  {
    id: 4,
    name: 'Luxury High-Rise Tower',
    category: 'RESIDENTIAL',
    purchase_price: 350000.0,
    base_hourly_income: 4200.0,
    hourly_maintenance_cost: 600.0,
    property_tax_rate: 0.025,
    required_level: 5,
  },
];

const memCatalog = new Map<number, RealEstatePropertyCatalog>(
  seedPropertyCatalog.map((p) => [p.id, { ...p }])
);

interface MemUserProperty {
  id: number;
  userId: string;
  propertyId: number;
  upgradeLevel: number;
  lastCollectedAt: Date;
  purchasedAt: Date;
}

const memUserProperties = new Map<number, MemUserProperty>();
let propertyIdCounter = 1;

export class RealEstateStore {
  public static async listCatalog(): Promise<RealEstatePropertyCatalog[]> {
    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          `SELECT id, name, category, purchase_price, base_hourly_income, 
                  hourly_maintenance_cost, property_tax_rate, required_level 
           FROM real_estate_properties 
           ORDER BY purchase_price ASC`
        );
        if (result.rows.length > 0) {
          return result.rows.map((r) => ({
            id: Number(r.id),
            name: String(r.name),
            category: r.category as 'COMMERCIAL' | 'RESIDENTIAL' | 'RETAIL',
            purchase_price: Number(r.purchase_price),
            base_hourly_income: Number(r.base_hourly_income),
            hourly_maintenance_cost: Number(r.hourly_maintenance_cost),
            property_tax_rate: Number(r.property_tax_rate),
            required_level: Number(r.required_level),
          }));
        }
      } catch (err: unknown) {
        process.stdout.write(
          `[RealEstateStore] Error querying catalog: ${err instanceof Error ? err.message : String(err)}\n`
        );
      }
    }
    return Array.from(memCatalog.values());
  }

  public static async getCatalogItem(propertyId: number): Promise<RealEstatePropertyCatalog | null> {
    const catalog = await this.listCatalog();
    return catalog.find((c) => c.id === propertyId) ?? null;
  }

  public static async getUserProperties(userId: string): Promise<UserPropertyRecord[]> {
    const catalog = await this.listCatalog();
    const catalogMap = new Map<number, RealEstatePropertyCatalog>(
      catalog.map((c) => [c.id, c])
    );

    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          `SELECT id, user_id, property_id, upgrade_level, last_collected_at, purchased_at
           FROM user_properties
           WHERE user_id = $1
           ORDER BY purchased_at DESC`,
          [userId]
        );
        return result.rows.map((r) => {
          const propId = Number(r.property_id);
          const catItem = catalogMap.get(propId);
          const level = Number(r.upgrade_level);
          const multiplier = 1 + (level - 1) * 0.35;
          const baseIncome = catItem ? catItem.base_hourly_income : 0;
          const baseMaint = catItem ? catItem.hourly_maintenance_cost : 0;

          return {
            id: Number(r.id),
            user_id: String(r.user_id),
            property_id: propId,
            property_name: catItem ? catItem.name : 'Unknown Property',
            category: catItem ? catItem.category : 'COMMERCIAL',
            upgrade_level: level,
            current_hourly_income: Number((baseIncome * multiplier).toFixed(2)),
            current_maintenance_cost: Number((baseMaint * (1 + (level - 1) * 0.2)).toFixed(2)),
            purchased_at: new Date(String(r.purchased_at)),
          };
        });
      } catch (err: unknown) {
        process.stdout.write(
          `[RealEstateStore] Error querying user properties: ${err instanceof Error ? err.message : String(err)}\n`
        );
      }
    }

    const userProps: UserPropertyRecord[] = [];
    for (const p of memUserProperties.values()) {
      if (p.userId === userId) {
        const catItem = catalogMap.get(p.propertyId);
        const multiplier = 1 + (p.upgradeLevel - 1) * 0.35;
        const baseIncome = catItem ? catItem.base_hourly_income : 0;
        const baseMaint = catItem ? catItem.hourly_maintenance_cost : 0;

        userProps.push({
          id: p.id,
          user_id: p.userId,
          property_id: p.propertyId,
          property_name: catItem ? catItem.name : 'Unknown Property',
          category: catItem ? catItem.category : 'COMMERCIAL',
          upgrade_level: p.upgradeLevel,
          current_hourly_income: Number((baseIncome * multiplier).toFixed(2)),
          current_maintenance_cost: Number((baseMaint * (1 + (p.upgradeLevel - 1) * 0.2)).toFixed(2)),
          purchased_at: p.purchasedAt,
        });
      }
    }
    return userProps;
  }

  public static async purchaseProperty(
    userId: string,
    propertyId: number
  ): Promise<{ property: UserPropertyRecord; newBalance: number; transaction: TransactionRecord }> {
    const catalogItem = await this.getCatalogItem(propertyId);
    if (!catalogItem) {
      throw new AppError('Specified real estate property does not exist in catalog', 404, 'PROPERTY_NOT_FOUND');
    }

    const purchasePrice = catalogItem.purchase_price;
    const now = new Date();

    if (getIsPostgresAvailable()) {
      return withTransaction(async (client) => {
        const userRes = await client.query<QueryResultRow>(
          'SELECT id, balance FROM users WHERE id = $1 FOR UPDATE',
          [userId]
        );
        if (userRes.rows.length === 0 || !userRes.rows[0]) {
          throw new AppError('User account not found', 404, 'USER_NOT_FOUND');
        }

        const currentBalance = Number(userRes.rows[0].balance);
        if (currentBalance < purchasePrice) {
          throw new AppError(
            `Insufficient funds for property purchase. Required: $${purchasePrice.toFixed(2)}, Available: $${currentBalance.toFixed(2)}`,
            400,
            'INSUFFICIENT_FUNDS'
          );
        }

        const newBalance = Number((currentBalance - purchasePrice).toFixed(2));
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

        const propRes = await client.query<QueryResultRow>(
          `INSERT INTO user_properties (user_id, property_id, upgrade_level, last_collected_at, purchased_at)
           VALUES ($1, $2, 1, $3, $3)
           RETURNING id, user_id, property_id, upgrade_level, purchased_at`,
          [userId, propertyId, now]
        );
        const propRow = propRes.rows[0];
        if (!propRow) {
          throw new AppError('Failed to insert user property', 500, 'DATABASE_ERROR');
        }

        const txRes = await client.query<QueryResultRow>(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'REAL_ESTATE_PURCHASE', $3)
           RETURNING id, sender_id, receiver_id, amount, fee, status, type, created_at`,
          [userId, purchasePrice, now]
        );
        const txRow = txRes.rows[0];
        if (!txRow) {
          throw new AppError('Failed to record property purchase transaction', 500, 'DATABASE_ERROR');
        }

        const property: UserPropertyRecord = {
          id: Number(propRow.id),
          user_id: userId,
          property_id: propertyId,
          property_name: catalogItem.name,
          category: catalogItem.category,
          upgrade_level: 1,
          current_hourly_income: catalogItem.base_hourly_income,
          current_maintenance_cost: catalogItem.hourly_maintenance_cost,
          purchased_at: now,
        };

        const transaction: TransactionRecord = {
          id: Number(txRow.id),
          sender_id: userId,
          receiver_id: userId,
          amount: purchasePrice,
          fee: 0,
          status: 'COMPLETED',
          type: 'REAL_ESTATE_PURCHASE',
          created_at: now,
        };

        return { property, newBalance, transaction };
      });
    }

    const { DatabaseStore } = await import('../store');
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    if (user.balance < purchasePrice) {
      throw new AppError('Insufficient funds for property purchase', 400, 'INSUFFICIENT_FUNDS');
    }

    const newBalance = Number((user.balance - purchasePrice).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, now);

    const newId = propertyIdCounter++;
    memUserProperties.set(newId, {
      id: newId,
      userId,
      propertyId,
      upgradeLevel: 1,
      lastCollectedAt: now,
      purchasedAt: now,
    });

    const tx = await DatabaseStore.createTransaction(
      userId,
      userId,
      purchasePrice,
      'REAL_ESTATE_PURCHASE',
      0,
      'COMPLETED'
    );

    const property: UserPropertyRecord = {
      id: newId,
      user_id: userId,
      property_id: propertyId,
      property_name: catalogItem.name,
      category: catalogItem.category,
      upgrade_level: 1,
      current_hourly_income: catalogItem.base_hourly_income,
      current_maintenance_cost: catalogItem.hourly_maintenance_cost,
      purchased_at: now,
    };

    return { property, newBalance, transaction: tx };
  }

  public static async upgradeProperty(
    userId: string,
    userPropertyId: number
  ): Promise<{ property: UserPropertyRecord; newBalance: number; upgradeCost: number }> {
    const catalog = await this.listCatalog();
    const catalogMap = new Map<number, RealEstatePropertyCatalog>(catalog.map((c) => [c.id, c]));
    const now = new Date();

    if (getIsPostgresAvailable()) {
      return withTransaction(async (client) => {
        const propRes = await client.query<QueryResultRow>(
          'SELECT id, user_id, property_id, upgrade_level, purchased_at FROM user_properties WHERE id = $1 AND user_id = $2 FOR UPDATE',
          [userPropertyId, userId]
        );
        if (propRes.rows.length === 0 || !propRes.rows[0]) {
          throw new AppError('Property not found in user portfolio', 404, 'PROPERTY_NOT_FOUND');
        }

        const propRow = propRes.rows[0];
        const propId = Number(propRow.property_id);
        const currentLevel = Number(propRow.upgrade_level);
        const catItem = catalogMap.get(propId);
        if (!catItem) {
          throw new AppError('Catalog item not found', 404, 'CATALOG_NOT_FOUND');
        }

        const upgradeCost = Number((catItem.purchase_price * 0.5 * currentLevel).toFixed(2));

        const userRes = await client.query<QueryResultRow>(
          'SELECT id, balance FROM users WHERE id = $1 FOR UPDATE',
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

        const nextLevel = currentLevel + 1;
        await client.query('UPDATE user_properties SET upgrade_level = $1 WHERE id = $2', [
          nextLevel,
          userPropertyId,
        ]);

        await client.query(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'REAL_ESTATE_PURCHASE', $3)`,
          [userId, upgradeCost, now]
        );

        const multiplier = 1 + (nextLevel - 1) * 0.35;
        const property: UserPropertyRecord = {
          id: userPropertyId,
          user_id: userId,
          property_id: propId,
          property_name: catItem.name,
          category: catItem.category,
          upgrade_level: nextLevel,
          current_hourly_income: Number((catItem.base_hourly_income * multiplier).toFixed(2)),
          current_maintenance_cost: Number((catItem.hourly_maintenance_cost * (1 + (nextLevel - 1) * 0.2)).toFixed(2)),
          purchased_at: new Date(String(propRow.purchased_at)),
        };

        return { property, newBalance, upgradeCost };
      });
    }

    const { DatabaseStore } = await import('../store');
    const memProp = memUserProperties.get(userPropertyId);
    if (!memProp || memProp.userId !== userId) {
      throw new AppError('Property not found in portfolio', 404, 'PROPERTY_NOT_FOUND');
    }

    const catItem = catalogMap.get(memProp.propertyId);
    if (!catItem) {
      throw new AppError('Catalog item not found', 404, 'CATALOG_NOT_FOUND');
    }

    const upgradeCost = Number((catItem.purchase_price * 0.5 * memProp.upgradeLevel).toFixed(2));
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    if (user.balance < upgradeCost) {
      throw new AppError('Insufficient funds for property upgrade', 400, 'INSUFFICIENT_FUNDS');
    }

    const newBalance = Number((user.balance - upgradeCost).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, now);

    memProp.upgradeLevel += 1;
    await DatabaseStore.createTransaction(userId, userId, upgradeCost, 'REAL_ESTATE_PURCHASE', 0, 'COMPLETED');

    const nextLevel = memProp.upgradeLevel;
    const multiplier = 1 + (nextLevel - 1) * 0.35;

    const property: UserPropertyRecord = {
      id: userPropertyId,
      user_id: userId,
      property_id: memProp.propertyId,
      property_name: catItem.name,
      category: catItem.category,
      upgrade_level: nextLevel,
      current_hourly_income: Number((catItem.base_hourly_income * multiplier).toFixed(2)),
      current_maintenance_cost: Number((catItem.hourly_maintenance_cost * (1 + (nextLevel - 1) * 0.2)).toFixed(2)),
      purchased_at: memProp.purchasedAt,
    };

    return { property, newBalance, upgradeCost };
  }
}
