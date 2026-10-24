-- Wealth Race Tycoon: Database Schema Migration 003
-- Description: Anti-Fraud engine, transaction fees, and high-concurrency indexes

-- Add fee and status to transactions table if not already present
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS fee NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (fee >= 0);

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED';

-- High-performance composite index for anti-fraud daily transfer volume aggregation
CREATE INDEX IF NOT EXISTS idx_transactions_sender_type_created 
ON transactions(sender_id, type, created_at DESC);

-- Index for receiver lookup and recipient history
CREATE INDEX IF NOT EXISTS idx_transactions_receiver_created 
ON transactions(receiver_id, created_at DESC);
