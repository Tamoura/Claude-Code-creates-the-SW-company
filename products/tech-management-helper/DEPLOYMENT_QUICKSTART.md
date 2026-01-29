# Tech Management Helper - Deployment Quick Start

**30-minute deployment to production**

## Prerequisites
- Vercel account ([sign up](https://vercel.com))
- Render account ([sign up](https://render.com))
- GitHub repo access

## Quick Steps

### 1. Database (Render) - 5 min
```
Render.com → New → PostgreSQL
Name: tech-mgmt-db
Region: Oregon
→ Copy "External Database URL"
```

### 2. Backend (Render) - 10 min
```
Render.com → New → Web Service
Repo: Claude-Code-creates-the-SW-company
Branch: feature/gpu-calculator-core-features
Root: products/tech-management-helper/apps/api
Build: npm install && npx prisma generate && npx prisma migrate deploy
Start: npm run start

Environment Variables:
- DATABASE_URL: [from step 1]
- JWT_SECRET: nAsKVB82uDedEOQ8k4moBGEBFeRi4T3LpUy7/JKWv5U=
- NODE_ENV: production
- PORT: 5001
- CORS_ORIGIN: *

→ Deploy → Copy API URL
→ Test: https://YOUR-API/api/v1/health
```

### 3. Frontend (Vercel) - 10 min
```
Vercel.com → New → Project
Repo: Claude-Code-creates-the-SW-company
Root: products/tech-management-helper/apps/web

Environment Variables:
- NEXT_PUBLIC_API_URL: [your Render API URL]

→ Deploy → Copy Frontend URL
```

### 4. Update CORS - 2 min
```
Render → tech-mgmt-api → Environment
CORS_ORIGIN: [your Vercel URL]
→ Save (auto-redeploys)
```

### 5. Create Admin User - 2 min
```bash
curl -X POST https://YOUR-API/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!@#","name":"Admin","role":"ADMIN"}'
```

### 6. Test - 1 min
```
Visit: https://YOUR-VERCEL-URL
Login: admin@example.com / Admin123!@#
→ Create a test risk
```

## Done! 🎉

**Full Guide**: See [DEPLOY_TO_VERCEL.md](./DEPLOY_TO_VERCEL.md)

## Your URLs

| Service | URL |
|---------|-----|
| Frontend | https://____________.vercel.app |
| Backend | https://____________.onrender.com |
| Health | https://____________.onrender.com/api/v1/health |

## Troubleshooting

**Network Error**: Check NEXT_PUBLIC_API_URL in Vercel
**500 Errors**: Check Render logs
**CORS Errors**: Update CORS_ORIGIN to match Vercel URL exactly
**Can't Login**: Verify JWT_SECRET is set

---

**Generated JWT Secret**: `nAsKVB82uDedEOQ8k4moBGEBFeRi4T3LpUy7/JKWv5U=`
(To generate new: `openssl rand -base64 32`)
