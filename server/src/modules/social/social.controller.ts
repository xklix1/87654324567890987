import { Request, Response, NextFunction } from 'express';
import { LeaderboardService } from './leaderboard.service';
import { ChatStore } from '../../db/chat.store';
import { DatabaseStore } from '../../db/store';
import { sanitizeChatMessage } from '../../utils/sanitize';
import { AppError } from '../../middleware/error.middleware';
import { ApiResponse, ChatChannel } from '../../types';
import { sendChatMessageSchema } from './social.schema';
import { SocketServer } from '../../socket/socket.server';

export class SocialController {
  // Rich List Global Leaderboard
  public static async getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? Math.min(100, Math.max(1, Number(req.query.limit))) : 25;
      const leaderboard = await LeaderboardService.getLeaderboard(limit);
      const response: ApiResponse<typeof leaderboard> = { success: true, data: leaderboard };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  // Player Profile by ID
  public static async getPlayerProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetUserId = req.params.userId || (req.user ? req.user.id : null);
      if (!targetUserId) {
        throw new AppError('Player ID is required to fetch profile', 400, 'MISSING_PLAYER_ID');
      }

      const profile = await LeaderboardService.getPlayerProfile(targetUserId);
      const response: ApiResponse<typeof profile> = { success: true, data: profile };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  // Current Authenticated User's Profile
  public static async getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const profile = await LeaderboardService.getPlayerProfile(req.user.id);
      const response: ApiResponse<typeof profile> = { success: true, data: profile };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  // Global Chat Messages
  public static async getGlobalChatMessages(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const messages = await ChatStore.getGlobalMessages(50);
      const response: ApiResponse<typeof messages> = { success: true, data: messages };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  // Direct Chat Messages
  public static async getDirectChatMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const recipientId = req.params.recipientId;
      if (!recipientId) {
        throw new AppError('Recipient ID is required', 400, 'MISSING_RECIPIENT_ID');
      }

      const messages = await ChatStore.getDirectMessages(req.user.id, recipientId, 50);
      const response: ApiResponse<typeof messages> = { success: true, data: messages };
      res.status(200).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }

  // HTTP Fallback Send Chat Message
  public static async sendChatMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const parsed = sendChatMessageSchema.parse(req.body);
      const cleanContent = sanitizeChatMessage(parsed.content);
      const channel: ChatChannel = parsed.channel;

      let receiverUsername: string | null = null;
      if (channel === 'DIRECT') {
        if (!parsed.receiver_id) {
          throw new AppError('Recipient ID is required for direct messages', 400, 'MISSING_RECIPIENT_ID');
        }
        if (parsed.receiver_id === req.user.id) {
          throw new AppError('Cannot send direct messages to yourself', 400, 'SELF_MESSAGE_PROHIBITED');
        }

        const receiver = await DatabaseStore.findUserById(parsed.receiver_id);
        if (!receiver) {
          throw new AppError('Recipient user not found', 404, 'RECIPIENT_NOT_FOUND');
        }
        receiverUsername = receiver.username;
      }

      const message = await ChatStore.saveMessage({
        channel,
        senderId: req.user.id,
        senderUsername: req.user.username,
        receiverId: parsed.receiver_id ?? null,
        receiverUsername,
        content: cleanContent,
      });

      // Broadcast via Socket.io if active
      const io = SocketServer.getIo();
      if (io) {
        if (channel === 'GLOBAL') {
          io.to('room:global').emit('chat:message', message);
        } else if (channel === 'DIRECT' && parsed.receiver_id) {
          io.to(`room:user:${req.user.id}`).emit('chat:message', message);
          io.to(`room:user:${parsed.receiver_id}`).emit('chat:message', message);
        }
      }

      const response: ApiResponse<typeof message> = { success: true, data: message };
      res.status(201).json(response);
    } catch (err: unknown) {
      next(err);
    }
  }
}
