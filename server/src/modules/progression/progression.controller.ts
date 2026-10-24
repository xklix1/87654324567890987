import { Request, Response, NextFunction } from 'express';
import { AchievementService } from './achievement.service';
import { AppError } from '../../middleware/error.middleware';
import { ApiResponse } from '../../types';
import { claimAchievementSchema } from './progression.schema';

export class ProgressionController {
  // Get all achievements for authenticated user with real-time progression
  public static async getAchievements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const achievements = await AchievementService.getUserAchievements(req.user.id);
      const response: ApiResponse<typeof achievements> = { success: true, data: achievements };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  // Claim achievement reward (cash prize + XP)
  public static async claimAchievement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const parsed = claimAchievementSchema.parse(req.body);
      const result = await AchievementService.claimAchievement(req.user.id, parsed.code);
      const response: ApiResponse<typeof result> = { success: true, data: result };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }
}
