# CLAUDE.md — Developer and AI Agent Guide

## Project Overview

`basic-blockchain-frontend` is the companion UI for the
[basic-blockchain-simulator](https://github.com/basic-blockchain/basic-blockchain-simulator) Python/Quart backend.
It provides a real-time dashboard for chain state, mempool visualisation,
confirmed-transaction history, peer-node management, validation history,
and node-health monitoring.

**Stack** (decided): Vue 3.5 (Composition API + `<script setup>`),
Vite 6, TypeScript 5 strict, Pinia, PrimeVue 4 with a custom dark theme,
Chart.js, VueUse, Axios, native `WebSocket`, Vitest. Architecture follows
Atomic Design — see [docs/decisions/ADR-001-vue-over-react.md](docs/decisions/ADR-001-vue-over-react.md),
[ADR-002](docs/decisions/ADR-002-pinia-state.md), and
[ADR-003](docs/decisions/ADR-003-atomic-design.md) for the rationale.

---

## GitFlow Workflow

```
feature/* ──► develop ──► release/* ──► production ──► main
                                     └──► staging ──► qa ──► develop
```

| Branch       | Purpose                                     |
| ------------ | ------------------------------------------- |
| `main`       | Stable release tag target                   |
| `production` | Production-ready code; gates release merges |
| `staging`    | Pre-production integration                  |
| `qa`         | QA / automated test gate                    |
| `develop`    | Integration branch for feature work         |
| `feature/*`  | Individual feature branches                 |
| `release/*`  | Release candidates cut from `develop`       |
| `hotfix/*`   | Emergency fixes cut from `production`       |

### Rules

- **Never commit directly to `develop`, `qa`, `staging`, `production`, or `main`.**
  All changes must arrive via a pull request from an auxiliary branch.
- One branch per feature/phase. Never batch unrelated changes on one branch.
- Use atomic commits — each commit should represent a single logical change.

---

## Commit Message Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>
```

| Type       | When to use                           |
| ---------- | ------------------------------------- |
| `feat`     | New feature                           |
| `fix`      | Bug fix                               |
| `chore`    | Build, tooling, dependency updates    |
| `ci`       | CI/CD configuration changes           |
| `docs`     | Documentation only                    |
| `refactor` | Code restructure, no behaviour change |
| `test`     | Adding or updating tests              |
| `style`    | Formatting, lint fixes                |
| `perf`     | Performance improvements              |

Examples:

```
feat(mempool): add live transaction count badge
fix(chain): handle empty block edge case in renderer
ci: add CodeQL SAST workflow
chore: bump node engine requirement to >=20
```

Do **not** add `Co-Authored-By` attribution lines.

---

## PR Process

1. Branch from `develop`: `git checkout -b feature/<name> develop`
2. Commit with conventional messages.
3. Open a PR targeting `develop`.
4. CI must pass (lint, typecheck, test, build, audit).
5. Approval gates: **1 reviewer** on `develop`/`staging`/`qa`; **0 reviewers** on promotion PRs (auto-merge enabled).
6. Merge via merge commit (no squash, no rebase) to preserve history.
7. Promotion through the chain is handled by `scripts/devsecops_promotion_chain.sh` (upward: develop → qa → staging → production → main).

**Note:** Branch protections allow auto-merge without external reviewers to enable single-developer promotion workflows while maintaining CI gate enforcement and conversation resolution requirements.

---

## CI Gates

| Workflow                        | Trigger                                   |
| ------------------------------- | ----------------------------------------- |
| `.github/workflows/ci.yml`      | Push / PR to all protected branches       |
| `.github/workflows/sast.yml`    | Push / PR to `develop` and `main`; weekly |
| `.github/workflows/release.yml` | Push of `v*` tags                         |

All CI checks must be green before a PR can merge.

---

## DevSecOps Scripts

| Script                                     | Purpose                                                         |
| ------------------------------------------ | --------------------------------------------------------------- |
| `scripts/bootstrap_github_rules.sh`        | Set branch protections via GitHub API                           |
| `scripts/bootstrap_branch_protections.sh`  | Sync protection rules (0-reviewer auto-merge config)            |
| `scripts/devsecops_release_and_promote.sh` | Full release: cut release/\*, merge chain                       |
| `scripts/devsecops_promotion_chain.sh`     | Open promotion PRs (develop → qa → staging → production → main) |

### Promotion Chain Direction

**Upward Flow** (develop toward main):

```
develop ──► qa ──► staging ──► production ──► main
```

This enables single-developer workflows:

- CI gates enforced (must pass)
- No external reviewer required (conversation resolution enforced)
- All changes promoted automatically to main for release

### Setup Commands

**Initial setup — apply branch protections:**

```bash
GH_BIN="/c/Program Files/GitHub CLI/gh.exe" \
  bash scripts/bootstrap_github_rules.sh basic-blockchain basic-blockchain-frontend
```

**Sync protections after changes:**

```bash
GH_BIN="/c/Program Files/GitHub CLI/gh.exe" \
  bash scripts/bootstrap_branch_protections.sh basic-blockchain basic-blockchain-frontend [--dry-run]
```

**Run promotion chain (manually trigger):**

```bash
GH_BIN="/c/Program Files/GitHub CLI/gh.exe" \
  bash scripts/devsecops_promotion_chain.sh basic-blockchain basic-blockchain-frontend [--dry-run]
```

---

## Backend API

The frontend connects to the simulator backend at `http://localhost:5000` by default
(proxied via Vite's `/api` and `/ws` targets; see `vite.config.ts`).
Set `VITE_API_BASE_URL` to override the HTTP base and `VITE_WS_URL` to override the WebSocket URL.

Key endpoints (see backend `docs/api-reference.md`):

- `GET  /chain` — full chain snapshot
- `GET  /mempool` — pending transactions
- `POST /transactions` — submit a new transaction
- `GET  /ws` — WebSocket stream (Phase G.6)
