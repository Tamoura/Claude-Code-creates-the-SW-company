# Deployment Configuration Files

This directory contains all configuration files needed to deploy Tech Management Helper to production.

## Files Overview

### 📄 DEPLOY_TO_VERCEL.md
**Purpose**: Complete step-by-step deployment guide (30 pages)

**What it contains**:
- Detailed instructions for each deployment step
- Screenshots and visual guides
- Troubleshooting section for common issues
- Post-deployment checklist
- Security best practices
- Monitoring and scaling recommendations

**When to use**: First-time deployment or when training someone on deployment process

---

### 📄 DEPLOYMENT_QUICKSTART.md
**Purpose**: 30-minute quick reference guide

**What it contains**:
- Condensed deployment steps
- Copy-paste commands
- Essential configuration only
- Quick troubleshooting tips

**When to use**: When you've deployed before and just need a reminder of the steps

---

### 📄 .env.production.example
**Purpose**: Template for production environment variables

**What it contains**:
- All required environment variables for backend and frontend
- Comments explaining each variable
- Security notes and warnings
- Example values (NOT actual secrets)

**How to use**:
1. Copy this file to create your actual `.env` files
2. Replace placeholder values with real values
3. Never commit actual `.env` files to git

**Files to create**:
```bash
# Backend
products/tech-management-helper/apps/api/.env

# Frontend
products/tech-management-helper/apps/web/.env.local
```

---

### 📄 apps/web/vercel.json
**Purpose**: Vercel deployment configuration

**What it contains**:
- Build commands for Next.js
- Output directory configuration
- Environment variable references
- Region settings (US East by default)

**How it's used**: Vercel reads this automatically during deployment

**Manual alternative**: You can configure the same settings via Vercel UI

---

### 📄 apps/api/render.yaml
**Purpose**: Render deployment configuration (Blueprint)

**What it contains**:
- Web service configuration (backend API)
- Database configuration (PostgreSQL)
- Build and start commands
- Environment variables structure
- Health check endpoint

**How to use**:
1. Go to Render → New → Blueprint
2. Connect your GitHub repo
3. Select this file
4. Render will create both database and API service automatically

**Manual alternative**: You can create services individually via Render UI (as described in deployment guide)

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Production Setup                     │
└─────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Vercel     │         │   Render     │         │   Render     │
│  (Frontend)  │────────▶│   (API)      │────────▶│ (PostgreSQL) │
│              │  HTTPS  │              │  TCP    │              │
│  Next.js     │         │  Fastify     │  5432   │  Database    │
│  Port: 443   │         │  Port: 5001  │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │
       │                        │
       └────────── CORS ────────┘
     (Frontend URL only)
```

## Quick Deploy Options

### Option 1: Render Blueprint (Fastest)
Uses `render.yaml` to create everything automatically.

**Pros**:
- Creates database + API in one step
- Automatically links them together
- Less manual configuration

**Cons**:
- Less control over individual settings
- Harder to customize later

### Option 2: Manual Setup (Recommended)
Follow `DEPLOY_TO_VERCEL.md` to create each service manually.

**Pros**:
- Full control over configuration
- Better understanding of architecture
- Easier to troubleshoot
- Can customize each component

**Cons**:
- Takes a bit longer (~10 extra minutes)
- More steps to follow

### Option 3: CLI Deployment
Uses Vercel CLI and Render CLI.

**Pros**:
- Scriptable and repeatable
- Good for CI/CD pipelines
- Terminal-based workflow

**Cons**:
- Requires CLI tools installed
- Need to remember commands

## Environment Variables Guide

### Backend API (.env)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `JWT_SECRET` | ✅ Yes | Secret for signing JWT tokens | Generated via `openssl rand -base64 32` |
| `NODE_ENV` | ✅ Yes | Runtime environment | `production` |
| `PORT` | ✅ Yes | Server port | `5001` |
| `CORS_ORIGIN` | ✅ Yes | Allowed frontend URL | `https://your-app.vercel.app` |

### Frontend Web (.env.local)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | ✅ Yes | Backend API URL | `https://your-api.onrender.com` |
| `NODE_ENV` | ⚠️ Optional | Runtime environment | `production` (auto-set) |

**Important**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put secrets there!

## Security Checklist

Before going to production:

