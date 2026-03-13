# Create Expert Agent Command

Create a new technology-expert subagent with curated domain knowledge, anti-patterns, and security guidance.

## Usage

```
/create-expert <technology-name>
```

Example:
```
/create-expert zod
/create-expert playwright
/create-expert react-hook-form
```

## Your Task

You are building a specialized **knowledge agent** — not a role-based agent. Expert agents advise role-based agents (Backend Engineer, Frontend Engineer, etc.) with deep, curated technology knowledge.

## Step 1: Clarify Requirements

Before creating the agent, answer these questions (ask the user if unclear):

1. **Technology**: What specific technology does this expert cover?
2. **Version**: What version(s) are relevant? (Check the project's package.json)
3. **Consumers**: Which role-based agents will consult this expert?
4. **Scope**: What specific areas of the technology need coverage?
   - Core patterns and architecture
   - Security considerations
   - Performance optimization
   - Testing patterns
   - Common gotchas

## Step 2: Research

Before writing the agent, gather authoritative information:

1. **Check official docs** — Use WebFetch to read the technology's official documentation
2. **Check recent CVEs** — Search for security vulnerabilities in the last 12 months
3. **Review existing code** — Grep the codebase for current usage patterns of this technology
4. **Read existing experts** — Study 2-3 existing expert agents for structure and style:
   - `.claude/agents/nextjs-expert.md`
   - `.claude/agents/fastify-expert.md`
   - `.claude/agents/prisma-expert.md`
   - `.claude/agents/tailwind-expert.md`

## Step 3: Write the Agent File

Create `.claude/agents/<technology>-expert.md` following this structure:

```markdown
---
name: <Technology> Expert
description: Specialized knowledge agent for <Technology> patterns, <key areas>. Consulted by <Consumer Agents>.
---

# <Technology> Expert Agent

You are a specialized <Technology> knowledge agent for ConnectSW. You provide authoritative guidance on <scope areas>. You do NOT write application code directly — you advise other agents.

## When to Consult This Expert

- [Specific scenario 1]
- [Specific scenario 2]
- [Specific scenario 3]

## Core Expertise Areas

### 1. [Area 1 — e.g., Core Architecture]
[Patterns with code examples]

### 2. [Area 2 — e.g., Security]
[Known CVEs, anti-patterns, mandatory practices]

### 3. [Area 3 — e.g., Performance]
[Optimization techniques with benchmarks where possible]

### 4. [Area 4 — e.g., Testing]
[Testing patterns specific to this technology]

## Anti-Patterns
[Explicit list of what NOT to do, with explanations]

## Known Gotchas
[Numbered list of non-obvious pitfalls]

## Official Documentation
[Curated links — only the most useful pages]

## ConnectSW-Specific Guidance
[How this technology fits into our stack, referencing Constitution articles]
```

### Quality Checklist for Expert Agents

The agent file MUST include:

- [ ] **YAML frontmatter** with name and description
- [ ] **"When to Consult" section** — clear trigger conditions
- [ ] **Code examples** — at least 3 with ✅ GOOD and ❌ BAD patterns
- [ ] **Security section** — CVEs if any, mandatory security patterns
- [ ] **Anti-patterns section** — explicit "NEVER do this" examples
- [ ] **Known gotchas** — numbered list of non-obvious pitfalls
- [ ] **Official docs links** — curated, not exhaustive
- [ ] **ConnectSW-specific section** — references relevant Constitution articles
- [ ] **No generic advice** — everything must be specific and actionable

## Step 4: Register the Expert

After creating the agent file:

1. **Update the expert routing table** in any `/plan-task` command if it exists
2. **Notify the user** which role-based agents should delegate to this expert

## Step 5: Verify

1. Confirm the file is well-formatted markdown
2. Confirm YAML frontmatter parses correctly
3. Confirm code examples are syntactically correct
4. Confirm all documentation links are valid (use WebFetch to check)

## Output

Report to the user:
- File created: `.claude/agents/<technology>-expert.md`
- Consuming agents: [list]
- Key areas covered: [list]
- CVEs/security issues documented: [count]
- Suggested next step: "Consider creating experts for [related technologies]"
