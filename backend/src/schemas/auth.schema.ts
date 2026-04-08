// src/schemas/auth.schema.ts
// Zod schemas for authentication module

import { z } from 'zod';
import { EmailSchema, MobileSchema, PasswordSchema, UUIDSchema } from './shared.schema.js';

export const RegisterSchema = z.object({
  full_name: z.string().min(2).max(200).trim(),
  email: EmailSchema,
  mobile: MobileSchema,
  password: PasswordSchema,
  address: z.string().max(500).trim().optional(),
  referral_code: z.string().max(20).trim().optional(),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  identifier: z.string().min(1).trim(), // email or mobile
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const VerifyOTPSchema = z.object({
  mobile: MobileSchema,
  otp: z.string().length(6).regex(/^\d{6}$/),
});
export type VerifyOTPInput = z.infer<typeof VerifyOTPSchema>;

export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  email: EmailSchema,
  otp: z.string().length(6).regex(/^\d{6}$/),
  new_password: PasswordSchema,
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const ChangePasswordSchema = z.object({
  current_password: z.string().min(1).max(128),
  new_password: PasswordSchema,
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const RefreshTokenSchema = z.object({
  session_id: UUIDSchema,
});
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
