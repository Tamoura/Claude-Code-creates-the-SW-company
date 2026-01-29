# Deployment Commands Cheatsheet

Quick reference for deployment commands.

---

## Open Deployment Guides

```bash
# Executive summary (start here)
open products/tech-management-helper/DEPLOY_EXECUTIVE_SUMMARY.md

# Quick 30-minute guide
open products/tech-management-helper/DEPLOYMENT_QUICKSTART.md

# Complete guide with troubleshooting
open products/tech-management-helper/DEPLOY_TO_VERCEL.md
```

---

## Generate New JWT Secret

```bash
openssl rand -base64 32
```

**Current Generated Secret**:
```
nAsKVB82uDedEOQ8k4moBGEBFeRi4T3LpUy7/JKWv5U=
```

---

## Verify Prerequisites

```bash
# Check all tools
vercel --version
gh --version
node --version
npm --version
openssl version
```

---

## Create Admin User (After Deployment)

Replace `YOUR_API_URL` with your actual Render API URL:

```bash
curl -X POST https://YOUR_API_URL/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!@#",
    "name": "Admin User",
    "role": "ADMIN"
  }'
```

---

## Test Health Endpoint

Replace `YOUR_API_URL` with your actual Render API URL:

```bash
curl https://YOUR_API_URL/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-28T...",
  "version": "1.0.0"
}
```

---

## Vercel CLI Commands

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# View deployments
vercel ls

# View environment variables
vercel env ls

# Add environment variable
vercel env add NEXT_PUBLIC_API_URL production

# Pull environment variables locally
vercel env pull

# View logs
vercel logs

# Alias a deployment
vercel alias https://deployment-url.vercel.app your-domain.com
```

---

## Git Commands (Commit Deployment Files)

```bash
# Add all deployment files
git add products/tech-management-helper/.env.production.example
git add products/tech-management-helper/DEPLOY*.md
git add products/tech-management-helper/apps/api/render.yaml
git add products/tech-management-helper/apps/web/vercel.json

# Commit
git commit -m "chore(deployment): add Vercel + Render deployment configuration

- Add Vercel config for Next.js frontend
- Add Render Blueprint for Fastify API + PostgreSQL
- Add comprehensive deployment guides
- Add environment variables template
- Include troubleshooting and security checklists"

# Push
git push origin feature/gpu-calculator-core-features
```

---

## Local Development with Production API

```bash
# Frontend connects to production API
cd products/tech-management-helper/apps/web
NEXT_PUBLIC_API_URL=https://YOUR_API_URL npm run dev

# Backend connects to production database
cd products/tech-management-helper/apps/api
DATABASE_URL=YOUR_PRODUCTION_DB_URL npm run dev
```

---

## Database Commands (Via Render Dashboard)

1. Go to render.com
2. Navigate to your database
3. Click "Connect" → "External Connection"
4. Use provided psql command:

```bash
psql postgresql://user:password@host/database
```

Common queries:
```sql
-- List all users
SELECT * FROM "User";

-- Count risks
SELECT COUNT(*) FROM "Risk";

-- Check database size
SELECT pg_size_pretty(pg_database_size('tech_mgmt_prod'));
```

---

## Monitoring Commands

```bash
# Watch API logs (if Render CLI installed)
render logs --service=tech-mgmt-api --tail

# Watch Vercel logs
vercel logs --follow

# Check uptime
curl -I https://YOUR_API_URL/api/v1/health
```

---

## Rollback Commands

### Vercel (Frontend)
```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote [deployment-url]
```

Or via dashboard:
1. Go to vercel.com → Project
2. Find previous deployment
3. Click "..." → "Promote to Production"

### Render (Backend)
Via dashboard only:
1. Go to render.com → Service
2. Click "Manual Deploy"
3. Find previous commit
4. Click "Redeploy"

---

## Useful URLs

| Service | URL |
|---------|-----|
| Vercel Dashboard | https://vercel.com/dashboard |
| Render Dashboard | https://dashboard.render.com/ |
| Vercel Docs | https://vercel.com/docs |
| Render Docs | https://render.com/docs |
| UptimeRobot (Monitoring) | https://uptimerobot.com/ |

---

## Environment Variables Reference

### Backend (.env)
```bash
DATABASE_URL=postgresql://user:pass@host/db
JWT_SECRET=nAsKVB82uDedEOQ8k4moBGEBFeRi4T3LpUy7/JKWv5U=
NODE_ENV=production
PORT=5001
CORS_ORIGIN=https://your-frontend.vercel.app
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=https://your-api.onrender.com
NODE_ENV=production
```

---

## Troubleshooting Quick Fixes

**Network Error**:
```bash
# Check Vercel environment variables
vercel env ls

# Should see NEXT_PUBLIC_API_URL set
```

**CORS Error**:
```bash
# Update CORS_ORIGIN in Render
# Must match frontend URL exactly (no trailing slash)
```

**500 Error**:
```bash
# Check Render logs
# Via dashboard: render.com → Service → Logs

# Check database connection
curl https://YOUR_API_URL/api/v1/health
```

**API Not Responding**:
```bash
# Check if API is deployed
# Via dashboard: render.com → Service (should show "Live")

# Check build logs for errors
# Click on service → Events tab
```

---

## Post-Deployment Checklist

```bash
# 1. Test health endpoint
curl https://YOUR_API_URL/api/v1/health

# 2. Visit frontend
open https://YOUR_FRONTEND_URL

# 3. Login
# Email: admin@example.com
# Password: Admin123!@#

# 4. Change password (via UI)

# 5. Create test risk (via UI)

# 6. Verify data persists (refresh page)
```

---

## Quick Deploy Steps

```bash
# 1. Render Database (via dashboard)
# → New → PostgreSQL → Copy URL

# 2. Render API (via dashboard)
# → New → Web Service → Configure → Deploy

# 3. Vercel Frontend (via CLI)
cd products/tech-management-helper/apps/web
vercel --prod

# 4. Update CORS (via Render dashboard)
# Environment → CORS_ORIGIN → [Vercel URL]

# 5. Create Admin
curl -X POST https://YOUR_API_URL/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!@#","name":"Admin","role":"ADMIN"}'

# 6. Test
open https://YOUR_FRONTEND_URL
```

---

**Total Time**: 30 minutes
**Complexity**: Low-Medium
**Documentation**: DEPLOY_TO_VERCEL.md (688 lines)

---

**Quick Reference Version**: 1.0.0
**Last Updated**: 2026-01-28
