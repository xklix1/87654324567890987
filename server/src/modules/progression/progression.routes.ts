import { Router } from 'express';
import { ProgressionController } from './progression.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { financialTransactionLimiter } from '../../middleware/rate-limit.middleware';

export const progressionRouter = Router();

progressionRouter.get('/achievements', authenticate, ProgressionController.getAchievements);
progressionRouter.post(
  '/achievements/claim',
  financialTransactionLimiter,
  authenticate,
  ProgressionController.claimAchievement
);
