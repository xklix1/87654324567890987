-- Wealth Race Tycoon: Database Schema Migration 005
-- Phase 4: Real-Time Communication, Social Economy, and Progression

-- 1. Chat Messages (Global and Direct Messaging)
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('GLOBAL', 'DIRECT')),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_direct ON chat_messages(sender_id, receiver_id, created_at DESC);

-- 2. Achievements Catalog
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    reward_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (reward_cash >= 0),
    reward_xp INTEGER NOT NULL DEFAULT 0 CHECK (reward_xp >= 0),
    target_value NUMERIC(14, 2) NOT NULL DEFAULT 1.00 CHECK (target_value > 0)
);

-- 3. User Achievement Progress and Unlocks
CREATE TABLE IF NOT EXISTS user_achievements (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    progress NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (progress >= 0),
    unlocked BOOLEAN NOT NULL DEFAULT FALSE,
    claimed BOOLEAN NOT NULL DEFAULT FALSE,
    unlocked_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- 4. User Social Progression Profile & Rich List Net Worth
CREATE TABLE IF NOT EXISTS user_progression (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
    title VARCHAR(100) NOT NULL DEFAULT 'Novice Investor',
    net_worth NUMERIC(18, 2) NOT NULL DEFAULT 1000.00,
    last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_progression_net_worth ON user_progression(net_worth DESC);
CREATE INDEX IF NOT EXISTS idx_user_progression_level ON user_progression(level DESC);

-- Seed Core Achievement Catalog Data
INSERT INTO achievements (code, title, description, category, reward_cash, reward_xp, target_value) VALUES
('FIRST_TRADE', 'Market Initiate', 'Execute your first stock trade on the exchange', 'MARKET', 500.00, 100, 1),
('ESTATE_ACQUISITION', 'Property Landlord', 'Acquire your first real estate commercial property', 'REAL_ESTATE', 2000.00, 250, 1),
('SHOWROOM_SHOWCASE', 'Automotive Mogul', 'Order a vehicle and display it in your showroom', 'DEALERSHIP', 1500.00, 200, 1),
('AVIATION_DISPATCH', 'Flight Commander', 'Dispatch your first commercial aircraft on a flight route', 'AVIATION', 2500.00, 300, 1),
('INDUSTRIAL_CYCLE', 'Master Fabricator', 'Complete a full manufacturing cycle in your factory', 'PRODUCTION', 1800.00, 250, 1),
('AGRICULTURAL_HARVEST', 'Harvest Tycoon', 'Successfully cultivate and harvest a crop or livestock batch', 'AGRICULTURE', 1200.00, 180, 1),
('GLOBAL_EXPEDITION', 'Maritime Merchant', 'Dispatch an international cargo shipping voyage', 'LOGISTICS', 3000.00, 350, 1),
('CRYPTO_PROSPECTOR', 'Blockchain Miner', 'Install an active GPU mining rig and compute hashrate', 'CRYPTO', 1500.00, 220, 1),
('WEALTH_TIER_1', 'Six-Figure Capitalist', 'Accumulate a total net worth exceeding $100,000.00', 'WEALTH', 10000.00, 1000, 100000),
('WEALTH_TIER_2', 'Half-Millionaire Club', 'Accumulate a total net worth exceeding $500,000.00', 'WEALTH', 50000.00, 2500, 500000),
('SOCIAL_NETWORKER', 'Connected Executive', 'Send your first peer-to-peer money transfer to another tycoon', 'SOCIAL', 500.00, 150, 1)
ON CONFLICT (code) DO NOTHING;
