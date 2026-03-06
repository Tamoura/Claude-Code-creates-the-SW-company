# Mu'aththir -- Agent Context Addendum

This document provides product-specific context for ConnectSW agents working on Mu'aththir.

## Product Overview

**Name**: Mu'aththir (Arabic for "Influential/Impactful")
**Type**: Web App (Full SaaS Product)
**Status**: Development (Backend MVP complete, Frontend in progress)
**Product Directory**: `products/muaththir/`
**Frontend Port**: 3108
**Backend Port**: 5005
**Database**: PostgreSQL (database name: `muaththir_dev`)

**What It Does**: Mu'aththir is a holistic child development platform where parents track children ages 3-16 across 6 interconnected dimensions: Academic, Social-Emotional, Behavioural, Aspirational, Islamic, and Physical. The core loop is: observe -> log -> review radar chart -> check milestones -> repeat.

**Target Users**: Muslim parents primarily, but 5 of 6 dimensions are universal.

**Monetization**: Freemium. Free: 1 child. Premium ($8/month): unlimited children, export, digests. Annual: $77/year.

## The Six Dimensions

| # | Dimension | Slug | Colour | Description |
|---|-----------|------|--------|-------------|
| 1 | Academic | `academic` | Blue #3B82F6 | School/learning progress |
| 2 | Social-Emotional | `social_emotional` | Pink #EC4899 | Emotional intelligence, empathy |
| 3 | Behavioural | `behavioural` | Amber #F59E0B | Conduct, habits, discipline |
| 4 | Aspirational | `aspirational` | Purple #8B5CF6 | Goals, dreams, motivation |
| 5 | Islamic | `islamic` | Emerald #10B981 | Quran, salah, Islamic knowledge |
| 6 | Physical | `physical` | Red #EF4444 | Health, fitness, nutrition |

## Age Bands

| Band | Ages | Slug |
|------|------|------|
| Early Years | 3-5 | `early_years` |
| Primary | 6-9 | `primary` |
| Upper Primary | 10-12 | `upper_primary` |
| Secondary | 13-16 | `secondary` |

## Business Logic

### Radar Chart Score: `score = (min(obs,10)/10 * 40) + (achieved/total * 40) + (positive/total * 20)`

### Key Rules
- Observation text: 1-1,000 chars, up to 5 tags, can backdate 1 year
- Soft deletes: 30-day recovery window
- Free tier: 1 child profile limit
- Auth: JWT 1hr access + HttpOnly 7d refresh, bcrypt cost 12
- Resource ownership: all queries filtered by parent_id
- Age band computed from DOB, never stored

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 14 + React 18 | Port 3108 |
| Backend | Fastify 5.x | Port 5005 |
| Database | PostgreSQL 15+ / Prisma 6.x | muaththir_dev |
| Styling | Tailwind CSS + shadcn/ui | Radix-based |
| Charting | Recharts 2.x | Radar + trends |
| Validation | Zod 3.x | API input |
| Testing | Jest + RTL + Playwright | All layers |

## Architecture

Monolith: `Browser -> Next.js (3108) -> Fastify API (5005) -> PostgreSQL`

### Design Patterns
- Route-Handler-Service separation
- Zod at boundaries
- Resource ownership enforcement
- Soft deletes with scheduled hard delete
- Dimension as PostgreSQL enum
- Write-through score cache with staleness flag

## Key Documents

- PRD: `products/muaththir/docs/PRD.md`
- Architecture: `products/muaththir/docs/architecture.md`
- API: `products/muaththir/docs/API.md`
- ADRs: `products/muaththir/docs/ADRs/`

---

**Created by**: Product Manager + Architect
**Last Updated**: 2026-03-06
**Status**: Development -- backend MVP complete, frontend in progress
