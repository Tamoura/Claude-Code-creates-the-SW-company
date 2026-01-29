# Frequently Asked Questions

**ConnectSW - AI Software Company**

Quick answers to common questions.

---

## General Questions

### What is ConnectSW?

An AI-first software company where you (the CEO) provide direction and Claude Code agents handle all execution - from requirements to deployment.

**In short**: You say what you want, agents build it.

---

### How does it work?

1. You tell the Orchestrator what you want
2. Orchestrator breaks it down into tasks
3. Specialist agents execute tasks in parallel
4. Orchestrator pauses at checkpoints for your approval
5. Product gets deployed

**Example**: "New product: task manager" → Full working app in 3-5 days.

---

### Do I need to know how to code?

No. You interact only with the Orchestrator using natural language.

**CEO role**: Product vision, approve checkpoints, make decisions

**Agents do**: All the coding, testing, deployment

---

### What can I build with this?

Anything you'd normally build with a software team:
- Web applications (SaaS, e-commerce, dashboards)
- Mobile apps (iOS + Android via React Native)
- APIs and backend services
- Internal tools

**See**: [EXAMPLES.md](EXAMPLES.md) for real scenarios

---

### How fast can I build a product?

**Depends on complexity**:

- **Prototype**: 4-6 hours
- **MVP**: 3-5 days
- **Full Product**: 1-2 weeks
- **Enterprise App**: 4-8 weeks

**Factors**: Features, integrations, testing requirements, design complexity

---

### Can I work on multiple products at once?

Yes. Agents can work in parallel on different products.

**Example**:
```
/orchestrator New product: task-manager
/orchestrator New product: analytics-dashboard
/orchestrator New product: mobile-app
```

All three will be worked on simultaneously.

---

## Orchestrator Questions

### How do I talk to the Orchestrator?

Use the command:
```
/orchestrator [your request]
```

**Examples**:
- `/orchestrator New product: CRM for small businesses`
- `/orchestrator Add feature: dark mode to my-app`
- `/orchestrator Status update`

---

### What commands does the Orchestrator understand?

The Orchestrator understands natural language. No strict commands needed.

**Common patterns**:
- "New product: [description]"
- "Add feature: [description] to [product]"
- "Fix bug: [description] in [product]"
- "Ship [product] to production"
- "Status update"
- "Status of [product]"

**Tip**: Be specific and include product name.

---

### What are checkpoints?

Points where the Orchestrator pauses and asks for your approval.

**Checkpoints**:
1. PRD complete
2. Architecture complete
3. Feature/sprint complete
4. Pre-deployment
5. After 3 failed attempts
6. When a decision is needed

**Why**: Ensures you stay in control and review before major steps.

---

### Can I skip checkpoints?

No, checkpoints are required for quality and safety.

But you can approve quickly:
- "Approved"
- "Continue"
- "Ship it"

---

### What if I disagree with the approach?

Provide feedback at the checkpoint:

**Example**:
```
I don't like this architecture.
Use PostgreSQL instead of MongoDB.
Separate the admin panel into its own app.
```

Agent will revise and present updated plan.

---

## Agent Questions

### Which agents are available?

**Strategic**:
- Product Strategist
- Innovation Specialist

**Product & Design**:
- Product Manager
- UI/UX Designer

**Engineering**:
- Architect
- Backend Engineer
- Frontend Engineer
- Mobile Developer
- Security Engineer

**Operations**:
- QA Engineer
- DevOps Engineer

**Support**:
- Technical Writer
- Support Engineer

