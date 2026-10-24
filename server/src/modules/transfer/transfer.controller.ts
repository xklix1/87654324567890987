import { Request, Response, NextFunction } from 'express';
import { TransferService } from './transfer.service';
import { TransferInput } from './transfer.schema';
import { ApiResponse, P2PTransferReceipt, DailyTransferQuota, SearchUserItem } from '../../types';
import { AppError } from '../../middleware/error.middleware';

export class TransferController {
  public static async transfer(
    req: Request<{}, {}, TransferInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required to execute financial transfer.', 401, 'UNAUTHORIZED');
      }

      const rawDeviceId = req.headers['x-device-id'];
      const deviceId = typeof rawDeviceId === 'string' ? rawDeviceId.trim() : undefined;
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';

      const receipt = await TransferService.executeTransfer(req.user.id, req.body, deviceId, clientIp);

      const response: ApiResponse<P2PTransferReceipt> = {
        success: true,
        data: receipt,
      };
      res.status(200).json(response);
    } catch (error: unknown) {
      next(error);
    }
  }

  public static async getQuota(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required to query transfer quota.', 401, 'UNAUTHORIZED');
      }

      const quota = await TransferService.getDailyQuota(req.user.id);

      const response: ApiResponse<DailyTransferQuota> = {
        success: true,
        data: quota,
      };
      res.status(200).json(response);
    } catch (error: unknown) {
      next(error);
    }
  }

  public static async getRecipients(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required to query recipients.', 401, 'UNAUTHORIZED');
      }

      const recipients = await TransferService.getAvailableRecipients(req.user.id);

      const response: ApiResponse<SearchUserItem[]> = {
        success: true,
        data: recipients,
      };
      res.status(200).json(response);
    } catch (error: unknown) {
      next(error);
    }
  }
}
