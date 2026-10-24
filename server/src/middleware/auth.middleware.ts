import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { DatabaseStore } from '../db/store';
import { AppError } from './error.middleware';
import { AuthenticatedUser, JwtTokenPayload } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError('Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED'));
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    next(new AppError('Invalid token format.', 401, 'UNAUTHORIZED'));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtTokenPayload;
    if (!decoded || !decoded.userId || !decoded.username) {
      next(new AppError('Malformed authentication payload.', 401, 'INVALID_TOKEN'));
      return;
    }

    // Single Active Session & Security Verification
    const userRecord = await DatabaseStore.findUserById(decoded.userId);
    if (!userRecord) {
      next(new AppError('Authenticated account record no longer exists.', 401, 'USER_NOT_FOUND'));
      return;
    }

    if (userRecord.is_suspended) {
      next(
        new AppError(
          `Account access blocked. Status: SUSPENDED (${userRecord.suspension_reason || 'Pending security audit'}).`,
          403,
          'ACCOUNT_SUSPENDED'
        )
      );
      return;
    }

    // Forceful session revocation if user logged in from another device
    if (
      userRecord.active_session_id &&
      decoded.sessionId &&
      userRecord.active_session_id !== decoded.sessionId
    ) {
      next(
        new AppError(
          'Active session superseded: Your account was logged in from another device or new session.',
          401,
          'SESSION_REVOKED'
        )
      );
      return;
    }

    req.user = {
      id: decoded.userId,
      username: decoded.username,
      sessionId: decoded.sessionId,
      deviceId: userRecord.last_device_id || undefined,
    };
    next();
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Session token has expired. Please log in again.', 401, 'TOKEN_EXPIRED'));
      return;
    }
    next(new AppError('Invalid or corrupted session token.', 401, 'INVALID_TOKEN'));
  }
}

