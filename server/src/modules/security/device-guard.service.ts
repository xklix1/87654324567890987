import { pool, getIsPostgresAvailable } from '../../db/pool';
import { AppError } from '../../middleware/error.middleware';

export class DeviceGuardService {
  private static memDeviceRegistrations = new Map<string, Set<string>>(); // deviceId -> Set of userIds
  private static memUserDevices = new Map<string, { deviceId: string; ipAddress: string }>(); // userId -> device info
  private static MAX_ACCOUNTS_PER_DEVICE = 3;

  /**
   * Verify whether a device is allowed to register a new account.
   */
  public static async assertCanRegisterDevice(deviceId: string): Promise<void> {
    let count = 0;

    if (getIsPostgresAvailable()) {
      try {
        const queryRes = await pool.query<{ count: string }>(
          'SELECT COUNT(DISTINCT user_id) as count FROM device_registrations WHERE device_id = $1',
          [deviceId]
        );
        if (queryRes.rows.length > 0 && queryRes.rows[0]) {
          count = parseInt(queryRes.rows[0].count, 10);
        }
      } catch (err: unknown) {
        // Fallback to in-memory count
      }
    }

    if (count === 0) {
      const set = this.memDeviceRegistrations.get(deviceId);
      count = set ? set.size : 0;
    }

    if (count >= this.MAX_ACCOUNTS_PER_DEVICE) {
      throw new AppError(
        `Hardware device account limit reached. A maximum of ${this.MAX_ACCOUNTS_PER_DEVICE} accounts may be registered per device.`,
        403,
        'DEVICE_LIMIT_EXCEEDED',
        { device_id: deviceId, registered_accounts: count }
      );
    }
  }

  /**
   * Record registration or login event for a device
   */
  public static async recordDeviceEvent(
    deviceId: string,
    userId: string,
    ipAddress: string
  ): Promise<void> {
    // 1. In-memory record
    let userSet = this.memDeviceRegistrations.get(deviceId);
    if (!userSet) {
      userSet = new Set<string>();
      this.memDeviceRegistrations.set(deviceId, userSet);
    }
    userSet.add(userId);
    this.memUserDevices.set(userId, { deviceId, ipAddress });

    // 2. PostgreSQL record
    if (getIsPostgresAvailable()) {
      try {
        await pool.query(
          `INSERT INTO device_registrations (device_id, user_id, ip_address, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [deviceId, userId, ipAddress]
        );

        await pool.query(
          `UPDATE users 
           SET last_device_id = $1, last_ip_address = $2 
           WHERE id = $3`,
          [deviceId, ipAddress, userId]
        );
      } catch (err: unknown) {
        process.stderr.write(`[DeviceGuard] Error recording device event in Postgres: ${String(err)}\n`);
      }
    }
  }

  /**
   * Check for collusion between two accounts in peer transfers
   */
  public static async assertNoCollusion(
    senderId: string,
    receiverId: string,
    senderDeviceId?: string,
    senderIp?: string
  ): Promise<void> {
    let receiverDeviceId: string | undefined;
    let receiverIp: string | undefined;

    // 1. Fetch receiver device details
    if (getIsPostgresAvailable()) {
      try {
        const queryRes = await pool.query<{
          registered_device_id: string | null;
          last_device_id: string | null;
          last_ip_address: string | null;
        }>(
          'SELECT registered_device_id, last_device_id, last_ip_address FROM users WHERE id = $1 LIMIT 1',
          [receiverId]
        );

        if (queryRes.rows.length > 0 && queryRes.rows[0]) {
          receiverDeviceId = queryRes.rows[0].last_device_id || queryRes.rows[0].registered_device_id || undefined;
          receiverIp = queryRes.rows[0].last_ip_address || undefined;
        }
      } catch {
        // Fallback
      }
    }

    if (!receiverDeviceId || !receiverIp) {
      const memInfo = this.memUserDevices.get(receiverId);
      if (memInfo) {
        receiverDeviceId = receiverDeviceId || memInfo.deviceId;
        receiverIp = receiverIp || memInfo.ipAddress;
      }
    }

    // Sender details fallback if not passed
    if (!senderDeviceId || !senderIp) {
      const sInfo = this.memUserDevices.get(senderId);
      if (sInfo) {
        senderDeviceId = senderDeviceId || sInfo.deviceId;
        senderIp = senderIp || sInfo.ipAddress;
      }
    }

    // 2. Device ID collusion check
    if (senderDeviceId && receiverDeviceId && senderDeviceId === receiverDeviceId) {
      throw new AppError(
        'P2P transfer blocked: Sender and receiver accounts are linked to the same physical hardware device.',
        403,
        'COLLUSION_DETECTED',
        { reason: 'SHARED_DEVICE', device_id: senderDeviceId }
      );
    }

    // 3. IP collusion check (skip internal localhost in development)
    const isLocalSender = senderIp === '127.0.0.1' || senderIp === '::1' || senderIp === 'localhost';
    if (senderIp && receiverIp && !isLocalSender && senderIp === receiverIp) {
      throw new AppError(
        'P2P transfer blocked: Sender and receiver accounts are originating from the identical network IP address.',
        403,
        'COLLUSION_DETECTED',
        { reason: 'SHARED_IP', ip_address: senderIp }
      );
    }
  }
}
