# basic-blockchain-frontend

![version](https://img.shields.io/badge/version-v0.10.0-blue)
![framework](https://img.shields.io/badge/Vue-3.5-42b883)
![tooling](https://img.shields.io/badge/Vite-6-646cff)
![types](https://img.shields.io/badge/TypeScript-5-3178c6)
![tests](https://img.shields.io/badge/tests-CI-brightgreen)
![node](https://img.shields.io/badge/node-%3E%3D20-green)

**Latest stable release:** v0.10.0

Real-time dashboard for the
[basic-blockchain-simulator](https://github.com/basic-blockchain/basic-blockchain-simulator)
backend. Lets you mine blocks, submit and watch pending transactions, browse
the full confirmed-transaction history, validate the chain, register and
resolve peer nodes, manage wallets with signed transfers, authenticate users
with JWT, and operate admin workflows (users + wallets + audit log) from a single
Vue 3 SPA. v0.10.0 adds a fully redesigned Health view with a live audit-logs
panel (auto-refresh every 3 s, search, severity filter, sticky sidebar), a
`AuditEntryDetailModal` shared by the Health and Audit views, and a dynamic
Components panel driven by the backend `GET /health` response.

---

## Stack

| Layer                 | Choice                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| Framework             | **Vue 3.5** with Composition API and `<script setup>` ([ADR-001](docs/decisions/ADR-001-vue-over-react.md)) |
| Build / dev           | Vite 6                                                                                                      |
| Language              | TypeScript 5 (strict)                                                                                       |
| State                 | Pinia ([ADR-002](docs/decisions/ADR-002-pinia-state.md))                                                    |
| HTTP                  | Axios with interceptor + `BlockchainApiError` envelope                                                      |
| Real-time             | Native `WebSocket` wrapper with auto-reconnect                                                              |
| UI kit                | PrimeVue 4 + custom dark theme                                                                              |
| Charts                | Chart.js                                                                                                    |
| Composition utilities | VueUse                                                                                                      |
| Components            | Atomic Design ([ADR-003](docs/decisions/ADR-003-atomic-design.md))                                          |
| Testing               | Vitest + Vue Test Utils + axios-mock-adapter                                                                |
| Lint                  | ESLint flat config (`--max-warnings 0`)                                                                     |

---

## Documentation

| Document                                                             | Description                                                                                              |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [Architecture](docs/architecture.md)                                 | Layered design, component tree, data flows, Pinia stores, WebSocket lifecycle, CI/CD, environment config |
| [Component Catalog](docs/components.md)                              | Atoms, molecules, organisms and views — props, emits, usage                                              |
| [User Guide](docs/user-guide.md)                                     | End-to-end navigation guide for operators                                                                |
| [UX and Validation Requirements](docs/ux-validation-requirements.md) | Visual backlog, accessibility, validation roadmap                                                        |
| [Phase Flow Plan](docs/phase-flow-plan.md)                           | Real execution flow from feature delivery to release promotion                                           |
| [Documentation Index](docs/index.md)                                 | Index of all documents and links to backend docs                                                         |

Architecture decisions live under [`docs/decisions/`](docs/decisions/).
Per-release notes (this repo) and the matching backend release notes are
linked from the [Documentation Index](docs/index.md).

---

## Application surface

| Route            | View               | Purpose                                                                            |
| ---------------- | ------------------ | ---------------------------------------------------------------------------------- |
| `/login`         | `LoginView`        | JWT login; redirects authenticated users to `/wallet`                              |
| `/register`      | `RegisterView`     | Create account and receive activation code                                         |
| `/activate`      | `ActivateView`     | Set initial password using activation code                                         |
| `/wallet`        | `WalletView`       | Create wallets, view balances, submit signed transfers                             |
| `/admin`         | `AdminView`        | Mint tokens and quick user admin actions (ADMIN only)                              |
| `/admin/users`   | `AdminUsersView`   | Edit, ban, soft-delete, restore, manage roles (ADMIN)                              |
| `/admin/wallets` | `AdminWalletsView` | List all wallets and freeze/unfreeze (ADMIN)                                       |
| `/dashboard`     | `DashboardView`    | At-a-glance metrics: chain height, pending tx count, last block, mining time chart |
| `/chain`         | `ChainView`        | Browse the full chain with paginated block list and detail panel                   |
| `/mempool`       | `MempoolView`      | Pending transactions + confirmed history (loaded from `GET /api/v1/transactions`)  |
| `/nodes`         | `NodesView`        | Register peer node URLs, list registered peers, run consensus resolve              |
| `/validation`    | `ValidationView`   | Trigger and review chain-validity checks with persisted history                    |
| `/health`        | `HealthView`       | Node health redesign: KPI bigstats, dynamic Components panel (status badges per service), live audit-log sidebar (`HealthLogsPanel`) with auto-refresh, search, severity filter, and `AuditEntryDetailModal` on row click |
| `/admin/audit`   | `AdminAuditView`   | Full audit log table with search, category filter, KPI row, and `AuditEntryDetailModal` on row click (ADMIN)                                                              |

The dashboard talks to the backend via the v1 API (`/api/v1/...`) and
keeps state warm with the WebSocket endpoint (`/api/v1/ws`). All requests
add an `X-Request-ID` header for log correlation; JWTs are injected into
`Authorization: Bearer <token>` when present.

---

## Requirements

- Node.js >= 20 (use `.nvmrc` with `nvm use`)
- npm >= 10
- A reachable backend simulator instance (default: `http://127.0.0.1:5000`)

```bash
nvm use
npm install
```

The default backend URL can be overridden via `VITE_API_BASE_URL` in
`.env.local`; the WebSocket URL is derived from it automatically.

## Running

```bash
npm run dev          # Vite dev server on http://localhost:3000
npm run build        # production bundle in dist/
npm run preview      # serve the production build locally
```

## Tests and quality gates

```bash
npm test             # vitest with coverage
npm run lint         # eslint --max-warnings 0
npm run type-check   # vue-tsc strict
```

Test count and coverage are enforced in CI alongside the lint and type
checks. Pre-existing errors are not tolerated — any failure blocks the PR.

---

## CI/CD and GitFlow

```
feature/* / fix/* / docs/* / chore/*
                ↓ PR
              develop
                ↓ release/auto-YYYYMMDDTHHMMSSZ
            production ──→ main (tagged)
                ↓
              staging ──→ qa ──→ develop
```

| Branch          | Required reviews | CI gates                          |
| --------------- | ---------------- | --------------------------------- |
| `main`          | 2 + code-owner   | `ci / ci`, `enforce-merge-policy` |
| `production`    | 2 + code-owner   | `enforce-merge-policy`            |
| `staging`, `qa` | 1 + code-owner   | –                                 |
| `develop`       | 1 + code-owner   | `ci / ci`                         |

The merge-policy guard rejects PRs into `production`/`main` from
branches other than `release/*`, `hotfix/*`, `production`, or `develop`.
GitFlow tooling lives in [`scripts/`](scripts/) and is also exposed via
the GitHub Actions workflows under [`.github/workflows/`](.github/workflows/).

### Local hook (recommended)

Block accidental direct pushes to protected branches:

```bash
git config core.hooksPath .githooks
```

---

## Project conventions

- **Auxiliary branches only.** No commits go directly to `develop`,
  `qa`, `staging`, `production`, or `main` — every change arrives through
  a PR from a descriptive branch (`feature/*`, `fix/*`, `chore/*`,
  `docs/*`).
- **Small, atomic commits.** One concern per commit, one phase per
  branch.
- **Lint-clean PRs.** Pre-existing lint errors get fixed in their own
  `chore/lint-...` branch rather than carried forward.
- **Conventional commits** for the subject line (`feat`, `fix`, `chore`,
  `docs`, `test`, `refactor`).
