import { ApiClient } from './api.client';
import { HealthResponseData, VersionResponseData } from '../types/sync';

export class HealthService {
  public static async checkHealth(): Promise<HealthResponseData> {
    return ApiClient.get<HealthResponseData>('/health');
  }
}

export class VersionService {
  public static async getVersion(): Promise<VersionResponseData> {
    return ApiClient.get<VersionResponseData>('/version');
  }
}