**See**: [Documentation Index](DOCUMENTATION-INDEX.md#agent-documentation) for details

---

### Can I talk directly to agents?

No. You only interact with the Orchestrator.

**Why**: Orchestrator coordinates work and prevents conflicts.

**Exception**: Review agent work (PRDs, code, etc.) in checkpoints.

---

### Can I add more agents?

System comes with 13 pre-configured agents. Custom agents can be added but require system knowledge.

**Recommendation**: Work with existing agents first. They cover most needs.

---

### What if an agent makes a mistake?

1. Agent will retry (up to 3 times)
2. After 3 failures, Orchestrator escalates to you
3. You can provide guidance or request different approach

**Example**: "Tests keep failing" → Orchestrator pauses → You decide next step

---

## Technical Questions

### What technology stack is used?

**Default stack** (can be customized):

**Backend**:
- Node.js 20+ / TypeScript 5+
- Fastify (API framework)
- PostgreSQL (database)
- Prisma (ORM)

**Frontend**:
- Next.js 14+ / React 18+
- Tailwind CSS
- TypeScript

**Mobile**:
- Expo / React Native
- TypeScript

**See**: `.claude/architecture/reusable-components.md` for full stack

---

### Can I use different technologies?

Yes. Specify in your request:

**Example**:
```
/orchestrator New product: analytics dashboard using Vue.js and MongoDB
```

Architect will adjust accordingly.

**Default is recommended** for consistency across products.

---

### Where is the code stored?

```
products/
└── [product-name]/
    ├── apps/
    │   ├── api/         # Backend code
    │   └── web/         # Frontend code
    ├── docs/            # Product documentation
    └── README.md
```

**Git**: Each product is version-controlled.

---

### How are databases handled?

**Development**: Local PostgreSQL (or Docker)

**Production**: Managed database (Railway, Render, AWS RDS)

**Migrations**: Prisma migrations (automatic)

**Backups**: Configured during deployment

---

### How does testing work?

**Automated**:
- Unit tests (Jest)
- Integration tests (Jest + real DB)
- E2E tests (Playwright)
- Run before every deployment

**Manual**:
- You review at checkpoints
- QA Engineer performs smoke tests

**Coverage**: 80%+ required before deployment

---

### How does deployment work?

**Platforms supported**:
- Railway (recommended)
- Render
- Vercel
- AWS
- Self-hosted

**Process**:
1. DevOps Engineer prepares deployment
2. Orchestrator pauses for approval
3. You approve
4. Automated deployment
5. Smoke tests run
6. Monitoring enabled

**Time**: 30-60 minutes

---

## Product Questions

### Can I modify generated code?

Yes. You can edit any code directly.

**Recommendation**: Tell Orchestrator what you want changed instead.

**Why**: Agents understand the full codebase. Manual changes might conflict.

**If you do edit manually**: Commit changes to git so agents can see them.

---

### What if I want to add a feature later?

```
/orchestrator Add feature: [description] to [product]
```

Agent will:
1. Update documentation
2. Implement feature
3. Write tests
4. Create PR for review

---

### Can I use this for client projects?

Yes, if:
- You own the relationship with the client
- You review all deliverables before shipping
- You handle support and maintenance

**Not recommended for**: Large enterprise clients (yet)

---

### Can multiple people work on the same product?

Currently optimized for single CEO model.

**Workaround**: Multiple CEOs can work on different products simultaneously.

**Future**: Multi-user collaboration planned.

---

### What about documentation?

**Automatically generated**:
- API documentation
- README files
- Code comments
- Architecture diagrams (text-based)

**Written by Technical Writer agent**:
- User guides
- Integration guides
- Troubleshooting docs

---

## Cost & Resources

### How much does this cost?

**System itself**: Free (uses Claude Code CLI)

**Infrastructure costs**:
- Development: $0 (run locally)
- Staging: ~$20/month (Railway/Render free tiers)
- Production: Varies by product ($20-$200/month)

**Claude API**: Included if using Claude Code

---

### What are the resource limits?

**Token limits**: Claude Code manages automatically

**Processing**:
- Concurrent products: No hard limit (depends on your machine)
- Parallel agents: 3-5 active at once
- Storage: Local disk space

**See**: `.claude/resource-management/` for details

---

### Can this scale to large applications?

Yes, with caveats:

**Good for**:
- Startups (0-100k users)
- Internal tools
- MVPs and prototypes
- Small to medium SaaS

**Considerations for scale**:
- You'll still need DevOps expertise for scaling
- Monitoring and optimization may require manual work
- Agent-generated code may need optimization for high traffic

---

## Workflow Questions

### What's the typical workflow?

**Day 1**: Ideation
```
/orchestrator New product: [idea]
Review PRD → Approve
Review Architecture → Approve
```

**Days 2-4**: Development
```
Agents build features in parallel
Review progress daily
Approve checkpoints
```

**Day 5**: Launch
```
Review final product
Approve deployment
Monitor production
```

---

### How do I track progress?

```
/orchestrator Status update
```

Shows:
- Active products
- What each agent is working on
- Pending checkpoints
- ETAs
- Recent activity

**Update frequency**: Real-time (query anytime)

---

### Can I pause development?

Yes:
```
/orchestrator Pause work on [product]
```

Resume later:
```
/orchestrator Resume work on [product]
```

**Note**: Agents remember context (stored in memory system)

---

### What if I change my mind mid-development?

Tell the Orchestrator:
```
/orchestrator Change of plans for [product]: [new direction]
```

Agent will:
1. Assess current progress
2. Propose pivot strategy
3. Pause for your approval
4. Execute new direction

---

## Quality & Security

### How is code quality ensured?

**Multiple layers**:
1. **Code review**: Senior-level agents write code
2. **Automated tests**: 80%+ coverage required
3. **Quality gates**: Security, performance, testing gates
4. **Linting**: ESLint + Prettier automatic
5. **Type safety**: TypeScript everywhere

---

### What about security?

**Built-in**:
- Security Engineer reviews all code
- OWASP Top 10 checks
- Dependency scanning
- No secrets in code
- Security headers configured

**Before production**:
- Security audit runs automatically
- Critical issues block deployment
- Remediation checklist provided

**See**: Example in stablecoin-gateway security audit

---

### Are tests actually reliable?

**Testing approach**:
- **No mocks**: Real databases, real services
- **Real scenarios**: Test actual user flows
- **E2E coverage**: Complete workflows tested
- **CI/CD**: Tests run on every commit

**TDD**: Tests written before code (Red-Green-Refactor)

---

### Can I trust AI-generated code?

**Quality controls**:
- Agents use proven patterns
- Code follows industry best practices
- Every change is tested
- You review at checkpoints
- Rollback available if issues

**Recommendation**: Review critical paths yourself (auth, payments, data handling)

---

## Troubleshooting

### Something isn't working. What do I do?

1. **Check** [Troubleshooting Guide](TROUBLESHOOTING.md)
2. **Ask Orchestrator**: "/orchestrator I'm getting this error: [error]"
3. **Check logs**: `railway logs` or check dashboard
4. **Review recent changes**: `git log --oneline -10`

---

### Tests are failing. Should I be concerned?

**If during development**: Normal. Agents will fix.

**If blocking deployment**: Yes. Review errors, ask Orchestrator for help.

**If persistent**: Orchestrator will escalate after 3 attempts.

---

### Deployment failed. Now what?

**Don't panic**. Deployments have rollback.

**Steps**:
1. Check deployment logs
2. Common issues: Missing env vars, build errors
3. Fix issue
4. Retry deployment
5. Or rollback: `/orchestrator Rollback [product]`

**See**: [Troubleshooting - Deployment Issues](TROUBLESHOOTING.md#deployment-issues)

---

## Advanced Questions

### Can I customize agent behavior?

Agent definitions are in `.claude/agents/`. You can modify them, but:

**Risk**: Breaking core functionality

**Better approach**: Provide specific instructions in your requests

**Example**: "Use TailwindCSS classes, no custom CSS" rather than editing Frontend Engineer

---

### How does agent memory work?

Agents learn from experience:
- Remember successful patterns
- Avoid past mistakes
- Share knowledge across products
- Build company knowledge graph

**Stored in**: `.claude/memory/`

**Query**: `/orchestrator What have we learned about authentication?`

---

### Can I export a product?

Yes. Each product is standalone:

```
cd products/[product-name]
# This is a complete codebase
# Can be moved anywhere
```

**Includes**:
- All source code
- Tests
- Documentation
- Git history
- Dependencies

---

### Can I import existing projects?

Limited support. Better to rebuild:

**Approach**:
1. Describe existing project to Orchestrator
2. Request similar product
3. Manually port unique features
4. Test thoroughly

**Why**: Ensures consistency with system patterns

---

## Getting Help

### Where can I learn more?

**Start with**:
- [CEO Guide](CEO-GUIDE.md) - 5 minutes
- [Quick Reference](QUICK-REFERENCE.md) - 2 minutes
- [Examples](EXAMPLES.md) - 10 minutes

**Go deeper**:
- [Documentation Index](DOCUMENTATION-INDEX.md) - Everything
- [Troubleshooting](TROUBLESHOOTING.md) - Problems and solutions

---

### My question isn't here

Ask the Orchestrator:
```
/orchestrator [your question]
```

It has access to all documentation and can help.

---

### Can I suggest improvements to the system?

Yes! Tell the Orchestrator:
```
/orchestrator Suggestion: [your idea]
```

Or discuss with CEO (if that's not you).

---

## Questions About This FAQ

### This FAQ is too long

See [Quick Reference](QUICK-REFERENCE.md) for condensed version.

---

### I need a specific answer quickly

Use your browser's Find function (Ctrl+F / Cmd+F) to search this page.

Or ask Orchestrator directly.

---

[Back to Documentation Index](DOCUMENTATION-INDEX.md)
