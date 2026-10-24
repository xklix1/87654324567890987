export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  net_worth: number;
  liquid_cash: number;
  total_assets: number;
  level: number;
  title: string;
  created_at: string;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  total_players: number;
  page: number;
  limit: number;
}

export interface PlayerAssetBreakdown {
  stocks_value: number;
  real_estate_value: number;
  dealership_value: number;
  airport_value: number;
  factory_value: number;
  farm_value: number;
  logistics_value: number;
  crypto_value: number;
}

export interface PlayerProfile {
  user_id: string;
  username: string;
  title: string;
  level: number;
  xp: number;
  net_worth: number;
  liquid_cash: number;
  total_assets: number;
  created_at: string;
  asset_breakdown: PlayerAssetBreakdown;
  achievements_count: number;
}

export type ChatChannel = 'GLOBAL' | 'DIRECT';

export interface ChatMessageRecord {
  id: string;
  sender_id: string;
  sender_username: string;
  recipient_id: string | null;
  channel: ChatChannel;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface SendChatMessageInput {
  channel: ChatChannel;
  message: string;
  recipient_id?: string;
}
