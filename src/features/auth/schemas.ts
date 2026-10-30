import { z } from 'zod';

// Messages are i18n keys; screens translate them with `t`.
const email = z.email('auth.validation.emailInvalid');
const password = z.string().min(8, 'auth.validation.passwordShort');

export const signInSchema = z.object({ email, password });

export const signUpSchema = z.object({
  name: z.string().min(1, 'auth.validation.nameRequired').max(64, 'auth.validation.nameTooLong'),
  email,
  password,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
