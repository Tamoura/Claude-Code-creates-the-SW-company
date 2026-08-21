# Installation

Two ways to use this repository.

- **Fork it** — you want the whole company: agents, constitution, gates, demo.
  Follow [GETTING-STARTED.md](GETTING-STARTED.md).
- **Install into an existing repository** — you have a codebase already and want
  the agent system on top of it. That is this guide.

## Prerequisites

```bash
node --version    # 20+
pnpm --version    # 10+   (npm i -g pnpm)
docker --version  # any recent release
git --version     # 2.9+  (core.hooksPath)
rsync --version   # used by the installer
```

## Install into an existing repository

```bash
# 1. Clone this repository somewhere outside your project
git clone https://github.com/<owner>/<repo>.git ~/src/agent-company

# 2. From YOUR repository, run the installer
cd ~/src/my-project
CONNECTSW_SOURCE=~/src/agent-company \
  ~/src/agent-company/.claude/scripts/setup-connectsw.sh "MyCompany"
```

The installer copies `.claude/`, `.specify/`, `.githooks/`, the shared
`packages/`, the issue and PR templates, and the docs; renames the company
throughout; and initialises `.claude/orchestrator/state.yml` for your repo. It
never overwrites files you already have unless you pass `--force`.

Then:

```bash
git config core.hooksPath .githooks
git status              # review everything it added before committing
```

### Single-repo vs monorepo

The scripts detect which layout you are in via
`.claude/scripts/resolve-product.sh`:

| | Monorepo | Single repo |
|---|---|---|
| Products live in | `products/<name>/` | the repository root |
| `PRODUCT_DIR` resolves to | `products/<name>` | `.` |

For a single-repo project, run `.claude/scripts/setup-single-repo.sh` after the
installer. It adjusts the registries and workflows to the flat layout.

### Updating later

```bash
cd ~/src/agent-company && git pull
cd ~/src/my-project
CONNECTSW_SOURCE=~/src/agent-company ~/src/agent-company/.claude/scripts/setup-connectsw.sh --update
```

`--update` syncs the framework files, backs up your `.claude/` first, and
preserves your products, registries and orchestrator state.

## What gets installed

```
.claude/          Agents, commands, protocols, scripts, gates, registries, memory
.specify/         Constitution and spec-kit templates
.githooks/        commit-msg, pre-commit, pre-push, post-commit
packages/         Shared packages (skip with --no-packages if you have your own)
.github/          Issue templates, PR template, dependabot config
docs/             Playbooks and guides
```

## After installing

1. **Read the constitution** (`.specify/memory/constitution.md`) and amend it to
   match how your team actually works. See [CUSTOMIZING.md](CUSTOMIZING.md).
2. **Register what exists.** Add your current products to
   `.claude/PRODUCT-REGISTRY.md` and their ports to `.claude/PORT-REGISTRY.md`.
   The Orchestrator treats unregistered products as non-existent.
3. **Register your reusable code** in `.claude/COMPONENT-REGISTRY.md`. Article II
   makes agents check it before building — an empty registry means they build
   duplicates.
4. **Run a baseline audit**: `/audit <product>` tells you where the existing code
   stands against the constitution before any agent touches it.

## Secrets

Nothing in this repository needs a secret to run. Your products will: keep them
in `.env` files (git-ignored) and generate them properly.

```bash
openssl rand -hex 32      # JWT signing key, encryption keys
openssl rand -base64 24   # database passwords
```

`.gitleaks.toml` and the `pre-commit` hook scan for accidentally staged secrets.
Neither is a substitute for keeping them out of the repository in the first
place.

## Verifying the install

```bash
.claude/scripts/ci-preflight.sh          # the checks CI would run
git config core.hooksPath                # should print .githooks
ls .claude/agents | wc -l                # 23 agent definitions + briefs/
```

Then open Claude Code and run `/orchestrator Status update`. If it answers with
your company name and your registered products, the install is good.
