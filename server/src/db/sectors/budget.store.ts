import { pool, getIsPostgresAvailable } from '../pool';
import {
  BudgetStatement,
  BudgetSectorBreakdown,
  BudgetPolicySettings,
  BudgetPolicyKey,
} from '../../types';
import { RealEstateStore } from './real-estate.store';
import { DealershipStore } from './dealership.store';
import { AirportStore } from './airport.store';
import { FactoryStore } from './factory.store';
import { FarmStore } from './farm.store';
import { CryptoStore } from './crypto.store';
import { StockStore } from './stock.store';
import { DatabaseStore } from '../store';
import { AppError } from '../../middleware/error.middleware';

interface QueryResultRow {
  [column: string]: unknown;
}

interface UserBudgetState {
  eco_mode: boolean;
  tax_advisor: boolean;
  emergency_buffer: boolean;
  emergency_reserve: number;
}

const memBudgetStates = new Map<string, UserBudgetState>();

export class BudgetStore {
  public static async getUserPolicies(userId: string): Promise<UserBudgetState> {
    if (getIsPostgresAvailable()) {
      try {
        const res = await pool.query<QueryResultRow>(
          `SELECT eco_mode, tax_advisor, emergency_buffer, emergency_reserve 
           FROM user_budget_policies 
           WHERE user_id = $1 LIMIT 1`,
          [userId]
        );
        if (res.rows.length > 0 && res.rows[0]) {
          return {
            eco_mode: Boolean(res.rows[0].eco_mode),
            tax_advisor: Boolean(res.rows[0].tax_advisor),
            emergency_buffer: Boolean(res.rows[0].emergency_buffer),
            emergency_reserve: Number(res.rows[0].emergency_reserve || 0),
          };
        }
      } catch (err: unknown) {
        process.stdout.write(
          `[BudgetStore] Table check notice: ${err instanceof Error ? err.message : String(err)}\n`
        );
      }
    }

    if (!memBudgetStates.has(userId)) {
      memBudgetStates.set(userId, {
        eco_mode: false,
        tax_advisor: false,
        emergency_buffer: false,
        emergency_reserve: 0,
      });
    }

    return memBudgetStates.get(userId)!;
  }

  public static async togglePolicy(userId: string, policy: BudgetPolicyKey): Promise<BudgetPolicySettings> {
    const current = await this.getUserPolicies(userId);

    if (policy === 'ECO_MODE') {
      current.eco_mode = !current.eco_mode;
    } else if (policy === 'TAX_ADVISOR') {
      current.tax_advisor = !current.tax_advisor;
    } else if (policy === 'EMERGENCY_BUFFER') {
      current.emergency_buffer = !current.emergency_buffer;
    }

    if (getIsPostgresAvailable()) {
      try {
        await pool.query(
          `INSERT INTO user_budget_policies (user_id, eco_mode, tax_advisor, emergency_buffer, emergency_reserve)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id) DO UPDATE SET 
             eco_mode = EXCLUDED.eco_mode,
             tax_advisor = EXCLUDED.tax_advisor,
             emergency_buffer = EXCLUDED.emergency_buffer,
             emergency_reserve = EXCLUDED.emergency_reserve`,
          [
            userId,
            current.eco_mode,
            current.tax_advisor,
            current.emergency_buffer,
            current.emergency_reserve,
          ]
        );
      } catch (err: unknown) {
        process.stdout.write(
          `[BudgetStore] Postgres save notice: ${err instanceof Error ? err.message : String(err)}\n`
        );
      }
    }

    memBudgetStates.set(userId, current);

    return {
      eco_mode: current.eco_mode,
      tax_advisor: current.tax_advisor,
      emergency_buffer: current.emergency_buffer,
    };
  }

  public static async creditEmergencyReserve(userId: string, amount: number): Promise<number> {
    const current = await this.getUserPolicies(userId);
    current.emergency_reserve = Number((current.emergency_reserve + Math.max(0, amount)).toFixed(2));
    memBudgetStates.set(userId, current);
    return current.emergency_reserve;
  }

