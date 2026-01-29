# IT4IT Dashboard - Production Deployment Checklist

**Product**: IT4IT Dashboard MVP
**Version**: 0.1.0
**Deployment Date**: _____________
**Deployed By**: _____________
**Deployment Platform**: Vercel

---

## Pre-Deployment Checklist

### Code Quality

- [ ] All unit tests passing (234/234)
  ```bash
  cd products/it4it-dashboard/apps/web
  npm run test
  ```

- [ ] E2E tests passing
  ```bash
  npm run test:e2e
  ```

- [ ] Build successful locally
  ```bash
  npm run build
  # Expected: Build completed successfully (24 routes)
  ```

- [ ] No TypeScript errors
  ```bash
  npm run lint
  # Expected: No errors
  ```

- [ ] Test coverage meets threshold (> 80%)
  ```bash
  npm run test:coverage
  # Current: 98.78%
  ```

### Documentation

- [ ] README.md updated with production URL
- [ ] DEPLOYMENT.md reviewed and accurate
- [ ] Release notes prepared (if applicable)
- [ ] API documentation current (N/A for MVP - no backend)

### Approvals

- [ ] QA Engineer approved (Testing Gate: PASS)
- [ ] Frontend Engineer approved (code review)
- [ ] DevOps Engineer approved (deployment ready)
- [ ] CEO approved for production release

### Git Status

- [ ] Working directory clean (no uncommitted changes)
  ```bash
  git status
  # Expected: "nothing to commit, working tree clean"
  ```

- [ ] On correct branch: `feature/gpu-calculator-core-features`
  ```bash
  git branch --show-current
  ```

- [ ] All changes pushed to remote
  ```bash
  git push origin feature/gpu-calculator-core-features
  ```

- [ ] No merge conflicts

### Dependencies

- [ ] All dependencies up to date (or pinned versions documented)
  ```bash
  npm audit
  # Expected: 0 vulnerabilities
  ```

- [ ] package-lock.json committed
- [ ] node_modules/ in .gitignore

---

## Deployment Checklist

### Vercel Setup (One-Time)

- [ ] Vercel account created
- [ ] GitHub repository connected to Vercel
- [ ] Project imported to Vercel
  - Name: `it4it-dashboard`
  - Framework: Next.js (auto-detected)
  - Root Directory: `products/it4it-dashboard/apps/web`
  - Build Command: `npm run build`
  - Output Directory: `.next`

### Environment Configuration

- [ ] Environment variables configured (if any)
  - **MVP**: No env vars needed
  - **Future**: NEXT_PUBLIC_API_URL, etc.

- [ ] Production environment created in Vercel
- [ ] Environment secrets secured (N/A for MVP)

### Deployment Execution

Choose ONE deployment method:

#### Option A: Automatic Deployment (Recommended)

- [ ] Push to main branch or merge PR
  ```bash
  git push origin feature/gpu-calculator-core-features
  ```

- [ ] Vercel automatically detects push
- [ ] Build starts (monitor in Vercel dashboard)
- [ ] Build completes successfully (2-3 minutes)
- [ ] Deployment promoted to production

#### Option B: Manual Deployment via Vercel CLI

- [ ] Install Vercel CLI: `npm install -g vercel`
- [ ] Login to Vercel: `vercel login`
- [ ] Navigate to app directory
  ```bash
  cd products/it4it-dashboard/apps/web
  ```
- [ ] Deploy to production
  ```bash
  vercel --prod
  ```
- [ ] Confirm deployment URL received

#### Option C: Vercel Dashboard

- [ ] Log in to Vercel dashboard
- [ ] Navigate to project
- [ ] Click "Deployments" tab
- [ ] Click "Redeploy" on desired deployment
- [ ] Confirm "Redeploy to Production"

### Monitor Deployment

- [ ] Watch Vercel deployment logs for errors
  - Go to: https://vercel.com/dashboard
  - Select: it4it-dashboard project
  - View: Real-time build logs

- [ ] Build completes without errors
- [ ] Deployment status: "Ready"
- [ ] Production URL generated: `https://it4it-dashboard-[hash].vercel.app`

---

## Verification Checklist

### Smoke Tests (Critical Paths)

Perform these tests on the production URL immediately after deployment:

#### 1. Homepage & Navigation

- [ ] Homepage loads: `/`
  - **Expected**: Redirects to `/dashboard`
  - **Result**: ___________

- [ ] Executive dashboard loads: `/dashboard`
  - **Expected**: Overview of all 4 value streams
  - **Result**: ___________

- [ ] Sidebar navigation works
  - **Expected**: Can click between D2C, R2F, R2D, S2P
  - **Result**: ___________

#### 2. Value Stream Dashboards

- [ ] D2C dashboard: `/d2c`
  - **Expected**: Shows incidents, events, changes metrics
  - **Result**: ___________

