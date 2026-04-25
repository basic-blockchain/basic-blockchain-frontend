#!/usr/bin/env bash
set -euo pipefail

BASE_BRANCH="${1:-origin/develop}"

echo "== REVIEW CONTEXT =="
echo "Base branch: ${BASE_BRANCH}"
echo "Current branch: $(git branch --show-current)"

echo
if ! git rev-parse --verify "${BASE_BRANCH}" >/dev/null 2>&1; then
  echo "[warn] Base branch ${BASE_BRANCH} not present locally. Trying git fetch origin..."
  git fetch origin --prune >/dev/null 2>&1 || true
fi

echo "== CHANGED FILES =="
git diff --name-only "${BASE_BRANCH}...HEAD" | sed 's/^/- /'

echo
has_errors=0

search_pattern() {
  local pattern="$1"
  shift
  if command -v rg >/dev/null 2>&1; then
    rg -n "$pattern" "$@"
    return $?
  fi
  grep -RInE "$pattern" "$@"
}

run_gate() {
  local label="$1"
  shift
  echo "[gate] ${label}"
  if "$@"; then
    echo "[ok] ${label}"
  else
    echo "[error] ${label}"
    has_errors=1
  fi
  echo
}

echo "== QUALITY GATES =="
run_gate "typecheck" npm run -s typecheck
run_gate "lint" npm run -s lint
run_gate "test" npm run -s test
run_gate "build" npm run -s build

echo "== ARCHITECTURE CHECKS =="
if search_pattern "from ['\"]@/api/" src/views >/tmp/review-views-api.txt; then
  echo "[error] Views importing api layer directly detected:"
  cat /tmp/review-views-api.txt
  has_errors=1
else
  echo "[ok] No direct api imports from views"
fi

echo

echo "== BUSINESS RULE MIRROR CHECKS =="
if search_pattern "validateTransaction\(" src/views src/stores >/tmp/review-validate-tx.txt; then
  echo "[ok] validateTransaction usage found in submit flows"
  cat /tmp/review-validate-tx.txt
else
  echo "[error] validateTransaction usage missing in views/stores"
  has_errors=1
fi

echo
if search_pattern "sender.*receiver.*must differ|Amount must be positive|Sender is required|Receiver is required" src/domain/transaction.ts >/tmp/review-br-tx.txt; then
  echo "[ok] BR-TX mirrored validations found in domain"
  cat /tmp/review-br-tx.txt
else
  echo "[warn] Could not confirm all BR-TX validations from static text check"
fi

echo
echo "== GITFLOW SAFETY CHECKS =="
required_paths=(
  ".github/workflows/branch-promotion-prs.yml"
  ".github/workflows/merge-policy.yml"
  ".github/workflows/branch-content-sync-check.yml"
  ".github/pull_request_template.md"
  ".githooks/pre-push"
)

for p in "${required_paths[@]}"; do
  if [[ -f "$p" ]]; then
    echo "[ok] $p"
  else
    echo "[error] Missing $p"
    has_errors=1
  fi
done

echo
if [[ "$has_errors" -eq 0 ]]; then
  echo "REVIEW_RESULT=PASS"
  exit 0
fi

echo "REVIEW_RESULT=FAIL"
exit 1
