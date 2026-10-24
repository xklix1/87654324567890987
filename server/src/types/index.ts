export interface UserRecord {
  id: string;
  username: string;
  email?: string | null;
  password_hash: string;
  balance: number;
  current_job_id: number | null;
  last_synced_at: Date;
  created_at: Date;
  active_session_id?: string | null;
  registered_device_id?: string | null;
  last_device_id?: string | null;
  last_ip_address?: string | null;
  is_suspended?: boolean;
  transfers_frozen?: boolean;
  suspension_reason?: string | null;
}

export interface JobRecord {
  id: number;
  title: string;
  hourly_salary: number;
  required_level: number;
  created_at: Date;
}

export type TransactionType =
  | 'INITIAL_DEPOSIT'
  | 'OFFLINE_SALARY'
  | 'PEER_TRANSFER'
  | 'BUSINESS_INVESTMENT'
  | 'MARKET_TRADE'
  | 'STOCK_BUY'
  | 'STOCK_SELL'
  | 'REAL_ESTATE_PURCHASE'
  | 'REAL_ESTATE_YIELD'
  | 'CAR_PURCHASE'
  | 'CAR_SALE'
  | 'FLIGHT_EXPENSE'
  | 'FLIGHT_REVENUE'
  | 'FACTORY_EXPENSE'
  | 'FACTORY_REVENUE'
  | 'FARM_EXPENSE'
  | 'FARM_HARVEST'
  | 'TRADE_VOYAGE_EXPENSE'
  | 'TRADE_VOYAGE_REVENUE'
  | 'CRYPTO_EQUIPMENT'
  | 'CRYPTO_CLAIM'
  | 'ECONOMIC_SINK_MAINTENANCE'
  | 'ECONOMIC_SINK_TAX'
  | 'ECONOMIC_SINK_UTILITIES'
  | 'ACHIEVEMENT_REWARD';

export type TransactionStatus = 'COMPLETED' | 'REJECTED' | 'PENDING';

export interface TransactionRecord {
  id: number;
  sender_id: string | null;
  receiver_id: string;
  amount: number;
  fee: number;
  status: TransactionStatus;
  type: TransactionType;
  created_at: Date;
}

export interface P2PTransferReceipt {
  transaction_id: number;
  sender_id: string;
  sender_username: string;
  receiver_id: string;
  receiver_username: string;
  amount: number;
  fee: number;
  total_deducted: number;
  sender_new_balance: number;
  daily_transferred_today: number;
  daily_cap_remaining: number;
  created_at: string;
}

export interface DailyTransferQuota {
  daily_limit: number;
  transferred_today: number;
  remaining_limit: number;
  fee_percentage: number;
}

export interface SearchUserItem {
  id: string;
  username: string;
  created_at: string;
}

export interface SystemVersionRecord {
  id: number;
  current_version: string;
  minimum_supported_version: string;
  updated_at: Date;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  sessionId?: string;
  deviceId?: string;
}

export interface JwtTokenPayload {
  userId: string;
  username: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

export interface SystemFeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  updated_at: string;
}

export interface IdempotencyRecord {
  id?: number;
  key: string;
  user_id: string;
  endpoint: string;
  request_hash?: string;
  response_status: number;
  response_body: unknown;
  created_at: Date;
  expires_at: Date;
}

export type DeltaUpdateType = 'STOCK_TICK' | 'BALANCE_DIFF' | 'LEADERBOARD_RANK' | 'SYSTEM_ALERT';

export interface DeltaUpdate {
  type: DeltaUpdateType;
  entity_id: string;
  field: string;
  value: number | string | boolean;
  diff?: number;
  timestamp: number;
}


export interface ApiResponseSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponseError {
  success: false;
  error: ApiErrorDetail;
}

export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError;

export interface OfflineProgressionAccrual {
  elapsed_seconds: number;
  elapsed_hours: number;
  capped_hours: number;
  accrued_amount: number;
  hourly_rate: number;
  job_title: string | null;
}

export interface SyncResponseData {
  user: {
    id: string;
    username: string;
    balance: number;
    current_job_id: number | null;
    last_synced_at: string;
    created_at: string;
    transfers_frozen?: boolean;
    is_suspended?: boolean;
    suspension_reason?: string | null;
  };
  job: JobRecord | null;
  offline_progression: OfflineProgressionAccrual;
  recent_transactions: TransactionRecord[];
  server_time: string;
  server_timestamp: number;
}

