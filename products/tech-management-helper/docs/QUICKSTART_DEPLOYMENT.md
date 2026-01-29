# Quick Start: Deploy Tech Management Helper to Production

This guide will get Tech Management Helper running in production in approximately 30 minutes.

## Prerequisites

- GitHub account (for connecting to deployment platforms)
- Credit card (for platform accounts, though free tiers available)
- Domain name (optional - platforms provide free subdomains)

## Recommended Path: Vercel + Render

This is the fastest path to production with minimal configuration.

---

## Part 1: Deploy Database (5 minutes)

### Using Render PostgreSQL

1. **Sign up for Render**
   - Go to https://render.com/
   - Click "Get Started" and sign up with GitHub

2. **Create PostgreSQL Database**
   - Click "New +" button
   - Select "PostgreSQL"
   - Fill in:
     - Name: `tech-management-helper-db`
     - Database: `tech_management_helper`
     - User: `tech_admin`
     - Region: `Oregon (US West)` (or closest to you)
     - PostgreSQL Version: `15`
     - Plan: **Free** (for testing) or **Starter $7/mo** (for production)
   - Click "Create Database"

3. **Copy Connection String**
   - Wait for database to be created (1-2 minutes)
   - Find "External Database URL" section
   - Click the copy icon to copy the full connection string
   - It looks like: `postgres://tech_admin:xyz123@...render.com/tech_management_helper`
   - **Save this** - you'll need it in the next step

---

## Part 2: Deploy Backend API (10 minutes)

### Using Render Web Service

1. **Create Web Service**
   - In Render dashboard, click "New +" → "Web Service"
   - Click "Build and deploy from a Git repository"
   - Click "Connect GitHub" and authorize Render
   - Select your repository
   - Click "Connect"

2. **Configure Service**
   - Name: `tech-management-helper-api`
   - Region: Same as database (e.g., `Oregon US West`)
   - Branch: `main`
   - Root Directory: `products/tech-management-helper/apps/api`
   - Runtime: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
   - Plan: **Free** (for testing) or **Starter $7/mo** (for production)

3. **Add Environment Variables**

   Click "Advanced" then scroll to "Environment Variables". Add these:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Paste the connection string from Part 1 |
   | `JWT_SECRET` | `Generate random string` (see below) |
   | `NODE_ENV` | `production` |
   | `PORT` | `5001` |
   | `CORS_ORIGIN` | `https://your-app.vercel.app` (update after Part 3) |

   **Generate JWT_SECRET**:
   - Open terminal and run: `openssl rand -base64 32`
   - Copy the output and paste as `JWT_SECRET` value
   - Or use any random 32+ character string

4. **Deploy**
   - Click "Create Web Service"
   - Wait 3-5 minutes for deployment
   - Watch the logs for any errors
   - Service will be available at: `https://tech-management-helper-api.onrender.com`

5. **Run Database Migrations**
   - Once deployment succeeds, click "Shell" tab
   - Wait for shell to connect
   - Run: `npm run db:migrate`
   - You should see: "Migration complete" or similar
   - Type `exit` to close shell

6. **Verify API**
   - Copy your API URL: `https://tech-management-helper-api.onrender.com`
   - In browser, visit: `https://tech-management-helper-api.onrender.com/health`
   - You should see: `{"status":"ok","timestamp":"..."}`

---

## Part 3: Deploy Frontend (10 minutes)

### Using Vercel

1. **Sign up for Vercel**
   - Go to https://vercel.com/
   - Click "Start Deploying"
   - Sign up with GitHub

2. **Import Project**
   - Click "Add New..." → "Project"
   - Click "Import Git Repository"
   - Find your repository and click "Import"

3. **Configure Project**
   - Framework Preset: `Next.js`
   - Root Directory: Click "Edit" → Enter `products/tech-management-helper/apps/web`
   - Build Command: `npm run build` (should auto-detect)
   - Output Directory: `.next` (should auto-detect)
   - Install Command: `npm install` (should auto-detect)

4. **Add Environment Variables**

   Expand "Environment Variables" section and add:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | `https://tech-management-helper-api.onrender.com` |
   | `NODE_ENV` | `production` |

   Replace `tech-management-helper-api.onrender.com` with your actual API URL from Part 2.

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build and deployment
   - Vercel will provide a URL like: `https://your-app-xyz.vercel.app`

6. **Copy Deployment URL**
   - After deployment completes, copy the production URL
   - Example: `https://tech-management-helper.vercel.app`

---

## Part 4: Update CORS Settings (2 minutes)

Now that you have your frontend URL, update the backend to allow requests from it:

1. **Go Back to Render**
   - Open Render dashboard
   - Click on your API service (`tech-management-helper-api`)

2. **Update Environment Variable**
   - Click "Environment" in left sidebar
   - Find `CORS_ORIGIN`
   - Click "Edit"
   - Replace with your Vercel URL: `https://your-app-xyz.vercel.app`
   - Click "Save Changes"

3. **Redeploy**
   - Service will automatically redeploy
   - Wait 1-2 minutes

---

## Part 5: Create First User (5 minutes)

Since the registration UI is not yet implemented, create your first user via API:

1. **Open Terminal**

2. **Create Admin User**

   Replace `YOUR-API-URL` with your actual API URL:

   ```bash
   curl -X POST https://YOUR-API-URL/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@yourcompany.com",
       "password": "SecurePassword123!",
       "fullName": "Admin User",
       "role": "ADMIN"
     }'
   ```

   Example with actual URL:
   ```bash
   curl -X POST https://tech-management-helper-api.onrender.com/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@yourcompany.com",
       "password": "SecurePassword123!",
       "fullName": "Admin User",
       "role": "ADMIN"
     }'
   ```

