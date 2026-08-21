#!/usr/bin/env node

import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { generateProduct } from './generator.js';
import type { ProductConfig, ProductFeatures } from './types.js';

const HELP = `
connectsw-create — ConnectSW SaaS product scaffold generator

Usage:
  connectsw-create <product-name> [options]

Options:
  --display-name <name>     Human-readable name (default: derived from product name)
  --description <desc>      Short description
  --api-port <port>         API port (5000-5099)
  --web-port <port>         Web dev port (3100-3199)
  --db-name <name>          Database name (default: product_name_db)
  --db-port <port>          Database port (default: 5432)
  --redis-port <port>       Redis port (default: 6379)
  --features <list>         Comma-separated features: auth,billing,webhooks,notifications,audit
  --all-features            Enable all features
  --out-dir <dir>           Output directory (default: products/<name>)
  --help                    Show this help

Example:
  connectsw-create my-product \\
    --api-port 5010 --web-port 3110 \\
    --all-features \\
    --description "My awesome SaaS product"
`;

function parseArgs(argv: string[]): ProductConfig & { outDir?: string } {
  const args = argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(HELP);
    process.exit(0);
  }

  const name = args[0];
  if (!name || name.startsWith('--')) {
    console.error('Error: Product name is required as first argument');
    process.exit(1);
  }

  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    console.error('Error: Product name must be kebab-case (lowercase letters, numbers, hyphens)');
    process.exit(1);
  }

  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const has = (flag: string): boolean => args.includes(flag);

  const displayName =
    get('--display-name') ??
    name
      .split('-')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');

  const allFeatures = has('--all-features');
  const featureList = (get('--features') ?? '').split(',').filter(Boolean);
  const features: ProductFeatures = {
    auth: allFeatures || featureList.includes('auth'),
    billing: allFeatures || featureList.includes('billing'),
    webhooks: allFeatures || featureList.includes('webhooks'),
    notifications: allFeatures || featureList.includes('notifications'),
    audit: allFeatures || featureList.includes('audit'),
  };

  return {
    name,
    displayName,
    description: get('--description') ?? `${displayName} — built with ConnectSW`,
    apiPort: Number(get('--api-port') ?? 5000),
    webPort: Number(get('--web-port') ?? 3100),
    dbName: get('--db-name') ?? name.replace(/-/g, '_') + '_db',
    dbPort: Number(get('--db-port') ?? 5432),
    redisPort: Number(get('--redis-port') ?? 6379),
    features,
    outDir: get('--out-dir'),
  };
}

function main(): void {
  const { outDir: customOutDir, ...config } = parseArgs(process.argv);
  const outDir = customOutDir ? resolve(customOutDir) : resolve('products', config.name);

  if (existsSync(outDir)) {
    console.error(`Error: Directory already exists: ${outDir}`);
    console.error('Remove it or use --out-dir to specify a different location.');
    process.exit(1);
  }

  console.log(`\nCreating ${config.displayName}...`);
  console.log(`  Output: ${outDir}`);
  console.log(`  API port: ${config.apiPort}`);
  console.log(`  Web port: ${config.webPort}`);
  console.log(`  Features: ${Object.entries(config.features).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none'}\n`);

  const files = generateProduct(config, outDir);

  console.log(`Created ${files.length} files:\n`);
  for (const f of files) {
    console.log(`  ${f}`);
  }
  console.log(`\nNext steps:`);
  console.log(`  cd ${outDir}`);
  console.log(`  docker compose up -d`);
  console.log(`  cd apps/api && npm install`);
  console.log(`  cd ../web && npm install`);
  console.log(`  cd ../.. && npm run dev\n`);
}

main();
