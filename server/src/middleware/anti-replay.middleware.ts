import { Request, Response, NextFunction } from 'express';
import { AntiReplayService } from '../modules/security/anti-replay.service';
import { AppError } from './error.middleware';

/**
 * Express middleware to enforce anti-replay timestamps and unique nonces
 * on financial requests and sensitive actions.
 * @param required When true, requests must include x-request-timestamp and x-request-nonce
 */
export function enforceAntiReplay(required: boolean = true) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const rawTimestamp = req.headers['x-request-timestamp'];
    const rawNonce = req.headers['x-request-nonce'];

    const timestampStr = typeof rawTimestamp === 'string' ? rawTimestamp.trim() : undefined;
    const nonce = typeof rawNonce === 'string' ? rawNonce.trim() : undefined;

    if (!timestampStr || !nonce) {
      if (required) {
        next(
          new AppError(
            'Anti-replay security headers missing. Requests must include calibrated x-request-timestamp and unique x-request-nonce.',
            400,
            'SECURITY_HEADERS_REQUIRED'
          )
        );
        return;
      }
      return next();
    }

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) {
      next(new AppError('Malformed x-request-timestamp header. Expected epoch timestamp in milliseconds.', 400, 'INVALID_TIMESTAMP'));
      return;
    }

    try {
      const result = await AntiReplayService.validateRequest(nonce, timestamp, req.user?.id);
      if (!result.valid) {
        next(new AppError(result.error || 'Replay security check failed.', 403, result.code || 'SECURITY_REPLAY_ERROR'));
        return;
      }

      next();
    } catch (err: unknown) {
      next(err);
    }
  };
}
