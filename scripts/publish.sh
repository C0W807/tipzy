#!/usr/bin/env bash
# Publishes this repo to GitHub and turns on GitHub Pages, built by
# .github/workflows/pages.yml. Run once; after that, every push to main redeploys.
#
#   gh auth login -s workflow      # sign in as the account that will own the repo
#   pnpm deploy:github             # or: bash scripts/publish.sh [owner] [repo]
#
# The push uses the GitHub CLI's login, not whatever git has stored for github.com.
set -euo pipefail

OWNER="${1:-c0w807}"
REPO="${2:-tipzy}"
SITE="https://$OWNER.github.io/$REPO/"

command -v gh >/dev/null || { echo "Install the GitHub CLI first: brew install gh" >&2; exit 1; }
WHO="$(gh api user --jq .login 2>/dev/null || true)"
if [ -z "$WHO" ]; then
  echo "The GitHub CLI isn't signed in. Run: gh auth login -s workflow" >&2
  exit 1
fi
if [ "$WHO" != "$OWNER" ]; then
  echo "The GitHub CLI is signed in as '$WHO', not '$OWNER'." >&2
  echo "Run: gh auth login -s workflow   (choose the $OWNER account), then try again." >&2
  exit 1
fi

if gh repo view "$OWNER/$REPO" >/dev/null 2>&1; then
  echo "Repo $OWNER/$REPO already exists; pushing to it."
else
  echo "Creating public repo $OWNER/$REPO…"
  gh repo create "$OWNER/$REPO" --public \
    --description "Tipzy: a clickable demo of cashless tipping by QR code. No real payments." \
    --homepage "$SITE"
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "https://github.com/$OWNER/$REPO.git"
else
  git remote add origin "https://github.com/$OWNER/$REPO.git"
fi

enable_pages() {
  gh api -X POST "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 ||
    gh api -X PUT "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1
}

# Pages first if GitHub allows it on an empty repo, so the first push deploys.
PAGES_LATER=""
enable_pages || PAGES_LATER=1

git -c credential.helper= -c credential.helper='!gh auth git-credential' push -u origin main

if [ -n "$PAGES_LATER" ]; then
  enable_pages
  sleep 3
  gh workflow run pages.yml --repo "$OWNER/$REPO" --ref main
fi

echo "Waiting for the deploy to finish…"
sleep 8
RUN_ID="$(gh run list --repo "$OWNER/$REPO" --workflow pages.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
gh run watch "$RUN_ID" --repo "$OWNER/$REPO" --exit-status
echo
echo "Live at $SITE"
