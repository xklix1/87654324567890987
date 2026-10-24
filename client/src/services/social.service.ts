import { ApiClient } from './api.client';
import {
  LeaderboardResponse,
  PlayerProfile,
  ChatMessageRecord,
  SendChatMessageInput,
} from '../types/social';

export class SocialService {
  public static async getLeaderboard(
    token: string,
    page: number = 1,
    limit: number = 50
  ): Promise<LeaderboardResponse> {
    return ApiClient.get<LeaderboardResponse>(
      `/social/leaderboard?page=${page}&limit=${limit}`,
      token
    );
  }

  public static async getPlayerProfile(token: string, userId: string): Promise<PlayerProfile> {
    return ApiClient.get<PlayerProfile>(`/social/profile/${userId}`, token);
  }

  public static async getGlobalChat(
    token: string,
    limit: number = 50,
    before?: string
  ): Promise<ChatMessageRecord[]> {
    const url = before
      ? `/social/chat/global?limit=${limit}&before=${encodeURIComponent(before)}`
      : `/social/chat/global?limit=${limit}`;
    return ApiClient.get<ChatMessageRecord[]>(url, token);
  }

  public static async getDirectChat(
    token: string,
    otherUserId: string,
    limit: number = 50,
    before?: string
  ): Promise<ChatMessageRecord[]> {
    const url = before
      ? `/social/chat/direct/${otherUserId}?limit=${limit}&before=${encodeURIComponent(before)}`
      : `/social/chat/direct/${otherUserId}?limit=${limit}`;
    return ApiClient.get<ChatMessageRecord[]>(url, token);
  }

  public static async sendChatMessage(
    token: string,
    input: SendChatMessageInput
  ): Promise<ChatMessageRecord> {
    return ApiClient.post<ChatMessageRecord, SendChatMessageInput>(
      '/social/chat/send',
      input,
      token
    );
  }
}
