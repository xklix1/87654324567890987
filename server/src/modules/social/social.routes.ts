import { Router } from 'express';
import { SocialController } from './social.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { generalApiLimiter } from '../../middleware/rate-limit.middleware';

export const socialRouter = Router();

// Leaderboard & Profiles
socialRouter.get('/leaderboard', SocialController.getLeaderboard);
socialRouter.get('/profile', authenticate, SocialController.getMyProfile);
socialRouter.get('/profile/:userId', SocialController.getPlayerProfile);

// Chat Messaging Endpoints
socialRouter.get('/chat/global', SocialController.getGlobalChatMessages);
socialRouter.get('/chat/direct/:recipientId', authenticate, SocialController.getDirectChatMessages);
socialRouter.post('/chat/send', generalApiLimiter, authenticate, SocialController.sendChatMessage);
