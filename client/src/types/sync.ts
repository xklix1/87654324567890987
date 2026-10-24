import { UserProfile, Job, Transaction } from './user';

export interface OfflineProgressionAccrual {
  elapsed_seconds: number;
  elapsed_hours: number;
  capped_hours: number;
  accrued_amount: number;
  hourly_rate: number;
  job_title: string | null;
}

export interface SyncResponseData {
  user: UserProfile;
  job: Job | null;
  offline_progression: OfflineProgressionAccrual;
  recent_transactions: Transaction[];
  server_time: string;
}

export interface VersionResponseData {
  current_version: string;
  minimum_supported_version: string;
  server_timestamp: string;
}

export interface HealthResponseData {
  status: 'UP' | 'DOWN';
  database_mode: string;
  timestamp: string;
}
