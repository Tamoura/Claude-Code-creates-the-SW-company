#!/bin/bash
# setup-branch-protection.sh
# Apply branch protection rules requiring CI pass.
# Requires gh CLI authenticated with admin access.
#
# Usage: .claude/scripts/setup-branch-protection.sh [owner/repo] [branch]

set -e

REPO=${1:-$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null)}
BRANCH=${2:-"main"}

if [ -z "$REPO" ]; then
  echo "Usage: $0 [owner/repo] [branch]"
  echo "  Or run from within a GitHub repo (auto-detects)"
  exit 1
fi

echo "Setting up branch protection for $REPO ($BRANCH)..."

# Apply branch protection via GitHub API
gh api -X PUT "repos/$REPO/branches/$BRANCH/protection" \
  --input - <<JSONEOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "test",
      "lint",
      "security"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0
  },
  "restrictions": null
}
JSONEOF

echo ""
echo "Branch protection applied to $BRANCH:"
echo "  - Required status checks: test, lint, security"
echo "  - Strict mode: branches must be up to date"
echo "  - PRs required (0 approvals for solo dev)"
echo ""
echo "To verify: gh api repos/$REPO/branches/$BRANCH/protection"
