import { ApiClient } from './api.client';
import {
  StockItem,
  StockPortfolioResponse,
  PropertyCatalogItem,
  UserProperty,
  VehicleContract,
  DealershipProfile,
  AirportRoute,
  AircraftCatalogItem,
  AirportHub,
  FactoryOverview,
  FarmOverview,
  ImportExportOverview,
  CryptoOverview,
  EconomicSinksOverview,
} from '../types/sectors';
import { BudgetStatement, BudgetPolicySettings, BudgetPolicyKey } from '../types/budget';
import { JobRecord } from '../types/user';

export class SectorsService {
  // Jobs
  public static async getJobs(): Promise<JobRecord[]> {
    return ApiClient.get<JobRecord[]>('/jobs');
  }

  // Stock Market
  public static async listStocks(): Promise<StockItem[]> {
    return ApiClient.get<StockItem[]>('/sectors/stocks');
  }

  public static async getStockPortfolio(token: string): Promise<StockPortfolioResponse> {
    return ApiClient.get<StockPortfolioResponse>('/sectors/stocks/portfolio', token);
  }

  public static async buyStock(
    token: string,
    symbol: string,
    shares: number
  ): Promise<{ message: string; balance: number }> {
    return ApiClient.post<{ message: string; balance: number }, { symbol: string; shares: number }>(
      '/sectors/stocks/buy',
      { symbol, shares },
      token
    );
  }

  public static async sellStock(
    token: string,
    symbol: string,
    shares: number
  ): Promise<{ message: string; balance: number }> {
    return ApiClient.post<{ message: string; balance: number }, { symbol: string; shares: number }>(
      '/sectors/stocks/sell',
      { symbol, shares },
      token
    );
  }

  // Real Estate
  public static async listPropertiesCatalog(): Promise<PropertyCatalogItem[]> {
    return ApiClient.get<PropertyCatalogItem[]>('/sectors/real-estate/catalog');
  }

  public static async getUserProperties(token: string): Promise<UserProperty[]> {
    return ApiClient.get<UserProperty[]>('/sectors/real-estate/properties', token);
  }

  public static async buyProperty(
    token: string,
    catalog_id: string
  ): Promise<{ property: UserProperty; balance: number }> {
    return ApiClient.post<
      { property: UserProperty; balance: number },
      { propertyId: number; property_id: string }
    >(
      '/sectors/real-estate/buy',
      { propertyId: Number(catalog_id), property_id: catalog_id },
      token
    );
  }

  public static async upgradeProperty(
    token: string,
    property_id: string
  ): Promise<{ property: UserProperty; balance: number }> {
    return ApiClient.post<
      { property: UserProperty; balance: number },
      { userPropertyId: number; property_id: string }
    >(
      '/sectors/real-estate/upgrade',
      { userPropertyId: Number(property_id), property_id: property_id },
      token
    );
  }

  // Car Dealerships
  public static async listVehicleContracts(): Promise<VehicleContract[]> {
    return ApiClient.get<VehicleContract[]>('/sectors/dealership/contracts');
  }

  public static async getDealershipProfile(token: string): Promise<DealershipProfile> {
    return ApiClient.get<DealershipProfile>('/sectors/dealership/profile', token);
  }

  public static async orderVehicle(
    token: string,
    contract_id: string
  ): Promise<{ profile: DealershipProfile; balance: number }> {
    return ApiClient.post<
      { profile: DealershipProfile; balance: number },
      { contractId: number; contract_id: string }
    >(
      '/sectors/dealership/order',
      { contractId: Number(contract_id), contract_id },
      token
    );
  }

  public static async sellVehicle(
    token: string,
    car_id: string
  ): Promise<{ profile: DealershipProfile; balance: number; sale_price: number }> {
    return ApiClient.post<
      { profile: DealershipProfile; balance: number; sale_price: number },
      { vehicleId: number; car_id: string }
    >('/sectors/dealership/sell', { vehicleId: Number(car_id), car_id }, token);
  }

  public static async upgradeDealership(
    token: string
  ): Promise<{ profile: DealershipProfile; balance: number }> {
    return ApiClient.post<
      { profile: DealershipProfile; balance: number },
      { upgradeType: 'TIER' }
    >(
      '/sectors/dealership/upgrade',
      { upgradeType: 'TIER' },
      token
    );
  }

  // Airport Tycoon
  public static async listAirportRoutes(): Promise<AirportRoute[]> {
    return ApiClient.get<AirportRoute[]>('/sectors/airport/routes');
  }

