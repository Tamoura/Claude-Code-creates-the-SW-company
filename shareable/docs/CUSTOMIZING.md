# Customizing

This repository ships with opinions — a stack, a constitution, a set of roles.
They are defaults, not doctrine. Here is what to change, where, and what breaks
if you get it wrong.

## The company name

```bash
tools/rename-company.sh "Northwind"          # --dry-run to preview
tools/rename-company.sh --check              # what still says the old name
```

Renames the company across agents, protocols, registries, package scopes
(`@connectsw/*` → `@northwind/*`) and docs, then resets the orchestrator state.
Run it once, early — the longer you wait, the more of your own work it touches.

## The rules — `.specify/memory/constitution.md`

The constitution is the single source of truth every agent cites. Amend it when
an article does not fit how you work. Two rules about amending:

1. **Amend, do not ignore.** An article that agents are allowed to skip teaches
   them that all articles are optional.
2. **Amend with the reason.** Each article states its rationale; keep that shape
   so the next reader knows what the rule is protecting.

Common amendments:

| Article | Typical change |
|---------|----------------|
| III (TDD, ≥80%) | Lower the threshold, or exempt generated code — but keep "real dependencies" |
| V (default stack) | Swap Fastify for your framework; update `packages/` and the demo product to match |
| VII (ports) | Change the ranges to match your infrastructure |
| IX (diagram-first) | Narrow to architecture docs only if Mermaid is not part of your review culture |

After amending, run `/speckit.analyze` on an existing product: it will tell you
where the repository no longer matches its own rules.

## The stack

Article V names the default stack. Changing it means touching four places:

1. The article itself.
2. `packages/` — the shared code that assumes the stack.
3. `products/taskflow/` — the demo, which is the reference implementation agents copy.
4. `.claude/agents/backend-engineer.md`, `frontend-engineer.md` and the framework
   experts (`fastify-expert.md`, `nextjs-expert.md`, `prisma-expert.md`,
   `tailwind-expert.md`).

If you skip step 3, agents will keep producing Fastify code no matter what the
constitution says — the demo is a stronger signal than the rule.

## Agents

### Changing one

`.claude/agents/<role>.md` is the full definition; `.claude/agents/briefs/<role>.md`
is the short version the Orchestrator loads for simple tasks. Keep them
consistent: the brief is a summary of the definition, not a second opinion.

Each definition covers responsibilities, the protocols it must follow, its
quality bar, and worked examples. The examples do most of the work — an agent
copies the shape of what it is shown far more reliably than it follows an
instruction.

### Adding one

Copy the closest existing definition, rewrite it, then register it:

1. `.claude/agents/<new-role>.md` and `.claude/agents/briefs/<new-role>.md`
2. Add the role to the hierarchy in `.claude/CLAUDE.md` and `README.md`
3. Teach the Orchestrator when to route to it: `.claude/agents/orchestrator.md`
4. Seed its memory file: `.claude/memory/agent-experiences/<new-role>.json`

For a framework specialist (the "expert" agents), `/create-expert` scaffolds the
definition from a framework name.

### Removing one

Delete both files and remove every reference in the Orchestrator's routing table.
An orphaned reference makes the Orchestrator try to invoke an agent that does not
exist — which fails loudly, but wastes a cycle.

## Quality gates

Gates live in `.claude/quality-gates/` and are executed by
`.claude/quality-gates/executor.sh <gate> <product>`.

To add one:

1. Write the check as a script in `.claude/scripts/` that exits non-zero on failure.
2. Register it in `.claude/quality-gates/multi-gate-system.md`.
3. Wire it into `executor.sh`.
4. Add it to the CI workflow so it runs without an agent's cooperation.

Step 4 is the one that matters. A gate only an agent runs is a gate an agent can
skip.

## Enforcement hooks

`.githooks/` holds four hooks:

| Hook | Enforces |
|------|----------|
| `commit-msg` | Article VI — `feat`/`fix`/`refactor`/`test` commits name a requirement id |
| `pre-commit` | Secret scanning, staged-file sanity |
| `pre-push` | The preflight checks CI would fail on |
| `post-commit` | Appends to the local audit trail |

Loosening them is a legitimate choice — just know which article you are dropping.
`commit-msg` is the one to keep longest: traceability is what makes the rest of
the system auditable.

## Context budget

`.claude/protocols/context-engineering.md` defines how much context each task
complexity gets. If your agents run out of room on large features, adjust the
budgets there rather than trimming agent definitions — the definitions are what
keep output consistent.

## The demo product

`products/taskflow` exists to show what "done" looks like. Once your own
products fill that role, delete it:

```bash
rm -rf products/taskflow .github/workflows/taskflow-ci.yml
# then remove its rows from .claude/PRODUCT-REGISTRY.md and .claude/PORT-REGISTRY.md
```

Keep it until at least one of your own products has a complete spec → plan →
tasks → tests trail. Agents pattern-match on what is in the repository, and an
empty `products/` teaches them nothing.
