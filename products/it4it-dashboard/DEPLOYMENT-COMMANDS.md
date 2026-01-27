# IT4IT Dashboard - Deployment Commands Reference

**Quick reference for all deployment-related commands**

---

## Pre-Deployment Verification

### Test Everything

```bash
# Navigate to app directory
cd products/it4it-dashboard/apps/web

# Install dependencies (if needed)
npm install

# Run all tests
npm test

# Generate coverage report
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Check for linting errors
npm run lint

# Build for production
npm run build
```

### Expected Results

```bash
# Tests
✓ 234 tests passing
✓ Coverage: 98.78%

# Build
✓ Compiled successfully
✓ 24 routes generated
✓ .next directory created
```

---

## Deployment Methods

### Method 1: Vercel Dashboard (Recommended)

**No commands needed - use browser**:

1. Go to: https://vercel.com/new
2. Import repository
3. Configure:
   - Root: `products/it4it-dashboard/apps/web`
   - Framework: Next.js (auto-detected)
4. Click "Deploy"

---

### Method 2: Vercel CLI

#### One-Time Setup

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login
# Opens browser for authentication
```

#### Deploy to Production

```bash
# Navigate to app directory
cd products/it4it-dashboard/apps/web

# Deploy to production
vercel --prod

# Follow interactive prompts
# Output: Production URL
```

#### Other Vercel CLI Commands

```bash
# Deploy to preview (not production)
vercel

# List all deployments
vercel ls

# Get deployment details
vercel inspect [deployment-url]

# View logs
vercel logs [deployment-url]

# Remove deployment
vercel rm [deployment-url]

# Rollback to previous deployment
vercel rollback [deployment-url]

# Open project in browser
vercel open
```

---

### Method 3: GitHub Actions (Automated)

**Deployment happens automatically on push**:

```bash
# Make changes
git add .
git commit -m "feat(it4it-dashboard): new feature"
git push origin feature/gpu-calculator-core-features

# GitHub Actions automatically:
# 1. Runs tests
# 2. Builds application
# 3. Deploys to Vercel (if configured)
```

**View workflow status**:
```bash
# Via GitHub CLI (if installed)
gh run list --workflow=deploy-it4it-dashboard.yml

# Via browser
# https://github.com/[your-repo]/actions
```

---

## Post-Deployment Verification

### Quick Health Check

```bash
# Check if site is live (replace with your URL)
curl -I https://it4it-dashboard-xyz.vercel.app

# Expected: HTTP/2 200
```

### Full Verification

```bash
# Using curl to check all key routes
BASE_URL="https://it4it-dashboard-xyz.vercel.app"

# Homepage (redirects to /dashboard)
curl -L -I $BASE_URL

# Executive Dashboard
curl -I $BASE_URL/dashboard

# Value Stream Dashboards
curl -I $BASE_URL/d2c
curl -I $BASE_URL/r2f
curl -I $BASE_URL/r2d
curl -I $BASE_URL/s2p

# All should return: HTTP/2 200
```

---

## Rollback Commands

### Via Vercel Dashboard

**No commands needed**:
1. Go to: https://vercel.com/dashboard
2. Select project → Deployments
3. Find previous deployment
4. Click "..." → "Promote to Production"

### Via Vercel CLI

```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback [deployment-url]

# Example:
vercel rollback https://it4it-dashboard-abc123.vercel.app
```

### Via Git Revert

```bash
# Revert last commit
git revert HEAD

# Push to trigger re-deployment
git push origin feature/gpu-calculator-core-features

# Vercel auto-deploys reverted version in 2-3 minutes
```

---

## Monitoring Commands

### Vercel Logs

```bash
# View deployment logs
vercel logs [deployment-url]

# Follow logs in real-time
vercel logs [deployment-url] --follow

# View only errors
vercel logs [deployment-url] --level=error
```

### Check Build Status

```bash
# Via Vercel CLI
vercel inspect [deployment-url]

# Shows:
# - Build status
# - Deployment time
# - Environment variables
# - Build logs
```

---

## Local Development Commands

### Development Server

```bash
# Start dev server (port 3100)
npm run dev

# Access at: http://localhost:3100
```

### Production Build Testing

```bash
# Build for production
npm run build

# Start production server locally
npm run start

# Access at: http://localhost:3100
# Test production build before deploying
```

### Clean Build

```bash
# Remove build artifacts
rm -rf .next

# Remove node_modules (if needed)
rm -rf node_modules
npm install

# Fresh build
npm run build
```

---

## Git Commands for Deployment

### Prepare Deployment

```bash
# Check status
git status

# Ensure on correct branch
git branch --show-current
# Should be: feature/gpu-calculator-core-features

