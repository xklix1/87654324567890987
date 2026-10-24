import { Request, Response, NextFunction } from 'express';
import { IdempotencyService } from '../modules/idempotency/idempotency.service';
import { AppError } from './error.middleware';

/**
 * Express middleware to handle idempotency keys on financial & state mutations
 * @param required Whether x-idempotency-key is strictly required for this route
 */
export function enforceIdempotency(required: boolean = true) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const rawKey = req.headers['x-idempotency-key'];
    const idempotencyKey =
      typeof rawKey === 'string'
        ? rawKey.trim()
        : Array.isArray(rawKey) && typeof rawKey[0] === 'string'
          ? rawKey[0].trim()
          : undefined;

    if (!idempotencyKey) {
      if (required) {
        next(
          new AppError(
            'Missing required idempotency key (x-idempotency-key header). Financial and asset operations require a unique client UUID.',
            400,
            'IDEMPOTENCY_KEY_REQUIRED'
          )
        );
        return;
      }
      return next();
    }

    // Require authenticated user for idempotency scoping
    const userId = req.user?.id || 'anonymous';
    const endpoint = req.originalUrl || req.url;

    try {
      const lockResult = await IdempotencyService.lockKey(idempotencyKey, userId, endpoint);

      if (lockResult.state === 'COMPLETED' && lockResult.record) {
        res.setHeader('X-Cache-Idempotent', 'HIT');
        res.setHeader('X-Idempotency-Key', idempotencyKey);
        res.status(lockResult.record.response_status).json(lockResult.record.response_body);
        return;
      }

      if (lockResult.state === 'PROCESSING') {
        res.setHeader('X-Cache-Idempotent', 'PROCESSING');
        next(
          new AppError(
            'An identical financial transaction is currently processing. Please wait for confirmation.',
            409,
            'OPERATION_IN_PROGRESS',
            { key: idempotencyKey }
          )
        );
        return;
      }

      // Intercept res.json to capture response payload and complete the idempotency record
      const originalJson = res.json.bind(res);
      res.json = (body: unknown): Response => {
        const statusCode = res.statusCode || 200;

        // Persist only successful or accepted responses (2xx) as permanent idempotency records
        if (statusCode >= 200 && statusCode < 300) {
          IdempotencyService.completeKey(idempotencyKey, userId, endpoint, statusCode, body).catch((err: unknown) => {
            process.stderr.write(`[Idempotency] Error saving key ${idempotencyKey}: ${String(err)}\n`);
          });
        } else {
          IdempotencyService.releaseKey(idempotencyKey);
        }

        res.setHeader('X-Cache-Idempotent', 'MISS');
        res.setHeader('X-Idempotency-Key', idempotencyKey);
        return originalJson(body);
      };

      next();
    } catch (err: unknown) {
      IdempotencyService.releaseKey(idempotencyKey);
      next(err);
    }
  };
}