// -------------------------------------------------------------
// Phase 3: Server-Authoritative Business Sectors & Economic Sinks
// -------------------------------------------------------------

// 1. Stock Market
export interface StockRecord {
  id: number;
  ticker: string;
  company_name: string;
  current_price: number;
  base_price: number;
  volatility: number;
  trend: number;
  last_updated: Date;
}

export interface UserStockPosition {
  stock_id: number;
  ticker: string;
  company_name: string;
  current_price: number;
  shares_count: number;
  average_buy_price: number;
  total_market_value: number;
  unrealized_profit_loss: number;
}

// 2. Real Estate & Small Businesses
export interface RealEstatePropertyCatalog {
  id: number;
  name: string;
  category: 'COMMERCIAL' | 'RESIDENTIAL' | 'RETAIL';
  purchase_price: number;
  base_hourly_income: number;
  hourly_maintenance_cost: number;
  property_tax_rate: number;
  required_level: number;
}

export interface UserPropertyRecord {
  id: number;
  user_id: string;
  property_id: number;
  property_name: string;
  category: string;
  upgrade_level: number;
  current_hourly_income: number;
  current_maintenance_cost: number;
  purchased_at: Date;
}

// 3. Car Dealership
export interface DealershipVehicle {
  id: number;
  user_id: string;
  model_name: string;
  category: string;
  purchase_cost: number;
  retail_price: number;
  status: 'DISPLAY' | 'SOLD';
  acquired_at: Date;
}

export interface UserDealershipProfile {
  showroom_capacity: number;
  customer_service_level: number;
  showroom_tier: number;
  vehicles_on_display: DealershipVehicle[];
}

// 4. Airport Tycoon
export interface AirportRouteCatalog {
  id: number;
  route_name: string;
  origin_city: string;
  destination_city: string;
  distance_km: number;
  base_revenue: number;
  fuel_cost: number;
  maintenance_cost: number;
  flight_duration_minutes: number;
}

export interface UserAircraftRecord {
  id: number;
  user_id: string;
  model_name: string;
  passenger_capacity: number;
  fuel_efficiency_factor: number;
  status: 'IDLE' | 'IN_FLIGHT' | 'MAINTENANCE';
  current_route_id: number | null;
  flight_departure_at: Date | null;
  flight_arrival_at: Date | null;
}

export interface UserAirportHub {
  runways_count: number;
  passenger_capacity: number;
  waiting_lounges_tier: number;
  duty_free_tier: number;
  fleet: UserAircraftRecord[];
}

// 5. Production Factories
export interface FactoryProductionLine {
  id: number;
  user_id: string;
  product_name: string;
  raw_material_type: string;
  raw_material_units: number;
  output_units: number;
  output_unit_value: number;
  cycle_duration_seconds: number;
  is_active: boolean;
  last_cycle_completed_at: Date;
}

export interface UserFactoryOverview {
  factory_name: string;
  automation_level: number;
  storage_capacity: number;
  hourly_operating_cost: number;
  materials: Record<string, number>;
  lines: FactoryProductionLine[];
}

// 6. Agricultural Farms
export interface FarmBatchRecord {
  id: number;
  user_id: string;
  category: 'CROP' | 'LIVESTOCK';
  batch_name: string;
  acres_utilized: number;
  operational_cost: number;
  yield_market_value: number;
  growth_duration_seconds: number;
  planted_at: Date;
  harvested: boolean;
  ready_to_harvest: boolean;
}

export interface UserFarmOverview {
  land_acres: number;
  acres_in_use: number;
  irrigation_tier: number;
  greenhouse_tier: number;
  machinery_tier: number;
  hourly_utility_cost: number;
  batches: FarmBatchRecord[];
}

// 7. Import/Export Company
export interface TradeContractCatalog {
  id: number;
  origin_region: string;
  destination_region: string;
  cargo_type: string;
  contract_value: number;
  prep_cost: number;
  duration_seconds: number;
  required_logistics_level: number;
}

export interface UserTradeVoyage {
  id: number;
  user_id: string;
  contract_id: number;
  contract_name: string;
  vessel_name: string;
  started_at: Date;
  completes_at: Date;
  status: 'IN_TRANSIT' | 'COMPLETED' | 'COLLECTED';
  contract_value: number;
}

export interface UserImportExportOverview {
  company_name: string;
  warehouse_capacity_teu: number;
  logistics_level: number;
  active_voyages: UserTradeVoyage[];
}

