export interface ProductConfig {
  /** Product name in kebab-case (e.g. "deal-flow-platform") */
  name: string;
  /** Human-readable display name (e.g. "Deal Flow Platform") */
  displayName: string;
  /** Short description */
  description: string;
  /** API port (5000-5099 range) */
  apiPort: number;
  /** Web dev port (3100-3199 range) */
  webPort: number;
  /** Database name */
  dbName: string;
  /** Database port (default 5432, use Docker container) */
  dbPort?: number;
  /** Redis port (default 6379) */
  redisPort?: number;
  /** Which @connectsw packages to wire in */
  features: ProductFeatures;
}

export interface ProductFeatures {
  /** @connectsw/auth — JWT auth, API keys, sessions */
  auth: boolean;
  /** @connectsw/billing — Subscription tiers, usage metering */
  billing: boolean;
  /** @connectsw/webhooks — Webhook delivery with circuit breaker */
  webhooks: boolean;
  /** @connectsw/notifications — In-app + email notifications */
  notifications: boolean;
  /** @connectsw/audit — Audit logging */
  audit: boolean;
}

export interface TemplateContext extends ProductConfig {
  /** PascalCase name (e.g. "DealFlowPlatform") */
  pascalName: string;
  /** camelCase name (e.g. "dealFlowPlatform") */
  camelName: string;
  /** UPPER_SNAKE name (e.g. "DEAL_FLOW_PLATFORM") */
  upperSnakeName: string;
}
