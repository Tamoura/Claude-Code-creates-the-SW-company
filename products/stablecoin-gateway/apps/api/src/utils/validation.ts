import { z } from 'zod';

// ==================== Auth Schemas ====================

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ==================== Payment Session Schemas ====================

export const createPaymentSessionSchema = z.object({
  amount: z
    .number()
    .min(1, 'Amount must be at least 1 USD')
    .max(10000, 'Amount cannot exceed 10,000 USD'),
  currency: z.enum(['USD']).default('USD'),
  description: z.string().max(500).optional(),
  network: z.enum(['polygon', 'ethereum']).default('polygon'),
  token: z.enum(['USDC', 'USDT']).default('USDC'),
  merchant_address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const listPaymentSessionsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  status: z.enum(['PENDING', 'CONFIRMING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
  network: z.enum(['polygon', 'ethereum']).optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
});

// ==================== Refund Schemas ====================

export const createRefundSchema = z.object({
  payment_session_id: z.string().min(1, 'Payment session ID is required'),
  amount: z
    .number()
    .positive('Amount must be positive'),
  reason: z.string().max(500).optional(),
});

// ==================== Webhook Schemas ====================

export const createWebhookSchema = z.object({
  url: z.string().url('Invalid URL').startsWith('https://', 'URL must be HTTPS'),
  events: z
    .array(
      z.enum([
        'payment.created',
        'payment.confirming',
        'payment.completed',
        'payment.failed',
        'payment.refunded',
      ])
    )
    .min(1, 'At least one event is required'),
  description: z.string().max(200).optional(),
});

export const updateWebhookSchema = z.object({
  url: z.string().url().startsWith('https://').optional(),
  events: z
    .array(
      z.enum([
        'payment.created',
        'payment.confirming',
        'payment.completed',
        'payment.failed',
        'payment.refunded',
      ])
    )
    .optional(),
  enabled: z.boolean().optional(),
  description: z.string().max(200).optional(),
});

// ==================== API Key Schemas ====================

export const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  permissions: z
    .object({
      read: z.boolean().default(true),
      write: z.boolean().default(true),
      refund: z.boolean().default(false),
    })
    .default({ read: true, write: true, refund: false }),
});

// ==================== Helper Functions ====================

export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function validateQuery<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
