import { z } from 'zod';
import { BadRequestError, ValidationError } from './errors';

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  config: z.object({
    defaultStrategy: z.enum(['collaborative', 'content_based', 'trending', 'frequently_bought_together']).optional(),
    excludePurchased: z.boolean().optional(),
    maxApiKeys: z.number().int().min(1).max(100).optional(),
    corsOrigins: z.array(z.string()).optional(),
  }).optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  config: z.object({
    defaultStrategy: z.enum(['collaborative', 'content_based', 'trending', 'frequently_bought_together']).optional(),
    excludePurchased: z.boolean().optional(),
    maxApiKeys: z.number().int().min(1).max(100).optional(),
    corsOrigins: z.array(z.string()).optional(),
  }).optional(),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  permissions: z.enum(['read', 'read_write']),
});

export const eventSchema = z.object({
  eventType: z.enum([
    'product_viewed', 'product_clicked', 'add_to_cart', 'remove_from_cart',
    'purchase', 'recommendation_clicked', 'recommendation_impressed',
  ]),
  userId: z.string().min(1).max(256),
  productId: z.string().min(1).max(256),
  sessionId: z.string().max(256).optional(),
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const batchEventsSchema = z.object({
  events: z.array(eventSchema).min(1).max(100),
});

export const createCatalogItemSchema = z.object({
  productId: z.string().min(1).max(256),
  name: z.string().min(1).max(512),
  description: z.string().max(5000).optional(),
  category: z.string().max(255).optional(),
  price: z.number().min(0).optional(),
  imageUrl: z.string().url().optional(),
  attributes: z.record(z.unknown()).optional(),
  available: z.boolean().optional(),
});

export const updateCatalogItemSchema = z.object({
  name: z.string().min(1).max(512).optional(),
  description: z.string().max(5000).optional(),
  category: z.string().max(255).optional(),
  price: z.number().min(0).optional(),
  imageUrl: z.string().url().optional(),
  attributes: z.record(z.unknown()).optional(),
  available: z.boolean().optional(),
});

export const batchCatalogSchema = z.object({
  items: z.array(createCatalogItemSchema).min(1).max(500),
});

export const recommendationQuerySchema = z.object({
  userId: z.string().min(1).max(256),
  limit: z.coerce.number().int().min(1).max(50).default(8),
  strategy: z.enum(['collaborative', 'content_based', 'trending', 'frequently_bought_together']).optional(),
  productId: z.string().optional(),
  context: z.enum(['product_page', 'cart_page', 'homepage', 'search_results']).optional(),
  placementId: z.string().optional(),
});

export const createExperimentSchema = z.object({
  name: z.string().min(1).max(255),
  controlStrategy: z.enum(['collaborative', 'content_based', 'trending', 'frequently_bought_together']),
  variantStrategy: z.enum(['collaborative', 'content_based', 'trending', 'frequently_bought_together']),
  trafficSplit: z.number().int().min(1).max(99),
  metric: z.enum(['ctr', 'conversion_rate', 'revenue_per_visitor']),
  placementId: z.string().max(255).optional(),
});

export const updateExperimentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: z.enum(['running', 'paused', 'completed']).optional(),
  trafficSplit: z.number().int().min(1).max(99).optional(),
});

export const analyticsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d']).default('30d'),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const createWidgetConfigSchema = z.object({
  placementId: z.string().min(1).max(255),
  layout: z.enum(['grid', 'carousel', 'list']).optional(),
  columns: z.number().int().min(2).max(6).optional(),
  theme: z.object({
    primaryColor: z.string().optional(),
    fontFamily: z.string().optional(),
  }).optional(),
  maxItems: z.number().int().min(4).max(20).optional(),
  showPrice: z.boolean().optional(),
  ctaText: z.string().max(100).optional(),
});

export const updateWidgetConfigSchema = z.object({
  layout: z.enum(['grid', 'carousel', 'list']).optional(),
  columns: z.number().int().min(2).max(6).optional(),
  theme: z.object({
    primaryColor: z.string().optional(),
    fontFamily: z.string().optional(),
  }).optional(),
  maxItems: z.number().int().min(4).max(20).optional(),
  showPrice: z.boolean().optional(),
  ctaText: z.string().max(100).optional(),
});

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      errors[path || 'body'] = issue.message;
    }
    throw new ValidationError('Validation failed', errors);
  }
  return result.data;
}

export function validateQuery<T>(schema: z.ZodSchema<T>, query: unknown): T {
  const result = schema.safeParse(query);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      errors[path || 'query'] = issue.message;
    }
    throw new BadRequestError(`Invalid query: ${Object.values(errors).join(', ')}`);
  }
  return result.data;
}
