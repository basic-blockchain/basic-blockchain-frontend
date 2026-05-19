# DESIGN-v2 — Cadena v2

Status: contract (Phase 7.0)
Last updated: 2026-05-17
Companion to: [DESIGN.md](./DESIGN.md) (v1, still authoritative until each
view migrates) · [ROADMAP.md](./ROADMAP.md) (Phase 7 entry)

> v2 is **not** a "scrap-and-rewrite". It is a phased visual + UX
> refresh against the same simulator backend and the same Vue / Pinia
> / Vue Router stack. Each migration is a separate PR that keeps the
> rest of the app running on v1.

---

## 1. Why v2

After Phase 6 closed (admin enrichment + dashboard + KYC end-to-end +
USD aggregation + bootstrap-seed) the product is **functionally
dense** but **visually flat**. The v2 iteration documented in the
`provisional/local-artifacts` branch (`propuesta_refactorizacion/`)
addresses three concrete weaknesses identified during Phase 6:

1. **Table chrome** — every admin table looks the same. v2 introduces
   row-actions columns, bulk-action footers and sticky headers.
2. **Drawer composition** — v1 stacks `UserDrawer` and `WalletDrawer`
   with z-index; v2 groups them into a left-anchored detail panel
   with breadcrumb-style navigation between related entities.
3. **Flows / wizards** — minting and treasury operations are
   single-form one-shots in v1. v2 introduces a `Stepper` primitive
   (4–5 steps) so multi-party approvals (dual mint, treasury
   distribution) have a visible state machine.

The reference prototypes live at `provisional/local-artifacts:
propuesta_refactorizacion/` — JSX + plain HTML, *not* meant to land
as code. They are the visual contract this document distills.

---

## 2. Non-goals

- **No backend rewrite.** Every existing endpoint stays. Two new
  contract proposals (treasury approval, mint dual-sign) are listed
  in §7 as **proposals** — they land in their own simulator phase
  when product priorities catch up.
- **No design framework change.** PrimeVue + lucide-vue-next stay.
  No Tailwind. No styled-components.
- **No store rewrite.** Pinia stores keep their shape. Views consume
  them the same way; only the rendered DOM changes.
- **No router rename.** Existing paths (`/admin/users`,
  `/admin/wallets`, `/chain`, `/mempool`, etc.) stay so existing
  bookmarks and audit logs keep resolving.

---

## 3. Design tokens

v1 carries a fully-formed token palette in
`src/assets/design-system.css`. v2 keeps every variable name and
shape; the deltas are limited to:

- **Surface depth**: introduce `--surface-3` for nested panels
  (drawer-in-drawer, modal-in-drawer). Today the second level reuses
  `--surface-2` and the contrast against the table background is
  borderline.
- **Radius**: introduce `--radius-pill: 99px` so chip / badge styles
  share a single token instead of inlining `border-radius: 99px` per
  component (Phase 6 added 4 instances).
- **Spacing**: introduce `--space-xs: 4px`, `--space-sm: 6px`,
  `--space-md: 10px`, `--space-lg: 14px`, `--space-xl: 20px`.
  Existing components mix raw pixel values — the scale formalises
  what the v1 sheet already uses informally.
