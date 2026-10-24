import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .optional()
    .transform((val: string | undefined): number => (val ? parseInt(val, 10) : 5000))
    .pipe(z.number().positive().default(5000)),
  HOST: z.string().default('0.0.0.0'),
  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters long')
    .default('wealth_race_super_secret_jwt_key_2026_prod'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  DATABASE_URL: z.string().optional().default('postgresql://postgres:postgres@localhost:5432/wealth_race'),
  DATABASE_SSL: z
    .string()
    .optional()
    .transform((val: string | undefined): boolean => val === 'true'),
  OFFLINE_PROGRESSION_MAX_HOURS: z
    .string()
    .optional()
    .transform((val: string | undefined): number => (val ? parseFloat(val) : 24))
    .pipe(z.number().positive().default(24)),
  STARTER_BALANCE: z
    .string()
    .optional()
    .transform((val: string | undefined): number => (val ? parseFloat(val) : 1000.0))
    .pipe(z.number().nonnegative().default(1000.0)),
  // Phase 2: Anti-Fraud and Concurrency Limits
  P2P_DAILY_TRANSFER_LIMIT: z
    .string()
    .optional()
    .transform((val: string | undefined): number => (val ? parseFloat(val) : 10000.0))
    .pipe(z.number().positive().default(10000.0)),
  P2P_TRANSACTION_FEE_PERCENT: z
    .string()
    .optional()
    .transform((val: string | undefined): number => (val ? parseFloat(val) : 2.5))
    .pipe(z.number().nonnegative().default(2.5)),
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .optional()
    .transform((val: string | undefined): number => (val ? parseInt(val, 10) : 15 * 60 * 1000))
    .pipe(z.number().positive().default(15 * 60 * 1000)),
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .optional()
    .transform((val: string | undefined): number => (val ? parseInt(val, 10) : 100))
    .pipe(z.number().positive().default(100)),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .optional()
    .transform((val: string | undefined): number => (val ? parseInt(val, 10) : 15))
    .pipe(z.number().positive().default(15)),
  TRANSFER_RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .optional()
    .transform((val: string | undefined): number => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().positive().default(20)),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const formattedErrors = parsedEnv.error.format();
  process.stderr.write(`FATAL: Environment configuration validation failed: ${JSON.stringify(formattedErrors, null, 2)}\n`);
  process.exit(1);
}

export const env = parsedEnv.data;
