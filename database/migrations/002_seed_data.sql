-- Wealth Race Tycoon: Database Seed Migration 002
-- Description: Baseline system version and initial job hierarchy data

-- Insert initial system version if not present
INSERT INTO system_version (id, current_version, minimum_supported_version, updated_at)
VALUES (1, '1.0.0', '1.0.0', NOW())
ON CONFLICT (id) DO UPDATE 
SET current_version = EXCLUDED.current_version,
    minimum_supported_version = EXCLUDED.minimum_supported_version,
    updated_at = NOW();

-- Insert starter jobs for tycoon career progression
INSERT INTO jobs (id, title, hourly_salary, required_level) VALUES
(1, 'Intern Financial Clerk', 25.00, 1),
(2, 'Junior Credit Analyst', 60.00, 2),
(3, 'Corporate Trader', 150.00, 4),
(4, 'Investment Portfolio Manager', 380.00, 7),
(5, 'Hedge Fund Managing Director', 950.00, 10)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    hourly_salary = EXCLUDED.hourly_salary,
    required_level = EXCLUDED.required_level;
