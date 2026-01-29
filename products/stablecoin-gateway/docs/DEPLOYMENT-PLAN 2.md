# Stablecoin Gateway - 3-Day Deployment Plan

**Approved By**: CEO
**Approval Date**: 2026-01-28
**Target Launch**: 2026-01-31 (3 days)
**Launch Type**: Private Beta (10 merchants)

---

## Day 1: Environment Setup (Today - 2 hours)

### Step 1: Generate Production Secrets (10 minutes)

```bash
# 1. Generate JWT Secret (64 bytes)
openssl rand -hex 64
# Copy output → JWT_SECRET

# 2. Generate Webhook Secret (32 bytes)
openssl rand -hex 32
# Copy output → WEBHOOK_SECRET

# 3. Create Hot Wallet
# Option A: Use MetaMask to create new wallet, export private key
# Option B: Generate programmatically:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Import to MetaMask, fund with $100 MATIC (Polygon) or ETH
```

**Save these securely** - you'll need them for environment variables.

---

### Step 2: Choose Deployment Platform (5 minutes)

**Recommended**: Railway.app (easiest for MVP)

| Platform | Pros | Cons | Monthly Cost |
|----------|------|------|--------------|
| **Railway** | • One-click deploy<br>• Auto-scaling<br>• Encrypted env vars<br>• Free PostgreSQL | • $5/month minimum | **$20/month** |
| **Render** | • Free PostgreSQL<br>• Auto-scaling<br>• Good DX | • Slower cold starts | **$25/month** |
| **AWS ECS** | • Full control<br>• Scalable<br>• Enterprise-grade | • Complex setup<br>• Requires AWS expertise | **$50/month** |
| **Fly.io** | • Global edge<br>• Fast deploys | • Newer platform | **$15/month** |

**Decision**: _____________ (Railway recommended)

---

### Step 3: Set Up Infrastructure (45 minutes)

#### A. Database (PostgreSQL)

**Railway**:
```bash
# 1. Create Railway account: https://railway.app
# 2. New Project → Add PostgreSQL
# 3. Copy DATABASE_URL from environment variables
```

**Render**:
```bash
# 1. Create Render account: https://render.com
# 2. New PostgreSQL → Free tier
# 3. Copy Internal Database URL
```

#### B. Redis (Optional for MVP - can add later)

**Railway**: Add Redis service to project
**Alternative**: Skip for MVP, use in-memory rate limiting

#### C. RPC Providers

**Alchemy** (Recommended):
```bash
# 1. Sign up: https://www.alchemy.com
# 2. Create app: Polygon Mainnet
# 3. Copy API key → ALCHEMY_API_KEY
```

**Infura** (Backup):
```bash
# 1. Sign up: https://infura.io
# 2. Create project: Polygon
# 3. Copy API key → INFURA_API_KEY
```

---

### Step 4: Configure Environment Variables (30 minutes)

**Backend** (`apps/api/.env`):

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Redis (optional for MVP)
REDIS_URL=redis://default:password@host:6379

# JWT (from Step 1)
JWT_SECRET=<64-char-hex-from-step-1>

# Blockchain RPC
ALCHEMY_API_KEY=<your-alchemy-key>
INFURA_API_KEY=<your-infura-key>

# Hot Wallet (from Step 1)
HOT_WALLET_PRIVATE_KEY=<your-private-key>
HOT_WALLET_ADDRESS=<derived-from-private-key>

# Webhooks (from Step 1)
WEBHOOK_SECRET=<32-char-hex-from-step-1>

# App Config
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com

# Email (SendGrid or AWS SES)
SENDGRID_API_KEY=<optional-for-now>

# Monitoring (optional)
DATADOG_API_KEY=<optional>
```

**Frontend** (`apps/web/.env`):

```bash
VITE_API_URL=https://api.yourdomain.com
VITE_ALCHEMY_ID=<your-alchemy-app-id>
```

---

### Step 5: Run Database Migrations (5 minutes)

```bash
cd apps/api

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate deploy

