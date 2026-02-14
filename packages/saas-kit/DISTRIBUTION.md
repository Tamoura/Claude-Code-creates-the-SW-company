# @connectsw/saas-kit — Standalone Distribution Guide

This document explains how to share `@connectsw/saas-kit` with others so they can generate their own SaaS products **without access to ConnectSW's proprietary products**.

## What Gets Shared

The saas-kit is a **standalone scaffold generator**. It does NOT include any of ConnectSW's products (stablecoin-gateway, muaththir, connectgrc, etc.). It only includes:

```
packages/saas-kit/
├── package.json            # Package metadata + CLI bin entry
├── tsconfig.json           # TypeScript config
├── DISTRIBUTION.md         # This file
├── src/
│   ├── types.ts            # ProductConfig, ProductFeatures interfaces
│   ├── utils.ts            # Template interpolation engine
│   ├── generator.ts        # Core generator (programmatic API)
│   └── cli.ts              # CLI tool (connectsw-create)
└── templates/
    ├── api/                # Fastify backend template
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── .eslintrc.json
    │   ├── jest.config.ts
    │   ├── src/app.ts      # Fastify app with conditional feature imports
    │   ├── src/index.ts    # Server entry point
    │   ├── src/plugins/    # Prisma + Redis plugins
    │   ├── src/routes/     # Health check route
    │   ├── prisma/         # Schema with conditional models
    │   └── tests/          # Health check test
    └── web/                # React + Vite frontend template
        ├── package.json
        ├── tsconfig.json
        ├── vite.config.ts
        ├── tailwind.config.js
        ├── index.html
        └── src/            # App, pages, hooks, components
```

## How to Share

### Option 1: Copy the directory (simplest)

```bash
# From the monorepo root
cp -r packages/saas-kit /path/to/recipient/

# They can then use it directly
cd /path/to/recipient/saas-kit
npm install
npm run build
node dist/cli.js my-product --all-features
```

### Option 2: Publish to npm (recommended for wider distribution)

1. Update `package.json` — change the name if you don't want the `@connectsw` scope:

```json
{
  "name": "saas-kit",
  "version": "1.0.0",
  "description": "Full-stack SaaS product scaffold generator"
}
```

2. Build and publish:

```bash
cd packages/saas-kit
npm run build
npm publish
```

3. Recipients install globally:

```bash
npm install -g saas-kit
saas-kit my-product --all-features --api-port 5000 --web-port 3000
```

### Option 3: GitHub template repository

1. Create a new GitHub repo
2. Copy only `packages/saas-kit/` into it
3. Add a README with usage instructions
4. Recipients clone and run

## What to Remove Before Sharing

The saas-kit is already self-contained. However, if you want to be extra careful:

### Things that are safe to share (all generic):
- The generator code (`src/`)
- All templates (`templates/`)
- Package configs

### Things NOT included (no action needed):
- No ConnectSW product code
- No customer data
- No API keys or secrets
- No proprietary business logic

### Optional: Remove @connectsw references

If you want to rebrand, update these strings:

```bash
# In package.json — change workspace:* dependencies to real versions
# In templates/api/package.json:
"@connectsw/shared": "workspace:*"  →  remove or replace
"@connectsw/ui": "workspace:*"      →  remove or replace
"@connectsw/auth": "workspace:*"    →  remove or replace

# In templates/web/package.json:
"@connectsw/ui": "workspace:*"      →  remove or replace

# In templates/api/src/app.ts:
# Remove imports from @connectsw/* packages
# The generated app will still work — just without auth/audit pre-wired
```

## Making It Fully Standalone

To create a version that has zero dependency on @connectsw packages:

### 1. Fork the templates

Create a `standalone` branch of the templates where:

- `templates/api/package.json` has no `@connectsw/*` dependencies
- `templates/api/src/app.ts` has no `@connectsw/*` imports
- `templates/web/package.json` has no `@connectsw/*` dependencies

The generated product will be a clean Fastify + React starter with:
- Prisma + Redis plugins (included in templates — self-contained)
- Health check route
- Tailwind CSS frontend
- Docker Compose for Postgres + Redis

### 2. Replace feature conditionals

In the standalone version, the feature toggles (`--features auth,billing`) won't wire in `@connectsw/*` packages. Instead, they'll only generate:
- The corresponding Prisma models (User, Subscription, Webhook, etc.)
- Placeholder TODO comments where the feature integration would go

This gives recipients the database schema and a starting point without requiring our packages.

## Recipient Quick Start

Send recipients these instructions:

```bash
# 1. Get the generator
git clone <your-saas-kit-repo> saas-kit
cd saas-kit && npm install && npm run build

# 2. Generate a product
node dist/cli.js my-saas-app \
  --api-port 5000 \
  --web-port 3000 \
  --all-features \
  --description "My SaaS application"

# 3. Start building
cd products/my-saas-app
docker compose up -d
cd apps/api && npm install && npx prisma db push
cd ../web && npm install
cd ../.. && npm run dev

# API: http://localhost:5000
# Web: http://localhost:3000
```

## License Considerations

Before sharing, decide on licensing:

- **Internal use only**: Add a proprietary license header
- **Open source**: Choose MIT, Apache 2.0, or similar
- **Commercial**: Add license terms to package.json

The generator itself contains no proprietary business logic — it's infrastructure code. The templates produce a generic Fastify + React + Prisma starter. This is safe to open source if desired.
