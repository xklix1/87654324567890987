import { pool, getIsPostgresAvailable, withTransaction } from '../pool';
import {
  AirportRouteCatalog,
  UserAircraftRecord,
  UserAirportHub,
  TransactionRecord,
} from '../../types';
import { AppError } from '../../middleware/error.middleware';

interface QueryResultRow {
  [column: string]: unknown;
}

export interface AircraftCatalogItem {
  id: number;
  model_name: string;
  passenger_capacity: number;
  fuel_efficiency_factor: number;
  purchase_price: number;
}

export const seedAircraftCatalog: AircraftCatalogItem[] = [
  {
    id: 1,
    model_name: 'SkyCommuter Turboprop 40',
    passenger_capacity: 40,
    fuel_efficiency_factor: 1.2,
    purchase_price: 35000.0,
  },
  {
    id: 2,
    model_name: 'AeroJet Regional 100',
    passenger_capacity: 100,
    fuel_efficiency_factor: 1.0,
    purchase_price: 90000.0,
  },
  {
    id: 3,
    model_name: 'Stratosphere Twin-Aisle 280',
    passenger_capacity: 280,
    fuel_efficiency_factor: 0.85,
    purchase_price: 320000.0,
  },
  {
    id: 4,
    model_name: 'Concordia Supersonic Cruiser 140',
    passenger_capacity: 140,
    fuel_efficiency_factor: 0.7,
    purchase_price: 750000.0,
  },
];

const seedRoutes: AirportRouteCatalog[] = [
  {
    id: 1,
    route_name: 'Domestic Express Line',
    origin_city: 'Capital City',
    destination_city: 'Coast Harbor',
    distance_km: 450,
    base_revenue: 2500.0,
    fuel_cost: 400.0,
    maintenance_cost: 250.0,
    flight_duration_minutes: 15,
  },
  {
    id: 2,
    route_name: 'Trans-Continental Corridor',
    origin_city: 'Capital City',
    destination_city: 'Metro Hub',
    distance_km: 1800,
    base_revenue: 8500.0,
    fuel_cost: 1500.0,
    maintenance_cost: 800.0,
    flight_duration_minutes: 45,
  },
  {
    id: 3,
    route_name: 'Global Financial Shuttle',
    origin_city: 'Capital City',
    destination_city: 'Overseas Center',
    distance_km: 6200,
    base_revenue: 28000.0,
    fuel_cost: 5200.0,
    maintenance_cost: 2600.0,
    flight_duration_minutes: 90,
  },
];

interface MemAirportHub {
  userId: string;
  runwaysCount: number;
  passengerCapacity: number;
  waitingLoungesTier: number;
  dutyFreeTier: number;
}

const memAirportHubs = new Map<string, MemAirportHub>();
const memAircraft = new Map<number, UserAircraftRecord>();
let aircraftIdCounter = 1;

