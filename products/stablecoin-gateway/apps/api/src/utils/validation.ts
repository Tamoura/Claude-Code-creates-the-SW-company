import { z } from 'zod';
import { isAddress, getAddress } from 'ethers';

// ==================== Ethereum Address Validation ====================

export const ethereumAddressSchema = z
  .string()
  .refine((addr) => addr.startsWith('0x'), {
    message: 'Ethereum address must start with 0x',
  })
  .refine((addr) => isAddress(addr), {
    message: 'Invalid Ethereum address format',
  })
  .refine((addr) => addr !== '0x0000000000000000000000000000000000000000', {
    message: 'Zero address is not allowed',
  })
  .transform((addr) => getAddress(addr)); // Convert to checksummed address

// ==================== Auth Schemas ====================

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/, 'Password must contain at least one special character'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const logoutSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

export const sseTokenSchema = z.object({
  payment_session_id: z.string().min(1, 'Payment session ID is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/, 'Password must contain at least one special character'),
});


export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/, 'Password must contain at least one special character'),
});

// ==================== Idempotency Key Schema ====================

export const idempotencyKeySchema = z.string()
  .min(1, 'Idempotency key cannot be empty')
  .max(64, 'Idempotency key must be 64 characters or less')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Idempotency key must be alphanumeric (hyphens and underscores allowed)');

// ==================== Payment Session Schemas ====================

// Metadata validation with size limits
const metadataValueSchema = z.union([
  z.string().max(500, 'Metadata string values must be <= 500 characters'),
  z.number(),
  z.boolean(),
  z.null(),
]);

const metadataSchema = z
  .record(metadataValueSchema)
  .optional()
  .refine(
    (data) => {
      if (!data) return true;
      const keys = Object.keys(data);
      return keys.length <= 50;
    },
    { message: 'Metadata cannot have more than 50 keys' }
  )
  .refine(
    (data) => {
      if (!data) return true;
      const jsonSize = JSON.stringify(data).length;
      return jsonSize <= 16384; // 16KB
    },
    { message: 'Metadata size cannot exceed 16KB' }
  );

// RISK-060: Redirect URLs must use HTTPS to prevent MitM on payment callbacks.
// Allow http:// only for localhost origins (development convenience).
const httpsUrlSchema = z
  .string()
  .url()
  .refine(
    (url) => url.startsWith('https://') || /^http:\/\/localhost(:\d+)?/.test(url),
    { message: 'URL must use HTTPS (http is only allowed for localhost)' },
  );

export const createPaymentSessionSchema = z.object({
  amount: z
    .number()
    .min(1, 'Amount must be at least 1 USD')
    .max(10000, 'Amount cannot exceed 10,000 USD'),
  currency: z.enum(['USD']).default('USD'),
  description: z.string().max(500).optional(),
  network: z.enum(['polygon', 'ethereum']).default('polygon'),
  token: z.enum(['USDC', 'USDT']).default('USDC'),
  merchant_address: ethereumAddressSchema,
  success_url: httpsUrlSchema.optional(),
  cancel_url: httpsUrlSchema.optional(),
  metadata: metadataSchema,
  // NOTE: idempotency_key removed from body - use Idempotency-Key header instead
});

export const listPaymentSessionsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  status: z.enum(['PENDING', 'CONFIRMING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
  network: z.enum(['polygon', 'ethereum']).optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
});

export const updatePaymentSessionSchema = z.object({
  customer_address: ethereumAddressSchema.optional(),
  tx_hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Transaction hash must be 64 hex characters with 0x prefix').optional(),
  block_number: z.number().int().positive('Block number must be positive').optional(),
  confirmations: z.number().int().min(0, 'Confirmations must be non-negative').optional(),
  status: z.enum(['PENDING', 'CONFIRMING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
});

// ==================== Refund Schemas ====================

export const createRefundSchema = z.object({
  payment_session_id: z.string().min(1, 'Payment session ID is required'),
  amount: z
    .number()
    .positive('Amount must be positive'),
  reason: z.string().max(500).optional(),
});

export const listRefundsQuerySchema = z.object({
  payment_session_id: z.string().optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
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
        'refund.created',
        'refund.processing',
        'refund.completed',
        'refund.failed',
      ])
    )
    .min(1, 'At least one event is required'),
  enabled: z.boolean().optional(),
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
        'refund.created',
        'refund.processing',
        'refund.completed',
        'refund.failed',
      ])
    )
    .optional(),
  enabled: z.boolean().optional(),
  description: z.string().max(200).optional(),
});

// ==================== Pagination Query Schemas ====================

export const listApiKeysQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export const listWebhooksQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
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

// ==================== Analytics Schemas ====================

export const analyticsOverviewQuerySchema = z.object({}).default({});

export const analyticsVolumeQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month']).default('day'),
  days: z.coerce.number().min(1).max(365).default(30),
});

export const analyticsBreakdownQuerySchema = z.object({
  group_by: z.enum(['status', 'network', 'token']).default('status'),
});

// ==================== Path Parameter Schemas (RISK-062) ====================

/**
 * Validates that a path parameter is a valid UUID v4.
 * Prevents scanning/enumeration attacks using sequential IDs
 * and avoids Prisma errors from malformed IDs hitting the DB.
 */
export const uuidParamSchema = z
  .string()
  .uuid('Invalid ID format — expected a UUID');

// ==================== Helper Functions ====================

export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function validateQuery<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