- [ ] R2F dashboard: `/r2f`
  - **Expected**: Shows requests, catalog, subscriptions
  - **Result**: ___________

- [ ] R2D dashboard: `/r2d`
  - **Expected**: Shows releases, pipelines, environments
  - **Result**: ___________

- [ ] S2P dashboard: `/s2p`
  - **Expected**: Shows demands, portfolio, investments
  - **Result**: ___________

#### 3. Detail Pages (Sample 1 per stream)

- [ ] D2C Incident Detail: `/d2c/incidents/[id]`
  - Click on any incident from `/d2c/incidents`
  - **Expected**: Shows incident details, timeline, related items
  - **Result**: ___________

- [ ] R2F Request Detail: `/r2f/my-requests/[id]`
  - Click on any request from `/r2f/my-requests`
  - **Expected**: Shows request details, status, approval
  - **Result**: ___________

- [ ] R2D Release Detail: `/r2d/releases/[id]`
  - Click on any release from `/r2d/releases`
  - **Expected**: Shows release details, deployments
  - **Result**: ___________

- [ ] S2P Demand Detail: `/s2p/demands/[id]`
  - Click on any demand from `/s2p/demands`
  - **Expected**: Shows demand details, status
  - **Result**: ___________

#### 4. Data Visualization

- [ ] Charts render correctly
  - **Test**: Executive dashboard charts (line, bar, pie)
  - **Expected**: No errors, data displays, tooltips work
  - **Result**: ___________

- [ ] Tables display data
  - **Test**: Any list view (e.g., `/d2c/incidents`)
  - **Expected**: Rows display, sorting works, pagination works
  - **Result**: ___________

#### 5. Browser Console

- [ ] No JavaScript errors in console
  - **Test**: Open DevTools console, navigate site
  - **Expected**: No red errors (warnings OK)
  - **Result**: ___________

- [ ] No 404 errors for assets
  - **Test**: Check Network tab
  - **Expected**: All assets load (CSS, JS, images)
  - **Result**: ___________

### Performance Testing

- [ ] Lighthouse audit score > 90
  ```
  1. Open production URL in Chrome
  2. Open DevTools (F12)
  3. Lighthouse tab → Generate report (Desktop)
  4. Record scores:
  ```
  - **Performance**: _____ / 100
  - **Accessibility**: _____ / 100
  - **Best Practices**: _____ / 100
  - **SEO**: _____ / 100

- [ ] Initial page load < 3 seconds
  - **Test**: DevTools Network tab → Reload
  - **Result**: _____ seconds

- [ ] Page navigation < 500ms
  - **Test**: Click between dashboards
  - **Result**: _____ ms average

### Cross-Browser Testing

Test on latest versions:

- [ ] **Chrome**
  - Version: _____
  - Status: _____ (Pass/Fail)
  - Issues: _____

- [ ] **Firefox**
  - Version: _____
  - Status: _____ (Pass/Fail)
  - Issues: _____

- [ ] **Safari**
  - Version: _____
  - Status: _____ (Pass/Fail)
  - Issues: _____

- [ ] **Edge**
  - Version: _____
  - Status: _____ (Pass/Fail)
  - Issues: _____

### Responsive Testing

- [ ] Desktop (1920x1080)
  - **Status**: _____ (Pass/Fail)

- [ ] Laptop (1440x900)
  - **Status**: _____ (Pass/Fail)

- [ ] Tablet Landscape (1024x768) - Minimum supported
  - **Status**: _____ (Pass/Fail)

- [ ] Below 1024px shows "Desktop Only" message
  - **Status**: _____ (Pass/Fail)

### Security Testing

- [ ] HTTPS enabled (automatic via Vercel)
  - **Test**: Check URL starts with `https://`
  - **Result**: ___________

- [ ] SSL certificate valid
  - **Test**: Click padlock icon in browser
  - **Result**: ___________

- [ ] Security headers present
  - **Test**: Check Network tab → Headers
  - **Expected**: X-Frame-Options, X-Content-Type-Options, etc.
  - **Result**: ___________

- [ ] No sensitive data exposed in source code
  - **Test**: View page source
  - **Result**: ___________

---

## Post-Deployment Checklist

### Immediate (Within 1 Hour)

- [ ] All verification tests passed
- [ ] Production URL documented
  - **URL**: _____________________
  - **Location**: Update in README.md

- [ ] Monitor Vercel logs for errors (30 minutes)
  - **Time**: _____ to _____
  - **Errors Found**: ___________

- [ ] Notify stakeholders of deployment
  - [ ] CEO
  - [ ] QA Engineer
  - [ ] Frontend Engineer
  - [ ] Technical Writer (for docs update)

- [ ] Update deployment history
  - Location: `docs/DEPLOYMENT.md` → Appendix

### Within 24 Hours

