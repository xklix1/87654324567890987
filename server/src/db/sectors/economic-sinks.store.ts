import { getIsPostgresAvailable, withTransaction } from '../pool';
import { EconomicSinkSummary, TransactionRecord } from '../../types';
import { AppError } from '../../middleware/error.middleware';
import { RealEstateStore } from './real-estate.store';
import { DealershipStore } from './dealership.store';
import { AirportStore } from './airport.store';
import { FactoryStore } from './factory.store';
import { FarmStore } from './farm.store';
import { CryptoStore } from './crypto.store';

interface QueryResultRow {
  [column: string]: unknown;
}

export class EconomicSinksStore {
  public static async calculateHourlySinks(userId: string): Promise<EconomicSinkSummary> {
    const { BudgetStore } = await import('./budget.store');
    const policies = await BudgetStore.getUserPolicies(userId);

    // 1. Real Estate properties
    const properties = await RealEstateStore.getUserProperties(userId);
    let realEstateMaintenance = 0;
    let realEstateTaxes = 0;

    for (const prop of properties) {
      realEstateMaintenance += prop.current_maintenance_cost;
      realEstateTaxes += (prop.current_hourly_income * 0.12);
    }

    // 2. Dealership showroom (proportional to inventory)
    const dealership = await DealershipStore.getProfile(userId);
    const cars = dealership.vehicles_on_display || [];
    const dealershipMaintenance = cars.length > 0 ? dealership.showroom_capacity * 25.0 : 5.0;

    // 3. Airport hub (proportional to fleet)
    const airport = await AirportStore.getHub(userId);
    const aircraftList = airport.fleet || [];
    const airportMaintenance = aircraftList.length > 0 ? airport.runways_count * 120.0 + airport.waiting_lounges_tier * 40.0 : 10.0;

    // 4. Production Factory (proportional to active lines)
    const factory = await FactoryStore.getOverview(userId);
    const activeLines = factory.lines ? factory.lines.filter((l) => l.is_active) : [];
    const factoryMaintenance = activeLines.length > 0 ? factory.hourly_operating_cost : 5.0;
    const factoryUtilities = activeLines.length > 0 ? factory.automation_level * 35.0 : 2.0;

    // 5. Farm (proportional to batches)
    const farm = await FarmStore.getOverview(userId);
    const farmUtilities = farm.batches && farm.batches.length > 0 ? farm.hourly_utility_cost : 2.0;
    const farmMaintenance = farm.batches && farm.batches.length > 0 ? farm.machinery_tier * 18.0 : 4.0;

    // 6. Crypto mining electricity
    const crypto = await CryptoStore.getOverview(userId);
    const cryptoUtilities = crypto.rigs && crypto.rigs.length > 0 ? crypto.hourly_electricity_cost : 1.0;

    let totalMaint = realEstateMaintenance + dealershipMaintenance + airportMaintenance + factoryMaintenance + farmMaintenance;
    let totalTax = realEstateTaxes;
    let totalUtils = factoryUtilities + farmUtilities + cryptoUtilities;

    // Apply Eco-Mode policy discount (-25% maintenance & utilities)
    if (policies.eco_mode) {
      totalMaint = totalMaint * 0.75;
      totalUtils = totalUtils * 0.75;
    }

    // Apply Tax Advisor policy discount (-15% taxes)
    if (policies.tax_advisor) {
      totalTax = totalTax * 0.85;
    }

    const hourlyMaintenance = Number(totalMaint.toFixed(2));
    const hourlyTaxes = Number(totalTax.toFixed(2));
    const hourlyUtilities = Number(totalUtils.toFixed(2));
    const totalHourlySink = Number((hourlyMaintenance + hourlyTaxes + hourlyUtilities).toFixed(2));

    return {
      hourly_maintenance: hourlyMaintenance,
      hourly_property_taxes: hourlyTaxes,
      hourly_utilities: hourlyUtilities,
      total_hourly_sink: totalHourlySink,
    };
  }

