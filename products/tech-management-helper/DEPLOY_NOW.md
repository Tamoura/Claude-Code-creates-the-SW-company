# Deploy Tech Management Helper - Quick Reference

**Version**: 1.0.0
**Status**: Ready to Deploy
**Time Required**: 30 minutes

---

## Deployment Status

**Code**: ✅ Complete and tested (86/86 tests passing)
**Documentation**: ✅ Complete (3 comprehensive guides)
**Infrastructure**: ❌ Not yet provisioned (action required)

---

## Choose Your Path

### Path 1: Cloud Deployment (RECOMMENDED)

**Time**: 30-45 minutes | **Cost**: Free tier available | **Access**: Worldwide

```bash
# Step 1: Create accounts
1. Go to https://render.com → Sign up with GitHub
2. Go to https://vercel.com → Sign up with GitHub

# Step 2: Follow the guide
Open: docs/QUICKSTART_DEPLOYMENT.md
```

**Outcome**: Production application at https://your-app.vercel.app

---

### Path 2: Run Locally (TESTING)

**Time**: 15 minutes | **Cost**: Free | **Access**: Your computer only

```bash
# Step 1: Start database
docker run --name tech-mgmt-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tech_management_helper \
  -p 5432:5432 -d postgres:15

# Step 2: Configure API
cd products/tech-management-helper/apps/api
cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tech_management_helper?schema=public"
JWT_SECRET="local-dev-secret-change-in-production-min-32-chars"
NODE_ENV=development
PORT=5001
CORS_ORIGIN="http://localhost:3100"
EOF

npm install
npm run db:migrate

# Step 3: Configure Frontend
cd ../web
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:5001
NODE_ENV=development
EOF

npm install

# Step 4: Start services (2 terminals)
# Terminal 1:
cd products/tech-management-helper/apps/api && npm run dev

# Terminal 2:
cd products/tech-management-helper/apps/web && npm run dev

# Step 5: Create admin user
curl -X POST http://localhost:5001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!@#",
    "fullName": "Admin User",
    "role": "ADMIN"
  }'

# Step 6: Access
# Open browser: http://localhost:3100
# Login: admin@example.com / Admin123!@#
```

**Outcome**: Application running at http://localhost:3100

---

## After Deployment

1. **Verify health**: Visit API URL + `/health` (should return `{"status":"ok"}`)
2. **Login**: Use admin credentials you created
3. **Test**: Create a risk → Verify it appears in the register
4. **Document**: Save your URLs and credentials securely

---

## Full Documentation

- **Quick Start** (30 min cloud deployment): `docs/QUICKSTART_DEPLOYMENT.md`
- **Full Guide** (all options): `docs/DEPLOYMENT.md`
- **Execution Plan** (detailed): `docs/DEPLOYMENT_EXECUTION_PLAN.md`
- **Release Notes**: `docs/RELEASE_NOTES_v1.0.0.md`

---

## Need Help?

**For step-by-step guidance**: Read `docs/QUICKSTART_DEPLOYMENT.md`
**For troubleshooting**: Check the Troubleshooting section in each guide
**For questions**: Contact DevOps Engineer via Orchestrator

---

## Recommended Next Step

1. **Test locally** (15 min) → Verify everything works
2. **Deploy to cloud** (30 min) → Make it accessible to your team

**Start here**: Run the "Path 2" commands above to test locally first.

---

**Last Updated**: January 28, 2026