# Verify
npm run prisma:studio
# Should see: users, payment_sessions, api_keys, refresh_tokens tables
```

---

### Step 6: Fund Hot Wallet (10 minutes)

```bash
# 1. Open MetaMask
# 2. Switch to Polygon network
# 3. Send $100 worth of MATIC to: <HOT_WALLET_ADDRESS>
# 4. Wait for confirmation (~10 seconds)
# 5. Verify balance on PolygonScan
```

**Balance Alert**: Set up monitoring to alert if balance > $150 or < $20

---

### Step 7: Domain & DNS (15 minutes)

**Option A: Use Subdomain** (easiest)
```
Frontend: gateway.yourdomain.com
Backend: api-gateway.yourdomain.com
```

**Option B: New Domain**
```bash
# Purchase domain: Namecheap, Google Domains
# Example: stablecoin-gateway.io ($12/year)

# DNS Records (at your DNS provider):
A     @              → Railway/Render IP
A     api            → Railway/Render API IP
CNAME www            → @
```

**SSL**: Railway/Render provide free SSL automatically

---

## Day 2: Deployment (2 hours)

### Step 1: Deploy Backend API (45 minutes)

#### Railway Deployment

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Link project
railway link

# 4. Deploy backend
cd apps/api
railway up

# 5. Set environment variables
railway variables set JWT_SECRET=<your-secret>
railway variables set DATABASE_URL=<from-railway>
railway variables set ALCHEMY_API_KEY=<your-key>
# ... (set all env vars from Day 1, Step 4)

# 6. Verify deployment
railway logs
# Should see: "Server listening on port 5000"
```

#### Manual Verification

```bash
# Test API endpoint
curl https://api.yourdomain.com/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2026-01-31T...",
  "uptime": 123
}
```

---

### Step 2: Deploy Frontend (30 minutes)

#### Vercel Deployment (Recommended)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy frontend
cd apps/web
vercel --prod

# 4. Set environment variables
vercel env add VITE_API_URL production
# Enter: https://api.yourdomain.com

vercel env add VITE_ALCHEMY_ID production
# Enter: <your-alchemy-app-id>

# 5. Redeploy with env vars
vercel --prod
```

#### Verification

```bash
# 1. Open browser: https://yourdomain.com
# 2. Check browser console (F12) - no errors
# 3. Try creating a payment session
# 4. Verify API calls successful (Network tab)
```

---

### Step 3: Smoke Test (45 minutes)

**Test Checklist**:

```bash
# 1. User Registration
curl -X POST https://api.yourdomain.com/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'

# Expected: 201 Created, returns JWT tokens

# 2. User Login
curl -X POST https://api.yourdomain.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'

# Expected: 200 OK, returns JWT tokens

# 3. Create Payment Session (requires JWT from login)
curl -X POST https://api.yourdomain.com/v1/payment-sessions \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "USD",
    "network": "polygon",
    "token": "USDC",
    "description": "Test payment"
  }'

# Expected: 201 Created, returns payment session with checkout URL

# 4. Test Frontend
# - Open checkout URL in browser
# - Verify payment details displayed
# - Connect MetaMask (don't complete payment yet)
# - Verify wallet connection works

# 5. Test Security Headers
curl -I https://api.yourdomain.com/health

# Expected headers:
# X-Frame-Options: DENY
# Strict-Transport-Security: max-age=31536000
# X-Content-Type-Options: nosniff

# 6. Test Rate Limiting
for i in {1..10}; do
  curl -X POST https://api.yourdomain.com/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done

# Expected: First 5 requests return 401, next 5 return 429 (Too Many Requests)
```

**All tests passed?**
- [ ] Yes → Proceed to Day 3
- [ ] No → Debug issues (see troubleshooting below)

---

## Day 3: Beta Launch (3 hours)

### Step 1: Create Beta User Accounts (30 minutes)

**Option A: Self-Service**
```bash
# 1. Share signup link with 10 beta merchants
https://yourdomain.com/signup

