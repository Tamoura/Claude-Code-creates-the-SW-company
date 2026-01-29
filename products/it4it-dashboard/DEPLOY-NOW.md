# IT4IT Dashboard - Deploy Now Guide

**Quick deployment instructions for the IT4IT Dashboard MVP**

---

## TL;DR - Deploy in 5 Minutes

### Prerequisites
- GitHub account
- Vercel account (free tier: https://vercel.com/signup)

### Steps

1. **Import to Vercel**
   ```
   Go to: https://vercel.com/new
   Click: Import Git Repository
   Select: Your GitHub repository
   Framework: Next.js (auto-detected)
   Root Directory: products/it4it-dashboard/apps/web
   Click: Deploy
   ```

2. **Wait for Deployment**
   - Build time: 2-3 minutes
   - You'll get a URL: `https://it4it-dashboard-xyz.vercel.app`

3. **Verify**
   - Open the URL
   - Check all dashboards load (D2C, R2F, R2D, S2P)
   - Done!

---

## Detailed Instructions

### Option 1: Vercel Dashboard (Recommended - No CLI Needed)

#### Initial Setup

1. **Create Vercel Account** (if you don't have one)
   - Go to: https://vercel.com/signup
   - Sign up with GitHub (easiest)

2. **Import Project**
   - Click "Add New..." → "Project"
   - Select your GitHub repository
   - Vercel will ask for permissions → Grant access

3. **Configure Project**
   ```
   Project Name: it4it-dashboard
   Framework Preset: Next.js (detected automatically)
   Root Directory: products/it4it-dashboard/apps/web
   Build Settings:
     - Build Command: npm run build (detected)
     - Output Directory: .next (detected)
     - Install Command: npm install (detected)
   Environment Variables: (leave empty for MVP)
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will:
     - Clone repository
     - Install dependencies
     - Run build
     - Deploy to CDN
   - Time: ~2-3 minutes

5. **Get Production URL**
   - URL format: `https://it4it-dashboard-[random].vercel.app`
   - Copy this URL
   - Update in: `products/it4it-dashboard/README.md`

#### Future Deployments

After initial setup, every push to `feature/gpu-calculator-core-features` automatically deploys:

```bash
git add .
git commit -m "feat(it4it-dashboard): new feature"
git push origin feature/gpu-calculator-core-features
# Vercel auto-deploys in 2-3 minutes
```

---

### Option 2: Vercel CLI (For Manual Control)

#### One-Time Setup

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   # Opens browser, authorize with GitHub
   ```

#### Deploy

```bash
# Navigate to app directory
cd products/it4it-dashboard/apps/web

# Deploy to production
vercel --prod

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? [Your account]
# - Link to existing project? No (first time)
# - Project name? it4it-dashboard
# - Directory? ./ (confirm)
# - Override build settings? No (auto-detected)

# Output:
# ✓ Production: https://it4it-dashboard-xyz.vercel.app [2m 15s]
```

---

### Option 3: GitHub Actions (Automated CI/CD)

**Status**: Workflow created but requires Vercel configuration

#### Setup

1. **Configure Vercel GitHub Integration** (Easiest)
   - Go to: https://vercel.com/dashboard
   - Import project (see Option 1)
   - Vercel automatically detects pushes
   - No secrets needed

   OR

2. **Configure Deploy Hook** (If you need custom workflow)
   - Vercel Dashboard → Project → Settings → Git
   - Create "Deploy Hook"
   - Copy URL
   - GitHub → Repository → Settings → Secrets
   - Add secret: `VERCEL_DEPLOY_HOOK` = [URL]

3. **Trigger Deployment**
   ```bash
   git push origin feature/gpu-calculator-core-features
   # GitHub Actions runs automatically
   # Tests → Build → Deploy to Vercel
   ```

#### Workflow Status

The workflow `.github/workflows/deploy-it4it-dashboard.yml` includes:
- ✅ Run linter
- ✅ Run unit tests (234 tests)
- ✅ Generate coverage report
- ✅ Build application
- ✅ Run E2E tests (Playwright)
- ⏸️ Deploy to Vercel (needs configuration)

---

## Verification

### Quick Checks

After deployment, verify these URLs work:

1. **Homepage**: `https://[your-url].vercel.app/`
   - Should redirect to `/dashboard`

2. **Executive Dashboard**: `/dashboard`
   - Shows overview of 4 value streams

3. **Value Stream Dashboards**:
   - D2C: `/d2c`
   - R2F: `/r2f`
   - R2D: `/r2d`
   - S2P: `/s2p`

4. **Detail Pages** (click on any item):
   - Incident: `/d2c/incidents/[id]`
   - Request: `/r2f/my-requests/[id]`
   - Release: `/r2d/releases/[id]`
   - Demand: `/s2p/demands/[id]`

### Full Verification

See `PRODUCTION-CHECKLIST.md` for comprehensive verification steps.

---

## Troubleshooting

### Build Fails

**Error**: `Build failed with exit code 1`

**Solution**:
```bash
# Test build locally first
cd products/it4it-dashboard/apps/web
npm install
npm run build

# If build fails, check:
npm run lint  # Fix TypeScript errors
npm test      # Ensure tests pass
```

### Deployment Succeeds but Site is Blank

**Error**: White screen or "Application Error"

**Solution**:
1. Check Vercel deployment logs for errors
2. Check browser console for JavaScript errors
3. Verify `vercel.json` configuration is correct

### 404 Errors on Routes

**Error**: Direct URLs return 404

**Solution**:
- Vercel should auto-detect Next.js routing
- Verify `vercel.json` has `"framework": "nextjs"`
- Check route exists: `app/[route]/page.tsx`

### Slow Performance

**Error**: Lighthouse score < 90

**Solution**:
1. Check bundle size: `npm run build`
2. Verify Vercel region (should be close to users)
3. Review Speed Insights in Vercel dashboard

---

## Post-Deployment

### Required Tasks

1. **Update Documentation**
   ```bash
   # Update README.md with production URL
   cd products/it4it-dashboard
   # Edit README.md: Add production URL
   git add README.md
   git commit -m "docs(it4it-dashboard): add production URL"
   git push
   ```

2. **Notify Stakeholders**
   - CEO
   - QA Engineer
   - Frontend Engineer
   - Share production URL

3. **Monitor for 30 Minutes**
   - Watch Vercel logs for errors
   - Check analytics for traffic
   - Verify no issues reported

### Optional Tasks

1. **Custom Domain** (Optional)
   ```
   Vercel Dashboard → Project → Settings → Domains
   Add: dashboard.connectsw.com
   Configure DNS: CNAME → cname.vercel-dns.com
   Wait: 5-60 minutes for propagation
   ```

2. **Uptime Monitoring** (Optional)
   - UptimeRobot: https://uptimerobot.com
   - Pingdom: https://pingdom.com
   - Monitor URL every 5 minutes
   - Alert on downtime

3. **Analytics** (Optional)
   - Vercel Analytics (built-in)
   - Google Analytics (add to app/layout.tsx)
   - Plausible Analytics (privacy-friendly)

---

## Rollback

If something goes wrong:

### Via Vercel Dashboard (Fastest)

1. Go to: https://vercel.com/dashboard
2. Select: it4it-dashboard project
3. Click: "Deployments" tab
4. Find: Previous working deployment
5. Click: "..." → "Promote to Production"
6. Confirm: "Promote"

**Time to rollback**: 10-30 seconds

### Via Git

```bash
git revert HEAD
git push origin feature/gpu-calculator-core-features
# Vercel auto-deploys reverted version in 2-3 minutes
```

---

## Configuration Files

All deployment configuration files are created and ready:

| File | Purpose | Location |
|------|---------|----------|
| `vercel.json` | Vercel configuration | `apps/web/vercel.json` |
| `deploy-it4it-dashboard.yml` | GitHub Actions workflow | `.github/workflows/` |
| `DEPLOYMENT.md` | Comprehensive deployment guide | `docs/DEPLOYMENT.md` |
| `PRODUCTION-CHECKLIST.md` | Pre/post deployment checklist | Root directory |
| `DEPLOY-NOW.md` | Quick deployment guide (this file) | Root directory |

---

## Getting Help

### Vercel Support

- **Docs**: https://vercel.com/docs
- **Status**: https://vercel-status.com
- **Support**: https://vercel.com/support
- **Community**: https://github.com/vercel/next.js/discussions

### Internal Support

- **DevOps Engineer**: Deployment issues
- **QA Engineer**: Testing verification
- **Frontend Engineer**: Application bugs
- **Orchestrator**: Escalation

---

## Summary

**Recommended Approach**: Option 1 (Vercel Dashboard)

**Time to Deploy**: 5 minutes (initial) + 2-3 minutes (build)

**Ongoing Deployments**: Automatic on every push to main branch

**Cost**: $0/month (Vercel free tier)

**Next Steps**:
1. Deploy via Vercel Dashboard
2. Verify all routes work
3. Update README with production URL
4. Notify stakeholders
5. Monitor for issues

---

**Ready to deploy?** Start with Option 1 above!

---

*Last Updated*: 2026-01-27
*Version*: 1.0
*Maintained By*: DevOps Engineer
