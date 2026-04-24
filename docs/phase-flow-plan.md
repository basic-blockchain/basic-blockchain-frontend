# Phase Flow Plan

Status: proposed
Last updated: 2026-04-24

## Purpose

Define the real execution flow from current feature delivery to release promotion, aligned with repository GitFlow and CI gates.

## 1. Current state

- Feature branch: feature/validation-center-ux-dark-palette
- PR open to develop: #3
- Scope delivered:
  - Validation Center (chain/block/node/transaction checks)
  - Dark palette and contrast pass
  - User and UX requirements guides

## 2. GitFlow phases for this delivery

1. Feature phase
   - Branch pattern: feature/*
   - Target: develop
   - Exit criteria:
     - CI green (lint, typecheck, test, build, audit)
     - at least 1 approval
     - merge commit strategy

2. Integration phase
   - Branch: develop
   - Goal: aggregate validated features for next release cut
   - Exit criteria:
     - no blocking regressions
     - accepted QA pre-check list

3. Release phase
   - Branch pattern: release/* (cut from develop)
   - Goal: stabilize release candidate
   - Exit criteria:
     - full regression pass
     - release notes prepared

4. Production gate phase
   - Branch: production
   - Goal: final production readiness gate
   - Exit criteria:
     - 2 approvals
     - security scans green

5. Main tagging phase
   - Branch: main
   - Goal: publish stable release tag vX.Y.Z
   - Exit criteria:
     - release workflow success
     - artifacts published

6. Back-promotion phase
   - Chain: production -> staging -> qa -> develop
   - Goal: keep all branches synchronized after release
   - Exit criteria:
     - promotion PR chain merged without conflicts

## 3. Operational runbook

1. Merge feature PR to develop.
2. Run release orchestration:
   - scripts/devsecops_release_and_promote.sh
3. If full orchestration is not used, run promotion chain manually:
   - scripts/devsecops_promotion_chain.sh
4. Verify branch protections are still correct after branch changes:
   - scripts/bootstrap_github_rules.sh
5. Validate branch content alignment:
    - scripts/devsecops_check_content_sync.sh

## 3.1 GitFlow controls now present in frontend

- Automated promotion PR chain:
   - .github/workflows/branch-promotion-prs.yml
- Merge source policy guard:
   - .github/workflows/merge-policy.yml
- Scheduled/manual branch content sync check:
   - .github/workflows/branch-content-sync-check.yml
- PR checklist template:
   - .github/pull_request_template.md
- Local push safety hook:
   - .githooks/pre-push

## 4. Next implementation phases (product)

1. Phase H.1: Validation hardening
   - Add backend endpoints for block/node validation (server-authoritative checks).
   - Persist validation events for auditability.

2. Phase H.2: UX accessibility closure
   - Contrast audit (WCAG), keyboard-only navigation, focus visibility.
   - Mobile-first QA matrix for Dashboard, Mempool, Validation.

3. Phase H.3: Observability and operator workflow
   - Validation history timeline and export report.
   - Health alerts with severity and remediation hints.

4. Phase H.4: Enterprise controls
   - Role-based access for sensitive actions (mine, consensus, register node).
   - Action-level audit logs.

## 5. Definition of done by phase

- Code:
  - no TypeScript errors
  - no lint errors
  - unit tests updated for new behavior
- UX:
  - contrast and readability validated on all views
  - responsive behavior verified on mobile and desktop
- DevSecOps:
  - CI and SAST green
  - promotion flow validated in target branches
- Documentation:
  - user guide and architecture index updated
  - release notes drafted
