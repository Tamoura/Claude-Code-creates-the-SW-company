# IT4IT Dashboard - Production Deployment Guide

## Overview

The IT4IT Dashboard is a **frontend-only Next.js application** with mock data. It requires no backend services, databases, or environment variables for the MVP version.

**Deployment Platform**: Vercel (recommended for Next.js applications)

---

## Prerequisites

### Required
- GitHub account with access to the repository
- Vercel account (free tier is sufficient)
- Node.js 20+ (for local verification)

### Optional
- Vercel CLI (`npm install -g vercel`) for manual deployments

---

## Deployment Platform: Vercel

**Why Vercel?**
- Zero-configuration deployment for Next.js
- Automatic HTTPS with SSL certificates
- Global CDN for optimal performance
- Preview deployments for every PR
- Built-in analytics and monitoring
- Free tier sufficient for MVP

**Alternatives Considered**:
- **Netlify**: Good alternative, slightly more configuration needed
- **Docker + Self-Hosted**: Overkill for a static frontend app
- **AWS S3/CloudFront**: More complex setup, less Next.js optimization

---

## Environment Variables

**For MVP**: No environment variables required.

The application uses:
- Mock data generators (no API calls)
- Client-side state management (Zustand)
- No authentication or external services

**For Future Releases** (when backend is added):
```bash
NEXT_PUBLIC_API_URL=https://api.it4it-dashboard.com
NEXT_PUBLIC_ANALYTICS_ID=
```

---

## Deployment Steps

### Option 1: Automated Deployment (Recommended)

#### Initial Setup

1. **Import Project to Vercel**:
   ```bash
   # Visit: https://vercel.com/new
   # Click "Import Git Repository"
   # Select: ConnectSW/it4it-dashboard (or your repo name)
   # Framework Preset: Next.js (auto-detected)
   # Root Directory: products/it4it-dashboard/apps/web
   ```

2. **Configure Build Settings**:
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)
   - **Development Command**: `npm run dev` (auto-detected)

3. **Deploy**:
   - Click "Deploy"
   - Wait 2-3 minutes for first build
   - Vercel will provide a production URL: `https://it4it-dashboard-xyz.vercel.app`

#### Continuous Deployment

Once set up, every push to the main branch automatically triggers deployment:

```bash
# Make changes
git add .
git commit -m "feat(it4it-dashboard): add new feature"
git push origin feature/gpu-calculator-core-features

# Vercel automatically:
# 1. Detects the push
# 2. Runs build (npm run build)
# 3. Runs tests (if configured)
# 4. Deploys to production (main branch) or preview (other branches)
# 5. Comments on PR with preview URL
```

### Option 2: Manual Deployment via Vercel CLI

```bash
# Install Vercel CLI (one-time)
npm install -g vercel

# Navigate to app directory
cd products/it4it-dashboard/apps/web

# Login to Vercel (one-time)
vercel login

# Deploy to production
vercel --prod

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your Vercel account
# - Link to existing project? No (first time) or Yes (subsequent)
# - Project name? it4it-dashboard
# - Directory? ./ (current directory)
# - Build settings? Auto-detected (confirm)
```

**Expected Output**:
```
✓ Production: https://it4it-dashboard-xyz.vercel.app [2m 15s]
```

### Option 3: GitHub Actions (CI/CD Pipeline)

A GitHub Actions workflow is provided at `.github/workflows/deploy-it4it-dashboard.yml`.

**How it works**:
- Triggers on push to `feature/gpu-calculator-core-features` branch
- Runs all tests (unit + E2E)
- Builds the application
- Deploys to Vercel using deploy hooks

**Setup**:
1. Go to Vercel project settings
2. Copy "Deploy Hook" URL
3. Add to GitHub repository secrets as `VERCEL_DEPLOY_HOOK`
4. Push to trigger deployment

---

## Verification Steps

After deployment, verify the application is working:

### 1. Basic Health Check
```bash
# Check homepage loads
curl -I https://it4it-dashboard-xyz.vercel.app

# Expected: HTTP 200 OK
```

### 2. Manual Verification Checklist

Visit the deployed URL and test:

- [ ] Homepage loads (`/` redirects to `/dashboard`)
- [ ] Executive dashboard displays (`/dashboard`)
- [ ] All 4 value streams accessible:
  - [ ] D2C dashboard (`/d2c`)
  - [ ] R2F dashboard (`/r2f`)
  - [ ] R2D dashboard (`/r2d`)
  - [ ] S2P dashboard (`/s2p`)
