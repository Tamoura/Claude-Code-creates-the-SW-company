import { z } from 'zod';

/** Signup: unique email + min-8 password (FR-001). Email lowercased. */
export const signupSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type SignupInput = z.infer<typeof signupSchema>;

/** Login: email + password (FR-002). */
export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;
