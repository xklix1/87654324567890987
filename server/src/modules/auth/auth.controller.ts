import { Request, Response, NextFunction } from 'express';
import { AuthService, AuthSuccessResult } from './auth.service';
import { RegisterInput, LoginInput } from './auth.schema';
import { ApiResponse } from '../../types';
import { AppError } from '../../middleware/error.middleware';

export class AuthController {
  public static async register(
    req: Request<{}, {}, RegisterInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { username, email, password } = req.body;
      const rawDeviceId = req.headers['x-device-id'];
      const deviceId = typeof rawDeviceId === 'string' ? rawDeviceId.trim() : undefined;
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';

      const result: AuthSuccessResult = await AuthService.register(username, email, password, deviceId, clientIp);

      const response: ApiResponse<AuthSuccessResult> = {
        success: true,
        data: result,
      };
      res.status(201).json(response);
    } catch (error: unknown) {
      next(error);
    }
  }

  public static async login(
    req: Request<{}, {}, LoginInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { username, password } = req.body;
      const rawDeviceId = req.headers['x-device-id'];
      const deviceId = typeof rawDeviceId === 'string' ? rawDeviceId.trim() : undefined;
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';

      const result: AuthSuccessResult = await AuthService.login(username, password, deviceId, clientIp);

      const response: ApiResponse<AuthSuccessResult> = {
        success: true,
        data: result,
      };
      res.status(200).json(response);
    } catch (error: unknown) {
      next(error);
    }
  }

  public static async verifySession(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const user = await AuthService.getProfile(req.user.id);

      const response: ApiResponse<{
        id: string;
        username: string;
        balance: number;
        current_job_id: number | null;
        created_at: string;
      }> = {
        success: true,
        data: {
          id: user.id,
          username: user.username,
          balance: user.balance,
          current_job_id: user.current_job_id,
          created_at: user.created_at.toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (error: unknown) {
      next(error);
    }
  }
}
