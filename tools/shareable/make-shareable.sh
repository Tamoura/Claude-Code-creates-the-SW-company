#!/usr/bin/env bash
#
# make-shareable.sh — build the public, shareable copy of this repository.
#
# The private repo carries real products, CEO briefs, live audit trails and
# customer names. The shareable copy carries only the operating system: the
# agents, protocols, quality gates, constitution, and one demo product.
#
# Usage:
#   tools/shareable/make-shareable.sh              # build into ./shareable
#   tools/shareable/make-shareable.sh --out DIR    # build somewhere else
#   tools/shareable/make-shareable.sh --verify     # verify an existing build
#   tools/shareable/make-shareable.sh --dry-run    # list what would be copied
#
# Pipeline:
#   1. copy    — allow-list from config/copy-manifest.txt, minus config/exclude.txt
#   2. scrub   — text substitutions from config/scrub.sed
#   3. overlay — files unique to the public repo (overlay/) copied over the top
#   4. verify  — fail if any term in config/banned-terms.txt survives
#
# Only paths named in copy-manifest.txt are ever copied, so a new private
# directory cannot leak by being forgotten.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$SCRIPT_DIR/config"
OVERLAY_DIR="$SCRIPT_DIR/overlay"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

OUT_DIR="$REPO_ROOT/shareable"
MODE="build"

while [ $# -gt 0 ]; do
  case "$1" in
    --out) OUT_DIR="$2"; shift 2 ;;
    --verify) MODE="verify"; shift ;;
    --dry-run) MODE="dry-run"; shift ;;
    -h|--help) sed -n '2,26p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { printf "${CYAN}==>${NC} %s\n" "$*"; }
ok()    { printf "${GREEN}  ok${NC} %s\n" "$*"; }
warn()  { printf "${YELLOW}  !!${NC} %s\n" "$*"; }
fail()  { printf "${RED}FAIL${NC} %s\n" "$*" >&2; exit 1; }

[ -f "$CONFIG_DIR/copy-manifest.txt" ] || fail "missing $CONFIG_DIR/copy-manifest.txt"

# ---------------------------------------------------------------------------
# Exclusion matching
# ---------------------------------------------------------------------------

EXCLUDES=()
if [ -f "$CONFIG_DIR/exclude.txt" ]; then
  while IFS= read -r line; do
    case "$line" in ''|\#*) continue ;; esac
    EXCLUDES+=("$line")
  done < "$CONFIG_DIR/exclude.txt"
fi

