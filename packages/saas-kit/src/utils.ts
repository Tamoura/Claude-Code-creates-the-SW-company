import type { ProductConfig, TemplateContext } from './types.js';

/** Convert kebab-case to PascalCase */
export function toPascalCase(str: string): string {
  return str
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

/** Convert kebab-case to camelCase */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** Convert kebab-case to UPPER_SNAKE_CASE */
export function toUpperSnake(str: string): string {
  return str.replace(/-/g, '_').toUpperCase();
}

/** Build full template context from config */
export function buildContext(config: ProductConfig): TemplateContext {
  return {
    ...config,
    dbPort: config.dbPort ?? 5432,
    redisPort: config.redisPort ?? 6379,
    pascalName: toPascalCase(config.name),
    camelName: toCamelCase(config.name),
    upperSnakeName: toUpperSnake(config.name),
  };
}

/** Simple template interpolation: replaces {{key}} with context values */
export function interpolate(template: string, ctx: TemplateContext): string {
  let result = template;
  // Replace simple values
  for (const [key, value] of Object.entries(ctx)) {
    if (typeof value === 'string' || typeof value === 'number') {
      result = result.replaceAll(`{{${key}}}`, String(value));
    }
  }
  // Replace feature conditionals: {{#if feature.auth}}...{{/if feature.auth}}
  for (const [feature, enabled] of Object.entries(ctx.features)) {
    const ifRegex = new RegExp(
      `{{#if feature\\.${feature}}}([\\s\\S]*?){{/if feature\\.${feature}}}`,
      'g',
    );
    result = result.replace(ifRegex, enabled ? '$1' : '');
  }
  return result;
}
