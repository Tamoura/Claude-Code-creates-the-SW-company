/**
 * saas-kit utils tests
 *
 * Tests the string conversion utilities (toPascalCase, toCamelCase,
 * toUpperSnake) and the template context builder/interpolator used
 * by the product scaffold generator.
 */

import { toPascalCase, toCamelCase, toUpperSnake, buildContext, interpolate } from '../src/utils.js';
import type { ProductConfig } from '../src/types.js';

const BASE_CONFIG: ProductConfig = {
  name: 'my-product',
  displayName: 'My Product',
  description: 'A test product for the saas-kit generator.',
  apiPort: 5050,
  webPort: 3150,
  dbName: 'my_product_dev',
  features: {
    auth: true,
    billing: false,
    webhooks: true,
    notifications: false,
    audit: true,
  },
};

describe('toPascalCase', () => {
  it('converts single word', () => {
    expect(toPascalCase('product')).toBe('Product');
  });

  it('converts two-segment kebab string', () => {
    expect(toPascalCase('my-product')).toBe('MyProduct');
  });

  it('converts multi-segment kebab string', () => {
    expect(toPascalCase('deal-flow-platform')).toBe('DealFlowPlatform');
  });

  it('preserves already-capitalised letters in segments', () => {
    expect(toPascalCase('stablecoin-gateway')).toBe('StablecoinGateway');
  });

  it('handles string with no hyphens', () => {
    expect(toPascalCase('taskflow')).toBe('Taskflow');
  });
});

describe('toCamelCase', () => {
  it('lowercases the first character', () => {
    expect(toCamelCase('My-Product')).toBe('myProduct');
  });

  it('converts kebab-case to camelCase', () => {
    expect(toCamelCase('deal-flow-platform')).toBe('dealFlowPlatform');
  });

  it('handles single word', () => {
    expect(toCamelCase('taskflow')).toBe('taskflow');
  });

  it('converts three-segment name', () => {
    expect(toCamelCase('linkedin-agent-pro')).toBe('linkedinAgentPro');
  });
});

describe('toUpperSnake', () => {
  it('converts hyphens to underscores and uppercases', () => {
    expect(toUpperSnake('my-product')).toBe('MY_PRODUCT');
  });

  it('handles multi-segment name', () => {
    expect(toUpperSnake('deal-flow-platform')).toBe('DEAL_FLOW_PLATFORM');
  });

  it('handles single word', () => {
    expect(toUpperSnake('taskflow')).toBe('TASKFLOW');
  });

  it('handles already-uppercase input', () => {
    expect(toUpperSnake('QDB-ONE')).toBe('QDB_ONE');
  });
});

describe('buildContext', () => {
  it('includes all original config fields', () => {
    const ctx = buildContext(BASE_CONFIG);
    expect(ctx.name).toBe(BASE_CONFIG.name);
    expect(ctx.displayName).toBe(BASE_CONFIG.displayName);
    expect(ctx.apiPort).toBe(BASE_CONFIG.apiPort);
    expect(ctx.webPort).toBe(BASE_CONFIG.webPort);
    expect(ctx.dbName).toBe(BASE_CONFIG.dbName);
  });

  it('derives pascalName from name', () => {
    const ctx = buildContext(BASE_CONFIG);
    expect(ctx.pascalName).toBe('MyProduct');
  });

  it('derives camelName from name', () => {
    const ctx = buildContext(BASE_CONFIG);
    expect(ctx.camelName).toBe('myProduct');
  });

  it('derives upperSnakeName from name', () => {
    const ctx = buildContext(BASE_CONFIG);
    expect(ctx.upperSnakeName).toBe('MY_PRODUCT');
  });

  it('defaults dbPort to 5432 when not provided', () => {
    const config = { ...BASE_CONFIG };
    delete (config as any).dbPort;
    const ctx = buildContext(config);
    expect(ctx.dbPort).toBe(5432);
  });

  it('uses provided dbPort when supplied', () => {
    const ctx = buildContext({ ...BASE_CONFIG, dbPort: 5433 });
    expect(ctx.dbPort).toBe(5433);
  });

  it('defaults redisPort to 6379 when not provided', () => {
    const config = { ...BASE_CONFIG };
    delete (config as any).redisPort;
    const ctx = buildContext(config);
    expect(ctx.redisPort).toBe(6379);
  });

  it('uses provided redisPort when supplied', () => {
    const ctx = buildContext({ ...BASE_CONFIG, redisPort: 6380 });
    expect(ctx.redisPort).toBe(6380);
  });

  it('includes features from config', () => {
    const ctx = buildContext(BASE_CONFIG);
    expect(ctx.features.auth).toBe(true);
    expect(ctx.features.billing).toBe(false);
  });
});

describe('interpolate', () => {
  const ctx = buildContext(BASE_CONFIG);

  it('replaces a simple string placeholder', () => {
    const result = interpolate('Product: {{name}}', ctx);
    expect(result).toBe('Product: my-product');
  });

  it('replaces a number placeholder', () => {
    const result = interpolate('API runs on port {{apiPort}}', ctx);
    expect(result).toBe('API runs on port 5050');
  });

  it('replaces multiple placeholders in one string', () => {
    const result = interpolate('{{pascalName}} ({{camelName}}) on {{webPort}}', ctx);
    expect(result).toBe('MyProduct (myProduct) on 3150');
  });

  it('replaces all occurrences of the same placeholder', () => {
    const result = interpolate('{{name}} and {{name}}', ctx);
    expect(result).toBe('my-product and my-product');
  });

  it('leaves unknown placeholders untouched', () => {
    const result = interpolate('{{unknown}} stays', ctx);
    expect(result).toBe('{{unknown}} stays');
  });

  describe('feature conditionals', () => {
    it('keeps content inside {{#if feature.auth}} when feature is enabled', () => {
      const tmpl = '{{#if feature.auth}}AUTH_ENABLED{{/if feature.auth}}';
      expect(interpolate(tmpl, ctx)).toBe('AUTH_ENABLED');
    });

    it('removes content inside {{#if feature.billing}} when feature is disabled', () => {
      const tmpl = '{{#if feature.billing}}BILLING_SECTION{{/if feature.billing}}';
      expect(interpolate(tmpl, ctx)).toBe('');
    });

    it('handles multiline conditional blocks', () => {
      const tmpl = `{{#if feature.webhooks}}
import webhooks from './webhooks.js';
fastify.register(webhooks);
{{/if feature.webhooks}}`;
      const result = interpolate(tmpl, ctx);
      expect(result).toContain("import webhooks");
      expect(result).not.toContain('{{#if');
    });

    it('removes multiline block when feature is disabled', () => {
      const tmpl = `{{#if feature.notifications}}
import notify from './notify.js';
{{/if feature.notifications}}`;
      const result = interpolate(tmpl, ctx);
      expect(result.trim()).toBe('');
    });

    it('handles multiple different feature blocks', () => {
      const tmpl = '{{#if feature.auth}}A{{/if feature.auth}}{{#if feature.billing}}B{{/if feature.billing}}';
      const result = interpolate(tmpl, ctx);
      expect(result).toBe('A');
    });
  });
});
