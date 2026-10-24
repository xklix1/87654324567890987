import { z } from 'zod';

const allowedEmailDomainsRegex = /@(gmail\.com|hotmail\.com|yahoo\.(com|[a-z]{2}))$/i;

export const registerSchema = z.object({
  username: z
    .string({ required_error: 'اسم المستخدم مطلوب' })
    .min(3, 'اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل')
    .max(30, 'اسم المستخدم يجب ألا يتجاوز 30 حرفاً')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'اسم المستخدم يجب أن يكون باللغة الإنجليزية فقط (أحرف، أرقام، أو _)'
    ),
  email: z
    .string({ required_error: 'البريد الإلكتروني مطلوب' })
    .trim()
    .email('صيغة البريد الإلكتروني غير صالحة')
    .refine((val) => allowedEmailDomainsRegex.test(val), {
      message: 'البريد الإلكتروني يجب أن يكون من نطاقات Gmail أو Hotmail أو Yahoo فقط',
    }),
  password: z
    .string({ required_error: 'كلمة المرور مطلوبة' })
    .min(8, 'كلمة المرور يجب أن تتكون من 8 خانات على الأقل')
    .max(100, 'كلمة المرور طويلة جداً')
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'كلمة المرور يجب أن تحتوي على حرف إنجليزي واحد على الأقل',
    })
    .refine((val) => /[0-9]/.test(val), {
      message: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل',
    })
    .refine((val) => /[^a-zA-Z0-9\s]/.test(val), {
      message: 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%^&*...)',
    }),
});

export const loginSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
