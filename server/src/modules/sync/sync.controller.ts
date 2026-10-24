import { Request, Response, NextFunction } from 'express';
import { SyncService } from './sync.service';
import { ApiResponse, SyncResponseData } from '../../types';
import { AppError } from '../../middleware/error.middleware';

export class SyncController {
  public static async syncState(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required for state synchronization.', 401, 'UNAUTHORIZED');
      }

      const syncData: SyncResponseData = await SyncService.executeSync(req.user.id);

      const response: ApiResponse<SyncResponseData> = {
        success: true,
        data: syncData,
      };
      res.status(200).json(response);
    } catch (error: unknown) {
      next(error);
    }
  }
}
