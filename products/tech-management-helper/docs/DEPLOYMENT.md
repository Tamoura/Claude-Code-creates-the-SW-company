# Tech Management Helper - Deployment Guide

## Overview

This document provides comprehensive deployment instructions for Tech Management Helper v1.0.0.

## Architecture

- **Frontend**: Next.js 14 (Static + Server-Side Rendering)
- **Backend**: Fastify API
- **Database**: PostgreSQL 15+
- **Authentication**: JWT with session management

## Environment Variables

### Backend API (`/apps/api`)

Create a `.env` file or set these environment variables in your hosting platform:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/tech_management_helper

# Authentication
JWT_SECRET=your-secure-random-secret-here-min-32-chars
JWT_EXPIRY=7d

# Server
NODE_ENV=production
PORT=5001
HOST=0.0.0.0

# CORS (set to your frontend URL)
CORS_ORIGIN=https://your-frontend-domain.com
```

**Important Security Notes:**
- Generate a strong `JWT_SECRET` using: `openssl rand -base64 32`
- Never commit `.env` files to version control
- Use different secrets for production vs staging

### Frontend Web (`/apps/web`)

Create a `.env.local` or `.env.production` file:

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://your-api-domain.com

# Environment
NODE_ENV=production
```

## Recommended Deployment Platforms

### Option 1: Vercel + Render (Recommended)

**Frontend** (Vercel):
- Automatic Next.js optimization
- Global CDN
- Zero configuration

**Backend + Database** (Render):
- Native PostgreSQL support
- Easy API deployment
- Health checks included

### Option 2: Railway

**All-in-one** on Railway:
- PostgreSQL database
- Backend API service
- Frontend deployment

### Option 3: Self-Hosted

Requirements:
- Node.js 20+
- PostgreSQL 15+
- Reverse proxy (nginx/Caddy)
- PM2 or systemd for process management

## Deployment Steps

### Step 1: Database Setup

#### Option A: Render PostgreSQL

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "PostgreSQL"
3. Configure:
   - Name: `tech-management-helper-db`
   - Database: `tech_management_helper`
   - User: `tech_admin`
   - Region: Choose closest to your users
   - Plan: Free (development) or Starter (production)
4. Click "Create Database"
5. Copy the "External Database URL" (starts with `postgres://`)

#### Option B: Supabase

