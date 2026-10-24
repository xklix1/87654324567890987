import { ApiClient } from './api.client';
import { P2PTransferReceipt, DailyTransferQuota, SearchUserItem, TransferRequestDto } from '../types/user';

export class TransferService {
  public static async executeTransfer(
    dto: TransferRequestDto,
    token: string
  ): Promise<P2PTransferReceipt> {
    return ApiClient.post<P2PTransferReceipt, TransferRequestDto>(
      '/transactions/transfer',
      dto,
      token
    );
  }

  public static async getQuota(token: string): Promise<DailyTransferQuota> {
    return ApiClient.get<DailyTransferQuota>('/transactions/quota', token);
  }

  public static async getRecipients(token: string): Promise<SearchUserItem[]> {
    return ApiClient.get<SearchUserItem[]>('/transactions/recipients', token);
  }
}
