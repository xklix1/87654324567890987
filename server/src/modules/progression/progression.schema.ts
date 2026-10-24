import { z } from 'zod';

export const claimAchievementSchema = z.object({
  code: z
    .string({ required_error: 'Achievement code is required' })
    .min(1, 'Achievement code cannot be empty')
    .max(50, 'Achievement code must not exceed 50 characters'),
});