- [ ] Navigation works (sidebar, breadcrumbs)
- [ ] Charts render correctly
- [ ] Tables display data
- [ ] Detail pages load (click on items)
- [ ] No console errors in browser DevTools
- [ ] Responsive at 1024px+ width

### 3. Performance Check

Use Lighthouse (Chrome DevTools):
```
1. Open deployed URL in Chrome
2. Open DevTools (F12)
3. Navigate to "Lighthouse" tab
4. Run audit (Desktop mode)
5. Verify scores:
   - Performance: > 90
   - Accessibility: > 90
   - Best Practices: > 90
   - SEO: > 90
```

### 4. Cross-Browser Testing

Test in latest versions of:
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

---

## Rollback Procedure

### Via Vercel Dashboard

1. Go to Vercel dashboard: https://vercel.com/dashboard
2. Select "it4it-dashboard" project
3. Navigate to "Deployments" tab
4. Find the previous working deployment
5. Click the three dots menu (...)
6. Select "Promote to Production"
7. Confirm promotion

**Time to rollback**: 10-30 seconds

### Via Vercel CLI

```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>
```

### Via Git

```bash
# Revert to previous commit
git revert HEAD
git push origin feature/gpu-calculator-core-features

# Vercel will auto-deploy the reverted version
```

---

## Monitoring & Health Checks

### Vercel Built-in Monitoring

Vercel provides:
- **Analytics**: Traffic, top pages, user metrics
- **Speed Insights**: Real user performance metrics
- **Deployment Logs**: Build and runtime logs
- **Alerts**: Email notifications for deployment failures

**Access**: Vercel Dashboard > Project > Analytics/Logs

### Custom Monitoring (Future)

For production monitoring beyond Vercel:

1. **Error Tracking**: Add Sentry
   ```bash
   npm install @sentry/nextjs
   ```

2. **Analytics**: Add Google Analytics or Plausible
   ```bash
   # Add tracking script to app/layout.tsx
   ```

3. **Uptime Monitoring**: Use UptimeRobot or Pingdom
   - Monitor URL: https://it4it-dashboard-xyz.vercel.app
   - Check interval: 5 minutes
   - Alert: Email/SMS on downtime

### Health Check Endpoint (Future Enhancement)

Create `/app/api/health/route.ts`:
```typescript
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
  });
}
```

---

## Post-Deployment Tasks

### Immediate (Within 1 Hour)

- [ ] Verify all routes work (see Verification Checklist)
- [ ] Monitor Vercel deployment logs for errors
- [ ] Test on multiple browsers
- [ ] Share production URL with stakeholders

### Within 24 Hours

- [ ] Set up custom domain (if applicable)
  - Vercel Dashboard > Project > Settings > Domains
  - Add CNAME record: `dashboard.connectsw.com` → `cname.vercel-dns.com`
- [ ] Configure SSL certificate (automatic via Vercel)
- [ ] Set up uptime monitoring (UptimeRobot)
- [ ] Document production URL in README

### Within 1 Week

- [ ] Review Vercel Analytics for usage patterns
- [ ] Review Speed Insights for performance bottlenecks
- [ ] Collect user feedback
- [ ] Plan next iteration based on feedback

---

## Custom Domain Setup (Optional)

### Step 1: Add Domain in Vercel

1. Vercel Dashboard > Project > Settings > Domains
2. Click "Add Domain"
3. Enter domain: `dashboard.connectsw.com`
4. Vercel will provide DNS records to add

### Step 2: Configure DNS

Add these records to your DNS provider:

```
Type: CNAME
Name: dashboard
Value: cname.vercel-dns.com
```

### Step 3: Wait for Propagation

- DNS propagation: 5 minutes - 48 hours
- SSL certificate: Automatic (5-10 minutes)
- Verify: `https://dashboard.connectsw.com`

---

## Troubleshooting

### Build Fails on Vercel

**Issue**: Build fails with TypeScript errors

**Solution**:
```bash
# Test build locally first
cd products/it4it-dashboard/apps/web
npm run build

# Fix TypeScript errors
npm run lint

# Commit and push
git add .
git commit -m "fix(it4it-dashboard): resolve TypeScript errors"
git push
```

### Deployment Succeeds but Site is Blank

**Issue**: White screen or "Application error"

**Solution**:
1. Check Vercel deployment logs for runtime errors
2. Verify `next.config.ts` is correct
3. Check browser console for JavaScript errors
4. Verify all routes exist in `app/` directory

