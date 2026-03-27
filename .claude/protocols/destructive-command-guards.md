# Destructive Command Guards Protocol

**Version**: 1.0.0
**Created**: 2026-03-27
**Inspired by**: gstack `/careful`, `/freeze`, `/guard`
**Applies to**: All agents, especially Support Engineer, DevOps Engineer, Backend Engineer

---

## Purpose

Prevent accidental data loss or system damage from destructive shell commands. Provides three levels of protection that agents activate based on context risk.

## Three Protection Levels

### Level 1: `/careful` — Destructive Command Warning

**When to activate**: Always active by default for all agents.

Intercepts and warns before executing any command matching the destructive patterns below:

#### Destructive Command Patterns

| Category | Commands | Risk |
|----------|----------|------|
| **File deletion** | `rm -rf`, `rm -r`, `rmdir`, `shred` | Permanent data loss |
| **Database** | `DROP TABLE`, `DROP DATABASE`, `TRUNCATE`, `DELETE FROM` (without WHERE) | Permanent data loss |
| **Git destructive** | `git push --force`, `git reset --hard`, `git clean -f`, `git checkout .`, `git branch -D` | Loss of commits/branches |
| **Container** | `docker system prune -a`, `docker volume rm`, `docker rmi -f` | Loss of images/volumes |
| **Process** | `kill -9`, `killall`, `pkill` | Service interruption |
| **Permission** | `chmod -R 777`, `chown -R` | Security degradation |
| **Network** | `iptables -F`, `ufw reset` | Connectivity loss |
| **Disk** | `dd if=`, `mkfs`, `fdisk` | Permanent data loss |

#### Whitelisted Safe Patterns

These common build/dev operations are NOT intercepted:

```bash
# Build artifact cleanup (safe)
rm -rf node_modules/
rm -rf .next/
rm -rf dist/
rm -rf build/
rm -rf coverage/
rm -rf .turbo/
rm -rf .cache/

# Git safe operations
git checkout <branch-name>   # (not git checkout . or git checkout --)
git branch -d <name>         # lowercase -d (safe delete, prevents unmerged)
git stash drop               # explicit stash management

# Docker build cleanup (safe)
docker compose down          # stops containers, preserves volumes
docker build --no-cache      # fresh build
```

#### Agent Behavior on Intercept

When a destructive command is detected:

1. **STOP** — Do not execute
2. **WARN** — Display warning with:
   - The exact command that would execute
   - What data/state would be affected
   - Whether the action is reversible
3. **SUGGEST** — Offer a safer alternative if one exists
4. **REQUIRE CONFIRMATION** — Only proceed if the CEO/user explicitly confirms

```markdown
⚠️ DESTRUCTIVE COMMAND DETECTED

Command: `git push --force origin main`
Risk: Overwrites remote history; other collaborators lose commits
Reversible: Partially (reflog, but remote clients already pulled)

Safer alternative: `git push --force-with-lease origin main`
(Fails if remote has commits you haven't seen)

Proceed? [Requires explicit CEO confirmation]
```

---

### Level 2: `/freeze` — Directory Boundary Lock

**When to activate**: During production debugging, hotfix work, or when working in a sensitive area.

Restricts all file modifications (Edit, Write, Create) to a single directory boundary.

#### Configuration

```yaml
# Set freeze boundary
freeze:
  boundary: "products/stablecoin-gateway/apps/api/src/routes/"
  allow_read: true        # Can read files anywhere
  allow_write: false      # Cannot write outside boundary
  allow_delete: false     # Cannot delete outside boundary
  exceptions:             # Files that can always be modified
    - "*.test.ts"         # Test files (anywhere)
    - "*.spec.ts"         # Spec files (anywhere)
```

#### Agent Behavior Under Freeze

1. **Read operations**: Unrestricted (agents can read any file for context)
2. **Write operations**: BLOCKED outside boundary
3. **Delete operations**: BLOCKED outside boundary
4. **Shell commands**: Destructive commands BLOCKED outside boundary

```markdown
🔒 FREEZE ACTIVE — Boundary: products/stablecoin-gateway/apps/api/src/routes/

✅ ALLOWED: Edit products/stablecoin-gateway/apps/api/src/routes/auth.ts
❌ BLOCKED: Edit products/stablecoin-gateway/apps/api/src/plugins/auth.ts
   Reason: Outside freeze boundary
   Action: Request unfreeze or expand boundary
```

#### Freeze Activation

```bash
# Activate freeze for a directory
# Agent declares in task output:
FREEZE_BOUNDARY="$PRODUCT_DIR/apps/api/src/routes/"

# Deactivate freeze
FREEZE_BOUNDARY=""  # or explicit /unfreeze
```

---

### Level 3: `/guard` — Maximum Protection

**When to activate**: During production hotfixes, database migrations, or any work touching live systems.

Combines `/careful` + `/freeze` + additional safeguards:

#### Additional Guard Rules

1. **No batch operations**: Cannot modify more than 3 files in a single action
2. **Mandatory diff review**: Must show `git diff` before any commit
3. **No dependency changes**: Cannot modify `package.json`, `pnpm-lock.yaml`, `prisma/schema.prisma`
4. **Rollback plan required**: Before any destructive operation, agent must document rollback steps
5. **Dry-run first**: Commands that support `--dry-run` must use it first

```markdown
🛡️ GUARD MODE ACTIVE

Restrictions:
- Destructive command warnings: ON
- Directory freeze: products/stablecoin-gateway/apps/api/
- Max files per action: 3
- Dependency changes: BLOCKED
- Dry-run required: YES

Rollback Plan:
1. Current commit: abc123
2. Revert command: git revert abc123
3. Database rollback: prisma migrate resolve --rolled-back "migration_name"
```

---

## Integration with Existing Safety

| Existing Safety | Guard Enhancement |
|----------------|-------------------|
| Git Safety (Article VIII) | `/careful` adds runtime command interception |
| Pre-commit hooks | `/guard` adds pre-execution review |
| CI blocking | `/freeze` adds development-time boundaries |
| Code Review Gate | `/guard` enforces pre-commit diff review |

## Automatic Activation

| Context | Auto-Activated Level |
|---------|---------------------|
| Normal development | Level 1 (`/careful`) — always on |
| Production debugging | Level 2 (`/freeze`) — auto-activated by Support Engineer |
| Hotfix work | Level 3 (`/guard`) — auto-activated by Orchestrator |
| Database migration | Level 3 (`/guard`) — auto-activated by Data Engineer |
| Security incident | Level 3 (`/guard`) — auto-activated by Security Engineer |

## Cross-References
- Git Safety: Constitution Article VIII
- Quality Gates: Constitution Article X
- CI Enforcement: Constitution Article XIII
- Browser Automation: `.claude/protocols/browser-automation.md` (safe browser testing)
