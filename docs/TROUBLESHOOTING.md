# Troubleshooting Guide

**ConnectSW - AI Software Company**

This guide helps you solve common problems quickly.

---

## Quick Diagnosis

**Use this decision tree**:

```
Is the problem with...
├─ Orchestrator/Commands? → See "Orchestrator Issues"
├─ Development (npm/code)? → See "Development Issues"
├─ Database? → See "Database Issues"
├─ Tests failing? → See "Testing Issues"
├─ Deployment? → See "Deployment Issues"
└─ Something else? → See "General Issues"
```

---

## Orchestrator Issues

### Problem: Orchestrator doesn't respond

**Symptoms**:
- Command runs but nothing happens
- No checkpoints, no progress

**Solutions**:

1. **Check if Claude Code is running**
   ```bash
   # Is this directory a Claude Code session?
   # You should see Claude as active
   ```

2. **Verify command format**
   ```bash
   # Correct:
   /orchestrator New product: my-app

   # Wrong:
   orchestrator New product: my-app  (missing /)
   ```

3. **Check .claude/orchestrator/ exists**
   ```bash
   ls .claude/orchestrator/
   # Should see: orchestrator-enhanced.md, state.yml, etc.
   ```

4. **Try simpler command first**
   ```bash
   /orchestrator Status update
   ```

---

### Problem: "Agent not found" error

**Symptoms**:
- Error: "Agent type 'Backend' not found"
- Error: "Available agents: Bash, general-purpose..."

**Solutions**:

1. **Orchestrator spawns sub-agents internally**
   - You don't directly invoke agents
   - Always talk to Orchestrator only

2. **If you see this error**:
   - The Orchestrator is trying to spawn an agent
   - Check if `.claude/agents/[agent-name].md` exists
   ```bash
   ls .claude/agents/
   # Should see: backend-engineer.md, frontend-engineer.md, etc.
   ```

3. **If agent file is missing**:
   - System may not be fully set up
   - Contact support or check documentation

---

### Problem: Checkpoint stuck / No approval prompt

**Symptoms**:
- Orchestrator says "Pausing for approval" but doesn't prompt
- Stuck at checkpoint

**Solutions**:

1. **Manually approve**:
   - Respond to Orchestrator: "Approved" or "Continue"

2. **Check state file**:
   ```bash
   cat .claude/orchestrator/state.yml
   # Look for pending_decisions or checkpoints
   ```

3. **If truly stuck**:
   - Ask Orchestrator: "What are you waiting for?"
   - Or: "Skip this checkpoint and continue"

---

## Development Issues

### Problem: `npm install` fails

**Symptoms**:
- "EACCES: permission denied"
- "Cannot find module"
- Package installation errors

**Solutions**:

1. **Check Node.js version**
   ```bash
   node -v  # Should be 20+
   npm -v   # Should be 10+
   ```

2. **Clear cache and retry**
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Permission issues**
   ```bash
   # Don't use sudo! Fix npm permissions:
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   # Add to PATH: export PATH=~/.npm-global/bin:$PATH
   ```

4. **Wrong directory**
   ```bash
   # Make sure you're in the right place
   cd products/[product-name]
   npm install
   ```

---

### Problem: Port already in use

**Symptoms**:
- "Error: listen EADDRINUSE: address already in use :::3100"
- App won't start

**Solutions**:

1. **Find what's using the port**
   ```bash
   # On macOS/Linux:
   lsof -i :3100

   # On Windows:
   netstat -ano | findstr :3100
   ```

2. **Kill the process**
   ```bash
   # macOS/Linux:
   kill -9 [PID]

   # Windows:
   taskkill /PID [PID] /F
   ```

3. **Use different port**
   ```bash
   # Check .claude/PORT-REGISTRY.md for available ports
   # Update .env file:
   PORT=3102  # or other available port
   ```

4. **Check if multiple products running**
   ```bash
   # Stop all:
   pkill -f "npm run dev"
   # Or close other terminal windows
   ```

---

### Problem: `npm run dev` fails

**Symptoms**:
- Server crashes immediately
- "Cannot find module" errors
- Compilation errors

**Solutions**:

