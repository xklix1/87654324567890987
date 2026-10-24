-- Wealth Race Tycoon: Database Schema Migration 001
-- Description: Core relational schema with strict constraints and indexes

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: system_version
CREATE TABLE IF NOT EXISTS system_version (
    id SERIAL PRIMARY KEY,
    current_version VARCHAR(20) NOT NULL,
    minimum_supported_version VARCHAR(20) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: jobs
CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    hourly_salary NUMERIC(12, 2) NOT NULL CHECK (hourly_salary >= 0),
    required_level INTEGER NOT NULL DEFAULT 1 CHECK (required_level >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    balance NUMERIC(18, 2) NOT NULL DEFAULT 1000.00 CHECK (balance >= 0),
    current_job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: transactions
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    fee NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (fee >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance and query optimization
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_current_job_id ON users(current_job_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sender_id ON transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver_id ON transactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
