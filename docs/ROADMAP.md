# Roadmap

Status: Living document
Last updated: 2026-05-15
Scope: combined plan for `basic-blockchain-frontend` and
`basic-blockchain-simulator` — phases of the visual + functional
build-out around the redesign proposal.

See also:
- [DESIGN.md](./DESIGN.md) — Phase 5 design system reference
- [components.md](./components.md) — Atomic Design component catalog
- Backend equivalent: `../basic-blockchain-simulator/docs/devsecops/PROMOTION_STRATEGY.md`

---

## 1. How to read this file

Each phase has:

- **Goal** — what the phase delivers, in one line
- **Status** — `done` / `in flight` / `next` / `backlog`
- **PRs** — references (merged or open) when the work is in the repo
- **Notes** — dependencies, scope cuts, open questions

Phases are organized by visual + functional scope rather than calendar.
Order inside "Backlog" is recommended but not binding.

---

## 2. Completed phases

### Phase 5 — Design system unification (frontend)

**Goal**: every view consumes the same shared vocabulary (`page-h`,
`bigstat-row`, `panel`, `panel-h`, `field`, `btn`, `tabs`, `tbl`).

| Step | Status | PR |
| --- | --- | --- |
| ChainView / Mempool / Nodes | done | (pre-history) |
| Admin Wallets / Currencies / Exchange Rates / Movements / Sends / Compliance / P2P | done | (pre-history) |
| AdminSettingsView naming alignment | done | #161 |
| ExchangeView Phase 5 wrap | done | #162 |
| AdminView, AdminAuditView, AdminTreasuryView, HealthView, ValidationView | already compliant — no PR needed | — |
| `docs/DESIGN.md` design-system reference | done | #163 |

### Phase 6a — Wallet UX

**Goal**: per-currency wallet cards + per-card actions on `WalletView`.