# 2. They create accounts
# 3. Verify in database
npm run prisma:studio
# Check users table for 10 users
```

**Option B: Manual Creation**
```bash
# Use admin script (create if needed)
node scripts/create-beta-user.js "merchant@example.com"
# Sends welcome email with login credentials
```

---

### Step 2: Onboard Beta Merchants (1.5 hours)

**For each merchant** (~9 minutes per merchant):

1. **Schedule 15-minute call** (or Loom video)
2. **Walk them through**:
   - Login to dashboard
   - Create first payment link
   - Share link with test customer
   - View payment in dashboard
3. **Answer questions**
4. **Get feedback** (take notes)

**Onboarding Checklist** (per merchant):
- [ ] Can log in successfully
- [ ] Created first payment link
- [ ] Understands checkout flow
- [ ] Knows how to view transactions
- [ ] Has support contact (your email/Slack)

---

### Step 3: Set Up Monitoring (30 minutes)

#### Option A: Free Monitoring (Better Uptime + Sentry)

```bash
# 1. Better Uptime (free uptime monitoring)
# Sign up: https://betteruptime.com
# Add monitor: https://api.yourdomain.com/health
# Check every 1 minute
# Alert via email if down

# 2. Sentry (free error tracking)
npm install @sentry/node @sentry/integrations

# In apps/api/src/index.ts:
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production',
  tracesSampleRate: 0.1,
});
```

#### Option B: Datadog ($15/month)

```bash
# Sign up: https://www.datadoghq.com
# Install agent
npm install dd-trace

# In apps/api/src/index.ts:
import tracer from 'dd-trace';
tracer.init({
  service: 'stablecoin-gateway-api',
  env: 'production',
});
```

**Alerts to Configure**:
- [ ] API response time > 1 second
- [ ] Error rate > 5%
- [ ] Failed login attempts > 50/hour
- [ ] Hot wallet balance < $20 or > $150

---

### Step 4: Documentation for Beta Users (30 minutes)

**Create** `docs/BETA-GUIDE.md`:

```markdown
# Stablecoin Gateway Beta - Quick Start

Welcome to the beta! Here's how to get started:

## 1. Login
https://yourdomain.com/login

## 2. Create Your First Payment
1. Click "Create Payment Link"
2. Enter amount ($10 minimum)
3. Add description (optional)
4. Copy the checkout link

## 3. Test the Payment
1. Open checkout link in browser
2. Connect your MetaMask wallet
3. Make sure you're on Polygon network
4. Approve USDC payment
5. Wait ~30 seconds for confirmation

## 4. View Transaction
1. Return to dashboard
2. See payment status: "Completed"
3. Click transaction to see details
4. Click transaction hash to view on PolygonScan

## Need Help?
- Email: support@yourdomain.com
- Slack: #stablecoin-beta
- Call: [your number]

## Known Issues
- [List any known bugs/limitations]

## Feedback
Please share feedback via this form: [Google Form link]
```

---

### Step 5: Launch Communication (30 minutes)

**Send to Beta Merchants**:

```
Subject: 🚀 Stablecoin Gateway is LIVE!

Hey [Name],

Great news - Stablecoin Gateway is officially live!

Your account is ready:
- Dashboard: https://yourdomain.com
- Email: [their email]
- Password: [set during signup]

Quick Start Guide: https://yourdomain.com/beta-guide

What to do next:
1. Log in and create your first payment link
2. Test it with a small payment ($10)
3. Share feedback (reply to this email)

