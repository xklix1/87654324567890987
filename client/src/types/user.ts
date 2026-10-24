export interface UserProfile {
  id: string;
  username: string;
  balance: number;
  current_job_id: number | null;
  last_synced_at?: string;
  created_at: string;
}

export interface Job {
  id: number;
  title: string;
  hourly_salary: number;
  required_level: number;
  created_at: string;
}

export type JobRecord = Job;

export type TransactionType =
  | 'INITIAL_DEPOSIT'
  | 'OFFLINE_SALARY'
  | 'PEER_TRANSFER'
  | 'BUSINESS_INVESTMENT'
  | 'MARKET_TRADE';

export type TransactionStatus = 'COMPLETED' | 'REJECTED' | 'PENDING';

export interface Transaction {
  id: number;
  sender_id: string | null;
  receiver_id: string;
  amount: number;
  fee?: number;
  status?: TransactionStatus;
  type: TransactionType;
  created_at: string;
}

export interface AuthSuccessPayload {
  token: string;
  user: UserProfile;
}

export interface P2PTransferReceipt {
  transaction_id: number;
  sender_id: string;
  sender_username: string;
  receiver_id: string;
  receiver_username: string;
  amount: number;
  fee: number;
  total_deducted: number;
  sender_new_balance: number;
  daily_transferred_today: number;
  daily_cap_remaining: number;
  created_at: string;
}

export interface DailyTransferQuota {
  daily_limit: number;
  transferred_today: number;
  remaining_limit: number;
  fee_percentage: number;
}

export interface SearchUserItem {
  id: string;
  username: string;
  created_at: string;
}

export interface TransferRequestDto {
  receiver_id: string;
  amount: number;
  note?: string;
}
