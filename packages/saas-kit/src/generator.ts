import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ProductConfig, TemplateContext } from './types.js';
import { buildContext, interpolate } from './utils.js';

export type { ProductConfig, ProductFeatures, TemplateContext } from './types.js';
export { buildContext, interpolate, toPascalCase, toCamelCase, toUpperSnake } from './utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '..', 'templates');

/**
 * Generate a full SaaS product scaffold.
 *
 * @param config  Product configuration
 * @param outDir  Absolute path to write output (e.g. products/<name>)
 */
export function generateProduct(config: ProductConfig, outDir: string): string[] {
  const ctx = buildContext(config);
  const createdFiles: string[] = [];

  // Walk all template directories
  const templateSections = ['api', 'web'];
  for (const section of templateSections) {
    const sectionDir = join(TEMPLATES_DIR, section);
    if (!existsSync(sectionDir)) continue;

    const targetDir = join(outDir, 'apps', section);
    const files = walkDir(sectionDir);

    for (const templatePath of files) {
      const relPath = relative(sectionDir, templatePath);
      const content = readFileSync(templatePath, 'utf-8');
      const rendered = interpolate(content, ctx);

      // Replace .hbs extension if present
      const outputRelPath = relPath.replace(/\.hbs$/, '');
      const outputPath = join(targetDir, outputRelPath);

      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, rendered, 'utf-8');
      createdFiles.push(relative(outDir, outputPath));
    }
  }

  // Generate root-level product files
  generateRootFiles(ctx, outDir, createdFiles);

  return createdFiles;
}

function generateRootFiles(ctx: TemplateContext, outDir: string, createdFiles: string[]): void {
  // Root package.json
  const rootPkg = {
    name: ctx.name,
    version: '0.1.0',
    private: true,
    description: ctx.description,
    scripts: {
      'dev': 'concurrently "npm run dev:api" "npm run dev:web"',
      'dev:api': `cd apps/api && npm run dev`,
      'dev:web': `cd apps/web && npm run dev`,
      'build': 'npm run build:api && npm run build:web',
      'build:api': 'cd apps/api && npm run build',
      'build:web': 'cd apps/web && npm run build',
      'test': 'npm run test:api && npm run test:web',
      'test:api': 'cd apps/api && npm test',
      'test:web': 'cd apps/web && npm test',
      'lint': 'npm run lint:api && npm run lint:web',
      'lint:api': 'cd apps/api && npm run lint',
      'lint:web': 'cd apps/web && npm run lint',
      'db:generate': 'cd apps/api && npx prisma generate',
      'db:migrate': 'cd apps/api && npx prisma migrate dev',
      'db:push': 'cd apps/api && npx prisma db push',
    },
    devDependencies: {
      concurrently: '^8.2.0',
    },
  };
  writeJson(join(outDir, 'package.json'), rootPkg, createdFiles, outDir);

  // README
  const readme = `# ${ctx.displayName}

${ctx.description}

## Quick Start

\`\`\`bash
# 1. Start infrastructure
docker compose up -d

# 2. Install dependencies
cd apps/api && npm install
cd ../web && npm install
cd ../..

# 3. Setup database
npm run db:push

# 4. Start development
npm run dev
\`\`\`

- API: http://localhost:${ctx.apiPort}
- Web: http://localhost:${ctx.webPort}

## Architecture

- **Backend**: Fastify + Prisma + PostgreSQL + Redis
- **Frontend**: React + Vite + Tailwind CSS + React Router

## Project Structure

\`\`\`
apps/
  api/     # Fastify backend
  web/     # React frontend
docs/      # Documentation
e2e/       # End-to-end tests
\`\`\`
`;
  writeFile(join(outDir, 'README.md'), readme, createdFiles, outDir);

  // docker-compose.yml
  const compose = `version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${ctx.dbName}
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "${ctx.dbPort}:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "${ctx.redisPort}:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
`;
  writeFile(join(outDir, 'docker-compose.yml'), compose, createdFiles, outDir);

  // .env.example
  const envExample = `# ${ctx.displayName} — Environment Variables

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:${ctx.dbPort}/${ctx.dbName}?schema=public"

# Redis
REDIS_URL="redis://localhost:${ctx.redisPort}"

# Server
PORT=${ctx.apiPort}
HOST=0.0.0.0
NODE_ENV=development

# JWT
JWT_SECRET=change-me-in-production-${ctx.name}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
{{#if feature.webhooks}}
# Webhooks
WEBHOOK_ENCRYPTION_KEY=generate-a-64-char-hex-key
{{/if feature.webhooks}}
{{#if feature.notifications}}
# Email (optional — falls back to console)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=${ctx.name}@connectsw.com
{{/if feature.notifications}}
`;
  writeFile(join(outDir, '.env.example'), interpolate(envExample, ctx), createdFiles, outDir);

  // docs directory
  mkdirSync(join(outDir, 'docs', 'ADRs'), { recursive: true });
  mkdirSync(join(outDir, 'docs', 'specs'), { recursive: true });
  writeFile(
    join(outDir, 'docs', 'PRD.md'),
    `# ${ctx.displayName} — Product Requirements Document\n\nTODO: Define product requirements.\n`,
    createdFiles,
    outDir,
  );

  // e2e directory
  mkdirSync(join(outDir, 'e2e'), { recursive: true });
  writeFile(
    join(outDir, 'e2e', '.gitkeep'),
    '',
    createdFiles,
    outDir,
  );
}

function walkDir(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...walkDir(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function writeJson(path: string, data: object, tracking: string[], baseDir: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  tracking.push(relative(baseDir, path));
}

function writeFile(path: string, content: string, tracking: string[], baseDir: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf-8');
  tracking.push(relative(baseDir, path));
}
