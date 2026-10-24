export interface StockItem {
  symbol: string;
  name: string;
  current_price: number;
  previous_price: number;
  change_percent: number;
  volatility: number;
  sector: string;
  updated_at: string;
}

export interface StockHolding {
  symbol: string;
  shares: number;
  average_buy_price: number;
  total_invested: number;
  current_price: number;
  current_market_value: number;
  unrealized_profit: number;
  unrealized_profit_percent: number;
}

export interface StockPortfolioResponse {
  holdings: StockHolding[];
  total_invested: number;
  total_market_value: number;
  total_unrealized_profit: number;
}

export interface PropertyCatalogItem {
  id: string;
  name: string;
  type: string;
  base_price: number;
  base_hourly_income: number;
  image_url?: string;
  description: string;
}

export interface UserProperty {
  id: string;
  user_id: string;
  catalog_id: string;
  name: string;
  type: string;
  upgrade_tier: number;
  hourly_income: number;
  last_collected_at: string;
  purchased_at: string;
  upgrade_cost: number;
}

export interface VehicleContract {
  id: string;
  model: string;
  brand: string;
  cost: number;
  base_sell_price: number;
  delivery_time_seconds: number;
  tier_required: number;
}

export interface DealershipInventoryCar {
  id: string;
  contract_id: string;
  brand: string;
  model: string;
  condition_percent: number;
  potential_sale_price: number;
  delivered_at: string;
}

export interface DealershipProfile {
  showroom_tier: number;
  max_display_slots: number;
  customer_satisfaction: number;
  inventory: DealershipInventoryCar[];
  next_upgrade_cost: number;
}

export interface AirportRoute {
  id: string;
  origin: string;
  destination: string;
  distance_km: number;
  required_aircraft_tier: number;
  base_passenger_fare: number;
  flight_duration_seconds: number;
}

export interface AircraftCatalogItem {
  id: string;
  model: string;
  manufacturer: string;
  tier: number;
  passenger_capacity: number;
  purchase_price: number;
  operating_cost_per_flight: number;
}

export interface UserAircraft {
  id: string;
  aircraft_id: string;
  model: string;
  tier: number;
  capacity: number;
  is_in_flight: boolean;
  assigned_route_id: string | null;
  flight_departure_time: string | null;
  flight_arrival_time: string | null;
  purchased_at: string;
}

export interface AirportHub {
  terminal_tier: number;
  runway_tier: number;
  max_aircraft_slots: number;
  fleet: UserAircraft[];
  routes: AirportRoute[];
  next_terminal_upgrade_cost: number;
}

export interface FactoryAssemblyLine {
  id: string;
  name: string;
  product_name: string;
  raw_material_required: number;
  production_duration_seconds: number;
  cycle_cost: number;
  sale_price: number;
  is_producing: boolean;
  production_completes_at: string | null;
}

export interface FactoryOverview {
  factory_tier: number;
  automation_level: number;
  raw_materials_stock: number;
  raw_material_unit_cost: number;
  finished_goods_inventory: number;
  assembly_lines: FactoryAssemblyLine[];
  next_upgrade_cost: number;
}

export interface FarmCatalogCrop {
  id: string;
  crop_name: string;
  seed_cost_per_acre: number;
  growth_time_seconds: number;
  yield_revenue_per_acre: number;
  required_farm_tier: number;
}

export interface FarmPlantedBatch {
  id: string;
  crop_id: string;
  crop_name: string;
  acres_planted: number;
  planted_at: string;
  harvest_ready_at: string;
  potential_revenue: number;
  is_ready: boolean;
}

export interface FarmOverview {
  farm_tier: number;
  total_acres: number;
  used_acres: number;
  available_acres: number;
  planted_batches: FarmPlantedBatch[];
  crops_catalog: FarmCatalogCrop[];
  next_acreage_expansion_cost: number;
}

export interface TradeContract {
  id: string;
  title: string;
  cargo_type: string;
  required_capital: number;
  voyage_duration_seconds: number;
  gross_revenue: number;
  risk_factor_percent: number;
  required_warehouse_tier: number;
}

export interface ActiveVoyage {
  id: string;
  contract_id: string;
  title: string;
  departure_time: string;
  arrival_time: string;
  is_completed: boolean;
  gross_revenue: number;
}

export interface ImportExportOverview {
  warehouse_tier: number;
  logistics_fleet_size: number;
  active_voyages: ActiveVoyage[];
  available_contracts: TradeContract[];
  next_logistics_upgrade_cost: number;
}

export interface CryptoCoin {
  symbol: string;
  name: string;
  market_price_usd: number;
  mining_difficulty: number;
  block_reward: number;
}

export interface CryptoRigCatalogItem {
  id: string;
  model_name: string;
  hashrate_ths: number;
  power_consumption_watts: number;
  purchase_cost: number;
}

export interface ActiveCryptoRig {
  id: string;
  rig_catalog_id: string;
  model_name: string;
  hashrate_ths: number;
  active: boolean;
  installed_at: string;
}

export interface CryptoOverview {
  selected_coin: string;
  total_hashrate_ths: number;
  active_rigs_count: number;
  uncashed_mined_balance: number;
  uncashed_value_usd: number;
  rigs: ActiveCryptoRig[];
  rig_catalog: CryptoRigCatalogItem[];
  coins: CryptoCoin[];
}

export interface EconomicSinksOverview {
  hourly_income: number;
  hourly_maintenance: number;
  hourly_taxes: number;
  net_hourly_flow: number;
  last_tick_processed_at: string;
}
