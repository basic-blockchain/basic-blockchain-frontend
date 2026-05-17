# Roadmap

Status: Living document
Last updated: 2026-05-16 (Phase 6g backend + cleanup)
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

### Phase 5b — Users table redesign

**Goal**: bring `AdminUsersView` in line with the Screenshot_438 reference
(KPI strip, filter chips, rich rows, pagination).

| Step | Status | PR |
| --- | --- | --- |
| Backend: extend `UserRecord` with `country`, `kyc_level`, `last_active`, `created_at` + migration V018 + endpoint serialization | done | simulator#183 |
| Frontend: 4-KPI bigstat row, filter chips (Todos / Activos / KYC / Congelados / Baneados), search + KYC + País filters, "Mostrar eliminados" toggle, avatar + KYC badge + country flag columns, pagination footer | done | #190 |

**Carry-overs** (documented in the PR bodies):
- ~~Inline role-chip toggles removed from the table; re-wiring role
  management into the `UserDrawer` is a follow-up.~~ Landed in
  Phase 6d.3 (see below).
- "Saldo bajo gestión" still sums raw native balances without FX. Real
  USD aggregation lands when admin endpoints expose exchange rates
  (Phase 6e dependency).
- Column selector ("Columnas" button in Screenshot_438) deferred; the
  responsive media queries already drop columns at 1100/760px.

### Phase 6a — Wallet UX

**Goal**: per-currency wallet cards + per-card actions on `WalletView`.

