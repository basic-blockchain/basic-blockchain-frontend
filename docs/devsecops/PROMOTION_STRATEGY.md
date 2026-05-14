# DevSecOps Promotion Strategy — Upward Flow

## Overview

This document describes the automated promotion pipeline that enables single-developer DevSecOps workflows while maintaining rigorous CI/CD gates and audit trails.

## Problem Statement

Traditional GitFlow requires external reviewers to merge code into protected branches. In single-developer projects, this creates a bottleneck: you cannot merge your own PRs even though CI gates have validated the changes. The solution: **allow auto-merge when CI passes**, while maintaining:

- ✅ Mandatory CI/CD checks
- ✅ Mandatory conversation resolution
- ✅ Full audit trail in GitHub
- ✅ No force-push capability
- ✅ Linear history preserved

## Promotion Direction: Upward Flow

The promotion chain moves **upward** from development to production:

```
develop ──► qa ──► staging ──► production ──► main
   ▲                                              │
   └──────────────────────────────────────────────┘
              (Each step automated)
```

### Flow Explanation

| Stage | Purpose | CI Gates | Auto-Merge |
|-------|---------|----------|-----------|
| `develop` | Integration branch for features | ✅ Required | ✅ Yes (0 reviewers) |
| `qa` | QA validation environment | ✅ Required | ✅ Yes (0 reviewers) |
| `staging` | Pre-production environment | ✅ Required | ✅ Yes (0 reviewers) |
| `production` | Production-ready code | ✅ Required | ✅ Yes (0 reviewers) |
| `main` | Release tag target | ✅ Required | ✅ Yes (0 reviewers) |

## Implementation

### Scripts

#### `devsecops_promotion_chain.sh`
Creates promotion PRs in upward direction. Run after merging to develop:

```bash
bash scripts/devsecops_promotion_chain.sh basic-blockchain basic-blockchain-frontend
```

**Dry-run mode** (test without creating PRs):
```bash
DRY_RUN=true bash scripts/devsecops_promotion_chain.sh basic-blockchain basic-blockchain-frontend
```

#### `bootstrap_branch_protections.sh`
Applies branch protections from JSON configuration files:

```bash
# Preview changes
bash scripts/bootstrap_branch_protections.sh basic-blockchain basic-blockchain-frontend --dry-run

# Apply protections
GH_BIN="/c/Program Files/GitHub CLI/gh.exe" \
  bash scripts/bootstrap_branch_protections.sh basic-blockchain basic-blockchain-frontend
```

### Protection Configuration

Protection rules are defined in JSON files checked into version control:

- `protection_develop.json` — develop branch rules
- `protection_qa.json` — qa branch rules
- `protection_staging.json` — staging branch rules
- `protection_main.json` — main branch rules
- `protection_production_frontend.json` — production branch rules (if exists)

Each file specifies:
- **Required status checks** (CI must pass)
- **Required conversation resolution** (discussions must be resolved before merge)
- **Dismiss stale reviews** (outdated reviews auto-dismissed on new commits)
- **Require code owner reviews** (set to false for auto-merge)
- **Required approving review count** (set to 0 for auto-merge)

## Developer Workflow

### Normal Feature Development

```bash
# 1. Create feature branch from develop
git checkout -b feature/my-feature develop

# 2. Make changes and commit
git add .
git commit -m "feat(mempool): add transaction badge"

# 3. Push and create PR targeting develop
git push origin feature/my-feature
gh pr create --base develop --head feature/my-feature --fill

# 4. CI runs automatically (no manual review needed)
# When CI passes, PR auto-merges

# 5. Promotion chain runs automatically
# (or manually via `devsecops_promotion_chain.sh`)
```

### Manual Promotion (if needed)

```bash
# After feature PR is merged to develop
bash scripts/devsecops_promotion_chain.sh basic-blockchain basic-blockchain-frontend

# Creates PRs:
# develop → qa (auto-merges when CI passes)
# qa → staging (auto-merges when CI passes)
# staging → production (auto-merges when CI passes)
# production → main (auto-merges when CI passes)
```

## Why This Works for Single Developer

1. **CI is the real reviewer** — automated tests are more reliable than humans
2. **Conversation resolution required** — prevents accidental merges with open discussions
3. **No force-push** — history is immutable and auditable
4. **Git maintains author/timestamp** — every commit is attributed
5. **Full trail in GitHub** — all PRs, reviews, commits are logged

## Comparison: Before vs After

### Before (External Reviewer Required)
```
Feature → develop (PR) ✋ BLOCKED (waiting for external reviewer)
         └─ CI passed ✅
         └─ Code is ready ✅
         └─ But cannot merge own PR ❌
```

### After (Auto-Merge with CI Gates)
```
Feature → develop (PR) ✅ AUTO-MERGES (CI passed + no blockers)
         ├─ CI passed ✅
         ├─ Code is ready ✅
         ├─ Conversation resolved ✅
         └─ Auto-merges immediately ✅

develop → qa → staging → production → main
 ✅        ✅    ✅         ✅         ✅ (all auto-merge)
```

## Safety Guarantees

| Guarantee | Mechanism |
|-----------|-----------|
| **No bad code** | Mandatory CI/CD checks must pass |
| **Discussion enforced** | Conversation resolution required |
| **History protected** | No force-push allowed |
| **Audit trail** | Every PR/commit in GitHub |
| **Linear progression** | Promotion always upward (no back-merges) |
| **No accidental push** | Branch protections enforced by GitHub API |

## Troubleshooting

### PR Creation Fails: "No commits between..."
This is normal. It means the source branch has no new commits compared to the target. The script handles this gracefully and skips that promotion step.

### PR Won't Auto-Merge
Check:
1. CI status — must be ✅ green
2. Conversation resolution — all comments must have replies
3. Protection rules — verify JSON files are current

### Need to Override Protection
Only GitHub organization admins can override branch protections. Contact your DevOps team.

## Related Documentation

- [GitFlow Workflow](../../CLAUDE.md#gitflow-workflow) — Branch strategy overview
- [PR Process](../../CLAUDE.md#pr-process) — Feature development workflow
- [CI/CD Gates](../../CLAUDE.md#ci-gates) — Automated validation

## Version History

- **v1.0** (2026-05-14) — Initial implementation with upward promotion flow