export class AirportStore {
  public static async listRoutes(): Promise<AirportRouteCatalog[]> {
    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          `SELECT id, route_name, origin_city, destination_city, distance_km, 
                  base_revenue, fuel_cost, maintenance_cost, flight_duration_minutes 
           FROM airport_routes 
           ORDER BY distance_km ASC`
        );
        if (result.rows.length > 0) {
          return result.rows.map((r) => ({
            id: Number(r.id),
            route_name: String(r.route_name),
            origin_city: String(r.origin_city),
            destination_city: String(r.destination_city),
            distance_km: Number(r.distance_km),
            base_revenue: Number(r.base_revenue),
            fuel_cost: Number(r.fuel_cost),
            maintenance_cost: Number(r.maintenance_cost),
            flight_duration_minutes: Number(r.flight_duration_minutes),
          }));
        }
      } catch (err: unknown) {
        process.stdout.write(
          `[AirportStore] Error querying routes: ${err instanceof Error ? err.message : String(err)}\n`
        );
      }
    }
    return [...seedRoutes];
  }

  public static async listAircraftCatalog(): Promise<AircraftCatalogItem[]> {
    return [...seedAircraftCatalog];
  }

  public static async getHub(userId: string): Promise<UserAirportHub> {
    if (getIsPostgresAvailable()) {
      try {
        let hubRes = await pool.query<QueryResultRow>(
          `SELECT runways_count, passenger_capacity, waiting_lounges_tier, duty_free_tier 
           FROM user_airports 
           WHERE user_id = $1 LIMIT 1`,
          [userId]
        );

        if (hubRes.rows.length === 0) {
          await pool.query(
            `INSERT INTO user_airports (user_id, runways_count, passenger_capacity, waiting_lounges_tier, duty_free_tier)
             VALUES ($1, 1, 200, 1, 0)
             ON CONFLICT (user_id) DO NOTHING`,
            [userId]
          );
          hubRes = await pool.query<QueryResultRow>(
            `SELECT runways_count, passenger_capacity, waiting_lounges_tier, duty_free_tier 
             FROM user_airports 
             WHERE user_id = $1 LIMIT 1`,
            [userId]
          );
        }

        const hubRow = hubRes.rows[0];
        const runwaysCount = hubRow ? Number(hubRow.runways_count) : 1;
        const passengerCapacity = hubRow ? Number(hubRow.passenger_capacity) : 200;
        const waitingLoungesTier = hubRow ? Number(hubRow.waiting_lounges_tier) : 1;
        const dutyFreeTier = hubRow ? Number(hubRow.duty_free_tier) : 0;

        const fleetRes = await pool.query<QueryResultRow>(
          `SELECT id, user_id, model_name, passenger_capacity, fuel_efficiency_factor, status, 
                  current_route_id, flight_departure_at, flight_arrival_at
           FROM user_aircraft
           WHERE user_id = $1
           ORDER BY id ASC`,
          [userId]
        );

        const fleet: UserAircraftRecord[] = fleetRes.rows.map((r) => ({
          id: Number(r.id),
          user_id: String(r.user_id),
          model_name: String(r.model_name),
          passenger_capacity: Number(r.passenger_capacity),
          fuel_efficiency_factor: Number(r.fuel_efficiency_factor),
          status: r.status as 'IDLE' | 'IN_FLIGHT' | 'MAINTENANCE',
          current_route_id: r.current_route_id !== null ? Number(r.current_route_id) : null,
          flight_departure_at: r.flight_departure_at ? new Date(String(r.flight_departure_at)) : null,
          flight_arrival_at: r.flight_arrival_at ? new Date(String(r.flight_arrival_at)) : null,
        }));

        return {
          runways_count: runwaysCount,
          passenger_capacity: passengerCapacity,
          waiting_lounges_tier: waitingLoungesTier,
          duty_free_tier: dutyFreeTier,
          fleet,
        };
      } catch (err: unknown) {
        process.stdout.write(
          `[AirportStore] Error in getHub: ${err instanceof Error ? err.message : String(err)}\n`
        );
      }
    }

    let hub = memAirportHubs.get(userId);
    if (!hub) {
      hub = {
        userId,
        runwaysCount: 1,
        passengerCapacity: 200,
        waitingLoungesTier: 1,
        dutyFreeTier: 0,
      };
      memAirportHubs.set(userId, hub);
    }

    const fleet: UserAircraftRecord[] = [];
    for (const a of memAircraft.values()) {
      if (a.user_id === userId) {
        fleet.push({ ...a });
      }
    }

    return {
      runways_count: hub.runwaysCount,
      passenger_capacity: hub.passengerCapacity,
      waiting_lounges_tier: hub.waitingLoungesTier,
      duty_free_tier: hub.dutyFreeTier,
      fleet,
    };
  }

  public static async purchaseAircraft(
    userId: string,
    catalogId: number
  ): Promise<{ aircraft: UserAircraftRecord; newBalance: number; transaction: TransactionRecord }> {
    const item = seedAircraftCatalog.find((c) => c.id === catalogId);
    if (!item) {
      throw new AppError('Aircraft model not found in catalog', 404, 'AIRCRAFT_NOT_FOUND');
    }

    const hub = await this.getHub(userId);
    const maxAircraftAllowed = hub.runways_count * 3;
    if (hub.fleet.length >= maxAircraftAllowed) {
      throw new AppError(
        `Fleet capacity reached (${hub.fleet.length}/${maxAircraftAllowed}). Upgrade runways to expand hangar slots.`,
        400,
        'RUNWAY_CAPACITY_EXCEEDED'
      );
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
        if (balance < item.purchase_price) {
          throw new AppError(
            `Insufficient funds to purchase aircraft. Cost: $${item.purchase_price.toFixed(2)}, Balance: $${balance.toFixed(2)}`,
            400,
            'INSUFFICIENT_FUNDS'
          );
        }

        const newBalance = Number((balance - item.purchase_price).toFixed(2));
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

        const airRes = await client.query<QueryResultRow>(
          `INSERT INTO user_aircraft (user_id, model_name, passenger_capacity, fuel_efficiency_factor, status, purchased_at)
           VALUES ($1, $2, $3, $4, 'IDLE', $5)
           RETURNING id, user_id, model_name, passenger_capacity, fuel_efficiency_factor, status`,
          [userId, item.model_name, item.passenger_capacity, item.fuel_efficiency_factor, now]
        );
        const airRow = airRes.rows[0];
        if (!airRow) {
          throw new AppError('Failed to record aircraft purchase', 500, 'DATABASE_ERROR');
        }

        const txRes = await client.query<QueryResultRow>(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'BUSINESS_INVESTMENT', $3)
           RETURNING id, sender_id, receiver_id, amount, fee, status, type, created_at`,
          [userId, item.purchase_price, now]
        );
        const txRow = txRes.rows[0];
        if (!txRow) {
          throw new AppError('Failed to record transaction', 500, 'DATABASE_ERROR');
        }

        const aircraft: UserAircraftRecord = {
          id: Number(airRow.id),
          user_id: userId,
          model_name: item.model_name,
          passenger_capacity: item.passenger_capacity,
          fuel_efficiency_factor: item.fuel_efficiency_factor,
          status: 'IDLE',
          current_route_id: null,
          flight_departure_at: null,
          flight_arrival_at: null,
        };

        const transaction: TransactionRecord = {
          id: Number(txRow.id),
          sender_id: userId,
          receiver_id: userId,
          amount: item.purchase_price,
          fee: 0,
          status: 'COMPLETED',
          type: 'BUSINESS_INVESTMENT',
          created_at: now,
        };

        return { aircraft, newBalance, transaction };
      });
    }

    const { DatabaseStore } = await import('../store');
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    if (user.balance < item.purchase_price) {
      throw new AppError('Insufficient funds to purchase aircraft', 400, 'INSUFFICIENT_FUNDS');
    }

    const newBalance = Number((user.balance - item.purchase_price).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, now);

    const aId = aircraftIdCounter++;
    const aircraft: UserAircraftRecord = {
      id: aId,
      user_id: userId,
      model_name: item.model_name,
      passenger_capacity: item.passenger_capacity,
      fuel_efficiency_factor: item.fuel_efficiency_factor,
      status: 'IDLE',
      current_route_id: null,
      flight_departure_at: null,
      flight_arrival_at: null,
    };
    memAircraft.set(aId, aircraft);

    const tx = await DatabaseStore.createTransaction(
      userId,
      userId,
      item.purchase_price,
      'BUSINESS_INVESTMENT',
      0,
      'COMPLETED'
    );

    return { aircraft, newBalance, transaction: tx };
  }

  public static async dispatchFlight(
    userId: string,
    aircraftId: number,
    routeId: number
  ): Promise<{ aircraft: UserAircraftRecord; prepCost: number; newBalance: number; departureTime: Date; arrivalTime: Date }> {
    const routes = await this.listRoutes();
    const route = routes.find((r) => r.id === routeId);
    if (!route) {
      throw new AppError('Flight route not found', 404, 'ROUTE_NOT_FOUND');
    }

    const now = new Date();
    const arrivalTime = new Date(now.getTime() + route.flight_duration_minutes * 60 * 1000);

    if (getIsPostgresAvailable()) {
      return withTransaction(async (client) => {
        const airRes = await client.query<QueryResultRow>(
          `SELECT id, user_id, model_name, passenger_capacity, fuel_efficiency_factor, status 
           FROM user_aircraft 
           WHERE id = $1 AND user_id = $2 FOR UPDATE`,
          [aircraftId, userId]
        );
        if (airRes.rows.length === 0 || !airRes.rows[0]) {
          throw new AppError('Aircraft not found in user fleet', 404, 'AIRCRAFT_NOT_FOUND');
        }

        const airRow = airRes.rows[0];
        if (airRow.status !== 'IDLE') {
          throw new AppError(
            `Aircraft is currently ${String(airRow.status)} and unavailable for dispatch`,
            400,
            'AIRCRAFT_BUSY'
          );
        }

        const fuelFactor = Number(airRow.fuel_efficiency_factor);
        const prepCost = Number((route.fuel_cost * fuelFactor + route.maintenance_cost).toFixed(2));

        const userRes = await client.query<QueryResultRow>(
          'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
          [userId]
        );
        if (userRes.rows.length === 0 || !userRes.rows[0]) {
          throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        const balance = Number(userRes.rows[0].balance);
        if (balance < prepCost) {
          throw new AppError(
            `Insufficient funds for flight prep (fuel & maintenance). Required: $${prepCost.toFixed(2)}, Available: $${balance.toFixed(2)}`,
            400,
            'INSUFFICIENT_FUNDS'
          );
        }

        const newBalance = Number((balance - prepCost).toFixed(2));
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

        await client.query(
          `UPDATE user_aircraft 
           SET status = 'IN_FLIGHT', current_route_id = $1, flight_departure_at = $2, flight_arrival_at = $3
           WHERE id = $4`,
          [routeId, now, arrivalTime, aircraftId]
        );

        await client.query(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'FLIGHT_EXPENSE', $3)`,
          [userId, prepCost, now]
        );

        const aircraft: UserAircraftRecord = {
          id: aircraftId,
          user_id: userId,
          model_name: String(airRow.model_name),
          passenger_capacity: Number(airRow.passenger_capacity),
          fuel_efficiency_factor: fuelFactor,
          status: 'IN_FLIGHT',
          current_route_id: routeId,
          flight_departure_at: now,
          flight_arrival_at: arrivalTime,
        };

        return { aircraft, prepCost, newBalance, departureTime: now, arrivalTime };
      });
    }

    const { DatabaseStore } = await import('../store');
    const air = memAircraft.get(aircraftId);
    if (!air || air.user_id !== userId) {
      throw new AppError('Aircraft not found in fleet', 404, 'AIRCRAFT_NOT_FOUND');
    }
    if (air.status !== 'IDLE') {
      throw new AppError(`Aircraft is currently ${air.status} and unavailable`, 400, 'AIRCRAFT_BUSY');
    }

    const prepCost = Number((route.fuel_cost * air.fuel_efficiency_factor + route.maintenance_cost).toFixed(2));
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    if (user.balance < prepCost) {
      throw new AppError('Insufficient funds for flight prep', 400, 'INSUFFICIENT_FUNDS');
    }

    const newBalance = Number((user.balance - prepCost).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, now);

    air.status = 'IN_FLIGHT';
    air.current_route_id = routeId;
    air.flight_departure_at = now;
    air.flight_arrival_at = arrivalTime;

    await DatabaseStore.createTransaction(userId, userId, prepCost, 'FLIGHT_EXPENSE', 0, 'COMPLETED');

    return { aircraft: { ...air }, prepCost, newBalance, departureTime: now, arrivalTime };
  }

  public static async landAndCollectFlight(
    userId: string,
    aircraftId: number
  ): Promise<{ aircraft: UserAircraftRecord; flightRevenue: number; newBalance: number; transaction: TransactionRecord }> {
    const hub = await this.getHub(userId);
    const routes = await this.listRoutes();
    const routeMap = new Map<number, AirportRouteCatalog>(routes.map((r) => [r.id, r]));
    const now = new Date();

    if (getIsPostgresAvailable()) {
      return withTransaction(async (client) => {
        const airRes = await client.query<QueryResultRow>(
          `SELECT id, user_id, model_name, passenger_capacity, fuel_efficiency_factor, status, 
                  current_route_id, flight_departure_at, flight_arrival_at
           FROM user_aircraft
           WHERE id = $1 AND user_id = $2 FOR UPDATE`,
          [aircraftId, userId]
        );
        if (airRes.rows.length === 0 || !airRes.rows[0]) {
          throw new AppError('Aircraft not found', 404, 'AIRCRAFT_NOT_FOUND');
        }

        const airRow = airRes.rows[0];
        if (airRow.status !== 'IN_FLIGHT') {
          throw new AppError('Aircraft is not currently in flight', 400, 'AIRCRAFT_NOT_IN_FLIGHT');
        }

        const arrivalAt = airRow.flight_arrival_at ? new Date(String(airRow.flight_arrival_at)) : now;
        if (now.getTime() < arrivalAt.getTime()) {
          const secondsRemaining = Math.ceil((arrivalAt.getTime() - now.getTime()) / 1000);
          throw new AppError(
            `Flight is still en route. Arrival in ${secondsRemaining} seconds.`,
            400,
            'FLIGHT_STILL_EN_ROUTE'
          );
        }

        const route = routeMap.get(Number(airRow.current_route_id));
        const baseRev = route ? route.base_revenue : 3000.0;
        const passCap = Number(airRow.passenger_capacity);

        // Revenue formula: base_revenue * (capacity / 100) * lounge_multiplier + duty_free_bonus
        const loungeBonus = 1 + (hub.waiting_lounges_tier - 1) * 0.15;
        const dutyFreeBonus = hub.duty_free_tier * 750.0;
        const flightRevenue = Number((baseRev * (passCap / 100) * loungeBonus + dutyFreeBonus).toFixed(2));

        const userRes = await client.query<QueryResultRow>(
          'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
          [userId]
        );
        if (userRes.rows.length === 0 || !userRes.rows[0]) {
          throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        const balance = Number(userRes.rows[0].balance);
        const newBalance = Number((balance + flightRevenue).toFixed(2));

        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

        await client.query(
          `UPDATE user_aircraft 
           SET status = 'IDLE', current_route_id = NULL, flight_departure_at = NULL, flight_arrival_at = NULL
           WHERE id = $1`,
          [aircraftId]
        );

        const txRes = await client.query<QueryResultRow>(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'FLIGHT_REVENUE', $3)
           RETURNING id, sender_id, receiver_id, amount, fee, status, type, created_at`,
          [userId, flightRevenue, now]
        );
        const txRow = txRes.rows[0];
        if (!txRow) {
          throw new AppError('Failed to record revenue transaction', 500, 'DATABASE_ERROR');
        }

        const aircraft: UserAircraftRecord = {
          id: aircraftId,
          user_id: userId,
          model_name: String(airRow.model_name),
          passenger_capacity: passCap,
          fuel_efficiency_factor: Number(airRow.fuel_efficiency_factor),
          status: 'IDLE',
          current_route_id: null,
          flight_departure_at: null,
          flight_arrival_at: null,
        };

        const transaction: TransactionRecord = {
          id: Number(txRow.id),
          sender_id: userId,
          receiver_id: userId,
          amount: flightRevenue,
          fee: 0,
          status: 'COMPLETED',
          type: 'FLIGHT_REVENUE',
          created_at: now,
        };

        return { aircraft, flightRevenue, newBalance, transaction };
      });
    }

    const { DatabaseStore } = await import('../store');
    const air = memAircraft.get(aircraftId);
    if (!air || air.user_id !== userId) {
      throw new AppError('Aircraft not found', 404, 'AIRCRAFT_NOT_FOUND');
    }
    if (air.status !== 'IN_FLIGHT' || !air.flight_arrival_at) {
      throw new AppError('Aircraft is not in flight', 400, 'AIRCRAFT_NOT_IN_FLIGHT');
    }

    if (now.getTime() < air.flight_arrival_at.getTime()) {
      const secondsRemaining = Math.ceil((air.flight_arrival_at.getTime() - now.getTime()) / 1000);
      throw new AppError(`Flight still in flight. Remaining: ${secondsRemaining}s`, 400, 'FLIGHT_STILL_EN_ROUTE');
    }

    const route = routeMap.get(air.current_route_id ?? 1);
    const baseRev = route ? route.base_revenue : 3000.0;
    const loungeBonus = 1 + (hub.waiting_lounges_tier - 1) * 0.15;
    const dutyFreeBonus = hub.duty_free_tier * 750.0;
    const flightRevenue = Number((baseRev * (air.passenger_capacity / 100) * loungeBonus + dutyFreeBonus).toFixed(2));

    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const newBalance = Number((user.balance + flightRevenue).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, now);

    air.status = 'IDLE';
    air.current_route_id = null;
    air.flight_departure_at = null;
    air.flight_arrival_at = null;

    const tx = await DatabaseStore.createTransaction(userId, userId, flightRevenue, 'FLIGHT_REVENUE', 0, 'COMPLETED');

    return { aircraft: { ...air }, flightRevenue, newBalance, transaction: tx };
  }

  public static async upgradeHub(
    userId: string,
    upgradeType: 'RUNWAY' | 'LOUNGE' | 'DUTY_FREE' | 'PASSENGER_CAPACITY'
  ): Promise<{ hub: UserAirportHub; newBalance: number; upgradeCost: number }> {
    const hub = await this.getHub(userId);
    let upgradeCost = 0;

    if (upgradeType === 'RUNWAY') {
      upgradeCost = hub.runways_count * 120000.0;
    } else if (upgradeType === 'LOUNGE') {
      upgradeCost = hub.waiting_lounges_tier * 35000.0;
    } else if (upgradeType === 'DUTY_FREE') {
      upgradeCost = (hub.duty_free_tier + 1) * 50000.0;
    } else if (upgradeType === 'PASSENGER_CAPACITY') {
      upgradeCost = (hub.passenger_capacity / 100) * 20000.0;
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
            `Insufficient funds for airport upgrade. Cost: $${upgradeCost.toFixed(2)}, Balance: $${balance.toFixed(2)}`,
            400,
            'INSUFFICIENT_FUNDS'
          );
        }

        const newBalance = Number((balance - upgradeCost).toFixed(2));
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

        let runways = hub.runways_count;
        let lounges = hub.waiting_lounges_tier;
        let dutyFree = hub.duty_free_tier;
        let capacity = hub.passenger_capacity;

        if (upgradeType === 'RUNWAY') {
          runways += 1;
          await client.query('UPDATE user_airports SET runways_count = $1 WHERE user_id = $2', [runways, userId]);
        } else if (upgradeType === 'LOUNGE') {
          lounges += 1;
          await client.query('UPDATE user_airports SET waiting_lounges_tier = $1 WHERE user_id = $2', [lounges, userId]);
        } else if (upgradeType === 'DUTY_FREE') {
          dutyFree += 1;
          await client.query('UPDATE user_airports SET duty_free_tier = $1 WHERE user_id = $2', [dutyFree, userId]);
        } else if (upgradeType === 'PASSENGER_CAPACITY') {
          capacity += 150;
          await client.query('UPDATE user_airports SET passenger_capacity = $1 WHERE user_id = $2', [capacity, userId]);
        }

        await client.query(
          `INSERT INTO transactions (sender_id, receiver_id, amount, fee, status, type, created_at)
           VALUES ($1, $1, $2, 0.00, 'COMPLETED', 'BUSINESS_INVESTMENT', $3)`,
          [userId, upgradeCost, now]
        );

        const updatedHub: UserAirportHub = {
          runways_count: runways,
          passenger_capacity: capacity,
          waiting_lounges_tier: lounges,
          duty_free_tier: dutyFree,
          fleet: hub.fleet,
        };

        return { hub: updatedHub, newBalance, upgradeCost };
      });
    }

    const { DatabaseStore } = await import('../store');
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    if (user.balance < upgradeCost) {
      throw new AppError('Insufficient funds for airport upgrade', 400, 'INSUFFICIENT_FUNDS');
    }

    const newBalance = Number((user.balance - upgradeCost).toFixed(2));
    await DatabaseStore.updateUserBalanceAndSyncTime(userId, newBalance, now);

    const memHub = memAirportHubs.get(userId) ?? {
      userId,
      runwaysCount: 1,
      passengerCapacity: 200,
      waitingLoungesTier: 1,
      dutyFreeTier: 0,
    };

    if (upgradeType === 'RUNWAY') {
      memHub.runwaysCount += 1;
    } else if (upgradeType === 'LOUNGE') {
      memHub.waitingLoungesTier += 1;
    } else if (upgradeType === 'DUTY_FREE') {
      memHub.dutyFreeTier += 1;
    } else if (upgradeType === 'PASSENGER_CAPACITY') {
      memHub.passengerCapacity += 150;
    }
    memAirportHubs.set(userId, memHub);

    await DatabaseStore.createTransaction(userId, userId, upgradeCost, 'BUSINESS_INVESTMENT', 0, 'COMPLETED');

    const updatedHub: UserAirportHub = {
      runways_count: memHub.runwaysCount,
      passenger_capacity: memHub.passengerCapacity,
      waiting_lounges_tier: memHub.waitingLoungesTier,
      duty_free_tier: memHub.dutyFreeTier,
      fleet: hub.fleet,
    };

    return { hub: updatedHub, newBalance, upgradeCost };
  }
}