# is_excluded <path-relative-to-repo-root>
# Three pattern forms:
#   /path/to/dir/**  anchored at the repo root — excludes only that directory
#   name/**          excludes any directory with that name, at any depth
#   glob             matched against the file's basename
is_excluded() {
  local rel="$1" base pattern dir
  base="$(basename "$rel")"
  for pattern in "${EXCLUDES[@]}"; do
    case "$pattern" in
      /*/\*\*|/*\*\*)
        dir="${pattern#/}"; dir="${dir%/\*\*}"
        case "$rel/" in "$dir"/*) return 0 ;; esac
        ;;
      */\*\*)
        dir="${pattern%/\*\*}"
        case "/$rel/" in */"$dir"/*) return 0 ;; esac
        ;;
      *)
        # shellcheck disable=SC2254
        case "$base" in $pattern) return 0 ;; esac
        ;;
    esac
  done
  return 1
}

# ---------------------------------------------------------------------------
# 1. Copy
# ---------------------------------------------------------------------------

copy_tree() {
  local copied=0 skipped=0 entry rel src dest
  while IFS= read -r entry; do
    case "$entry" in ''|\#*) continue ;; esac
    src="$REPO_ROOT/$entry"
    if [ ! -e "$src" ]; then
      warn "not found, skipping: $entry"
      continue
    fi
    if [ -f "$src" ]; then
      if is_excluded "$entry"; then skipped=$((skipped + 1)); continue; fi
      if [ "$MODE" = "dry-run" ]; then echo "  copy $entry"; else
        dest="$OUT_DIR/$entry"; mkdir -p "$(dirname "$dest")"; cp -p "$src" "$dest"
      fi
      copied=$((copied + 1))
      continue
    fi
    while IFS= read -r -d '' file; do
      rel="${file#"$REPO_ROOT"/}"
      if is_excluded "$rel"; then skipped=$((skipped + 1)); continue; fi
      if [ "$MODE" = "dry-run" ]; then echo "  copy $rel"; else
        dest="$OUT_DIR/$rel"; mkdir -p "$(dirname "$dest")"; cp -p "$file" "$dest"
      fi
      copied=$((copied + 1))
    done < <(find "$src" -type f -print0 | LC_ALL=C sort -z)
  done < "$CONFIG_DIR/copy-manifest.txt"
  ok "$copied files copied, $skipped excluded"
}

# ---------------------------------------------------------------------------
# 2. Scrub
# ---------------------------------------------------------------------------

scrub_tree() {
  [ -f "$CONFIG_DIR/scrub.sed" ] || { warn "no scrub.sed, skipping"; return; }
  local n=0 file
  while IFS= read -r -d '' file; do
    # Text files only — never touch images, fonts, or archives.
    if LC_ALL=C grep -Iq . "$file" 2>/dev/null; then
      sed -i -f "$CONFIG_DIR/scrub.sed" "$file"
      n=$((n + 1))
    fi
  done < <(find "$OUT_DIR" -type f -print0)
  ok "$n text files scrubbed"
}

# ---------------------------------------------------------------------------
# 3. Overlay
# ---------------------------------------------------------------------------

apply_overlay() {
  [ -d "$OVERLAY_DIR" ] || { warn "no overlay/, skipping"; return; }
  local n=0 rel dest file
  while IFS= read -r -d '' file; do
    rel="${file#"$OVERLAY_DIR"/}"
    dest="$OUT_DIR/$rel"
    mkdir -p "$(dirname "$dest")"
    cp -p "$file" "$dest"
    n=$((n + 1))
  done < <(find "$OVERLAY_DIR" -type f -print0)
  # Executable bits are meaningful for hooks and scripts.
  find "$OUT_DIR" -type f -name '*.sh' -exec chmod +x {} +
  [ -d "$OUT_DIR/.githooks" ] && find "$OUT_DIR/.githooks" -type f -exec chmod +x {} +
  ok "$n overlay files applied"
}

# ---------------------------------------------------------------------------
# 4. Verify
# ---------------------------------------------------------------------------

verify_tree() {
  [ -d "$OUT_DIR" ] || fail "nothing to verify at $OUT_DIR"
  local violations=0 term hits

  if [ -f "$CONFIG_DIR/banned-terms.txt" ]; then
    while IFS= read -r term; do
      case "$term" in ''|\#*) continue ;; esac
      # A "cs:" prefix makes the term case-sensitive; everything else is
      # matched case-insensitively so that Muaththir and muaththir both fail.
      case "$term" in
        cs:*) hits="$(grep -rIlE "${term#cs:}" "$OUT_DIR" 2>/dev/null | head -10 || true)" ;;
        *)    hits="$(grep -rIilE "$term" "$OUT_DIR" 2>/dev/null | head -10 || true)" ;;
      esac
      if [ -n "$hits" ]; then
        printf "${RED}  leak${NC} %-24s %s\n" "$term" "$(echo "$hits" | tr '\n' ' ')"
        violations=$((violations + 1))
      fi
    done < "$CONFIG_DIR/banned-terms.txt"
  fi

  # No private product may ride along: only the demo product is allowed.
  if [ -d "$OUT_DIR/products" ]; then
    while IFS= read -r p; do
      case "$(basename "$p")" in
        taskflow) ;;
        *) printf "${RED}  leak${NC} unexpected product: %s\n" "$p"; violations=$((violations + 1)) ;;
      esac
    done < <(find "$OUT_DIR/products" -mindepth 1 -maxdepth 1 -type d)
  fi

  # Common secret shapes, in case something slipped past the exclude list.
  if grep -rIlE '(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)' "$OUT_DIR" >/dev/null 2>&1; then
    grep -rIlE '(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)' "$OUT_DIR" | while read -r f; do
      printf "${RED}  leak${NC} possible credential in %s\n" "$f"
    done
    violations=$((violations + 1))
  fi

  if [ "$violations" -gt 0 ]; then
    fail "$violations verification problem(s) — fix config/scrub.sed or config/exclude.txt and rebuild"
  fi
  ok "no banned terms, no private products, no credential patterns"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

case "$MODE" in
  verify)
    info "verifying $OUT_DIR"
    verify_tree
    printf "${GREEN}PASS${NC} %s is safe to publish\n" "$OUT_DIR"
    ;;
  dry-run)
    info "dry run — files that would be copied from $REPO_ROOT"
    copy_tree
    ;;
  build)
    case "$OUT_DIR" in
      /|"$HOME"|"$REPO_ROOT") fail "refusing to build into $OUT_DIR" ;;
    esac
    info "building shareable tree at $OUT_DIR"
    rm -rf "$OUT_DIR"
    mkdir -p "$OUT_DIR"
    copy_tree
    scrub_tree
    apply_overlay
    verify_tree
    printf "\n${GREEN}Built${NC} %s files in %s\n" "$(find "$OUT_DIR" -type f | wc -l | tr -d ' ')" "$OUT_DIR"
    cat <<EOF

Next steps — publish it as a standalone repository:

  cd "$OUT_DIR"
  git init -b main
  git add -A
  git commit -m "Initial commit"
  git remote add origin git@github.com:<you>/<repo>.git
  git push -u origin main

Re-run this script after changing agents, protocols or gates to refresh the
public copy, then commit the regenerated tree.
EOF
    ;;
esac
