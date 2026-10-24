import { pool, getIsPostgresAvailable } from '../../db/pool';
import { SystemFeatureFlag } from '../../types';

export class FeatureFlagsService {
  private static memFlags = new Map<string, boolean>([
    ['GLOBAL_MAINTENANCE_MODE', false],
    ['P2P_TRANSFERS_ENABLED', true],
    ['STOCK_MARKET_ENABLED', true],
    ['REAL_ESTATE_ENABLED', true],
    ['DEALERSHIP_ENABLED', true],
    ['AIRPORT_ENABLED', true],
    ['FACTORIES_ENABLED', true],
    ['FARMS_ENABLED', true],
    ['LOGISTICS_ENABLED', true],
    ['CRYPTO_ENABLED', true],
  ]);

  private static flagDescriptions = new Map<string, string>([
    ['GLOBAL_MAINTENANCE_MODE', 'Emergency maintenance mode - locks all non-health endpoints'],
    ['P2P_TRANSFERS_ENABLED', 'Peer-to-peer money transfers between player accounts'],
    ['STOCK_MARKET_ENABLED', 'Stock exchange trading and live price ticks'],
    ['REAL_ESTATE_ENABLED', 'Commercial real estate acquisition and revenue accrual'],
    ['DEALERSHIP_ENABLED', 'Vehicle dealership acquisition and showroom trades'],
    ['AIRPORT_ENABLED', 'Airport fleet dispatch and flight revenue collection'],
    ['FACTORIES_ENABLED', 'Manufacturing production cycles and material conversion'],
    ['FARMS_ENABLED', 'Agricultural crops and livestock harvesting'],
    ['LOGISTICS_ENABLED', 'Maritime cargo contracts and shipping routes'],
    ['CRYPTO_ENABLED', 'Cryptocurrency mining rigs and hash rate claiming'],
  ]);

  public static isEnabled(key: string): boolean {
    const val = this.memFlags.get(key);
    return val !== undefined ? val : true;
  }

  public static async isEnabledAsync(key: string): Promise<boolean> {
    if (getIsPostgresAvailable()) {
      try {
        const res = await pool.query<{ enabled: boolean }>(
          'SELECT enabled FROM system_feature_flags WHERE key = $1 LIMIT 1',
          [key]
        );
        if (res.rows.length > 0 && res.rows[0]) {
          const enabled = Boolean(res.rows[0].enabled);
          this.memFlags.set(key, enabled);
          return enabled;
        }
      } catch (err: unknown) {
        // Fallback to in-memory map
      }
    }
    return this.isEnabled(key);
  }

  public static async setFlag(key: string, enabled: boolean): Promise<void> {
    this.memFlags.set(key, enabled);
    if (getIsPostgresAvailable()) {
      try {
        const desc = this.flagDescriptions.get(key) || 'System sector kill-switch';
        await pool.query(
          `INSERT INTO system_feature_flags (key, enabled, description, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (key) DO UPDATE SET enabled = $2, updated_at = NOW()`,
          [key, enabled, desc]
        );
      } catch (err: unknown) {
        process.stderr.write(`[FeatureFlags] Error persisting flag ${key}: ${String(err)}\n`);
      }
    }
  }

  public static async getAllFlags(): Promise<SystemFeatureFlag[]> {
    if (getIsPostgresAvailable()) {
      try {
        const res = await pool.query<{
          key: string;
          enabled: boolean;
          description: string;
          updated_at: Date;
        }>('SELECT key, enabled, description, updated_at FROM system_feature_flags ORDER BY key ASC');
        if (res.rows.length > 0) {
          return res.rows.map((row) => {
            this.memFlags.set(row.key, Boolean(row.enabled));
            return {
              key: row.key,
              enabled: Boolean(row.enabled),
              description: row.description || '',
              updated_at: new Date(row.updated_at).toISOString(),
            };
          });
        }
      } catch {
        // Fallback to in-memory map
      }
    }

    const now = new Date().toISOString();
    return Array.from(this.memFlags.entries()).map(([key, enabled]) => ({
      key,
      enabled,
      description: this.flagDescriptions.get(key) || 'System sector kill-switch',
      updated_at: now,
    }));
  }
}
