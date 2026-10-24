import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env';
import { DatabaseStore } from '../../db/store';
import { DeviceGuardService } from '../security/device-guard.service';
import { SocketServer } from '../../socket/socket.server';
import { AppError } from '../../middleware/error.middleware';
import { UserRecord, JwtTokenPayload } from '../../types';

export interface AuthSuccessResult {
  token: string;
  user: {
    id: string;
    username: string;
    balance: number;
    current_job_id: number | null;
    created_at: string;
  };
}

export class AuthService {
  public static async register(
    username: string,
    email: string,
    password: string,
    deviceId?: string,
    ipAddress?: string
  ): Promise<AuthSuccessResult> {
    // 1. Enforce anti-multi-accounting device limit
    if (deviceId) {
      await DeviceGuardService.assertCanRegisterDevice(deviceId);
    }

    const existingUser = await DatabaseStore.findUserByUsername(username);
    if (existingUser) {
      throw new AppError('اسم المستخدم هذا مسجل بحساب آخر بالفعل.', 409, 'USER_ALREADY_EXISTS');
    }

    if (email) {
      const existingEmail = await DatabaseStore.findUserByEmail(email);
      if (existingEmail) {
        throw new AppError('هذا البريد الإلكتروني مسجل بحساب آخر بالفعل.', 409, 'EMAIL_ALREADY_EXISTS');
      }
    }

    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Initial starter role: Intern Financial Clerk (job_id: 1)
    const initialJobId = 1;
    const initialBalance = env.STARTER_BALANCE;
    const activeSessionId = crypto.randomUUID();

    const createdUser = await DatabaseStore.createUser({
      username,
      email: email ? email.trim().toLowerCase() : null,
      password_hash,
      initialBalance,
      initialJobId,
      activeSessionId,
      registeredDeviceId: deviceId || null,
      lastDeviceId: deviceId || null,
      lastIpAddress: ipAddress || null,
    });

    if (deviceId) {
      await DeviceGuardService.recordDeviceEvent(deviceId, createdUser.id, ipAddress || '127.0.0.1');
    }

    // Record initial deposit transaction
    await DatabaseStore.createTransaction(
      null,
      createdUser.id,
      initialBalance,
      'INITIAL_DEPOSIT'
    );

    const token = this.generateToken(createdUser, activeSessionId);

    return {
      token,
      user: {
        id: createdUser.id,
        username: createdUser.username,
        balance: createdUser.balance,
        current_job_id: createdUser.current_job_id,
        created_at: createdUser.created_at.toISOString(),
      },
    };
  }

  public static async login(
    username: string,
    password: string,
    deviceId?: string,
    ipAddress?: string
  ): Promise<AuthSuccessResult> {
    const user = await DatabaseStore.findUserByUsername(username);
    if (!user) {
      throw new AppError('Invalid username or password credentials.', 401, 'INVALID_CREDENTIALS');
    }

    if (user.is_suspended) {
      throw new AppError(
        `Account access blocked. Status: SUSPENDED (${user.suspension_reason || 'Pending security audit'}).`,
        403,
        'ACCOUNT_SUSPENDED'
      );
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError('Invalid username or password credentials.', 401, 'INVALID_CREDENTIALS');
    }

    // Generate fresh single active session ID
    const activeSessionId = crypto.randomUUID();

    // Invalidate any older socket sessions across other devices
    SocketServer.invalidateUserSessions(user.id, activeSessionId);

    // Update session and hardware fingerprint in database
    await DatabaseStore.updateUserSession(user.id, activeSessionId, deviceId, ipAddress);

    if (deviceId) {
      await DeviceGuardService.recordDeviceEvent(deviceId, user.id, ipAddress || '127.0.0.1');
    }

    const token = this.generateToken(user, activeSessionId);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        balance: user.balance,
        current_job_id: user.current_job_id,
        created_at: user.created_at.toISOString(),
      },
    };
  }

  public static async getProfile(userId: string): Promise<UserRecord> {
    const user = await DatabaseStore.findUserById(userId);
    if (!user) {
      throw new AppError('User profile not found.', 404, 'USER_NOT_FOUND');
    }
    return user;
  }

  private static generateToken(user: UserRecord, sessionId?: string): string {
    const payload: JwtTokenPayload = {
      userId: user.id,
      username: user.username,
      sessionId: sessionId || user.active_session_id || undefined,
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: '7d',
    });
  }
}

