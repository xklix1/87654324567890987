export interface AchievementCatalogItem {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  requirement_type: string;
  requirement_target: number;
  cash_reward: number;
  xp_reward: number;
  created_at: string;
}

export interface UserAchievementItem extends AchievementCatalogItem {
  progress: number;
  unlocked: boolean;
  unlocked_at: string | null;
  claimed: boolean;
  claimed_at: string | null;
}

export interface ClaimAchievementResult {
  code: string;
  cash_reward: number;
  xp_reward: number;
  new_balance: number;
  new_xp: number;
  new_level: number;
  new_title: string;
}

export interface ProgressionSummary {
  user_id: string;
  level: number;
  xp: number;
  prestige_title: string;
  unlocked_achievements_count: number;
  total_achievements_count: number;
}