- [ ] ✅ DATABASE_URL uses SSL (`?sslmode=require`)
- [ ] ✅ JWT_SECRET is unique and strong (32+ characters)
- [ ] ✅ CORS_ORIGIN is set to specific frontend URL (not `*`)
- [ ] ✅ NODE_ENV is set to `production`
- [ ] ✅ Default admin password has been changed
- [ ] ✅ Actual `.env` files are in `.gitignore`
- [ ] ✅ No secrets committed to git
- [ ] ✅ HTTPS enabled on all services (automatic with Vercel/Render)

## Monitoring & Maintenance

### Health Checks

**Backend Health Endpoint**:
```bash
curl https://YOUR-API-URL/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-28T12:00:00.000Z",
  "version": "1.0.0"
}
```

### Logs

**Vercel Logs**:
```
Vercel Dashboard → Project → Deployment → Functions/Logs
```

**Render Logs**:
```
Render Dashboard → Service → Logs tab
```

### Monitoring Tools (Recommended)

1. **Uptime Monitoring**: [UptimeRobot](https://uptimerobot.com/) (free)
   - Monitor health endpoint every 5 minutes
   - Get email/SMS alerts on downtime

2. **Error Tracking**: [Sentry](https://sentry.io/) (has free tier)
   - Tracks frontend and backend errors
   - Provides stack traces and user context

3. **Analytics**: [Vercel Analytics](https://vercel.com/analytics) (free)
   - Page views, performance metrics
   - Core Web Vitals

## Rollback Procedure

If deployment has issues:

### Vercel (Frontend)
1. Go to Vercel Dashboard → Project
2. Find previous successful deployment
3. Click "..." → "Promote to Production"
4. Previous version is live in seconds

### Render (Backend)
1. Go to Render Dashboard → Service
2. Click "Manual Deploy" tab
3. Find previous commit/deployment
4. Click "Redeploy"
5. Wait ~2-5 minutes for rollback

### Database (Emergency)
1. Render → Database → Backups
2. Select backup before issue occurred
3. Restore (creates new database)
4. Update DATABASE_URL in API service

**Important**: Always test in staging before deploying to production!

## Staging Environment (Optional)

To create a staging environment:

1. **Duplicate Render services**:
   - Create `tech-mgmt-db-staging`
   - Create `tech-mgmt-api-staging`
   - Use different JWT_SECRET

2. **Create Vercel preview deployment**:
   - Vercel automatically creates preview for each branch
   - Set `NEXT_PUBLIC_API_URL` to staging API

3. **Use git branches**:
   - `main` → production
   - `staging` → staging environment
   - `feature/*` → preview deployments

## Cost Estimate

### Free Tier
- Vercel: Free (hobby projects)
- Render: Free (with limitations: sleeps after 15min inactivity)
- Total: $0/month

**Limitations**:
- API sleeps after inactivity (cold starts)
- Limited database storage (1GB)
- Limited bandwidth

### Paid Tier (Recommended for Production)
- Vercel Pro: $20/month (optional, hobby tier usually sufficient)
- Render Starter API: $7/month (always on)
- Render Starter DB: $7/month (better performance, backups)
- Total: $14-34/month

**Benefits**:
- No cold starts
- Better performance
- Automatic backups
- More storage and bandwidth
- Support

## Need Help?

1. Check `DEPLOY_TO_VERCEL.md` troubleshooting section
2. Check service logs (Vercel/Render dashboards)
3. Review [Vercel Docs](https://vercel.com/docs)
4. Review [Render Docs](https://render.com/docs)

## Files Checklist

Ensure these files exist:

```
products/tech-management-helper/
├── DEPLOY_TO_VERCEL.md              ✅ Complete guide
├── DEPLOYMENT_QUICKSTART.md         ✅ Quick reference
├── DEPLOYMENT_FILES_README.md       ✅ This file
├── .env.production.example          ✅ Environment template
├── apps/
│   ├── web/
│   │   └── vercel.json             ✅ Vercel config
│   └── api/
│       └── render.yaml             ✅ Render config
```

All files ready? Start with `DEPLOYMENT_QUICKSTART.md` or `DEPLOY_TO_VERCEL.md`!

---

**Last Updated**: 2026-01-28
**Version**: 1.0.0