1. Go to [Supabase](https://supabase.com/)
2. Create new project
3. Copy connection string from Settings → Database
4. Use "Connection Pooling" URL for production

#### Option C: Neon

1. Go to [Neon](https://neon.tech/)
2. Create new project
3. Copy connection string
4. Neon provides automatic scaling

### Step 2: Backend API Deployment

#### Option A: Deploy to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - Name: `tech-management-helper-api`
   - Region: Same as database
   - Branch: `main` (or `release/tech-management-helper/v1.0.0`)
   - Root Directory: `products/tech-management-helper/apps/api`
   - Runtime: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
   - Plan: Free (development) or Starter (production)

5. Add Environment Variables:
   ```
   DATABASE_URL=<your-database-url-from-step-1>
   JWT_SECRET=<generate-with-openssl-rand-base64-32>
   NODE_ENV=production
   PORT=5001
   CORS_ORIGIN=https://your-app.vercel.app
   ```

6. Click "Create Web Service"

7. **Run Database Migrations**:
   - Once deployed, go to Shell tab
   - Run: `npm run db:migrate`
   - Verify: `npm run db:studio` (optional, for inspection)

#### Option B: Deploy to Railway

1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Create project: `railway init`
4. Link PostgreSQL: `railway add --plugin postgresql`
5. Set environment variables: `railway variables set KEY=value`
6. Deploy: `railway up --service api`

### Step 3: Frontend Deployment

#### Option A: Deploy to Vercel (Recommended)

1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Navigate to frontend:
   ```bash
   cd products/tech-management-helper/apps/web
   ```
4. Deploy:
   ```bash
   vercel --prod
   ```
5. Set environment variables in Vercel Dashboard:
   - Go to Settings → Environment Variables
   - Add `NEXT_PUBLIC_API_URL=https://your-api.render.com`

#### Option B: Manual Vercel Deployment

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your Git repository
4. Configure:
   - Framework Preset: Next.js
   - Root Directory: `products/tech-management-helper/apps/web`
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Add Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-api.render.com
   NODE_ENV=production
   ```
6. Click "Deploy"

#### Option C: Deploy to Netlify

1. Go to [Netlify](https://app.netlify.com/)
2. Click "Add new site" → "Import an existing project"
3. Configure:
   - Base directory: `products/tech-management-helper/apps/web`
   - Build command: `npm run build`
   - Publish directory: `.next`
4. Add environment variables in Site settings

### Step 4: Post-Deployment Verification

#### Health Check

```bash
# API Health Check
curl https://your-api.render.com/health

# Expected response:
{"status":"ok","timestamp":"2026-01-28T..."}
```

#### Test Authentication Flow

1. Visit your frontend URL: `https://your-app.vercel.app`
2. Navigate to Login page
3. Create a test user via API (since registration UI not yet implemented):

```bash
curl -X POST https://your-api.render.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePass123!",
    "fullName": "Admin User",
    "role": "ADMIN"
  }'
```

4. Login with the credentials
5. Verify you can access the dashboard

#### Test Risk Management

1. Login to the application
2. Navigate to "Risks" page
3. Click "Add Risk"
4. Create a test risk
5. Verify it appears in the risk register

### Step 5: Database Seeding (Optional)

To populate with test data:

```bash
# SSH into your API server (Render Shell or Railway CLI)
npm run db:seed
```

## Monitoring & Health

### Health Endpoint

The API exposes a health check at `GET /health`:

```json
{
  "status": "ok",
  "timestamp": "2026-01-28T12:00:00.000Z",
  "database": "connected",
  "version": "1.0.0"
}
```

### Recommended Monitoring Tools

- **Uptime**: [UptimeRobot](https://uptimerobot.com/) - Free uptime monitoring
- **Error Tracking**: [Sentry](https://sentry.io/) - Application error tracking
- **Logs**: Render/Railway built-in logs, or [Logtail](https://logtail.com/)
- **Performance**: [Vercel Analytics](https://vercel.com/analytics) (if using Vercel)

### Log Locations

**Render**:
- Dashboard → Your Service → Logs tab
- Real-time streaming available

**Vercel**:
- Dashboard → Your Project → Deployments → View Logs

**Railway**:
- Dashboard → Service → Logs tab

## Database Migrations

### Running Migrations in Production

```bash
# SSH to API server
cd products/tech-management-helper/apps/api
npm run db:migrate
```

### Creating New Migrations

```bash
# Development environment
cd products/tech-management-helper/apps/api
npx prisma migrate dev --name your_migration_name
```

### Rollback Strategy

1. Prisma doesn't support automatic rollbacks
2. Manual rollback required by writing a new migration
3. Always backup database before major migrations

## Backup & Recovery

### Database Backups

**Render**:
- Manual snapshots available in dashboard
- Automatic backups on paid plans

**Supabase**:
- Automatic daily backups
- Point-in-time recovery on Pro plan

**Self-Hosted**:
```bash
# Backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql $DATABASE_URL < backup_20260128_120000.sql
```

## Security Checklist

- [ ] Strong JWT_SECRET generated and set
- [ ] DATABASE_URL uses SSL (`?sslmode=require`)
- [ ] CORS_ORIGIN set to your frontend domain only
- [ ] NODE_ENV=production in all production environments
- [ ] No `.env` files committed to Git
- [ ] Database user has minimum required permissions
- [ ] API rate limiting enabled (future enhancement)
- [ ] HTTPS enforced on all endpoints
- [ ] Secrets rotated regularly (quarterly recommended)

## Scaling Considerations

### Current Architecture (v1.0.0)

- Single API instance
- Single database instance
- Suitable for: 0-10,000 users

### Future Scaling Options

**Horizontal Scaling**:
- Multiple API instances behind load balancer
- Connection pooling (PgBouncer)
- Redis for session management

**Database Scaling**:
- Read replicas for reporting queries
- Connection pooling
- Database indexing optimization

**Frontend**:
- Already scales automatically with Vercel CDN
- No additional work needed

## Troubleshooting

### Common Issues

**Issue**: Cannot connect to database
```bash
# Check connection string format
echo $DATABASE_URL
# Should be: postgresql://user:pass@host:5432/dbname?sslmode=require

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

**Issue**: CORS errors in browser
```bash
# Verify CORS_ORIGIN matches your frontend URL exactly
# Include protocol: https://your-app.vercel.app
# No trailing slash
```

**Issue**: 401 Unauthorized on API calls
```bash
# Check NEXT_PUBLIC_API_URL is set correctly in frontend
# Verify JWT token is being sent in Authorization header
```

**Issue**: Database migrations fail
```bash
# Check database connection
npm run db:studio

# Reset and re-run (CAUTION: destroys data)
npx prisma migrate reset
npm run db:migrate
```

## Cost Estimates

### Free Tier (Development/MVP)

- **Database**: Render PostgreSQL Free (1GB, expires after 90 days)
- **Backend**: Render Free (spins down after inactivity)
- **Frontend**: Vercel Free (100GB bandwidth)
- **Total**: $0/month

### Production (Small Team)

- **Database**: Render Starter ($7/month) or Supabase Pro ($25/month)
- **Backend**: Render Starter ($7/month)
- **Frontend**: Vercel Pro ($20/month)
- **Monitoring**: Sentry Free + UptimeRobot Free
- **Total**: $14-52/month

### Production (Growing Team)

- **Database**: Render Standard ($22/month) or dedicated instance
- **Backend**: Multiple instances + load balancer ($50+/month)
- **Frontend**: Vercel Pro ($20/month)
- **Monitoring**: Sentry Team ($29/month)
- **Total**: $100-200/month

## Support & Resources

- **Documentation**: `products/tech-management-helper/docs/`
- **API Reference**: `products/tech-management-helper/docs/API.md`
- **GitHub Issues**: [Repository Issues](https://github.com/your-org/repo/issues)
- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Prisma Docs**: https://www.prisma.io/docs

## Next Steps

After successful deployment:

1. Set up monitoring and alerts
2. Configure automated backups
3. Implement rate limiting (future sprint)
4. Add custom domain (if not using defaults)
5. Set up staging environment for testing
6. Document runbook for common operations
7. Create deployment automation with CI/CD

---

**Version**: 1.0.0
**Last Updated**: 2026-01-28
**Maintained By**: DevOps Engineer