// 8. Cryptocurrency Mining
export interface CryptoCoinCatalog {
  id: number;
  symbol: string;
  name: string;
  market_price: number;
  network_difficulty: number;
  block_reward: number;
  last_updated: Date;
}

export interface MiningRigRecord {
  id: number;
  user_id: string;
  gpu_model: string;
  hashrate_mhs: number;
  power_watts: number;
  purchase_price: number;
  installed_at: Date;
}

export interface UserCryptoMiningOverview {
  selected_coin: CryptoCoinCatalog;
  total_hashrate_mhs: number;
  power_consumption_watts: number;
  electricity_rate_kwh: number;
  hourly_electricity_cost: number;
  mined_unclaimed_balance: number;
  unclaimed_usd_value: number;
  rigs: MiningRigRecord[];
}

// Economic Sinks & Engine Summary
export interface EconomicSinkSummary {
  hourly_maintenance: number;
  hourly_utilities: number;
  hourly_property_taxes: number;
  total_hourly_sink: number;
}

export interface AuthoritativeTickSummary {
  user_id: string;
  elapsed_seconds: number;
  salary_earned: number;
  passive_business_income: number;
  economic_sinks_deducted: number;
  net_cash_flow: number;
  new_balance: number;
  timestamp: string;
}

// -------------------------------------------------------------
// Phase 4: Real-Time Communication, Social Economy & Progression
// -------------------------------------------------------------

// 1. Real-Time Chat & Messaging
export type ChatChannel = 'GLOBAL' | 'DIRECT';

export interface ChatMessageRecord {
  id: number;
  channel: ChatChannel;
  sender_id: string;
  sender_username: string;
  receiver_id: string | null;
  receiver_username: string | null;
  content: string;
  created_at: string;
}

export interface SendChatMessageInput {
  channel: ChatChannel;
  receiver_id?: string;
  content: string;
}

// 2. Leaderboard & Rich List
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  level: number;
  title: string;
  net_worth: number;
  liquid_cash: number;
  assets_valuation: number;
}

export interface PlayerAssetBreakdown {
  liquid_cash: number;
  stocks_value: number;
  real_estate_value: number;
  dealership_value: number;
  airport_fleet_value: number;
  factory_value: number;
  farm_value: number;
  shipping_value: number;
  crypto_rigs_value: number;
  total_assets_value: number;
  net_worth: number;
}

// 3. Player Profile
export interface PlayerProfile {
  user_id: string;
  username: string;
  level: number;
  title: string;
  xp: number;
  xp_for_next_level: number;
  net_worth: number;
  liquid_cash: number;
  current_job: string | null;
  joined_at: string;
  asset_breakdown: PlayerAssetBreakdown;
  unlocked_achievements_count: number;
  total_achievements_count: number;
}

// 4. Achievements Progression
export interface AchievementCatalogItem {
  id: number;
  code: string;
  title: string;
  description: string;
  category: string;
  reward_cash: number;
  reward_xp: number;
  target_value: number;
}

export interface UserAchievementItem {
  achievement_id: number;
  code: string;
  title: string;
  description: string;
  category: string;
  reward_cash: number;
  reward_xp: number;
  target_value: number;
  current_progress: number;
  unlocked: boolean;
  claimed: boolean;
  unlocked_at: string | null;
  claimed_at: string | null;
}

export interface ClaimAchievementResult {
  achievement: UserAchievementItem;
  cash_reward: number;
  xp_reward: number;
  new_balance: number;
  new_xp: number;
  new_level: number;
  new_title: string;
  leveled_up: boolean;
}

// 5. General Budget & Fiscal Statement Types
export type BudgetPolicyKey = 'ECO_MODE' | 'TAX_ADVISOR' | 'EMERGENCY_BUFFER';

export interface BudgetPolicySettings {
  eco_mode: boolean;
  tax_advisor: boolean;
  emergency_buffer: boolean;
}

export interface BudgetSectorBreakdown {
  sector_id: string;
  name: string;
  inflow_hourly: number;
  maintenance_hourly: number;
  tax_hourly: number;
  utilities_hourly: number;
  total_outflow_hourly: number;
  net_hourly: number;
  operating_margin: number;
}

export interface BudgetStatement {
  user_id: string;
  total_hourly_inflow: number;
  total_hourly_outflow: number;
  net_hourly_flow: number;
  net_operating_margin: number;
  is_in_freeze: boolean;
  tax_bracket_percentage: number;
  policies: BudgetPolicySettings;
  sectors: BudgetSectorBreakdown[];
  emergency_reserve_balance: number;
  last_calculated_at: string;
}

