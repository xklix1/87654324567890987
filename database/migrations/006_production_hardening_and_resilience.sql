-- Wealth Race Tycoon: Database Schema Migration 006
-- Description: Production Hardening, Anti-Sybil, Idempotency, Feature Flags, and Security Audit

-- 1. Extend users table with active session tracking, device fingerprinting, and security flags
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS active_session_id VARCHAR(64),
ADD COLUMN IF NOT EXISTS registered_device_id VARCHAR(128),
ADD COLUMN IF NOT EXISTS last_device_id VARCHAR(128),
ADD COLUMN IF NOT EXISTS last_ip_address VARCHAR(45),
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS transfers_frozen BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS suspension_reason VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_active_session ON users(active_session_id);
CREATE INDEX IF NOT EXISTS idx_users_registered_device ON users(registered_device_id);
CREATE INDEX IF NOT EXISTS idx_users_last_device ON users(last_device_id);

-- 2. Hardware Device Registration History (Anti-Multi-Accounting)
CREATE TABLE IF NOT EXISTS device_registrations (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(128) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_registrations_device_id ON device_registrations(device_id);
CREATE INDEX IF NOT EXISTS idx_device_registrations_user_id ON device_registrations(user_id);

-- 3. Idempotency Keys Storage (Financial Mutation Protection)
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id BIGSERIAL PRIMARY KEY,
    key VARCHAR(128) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64),
    response_status INTEGER NOT NULL DEFAULT 200,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 HOURS')
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user ON idempotency_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys(expires_at);

-- 4. Security Nonces for Anti-Replay Attack Protection
CREATE TABLE IF NOT EXISTS security_nonces (
    nonce VARCHAR(128) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_nonces_created ON security_nonces(created_at);

-- 5. System Feature Flags & Sector Kill-Switches
CREATE TABLE IF NOT EXISTS system_feature_flags (
    key VARCHAR(64) PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    description VARCHAR(255),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_feature_flags (key, enabled, description) VALUES
('GLOBAL_MAINTENANCE_MODE', FALSE, 'Global emergency maintenance lock for all gameplay'),
('P2P_TRANSFERS_ENABLED', TRUE, 'Peer-to-peer money transfers between tycoons'),
('STOCK_MARKET_ENABLED', TRUE, 'Stock exchange buying, selling and price streaming'),
('REAL_ESTATE_ENABLED', TRUE, 'Commercial real estate acquisition and upgrade'),
('DEALERSHIP_ENABLED', TRUE, 'Exotic vehicle showroom trading and sales'),
('AIRPORT_ENABLED', TRUE, 'Commercial airline fleet management and flights'),
('FACTORIES_ENABLED', TRUE, 'Manufacturing and industrial production cycles'),
('FARMS_ENABLED', TRUE, 'Agricultural crops and livestock harvesting'),
('LOGISTICS_ENABLED', TRUE, 'International container freight and maritime voyages'),
('CRYPTO_ENABLED', TRUE, 'Cryptocurrency rig mining and cloud rewards')
ON CONFLICT (key) DO NOTHING;

-- 6. Economic Anomaly Audit Logs
CREATE TABLE IF NOT EXISTS economic_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    anomaly_type VARCHAR(64) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'HIGH',
    details JSONB NOT NULL,
    action_taken VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_economic_audit_logs_user ON economic_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_economic_audit_logs_created ON economic_audit_logs(created_at DESC);
