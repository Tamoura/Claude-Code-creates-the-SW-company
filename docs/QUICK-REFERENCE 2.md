# Quick Reference Guide

**ConnectSW - AI Software Company**
**Reading Time**: 2 minutes

---

## Orchestrator Commands

The Orchestrator is your primary interface. Talk to it naturally.

### Creating Products

```
/orchestrator New product: [description]
```

**Examples**:
- "New product: task management app"
- "New product: analytics dashboard for sales teams"
- "Prototype: voice-to-text notes app"

---

### Adding Features

```
/orchestrator Add feature: [description] to [product]
```

**Examples**:
- "Add feature: user authentication to my-app"
- "Add feature: export to PDF for reports-app"
- "Add dark mode to dashboard"

---

### Fixing Bugs

```
/orchestrator Fix bug: [description] in [product]
```

**Examples**:
- "Fix bug: login button not working in my-app"
- "Fix bug: data not saving in dashboard"
- "There's a crash when uploading images"

---

### Deployment

```
/orchestrator Ship [product] to production
```

**Examples**:
- "Ship my-app to production"
- "Deploy dashboard to staging"
- "Release version 1.0 of reports-app"

---

### Status & Monitoring

```
/orchestrator Status update
/orchestrator Status of [product]
```

**Examples**:
- "Status update" (all products)
- "Status of stablecoin-gateway"
- "What's the progress on my-app?"

---

## Git Workflow

### Branches

- `main` - Production code
- `feature/[product]/[feature-name]` - New features
- `fix/[product]/[issue]` - Bug fixes
- `release/[product]/v[X.Y.Z]` - Releases

### Common Commands

```bash
# Check current state
git status
git branch

# View recent commits
git log --oneline -10

# View open PRs
gh pr list

# View open issues
gh issue list
```

---

## Development

### Starting a Product

```bash
cd products/[product-name]
npm install
npm run dev
```

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test -- path/to/test.test.ts

# Watch mode
npm test -- --watch
```

### Database

```bash
# Run migrations
npm run db:migrate

# Open database GUI
npm run db:studio

# Seed data
npm run db:seed
```

---

## Agent Roles

| Agent | When to Use |
|-------|-------------|
| **Orchestrator** | All requests (your main interface) |
| **Product Manager** | PRD reviews, requirements |
| **Architect** | System design questions |
| **Backend Engineer** | API or database issues |
| **Frontend Engineer** | UI or UX issues |
| **QA Engineer** | Testing strategy, quality |
| **DevOps Engineer** | Deployment, infrastructure |

**You only talk to the Orchestrator.** It routes work to specialists.

---

## Checkpoints

The Orchestrator pauses for your approval at:

1. **PRD Complete** - Review product requirements
2. **Architecture Complete** - Review system design
3. **Feature Complete** - Review implementation (PR ready)
4. **Pre-Production** - Approve deployment
5. **Blocker** - Decision needed
6. **After 3 Failures** - Strategy discussion

**What to do**: Review, approve, or provide feedback.

---

## Common Patterns

### "How do I...?"

| Task | Command |
|------|---------|
| **Create new product** | `/orchestrator New product: [idea]` |
| **Add authentication** | `/orchestrator Add feature: user auth to [product]` |
| **Fix a bug** | `/orchestrator Fix bug: [description]` |
| **Check progress** | `/orchestrator Status update` |
| **Deploy** | `/orchestrator Ship [product] to production` |
| **Get help** | Ask Orchestrator: "How do I [task]?" |

---

## File Locations

### Company-Level

- Agent definitions: `.claude/agents/`
- Workflows: `.claude/workflows/`
- Documentation: `docs/`
- Orchestrator: `.claude/orchestrator/`

### Product-Level

- Code: `products/[name]/apps/`
- Tests: `products/[name]/apps/[api|web]/tests/`
- Docs: `products/[name]/docs/`
- Database: `products/[name]/apps/api/prisma/`

---

## Ports

See `.claude/PORT-REGISTRY.md` for full list.

**Default Ranges**:
- Frontend: 3100-3199
- Backend: 5000-5099
- Mobile: 8081-8099

**Common Products**:
- Stablecoin Gateway: Frontend 3101, Backend 5001
- GPU Calculator: Frontend 3102, Backend 5002

---

## Troubleshooting Quick Fixes

### "Command not found"

```bash
# Make sure you're in the right directory
cd products/[product-name]
npm install
```

### "Port already in use"

```bash
# Find what's using the port
lsof -i :[port]

# Kill it
kill [PID]

# Or use different port in .env
```

### "Database connection error"

```bash
# Check if database is running
# Run migrations
npm run db:migrate

# Or reset database
npm run db:reset
```

### "Tests failing"

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Run tests again
npm test
```

---

## Documentation Links

- **CEO Guide**: [CEO-GUIDE.md](CEO-GUIDE.md) - Start here
- **Full Index**: [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md) - All docs
- **Examples**: [EXAMPLES.md](EXAMPLES.md) - Real scenarios
- **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues
- **FAQ**: [FAQ.md](FAQ.md) - Questions & answers

---

## Support

**Stuck?**
1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Ask Orchestrator: "How do I [problem]?"
3. Check [FAQ.md](FAQ.md)

**Need a feature?**
- Tell Orchestrator: "I need [feature]"

**Found a bug?**
- Tell Orchestrator: "There's a bug: [description]"

---

**That's it!** You now know enough to use the system effectively.

For deeper understanding, see:
- [CEO Guide](CEO-GUIDE.md) - How the system works (5 min)
- [Examples](EXAMPLES.md) - Real-world scenarios (10 min)
- [Documentation Index](DOCUMENTATION-INDEX.md) - Everything else

---

[Back to Documentation Index](DOCUMENTATION-INDEX.md)