  public static async withdrawEmergencyReserve(
    userId: string,
    amount: number
  ): Promise<{ newBalance: number; newReserve: number }> {
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const current = await this.getUserPolicies(userId);
    const withdrawable = Math.min(current.emergency_reserve, Math.max(0, amount));
    if (withdrawable <= 0) {
      return { newBalance: user.balance, newReserve: current.emergency_reserve };
    }

    current.emergency_reserve = Number((current.emergency_reserve - withdrawable).toFixed(2));
    memBudgetStates.set(userId, current);

    const newBalance = Number((user.balance + withdrawable).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, new Date());

    return {
      newBalance,
      newReserve: current.emergency_reserve,
    };
  }

  public static async getStatement(userId: string): Promise<BudgetStatement> {
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const policies = await this.getUserPolicies(userId);
    const sectors: BudgetSectorBreakdown[] = [];

    // --- 1. الوظائف والمقر المالي (Career / Job) ---
    let jobInflow = 0;
    if (user.current_job_id) {
      const job = await DatabaseStore.getJobById(user.current_job_id);
      if (job) {
        jobInflow = job.hourly_salary;
      }
    }
    sectors.push({
      sector_id: 'jobs',
      name: 'المقر المالي والرواتب',
      inflow_hourly: Number(jobInflow.toFixed(2)),
      maintenance_hourly: 0,
      tax_hourly: 0,
      utilities_hourly: 0,
      total_outflow_hourly: 0,
      net_hourly: Number(jobInflow.toFixed(2)),
      operating_margin: 100,
    });

    // --- 2. العقارات والأبراج (Real Estate) ---
    const properties = await RealEstateStore.getUserProperties(userId);
    let reInflow = 0;
    let reMaint = 0;
    let reTax = 0;
    for (const p of properties) {
      reInflow += p.current_hourly_income;
      reMaint += p.current_maintenance_cost;
      reTax += p.current_hourly_income * 0.12;
    }
    const reNet = reInflow - reMaint - reTax;
    sectors.push({
      sector_id: 'real_estate',
      name: 'الإمبراطورية العقارية',
      inflow_hourly: Number(reInflow.toFixed(2)),
      maintenance_hourly: Number(reMaint.toFixed(2)),
      tax_hourly: Number(reTax.toFixed(2)),
      utilities_hourly: 0,
      total_outflow_hourly: Number((reMaint + reTax).toFixed(2)),
      net_hourly: Number(reNet.toFixed(2)),
      operating_margin: reInflow > 0 ? Number(((reNet / reInflow) * 100).toFixed(1)) : 0,
    });

    // --- 3. المصانع والإنتاج (Factories) ---
    const factory = await FactoryStore.getOverview(userId);
    const activeLines = factory.lines.filter((l) => l.is_active);
    let factoryInflow = 0;
    let factoryMaint = 0;
    let factoryUtils = 0;

    if (activeLines.length > 0) {
      for (const line of activeLines) {
        const cycleHourlyRuns = 3600 / Math.max(30, line.cycle_duration_seconds);
        const hourlyVal = line.output_units * line.output_unit_value * cycleHourlyRuns;
        factoryInflow += hourlyVal * 0.7 * (1 + factory.automation_level * 0.15);
      }
      factoryMaint = factory.hourly_operating_cost;
      factoryUtils = factory.automation_level * 35.0;
    } else {
      factoryMaint = 5.0;
      factoryUtils = 2.0;
    }
    const factoryNet = factoryInflow - factoryMaint - factoryUtils;
    sectors.push({
      sector_id: 'factories',
      name: 'المصانع والإنتاج الآلي',
      inflow_hourly: Number(factoryInflow.toFixed(2)),
      maintenance_hourly: Number(factoryMaint.toFixed(2)),
      tax_hourly: 0,
      utilities_hourly: Number(factoryUtils.toFixed(2)),
      total_outflow_hourly: Number((factoryMaint + factoryUtils).toFixed(2)),
      net_hourly: Number(factoryNet.toFixed(2)),
      operating_margin: factoryInflow > 0 ? Number(((factoryNet / factoryInflow) * 100).toFixed(1)) : 0,
    });

    // --- 4. المزارع والسلع (Farms) ---
    const farm = await FarmStore.getOverview(userId);
    let farmInflow = 0;
    let farmMaint = 0;
    let farmUtils = 0;

    if (farm.batches && farm.batches.length > 0) {
      for (const b of farm.batches) {
        const cyclesPerHour = 3600 / Math.max(60, b.growth_duration_seconds || 120);
        const yieldVal = (b.yield_market_value || 750) * cyclesPerHour * 0.65;
        farmInflow += yieldVal;
      }
      farmMaint = farm.machinery_tier * 18.0;
      farmUtils = farm.hourly_utility_cost;
    } else {
      farmMaint = 4.0;
      farmUtils = 2.0;
    }
    const farmNet = farmInflow - farmMaint - farmUtils;
    sectors.push({
      sector_id: 'farms',
      name: 'الإنتاج الزراعي والسلع',
      inflow_hourly: Number(farmInflow.toFixed(2)),
      maintenance_hourly: Number(farmMaint.toFixed(2)),
      tax_hourly: 0,
      utilities_hourly: Number(farmUtils.toFixed(2)),
      total_outflow_hourly: Number((farmMaint + farmUtils).toFixed(2)),
      net_hourly: Number(farmNet.toFixed(2)),
      operating_margin: farmInflow > 0 ? Number(((farmNet / farmInflow) * 100).toFixed(1)) : 0,
    });

    // --- 5. معرض السيارات الفارهة (Dealership) ---
    const dealership = await DealershipStore.getProfile(userId);
    const cars = dealership.vehicles_on_display || [];
    let carInflow = 0;
    let carMaint = 0;

    if (cars.length > 0) {
      let inventoryVal = 0;
      for (const car of cars) {
        inventoryVal += car.retail_price || 25000;
      }
      carInflow = inventoryVal * 0.035 * (1 + dealership.customer_service_level * 0.1);
      carMaint = dealership.showroom_capacity * 25.0;
    } else {
      carMaint = 5.0;
    }
    const carNet = carInflow - carMaint;
    sectors.push({
      sector_id: 'dealership',
      name: 'معرض السيارات الفارهة',
      inflow_hourly: Number(carInflow.toFixed(2)),
      maintenance_hourly: Number(carMaint.toFixed(2)),
      tax_hourly: 0,
      utilities_hourly: 0,
      total_outflow_hourly: Number(carMaint.toFixed(2)),
      net_hourly: Number(carNet.toFixed(2)),
      operating_margin: carInflow > 0 ? Number(((carNet / carInflow) * 100).toFixed(1)) : 0,
    });

    // --- 6. أسطول الطيران والمطارات (Aviation Hub) ---
    const airport = await AirportStore.getHub(userId);
    const aircraftList = airport.fleet || [];
    let aviationInflow = 0;
    let aviationMaint = 0;

    if (aircraftList.length > 0) {
      for (const craft of aircraftList) {
        const routeYield = (craft.passenger_capacity * 45.0) / (craft.fuel_efficiency_factor || 1.0);
        aviationInflow += routeYield * 0.75;
      }
      aviationMaint = airport.runways_count * 120.0 + airport.waiting_lounges_tier * 40.0;
    } else {
      aviationMaint = 10.0;
    }
    const aviationNet = aviationInflow - aviationMaint;
    sectors.push({
      sector_id: 'aviation',
      name: 'أسطول الطيران والمطارات',
      inflow_hourly: Number(aviationInflow.toFixed(2)),
      maintenance_hourly: Number(aviationMaint.toFixed(2)),
      tax_hourly: 0,
      utilities_hourly: 0,
      total_outflow_hourly: Number(aviationMaint.toFixed(2)),
      net_hourly: Number(aviationNet.toFixed(2)),
      operating_margin: aviationInflow > 0 ? Number(((aviationNet / aviationInflow) * 100).toFixed(1)) : 0,
    });

    // --- 7. تعدين الكريبتو (Crypto) ---
    const crypto = await CryptoStore.getOverview(userId);
    let cryptoInflow = 0;
    let cryptoUtils = 0;
    if (crypto.rigs && crypto.rigs.length > 0) {
      cryptoInflow = crypto.total_hashrate_mhs * 0.28;
      cryptoUtils = crypto.hourly_electricity_cost;
    } else {
      cryptoUtils = 1.0;
    }
    const cryptoNet = cryptoInflow - cryptoUtils;
    sectors.push({
      sector_id: 'crypto',
      name: 'عناقيد تعدين الكريبتو',
      inflow_hourly: Number(cryptoInflow.toFixed(2)),
      maintenance_hourly: 0,
      tax_hourly: 0,
      utilities_hourly: Number(cryptoUtils.toFixed(2)),
      total_outflow_hourly: Number(cryptoUtils.toFixed(2)),
      net_hourly: Number(cryptoNet.toFixed(2)),
      operating_margin: cryptoInflow > 0 ? Number(((cryptoNet / cryptoInflow) * 100).toFixed(1)) : 0,
    });

    // --- 8. محفظة الأسهم وتوزيعات الأرباح (Stock Portfolio Dividends) ---
    const stockPositions = await StockStore.getUserPortfolio(userId);
    let stockInflow = 0;
    if (stockPositions && stockPositions.length > 0) {
      let totalStockVal = 0;
      for (const pos of stockPositions) {
        totalStockVal += pos.total_market_value || (pos.shares_count * pos.current_price);
      }
      stockInflow = (totalStockVal * 0.035) / 8760 * 35;
    }
    sectors.push({
      sector_id: 'stocks',
      name: 'محفظة وتوزيعات الأسهم',
      inflow_hourly: Number(stockInflow.toFixed(2)),
      maintenance_hourly: 0,
      tax_hourly: 0,
      utilities_hourly: 0,
      total_outflow_hourly: 0,
      net_hourly: Number(stockInflow.toFixed(2)),
      operating_margin: 100,
    });

    // --- Apply Active Policy Adjustments ---
    let totalInflow = 0;
    let totalMaintenance = 0;
    let totalTax = 0;
    let totalUtilities = 0;

    for (const sec of sectors) {
      let secInflow = sec.inflow_hourly;
      let secMaint = sec.maintenance_hourly;
      let secTax = sec.tax_hourly;
      let secUtils = sec.utilities_hourly;

      // Policy: Eco Mode (-25% maintenance & utilities, -8% business inflow)
      if (policies.eco_mode) {
        secMaint = secMaint * 0.75;
        secUtils = secUtils * 0.75;
        if (sec.sector_id !== 'jobs') {
          secInflow = secInflow * 0.92;
        }
      }

      // Policy: Tax Advisor (-15% taxes)
      if (policies.tax_advisor) {
        secTax = secTax * 0.85;
      }

      sec.inflow_hourly = Number(secInflow.toFixed(2));
      sec.maintenance_hourly = Number(secMaint.toFixed(2));
      sec.tax_hourly = Number(secTax.toFixed(2));
      sec.utilities_hourly = Number(secUtils.toFixed(2));
      sec.total_outflow_hourly = Number((secMaint + secTax + secUtils).toFixed(2));
      sec.net_hourly = Number((secInflow - sec.total_outflow_hourly).toFixed(2));
      sec.operating_margin = secInflow > 0 ? Number(((sec.net_hourly / secInflow) * 100).toFixed(1)) : 0;

      totalInflow += sec.inflow_hourly;
      totalMaintenance += sec.maintenance_hourly;
      totalTax += sec.tax_hourly;
      totalUtilities += sec.utilities_hourly;
    }

    // Additional Tax Advisor retainer fee if active ($350/hour)
    if (policies.tax_advisor) {
      totalTax += 350.0;
    }

    // Progressive Wealth Tax Bracket
    let bracketPercentage = 0.5;
    if (user.balance > 10000000) {
      bracketPercentage = 6.5;
    } else if (user.balance > 1000000) {
      bracketPercentage = 4.5;
    } else if (user.balance > 100000) {
      bracketPercentage = 2.0;
    }

    const progressiveTax = Number((totalInflow * (bracketPercentage / 100)).toFixed(2));
    totalTax += progressiveTax;

    const totalOutflow = Number((totalMaintenance + totalTax + totalUtilities).toFixed(2));
    const netFlow = Number((totalInflow - totalOutflow).toFixed(2));
    const operatingMargin = totalInflow > 0 ? Number(((netFlow / totalInflow) * 100).toFixed(1)) : 0;
    const isInFreeze = user.balance <= 0 && netFlow < 0;

    return {
      user_id: userId,
      total_hourly_inflow: Number(totalInflow.toFixed(2)),
      total_hourly_outflow: totalOutflow,
      net_hourly_flow: netFlow,
      net_operating_margin: operatingMargin,
      is_in_freeze: isInFreeze,
      tax_bracket_percentage: bracketPercentage,
      policies: {
        eco_mode: policies.eco_mode,
        tax_advisor: policies.tax_advisor,
        emergency_buffer: policies.emergency_buffer,
      },
      sectors,
      emergency_reserve_balance: policies.emergency_reserve,
      last_calculated_at: new Date().toISOString(),
    };
  }
}
