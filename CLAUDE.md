# CLAUDE.md — Developer and AI Agent Guide

## Project Overview

`basic-blockchain-frontend` is the companion UI for the
[basic-blockchain-simulator](https://github.com/basic-blockchain/basic-blockchain-simulator) Python/Quart backend.
It provides a real-time dashboard for chain state and mempool visualisation.

The frontend framework (React vs Vue) is **not yet decided**.
All scaffold code must remain framework-agnostic until `docs/frontend-comparison.md` documents the final choice.

---

## GitFlow Workflow

```
feature/* ──► develop ──► release/* ──► production ──► main
                                     └──► staging ──► qa ──► develop
```

| Branch       | Purpose                                      |
|--------------|----------------------------------------------|
| `main`       | Stable release tag target                    |
| `production` | Production-ready code; gates release merges  |
| `staging`    | Pre-production integration                   |
| `qa`         | QA / automated test gate                     |
| `develop`    | Integration branch for feature work          |
| `feature/*`  | Individual feature branches                  |
| `release/*`  | Release candidates cut from `develop`        |
| `hotfix/*`   | Emergency fixes cut from `production`        |

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

| Type       | When to use                                   |
|------------|-----------------------------------------------|
| `feat`     | New feature                                   |
| `fix`      | Bug fix                                       |
| `chore`    | Build, tooling, dependency updates            |
| `ci`       | CI/CD configuration changes                   |
| `docs`     | Documentation only                            |
| `refactor` | Code restructure, no behaviour change         |
| `test`     | Adding or updating tests                      |
| `style`    | Formatting, lint fixes                        |
| `perf`     | Performance improvements                      |

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
5. At least 1 approval required on `develop`; 2 on `production`/`main`.
6. Merge via merge commit (no squash, no rebase) to preserve history.
7. Promotion through the chain is handled by `scripts/devsecops_release_and_promote.sh`.

---

## CI Gates

| Workflow                         | Trigger                            |
|----------------------------------|------------------------------------|
| `.github/workflows/ci.yml`       | Push / PR to all protected branches|
| `.github/workflows/sast.yml`     | Push / PR to `develop` and `main`; weekly |
| `.github/workflows/release.yml`  | Push of `v*` tags                  |

All CI checks must be green before a PR can merge.

---

## DevSecOps Scripts

| Script                                  | Purpose                                    |
|-----------------------------------------|--------------------------------------------|
| `scripts/bootstrap_github_rules.sh`     | Set branch protections via GitHub API      |
| `scripts/devsecops_release_and_promote.sh` | Full release: cut release/*, merge chain|
| `scripts/devsecops_promotion_chain.sh`  | Open promotion PRs across all branches     |

Run bootstrap after any new branch is added:
```bash
GH_BIN="/c/Program Files/GitHub CLI/gh.exe" \
  bash scripts/bootstrap_github_rules.sh basic-blockchain basic-blockchain-frontend
```

---

## Backend API

The frontend connects to the simulator backend at `http://localhost:8000` by default.
Set `VITE_API_BASE_URL` (or the framework-equivalent env var) to override.

Key endpoints (see backend `docs/api-reference.md`):
- `GET  /chain`         — full chain snapshot
- `GET  /mempool`       — pending transactions
- `POST /transactions`  — submit a new transaction
- `GET  /ws`            — WebSocket stream (Phase G.6)
