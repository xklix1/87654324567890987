import { Request, Response, NextFunction } from 'express';
import { FeatureFlagsService } from '../modules/security/feature-flags.service';
import { AppError } from './error.middleware';

/**
 * Middleware enforcing sector kill-switches / feature flags
 */
export function requireFeatureFlag(flagKey: string) {
  return async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Check Global Maintenance Mode first
      const isGlobalMaintenance = await FeatureFlagsService.isEnabledAsync('GLOBAL_MAINTENANCE_MODE');
      if (isGlobalMaintenance) {
        next(
          new AppError(
            'The entire Wealth Race platform is currently undergoing scheduled emergency maintenance. Please check back shortly.',
            503,
            'GLOBAL_MAINTENANCE_MODE'
          )
        );
        return;
      }

      // 2. Check sector-specific kill-switch
      const isEnabled = await FeatureFlagsService.isEnabledAsync(flagKey);
      if (!isEnabled) {
        next(
          new AppError(
            `This economic sector or operation (${flagKey}) is temporarily suspended for scheduled maintenance or market rebalancing.`,
            503,
            'SECTOR_MAINTENANCE',
            { flag: flagKey }
          )
        );
        return;
      }

      next();
    } catch (err: unknown) {
      next(err);
    }
  };
}

/**
 * Global maintenance check middleware
 */
export async function checkGlobalMaintenance(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  // Allow health check, version, and admin flag inspection during maintenance
  if (
    req.path === '/health' ||
    req.path === '/version' ||
    req.path.startsWith('/system/flags')
  ) {
    return next();
  }

  const isGlobalMaintenance = await FeatureFlagsService.isEnabledAsync('GLOBAL_MAINTENANCE_MODE');
  if (isGlobalMaintenance) {
    next(
      new AppError(
        'The entire Wealth Race platform is currently undergoing scheduled emergency maintenance. Please check back shortly.',
        503,
        'GLOBAL_MAINTENANCE_MODE'
      )
    );
    return;
  }

  next();
}