  public static async deductSinks(
    userId: string,
    elapsedHours: number
  ): Promise<{
    deductedTotal: number;
    breakdown: { maintenance: number; taxes: number; utilities: number };
    newBalance: number;
    transactions: TransactionRecord[];
  }> {
    if (elapsedHours <= 0) {
      const { DatabaseStore } = await import('../store');
      const user = await DatabaseStore.findUserById(userId);
      return {
        deductedTotal: 0,
        breakdown: { maintenance: 0, taxes: 0, utilities: 0 },
        newBalance: user ? user.balance : 0,
        transactions: [],
      };
    }

    const sinks = await this.calculateHourlySinks(userId);
    const rawMaintenance = sinks.hourly_maintenance * elapsedHours;
    const rawTaxes = sinks.hourly_property_taxes * elapsedHours;
    const rawUtilities = sinks.hourly_utilities * elapsedHours;
    const rawTotal = rawMaintenance + rawTaxes + rawUtilities;

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
        const actualDeduction = Math.min(balance, Number(rawTotal.toFixed(2)));
        if (actualDeduction <= 0) {
          return {
            deductedTotal: 0,
            breakdown: { maintenance: 0, taxes: 0, utilities: 0 },
            newBalance: balance,
            transactions: [],
          };
        }

        const newBalance = Number((balance - actualDeduction).toFixed(2));
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

        const transactions: TransactionRecord[] = [];
        const scale = rawTotal > 0 ? actualDeduction / rawTotal : 1;
        const maintPart = Number((rawMaintenance * scale).toFixed(2));
        const taxPart = Number((rawTaxes * scale).toFixed(2));
        const utilPart = Number((actualDeduction - maintPart - taxPart).toFixed(2));

        if (maintPart > 0) {
          const res = await client.query<QueryResultRow>(
            `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
             VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'ECONOMIC_SINK_MAINTENANCE', $3)
             RETURNING id, sender_id, receiver_id, amount, fee, status, type, created_at`,
            [userId, maintPart, now]
          );
          if (res.rows[0]) {
            transactions.push({
              id: Number(res.rows[0].id),
              sender_id: userId,
              receiver_id: userId,
              amount: maintPart,
              fee: 0,
              status: 'COMPLETED',
              type: 'ECONOMIC_SINK_MAINTENANCE',
              created_at: now,
            });
          }
        }

        if (taxPart > 0) {
          const res = await client.query<QueryResultRow>(
            `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
             VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'ECONOMIC_SINK_TAX', $3)
             RETURNING id, sender_id, receiver_id, amount, fee, status, type, created_at`,
            [userId, taxPart, now]
          );
          if (res.rows[0]) {
            transactions.push({
              id: Number(res.rows[0].id),
              sender_id: userId,
              receiver_id: userId,
              amount: taxPart,
              fee: 0,
              status: 'COMPLETED',
              type: 'ECONOMIC_SINK_TAX',
              created_at: now,
            });
          }
        }

        if (utilPart > 0) {
          const res = await client.query<QueryResultRow>(
            `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
             VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'ECONOMIC_SINK_UTILITIES', $3)
             RETURNING id, sender_id, receiver_id, amount, fee, status, type, created_at`,
            [userId, utilPart, now]
          );
          if (res.rows[0]) {
            transactions.push({
              id: Number(res.rows[0].id),
              sender_id: userId,
              receiver_id: userId,
              amount: utilPart,
              fee: 0,
              status: 'COMPLETED',
              type: 'ECONOMIC_SINK_UTILITIES',
              created_at: now,
            });
          }
        }

        return {
          deductedTotal: actualDeduction,
          breakdown: { maintenance: maintPart, taxes: taxPart, utilities: utilPart },
          newBalance,
          transactions,
        };
      });
    }

    const { DatabaseStore } = await import('../store');
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const actualDeduction = Math.min(user.balance, Number(rawTotal.toFixed(2)));
    if (actualDeduction <= 0) {
      return {
        deductedTotal: 0,
        breakdown: { maintenance: 0, taxes: 0, utilities: 0 },
        newBalance: user.balance,
        transactions: [],
      };
    }

    const newBalance = Number((user.balance - actualDeduction).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, now);

    const scale = rawTotal > 0 ? actualDeduction / rawTotal : 1;
    const maintPart = Number((rawMaintenance * scale).toFixed(2));
    const taxPart = Number((rawTaxes * scale).toFixed(2));
    const utilPart = Number((actualDeduction - maintPart - taxPart).toFixed(2));

    const transactions: TransactionRecord[] = [];
    if (maintPart > 0) {
      const tx = await DatabaseStore.createTransaction(
        userId,
        userId,
        maintPart,
        'ECONOMIC_SINK_MAINTENANCE',
        0,
        'COMPLETED'
      );
      transactions.push(tx);
    }
    if (taxPart > 0) {
      const tx = await DatabaseStore.createTransaction(
        userId,
        userId,
        taxPart,
        'ECONOMIC_SINK_TAX',
        0,
        'COMPLETED'
      );
      transactions.push(tx);
    }
    if (utilPart > 0) {
      const tx = await DatabaseStore.createTransaction(
        userId,
        userId,
        utilPart,
        'ECONOMIC_SINK_UTILITIES',
        0,
        'COMPLETED'
      );
      transactions.push(tx);
    }

    return {
      deductedTotal: actualDeduction,
      breakdown: { maintenance: maintPart, taxes: taxPart, utilities: utilPart },
      newBalance,
      transactions,
    };
  }
}
