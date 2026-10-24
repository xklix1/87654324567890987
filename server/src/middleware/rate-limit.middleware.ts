import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '../config/env';
import { ApiResponseError } from '../types';

function createRateLimitHandler(message: string) {
  return (_req: Request, res: Response): void => {
    const errorResponse: ApiResponseError = {
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message,
      },
    };
    res.status(429).json(errorResponse);
  };
}

export const generalApiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many requests submitted to the game API. Please retry shortly.'),
});

export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many authentication attempts detected. Brute-force protection activated. Please retry in 15 minutes.'),
});

export const financialTransactionLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.TRANSFER_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createRateLimitHandler('Financial transaction rate limit exceeded. Automated flooding protection activated. Please retry in 15 minutes.'),
});
