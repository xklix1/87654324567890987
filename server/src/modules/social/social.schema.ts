import { z } from 'zod';

export const sendChatMessageSchema = z.object({
  channel: z.enum(['GLOBAL', 'DIRECT'], { required_error: 'Channel must be GLOBAL or DIRECT' }),
  receiver_id: z.string().uuid('Recipient ID must be a valid UUID').optional(),
  content: z
    .string({ required_error: 'Message content is required' })
    .min(1, 'Message cannot be empty')
    .max(500, 'Message cannot exceed 500 characters'),
});
