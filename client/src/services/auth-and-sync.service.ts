import { ApiClient } from './api.client';
import { SecureStorage } from './secure-storage.service';
import { AuthSuccessPayload, UserProfile } from '../types/user';
import { SyncResponseData } from '../types/sync';

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export class AuthService {
  private static tokenKey = 'wealth_race_session_token';

  public static getStoredToken(): string | null {
    return SecureStorage.getItemSync(this.tokenKey);
  }

  public static setStoredToken(token: string): void {
    SecureStorage.setItem(this.tokenKey, token);
  }

  public static clearStoredToken(): void {
    SecureStorage.removeItem(this.tokenKey);
  }

  public static async register(dto: RegisterDto): Promise<AuthSuccessPayload> {
    const result = await ApiClient.post<AuthSuccessPayload, RegisterDto>('/auth/register', dto);
    this.setStoredToken(result.token);
    return result;
  }

  public static async login(dto: LoginDto): Promise<AuthSuccessPayload> {
    const result = await ApiClient.post<AuthSuccessPayload, LoginDto>('/auth/login', dto);
    this.setStoredToken(result.token);
    return result;
  }

  public static async verifySession(token: string): Promise<UserProfile> {
    return ApiClient.get<UserProfile>('/auth/verify', token);
  }
}

export class SyncService {
  public static async syncState(token: string): Promise<SyncResponseData> {
    return ApiClient.post<SyncResponseData, {}>('/sync', {}, token);
  }
}
