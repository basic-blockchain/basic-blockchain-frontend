#!/usr/bin/env bash
set -euo pipefail

# Apply branch protections from JSON files for automated promotion flow.
# This script bypasses the need for manual reviewer approval for promotion PRs.
#
# Usage:
#   bash scripts/bootstrap_branch_protections.sh ORG REPO [--dry-run]
#
# Environment:
#   GH_BIN: Path to gh CLI (auto-detected if not set)

ORG="${1:?Missing org}"
REPO="${2:?Missing repo}"
DRY_RUN="${3:---apply}"

resolve_gh_bin() {
  if [[ -n "${GH_BIN:-}" ]]; then
    echo "${GH_BIN}"
    return 0
  fi

  if command -v gh >/dev/null 2>&1; then
    command -v gh
    return 0
  fi

  if [[ -x "/c/Program Files/GitHub CLI/gh.exe" ]]; then
    echo "/c/Program Files/GitHub CLI/gh.exe"
    return 0
  fi

  if [[ -x "/c/Users/${USERNAME:-}/AppData/Local/Programs/GitHub CLI/gh.exe" ]]; then
    echo "/c/Users/${USERNAME}/AppData/Local/Programs/GitHub CLI/gh.exe"
    return 0
  fi

  return 1
}

if ! GH_BIN="$(resolve_gh_bin)"; then
  echo "gh CLI is required. Install from https://cli.github.com/" >&2
  exit 1
fi

if ! "${GH_BIN}" auth status >/dev/null 2>&1; then
  echo "gh CLI is not authenticated. Run: bash scripts/gh_auth_setup.sh login" >&2
  exit 1
fi

apply_protection() {
  local branch="$1"
  local jsonfile="$2"

  if [[ ! -f "$jsonfile" ]]; then
    echo "Skipping ${branch}: protection file not found (${jsonfile})"
    return
  fi

  local rules
  rules="$(cat "$jsonfile")"

  if [[ "$DRY_RUN" == "--dry-run" ]]; then
    echo "[DRY_RUN] gh api repos/${ORG}/${REPO}/branches/${branch}/protection --input ${jsonfile}"
    return
  fi

  set +e
  output="$("${GH_BIN}" api \
    "repos/${ORG}/${REPO}/branches/${branch}/protection" \
    -H "Accept: application/vnd.github.v3+json" \
    --input "$jsonfile" 2>&1)"
  local status=$?
  set -e

  if [[ $status -eq 0 ]]; then
    echo "✓ Branch protection applied: ${branch}"
    return
  fi

  echo "✗ Failed to apply protection to ${branch}: $output" >&2
  return "$status"
}

echo "Applying branch protections for ${ORG}/${REPO}..."
echo ""

apply_protection "develop"   "protection_develop.json"
apply_protection "qa"        "protection_qa.json"
apply_protection "staging"   "protection_staging.json"
apply_protection "production" "protection_production_frontend.json" || true
apply_protection "main"      "protection_main.json"

echo ""
echo "Branch protection sync completed for ${ORG}/${REPO}."
echo "Run with --dry-run for preview: bash scripts/bootstrap_branch_protections.sh ${ORG} ${REPO} --dry-run"