# Pull latest changes
git pull origin feature/gpu-calculator-core-features

# Check for uncommitted changes
git diff
```

### Commit Changes

```bash
# Stage changes
git add .

# Commit with conventional commit format
git commit -m "feat(it4it-dashboard): describe changes"

# Push to trigger deployment (if using GitHub Actions)
git push origin feature/gpu-calculator-core-features
```

### Tag Release (Optional)

```bash
# Create release tag
git tag -a v0.1.0 -m "Release version 0.1.0 - MVP"

# Push tag
git push origin v0.1.0

# List all tags
git tag -l
```

---

## Environment Management

### View Current Environment

```bash
# Via Vercel CLI
vercel env ls

# Shows all environment variables for all environments
```

### Add Environment Variable

```bash
# Via Vercel CLI
vercel env add NEXT_PUBLIC_API_URL

# Follow prompts to set value and environment (production/preview/development)
```

### Pull Environment Variables Locally

```bash
# Download env vars to .env.local
vercel env pull .env.local

# Use for local development matching production
```

---

## Troubleshooting Commands

### Build Fails

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try build again
npm run build
```

### TypeScript Errors

```bash
# Check TypeScript errors
npm run lint

# Type check only (no linting)
npx tsc --noEmit
```

### Test Failures

```bash
# Run tests with verbose output
npm test -- --verbose

# Run single test file
npm test -- path/to/test.test.tsx

# Update snapshots (if needed)
npm test -- -u
```

### Performance Issues

```bash
# Analyze bundle size
npm run build
# Check output for bundle sizes

# Run Lighthouse audit (requires Chrome)
npx lighthouse https://it4it-dashboard-xyz.vercel.app --view
```

---

## GitHub Actions Commands

### Trigger Manual Deployment

```bash
# Via GitHub CLI
gh workflow run deploy-it4it-dashboard.yml

# Via browser
# Go to: Actions → Deploy IT4IT Dashboard → Run workflow
```

### View Workflow Status

```bash
# List recent workflow runs
gh run list --workflow=deploy-it4it-dashboard.yml

# View specific run
gh run view [run-id]

# Watch run in real-time
gh run watch
```

### Cancel Running Workflow

```bash
# Cancel specific run
gh run cancel [run-id]

# Or via browser: Actions → Run → Cancel workflow
```

---

## Useful Aliases (Optional)

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# Navigate to app directory
alias it4it="cd /path/to/products/it4it-dashboard/apps/web"

# Common commands
alias it4it-dev="it4it && npm run dev"
alias it4it-test="it4it && npm test"
alias it4it-build="it4it && npm run build"
alias it4it-deploy="it4it && vercel --prod"

# Deployment verification
alias it4it-check="curl -I https://it4it-dashboard-xyz.vercel.app"
```

---

## Quick Reference Matrix

| Task | Command | Time |
|------|---------|------|
| Run tests | `npm test` | 30s |
| Build locally | `npm run build` | 30s |
| Deploy (CLI) | `vercel --prod` | 3min |
| Deploy (Dashboard) | Browser UI | 5min |
| Rollback (CLI) | `vercel rollback [url]` | 30s |
| Rollback (Git) | `git revert HEAD && git push` | 3min |
| View logs | `vercel logs [url]` | Instant |
| Health check | `curl -I [url]` | Instant |

---

## Emergency Procedures

### Complete Site Down

```bash
# 1. Quick rollback via Vercel CLI
vercel ls  # Find previous deployment
vercel rollback [previous-deployment-url]

# 2. Verify rollback worked
curl -I https://it4it-dashboard-xyz.vercel.app
# Expected: HTTP/2 200

# 3. Investigate issue in failed deployment logs
vercel logs [failed-deployment-url] --level=error
```

### Slow Performance

```bash
# 1. Check Vercel status
curl -I https://vercel-status.com

# 2. Run Lighthouse audit
npx lighthouse [your-url] --view

# 3. Check bundle size in build output
npm run build
# Look for unusually large chunks

# 4. Review Vercel Speed Insights
# Browser: Vercel Dashboard → Project → Speed Insights
```

---

## Documentation Links

- **Quick Deploy**: [DEPLOY-NOW.md](./DEPLOY-NOW.md)
- **Full Guide**: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- **Checklist**: [PRODUCTION-CHECKLIST.md](./PRODUCTION-CHECKLIST.md)
- **Summary**: [DEPLOYMENT-SUMMARY.md](./DEPLOYMENT-SUMMARY.md)

---

**Last Updated**: 2026-01-27
**Version**: 1.0
**Maintained By**: DevOps Engineer
