import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/error.middleware';
import { ApiResponse } from '../../types';
import { StockStore } from '../../db/sectors/stock.store';
import { RealEstateStore } from '../../db/sectors/real-estate.store';
import { DealershipStore } from '../../db/sectors/dealership.store';
import { AirportStore } from '../../db/sectors/airport.store';
import { FactoryStore } from '../../db/sectors/factory.store';
import { FarmStore } from '../../db/sectors/farm.store';
import { ImportExportStore } from '../../db/sectors/import-export.store';
import { CryptoStore } from '../../db/sectors/crypto.store';
import { EconomicSinksStore } from '../../db/sectors/economic-sinks.store';
import { BudgetStore } from '../../db/sectors/budget.store';
import { SimulationEngine } from '../engine/simulation.engine';
import {
  stockTradeSchema,
  propertyPurchaseSchema,
  propertyUpgradeSchema,
  orderVehicleSchema,
  sellVehicleSchema,
  dealershipUpgradeSchema,
  buyAircraftSchema,
  dispatchFlightSchema,
  landFlightSchema,
  airportUpgradeSchema,
  buyMaterialSchema,
  createProductionLineSchema,
  produceLineSchema,
  factoryUpgradeSchema,
  plantFarmSchema,
  harvestFarmSchema,
  farmUpgradeSchema,
  dispatchVoyageSchema,
  collectVoyageSchema,
  importExportUpgradeSchema,
  selectCoinSchema,
  buyRigSchema,
} from './sectors.schema';

