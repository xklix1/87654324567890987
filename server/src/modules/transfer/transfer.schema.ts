import { z } from 'zod';

export const transferInputSchema = z.object({
  receiver_id: z
    .string({ required_error: 'Receiver ID is required' })
    .uuid('Receiver ID must be a valid UUID format'),
  amount: z
    .number({ required_error: 'Transfer amount is required', invalid_type_error: 'Amount must be a numeric value' })
    .positive('Transfer amount must be strictly greater than zero')
    .min(1.0, 'Minimum transfer amount allowed is $1.00')
    .max(5000.0, 'Single transfer limit of $5,000.00 exceeded'),
  note: z
    .string()
    .trim()
    .max(100, 'Transfer memo note must not exceed 100 characters')
    .optional(),
});

export type TransferInput = z.infer<typeof transferInputSchema>;