- Status: done (PR #146).

### Phase 6b — Dashboard live

**Goal**: live WebSocket indicators and new-block flash on `DashboardView`.

- Status: done (PR #147).

### Phase 6c — User profile

**Goal**: `ProfileDrawer` (Identidad + KYC tabs) opened from sidebar avatar.

- Status: done (PR #148).

### Admin Users hotfix batch (May 2026)

**Goal**: ban modal visible, real totals in `ConfirmUserModal`, drawer
actions route through the confirm flow, soft-delete returns `deleted_at`,
ISO timestamp on soft-delete.

| Repo | PR | Status |
| --- | --- | --- |
| simulator | #171 | merged |
| frontend  | #160 | merged |

### Repo plumbing (May 2026)

- Coverage gate temporarily lowered to 65% to unblock the Phase 5/6d
  batch — PR #164. **Debt**: restore to 80% once `stores/mining.ts`,
  `stores/wallet.ts`, `domain/validation.ts` are covered.
- Promotion chain run end-to-end on both repos after the batch landed
  (develop → qa → staging → production → main).

---

## 3. In flight

### Phase 6d.1 — UserDrawer real data (frontend)

**Goal**: replace hardcoded empty arrays in `UserDrawer` with real
wallets / movements / audit hydrated at open time.

- Status: in flight — PR #173 open.
- Caveats documented in the PR body: `balanceUsd` is best-effort
  (no FX conversion), `Movement.type` limited to `deposit/withdraw`
  until P2P / Exchange flows surface structured movement records.

---

## 4. Next (committed scope)

### Phase 6d.2 — WalletDrawer (frontend)

**Goal**: per-wallet detail drawer (Resumen / Movimientos / Auditoría),
opened from `AdminWalletsView` rows or the `UserDrawer` Wallets tab.

- Status: next after 6d.1 merges.
- Notes: no new backend endpoints needed — movements filtered client-side
  by `public_key`, audit by `target_id`.

### Phase 6e — Dashboard enrichment (`AdminView`)

**Goal**: bring `AdminView` closer to `admin-screens.jsx` reference:
volume chart (30D / 90D / 1A), asset composition bars, "Eventos críticos
hoy" feed, "Top movimientos del día" table, trend pills (`+X% vs prev
week`).

- Status: next.
- Requires **new backend endpoints**:
  - Time-series volume aggregation (`GET /admin/volume?range=30d`).
  - Severity-tagged audit recent (`GET /admin/audit?severity=critical&since=24h`).
  - Top movements with USD value (depends on FX rates exposed).
  - User/wallet trend deltas vs previous period (`GET /admin/stats?compare=7d`).
- Out of scope of Phase 5 because content > styling.

### Phase 5b — Users table redesign

**Goal**: apply Screenshot_438.png reference to `AdminUsersView` table:
4-KPI bigstat row (Total / Activos / Restringidos / Saldo bajo gestión),
filter chips (Todos / Activos / KYC / Congelados / Baneados), columns
(KYC / País / Wallets / Saldo / Última actividad / Registro), pagination,
search, filter dropdowns (KYC, País), "Mostrar eliminados" toggle, column
selector.

- Status: backlog → next after 6d.
- Notes: supersedes the old PR #159 (closed; valuable parts ported here).
- Backend gaps: `kyc_level`, `country`, `last_active` not yet on
  `GET /admin/users` payload. Phase 5b will define and request them.

---

## 5. Backlog (later)

### Backend: coverage restoration

- Re-cover `stores/mining.ts`, `stores/wallet.ts`, `domain/validation.ts`.
- Revert `vitest.config.ts` threshold from 65 to 80.
- Owner: lands naturally with Phase 6d.2 (touches `wallet.ts`) and a
  small dedicated PR for `mining.ts` + `validation.ts`.

### Backend: fix simulator promotion script direction

- `basic-blockchain-simulator/scripts/devsecops_promotion_chain.sh`
  lines 101-104 are downward (production → main, production →
  staging, staging → qa, qa → develop) but
  `docs/devsecops/PROMOTION_STRATEGY.md` describes upward flow.
- Flip to match: `develop → qa`, `qa → staging`, `staging → production`,
  `production → main`. Frontend script is already correct.

### Phase 6f — Notifications + global search

**Goal**: bell + `NotificationCenter` in topbar, working `⌘K` global
search (currently decorative).

### Phase 6g — KYC flow for end users

**Goal**: user can view their KYC level and upload documents from their
own session (not just admin review). Pairs with backend KYC endpoints
(currently mocked in `UserDrawer.kyc`).

### Phase 7 — Interactive iteration ("Cadena v2")

**Goal**: the next visual system mentioned in `propuesta_refactorizacion/`
that adds interactive flows spanning multiple panels, revamped table
chrome with bulk actions, segmented filters, deeper drawer composition.

- Reference prototypes: `provisional/local-artifacts` branch (not
  merged) — JSX prototypes preserved as design reference only.
- Will get its own `DESIGN-v2.md` when work starts.

---

## 6. Decisions captured

This section keeps record of choices made along the way so future
contributors do not re-litigate them.

- **Upward promotion** is the canonical GitFlow direction
  (`develop → qa → staging → production → main`) on both repos. Downward
  sync PRs are auto-created by GitHub to keep branches aligned and
  should be admin-merged as soon as CI passes.
- **`ConfirmUserModal` stays.** PR #159 proposed removing it in favor
  of drawer-only actions; PR #160 instead made it Teleport-correct +
  data-real. The modal is the unified confirmation surface for
  destructive actions across both table rows and the drawer.
- **`.field` beats `.fld`.** The JSX prototypes use `.fld`; the shipped
  code uses `.field`. New views align to `.field`.
- **Domain primitives are documented but not promoted.** Classes like
  `.ob-row`, `.trade-side`, `.check-list` stay scoped to their view —
  they are listed in `DESIGN.md` §4 for reference, not promoted to §3.
- **Documentation does not need its own promotion chain step.** `docs/*`
  changes land on develop and ride the chain to main with the rest of
  the batch.

---

## 7. Reference: PR map (May 2026 batch)

| Repo | PR | Title | Status |
| --- | --- | --- | --- |
| simulator | #171 | fix(admin): `deleted_at` + ISO timestamp | merged |
| frontend | #160 | fix(admin-users): visible confirm modal + real totals | merged |
| frontend | #161 | refactor(admin-settings): Phase 5 alignment | merged |
| frontend | #162 | refactor(exchange): Phase 5 wrap | merged |
| frontend | #163 | docs: DESIGN.md | merged |
| frontend | #164 | chore(ci): coverage threshold 80→65 (temporary) | merged |
| frontend | #173 | feat(admin-users): hydrate UserDrawer (Phase 6d.1) | open |
| frontend | #159 | feat(admin-users): redesign list view | superseded by #160 + 6d.1 + Phase 5b — close |