3. **Verify Response**

   You should see:
   ```json
   {
     "user": {
       "id": "...",
       "email": "admin@yourcompany.com",
       "fullName": "Admin User",
       "role": "ADMIN"
     },
     "token": "eyJ..."
   }
   ```

---

## Part 6: Test Your Deployment (5 minutes)

1. **Login**
   - Visit your Vercel URL: `https://your-app-xyz.vercel.app`
   - You should see the login page
   - Enter the credentials you created in Part 5
   - Click "Sign In"

2. **Explore Dashboard**
   - After successful login, you should see the dashboard
   - Sidebar shows: Dashboard, Risks, Assets, Controls, etc.

3. **Test Risk Management**
   - Click "Risks" in sidebar
   - Click "Add Risk" button
   - Fill in the form:
     - Title: "Test Risk"
     - Description: "This is a test risk"
     - Category: "Technology"
     - Likelihood: "Medium"
     - Impact: "High"
     - Status: "Identified"
   - Click "Create Risk"
   - Verify the risk appears in the table

4. **Verify Risk Score**
   - The risk should show a score (Likelihood × Impact)
   - For Medium (3) × High (4) = 12 (High Risk)
   - Risk level should be color-coded

---

## Success Checklist

- [ ] Database created and accessible
- [ ] Backend API deployed and responding to `/health`
- [ ] Frontend deployed and accessible
- [ ] CORS configured correctly
- [ ] Admin user created
- [ ] Can login successfully
- [ ] Can create and view risks

---

## Your Deployment URLs

Document these for your records:

```
Frontend:  https://your-app.vercel.app
Backend:   https://tech-management-helper-api.onrender.com
Database:  postgres://...@...render.com/tech_management_helper

Admin Email:    admin@yourcompany.com
Admin Password: [the password you set]
```

---

## Next Steps

### Immediate

1. **Bookmark** your frontend and backend URLs
2. **Document** your admin credentials securely
3. **Test** all features (Risks, Assets, Controls)
4. **Create** additional users as needed

### Within 1 Week

1. **Set up monitoring**
   - UptimeRobot for uptime alerts
   - Sentry for error tracking

2. **Configure custom domain** (optional)
   - Vercel: Project Settings → Domains
   - Render: Service Settings → Custom Domain

3. **Set up backups**
   - Render: Enable automatic backups (paid plans)
   - Or schedule manual backups

### Within 1 Month

1. **Review security**
   - Rotate JWT_SECRET
   - Review user access
   - Enable 2FA (future feature)

2. **Optimize performance**
   - Review API response times
   - Check database query performance
   - Monitor error rates

3. **Plan next features**
   - Registration UI
   - Password reset
   - Email notifications
   - Reporting features

---

## Troubleshooting

### "Cannot connect to API"

**Symptoms**: Frontend shows connection errors

**Solutions**:
1. Check `NEXT_PUBLIC_API_URL` in Vercel environment variables
2. Verify API is running: visit `https://YOUR-API/health`
3. Check browser console for CORS errors
4. Verify `CORS_ORIGIN` in Render matches your Vercel URL exactly

### "Database connection failed"

**Symptoms**: API logs show database errors

**Solutions**:
1. Check `DATABASE_URL` in Render environment variables
2. Verify database is running in Render dashboard
3. Test connection in Render Shell: `psql $DATABASE_URL -c "SELECT 1"`
4. Check database has run migrations: `npm run db:migrate`

### "Login fails with 401"

**Symptoms**: Login always returns unauthorized

**Solutions**:
1. Verify user was created successfully (check API logs)
2. Clear browser cache and cookies
3. Try creating a new user
4. Check `JWT_SECRET` is set in Render

### "Free tier limitations"

**Render Free Tier**:
- Spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- Database expires after 90 days

**Solutions**:
- Upgrade to Starter plan ($7/month) for always-on service
- Use cron job to ping API every 10 minutes (keeps awake)
- Migrate to Railway or other platform

---

## Platform Alternatives

If you prefer different platforms:

### All-in-One: Railway

- Simpler than Vercel + Render
- Single platform for database, API, and frontend
- $5/month minimum (no free tier)
- Guide: See `DEPLOYMENT.md` section "Option B: Railway"

### Database Alternative: Supabase

- Better free tier than Render (no expiration)
- Includes authentication (future enhancement)
- $25/month Pro plan for production
- Guide: See `DEPLOYMENT.md` section "Option B: Supabase"

---

## Cost Summary

### Testing/MVP (Free)
- Render PostgreSQL: Free (90 days)
- Render Web Service: Free
- Vercel: Free
- **Total**: $0/month

### Production (Small Team)
- Render PostgreSQL Starter: $7/month
- Render Web Service Starter: $7/month
- Vercel Pro: $20/month
- **Total**: $34/month

### Production (Recommended)
- Supabase Pro: $25/month
- Render Standard: $22/month
- Vercel Pro: $20/month
- **Total**: $67/month

---

## Getting Help

- **Full Documentation**: See `DEPLOYMENT.md` for detailed information
- **API Reference**: See `API.md` for endpoint documentation
- **Architecture**: See `ADRs/` folder for design decisions
- **GitHub Issues**: Report bugs or request features
- **Platform Support**:
  - Render: https://render.com/docs
  - Vercel: https://vercel.com/docs
  - Prisma: https://www.prisma.io/docs

---

**Congratulations!** Your Tech Management Helper is now live in production.

**Deployment Time**: ~30-45 minutes
**Version**: 1.0.0
**Last Updated**: 2026-01-28