  public static async listAircraftCatalog(): Promise<AircraftCatalogItem[]> {
    return ApiClient.get<AircraftCatalogItem[]>('/sectors/airport/aircraft-catalog');
  }

  public static async getAirportHub(token: string): Promise<AirportHub> {
    return ApiClient.get<AirportHub>('/sectors/airport/hub', token);
  }

  public static async buyAircraft(
    token: string,
    aircraft_catalog_id: string
  ): Promise<{ hub: AirportHub; balance: number }> {
    return ApiClient.post<
      { hub: AirportHub; balance: number },
      { catalogId: number; aircraft_catalog_id: string }
    >(
      '/sectors/airport/buy-aircraft',
      { catalogId: Number(aircraft_catalog_id), aircraft_catalog_id },
      token
    );
  }

  public static async dispatchFlight(
    token: string,
    user_aircraft_id: string,
    route_id: string
  ): Promise<{ hub: AirportHub; balance: number }> {
    return ApiClient.post<
      { hub: AirportHub; balance: number },
      { aircraftId: number; user_aircraft_id: string; routeId: number; route_id: string }
    >(
      '/sectors/airport/dispatch',
      {
        aircraftId: Number(user_aircraft_id),
        user_aircraft_id,
        routeId: Number(route_id),
        route_id,
      },
      token
    );
  }

  public static async landFlight(
    token: string,
    user_aircraft_id: string
  ): Promise<{ hub: AirportHub; balance: number; gross_revenue: number }> {
    return ApiClient.post<
      { hub: AirportHub; balance: number; gross_revenue: number },
      { aircraftId: number; user_aircraft_id: string }
    >('/sectors/airport/land', { aircraftId: Number(user_aircraft_id), user_aircraft_id }, token);
  }

  public static async upgradeAirport(
    token: string
  ): Promise<{ hub: AirportHub; balance: number }> {
    return ApiClient.post<
      { hub: AirportHub; balance: number },
      { upgradeType: 'RUNWAY' }
    >(
      '/sectors/airport/upgrade',
      { upgradeType: 'RUNWAY' },
      token
    );
  }

  // Production Factories
  public static async getFactoryOverview(token: string): Promise<FactoryOverview> {
    return ApiClient.get<FactoryOverview>('/sectors/factory/overview', token);
  }

  public static async buyMaterials(
    token: string,
    units: number
  ): Promise<{ factory: FactoryOverview; balance: number }> {
    return ApiClient.post<{ factory: FactoryOverview; balance: number }, { units: number }>(
      '/sectors/factory/materials/buy',
      { units },
      token
    );
  }

  public static async createProductionLine(
    token: string,
    name: string,
    product_name: string
  ): Promise<{ factory: FactoryOverview; balance: number }> {
    return ApiClient.post<
      { factory: FactoryOverview; balance: number },
      { name: string; product_name: string }
    >('/sectors/factory/lines/create', { name, product_name }, token);
  }

  public static async runProductionCycle(
    token: string,
    line_id: string
  ): Promise<{ factory: FactoryOverview; balance: number; gross_revenue: number }> {
    return ApiClient.post<
      { factory: FactoryOverview; balance: number; gross_revenue: number },
      { line_id: string }
    >('/sectors/factory/lines/produce', { line_id }, token);
  }

  public static async upgradeFactory(
    token: string
  ): Promise<{ factory: FactoryOverview; balance: number }> {
    return ApiClient.post<{ factory: FactoryOverview; balance: number }, Record<string, never>>(
      '/sectors/factory/upgrade',
      {},
      token
    );
  }

  // Agricultural Farms
  public static async getFarmOverview(token: string): Promise<FarmOverview> {
    return ApiClient.get<FarmOverview>('/sectors/farm/overview', token);
  }

  public static async plantFarmBatch(
    token: string,
    crop_id: string,
    acres: number
  ): Promise<{ farm: FarmOverview; balance: number }> {
    return ApiClient.post<
      { farm: FarmOverview; balance: number },
      { crop_id: string; acres: number }
    >('/sectors/farm/plant', { crop_id, acres }, token);
  }

  public static async harvestFarmBatch(
    token: string,
    batch_id: string
  ): Promise<{ farm: FarmOverview; balance: number; revenue: number }> {
    return ApiClient.post<
      { farm: FarmOverview; balance: number; revenue: number },
      { batch_id: string }
    >('/sectors/farm/harvest', { batch_id }, token);
  }

