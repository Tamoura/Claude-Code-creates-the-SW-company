// Services
export { SubscriptionService } from './services/subscription.service.js';
export type { Plan, SubscriptionServiceOptions } from './services/subscription.service.js';

export { UsageService } from './services/usage.service.js';
export type { UsageServiceOptions } from './services/usage.service.js';

// Middleware
export { requireFeature, requireUsageLimit } from './middleware/tier-gate.js';
export type { TierGateOptions } from './middleware/tier-gate.js';

// Routes
export { default as subscriptionRoutes } from './routes/subscription.js';
export type { SubscriptionRoutesOptions } from './routes/subscription.js';