- [ ] Set up uptime monitoring (Optional)
  - Tool: UptimeRobot / Pingdom / Other: _____
  - Interval: 5 minutes
  - Alert: Email / SMS

- [ ] Configure custom domain (Optional)
  - Domain: _____________________
  - DNS configured: Yes / No
  - SSL certificate: Automatic via Vercel

- [ ] Review Vercel Analytics
  - Visitors: _____
  - Top pages: _____
  - Errors: _____

- [ ] Collect initial user feedback
  - Feedback received: _____
  - Issues reported: _____

### Within 1 Week

- [ ] Review Speed Insights for bottlenecks
- [ ] Review error logs (if any)
- [ ] Plan next iteration based on feedback
- [ ] Update Known Issues document (if needed)

### Documentation Updates

- [ ] Update README.md with:
  - [ ] Production URL
  - [ ] Deployment date
  - [ ] Version number

- [ ] Update DEPLOYMENT.md with:
  - [ ] Actual deployment date/time
  - [ ] Any deviations from plan
  - [ ] Lessons learned

- [ ] Create release notes (if applicable)
  - Location: `docs/RELEASE-NOTES.md`
  - Version: 0.1.0
  - Features: All 4 value streams (D2C, R2F, R2D, S2P)

---

## Rollback Checklist (If Issues Found)

**Only use this section if critical issues are found post-deployment**

### Decision Criteria

Rollback if ANY of these occur:

- [ ] Application completely broken (white screen, 500 errors)
- [ ] Critical functionality not working (navigation, dashboards)
- [ ] Security vulnerability discovered
- [ ] Performance degradation > 50% (Lighthouse < 45)
- [ ] Data loss or corruption (N/A for MVP - mock data only)

### Rollback Procedure

1. **Immediate Actions**

   - [ ] Notify CEO and team of issue
   - [ ] Document the issue:
     - **Issue**: _____
     - **Impact**: _____
     - **Time Discovered**: _____

2. **Execute Rollback**

   **Option A: Vercel Dashboard**
   - [ ] Go to Vercel dashboard
   - [ ] Select project → Deployments
   - [ ] Find previous working deployment
   - [ ] Click "..." → "Promote to Production"
   - [ ] Confirm promotion

   **Option B: Vercel CLI**
   ```bash
   vercel ls  # List deployments
   vercel rollback <deployment-url>
   ```

   **Option C: Git Revert**
   ```bash
   git revert HEAD
   git push origin feature/gpu-calculator-core-features
   # Vercel auto-deploys reverted version
   ```

3. **Verify Rollback**

   - [ ] Previous version deployed successfully
   - [ ] Application working normally
   - [ ] Issue resolved

4. **Post-Rollback Actions**

   - [ ] Create bug report with details
   - [ ] Assign to appropriate engineer
   - [ ] Update deployment status to "Rolled Back"
   - [ ] Notify stakeholders of rollback
   - [ ] Schedule fix and re-deployment

---

## Deployment Sign-Off

### Pre-Deployment Approval

- **QA Engineer**: _____________ (Name/Date)
  - Testing Gate: PASS / FAIL
  - Comments: _____

- **Frontend Engineer**: _____________ (Name/Date)
  - Code Review: Approved / Changes Requested
  - Comments: _____

- **DevOps Engineer**: _____________ (Name/Date)
  - Deployment Ready: Yes / No
  - Comments: _____

- **CEO**: _____________ (Name/Date)
  - Production Release: Approved / Denied
  - Comments: _____

### Post-Deployment Sign-Off

- **Verification Completed By**: _____________ (Name/Date)
  - All tests passed: Yes / No
  - Issues found: _____

- **Production Accepted By**: _____________ (Name/Date)
  - Status: Stable / Issues / Rolled Back
  - Comments: _____

---

## Notes & Observations

### Deployment Notes

```
Record any observations during deployment:
- Deployment time (start to finish): _____
- Any warnings or non-critical issues: _____
- Performance observations: _____
```

### Issues Encountered

```
If any issues were encountered and resolved during deployment:
- Issue 1: _____
  - Resolution: _____
- Issue 2: _____
  - Resolution: _____
```

### Lessons Learned

```
What went well? What could be improved for next deployment?
- Went well: _____
- Improvements: _____
```

---

## Contact Information

### Emergency Contacts

- **DevOps Engineer**: Available via Orchestrator
- **Frontend Engineer**: Available via Orchestrator
- **QA Engineer**: Available via Orchestrator
- **CEO**: _____

### Useful Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub Repository**: _____
- **Production URL**: _____ (update after deployment)
- **Deployment Documentation**: `products/it4it-dashboard/docs/DEPLOYMENT.md`

---

**Checklist Version**: 1.0
**Last Updated**: 2026-01-27
**Maintained By**: DevOps Engineer