- Status: done (PR #146).

### Phase 6b — Dashboard live

**Goal**: live WebSocket indicators and new-block flash on `DashboardView`.

- Status: done (PR #147).

### Phase 6c — User profile

**Goal**: `ProfileDrawer` (Identidad + KYC tabs) opened from sidebar avatar.

- Status: done (PR #148).

### Phase 6d — Drawer hydration (UserDrawer + WalletDrawer)

**Goal**: replace hardcoded empty arrays in the admin drawers with real
fetched data; add a parallel `WalletDrawer` for per-wallet detail.

| Sub-phase | Step | Status | PR |
| --- | --- | --- | --- |
| 6d.1 | `UserDrawer`: real wallets (filtered from `listAllWallets`), movements (mempool feeds filtered by user public keys), audit (`listAuditLog target_id=userId`) | done | #173 |
| 6d.2 | `WalletDrawer`: new component with Resumen / Movimientos / Auditoría tabs; `AdminWalletsView` row click integration; freeze/unfreeze from drawer header | done | #182 |

**Carry-overs** (documented in the PR bodies):
- ~~Cross-navigation from the `UserDrawer` Wallets tab into the
  `WalletDrawer` not wired — follow-up.~~ Landed in Phase 6d.4
  (see below).
- `balanceUsd` / `amountUsd` still best-effort (raw native balance, no
  FX) — same caveat as Phase 5b. Lands with exchange-rate enrichment.
- `Movement.type` limited to `deposit` / `withdraw` until P2P /
  Exchange flows produce structured movement records.
- KYC / phone / country / 2FA in `UserDrawer` are placeholders; real
  KYC arrives with Phase 6g.

### Phase 6d.3 — Role management in `UserDrawer`

**Goal**: restore ADMIN / OPERATOR / VIEWER toggles inside the user
detail drawer, replacing the inline role chips removed from the
Phase 5b table.

| Step | Status | PR |
| --- | --- | --- |
| Extend `DrawerUser` with raw `roles: string[]`, add `grant_role` / `revoke_role` to `DrawerAction`, surface a `Roles` section under the Resumen tab (one row per manageable role with Otorgar/Revocar button), wire `grantRole` / `revokeRole` via `handleDrawerAction` with optimistic reload | done | _TBD_ |

**Notes**:
- Role mutations bypass `ConfirmUserModal` — they are idempotent server
  side and a confirmation step adds friction without safety value.
- "Roles" section is hidden for `deleted` users (replaced by a dashed
  notice).

### Phase 6d.4 — Cross-navigation `UserDrawer` → `WalletDrawer`

**Goal**: clicking a wallet row in the `UserDrawer` Wallets tab opens
the `WalletDrawer` mounted at the `AdminUsersView` level, instead of
being inert.

| Step | Status | PR |
| --- | --- | --- |
| `UserDrawer` emits `view-wallet` from clickable wallet rows; `AdminUsersView` mounts its own `WalletDrawer` instance, hydrates movements + audit from the same pending/confirmed/audit pipeline used by `AdminWalletsView`, and routes freeze/unfreeze actions back through the admin API | done | _TBD_ |

**Notes**:
- The wallet-loading pipeline is replicated rather than extracted into
  a composable for this PR — the surface is small (~70 lines) and a
  shared composable can land naturally with a future drawer iteration.
- `WalletDrawer` stacks on top of `UserDrawer` via z-index (its own
  scrim covers the user drawer). Closing the wallet drawer reveals
  the user drawer underneath.

### Phase 6f — NotificationCenter + global search (⌘K)

**Goal**: replace the decorative topbar search and add a working
notification surface — the two gaps documented in the original
Phase 6 diagnostic.

| Step | Status | PR |
| --- | --- | --- |
| `NotificationCenter` (bell + dropdown) reading from `listAuditLog` (admin) and the chain store (new blocks for all users), severity inferred from the action verb; unread-count badge driven by `localStorage`-persisted `lastSeenAt` / `lastSeenBlock`; "Marcar leídas" + "Ver auditoría completa" CTAs | done | _TBD_ |
| `CommandPalette` (⌘K / Ctrl+K) with grouped results — Navegación (sidebar entries filtered by auth/role), Bloques (chain store match by index/merkleRoot), Usuarios + Wallets (admin only, lazy-loaded on first open). Keyboard nav ↑↓/Enter/Esc | done | _TBD_ |
| Topbar wiring: the inert `<input>` becomes a `<button>` that opens the palette; the bell sits to its right; global `keydown` listener catches ⌘K/Ctrl+K | done | _TBD_ |

**Notes / follow-ups**:
- The notification feed is derived from `audit` entries + chain events.
  When Phase 6e ships a `GET /admin/audit?severity=critical&since=24h`
  endpoint, `NotificationCenter` will swap its source without changing
  the dropdown's shape.
- Severity classification lives client-side (`severityFromAction`) and
  will be replaced by the backend `severity` field when available.
- The palette indexes only `listUsers` + `listAllWallets` (admin); a
  full search across mempool / confirmed txs is a future iteration.

### Phase 6g — KYC user flow (frontend base)

**Goal**: end users can see their current KYC level, upload required
documents, and request promotion to the next level — without
admin involvement. Phase 6g lays the **base layer**; the future
redesign iteration (or its skip) decides on top of this concrete
surface.

| Step | Status | PR |
| --- | --- | --- |
| `AuthUser.kyc_level` optional + threaded through `MeResponse` and `_setUser`; exported top-level `KycLevel` type | done | _TBD_ |
| `src/api/kyc.ts` — typed contract for `GET /me/kyc/status`, `POST /me/kyc/documents`, `POST /me/kyc/review` (`KycDocumentRecord`, `KycStatusResponse`, `UploadKycDocumentPayload`) | done | _TBD_ |
| `ProfileDrawer` KYC tab — real document upload (file input + base64 + status badge), review submission CTA, pending banner | done | _TBD_ |
| **Backend (simulator)**: `/me/kyc/status` · `/me/kyc/documents` · `/me/kyc/review` + `kyc_level` on `/auth/me` (V019 migration, audit events) | done | simulator#191 |
| Cleanup: drop the `localStorage` fallback in `ProfileDrawer` now that the backend is the source of truth | done | _TBD_ |

**Notes / follow-ups**:
- `users.kyc_level` is now returned by `/auth/me` and the client picks
  it up through `AuthUser.kyc_level`. Existing rows still default to
  `'L0'` until they complete a review.
- Auth-flow follow-up (backlog): populate `last_active` and `country`
  on login / signup — pairs naturally with the next backend phase.
- Admin-side KYC review (approve / reject) is **not yet implemented**
  server-side. Until it lands, a user who submits a review stays in
  `pending_review` indefinitely. See "Backend follow-up: KYC admin
  review" in §5 Backlog.

### Admin Users hotfix batch (May 2026)

**Goal**: ban modal visible, real totals in `ConfirmUserModal`, drawer
actions route through the confirm flow, soft-delete returns `deleted_at`,
ISO timestamp on soft-delete.

| Repo | PR | Status |
| --- | --- | --- |
| simulator | #171 | merged |
| frontend  | #160 | merged |

### Repo plumbing (May 2026)

- ~~Coverage gate temporarily lowered to 65% to unblock the Phase 5 / 6d /
  5b batch — PR #164.~~ Restored to 80% after the
  Phase 6g batch — `stores/wallet.ts` and `stores/mining.ts` reached
  100% local coverage; `domain/validation.ts` is type-only and is
  excluded from the include set (same treatment as `domain/metrics.ts`
  and `domain/node.ts`). Current global numbers: 95.76% lines / 91.58%
  branches / 93.93% functions.
- Promotion chain run end-to-end on both repos for every batch
  (develop → qa → staging → production → main).
- Old PR #159 (`feat/admin-users-redesign` → main) closed with
  justification; its content was redistributed across #160 (hotfix),
  #173 / #182 (Phase 6d) and #190 (Phase 5b table).
- Untracked artifacts (`propuesta_refactorizacion/`,
  `MINING_FIX_SUMMARY.md`) archived on the `provisional/local-artifacts`
  branch — kept on origin as a design-reference snapshot, not merged
  to develop.

---

## 3. In flight

*(nothing — the batch from May 2026 is fully landed.)*

When the next phase opens, this section gets the corresponding PR
references and an honest list of what's still open.

---

## 4. Next (committed scope)

### Phase 6e — Dashboard enrichment (`AdminView`)

**Goal**: bring `AdminView` closer to `admin-screens.jsx` reference:
volume chart (30D / 90D / 1A), asset composition bars, "Eventos críticos
hoy" feed, "Top movimientos del día" table, trend pills (`+X% vs prev
week`).

- Status: next — committed but not started.
- **Requires new backend endpoints**:
  - Time-series volume aggregation (`GET /admin/volume?range=30d`).
  - Severity-tagged audit recent (`GET /admin/audit?severity=critical&since=24h`).
  - Top movements with USD value (depends on FX rates exposed).
  - User/wallet trend deltas vs previous period (`GET /admin/stats?compare=7d`).
- Unblocks "Saldo bajo gestión" real USD aggregation in the rest of
  the admin views (Phase 5b / 6d.1 / 6d.2 all carry the same caveat).

---

## 5. Backlog (later)

### Backend: fix simulator promotion script direction — **DONE**

- `scripts/devsecops_promotion_chain.sh` now opens upward PRs
  (`develop → qa → staging → production → main`), matching
  `docs/devsecops/PROMOTION_STRATEGY.md` and the frontend script.
- Simulator PR #217. The chain is back to one-command on both repos.

### Backend: resilient PG SELECT on missing columns — **DONE**

- `PostgresUserStore._select_users(...)` runs the extended SELECT first;
  on `psycopg2.errors.UndefinedColumn` it falls back to the legacy
  projection and latches `self._users_legacy_only = True` so the
  failure round-trip happens at most once per process. Records served
  from the fallback default `kyc_level='L0'` and `country=None`.
- Simulator PR #225 with regression test in
  `tests/test_infrastructure_adapters.py::test_postgres_user_store_falls_back_to_legacy_select`.
- The "pull → migrate → restart" guidance in §6 Decisions remains
  best practice — the fallback exists for environments where the
  migration is temporarily delayed.

### Backend follow-up: KYC admin review — **DONE** (Phase 6g-admin, simulator)

**Status**: backend landed. The simulator exposes the four routes under
`/api/v1/admin/kyc/*` gated by the new `REVIEW_KYC` permission (ADMIN
baseline):

- `GET  /admin/kyc/pending` — users with `kyc_pending_review` set,
  oldest submission first; each row carries the same per-doc public
  shape as `/me/kyc/status`.
- `POST /admin/kyc/users/<user_id>/documents/<doc_key>/approve` — flip
  one document to `status: 'verified'`.
- `POST /admin/kyc/users/<user_id>/documents/<doc_key>/reject`
  `{reason}` — flip to `rejected`, store the reason, and abort the
  whole review (`kyc_pending_review` + `kyc_submitted_at` cleared) so
  the user can re-upload.
- `POST /admin/kyc/users/<user_id>/promote` — promote to the current
  `pending_review` target iff every required document is verified;
  fails with `KYC_NOT_ALL_DOCUMENTS_VERIFIED` otherwise.

Audit emits `KYC_DOCUMENT_APPROVED`, `KYC_DOCUMENT_REJECTED` and
`KYC_LEVEL_PROMOTED`. Contract is documented in
`basic-blockchain-simulator docs/api-reference.md` (§ "KYC admin
review") and rules BR-KY-09..16 in business-rules.md.

**Frontend follow-up — DONE (Phase 6h)**:
- `src/api/kyc.ts` exports `getPendingKycReviews()`,
  `approveKycDocument()`, `rejectKycDocument()`, `promoteKycLevel()`
  plus the `PendingKycReview` / `PromoteKycResponse` types.
- New `src/views/AdminKycView.vue` renders the queue as one card per
  user with a per-doc grid (DNI / Selfie / Domicilio / Fondos):
  approve / reject (with inline reason field) buttons per document
  and a "Promover a Lx" footer button gated on every required doc
  reaching `verified`. Reachable at `/admin/kyc`, surfaced in the
  sidebar nav (Plataforma · KYC) and the command palette
  (Admin · KYC).

### Auth flow: populate `last_active` and `country` — **DONE (backend)**

- `POST /auth/register` accepts an optional `country` field (case-folded
  to uppercase, validated as 2-letter ISO 3166-1 alpha-2).
- `POST /auth/login` calls `users.touch_last_active(...)` after every
  credential / activation / ban guard so failures never update the
  column. Rules captured as BR-AU-08 / BR-AU-09 in
  `basic-blockchain-simulator/docs/business-rules.md`.
- Simulator PR #226.
- **Frontend follow-up (open)**: surface a country picker on
  `RegisterView` and pass `country` in the `/auth/register` body.
  Today the field is accepted but optional — registrations without a
  picker still succeed with `country=null`.

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
- **Inline role chips on the Users table were dropped in Phase 5b.**
  Role mutation moves into the `UserDrawer` (see §4) instead of
  cluttering every row. The functions `grantRole` / `revokeRole` stay
  in `@/api/admin` — only the view-level import was removed.
- **Schema migrations are mandatory after pulling.** V018 added four
  columns the PG adapter selects unconditionally. Pull → migrate →
  restart is the documented order. A resilient-SELECT fallback is on
  the backlog for environments where this is impractical.

---

## 7. Reference: PR map (May 2026 batch)

| Repo | PR | Title | Status |
| --- | --- | --- | --- |
| simulator | #171 | fix(admin): `deleted_at` + ISO timestamp | merged |
| simulator | #183 | feat(admin): enriched user profile fields (Phase 5b backend) | merged |
| frontend | #160 | fix(admin-users): visible confirm modal + real totals | merged |
| frontend | #161 | refactor(admin-settings): Phase 5 alignment | merged |
| frontend | #162 | refactor(exchange): Phase 5 wrap | merged |
| frontend | #163 | docs: DESIGN.md | merged |
| frontend | #164 | chore(ci): coverage threshold 80→65 (temporary) | merged |
| frontend | #173 | feat(admin-users): hydrate UserDrawer (Phase 6d.1) | merged |
| frontend | #174 | docs: ROADMAP.md initial | merged |
| frontend | #182 | feat(admin-wallets): WalletDrawer (Phase 6d.2) | merged |
| frontend | #190 | feat(admin-users): Phase 5b table redesign | merged |
| frontend | #159 | feat(admin-users): redesign list view | closed — superseded by #160 + #173 + #190 |