  public static async upgradeFarm(
    token: string
  ): Promise<{ farm: FarmOverview; balance: number }> {
    return ApiClient.post<{ farm: FarmOverview; balance: number }, Record<string, never>>(
      '/sectors/farm/upgrade',
      {},
      token
    );
  }

  // Import / Export
  public static async getImportExportOverview(token: string): Promise<ImportExportOverview> {
    return ApiClient.get<ImportExportOverview>('/sectors/import-export/overview', token);
  }

  public static async dispatchTradeVoyage(
    token: string,
    contract_id: string
  ): Promise<{ overview: ImportExportOverview; balance: number }> {
    return ApiClient.post<
      { overview: ImportExportOverview; balance: number },
      { contractId: number; contract_id: string; vesselName: string }
    >(
      '/sectors/import-export/dispatch',
      { contractId: Number(contract_id), contract_id, vesselName: 'Titan Carrier' },
      token
    );
  }

  public static async collectTradeVoyage(
    token: string,
    voyage_id: string
  ): Promise<{ overview: ImportExportOverview; balance: number; revenue: number }> {
    return ApiClient.post<
      { overview: ImportExportOverview; balance: number; revenue: number },
      { voyageId: number; voyage_id: string }
    >('/sectors/import-export/collect', { voyageId: Number(voyage_id), voyage_id }, token);
  }

  public static async upgradeImportExport(
    token: string
  ): Promise<{ overview: ImportExportOverview; balance: number }> {
    return ApiClient.post<
      { overview: ImportExportOverview; balance: number },
      { upgradeType: 'WAREHOUSE' }
    >(
      '/sectors/import-export/upgrade',
      { upgradeType: 'WAREHOUSE' },
      token
    );
  }

  // Crypto Mining
  public static async getCryptoOverview(token: string): Promise<CryptoOverview> {
    return ApiClient.get<CryptoOverview>('/sectors/crypto/overview', token);
  }

  public static async selectCryptoCoin(
    token: string,
    coin_symbol: string
  ): Promise<{ overview: CryptoOverview }> {
    return ApiClient.post<{ overview: CryptoOverview }, { coin_symbol: string }>(
      '/sectors/crypto/select-coin',
      { coin_symbol },
      token
    );
  }

  public static async buyMiningRig(
    token: string,
    rig_catalog_id: string
  ): Promise<{ overview: CryptoOverview; balance: number }> {
    return ApiClient.post<
      { overview: CryptoOverview; balance: number },
      { rig_catalog_id: string }
    >('/sectors/crypto/buy-rig', { rig_catalog_id }, token);
  }

  public static async claimMinedCrypto(
    token: string
  ): Promise<{ overview: CryptoOverview; balance: number; claimed_usd: number }> {
    return ApiClient.post<
      { overview: CryptoOverview; balance: number; claimed_usd: number },
      Record<string, never>
    >('/sectors/crypto/claim', {}, token);
  }

  // Economic Sinks & Engine
  public static async getEconomicSinks(token: string): Promise<EconomicSinksOverview> {
    return ApiClient.get<EconomicSinksOverview>('/economy/sinks', token);
  }

  public static async tickProgression(token: string): Promise<{ balance: number; net_delta: number }> {
    return ApiClient.post<{ balance: number; net_delta: number }, Record<string, never>>(
      '/economy/tick',
      {},
      token
    );
  }

  public static async requestFaucet(token: string): Promise<{ balance: number }> {
    return ApiClient.post<{ balance: number }, Record<string, never>>('/economy/faucet', {}, token);
  }

  // General Budget & Fiscal Policies
  public static async getBudgetStatement(token: string): Promise<BudgetStatement> {
    return ApiClient.get<BudgetStatement>('/economy/budget/statement', token);
  }

  public static async toggleBudgetPolicy(
    token: string,
    policyKey: BudgetPolicyKey
  ): Promise<{ policies: BudgetPolicySettings; statement: BudgetStatement }> {
    return ApiClient.post<
      { policies: BudgetPolicySettings; statement: BudgetStatement },
      { policyKey: BudgetPolicyKey }
    >('/economy/budget/policy/toggle', { policyKey }, token);
  }

  public static async withdrawEmergencyReserve(
    token: string,
    amount: number
  ): Promise<{ newBalance: number; newReserve: number; statement: BudgetStatement }> {
    return ApiClient.post<
      { newBalance: number; newReserve: number; statement: BudgetStatement },
      { amount: number }
    >('/economy/budget/emergency/withdraw', { amount }, token);
  }
}
