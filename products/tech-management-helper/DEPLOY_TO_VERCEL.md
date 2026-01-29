# Deploy Tech Management Helper to Vercel + Render

Complete deployment guide for Tech Management Helper v1.0.0

**Deployment Architecture:**
- Frontend (Next.js) → Vercel
- Backend API (Fastify) → Render
- Database (PostgreSQL) → Render

**Total Time: ~30 minutes**

## Prerequisites

Before starting, ensure you have:
- ✅ GitHub account (with access to Claude-Code-creates-the-SW-company repo)
- ✅ Vercel account (free tier available) - sign up at [vercel.com](https://vercel.com)
- ✅ Render account (free tier available) - sign up at [render.com](https://render.com)
- ✅ Git repository pushed to GitHub

---

## Part 1: Deploy Database (5 minutes)

### 1.1 Create PostgreSQL Database

1. Navigate to [https://render.com/](https://render.com/)
2. Log in to your Render account
3. Click **"New"** → **"PostgreSQL"**
4. Configure database settings:
   - **Name**: `tech-mgmt-db`
   - **Database**: `tech_mgmt_prod`
   - **User**: `tech_mgmt_user`
   - **Region**: Oregon (US West)
   - **PostgreSQL Version**: 15 (or latest)
   - **Plan**:
     - Free (limited, good for testing)
     - Starter ($7/month, recommended for production)
5. Click **"Create Database"**
6. Wait ~2 minutes for database provisioning

### 1.2 Copy Database Connection String

1. Once created, you'll see the database dashboard
2. Scroll down to **"Connections"** section
3. **IMPORTANT**: Copy the **"External Database URL"**
   - Format: `postgresql://tech_mgmt_user:xxxxx@dpg-xxxxx.oregon-postgres.render.com/tech_mgmt_prod`
   - Save this URL - you'll need it in Part 2!

**✅ Checkpoint**: Database is running and you have the connection URL

---

## Part 2: Deploy Backend API (10 minutes)

### 2.1 Create Web Service

1. Still on Render.com, click **"New"** → **"Web Service"**
2. Choose **"Build and deploy from a Git repository"**
3. Click **"Connect GitHub"** (authorize if needed)
4. Find and select: `Claude-Code-creates-the-SW-company`
5. Click **"Connect"**

### 2.2 Configure Service

Fill in the deployment configuration:

**Basic Settings:**
- **Name**: `tech-mgmt-api`
- **Region**: Oregon (US West)
- **Branch**: `feature/gpu-calculator-core-features`
- **Root Directory**: `products/tech-management-helper/apps/api`
- **Runtime**: Node

**Build & Deploy:**
- **Build Command**:
  ```bash
  npm install && npx prisma generate && npx prisma migrate deploy
  ```
- **Start Command**:
  ```bash
  npm run start
  ```

**Instance Type:**
- **Plan**: Starter ($7/month) or Free

### 2.3 Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these variables one by one:

| Key | Value | Notes |
|-----|-------|-------|
| `DATABASE_URL` | [Paste URL from Part 1] | External Database URL |
| `JWT_SECRET` | `nAsKVB82uDedEOQ8k4moBGEBFeRi4T3LpUy7/JKWv5U=` | Pre-generated for you |
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `5001` | Server port |
| `CORS_ORIGIN` | `*` | Temporary (will update in Part 4) |

**Security Note**: The JWT_SECRET above has been generated using `openssl rand -base64 32`. For additional security, you can generate a new one by running that command in your terminal.

### 2.4 Deploy

1. Click **"Create Web Service"**
2. Render will start building (~5 minutes)
3. Watch the deployment logs for any errors
4. Wait for status to show **"Live"**

### 2.5 Copy API URL and Test

1. At the top of the page, copy your service URL
   - Format: `https://tech-mgmt-api.onrender.com`
2. **Test the API**: Open in browser
   ```
   https://YOUR-API-URL.onrender.com/api/v1/health
   ```
3. You should see:
   ```json
   {
     "status": "ok",
     "timestamp": "2026-01-28T...",
     "version": "1.0.0"
   }
   ```

**✅ Checkpoint**: API is live and health check passes

---

## Part 3: Deploy Frontend to Vercel (10 minutes)

You can deploy using either the Vercel website (easier) or CLI (more control).

### Option A: Deploy via Vercel Website (Recommended)

#### 3.1 Import Project

1. Navigate to [https://vercel.com/](https://vercel.com/)
2. Log in to your Vercel account
3. Click **"Add New"** → **"Project"**
4. Click **"Import Git Repository"**
5. Find and select: `Claude-Code-creates-the-SW-company`
6. Click **"Import"**

#### 3.2 Configure Project

**Framework Preset:**
- Should auto-detect as **Next.js** ✓

**Root Directory:**
- Click **"Edit"**
- Enter: `products/tech-management-helper/apps/web`
- Click **"Continue"**

**Build Settings:**
- Leave defaults (should auto-populate):
  - Build Command: `npm run build`
  - Output Directory: `.next`
  - Install Command: `npm install`

**Environment Variables:**
- Click **"Environment Variables"**
- Add variable:
  - **Key**: `NEXT_PUBLIC_API_URL`
  - **Value**: [Paste your Render API URL from Part 2]
  - Example: `https://tech-mgmt-api.onrender.com`

#### 3.3 Deploy

1. Click **"Deploy"**
2. Wait for deployment (~3 minutes)
3. Watch build logs for any errors
4. Once complete, click **"Visit"** to see your app

#### 3.4 Copy Frontend URL

1. Copy your Vercel deployment URL
   - Format: `https://tech-management-helper-xxxxx.vercel.app`
   - Or custom domain if configured
2. Save this URL - you'll need it in Part 4!

---

### Option B: Deploy via Vercel CLI (Alternative)

If you prefer command-line deployment:

```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Navigate to frontend app
cd products/tech-management-helper/apps/web

# Login to Vercel (opens browser)
vercel login

# Deploy to production
vercel --prod

# Answer prompts:
# - Set up and deploy? → Yes
# - Which scope? → [Select your account]
# - Link to existing project? → No
# - What's your project's name? → tech-management-helper
# - In which directory is your code located? → ./
# - Want to override settings? → Yes
# - Build Command → npm run build
# - Output Directory → .next
# - Development Command → npm run dev

# Deployment will start automatically
# Copy the production URL when complete
```

After deployment, add environment variable:

```bash
# Set environment variable
vercel env add NEXT_PUBLIC_API_URL production

# When prompted, paste your Render API URL:
# https://tech-mgmt-api.onrender.com

# Redeploy to apply environment variable
vercel --prod
```

**✅ Checkpoint**: Frontend is live and you can see the login page

---

## Part 4: Update CORS for Security (2 minutes)

Now that both frontend and backend are deployed, secure the CORS configuration.

### 4.1 Update Backend Environment Variable

1. Go back to [Render.com](https://render.com/)
2. Navigate to your **tech-mgmt-api** service
3. Click **"Environment"** in the left sidebar
4. Find the `CORS_ORIGIN` variable
5. Click **"Edit"**
6. Change value from `*` to your Vercel URL:
   ```
   https://tech-management-helper-xxxxx.vercel.app
   ```
7. Click **"Save Changes"**
8. Service will automatically redeploy (~2 minutes)

**Why?** This prevents unauthorized websites from accessing your API.

**✅ Checkpoint**: CORS is configured for your specific frontend

---

## Part 5: Create First User (5 minutes)

### 5.1 Create Admin User via API

Use curl to register the first admin user:

```bash
# Replace YOUR_API_URL with your actual Render URL
curl -X POST https://YOUR_API_URL/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!@#",
    "name": "Admin User",
    "role": "ADMIN"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "...",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "ADMIN"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 5.2 Alternative: Register via Frontend

1. Visit your Vercel URL: `https://tech-management-helper-xxxxx.vercel.app`
2. Click **"Register"** or **"Sign Up"** (if available)
3. Fill in:
   - Email: `admin@example.com`
   - Password: `Admin123!@#`
   - Name: `Admin User`
4. Submit registration

**✅ Checkpoint**: Admin user created successfully

---

## Part 6: Test Your Deployment (5 minutes)

### 6.1 Basic Functionality Test

1. **Visit Frontend**: Open your Vercel URL
2. **Login**:
   - Email: `admin@example.com`
   - Password: `Admin123!@#`
3. **Verify Dashboard**: You should be redirected to dashboard
4. **Navigate to Risks**: Click "Risks" in sidebar/menu
5. **Create Test Risk**:
   - Click "Add Risk" or "New Risk"
   - Fill in required fields:
     - Title: "Test Risk"
     - Description: "Testing deployment"
     - Likelihood: Medium
     - Impact: High
   - Click "Save" or "Create"
6. **Verify Risk Appears**: Should appear in the risks list
7. **Test Assets Section**: Navigate to Assets, try viewing/creating
8. **Test Controls Section**: Navigate to Controls, verify loading

### 6.2 API Health Check

Open these URLs in your browser:

1. **Health Endpoint**:
   ```
   https://YOUR_API_URL/api/v1/health
   ```
   Should return: `{"status":"ok","timestamp":"...","version":"1.0.0"}`

2. **API Docs** (if available):
   ```
   https://YOUR_API_URL/api/v1/docs
   ```

### 6.3 Check Logs

**Backend Logs:**
1. Go to Render.com
2. Navigate to your API service
3. Click "Logs" tab
4. Verify no errors

**Frontend Logs:**
1. Go to Vercel.com
2. Navigate to your project
3. Click on the deployment
4. Click "Functions" or "Logs" tab
5. Verify no errors

**✅ Checkpoint**: All features working correctly

---

## Success! 🎉

Your Tech Management Helper is now live at:

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | https://tech-management-helper-xxxxx.vercel.app | ✅ Live |
| **Backend API** | https://tech-mgmt-api.onrender.com | ✅ Live |
| **Database** | Managed by Render | ✅ Live |
| **Health Check** | https://tech-mgmt-api.onrender.com/api/v1/health | ✅ OK |

### Default Credentials

- **Email**: admin@example.com
- **Password**: Admin123!@#

**Important**: Change the default password after first login!

---

## Troubleshooting

### Frontend Issues

**Problem**: Frontend shows "Network Error" or "Failed to fetch"

**Solutions**:
1. Check `NEXT_PUBLIC_API_URL` in Vercel environment variables
   - Go to Vercel → Project → Settings → Environment Variables
   - Verify URL matches your Render API URL
   - Should NOT have trailing slash
2. Verify API is running:
   - Visit: `https://YOUR_API_URL/api/v1/health`
   - Should return OK status
3. Check CORS configuration:
   - Render → API service → Environment
   - Verify `CORS_ORIGIN` matches your Vercel URL
4. Check browser console for specific errors:
   - Press F12 → Console tab
   - Look for red error messages

**Problem**: Page loads but data doesn't appear

**Solutions**:
1. Check if you're logged in (token in cookies)
2. Open Network tab (F12) → look for failed requests
3. Check API logs in Render for errors

---

### Backend Issues

**Problem**: API returns 500 errors

**Solutions**:
1. Check Render logs:
   - Render.com → Your service → Logs tab
   - Look for error stack traces
2. Verify database connection:
   - Check `DATABASE_URL` environment variable
   - Should include `?sslmode=require` at the end
3. Check migrations ran successfully:
   - Look for "Running migrations" in deployment logs
   - Should see: "Migration complete"

**Problem**: API won't start / keeps restarting

**Solutions**:
1. Check build logs for errors:
   - Render → Service → Events tab
   - Look for build failures
2. Verify all environment variables are set:
   - DATABASE_URL
   - JWT_SECRET
   - NODE_ENV
   - PORT
   - CORS_ORIGIN
3. Check package.json scripts:
   - `start` script should be: `node dist/index.js`
   - Build command should compile TypeScript first

**Problem**: Health check fails

**Solutions**:
1. Verify health check path in render.yaml: `/api/v1/health`
2. Check if server is listening on correct port (5001)
3. Check if route is properly registered in Fastify

---

### Database Issues

**Problem**: Database connection fails

**Solutions**:
1. Verify DATABASE_URL format:
   ```
   postgresql://user:password@host:5432/dbname
   ```
2. Check if database is active in Render
3. Ensure connection string includes SSL:
   - Add `?sslmode=require` to the end
4. Verify database credentials haven't changed

**Problem**: Migrations fail

**Solutions**:
1. Check Prisma schema is valid:
   - Run `npx prisma validate` locally
2. Verify build command includes:
   - `npx prisma generate`
   - `npx prisma migrate deploy`
3. Check database has enough space (Render free tier limits)

---

### Authentication Issues

**Problem**: Can't login / Token errors

**Solutions**:
1. Verify JWT_SECRET is set in backend
2. Check JWT_SECRET is same across all backend instances
3. Clear browser cookies and try again
4. Verify user exists in database:
   - Use Render → Database → Connect (with client)
   - Run: `SELECT * FROM "User" WHERE email = 'admin@example.com';`

**Problem**: CORS errors on login

**Solutions**:
1. Check CORS_ORIGIN matches exactly:
   - No trailing slash
   - Must be HTTPS
   - Must match Vercel domain
2. Check browser console for exact CORS error
3. Temporarily set CORS_ORIGIN to `*` to test (not for production!)

---

## Next Steps

### Immediate (Recommended)

1. **Change Default Password**
   - Login as admin
   - Go to Settings/Profile
   - Update password

2. **Configure Custom Domain** (Optional)
   - **Vercel**: Settings → Domains → Add Domain
   - **Render**: Settings → Custom Domain → Add Domain

3. **Set up Monitoring**
   - Use [UptimeRobot](https://uptimerobot.com/) (free)
   - Monitor health endpoint: `https://YOUR_API_URL/api/v1/health`
   - Get alerts if service goes down

4. **Enable Database Backups**
   - Render → Database → Backups tab
   - Enable automatic backups (included in paid plans)

### Soon

5. **Set up CI/CD**
   - Auto-deploy on push to main branch
   - Run tests before deployment
   - See: [GitHub Actions Guide](https://docs.github.com/en/actions)

6. **Add More Users**
   - Create users via API or frontend
   - Assign appropriate roles (ADMIN, USER, VIEWER)

7. **Configure Email** (if needed)
   - Add email service (SendGrid, Mailgun, etc.)
   - Set up password reset emails
   - Configure notification emails

8. **Performance Optimization**
   - Enable Vercel Analytics
   - Set up Render metrics
   - Configure caching headers

### Later

9. **Security Hardening**
   - Set up rate limiting
   - Enable audit logging
   - Configure IP whitelisting (if needed)
   - Add 2FA support

10. **Scaling Preparation**
    - Monitor usage patterns
    - Consider upgrading Render plan if needed
    - Set up database replicas
    - Configure CDN for static assets

---

## Useful Commands

### Local Development

```bash
# Start frontend locally (connects to production API)
cd products/tech-management-helper/apps/web
NEXT_PUBLIC_API_URL=https://YOUR_API_URL npm run dev

# Start backend locally (connects to production DB)
cd products/tech-management-helper/apps/api
DATABASE_URL=YOUR_PRODUCTION_DB_URL npm run dev
```

### Vercel CLI

```bash
# View deployment logs
vercel logs

# View environment variables
vercel env ls

# Pull environment variables to local
vercel env pull

# Alias deployment to production
vercel alias https://deployment-url.vercel.app tech-mgmt-helper.vercel.app
```

### Render CLI

```bash
# Install Render CLI
npm install -g render

# Login
render login

# View services
render services list

# View logs
render logs --service=tech-mgmt-api --tail

# Restart service
render services restart tech-mgmt-api
```

---

## Support

If you encounter issues not covered in this guide:

1. **Check Documentation**:
   - [Vercel Docs](https://vercel.com/docs)
   - [Render Docs](https://render.com/docs)
   - [Next.js Docs](https://nextjs.org/docs)
   - [Fastify Docs](https://fastify.dev/)

2. **Check Logs**:
   - Vercel: Project → Deployment → Functions/Logs
   - Render: Service → Logs tab
   - Browser: F12 → Console/Network tabs

3. **Common Resources**:
   - [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
   - [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
   - [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)

---

## Deployment Checklist

Use this checklist to track your progress:

### Part 1: Database
- [ ] Created PostgreSQL database on Render
- [ ] Copied external database URL
- [ ] Database status shows "Available"

### Part 2: Backend API
- [ ] Created web service on Render
- [ ] Connected GitHub repository
- [ ] Configured build/start commands
- [ ] Added all environment variables
- [ ] Deployment successful (status: Live)
- [ ] Health check passes
- [ ] Copied API URL

### Part 3: Frontend
- [ ] Deployed to Vercel (via website or CLI)
- [ ] Configured root directory
- [ ] Added NEXT_PUBLIC_API_URL
- [ ] Deployment successful
- [ ] Can access frontend URL
- [ ] Login page loads
- [ ] Copied frontend URL

### Part 4: Security
- [ ] Updated CORS_ORIGIN with frontend URL
- [ ] Removed wildcard (*) from CORS
- [ ] Backend redeployed successfully

### Part 5: First User
- [ ] Created admin user via API/frontend
- [ ] Received success response
- [ ] Can login with credentials

### Part 6: Testing
- [ ] Login works
- [ ] Dashboard loads
- [ ] Can view Risks page
- [ ] Can create test risk
- [ ] Risk appears in list
- [ ] Assets page works
- [ ] Controls page works
- [ ] No console errors

### Optional
- [ ] Changed default password
- [ ] Configured custom domain
- [ ] Set up monitoring
- [ ] Enabled database backups

---

**Deployment Guide Version**: 1.0.0
**Last Updated**: 2026-01-28
**Product Version**: tech-management-helper v1.0.0