- **Motion**: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`,
  `--ease-in: cubic-bezier(0.4, 0, 1, 1)`, `--duration-fast: 120ms`,
  `--duration-base: 220ms`. v1 hardcodes `0.12s` in 40+ places.

The token deltas land in **Phase 7.0** as a single PR alongside this
document. Existing variables are not renamed — additive only.

---

## 4. Base components (Phase 7.1)

Built once, consumed by every v2 screen migration. Each one lives in
`src/components/atoms/` or `molecules/` and ships with its own
typecheck + at least one snapshot test.

| Component | Replaces | Notes |
|---|---|---|
| `BaseButton` | inline `.btn` + `.btn-primary` / `.btn-ghost` classes | Props: `variant` (`primary` `secondary` `danger` `ghost`), `size` (`sm` `md`), `loading`. |
| `BaseBadge` | `.status-badge`, `.kyc-badge`, `.role-chip` (3 inline styles today) | Props: `tone` (`success` `warning` `danger` `info` `neutral`), `dot?`. |
| `BaseAvatar` | inline `avatarInitials` + `avatarHue` (duplicated across 3 views) | Pulls from a shared composable; same hash function so seed→colour stays stable cross-component. |
| `BaseCard` | `.panel` / `.bigstat` (similar but divergent) | Slots: header / body / footer. `bigstat` becomes a card variant. |
| `BaseTable` | every `.tbl` / `.data-table` (5 vista-level copies) | Header sticky, hover row, row-actions slot, optional pagination footer. Column defs as typed array. |
| `BaseModal` | inline `Teleport to=body + scrim` (UserDrawer + ConfirmUserModal duplicate this) | `BaseDrawer` extends `BaseModal` with right-side anchor + width control. |
| `Stepper` | new — no v1 equivalent | Used by mint, treasury-approval, KYC-resubmit flows. Props: `steps` (`{key, label, status}[]`), `current`. |
| `AddrChip` / `HashChip` | `HashChip.vue` (exists) + many inline copies | Consolidate into a single chip with `mode` prop (`address` `tx` `block`). |
| `AssetPill` | inline `.asset-pill` (2 copies) | Currency code + flag/icon. |

Each component lands in its own PR (Phase 7.1.a … 7.1.h).

---

## 5. Screen migration order

The migration is **screen-by-screen**, each one a PR. The order
follows "highest UX leverage / lowest backend surface" so users see
visible progress every week:

1. **Login / Register** (Phase 7.2) — single endpoint, immediate
   credibility gain, exercises every new base component (button,
   card, badge).
2. **AdminView dashboard** (Phase 7.3) — refresh the cards already
   built in Phase 6e with v2 cards + stepper-style refresh indicator.
3. **AdminUsersView** (Phase 7.4) — most-used admin table. Adopts
   `BaseTable` with row-actions, bulk-action footer ("ban N",
   "export selected"), redesigned filter chips.
4. **AdminWalletsView** (Phase 7.5) — same `BaseTable` adoption,
   adds the per-currency USD/native toggle requested during Phase
   6i.1.
5. **UserDrawer + WalletDrawer** (Phase 7.6) — group into a single
   detail-panel pattern with breadcrumb-style nav between related
   entities (user → wallet → tx). Drops the stacked-z-index trick.
6. **ChainView / MempoolView / NodesView** (Phase 7.7) — blockchain
   primitives. Mostly visual.
7. **Treasury & Mint approval flow** (Phase 7.8) — first consumer of
   `Stepper` + the proposed dual-sign endpoints in §7.
8. **AdminAuditView, AdminComplianceView, AdminMovementsView,
   AdminKycView, AdminSendsView, AdminSettingsView** (Phase 7.9) —
   the long tail. Each one is a thin PR that swaps the chrome
   without changing the data path.

Mobile breakpoints stay as media queries inside each view (no
separate mobile routes). Phase 7 does not introduce a native app.

---

## 6. Iteration rules

Apply to every Phase 7.x PR:

- **Migrate one screen or one base component per PR.** Never two.
  Mixing migrations turns the PR into a visual-diff review nightmare.
- **Keep the route stable.** `<view-name>View.vue` stays the same
  file; the script tag, template and styles are rewritten in place.
  v1 callsites do not need to change.
- **Tokens before components, components before screens.** Phase 7.0
  (tokens) blocks 7.1 (base components) blocks 7.2+ (screens).
- **Snapshot tests at the migration boundary.** Each base component
  ships with a snapshot. Each screen migration adds a Playwright
  smoke if Playwright is in the stack (Phase 7.1.a will decide); a
  manual screenshot pair in the PR description otherwise.
- **No dead code at merge.** v1 files removed in the same commit as
  the v2 file lands. Two implementations of the same view never
  coexist on develop.
- **Promotion on cadence.** Each Phase 7.x lands on develop
  individually; the promotion chain runs at the end of each visible
  milestone (every 2–3 migrations), not after every PR.

---

## 7. New backend endpoints (proposals)

These do **not** block Phase 7. The frontend can mock them locally
(or stub the components with `disabled` states) until the simulator
catches up. Tracked here so they are visible upstream.

### 7.1 Treasury distribution with dual-sign

```
POST /api/v1/admin/treasury/distribute
  body: { source_wallet_id, recipient_user_ids[], amount_per_wallet, currency }
  → 201 { op_id, status: 'pending_approval', initiated_by, initiated_at }

POST /api/v1/admin/treasury/distribute/<op_id>/approve
  → 200 { op_id, status: 'approved' | 'executed', approved_by, executed_at? }

GET  /api/v1/admin/treasury/distribute?status=pending_approval
  → 200 { operations: [...] }
```

Requires a new `treasury_operations` table + an audit pair
(`TREASURY_OP_INITIATED`, `TREASURY_OP_APPROVED`). The approve
endpoint refuses when the approver equals the initiator
(`SAME_SIGNER_FORBIDDEN`).

### 7.2 Mint approval (extension of `/admin/mint`)

Today `POST /admin/mint` is single-call. v2 wraps it in the same
dual-sign envelope as 7.1 when the amount exceeds a configurable
`MINT_DUAL_SIGN_THRESHOLD`.

---

## 8. What does not change

- Existing `src/assets/design-system.css` is **extended**, not
  rewritten. Every v1 component keeps rendering until its screen is
  migrated.
- `BR-*` rules in the simulator's `docs/business-rules.md` stay
  authoritative. v2 is a chrome refresh; business rules do not
  change.
- The promotion chain (develop → qa → staging → production → main)
  on both repos. Phase 7.x PRs ride the same workflow.
- ECharts modular registration in `src/lib/echarts.ts`. v2 adds bar
  / donut to the registry in Phase 7.3 if the dashboard refresh
  needs them.

---

## 9. References

- Prototypes: `git show origin/provisional/local-artifacts:propuesta_refactorizacion/<file>`
  - `INTEGRATION.md` — original migration plan from the prototype author
  - `admin-screens.jsx` — Dashboard + Treasury reference
  - `chain-screens.jsx` — Chain / Mempool / Nodes reference
  - `chrome.jsx` — Sidebar + TopBar reference
  - `flows.jsx`, `flows-extra.jsx`, `flows-mining.jsx` — Stepper /
    modal flows
- Current v1: [DESIGN.md](./DESIGN.md), [components.md](./components.md)
