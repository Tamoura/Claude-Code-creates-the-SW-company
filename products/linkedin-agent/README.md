# LinkedIn Agent

AI-powered LinkedIn content assistant that analyzes trends and generates Arabic/English posts with format recommendations.

## Overview

LinkedIn Agent helps Arab tech professionals build their LinkedIn presence by generating trend-aware, engagement-optimized content. It supports Arabic as a primary language with English as secondary, and recommends the best post format (text, carousel, infographic, poll, link) for each topic.

## Quick Start

```bash
# Install dependencies
cd apps/api && npm install && cd ../web && npm install

# Setup database
cd ../api && cp .env.example .env  # Add your OPENROUTER_API_KEY
npx prisma migrate dev

# Run
cd ../..
# Terminal 1: API server
cd apps/api && npm run dev  # port 5010

# Terminal 2: Web app
cd apps/web && npm run dev  # port 3114
```

## Ports

| Service | Port | URL |
|---------|------|-----|
| API | 5010 | http://localhost:5010 |
| Web | 3114 | http://localhost:3114 |

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Fastify 5, TypeScript
- **Database**: PostgreSQL 15+ with Prisma ORM
- **AI**: OpenRouter (multi-model routing)
- **Testing**: Jest, React Testing Library, Playwright

## Architecture

```
apps/
  api/          # Fastify backend - trend analysis, post generation, model routing
  web/          # Next.js frontend - content creation UI, RTL support
packages/       # Product-specific shared code
e2e/            # End-to-end tests (Playwright)
docs/           # PRD, API docs, ADRs, specs
```

## Key Features

1. **Trend Analysis** - Paste articles or posts, AI extracts trending topics and angles
2. **Post Generation** - AI writes LinkedIn posts in Arabic (primary) and English
3. **Format Recommendation** - AI suggests best format with reasoning
4. **Carousel Generator** - Creates slide-by-slide content with image prompts
5. **Supporting Material** - Generates infographics, images, and diagrams
6. **Multi-model Intelligence** - Routes to the best AI model per task via OpenRouter

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://postgres@localhost:5432/linkedin_agent_dev
OPENROUTER_API_KEY=your-openrouter-api-key

# Optional
PORT=5010
NODE_ENV=development
```

## Documentation

- [Product Requirements (PRD)](docs/PRD.md)
- [API Documentation](docs/API.md)
- [Architecture Decision Records](docs/ADRs/)

## Development

```bash
# Run tests
cd apps/api && npm test
cd apps/web && npm test

# Run E2E tests
cd e2e && npx playwright test

# Database operations
cd apps/api && npx prisma studio     # Open Prisma Studio
cd apps/api && npx prisma migrate dev # Run migrations
```
