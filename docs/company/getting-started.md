# Getting Started with ConnectSW

Welcome to ConnectSW! This guide explains how to work with your AI-powered development team.

## Your Role: CEO

As CEO, you focus on:

1. **Vision** - What products to build and why
2. **Direction** - Features, priorities, and decisions
3. **Approval** - Review and approve at checkpoints
4. **Customers** - Relationships, feedback, sales

You don't need to:
- Write code
- Manage individual tasks
- Coordinate between agents
- Handle deployments

The Orchestrator handles all execution.

## Starting a Session

1. Open your terminal
2. Navigate to the ConnectSW directory
3. Start Claude Code
4. You're now talking to the Orchestrator

## What You Can Say

### Starting New Products

```
"New product: [description]"
"I want to build [idea]"
"Start a product for [purpose]"
```

The Orchestrator will:
1. Gather requirements (may ask clarifying questions)
2. Create PRD (checkpoint for your review)
3. Design architecture (checkpoint for your review)
4. Set up foundation (checkpoint for your review)
5. Begin development

### Adding Features

```
"Add [feature] to [product]"
"[Product] needs [capability]"
"Implement [description]"
```

### Reporting Bugs

```
"There's a bug in [product]: [description]"
"[Something] isn't working in [product]"
"Users are reporting [issue]"
```

### Deploying

```
"Ship [product] to production"
"Deploy [product]"
"Release [product] v[X.Y.Z]"
```

### Getting Status

```
"Status"
"What's the status of [product]?"
"Show me open PRs"
"What's being worked on?"
```

## Checkpoints

The Orchestrator pauses at key moments for your approval:

| Checkpoint | What You Review |
|------------|-----------------|
| PRD Complete | Product requirements - is this what you want? |
| Architecture Complete | Technical approach - any concerns? |
| Feature Complete | PR with code - ready to merge? |
| Pre-Deployment | Final check before production |
| Decision Needed | Choice between options |
| Escalation | Something failed, needs your input |

At each checkpoint, you can:
- **Approve** - "Yes", "Looks good", "Approve"
- **Request Changes** - "Change X to Y", "I want it to..."
- **Ask Questions** - "Why did you choose X?", "What about Y?"

## Best Practices

### Be Clear About Goals

```
# Good
"Build a task management app for remote teams with real-time collaboration"

# Too vague
"Build something for tasks"
```

### Provide Context

```
# Good
"Add OAuth login with Google - our users are mostly using Google Workspace"

# Missing context
"Add Google login"
```

### Trust the Process

The agents follow TDD and have quality gates. If tests pass, the code works. Review PRs for:
- Does it do what you asked?
- Any security concerns?
- Anything look off?

You don't need to review every line of code.

## Monitoring Progress

### Check Active Work

```
"What's being worked on?"
"Status of [feature]"
```

### Review PRs

```
"Show open PRs"
"Review PR #[number]"
```

### Check Issues

```
"Show open bugs"
"What issues are there in [product]?"
```

## Common Workflows

### Daily Routine

1. "Status" - See what happened
2. Review any pending PRs
3. Approve checkpoints
4. Give new direction if needed

### Starting a Sprint

1. "Start sprint [N] for [product]"
2. Review sprint plan at checkpoint
3. Agents execute
4. Review completed work

### Handling Bugs

1. Report the bug
2. Support Engineer investigates
3. Fix is implemented
4. Review fix PR
5. Approve deployment

## Getting Help

- Ask the Orchestrator: "Help" or "What can you do?"
- Read the docs in `/docs/`
- Check agent definitions in `/.claude/agents/`
