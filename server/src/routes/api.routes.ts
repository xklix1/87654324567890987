import { Router, Request, Response, NextFunction } from 'express';
import { VersionController } from '../modules/version/version.controller';
import { AuthController } from '../modules/auth/auth.controller';
import { SyncController } from '../modules/sync/sync.controller';
import { TransferController } from '../modules/transfer/transfer.controller';
import { registerSchema, loginSchema } from '../modules/auth/auth.schema';
import { transferInputSchema } from '../modules/transfer/transfer.schema';
import { validateBody } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter, financialTransactionLimiter } from '../middleware/rate-limit.middleware';
import { getIsPostgresAvailable } from '../db/pool';
import { DatabaseStore } from '../db/store';
import { ApiResponse, JobRecord } from '../types';
import { FeatureFlagsService } from '../modules/security/feature-flags.service';
import { checkGlobalMaintenance } from '../middleware/feature-flags.middleware';
import { enforceIdempotency } from '../middleware/idempotency.middleware';
import { enforceAntiReplay } from '../middleware/anti-replay.middleware';

import { sectorsRouter, economyRouter } from '../modules/sectors/sectors.routes';
import { socialRouter } from '../modules/social/social.routes';
import { progressionRouter } from '../modules/progression/progression.routes';

export const apiRouter = Router();

// Global Maintenance Mode Guard
apiRouter.use(checkGlobalMaintenance);

// Global Anti-Replay Guard (validates timestamp skew & nonce uniqueness if headers provided)
apiRouter.use(enforceAntiReplay(false));

// 1. Network Health Check endpoint (with high-precision server timestamp for clock calibration)
apiRouter.get('/health', (_req: Request, res: Response) => {
  const isPg = getIsPostgresAvailable();
  const now = Date.now();
  res.status(200).json({
    status: 'UP',
    database_mode: isPg ? 'POSTGRESQL' : 'TRANSACTIONAL_MEMORY_FALLBACK',
    timestamp: new Date(now).toISOString(),
    server_time: new Date(now).toISOString(),
    server_timestamp: now,
  });
});

// 2. Version Gatekeeping endpoint
apiRouter.get('/version', VersionController.getVersion);

// 2b. System Feature Flags & Sector Kill-Switches
apiRouter.get('/system/flags', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const flags = await FeatureFlagsService.getAllFlags();
    res.status(200).json({ success: true, data: flags });
  } catch (err: unknown) {
    next(err);
  }
});

const updateFlagHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { flagKey } = req.params;
    if (!flagKey) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_FLAG_KEY', message: 'Feature flag key parameter is required.' },
      });
      return;
    }
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_FLAG_VALUE', message: 'Field enabled must be a boolean.' },
      });
      return;
    }
    await FeatureFlagsService.setFlag(flagKey, enabled);
    res.status(200).json({ success: true, data: { flag: flagKey, enabled } });
  } catch (err: unknown) {
    next(err);
  }
};

apiRouter.post('/system/flags/:flagKey', updateFlagHandler);
apiRouter.put('/system/flags/:flagKey', updateFlagHandler);

// 3. Authentication endpoints (with brute-force protection rate limiting & device binding)
apiRouter.post('/auth/register', authLimiter, validateBody(registerSchema), AuthController.register);
apiRouter.post('/auth/login', authLimiter, validateBody(loginSchema), AuthController.login);
apiRouter.get('/auth/verify', authenticate, AuthController.verifySession);

// 4. State Synchronization endpoint (offline progression & authoritative clock sync)
apiRouter.post('/sync', authenticate, SyncController.syncState);
apiRouter.get('/sync', authenticate, SyncController.syncState);

// 5. Phase 2: Anti-Fraud P2P Financial Transfers with Idempotency, Anti-Replay & Row Locking
apiRouter.post(
  '/transactions/transfer',
  financialTransactionLimiter,
  authenticate,
  enforceAntiReplay(false),
  enforceIdempotency(false),
  validateBody(transferInputSchema),
  TransferController.transfer
);
apiRouter.get('/transactions/quota', authenticate, TransferController.getQuota);
apiRouter.get('/transactions/recipients', authenticate, TransferController.getRecipients);


// 6. Phase 3: Server-Authoritative Business Sectors & Economic Engine
apiRouter.use('/sectors', sectorsRouter);
apiRouter.use('/economy', economyRouter);

// 7. Phase 4: Social Economy, Real-Time Messaging & Progression
apiRouter.use('/social', socialRouter);
apiRouter.use('/progression', progressionRouter);

// 8. Jobs / Economy metadata endpoint
apiRouter.get('/jobs', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const jobs: JobRecord[] = await DatabaseStore.listJobs();
    const response: ApiResponse<JobRecord[]> = {
      success: true,
      data: jobs,
    };
    res.status(200).json(response);
  } catch (error: unknown) {
    next(error);
  }
});