### Routes Return 404

**Issue**: Direct URLs (e.g., `/d2c/incidents`) return 404

**Solution**:
- Vercel auto-configures Next.js routing
- If issue persists, check `vercel.json` has correct framework setting
- Verify route exists: `app/d2c/incidents/page.tsx`

### Performance Issues

**Issue**: Slow page loads or low Lighthouse scores

**Solution**:
1. Check bundle size: `npm run build` (should be < 500KB)
2. Optimize images (use Next.js `<Image>` component)
3. Enable Vercel Speed Insights
4. Review and lazy-load heavy components

### CORS Errors (Future, when backend is added)

**Issue**: API calls fail with CORS errors

**Solution**:
```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};
```

---

## Security Considerations

### Current Security Measures

1. **HTTPS**: Automatic via Vercel SSL
2. **Security Headers**: Configured in `vercel.json`
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - X-XSS-Protection: 1; mode=block
   - Referrer-Policy: strict-origin-when-cross-origin
3. **No Secrets**: No API keys or sensitive data in frontend code
4. **Dependency Scanning**: Dependabot enabled in GitHub

### Future Security Enhancements

When backend is added:

1. **Authentication**: Implement user authentication
2. **CSRF Protection**: Add CSRF tokens for API calls
3. **Rate Limiting**: Implement at API level
4. **Content Security Policy**: Add CSP headers
5. **Secrets Management**: Use Vercel environment variables

---

## Cost Estimation

### Vercel Free Tier (Current)

**Included**:
- 100 GB bandwidth/month
- Unlimited deployments
- Automatic HTTPS
- Preview deployments
- Analytics
- Speed Insights

**Cost**: $0/month

**Sufficient for**: MVP with moderate traffic (< 10,000 visits/month)

### Vercel Pro Tier (If Needed)

**Included**:
- 1 TB bandwidth/month
- Password protection
- Advanced analytics
- Priority support
- Custom environments

**Cost**: $20/month

**Upgrade when**: Traffic > 10,000 visits/month or need password protection

---

## Deployment Checklist

Use this checklist for each production deployment:

### Pre-Deployment

- [ ] All tests passing locally (`npm test`)
- [ ] E2E tests passing (`npm run test:e2e`)
- [ ] Build successful locally (`npm run build`)
- [ ] No TypeScript errors (`npm run lint`)
- [ ] Code reviewed (if PR)
- [ ] QA approved
- [ ] CEO approved

### Deployment

- [ ] Deploy to Vercel (automatic or manual)
- [ ] Monitor deployment logs for errors
- [ ] Wait for build to complete (2-3 minutes)
- [ ] Verify deployment succeeded (green checkmark)

### Verification

- [ ] Homepage loads
- [ ] All 4 value streams accessible
- [ ] No console errors
- [ ] Performance acceptable (Lighthouse > 90)
- [ ] Cross-browser tested

### Post-Deployment

- [ ] Monitor for 30 minutes (check logs)
- [ ] Update documentation with deployment date
- [ ] Notify stakeholders
- [ ] Create release notes (if applicable)

### Rollback (If Issues)

- [ ] Identify issue in Vercel logs
- [ ] Rollback to previous deployment
- [ ] Document issue
- [ ] Create bug report
- [ ] Fix issue in new PR

---

## Contact & Support

### Vercel Support

- **Dashboard**: https://vercel.com/dashboard
- **Documentation**: https://vercel.com/docs
- **Support**: https://vercel.com/support
- **Status**: https://vercel-status.com

### Internal Support

- **DevOps Engineer**: Deployment issues
- **QA Engineer**: Testing verification
- **Frontend Engineer**: Application bugs
- **Orchestrator**: Escalation and coordination

---

## Appendix

### Vercel Configuration Reference

See `products/it4it-dashboard/apps/web/vercel.json` for complete configuration.

### GitHub Actions Workflow

See `.github/workflows/deploy-it4it-dashboard.yml` for CI/CD pipeline.

### Production URL

**Current**: `https://it4it-dashboard-xyz.vercel.app` (update after deployment)
**Custom Domain** (future): `https://dashboard.connectsw.com`

### Deployment History

| Date | Version | Deployed By | Status | Notes |
|------|---------|-------------|--------|-------|
| 2026-01-27 | 0.1.0 | DevOps Engineer | Pending | Initial MVP deployment |

---

*Last Updated*: 2026-01-27
*Document Version*: 1.0
*Maintained By*: DevOps Engineer
