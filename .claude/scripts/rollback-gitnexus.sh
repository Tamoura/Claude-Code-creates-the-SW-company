#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# GitNexus Rollback Script
# Completely removes GitNexus from this project and Claude Code config.
# Safe to run multiple times (idempotent).
#
# Usage:
#   bash .claude/scripts/rollback-gitnexus.sh
#   bash .claude/scripts/rollback-gitnexus.sh --dry-run   # preview only
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CLAUDE_JSON="$HOME/.claude.json"
BACKUP_JSON="$HOME/.claude.json.gitnexus-backup-20260226-212738"
DRY_RUN=false

# ─── Colour helpers ───────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[rollback]${NC} $*"; }
warn()    { echo -e "${YELLOW}[rollback]${NC} $*"; }
removed() { echo -e "${RED}[removed]${NC}  $*"; }
skipped() { echo -e "          [skip]    $*"; }

[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true && warn "DRY-RUN MODE — no changes will be made"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GitNexus Rollback"
echo "  Repo: $REPO_ROOT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ─── Step 1: Remove gitnexus MCP server from ~/.claude.json ──────────────────
info "Step 1: Removing GitNexus MCP server from Claude Code config..."

if [ ! -f "$CLAUDE_JSON" ]; then
  skipped "~/.claude.json not found — nothing to remove"
else
  # Check both global mcpServers AND project-scoped mcpServers
  PROJECT_KEY="$REPO_ROOT"

  HAS_GN=$(python3 -c "
import json
with open('$CLAUDE_JSON') as f:
    d = json.load(f)
# Check global servers
found = 'gitnexus' in d.get('mcpServers', {})
# Check project-scoped servers
projects = d.get('projects', {})
proj = projects.get('$PROJECT_KEY', {})
found = found or 'gitnexus' in proj.get('mcpServers', {})
print('yes' if found else 'no')
" 2>/dev/null || echo "no")

  if [ "$HAS_GN" = "yes" ]; then
    if [ "$DRY_RUN" = true ]; then
      warn "[dry-run] Would remove 'gitnexus' from mcpServers in ~/.claude.json (global + project scope)"
    else
      python3 -c "
import json
with open('$CLAUDE_JSON') as f:
    d = json.load(f)
# Remove from global
servers = d.get('mcpServers', {})
if 'gitnexus' in servers:
    del servers['gitnexus']
    d['mcpServers'] = servers
# Remove from project scope
projects = d.get('projects', {})
proj_key = '$PROJECT_KEY'
if proj_key in projects:
    proj_servers = projects[proj_key].get('mcpServers', {})
    if 'gitnexus' in proj_servers:
        del proj_servers['gitnexus']
        projects[proj_key]['mcpServers'] = proj_servers
d['projects'] = projects
with open('$CLAUDE_JSON', 'w') as f:
    json.dump(d, f, indent=2)
print('done')
"
      removed "Removed 'gitnexus' from ~/.claude.json (global + project scope)"
    fi
  else
    skipped "'gitnexus' not found in any mcpServers scope — already clean"
  fi
fi

# ─── Step 1b: Remove GitNexus skills from ~/.claude/skills/ ──────────────────
info "Step 1b: Removing GitNexus skills..."

for skill in gitnexus-debugging gitnexus-exploring gitnexus-impact-analysis gitnexus-refactoring; do
  SKILL_PATH="$HOME/.claude/skills/$skill"
  if [ -d "$SKILL_PATH" ]; then
    if [ "$DRY_RUN" = true ]; then
      warn "[dry-run] Would remove skill: $SKILL_PATH"
    else
      rm -rf "$SKILL_PATH"
      removed "Removed skill: $skill"
    fi
  else
    skipped "Skill not found: $skill"
  fi
done

# ─── Step 1c: Remove GitNexus PreToolUse hook ─────────────────────────────────
info "Step 1c: Removing GitNexus PreToolUse hook from ~/.claude/settings.json..."

SETTINGS_JSON="$HOME/.claude/settings.json"
if [ -f "$SETTINGS_JSON" ]; then
  HAS_HOOK=$(python3 -c "
import json
with open('$SETTINGS_JSON') as f:
    d = json.load(f)
hooks = d.get('hooks', {})
has = any('gitnexus' in str(v) for v in hooks.values())
print('yes' if has else 'no')
" 2>/dev/null || echo "no")

  if [ "$HAS_HOOK" = "yes" ]; then
    if [ "$DRY_RUN" = true ]; then
      warn "[dry-run] Would remove GitNexus PreToolUse + PostToolUse hooks from ~/.claude/settings.json"
    else
      python3 -c "
import json
with open('$SETTINGS_JSON') as f:
    d = json.load(f)
hooks = d.get('hooks', {})
for event in list(hooks.keys()):
    cleaned = [h for h in hooks[event] if 'gitnexus' not in str(h)]
    if cleaned:
        hooks[event] = cleaned
    else:
        del hooks[event]
if not hooks:
    d.pop('hooks', None)
else:
    d['hooks'] = hooks
with open('$SETTINGS_JSON', 'w') as f:
    json.dump(d, f, indent=2)
print('done')
"
      removed "Removed GitNexus hooks from ~/.claude/settings.json (PreToolUse + PostToolUse)"
    fi
  else
    skipped "No GitNexus hooks found in settings.json — already clean"
  fi
else
  skipped "~/.claude/settings.json not found"
fi

# ─── Step 1d: Remove GitNexus hook binary ─────────────────────────────────────
info "Step 1d: Removing GitNexus hook binary..."

HOOK_DIR="$HOME/.claude/hooks/gitnexus"
if [ -d "$HOOK_DIR" ]; then
  if [ "$DRY_RUN" = true ]; then
    warn "[dry-run] Would delete: $HOOK_DIR"
  else
    rm -rf "$HOOK_DIR"
    removed "Deleted $HOOK_DIR"
  fi
else
  skipped "Hook directory not found — already clean"
fi

# ─── Step 2: Delete .gitnexus index directory ─────────────────────────────────
info "Step 2: Removing .gitnexus index directory..."

GITNEXUS_DIR="$REPO_ROOT/.gitnexus"
if [ -d "$GITNEXUS_DIR" ]; then
  if [ "$DRY_RUN" = true ]; then
    warn "[dry-run] Would delete: $GITNEXUS_DIR"
    du -sh "$GITNEXUS_DIR" 2>/dev/null || true
  else
    rm -rf "$GITNEXUS_DIR"
    removed "Deleted $GITNEXUS_DIR"
  fi
else
  skipped ".gitnexus directory not found — already clean"
fi

# ─── Step 3: Remove AGENTS.md if created by GitNexus ─────────────────────────
info "Step 3: Checking AGENTS.md..."

AGENTS_MD="$REPO_ROOT/AGENTS.md"
if [ -f "$AGENTS_MD" ]; then
  # Only remove if it looks like GitNexus created it
  if grep -qi "gitnexus\|knowledge graph\|graph rag" "$AGENTS_MD" 2>/dev/null; then
    if [ "$DRY_RUN" = true ]; then
      warn "[dry-run] Would delete GitNexus-generated AGENTS.md"
    else
      rm "$AGENTS_MD"
      removed "Deleted GitNexus-generated AGENTS.md"
    fi
  else
    skipped "AGENTS.md exists but does not appear to be from GitNexus — leaving it"
  fi
else
  skipped "AGENTS.md not found — nothing to remove"
fi

# ─── Step 4: Check CLAUDE.md for GitNexus injections ─────────────────────────
info "Step 4: Checking .claude/CLAUDE.md for GitNexus injections..."

CLAUDE_MD="$REPO_ROOT/.claude/CLAUDE.md"
ORIGINAL_MD5="f74762fb8e5738c81f04caa08b96eb07"

if [ -f "$CLAUDE_MD" ]; then
  CURRENT_MD5=$(md5 "$CLAUDE_MD" 2>/dev/null | awk '{print $NF}' || md5sum "$CLAUDE_MD" | awk '{print $1}')
  if [ "$CURRENT_MD5" != "$ORIGINAL_MD5" ]; then
    warn "CLAUDE.md has changed since GitNexus was installed (MD5 mismatch)"
    # Check if the change is GitNexus-related
    if grep -qi "gitnexus\|knowledge graph" "$CLAUDE_MD" 2>/dev/null; then
      warn "GitNexus content detected in CLAUDE.md"
      warn "Manual review recommended — run: diff with the git history"
      warn "To restore: git checkout HEAD -- .claude/CLAUDE.md"
    else
      skipped "CLAUDE.md changed but no GitNexus content detected — leaving it"
    fi
  else
    skipped "CLAUDE.md unchanged — no GitNexus injection detected"
  fi
else
  skipped "CLAUDE.md not found"
fi

# ─── Step 4b: Remove GitNexus block from .githooks/post-commit ───────────────
info "Step 4b: Removing GitNexus block from .githooks/post-commit..."

POST_COMMIT="$REPO_ROOT/.githooks/post-commit"
if [ -f "$POST_COMMIT" ] && grep -q "GitNexus" "$POST_COMMIT" 2>/dev/null; then
  if [ "$DRY_RUN" = true ]; then
    warn "[dry-run] Would remove GitNexus block from .githooks/post-commit"
  else
    python3 -c "
import re
with open('$POST_COMMIT') as f:
    content = f.read()
cleaned = re.sub(r'\n# ── GitNexus.*?fi\n', '\n', content, flags=re.DOTALL)
with open('$POST_COMMIT', 'w') as f:
    f.write(cleaned)
print('done')
"
    removed "Removed GitNexus block from .githooks/post-commit"
  fi
else
  skipped "No GitNexus block in .githooks/post-commit — already clean"
fi

# ─── Step 5: Remove GitNexus from .gitignore if added ────────────────────────
info "Step 5: Checking .gitignore for GitNexus entries..."

GITIGNORE="$REPO_ROOT/.gitignore"
if [ -f "$GITIGNORE" ] && grep -q "\.gitnexus" "$GITIGNORE" 2>/dev/null; then
  if [ "$DRY_RUN" = true ]; then
    warn "[dry-run] Would remove .gitnexus entry from .gitignore"
  else
    # Remove lines containing .gitnexus (added by setup command)
    python3 -c "
with open('$GITIGNORE') as f:
    lines = f.readlines()
kept = [l for l in lines if '.gitnexus' not in l]
with open('$GITIGNORE', 'w') as f:
    f.writelines(kept)
removed = len(lines) - len(kept)
print(f'Removed {removed} line(s)')
"
    removed "Removed .gitnexus entries from .gitignore"
  fi
else
  skipped ".gitignore has no .gitnexus entries — clean"
fi

# ─── Step 6: Restore ~/.claude.json from backup (nuclear option) ─────────────
info "Step 6: Checking if backup restore is needed..."

if [ -f "$BACKUP_JSON" ]; then
  echo ""
  echo "  A full backup of ~/.claude.json exists at:"
  echo "  $BACKUP_JSON"
  echo ""
  echo "  If something still seems wrong after this rollback, run:"
  echo "  cp \"$BACKUP_JSON\" \"$CLAUDE_JSON\""
  echo "  (This fully restores the pre-GitNexus Claude Code config)"
else
  warn "Backup file not found at: $BACKUP_JSON"
  warn "If you need to fully restore, check: ls ~/.claude.json.gitnexus-backup-*"
fi

# ─── Step 7: Clear npx cache for gitnexus ────────────────────────────────────
info "Step 7: Clearing npx cache for gitnexus..."
if [ "$DRY_RUN" = true ]; then
  warn "[dry-run] Would clear npx cache for gitnexus"
else
  npm cache clean --force 2>/dev/null | tail -1 || true
  # Remove gitnexus from npx cache
  NPXCACHE=$(npm config get cache 2>/dev/null || echo "$HOME/.npm")
  find "$NPXCACHE/_npx" -name "gitnexus*" -type d -exec rm -rf {} + 2>/dev/null || true
  removed "Cleared gitnexus npx cache"
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Rollback Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  What was removed:"
echo "  ✓ GitNexus MCP server from Claude Code config"
echo "  ✓ .gitnexus index directory"
echo "  ✓ AGENTS.md (if GitNexus-generated)"
echo "  ✓ .gitnexus entries from .gitignore"
echo "  ✓ npx cache for gitnexus package"
echo ""
echo "  What was NOT touched:"
echo "  • Your existing MCP servers (github, etc.) — preserved"
echo "  • All product code and tests"
echo "  • Your git history"
echo ""
if [ "$DRY_RUN" = false ]; then
  echo "  IMPORTANT: Restart Claude Code to pick up the config change."
  echo "  (Cmd+Q and reopen, or: claude restart)"
fi
echo ""
