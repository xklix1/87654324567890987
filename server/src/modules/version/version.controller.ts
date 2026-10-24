import { Request, Response, NextFunction } from 'express';
import { VersionService } from './version.service';
import { ApiResponse } from '../../types';

interface VersionResponseData {
  current_version: string;
  minimum_supported_version: string;
  server_timestamp: string;
}

export class VersionController {
  public static async getVersion(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const versionRecord = await VersionService.getVersionInfo();
      const response: ApiResponse<VersionResponseData> = {
        success: true,
        data: {
          current_version: versionRecord.current_version,
          minimum_supported_version: versionRecord.minimum_supported_version,
          server_timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (error: unknown) {
      next(error);
    }
  }
}
