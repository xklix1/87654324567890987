import { ApiStandardError } from '../types/common';
import { SecureStorage } from './secure-storage.service';
import { NetworkResilienceService } from './network-resilience.service';

export interface RequestOptions extends RequestInit {
  token?: string | null;
  idempotencyKey?: string | null;
  timeoutMs?: number;
}

export class ApiClient {
  private static baseUrl = '/api';

  public static setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  public static generateUuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'wr_idemp_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
  }

  public static async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    // 1. Prepare dynamic security and anti-replay headers
    const deviceId = SecureStorage.getOrCreateDeviceId();
    const calibratedTimestamp = NetworkResilienceService.getCalibratedServerTime();
    const nonce = this.generateUuid();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-device-id': deviceId,
      'x-request-timestamp': calibratedTimestamp.toString(),
      'x-request-nonce': nonce,
    };

    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    // Attach Idempotency Key for mutations
    const isMutation = options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase());
    if (options.idempotencyKey) {
      headers['x-idempotency-key'] = options.idempotencyKey;
    } else if (isMutation && (endpoint.includes('/transfer') || endpoint.includes('/buy') || endpoint.includes('/order') || endpoint.includes('/dispatch') || endpoint.includes('/plant') || endpoint.includes('/upgrade'))) {
      // Auto-attach idempotency key for financial mutation routes
      headers['x-idempotency-key'] = this.generateUuid();
    }

    // 2. Set dynamic timeout based on network latency
    const timeoutMs = options.timeoutMs ?? NetworkResilienceService.getDynamicTimeout();
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...headers,
          ...(options.headers as Record<string, string> | undefined),
        },
      });

      clearTimeout(timeoutHandle);

      // On successful HTTP response, ensure connection is marked alive
      if (NetworkResilienceService.getIsDisconnected()) {
        NetworkResilienceService.setDisconnected(false);
      }

      const data = await response.json().catch(() => null);

      // Auto-calibrate clock offset from server timestamp in response payload
      if (data && typeof data === 'object') {
        const payload = data as { server_timestamp?: number; data?: { server_timestamp?: number } };
        const serverTs = payload.server_timestamp || payload.data?.server_timestamp;
        if (serverTs && typeof serverTs === 'number') {
          NetworkResilienceService.setServerTimestamp(serverTs);
        }
      }

      if (!response.ok) {
        const errorData: ApiStandardError = {
          code: data?.error?.code ?? `HTTP_${response.status}`,
          message: data?.error?.message ?? `Request failed with HTTP status ${response.status}`,
          details: data?.error?.details,
        };
        throw errorData;
      }

      if (data && typeof data === 'object' && 'success' in data && data.success === true && 'data' in data) {
        return data.data as T;
      }

      return data as T;
    } catch (err: unknown) {
      clearTimeout(timeoutHandle);

      if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
        throw err as ApiStandardError;
      }

      const isAbort = (err as Error)?.name === 'AbortError';

      // Signal disconnection to network resilience manager
      NetworkResilienceService.setDisconnected(true);

      const standardError: ApiStandardError = {
        code: isAbort ? 'TIMEOUT_ERROR' : 'NETWORK_ERROR',
        message: isAbort
          ? `Request timed out after ${Math.round(timeoutMs / 1000)} seconds. Network latency may be elevated.`
          : err instanceof Error
            ? err.message
            : 'Unable to connect to the backend server.',
      };
      throw standardError;
    }
  }

  public static async get<T>(endpoint: string, token?: string | null): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', token });
  }

  public static async post<T, B>(
    endpoint: string,
    body: B,
    token?: string | null,
    idempotencyKey?: string | null
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      token,
      idempotencyKey,
    });
  }
}
