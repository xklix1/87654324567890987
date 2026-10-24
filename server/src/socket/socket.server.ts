import { Server as HttpServer } from 'http';
import { Server as SocketIoServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { sanitizeChatMessage } from '../utils/sanitize';
import { ChatStore } from '../db/chat.store';
import { DatabaseStore } from '../db/store';
import { LeaderboardService } from '../modules/social/leaderboard.service';
import { TelemetryBatcher } from './telemetry-batcher';
import {
  AuthenticatedUser,
  JwtTokenPayload,
  ChatMessageRecord,
  ChatChannel,
  SendChatMessageInput,
} from '../types';

interface AuthenticatedSocket extends Socket {
  data: {
    user: AuthenticatedUser;
  };
}

export class SocketServer {
  private static io: SocketIoServer | null = null;
  // Maps userId -> Set of active socket IDs
  private static userSockets = new Map<string, Set<string>>();

  public static initialize(httpServer: HttpServer): SocketIoServer {
    if (this.io) {
      return this.io;
    }

    this.io = new SocketIoServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      pingTimeout: 30000,
      pingInterval: 10000,
    });

    // Start background telemetry batching loop (1.5s interval)
    TelemetryBatcher.start();

    // 1. Socket.io JWT Authentication Middleware with Single Active Session Verification
    this.io.use(async (socket, next) => {
      try {
        const authPayload = socket.handshake.auth as { token?: unknown };
        let rawToken: string | undefined =
          typeof authPayload.token === 'string' ? authPayload.token : undefined;

        if (!rawToken) {
          const authHeader = socket.handshake.headers.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            rawToken = authHeader.substring(7).trim();
          }
        }

        if (!rawToken) {
          return next(new Error('Authentication failed: Missing session token.'));
        }

        const decoded = jwt.verify(rawToken, env.JWT_SECRET) as JwtTokenPayload;
        if (!decoded || !decoded.userId || !decoded.username) {
          return next(new Error('Authentication failed: Invalid token payload.'));
        }

        // Verify active session & account status against database
        const userRecord = await DatabaseStore.findUserById(decoded.userId);
        if (userRecord?.is_suspended) {
          return next(new Error('Authentication failed: Tycoon account is suspended pending security audit.'));
        }

        if (
          userRecord?.active_session_id &&
          decoded.sessionId &&
          userRecord.active_session_id !== decoded.sessionId
        ) {
          return next(new Error('Authentication failed: Session superseded by a newer login.'));
        }

        (socket as AuthenticatedSocket).data = {
          user: {
            id: decoded.userId,
            username: decoded.username,
            sessionId: decoded.sessionId,
          },
        };

        next();
      } catch (err: unknown) {
        return next(new Error('Authentication failed: Token expired or signature invalid.'));
      }
    });

    // 2. Connection and Event Routing Handlers
    this.io.on('connection', (rawSocket: Socket) => {
      const socket = rawSocket as AuthenticatedSocket;
      const user = socket.data.user;

      // Register socket in active user map
      let socketsSet = this.userSockets.get(user.id);
      if (!socketsSet) {
        socketsSet = new Set<string>();
        this.userSockets.set(user.id, socketsSet);
      }
      socketsSet.add(socket.id);

      // Join global broadcast channel, personal channel, and telemetry room
      socket.join('room:global');
      socket.join(`room:user:${user.id}`);
      socket.join('room:telemetry');

      process.stdout.write(
        `[Socket] User connected: ${user.username} (${user.id}) on socket ${socket.id}. Active sockets for user: ${socketsSet.size}\n`
      );

      // Emit connected confirmation with server timestamp
      socket.emit('connection:ready', {
        user: { id: user.id, username: user.username },
        server_time: new Date().toISOString(),
        server_timestamp: Date.now(),
      });

      // 2a. Real-time Heartbeat / Ping-Pong latency measurement
      socket.on(
        'system:ping',
        (
          payload: { client_time: number },
          callback?: (ack: { client_time: number; server_time: number }) => void
        ) => {
          const serverNow = Date.now();
          const response = {
            client_time: payload?.client_time || serverNow,
            server_time: serverNow,
          };
          if (typeof callback === 'function') {
            callback(response);
          } else {
            socket.emit('system:pong', response);
          }
        }
      );

      // 2b. APK Background Lifecycle Telemetry Pause / Resume
      socket.on('telemetry:pause', () => {
        socket.leave('room:telemetry');
        process.stdout.write(`[Socket] High-frequency telemetry paused for ${user.username}\n`);
      });

      socket.on('telemetry:resume', () => {
        socket.join('room:telemetry');
        process.stdout.write(`[Socket] High-frequency telemetry resumed for ${user.username}\n`);
      });


      // 3. Global & Direct Chat Messaging Handler
      socket.on('chat:send', async (payload: SendChatMessageInput, callback?: (ack: { success: boolean; error?: string; message?: ChatMessageRecord }) => void) => {
        try {
          if (!payload || !payload.channel) {
            throw new Error('Invalid chat payload. Channel is required.');
          }

          // Strict XSS and Zero-Emoji input sanitization
          const cleanContent = sanitizeChatMessage(payload.content);
          const channel: ChatChannel = payload.channel;

          let receiverUsername: string | null = null;
          if (channel === 'DIRECT') {
            if (!payload.receiver_id) {
              throw new Error('Direct messages require a valid recipient ID.');
            }
            if (payload.receiver_id === user.id) {
              throw new Error('Cannot send direct messages to yourself.');
            }

            const receiver = await DatabaseStore.findUserById(payload.receiver_id);
            if (!receiver) {
              throw new Error('Recipient user account does not exist.');
            }
            receiverUsername = receiver.username;
          }

          const savedMessage = await ChatStore.saveMessage({
            channel,
            senderId: user.id,
            senderUsername: user.username,
            receiverId: payload.receiver_id ?? null,
            receiverUsername,
            content: cleanContent,
          });

          if (channel === 'GLOBAL') {
            SocketServer.io?.to('room:global').emit('chat:message', savedMessage);
          } else if (channel === 'DIRECT' && payload.receiver_id) {
            SocketServer.io?.to(`room:user:${user.id}`).emit('chat:message', savedMessage);
            SocketServer.io?.to(`room:user:${payload.receiver_id}`).emit('chat:message', savedMessage);

            // Emit direct notification to receiver
            SocketServer.io?.to(`room:user:${payload.receiver_id}`).emit('notification:direct_message', {
              from_id: user.id,
              from_username: user.username,
              preview: cleanContent.substring(0, 60),
              created_at: savedMessage.created_at,
            });
          }

          if (typeof callback === 'function') {
            callback({ success: true, message: savedMessage });
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          socket.emit('chat:error', { message: errMsg });
          if (typeof callback === 'function') {
            callback({ success: false, error: errMsg });
          }
        }
      });

      // 4. Chat History Retrieval
      socket.on('chat:history', async (params: { channel: ChatChannel; receiver_id?: string }, callback?: (messages: ChatMessageRecord[]) => void) => {
        try {
          let messages: ChatMessageRecord[] = [];
          if (params.channel === 'GLOBAL') {
            messages = await ChatStore.getGlobalMessages(50);
          } else if (params.channel === 'DIRECT' && params.receiver_id) {
            messages = await ChatStore.getDirectMessages(user.id, params.receiver_id, 50);
          }

          if (typeof callback === 'function') {
            callback(messages);
          } else {
            socket.emit('chat:history:response', { channel: params.channel, messages });
          }
        } catch (err: unknown) {
          socket.emit('chat:error', { message: 'Failed to retrieve message history.' });
        }
      });

      // 5. Live Rich List Leaderboard Broadcast
      socket.on('leaderboard:get', async (callback?: (entries: unknown) => void) => {
        try {
          const leaderboard = await LeaderboardService.getLeaderboard(25);
          if (typeof callback === 'function') {
            callback(leaderboard);
          } else {
            socket.emit('leaderboard:update', leaderboard);
          }
        } catch (err: unknown) {
          socket.emit('leaderboard:error', { message: 'Failed to retrieve leaderboard rankings.' });
        }
      });

      // 6. Socket Disconnection Cleanup
      socket.on('disconnect', () => {
        const set = this.userSockets.get(user.id);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) {
            this.userSockets.delete(user.id);
          }
        }
        process.stdout.write(`[Socket] Disconnected: ${user.username} on socket ${socket.id}\n`);
      });
    });

    return this.io;
  }

  public static getIo(): SocketIoServer | null {
    return this.io;
  }

  public static broadcastLeaderboard(leaderboard: unknown): void {
    if (this.io) {
      this.io.emit('leaderboard:update', leaderboard);
    }
  }

  public static sendDirectNotification(
    targetUserId: string,
    event: string,
    data: unknown
  ): void {
    if (this.io) {
      this.io.to(`room:user:${targetUserId}`).emit(event, data);
    }
  }

  /**
   * Invalidate all existing socket connections for a user when a new login occurs
   */
  public static invalidateUserSessions(userId: string, newSessionId?: string): void {
    if (!this.io) return;
    const sockets = this.userSockets.get(userId);
    if (sockets && sockets.size > 0) {
      for (const socketId of sockets) {
        const s = this.io.sockets.sockets.get(socketId);
        if (s) {
          s.emit('session:invalidated', {
            reason: 'LOGGED_IN_FROM_ANOTHER_DEVICE',
            message: 'Your active session has been terminated because this account logged in from another device.',
            new_session_id: newSessionId,
          });
          s.disconnect(true);
        }
      }
      this.userSockets.delete(userId);
      process.stdout.write(`[SocketServer] Disconnected and invalidated previous socket sessions for user ${userId}\n`);
    }
  }
}

