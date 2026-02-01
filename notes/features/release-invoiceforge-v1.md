# InvoiceForge v1.0.0 Release - Production Deployment

## Branch
`release/invoiceforge/v1.0.0`

## Summary
Set up production deployment infrastructure for InvoiceForge MVP.

## What was done

### Files created
- `products/invoiceforge/render.yaml` - Render Blueprint for API + DB
- `products/invoiceforge/apps/web/vercel.json` - Vercel configuration
- `.github/workflows/invoiceforge-deploy.yml` - CD pipeline
- `products/invoiceforge/docs/DEPLOYMENT.md` - Full deployment guide
- `products/invoiceforge/apps/api/.env.production.example`
- `products/invoiceforge/apps/web/.env.production.example`

### Files modified
- `products/invoiceforge/Dockerfile` - Added labels, migration support
- `.github/workflows/invoiceforge-ci.yml` - Added release branch trigger
- `products/invoiceforge/apps/api/src/modules/health/handlers.ts` - Added version field
- `products/invoiceforge/apps/api/tests/health.test.ts` - Test for version field

## Architecture
- Backend: Render (Docker web service + PostgreSQL)
- Frontend: Vercel (Next.js)
- CI/CD: GitHub Actions (test -> deploy on main push)

## Required GitHub Secrets
- RENDER_DEPLOY_HOOK_INVOICEFORGE
- VERCEL_TOKEN
- VERCEL_ORG_ID
- VERCEL_PROJECT_ID_INVOICEFORGE

## Required Render Manual Env Vars
- ANTHROPIC_API_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- APP_URL