export class SectorsController {
  // ==========================================
  // 1. Stock Market
  // ==========================================
  public static async listStocks(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stocks = await StockStore.listStocks();
      const response: ApiResponse<typeof stocks> = { success: true, data: stocks };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async getStockPortfolio(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const positions = await StockStore.getUserPortfolio(req.user.id);
      const totalMarketValue = positions.reduce((acc, p) => acc + (p.total_market_value || 0), 0);
      const totalUnrealizedProfit = positions.reduce((acc, p) => acc + (p.unrealized_profit_loss || 0), 0);
      const payload = {
        total_market_value: totalMarketValue,
        total_unrealized_profit: totalUnrealizedProfit,
        holdings: positions.map((p) => ({
          symbol: p.ticker,
          company_name: p.company_name,
          shares: p.shares_count,
          average_buy_price: p.average_buy_price,
          current_price: p.current_price,
          market_value: p.total_market_value,
          unrealized_profit: p.unrealized_profit_loss,
        })),
        positions,
      };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async buyStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = stockTradeSchema.parse(req.body);
      const result = await StockStore.buyStock(req.user.id, parsed.stockId, parsed.shares);
      const response: ApiResponse<typeof result> = { success: true, data: result };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async sellStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = stockTradeSchema.parse(req.body);
      const result = await StockStore.sellStock(req.user.id, parsed.stockId, parsed.shares);
      const response: ApiResponse<typeof result> = { success: true, data: result };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  // ==========================================
  // ==========================================
  // 2. Real Estate & Small Businesses
  // ==========================================
  public static async listPropertiesCatalog(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const catalog = await RealEstateStore.listCatalog();
      const payload = catalog.map((item) => ({
        ...item,
        id: String(item.id),
        base_price: item.purchase_price,
        purchase_price: item.purchase_price,
        type: item.category,
        category: item.category,
        base_hourly_income: item.base_hourly_income,
        description: 'عقار استثماري وتجاري عالي العائد',
      }));
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async getUserProperties(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const properties = await RealEstateStore.getUserProperties(req.user.id);
      const payload = properties.map((p) => ({
        ...p,
        id: String(p.id),
        catalog_id: String(p.property_id),
        name: p.property_name,
        property_name: p.property_name,
        type: p.category,
        category: p.category,
        upgrade_tier: p.upgrade_level,
        upgrade_level: p.upgrade_level,
        hourly_income: p.current_hourly_income,
        current_hourly_income: p.current_hourly_income,
        upgrade_cost: p.upgrade_level * 15000,
        purchased_at: p.purchased_at instanceof Date ? p.purchased_at.toISOString() : String(p.purchased_at),
      }));
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async buyProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = propertyPurchaseSchema.parse(req.body);
      const result = await RealEstateStore.purchaseProperty(req.user.id, parsed.propertyId);
      const payload = {
        ...result,
        property: {
          ...result.property,
          id: String(result.property.id),
          name: result.property.property_name || 'Commercial Tower',
          property_name: result.property.property_name || 'Commercial Tower',
          upgrade_tier: result.property.upgrade_level || 1,
          hourly_income: result.property.current_hourly_income || 0,
          upgrade_cost: (result.property.upgrade_level || 1) * 15000,
        },
        balance: result.newBalance,
        newBalance: result.newBalance,
      };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async upgradeProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = propertyUpgradeSchema.parse(req.body);
      const result = await RealEstateStore.upgradeProperty(req.user.id, parsed.userPropertyId);
      const payload = {
        ...result,
        property: {
          ...result.property,
          id: String(result.property.id),
          name: result.property.property_name || 'Commercial Tower',
          property_name: result.property.property_name || 'Commercial Tower',
          upgrade_tier: result.property.upgrade_level || 1,
          hourly_income: result.property.current_hourly_income || 0,
          upgrade_cost: (result.property.upgrade_level || 1) * 15000,
        },
        balance: result.newBalance,
        newBalance: result.newBalance,
      };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  // ==========================================
  // 3. Car Dealerships
  // ==========================================
  public static async listVehicleContracts(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const contracts = await DealershipStore.listVehicleContracts();
      const payload = contracts.map((c) => ({
        ...c,
        id: String(c.id),
        contract_id: String(c.id),
        model: c.model_name,
        model_name: c.model_name,
        brand: c.category,
        category: c.category,
        cost: c.purchase_cost,
        purchase_cost: c.purchase_cost,
        base_sell_price: c.base_retail_price,
        base_retail_price: c.base_retail_price,
        delivery_time_seconds: 60,
        tier_required: c.required_tier,
        required_tier: c.required_tier,
      }));
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async getDealershipProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const profile = await DealershipStore.getProfile(req.user.id);
      const mappedVehicles = (profile.vehicles_on_display || []).map((v) => ({
        id: String(v.id),
        contract_id: String(v.id),
        brand: v.category,
        category: v.category,
        model: v.model_name,
        model_name: v.model_name,
        condition_percent: 100,
        potential_sale_price: v.retail_price,
        purchase_cost: v.purchase_cost,
        retail_price: v.retail_price,
        status: v.status,
        delivered_at: v.acquired_at instanceof Date ? v.acquired_at.toISOString() : String(v.acquired_at),
      }));
      const payload = {
        ...profile,
        showroom_tier: profile.showroom_tier || 1,
        max_display_slots: profile.showroom_capacity || 4,
        customer_satisfaction: 98,
        inventory: mappedVehicles,
        vehicles_on_display: mappedVehicles,
        next_upgrade_cost: (profile.showroom_tier || 1) * 40000,
      };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async orderVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = orderVehicleSchema.parse(req.body);
      const result = await DealershipStore.orderVehicle(req.user.id, parsed.contractId);
      const profile = await DealershipStore.getProfile(req.user.id);
      const mappedVehicles = (profile.vehicles_on_display || []).map((v) => ({
        id: String(v.id),
        contract_id: String(v.id),
        brand: v.category,
        category: v.category,
        model: v.model_name,
        model_name: v.model_name,
        condition_percent: 100,
        potential_sale_price: v.retail_price,
        purchase_cost: v.purchase_cost,
        retail_price: v.retail_price,
        status: v.status,
        delivered_at: v.acquired_at instanceof Date ? v.acquired_at.toISOString() : String(v.acquired_at),
      }));
      const payload = {
        ...result,
        balance: result.newBalance,
        newBalance: result.newBalance,
        profile: {
          ...profile,
          showroom_tier: profile.showroom_tier || 1,
          max_display_slots: profile.showroom_capacity || 4,
          customer_satisfaction: 98,
          inventory: mappedVehicles,
          vehicles_on_display: mappedVehicles,
          next_upgrade_cost: (profile.showroom_tier || 1) * 40000,
        },
      };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async sellVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = sellVehicleSchema.parse(req.body);
      const result = await DealershipStore.sellVehicle(req.user.id, parsed.vehicleId);
      const profile = await DealershipStore.getProfile(req.user.id);
      const mappedVehicles = (profile.vehicles_on_display || []).map((v) => ({
        id: String(v.id),
        contract_id: String(v.id),
        brand: v.category,
        category: v.category,
        model: v.model_name,
        model_name: v.model_name,
        condition_percent: 100,
        potential_sale_price: v.retail_price,
        purchase_cost: v.purchase_cost,
        retail_price: v.retail_price,
        status: v.status,
        delivered_at: v.acquired_at instanceof Date ? v.acquired_at.toISOString() : String(v.acquired_at),
      }));
      const payload = {
        ...result,
        balance: result.newBalance,
        sale_price: result.saleProceeds,
        newBalance: result.newBalance,
        profile: {
          ...profile,
          showroom_tier: profile.showroom_tier || 1,
          max_display_slots: profile.showroom_capacity || 4,
          customer_satisfaction: 98,
          inventory: mappedVehicles,
          vehicles_on_display: mappedVehicles,
          next_upgrade_cost: (profile.showroom_tier || 1) * 40000,
        },
      };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async upgradeDealership(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = dealershipUpgradeSchema.parse(req.body);
      const result = await DealershipStore.upgradeShowroom(req.user.id, parsed.upgradeType);
      const profile = await DealershipStore.getProfile(req.user.id);
      const mappedVehicles = (profile.vehicles_on_display || []).map((v) => ({
        id: String(v.id),
        contract_id: String(v.id),
        brand: v.category,
        category: v.category,
        model: v.model_name,
        model_name: v.model_name,
        condition_percent: 100,
        potential_sale_price: v.retail_price,
        purchase_cost: v.purchase_cost,
        retail_price: v.retail_price,
        status: v.status,
        delivered_at: v.acquired_at instanceof Date ? v.acquired_at.toISOString() : String(v.acquired_at),
      }));
      const payload = {
        ...result,
        balance: result.newBalance,
        newBalance: result.newBalance,
        profile: {
          ...profile,
          showroom_tier: profile.showroom_tier || 1,
          max_display_slots: profile.showroom_capacity || 4,
          customer_satisfaction: 98,
          inventory: mappedVehicles,
          vehicles_on_display: mappedVehicles,
          next_upgrade_cost: (profile.showroom_tier || 1) * 40000,
        },
      };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  // ==========================================
  // 4. Airport Tycoon
  // ==========================================
  public static async listAirportRoutes(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const routes = await AirportStore.listRoutes();
      const payload = routes.map((r) => ({
        ...r,
        id: String(r.id),
        origin: r.origin_city,
        origin_city: r.origin_city,
        destination: r.destination_city,
        destination_city: r.destination_city,
        base_passenger_fare: r.base_revenue,
        base_revenue: r.base_revenue,
        required_aircraft_tier: 1,
        flight_duration_seconds: r.flight_duration_minutes * 60,
      }));
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async listAircraftCatalog(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const catalog = await AirportStore.listAircraftCatalog();
      const payload = catalog.map((c) => ({
        ...c,
        id: String(c.id),
        model: c.model_name,
        model_name: c.model_name,
        manufacturer: 'AeroCorp Global',
        tier: 1,
        passenger_capacity: c.passenger_capacity,
        purchase_price: c.purchase_price,
        operating_cost_per_flight: c.passenger_capacity * 25,
      }));
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async getAirportHub(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const hub = await AirportStore.getHub(req.user.id);
      const routes = await AirportStore.listRoutes();
      const mappedRoutes = routes.map((r) => ({
        ...r,
        id: String(r.id),
        origin: r.origin_city,
        origin_city: r.origin_city,
        destination: r.destination_city,
        destination_city: r.destination_city,
        base_passenger_fare: r.base_revenue,
        base_revenue: r.base_revenue,
        required_aircraft_tier: 1,
        flight_duration_seconds: r.flight_duration_minutes * 60,
      }));
      const payload = {
        ...hub,
        terminal_tier: hub.waiting_lounges_tier || 1,
        runway_tier: hub.runways_count || 1,
        max_aircraft_slots: (hub.runways_count || 1) * 3,
        next_terminal_upgrade_cost: (hub.waiting_lounges_tier || 1) * 50000,
        fleet: (hub.fleet || []).map((f) => ({
          id: String(f.id),
          aircraft_id: String(f.id),
          model: f.model_name,
          model_name: f.model_name,
          tier: 1,
          capacity: f.passenger_capacity,
          passenger_capacity: f.passenger_capacity,
          is_in_flight: f.status === 'IN_FLIGHT',
          status: f.status,
          assigned_route_id: f.current_route_id ? String(f.current_route_id) : null,
          flight_departure_time: f.flight_departure_at ? f.flight_departure_at.toISOString() : null,
          flight_arrival_time: f.flight_arrival_at ? f.flight_arrival_at.toISOString() : null,
          purchased_at: new Date().toISOString(),
        })),
        routes: mappedRoutes,
      };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async buyAircraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = buyAircraftSchema.parse(req.body);
      const result = await AirportStore.purchaseAircraft(req.user.id, parsed.catalogId);
      const hub = await AirportStore.getHub(req.user.id);
      const routes = await AirportStore.listRoutes();
      const mappedRoutes = routes.map((r) => ({
        ...r,
        id: String(r.id),
        origin: r.origin_city,
        origin_city: r.origin_city,
        destination: r.destination_city,
        destination_city: r.destination_city,
        base_passenger_fare: r.base_revenue,
        base_revenue: r.base_revenue,
        required_aircraft_tier: 1,
        flight_duration_seconds: r.flight_duration_minutes * 60,
      }));
      const payload = {
        ...result,
        balance: result.newBalance,
        newBalance: result.newBalance,
        hub: {
          ...hub,
          terminal_tier: hub.waiting_lounges_tier || 1,
          runway_tier: hub.runways_count || 1,
          max_aircraft_slots: (hub.runways_count || 1) * 3,
          next_terminal_upgrade_cost: (hub.waiting_lounges_tier || 1) * 50000,
          fleet: (hub.fleet || []).map((f) => ({
            id: String(f.id),
            aircraft_id: String(f.id),
            model: f.model_name,
            model_name: f.model_name,
            tier: 1,
            capacity: f.passenger_capacity,
            passenger_capacity: f.passenger_capacity,
            is_in_flight: f.status === 'IN_FLIGHT',
            status: f.status,
            assigned_route_id: f.current_route_id ? String(f.current_route_id) : null,
            flight_departure_time: f.flight_departure_at ? f.flight_departure_at.toISOString() : null,
            flight_arrival_time: f.flight_arrival_at ? f.flight_arrival_at.toISOString() : null,
            purchased_at: new Date().toISOString(),
          })),
          routes: mappedRoutes,
        },
      };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async dispatchFlight(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = dispatchFlightSchema.parse(req.body);
      const result = await AirportStore.dispatchFlight(req.user.id, parsed.aircraftId, parsed.routeId);
      const hub = await AirportStore.getHub(req.user.id);
      const routes = await AirportStore.listRoutes();
      const mappedRoutes = routes.map((r) => ({
        ...r,
        id: String(r.id),
        origin: r.origin_city,
        origin_city: r.origin_city,
        destination: r.destination_city,
        destination_city: r.destination_city,
        base_passenger_fare: r.base_revenue,
        base_revenue: r.base_revenue,
        required_aircraft_tier: 1,
        flight_duration_seconds: r.flight_duration_minutes * 60,
      }));
      const payload = {
        ...result,
        balance: result.newBalance,
        newBalance: result.newBalance,
        hub: {
          ...hub,
          terminal_tier: hub.waiting_lounges_tier || 1,
          runway_tier: hub.runways_count || 1,
          max_aircraft_slots: (hub.runways_count || 1) * 3,
          next_terminal_upgrade_cost: (hub.waiting_lounges_tier || 1) * 50000,
          fleet: (hub.fleet || []).map((f) => ({
            id: String(f.id),
            aircraft_id: String(f.id),
            model: f.model_name,
            model_name: f.model_name,
            tier: 1,
            capacity: f.passenger_capacity,
            passenger_capacity: f.passenger_capacity,
            is_in_flight: f.status === 'IN_FLIGHT',
            status: f.status,
            assigned_route_id: f.current_route_id ? String(f.current_route_id) : null,
            flight_departure_time: f.flight_departure_at ? f.flight_departure_at.toISOString() : null,
            flight_arrival_time: f.flight_arrival_at ? f.flight_arrival_at.toISOString() : null,
            purchased_at: new Date().toISOString(),
          })),
          routes: mappedRoutes,
        },
      };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async landFlight(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = landFlightSchema.parse(req.body);
      const result = await AirportStore.landAndCollectFlight(req.user.id, parsed.aircraftId);
      const hub = await AirportStore.getHub(req.user.id);
      const routes = await AirportStore.listRoutes();
      const mappedRoutes = routes.map((r) => ({
        ...r,
        id: String(r.id),
        origin: r.origin_city,
        origin_city: r.origin_city,
        destination: r.destination_city,
        destination_city: r.destination_city,
        base_passenger_fare: r.base_revenue,
        base_revenue: r.base_revenue,
        required_aircraft_tier: 1,
        flight_duration_seconds: r.flight_duration_minutes * 60,
      }));
      const payload = {
        ...result,
        balance: result.newBalance,
        newBalance: result.newBalance,
        gross_revenue: result.flightRevenue,
        hub: {
          ...hub,
          terminal_tier: hub.waiting_lounges_tier || 1,
          runway_tier: hub.runways_count || 1,
          max_aircraft_slots: (hub.runways_count || 1) * 3,
          next_terminal_upgrade_cost: (hub.waiting_lounges_tier || 1) * 50000,
          fleet: (hub.fleet || []).map((f) => ({
            id: String(f.id),
            aircraft_id: String(f.id),
            model: f.model_name,
            model_name: f.model_name,
            tier: 1,
            capacity: f.passenger_capacity,
            passenger_capacity: f.passenger_capacity,
            is_in_flight: f.status === 'IN_FLIGHT',
            status: f.status,
            assigned_route_id: f.current_route_id ? String(f.current_route_id) : null,
            flight_departure_time: f.flight_departure_at ? f.flight_departure_at.toISOString() : null,
            flight_arrival_time: f.flight_arrival_at ? f.flight_arrival_at.toISOString() : null,
            purchased_at: new Date().toISOString(),
          })),
          routes: mappedRoutes,
        },
      };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async upgradeAirport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = airportUpgradeSchema.parse(req.body);
      const result = await AirportStore.upgradeHub(req.user.id, parsed.upgradeType);
      const hub = await AirportStore.getHub(req.user.id);
      const routes = await AirportStore.listRoutes();
      const mappedRoutes = routes.map((r) => ({
        ...r,
        id: String(r.id),
        origin: r.origin_city,
        origin_city: r.origin_city,
        destination: r.destination_city,
        destination_city: r.destination_city,
        base_passenger_fare: r.base_revenue,
        base_revenue: r.base_revenue,
        required_aircraft_tier: 1,
        flight_duration_seconds: r.flight_duration_minutes * 60,
      }));
      const payload = {
        ...result,
        balance: result.newBalance,
        newBalance: result.newBalance,
        hub: {
          ...hub,
          terminal_tier: hub.waiting_lounges_tier || 1,
          runway_tier: hub.runways_count || 1,
          max_aircraft_slots: (hub.runways_count || 1) * 3,
          next_terminal_upgrade_cost: (hub.waiting_lounges_tier || 1) * 50000,
          fleet: (hub.fleet || []).map((f) => ({
            id: String(f.id),
            aircraft_id: String(f.id),
            model: f.model_name,
            model_name: f.model_name,
            tier: 1,
            capacity: f.passenger_capacity,
            passenger_capacity: f.passenger_capacity,
            is_in_flight: f.status === 'IN_FLIGHT',
            status: f.status,
            assigned_route_id: f.current_route_id ? String(f.current_route_id) : null,
            flight_departure_time: f.flight_departure_at ? f.flight_departure_at.toISOString() : null,
            flight_arrival_time: f.flight_arrival_at ? f.flight_arrival_at.toISOString() : null,
            purchased_at: new Date().toISOString(),
          })),
          routes: mappedRoutes,
        },
      };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  // ==========================================
  // 5. Production Factories
  // ==========================================
  public static async getFactoryOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const overview = await FactoryStore.getOverview(req.user.id);
      const totalMats = Object.values(overview.materials || {}).reduce((a, b) => a + Number(b), 0);
      const payload = {
        ...overview,
        factory_tier: overview.automation_level || 1,
        automation_level: overview.automation_level || 1,
        raw_materials_stock: totalMats || 500,
        raw_material_unit_cost: 20,
        finished_goods_inventory: 0,
        next_upgrade_cost: (overview.automation_level || 1) * 25000,
        assembly_lines: (overview.lines || []).map((l) => ({
          id: String(l.id),
          name: l.product_name,
          product_name: l.product_name,
          raw_material_required: l.raw_material_units,
          production_duration_seconds: l.cycle_duration_seconds,
          cycle_cost: l.raw_material_units * 20,
          sale_price: l.output_units * l.output_unit_value,
          is_producing: false,
          production_completes_at: null,
        })),
      };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async buyMaterials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = buyMaterialSchema.parse(req.body);
      const result = await FactoryStore.buyMaterials(req.user.id, parsed.materialType, parsed.quantity);
      const response: ApiResponse<typeof result> = { success: true, data: result };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async createProductionLine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = createProductionLineSchema.parse(req.body);
      const result = await FactoryStore.addProductionLine(req.user.id, parsed.blueprintIndex);
      const response: ApiResponse<typeof result> = { success: true, data: result };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async runProductionCycle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = produceLineSchema.parse(req.body);
      const result = await FactoryStore.executeProductionCycle(req.user.id, parsed.lineId);
      const response: ApiResponse<typeof result> = { success: true, data: result };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async upgradeFactory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = factoryUpgradeSchema.parse(req.body);
      const result = await FactoryStore.upgradeFactory(req.user.id, parsed.upgradeType);
      const response: ApiResponse<typeof result> = { success: true, data: result };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  // ==========================================
  // 6. Agricultural Farms
  // ==========================================
  public static async listFarmCatalog(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const catalog = await FarmStore.listCatalog();
      const response: ApiResponse<typeof catalog> = { success: true, data: catalog };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async getFarmOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const overview = await FarmStore.getOverview(req.user.id);
      const batches = overview.batches || [];
      const usedAcres = batches.reduce((acc, b) => acc + (b.acres_utilized || 0), 0);
      const payload = {
        ...overview,
        used_acres: usedAcres,
        total_acres: overview.land_acres || 15,
        available_acres: Math.max(0, (overview.land_acres || 15) - usedAcres),
        next_acreage_expansion_cost: (overview.land_acres || 15) * 500,
        planted_batches: batches.map((b) => ({
          id: String(b.id),
          crop_name: b.batch_name,
          acres_planted: b.acres_utilized,
          potential_revenue: b.yield_market_value,
          growth_duration_seconds: b.growth_duration_seconds,
          planted_at: b.planted_at.toISOString(),
          ready_to_harvest: (b as unknown as { ready_to_harvest?: boolean }).ready_to_harvest ?? true,
        })),
      };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async plantFarmBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = plantFarmSchema.parse(req.body);
      const result = await FarmStore.plantBatch(req.user.id, parsed.catalogOptionId);
      const response: ApiResponse<typeof result> = { success: true, data: result };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async harvestFarmBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = harvestFarmSchema.parse(req.body);
      const result = await FarmStore.harvestBatch(req.user.id, parsed.batchId);
      const response: ApiResponse<typeof result> = { success: true, data: result };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async upgradeFarm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = farmUpgradeSchema.parse(req.body);
      const result = await FarmStore.upgradeFarm(req.user.id, parsed.upgradeType);
      const response: ApiResponse<typeof result> = { success: true, data: result };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  // ==========================================
  // 7. Import/Export Company
  // ==========================================
  public static async listTradeContracts(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const contracts = await ImportExportStore.listContracts();
      const payload = contracts.map((c) => ({
        ...c,
        id: String(c.id),
        contract_id: String(c.id),
        title: `${c.origin_region} → ${c.destination_region}`,
        origin_region: c.origin_region,
        destination_region: c.destination_region,
        cargo_type: c.cargo_type,
        required_capital: c.prep_cost,
        prep_cost: c.prep_cost,
        gross_revenue: c.contract_value,
        contract_value: c.contract_value,
        duration_seconds: c.duration_seconds,
        required_tier: c.required_logistics_level,
      }));
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async getImportExportOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const overview = await ImportExportStore.getOverview(req.user.id);
      const contracts = await ImportExportStore.listContracts();
      const voyages = overview.active_voyages || [];
      const payload = {
        ...overview,
        warehouse_tier: overview.logistics_level || 1,
        logistics_fleet_size: voyages.length,
        next_logistics_upgrade_cost: (overview.logistics_level || 1) * 35000,
        active_voyages: voyages.map((v) => ({
          id: String(v.id),
          title: v.vessel_name || `Voyage #${v.id}`,
          gross_revenue: 15000,
          status: v.status,
          completes_at: v.completes_at.toISOString(),
          is_completed: v.status === 'COMPLETED' || new Date().getTime() >= v.completes_at.getTime(),
        })),
        available_contracts: contracts.map((c) => ({
          id: String(c.id),
          contract_id: String(c.id),
          title: `${c.origin_region} → ${c.destination_region}`,
          origin_region: c.origin_region,
          destination_region: c.destination_region,
          cargo_type: c.cargo_type,
          required_capital: c.prep_cost,
          prep_cost: c.prep_cost,
          gross_revenue: c.contract_value,
          contract_value: c.contract_value,
          duration_seconds: c.duration_seconds,
          required_tier: c.required_logistics_level,
        })),
      };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async dispatchTradeVoyage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = dispatchVoyageSchema.parse(req.body);
      const result = await ImportExportStore.dispatchVoyage(req.user.id, parsed.contractId, parsed.vesselName);
      const overview = await ImportExportStore.getOverview(req.user.id);
      const contracts = await ImportExportStore.listContracts();
      const voyages = overview.active_voyages || [];
      const payload = {
        ...result,
        balance: result.newBalance,
        newBalance: result.newBalance,
        overview: {
          ...overview,
          warehouse_tier: overview.logistics_level || 1,
          logistics_fleet_size: voyages.length,
          next_logistics_upgrade_cost: (overview.logistics_level || 1) * 35000,
          active_voyages: voyages.map((v) => ({
            id: String(v.id),
            title: v.vessel_name || `Voyage #${v.id}`,
            gross_revenue: 15000,
            status: v.status,
            completes_at: v.completes_at.toISOString(),
            is_completed: v.status === 'COMPLETED' || new Date().getTime() >= v.completes_at.getTime(),
          })),
          available_contracts: contracts.map((c) => ({
            id: String(c.id),
            contract_id: String(c.id),
            title: `${c.origin_region} → ${c.destination_region}`,
            origin_region: c.origin_region,
            destination_region: c.destination_region,
            cargo_type: c.cargo_type,
            required_capital: c.prep_cost,
            prep_cost: c.prep_cost,
            gross_revenue: c.contract_value,
            contract_value: c.contract_value,
            duration_seconds: c.duration_seconds,
            required_tier: c.required_logistics_level,
          })),
        },
      };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async collectTradeVoyage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = collectVoyageSchema.parse(req.body);
      const result = await ImportExportStore.collectVoyage(req.user.id, parsed.voyageId);
      const overview = await ImportExportStore.getOverview(req.user.id);
      const contracts = await ImportExportStore.listContracts();
      const voyages = overview.active_voyages || [];
      const payload = {
        ...result,
        balance: result.newBalance,
        newBalance: result.newBalance,
        revenue: result.contractPayout,
        overview: {
          ...overview,
          warehouse_tier: overview.logistics_level || 1,
          logistics_fleet_size: voyages.length,
          next_logistics_upgrade_cost: (overview.logistics_level || 1) * 35000,
          active_voyages: voyages.map((v) => ({
            id: String(v.id),
            title: v.vessel_name || `Voyage #${v.id}`,
            gross_revenue: 15000,
            status: v.status,
            completes_at: v.completes_at.toISOString(),
            is_completed: v.status === 'COMPLETED' || new Date().getTime() >= v.completes_at.getTime(),
          })),
          available_contracts: contracts.map((c) => ({
            id: String(c.id),
            contract_id: String(c.id),
            title: `${c.origin_region} → ${c.destination_region}`,
            origin_region: c.origin_region,
            destination_region: c.destination_region,
            cargo_type: c.cargo_type,
            required_capital: c.prep_cost,
            prep_cost: c.prep_cost,
            gross_revenue: c.contract_value,
            contract_value: c.contract_value,
            duration_seconds: c.duration_seconds,
            required_tier: c.required_logistics_level,
          })),
        },
      };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async upgradeImportExport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = importExportUpgradeSchema.parse(req.body);
      const result = await ImportExportStore.upgradeCompany(req.user.id, parsed.upgradeType);
      const overview = await ImportExportStore.getOverview(req.user.id);
      const contracts = await ImportExportStore.listContracts();
      const voyages = overview.active_voyages || [];
      const payload = {
        ...result,
        balance: result.newBalance,
        newBalance: result.newBalance,
        overview: {
          ...overview,
          warehouse_tier: overview.logistics_level || 1,
          logistics_fleet_size: voyages.length,
          next_logistics_upgrade_cost: (overview.logistics_level || 1) * 35000,
          active_voyages: voyages.map((v) => ({
            id: String(v.id),
            title: v.vessel_name || `Voyage #${v.id}`,
            gross_revenue: 15000,
            status: v.status,
            completes_at: v.completes_at.toISOString(),
            is_completed: v.status === 'COMPLETED' || new Date().getTime() >= v.completes_at.getTime(),
          })),
          available_contracts: contracts.map((c) => ({
            id: String(c.id),
            contract_id: String(c.id),
            title: `${c.origin_region} → ${c.destination_region}`,
            origin_region: c.origin_region,
            destination_region: c.destination_region,
            cargo_type: c.cargo_type,
            required_capital: c.prep_cost,
            prep_cost: c.prep_cost,
            gross_revenue: c.contract_value,
            contract_value: c.contract_value,
            duration_seconds: c.duration_seconds,
            required_tier: c.required_logistics_level,
          })),
        },
      };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  // ==========================================
  // 8. Cryptocurrency Mining
  // ==========================================
  public static async listCryptoCoins(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const coins = await CryptoStore.listCoins();
      const response: ApiResponse<typeof coins> = { success: true, data: coins };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async listCryptoRigCatalog(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rigs = await CryptoStore.listRigCatalog();
      const response: ApiResponse<typeof rigs> = { success: true, data: rigs };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  private static async buildCryptoOverviewPayload(userId: string) {
    const overview = await CryptoStore.getOverview(userId);
    const coins = await CryptoStore.listCoins();
    const catalog = await CryptoStore.listRigCatalog();
    return {
      selected_coin: overview.selected_coin?.symbol || 'BTC',
      total_hashrate_ths: Number(((overview.total_hashrate_mhs || 0) / 1000).toFixed(2)),
      active_rigs_count: (overview.rigs || []).length,
      uncashed_mined_balance: overview.mined_unclaimed_balance || 0,
      uncashed_value_usd: overview.unclaimed_usd_value || 0,
      coins: coins.map((c) => ({
        symbol: c.symbol,
        name: c.name,
        market_price_usd: c.market_price,
        mining_difficulty: c.network_difficulty,
        block_reward: c.block_reward,
      })),
      rigs: (overview.rigs || []).map((r) => ({
        id: String(r.id),
        rig_catalog_id: String(r.id),
        model_name: r.gpu_model,
        hashrate_ths: Number((r.hashrate_mhs / 1000).toFixed(2)),
        active: true,
        installed_at: r.installed_at ? new Date(r.installed_at).toISOString() : new Date().toISOString(),
      })),
      rig_catalog: catalog.map((cat) => ({
        id: String(cat.id),
        model_name: cat.gpu_model,
        hashrate_ths: Number((cat.hashrate_mhs / 1000).toFixed(2)),
        power_consumption_watts: cat.power_watts,
        purchase_cost: cat.purchase_price,
      })),
    };
  }

  public static async getCryptoOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const payload = await SectorsController.buildCryptoOverviewPayload(req.user.id);
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async selectCryptoCoin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = selectCoinSchema.parse(req.body);
      let coinId = parsed.coinId;
      if (!coinId && parsed.coin_symbol) {
        const coins = await CryptoStore.listCoins();
        const found = coins.find((c) => c.symbol.toUpperCase() === String(parsed.coin_symbol).toUpperCase());
        if (found) coinId = found.id;
      }
      if (!coinId) coinId = 1;
      await CryptoStore.selectCoin(req.user.id, coinId);
      const overview = await SectorsController.buildCryptoOverviewPayload(req.user.id);
      const response: ApiResponse<{ overview: typeof overview }> = { success: true, data: { overview } };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async buyMiningRig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const parsed = buyRigSchema.parse(req.body);
      const catalogId = Number(parsed.catalogId ?? parsed.rig_catalog_id);
      if (!catalogId || isNaN(catalogId)) {
        throw new AppError('Valid rig catalog ID required', 400, 'INVALID_RIG_ID');
      }
      const result = await CryptoStore.buyMiningRig(req.user.id, catalogId);
      const overview = await SectorsController.buildCryptoOverviewPayload(req.user.id);
      const payload = { overview, balance: result.newBalance, rig: result.rig };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async claimMinedCrypto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const result = await CryptoStore.claimMinedCrypto(req.user.id);
      const overview = await SectorsController.buildCryptoOverviewPayload(req.user.id);
      const payload = { overview, balance: result.newBalance, claimed_usd: result.usdPayout };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  // ==========================================
  // Economic Sinks & Engine Summary
  // ==========================================
  public static async getEconomicSinks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const summary = await EconomicSinksStore.calculateHourlySinks(req.user.id);
      const response: ApiResponse<typeof summary> = { success: true, data: summary };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async tickProgression(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const summary = await SimulationEngine.tickAuthoritativeProgression(req.user.id);
      const response: ApiResponse<typeof summary> = { success: true, data: summary };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async grantDevelopmentFunds(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      if (process.env.NODE_ENV === 'production') {
        throw new AppError('Faucet is restricted in production environments', 403, 'FORBIDDEN');
      }
      const { DatabaseStore } = await import('../../db/store');
      const user = await DatabaseStore.findUserById(req.user.id);
      if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      const grantAmount = 500000.0;
      const newBalance = Number((user.balance + grantAmount).toFixed(2));
      await DatabaseStore.updateUserBalanceAndSyncTime(req.user.id, newBalance, new Date());
      await DatabaseStore.createTransaction(null, req.user.id, grantAmount, 'INITIAL_DEPOSIT', 0, 'COMPLETED');
      const response: ApiResponse<{ newBalance: number; grantedAmount: number }> = {
        success: true,
        data: { newBalance, grantedAmount: grantAmount },
      };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  // ==========================================
  // General Budget & Fiscal Policies
  // ==========================================
  public static async getBudgetStatement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const statement = await BudgetStore.getStatement(req.user.id);
      const response: ApiResponse<typeof statement> = { success: true, data: statement };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async toggleBudgetPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const { policyKey } = req.body;
      if (!policyKey || !['ECO_MODE', 'TAX_ADVISOR', 'EMERGENCY_BUFFER'].includes(policyKey)) {
        throw new AppError('Valid policy key required (ECO_MODE, TAX_ADVISOR, EMERGENCY_BUFFER)', 400, 'INVALID_POLICY_KEY');
      }
      const updatedPolicies = await BudgetStore.togglePolicy(req.user.id, policyKey);
      const statement = await BudgetStore.getStatement(req.user.id);
      const payload = { policies: updatedPolicies, statement };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  public static async withdrawEmergencyReserve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      const amount = Number(req.body.amount || 0);
      const result = await BudgetStore.withdrawEmergencyReserve(req.user.id, amount);
      const statement = await BudgetStore.getStatement(req.user.id);
      const payload = { ...result, statement };
      const response: ApiResponse<typeof payload> = { success: true, data: payload };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }
}