Beta Perks:
✅ 0% fees for first 90 days (normally 0.5%)
✅ Priority support (we'll respond within 1 hour)
✅ Early access to new features

Questions? Just reply to this email.

Thanks for being an early adopter!

[Your Name]
Founder, Stablecoin Gateway
```

---

## Post-Launch Checklist (Week 1)

### Daily (First 7 Days)

- [ ] Check monitoring dashboard (uptime, errors)
- [ ] Review new signups and payment volume
- [ ] Check hot wallet balance (maintain $50-$100)
- [ ] Respond to support emails (< 1 hour SLA)
- [ ] Review error logs (Sentry/Datadog)

### Week 1 Metrics to Track

| Metric | Target | Actual |
|--------|--------|--------|
| Active merchants | 10 | ___ |
| Total payment volume | $5,000 | ___ |
| Payment success rate | >95% | ___ |
| Average transaction time | <2 min | ___ |
| Support tickets | <5 | ___ |
| NPS score | >50 | ___ |

### Week 1 Retrospective

**Questions to answer**:
1. What worked well?
2. What didn't work?
3. Top 3 merchant complaints?
4. Top 3 feature requests?
5. Should we continue to Month 2 (public launch)?

---

## Troubleshooting

### API won't start

```bash
# Check logs
railway logs

# Common issues:
# 1. Missing environment variable
#    → Set in Railway dashboard
# 2. Database connection failed
#    → Verify DATABASE_URL is correct
# 3. JWT_SECRET too short
#    → Must be 32+ characters
```

### Frontend shows blank page

```bash
# Check browser console (F12)
# Common issues:
# 1. CORS error
#    → Add frontend URL to CORS whitelist in backend
# 2. API URL wrong
#    → Check VITE_API_URL in Vercel env vars
# 3. Build failed
#    → Run `npm run build` locally, fix TypeScript errors
```

### Payments not confirming

```bash
# Check backend logs
railway logs | grep "payment"

# Common issues:
# 1. RPC provider down
#    → Switch to backup (Infura → Alchemy)
# 2. Wrong network
#    → Verify customer is on Polygon
# 3. Insufficient gas
#    → Top up hot wallet with MATIC
```

### Rate limiting blocking legitimate users

```bash
# Temporarily increase limit
railway variables set RATE_LIMIT_MAX=200

# Restart service
railway restart
```

---

## Rollback Plan

**If critical bug found**:

```bash
# 1. Revert to previous deployment
railway rollback

# 2. Or deploy from main branch
git checkout main
railway up

# 3. Notify beta users
# Email subject: "Scheduled maintenance - 30 minutes"
```

---

## Success Criteria

**Launch is successful if**:
- ✅ All 10 beta merchants onboarded
- ✅ At least 1 real payment processed
- ✅ Zero critical bugs
- ✅ Uptime > 99%
- ✅ Average NPS > 50

**If not met**: Iterate and re-launch Week 2

---

## Budget Tracker

| Item | Monthly Cost | Actual |
|------|--------------|--------|
| Railway (backend) | $20 | ___ |
| Vercel (frontend) | $0 (free tier) | ___ |
| Database | $0 (included) | ___ |
| Alchemy RPC | $0 (free tier) | ___ |
| Better Uptime | $0 (free) | ___ |
| Sentry | $0 (free tier) | ___ |
| Domain | $1 (amortized) | ___ |
| **Total** | **$21/month** | ___ |

**Under budget?** ✅ ($21 vs projected $320)
*Most services have generous free tiers for MVP*

---

## Next Milestone: Month 2 Public Launch

**Target Date**: 2026-03-01 (30 days)

**Goals**:
- 30 active merchants
- $150k payment volume
- $750 revenue
- Public launch (Indie Hackers, Product Hunt)

**Prerequisites**:
- Week 1 beta successful
- All critical bugs fixed
- NPS > 50
- Merchant testimonials collected

---

**Deployment Owner**: [Your Name]
**Started**: 2026-01-28
**Target Completion**: 2026-01-31
**Status**: 🟢 ON TRACK
