import { ApiClient } from './api.client';
import {
  UserAchievementItem,
  ClaimAchievementResult,
  ProgressionSummary,
} from '../types/progression';

export class ProgressionService {
  public static async getAchievements(token: string): Promise<UserAchievementItem[]> {
    return ApiClient.get<UserAchievementItem[]>('/progression/achievements', token);
  }

  public static async claimAchievement(
    token: string,
    code: string
  ): Promise<ClaimAchievementResult> {
    return ApiClient.post<ClaimAchievementResult, { code: string }>(
      '/progression/achievements/claim',
      { code },
      token
    );
  }

  public static async getProgressionSummary(token: string): Promise<ProgressionSummary> {
    return ApiClient.get<ProgressionSummary>('/progression/summary', token);
  }
}
