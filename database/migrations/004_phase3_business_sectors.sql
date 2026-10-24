-- Wealth Race Tycoon: Database Schema Migration 004
-- Phase 3: Game Mechanics & Server-Authoritative Business Sectors

-- 1. Stock Market
CREATE TABLE IF NOT EXISTS stocks (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(10) UNIQUE NOT NULL,
    company_name VARCHAR(100) NOT NULL,
    current_price NUMERIC(12, 2) NOT NULL CHECK (current_price > 0),
    base_price NUMERIC(12, 2) NOT NULL CHECK (base_price > 0),
    volatility NUMERIC(5, 4) NOT NULL DEFAULT 0.05 CHECK (volatility >= 0),
    trend NUMERIC(5, 4) NOT NULL DEFAULT 0.00,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_stocks (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stock_id INTEGER NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    shares_count INTEGER NOT NULL CHECK (shares_count >= 0),
    average_buy_price NUMERIC(12, 2) NOT NULL CHECK (average_buy_price >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, stock_id)
);

-- 2. Real Estate & Small Businesses
CREATE TABLE IF NOT EXISTS real_estate_properties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    purchase_price NUMERIC(14, 2) NOT NULL CHECK (purchase_price > 0),
    base_hourly_income NUMERIC(12, 2) NOT NULL CHECK (base_hourly_income >= 0),
    hourly_maintenance_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (hourly_maintenance_cost >= 0),
    property_tax_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.01 CHECK (property_tax_rate >= 0),
    required_level INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_properties (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id INTEGER NOT NULL REFERENCES real_estate_properties(id) ON DELETE CASCADE,
    upgrade_level INTEGER NOT NULL DEFAULT 1 CHECK (upgrade_level >= 1),
    last_collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Car Dealerships
CREATE TABLE IF NOT EXISTS user_car_dealerships (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    showroom_capacity INTEGER NOT NULL DEFAULT 4 CHECK (showroom_capacity >= 1),
    customer_service_level INTEGER NOT NULL DEFAULT 1 CHECK (customer_service_level >= 1),
    showroom_tier INTEGER NOT NULL DEFAULT 1 CHECK (showroom_tier >= 1),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dealership_vehicles (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    purchase_cost NUMERIC(12, 2) NOT NULL CHECK (purchase_cost > 0),
    retail_price NUMERIC(12, 2) NOT NULL CHECK (retail_price > purchase_cost),
    status VARCHAR(20) NOT NULL DEFAULT 'DISPLAY',
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Airport Tycoon
CREATE TABLE IF NOT EXISTS user_airports (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    runways_count INTEGER NOT NULL DEFAULT 1 CHECK (runways_count >= 1),
    passenger_capacity INTEGER NOT NULL DEFAULT 200 CHECK (passenger_capacity >= 50),
    waiting_lounges_tier INTEGER NOT NULL DEFAULT 1 CHECK (waiting_lounges_tier >= 1),
    duty_free_tier INTEGER NOT NULL DEFAULT 0 CHECK (duty_free_tier >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS airport_routes (
    id SERIAL PRIMARY KEY,
    route_name VARCHAR(100) NOT NULL,
    origin_city VARCHAR(50) NOT NULL,
    destination_city VARCHAR(50) NOT NULL,
    distance_km INTEGER NOT NULL CHECK (distance_km > 0),
    base_revenue NUMERIC(12, 2) NOT NULL CHECK (base_revenue > 0),
    fuel_cost NUMERIC(12, 2) NOT NULL CHECK (fuel_cost >= 0),
    maintenance_cost NUMERIC(12, 2) NOT NULL CHECK (maintenance_cost >= 0),
    flight_duration_minutes INTEGER NOT NULL DEFAULT 30
);

CREATE TABLE IF NOT EXISTS user_aircraft (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_name VARCHAR(100) NOT NULL,
    passenger_capacity INTEGER NOT NULL CHECK (passenger_capacity > 0),
    fuel_efficiency_factor NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
    status VARCHAR(20) NOT NULL DEFAULT 'IDLE',
    current_route_id INTEGER REFERENCES airport_routes(id) ON DELETE SET NULL,
    flight_departure_at TIMESTAMPTZ,
    flight_arrival_at TIMESTAMPTZ,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Production Factories
CREATE TABLE IF NOT EXISTS user_factories (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    factory_name VARCHAR(100) NOT NULL,
    automation_level INTEGER NOT NULL DEFAULT 1 CHECK (automation_level >= 1),
    storage_capacity INTEGER NOT NULL DEFAULT 1000 CHECK (storage_capacity >= 100),
    hourly_operating_cost NUMERIC(12, 2) NOT NULL DEFAULT 50.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS factory_materials (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    material_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, material_type)
);

CREATE TABLE IF NOT EXISTS factory_production_lines (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_name VARCHAR(100) NOT NULL,
    raw_material_type VARCHAR(50) NOT NULL,
    raw_material_units INTEGER NOT NULL CHECK (raw_material_units > 0),
    output_units INTEGER NOT NULL CHECK (output_units > 0),
    output_unit_value NUMERIC(12, 2) NOT NULL CHECK (output_unit_value > 0),
    cycle_duration_seconds INTEGER NOT NULL DEFAULT 60,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    last_cycle_completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Agricultural Farms
CREATE TABLE IF NOT EXISTS user_farms (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    land_acres INTEGER NOT NULL DEFAULT 10 CHECK (land_acres >= 5),
    irrigation_tier INTEGER NOT NULL DEFAULT 1 CHECK (irrigation_tier >= 1),
    greenhouse_tier INTEGER NOT NULL DEFAULT 0 CHECK (greenhouse_tier >= 0),
    machinery_tier INTEGER NOT NULL DEFAULT 1 CHECK (machinery_tier >= 1),
    hourly_utility_cost NUMERIC(12, 2) NOT NULL DEFAULT 20.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS farm_batches (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(20) NOT NULL CHECK (category IN ('CROP', 'LIVESTOCK')),
    batch_name VARCHAR(100) NOT NULL,
    acres_utilized INTEGER NOT NULL CHECK (acres_utilized > 0),
    operational_cost NUMERIC(12, 2) NOT NULL CHECK (operational_cost >= 0),
    yield_market_value NUMERIC(12, 2) NOT NULL CHECK (yield_market_value > 0),
    growth_duration_seconds INTEGER NOT NULL DEFAULT 120,
    planted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    harvested BOOLEAN NOT NULL DEFAULT FALSE
);

-- 7. Import/Export Company
CREATE TABLE IF NOT EXISTS user_import_export (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(100) NOT NULL,
    warehouse_capacity_teu INTEGER NOT NULL DEFAULT 250 CHECK (warehouse_capacity_teu >= 50),
    logistics_level INTEGER NOT NULL DEFAULT 1 CHECK (logistics_level >= 1),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trade_contracts (
    id SERIAL PRIMARY KEY,
    origin_region VARCHAR(50) NOT NULL,
    destination_region VARCHAR(50) NOT NULL,
    cargo_type VARCHAR(50) NOT NULL,
    contract_value NUMERIC(14, 2) NOT NULL CHECK (contract_value > 0),
    prep_cost NUMERIC(12, 2) NOT NULL CHECK (prep_cost >= 0),
    duration_seconds INTEGER NOT NULL DEFAULT 180,
    required_logistics_level INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_trade_voyages (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contract_id INTEGER NOT NULL REFERENCES trade_contracts(id) ON DELETE CASCADE,
    vessel_name VARCHAR(100) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completes_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_TRANSIT'
);

-- 8. Cryptocurrency Mining
CREATE TABLE IF NOT EXISTS crypto_coins (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    market_price NUMERIC(14, 2) NOT NULL CHECK (market_price > 0),
    network_difficulty NUMERIC(16, 4) NOT NULL CHECK (network_difficulty > 0),
    block_reward NUMERIC(10, 6) NOT NULL CHECK (block_reward > 0),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_crypto_mining (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    selected_coin_id INTEGER NOT NULL REFERENCES crypto_coins(id) ON DELETE RESTRICT,
    total_hashrate_mhs NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_hashrate_mhs >= 0),
    power_consumption_watts INTEGER NOT NULL DEFAULT 0 CHECK (power_consumption_watts >= 0),
    electricity_rate_kwh NUMERIC(6, 4) NOT NULL DEFAULT 0.12 CHECK (electricity_rate_kwh >= 0),
    mined_unclaimed_balance NUMERIC(16, 8) NOT NULL DEFAULT 0.00000000,
    last_mined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_mining_rigs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gpu_model VARCHAR(100) NOT NULL,
    hashrate_mhs NUMERIC(10, 2) NOT NULL CHECK (hashrate_mhs > 0),
    power_watts INTEGER NOT NULL CHECK (power_watts > 0),
    purchase_price NUMERIC(12, 2) NOT NULL CHECK (purchase_price > 0),
    installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Initial Static Catalog Data for Phase 3
INSERT INTO stocks (ticker, company_name, current_price, base_price, volatility, trend) VALUES
('WRTC', 'Wealth Real Estate Trust', 150.00, 150.00, 0.03, 0.001),
('GLDX', 'Global Logistics Express', 85.50, 85.50, 0.05, 0.002),
('CYBN', 'Cyber Mining Technologies', 320.00, 320.00, 0.09, -0.001),
('AGRO', 'AeroAgritech Innovations', 45.20, 45.20, 0.04, 0.000),
('AERO', 'Skyward Commercial Aviation', 210.00, 210.00, 0.06, 0.003)
ON CONFLICT (ticker) DO NOTHING;

INSERT INTO real_estate_properties (name, category, purchase_price, base_hourly_income, hourly_maintenance_cost, property_tax_rate, required_level) VALUES
('Downtown Convenience Store', 'RETAIL', 15000.00, 180.00, 30.00, 0.015, 1),
('Boutique Espresso Bar', 'RETAIL', 28000.00, 340.00, 50.00, 0.015, 2),
('Suburban Commercial Plaza', 'COMMERCIAL', 95000.00, 1150.00, 180.00, 0.020, 3),
('Luxury High-Rise Tower', 'RESIDENTIAL', 350000.00, 4200.00, 600.00, 0.025, 5)
ON CONFLICT DO NOTHING;

INSERT INTO airport_routes (route_name, origin_city, destination_city, distance_km, base_revenue, fuel_cost, maintenance_cost, flight_duration_minutes) VALUES
('Domestic Express Line', 'Capital City', 'Coast Harbor', 450, 2500.00, 400.00, 250.00, 15),
('Trans-Continental Corridor', 'Capital City', 'Metro Hub', 1800, 8500.00, 1500.00, 800.00, 45),
('Global Financial Shuttle', 'Capital City', 'Overseas Center', 6200, 28000.00, 5200.00, 2600.00, 90)
ON CONFLICT DO NOTHING;

INSERT INTO trade_contracts (origin_region, destination_region, cargo_type, contract_value, prep_cost, duration_seconds, required_logistics_level) VALUES
('Middle East Gateway', 'North Sea Ports', 'Refined Chemical Compounds', 18000.00, 3200.00, 120, 1),
('East Asian Hub', 'Mediterranean Basin', 'Precision Microelectronics', 45000.00, 8500.00, 240, 2),
('Americas Terminals', 'Arabian Gulf', 'Heavy Industrial Machinery', 110000.00, 22000.00, 480, 4)
ON CONFLICT DO NOTHING;

INSERT INTO crypto_coins (symbol, name, market_price, network_difficulty, block_reward) VALUES
('BTC', 'Bitcoin Hash', 64500.00, 82.50, 0.000450),
('ETH', 'Ethereum Compute', 3450.00, 14.20, 0.008500),
('SLV', 'Silver Coin Chain', 120.00, 2.10, 0.250000)
ON CONFLICT (symbol) DO NOTHING;