1. **Check environment variables**
   ```bash
   # Copy example file if missing
   cp .env.example .env

   # Edit .env and fill in required values
   nano .env
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Check for TypeScript errors**
   ```bash
   npm run typecheck
   # Or
   npx tsc --noEmit
   ```

4. **Clear build cache**
   ```bash
   rm -rf .next dist build
   npm run dev
   ```

---

## Database Issues

### Problem: "Database connection failed"

**Symptoms**:
- "Error: connect ECONNREFUSED"
- "Can't reach database server"
- Prisma connection errors

**Solutions**:

1. **Check DATABASE_URL**
   ```bash
   # In .env file, verify format:
   DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
   ```

2. **Is PostgreSQL running?**
   ```bash
   # macOS:
   brew services list | grep postgresql
   brew services start postgresql@15

   # Linux:
   sudo systemctl status postgresql
   sudo systemctl start postgresql

   # Docker:
   docker ps | grep postgres
   docker start postgres-container
   ```

3. **Database exists?**
   ```bash
   # Create database if missing
   createdb [dbname]

   # Or via Prisma
   npx prisma db push
   ```

4. **Run migrations**
   ```bash
   npm run db:migrate
   ```

---

### Problem: "Migration failed"

**Symptoms**:
- Prisma migration errors
- "Column already exists"
- Schema drift errors

**Solutions**:

1. **Reset database** (CAUTION: Deletes all data)
   ```bash
   npm run db:reset
   # Or
   npx prisma migrate reset --force
   ```

2. **Check migration files**
   ```bash
   ls prisma/migrations/
   # Should see dated migration folders
   ```

3. **Resolve conflicts**
   ```bash
   # If schema differs from database:
   npx prisma db pull  # Pull current schema
   # Then manually resolve differences
   ```

4. **Skip and mark as applied** (if certain it's safe)
   ```bash
   npx prisma migrate resolve --applied [migration-name]
   ```

---

### Problem: "Cannot open Prisma Studio"

**Symptoms**:
- `npm run db:studio` fails
- Port 5555 already in use

**Solutions**:

1. **Different port**
   ```bash
   npx prisma studio --port 5556
   ```

2. **Kill existing studio**
   ```bash
   lsof -i :5555
   kill -9 [PID]
   ```

3. **Check DATABASE_URL is set**
   ```bash
   echo $DATABASE_URL
   # Should not be empty
   ```

---

## Testing Issues

### Problem: All tests failing

**Symptoms**:
- Every test fails with same error
- "Cannot find module" in tests
- Test database connection errors

**Solutions**:

1. **Clean install**
   ```bash
   rm -rf node_modules
   npm install
   ```

2. **Check test DATABASE_URL**
   ```bash
   # In .env.test or similar:
   DATABASE_URL="postgresql://localhost:5432/myapp_test"
   ```

3. **Run migrations for test DB**
   ```bash
   NODE_ENV=test npm run db:migrate
   ```

4. **Clear Jest cache**
   ```bash
   npx jest --clearCache
   ```

---

### Problem: Specific test failing

**Symptoms**:
- One test fails, others pass
- Test was working before

**Solutions**:

1. **Run only that test**
   ```bash
   npm test -- path/to/test.test.ts
   ```

2. **Check test isolation**
   ```bash
   # Does it pass alone but fail with others?
   npm test -- path/to/test.test.ts --testNamePattern="specific test name"
   ```

3. **Database cleanup issue**
   ```bash
   # Add afterEach cleanup:
   afterEach(async () => {
     await prisma.user.deleteMany();
     // Clean up test data
   });
   ```

4. **Check timing issues**
   ```bash
   # Add longer timeout:
   test('my test', async () => {
     // test code
   }, 10000); // 10 second timeout
   ```

---

### Problem: E2E tests failing

**Symptoms**:
- Playwright tests fail
- "Element not found" errors
- Timeouts

**Solutions**:

1. **Is app running?**
   ```bash
   # E2E tests need app running first
   npm run dev  # In one terminal
   npm run test:e2e  # In another
   ```

2. **Headed mode** (see what's happening)
   ```bash
   npx playwright test --headed
   ```

3. **Debug mode**
   ```bash
   npx playwright test --debug
   ```

4. **Update Playwright**
   ```bash
   npm install -D @playwright/test@latest
   npx playwright install
   ```

---

## Deployment Issues

### Problem: Deployment fails

**Symptoms**:
- Build errors during deployment
- Railway/Render deployment fails
- Production errors

**Solutions**:

1. **Check build locally first**
   ```bash
   cd apps/api && npm run build
   cd apps/web && npm run build
   ```

2. **Environment variables set?**
   ```bash
   # In Railway/Render dashboard:
   # Verify all required env vars are set
   # Check for typos
   ```

3. **Check build logs**
   ```bash
   # Railway:
   railway logs

   # Render:
   # Check deployment logs in dashboard
   ```

4. **Database migrations**
   ```bash
   # Did migrations run?
   # Railway: Add to build command
   # "npm run db:migrate && npm run build"
   ```

---

### Problem: App deployed but not working

**Symptoms**:
- 500 errors in production
- API not responding
- Database connection errors

**Solutions**:

1. **Check logs**
   ```bash
   # Railway:
   railway logs

   # Render:
   # Dashboard → Logs tab

   # Look for errors, stack traces
   ```

2. **Environment variables**
   ```bash
   # Verify in platform dashboard:
   # - DATABASE_URL (production database)
   # - JWT_SECRET (set and long)
   # - All required secrets
   ```

3. **Database accessible?**
   ```bash
   # Is production DB reachable from app?
   # Check firewall rules
   # Verify connection string
   ```

4. **Restart service**
   ```bash
   # Railway:
   railway restart

   # Render:
   # Manual deploy or restart
   ```

---

## General Issues

### Problem: Git conflicts

**Symptoms**:
- "Merge conflict" when pulling
- Can't switch branches
- Conflicting files

**Solutions**:

1. **Simple conflicts**
   ```bash
   # Open conflicting files
   # Look for <<<<<<< HEAD markers
   # Edit to keep desired code
   # Remove markers
   git add .
   git commit -m "fix: resolve merge conflicts"
   ```

2. **Complex conflicts**
   ```bash
   # Abort and try different approach
   git merge --abort

   # Or use a tool
   git mergetool
   ```

3. **When in doubt**
   ```bash
   # Save your work
   git stash

   # Pull latest
   git pull

   # Reapply your changes
   git stash pop
   ```

---

### Problem: Out of disk space

**Symptoms**:
- "No space left on device"
- Can't install packages
- Can't commit

**Solutions**:

1. **Clean node_modules**
   ```bash
   # Find large node_modules folders
   find . -name "node_modules" -type d -prune -exec du -sh {} \;

   # Delete them (can reinstall)
   find . -name "node_modules" -type d -prune -exec rm -rf {} +
   ```

2. **Clean Docker**
   ```bash
   docker system prune -a --volumes
   ```

3. **Clean Git**
   ```bash
   git gc --aggressive --prune=now
   ```

4. **Check what's using space**
   ```bash
   # macOS/Linux:
   du -sh * | sort -h

   # Or use ncdu for interactive view:
   brew install ncdu
   ncdu
   ```

---

## Emergency Procedures

### Production is Down

**Steps**:

1. **Alert Orchestrator**
   ```
   /orchestrator URGENT: Production down for [product]
   ```

2. **Check status page**
   ```bash
   curl https://api.product.com/health
   ```

3. **View recent deployments**
   ```bash
   git log --oneline -5
   ```

4. **Rollback if needed**
   ```
   /orchestrator Rollback [product] to previous version
   ```

5. **Check monitoring**
   - Error rates
   - Response times
   - Server resources

---

### Data Loss / Corruption

**Steps**:

1. **STOP immediately**
   - Don't make it worse
   - Don't run migrations
   - Don't delete anything

2. **Check backups**
   ```bash
   # Railway/Render: Check backup settings
   # Local: Check backup folder
   ```

3. **Alert team**
   ```
   /orchestrator CRITICAL: Data issue in [product]
   ```

4. **Restore from backup**
   ```bash
   # Follow platform-specific restore procedure
   # Test in staging first if possible
   ```

---

## Still Stuck?

### Before Asking for Help

**Gather this information**:

1. **What were you trying to do?**
   - Exact command or steps

2. **What happened instead?**
   - Full error message
   - Screenshot if relevant

3. **What have you tried?**
   - List troubleshooting steps

4. **Environment info**:
   ```bash
   node -v
   npm -v
   git --version
   cat package.json | grep "name\|version"
   ```

### Get Help

1. **Ask Orchestrator**
   ```
   /orchestrator I'm getting this error: [paste error]
   ```

2. **Check FAQ**
   - [FAQ.md](FAQ.md)

3. **Review Examples**
   - [EXAMPLES.md](EXAMPLES.md)

4. **Search Documentation**
   - [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md)

---

[Back to Documentation Index](DOCUMENTATION-INDEX.md)
