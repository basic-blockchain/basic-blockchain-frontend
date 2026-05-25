# Component Catalog

Status: Accepted
Last updated: 2026-05-25 (Phase 7 closed — Design v2 atoms catalogued)
Scope: All reusable UI components under `src/components/` and `src/views/`.

Components are organised under the **Atomic Design** methodology:
`atoms -> molecules -> organisms -> views`.

Dependency direction is **strictly bottom-up**: an atom never imports a
molecule, a molecule never imports an organism, and **only organisms and views
may call `useXxxStore()`**.

> **Phase 7 (Design v2)** introduced a unified base-atom layer
> (`BaseButton`, `BaseBadge`, `BaseTable`, `BaseModal`, `BaseDrawer`,
> `BaseCard`, `Stepper`) and migrated every view and flow onto it. Pre-v2
> atoms that survived (`HashChip`, `AmountDisplay`) coexist; `StatusBadge`
> was consolidated into `BaseBadge` in 7.7 and **removed**. The contract is
> documented in [`DESIGN-v2.md`](./DESIGN-v2.md).

---

## Table of Contents

- Atoms (Phase 7 / Design v2)
  - BaseButton
  - BaseBadge
  - BaseCard
  - BaseTable
  - BaseModal
  - BaseDrawer
  - Stepper
- Atoms (legacy / pre-v2 survivors)
  - HashChip
  - AmountDisplay
- Molecules
  - AuthLayout
  - BlockCard
  - TransactionRow
  - NodeBadge
  - MetricTile
  - SeedPhraseModal
- Organisms
  - ChainList
  - MempoolTable
  - ConfirmedTransactionsTable
  - NodePanel
  - MetricsBar
  - MineButton
  - MiningChart
  - MiningNotification
  - PaginatedTable
- Flows
  - MineBlockFlow
  - TransactionDetailFlow
  - SendConfirmFlow
  - ReceiveFlow
  - ConvertFlow
  - WithdrawFlow
  - ExchangeOrderFlow
  - P2PBuyFlow
  - TreasuryApprovalFlow (Phase 7.8 — dual-sign, wired to backend)
  - DisputeResolutionFlow
  - KYCReviewFlow
- Drawers
  - UserDrawer
  - WalletDrawer
  - ProfileDrawer
- Views
  - LoginView, RegisterView, ActivateView
  - DashboardView, WalletView
  - ChainView, MempoolView, NodesView, HealthView, ValidationView
  - ExchangeView, P2PView
  - AdminView, AdminUsersView, AdminWalletsView, AdminCurrenciesView,
    AdminExchangeRatesView, AdminTreasuryView, AdminMovementsView,
    AdminSendsView, AdminAuditView, AdminComplianceView, AdminKycView,
    AdminSettingsView

---

## Atoms

Atoms are **pure presentational** components. They have no access to stores,
no side effects, and rely only on props and emits.

> The Base\* family below was introduced in **Phase 7** as the foundation of
> Design v2. The full visual + API contract is documented in
> [`DESIGN-v2.md`](./DESIGN-v2.md); the entries here are the catalog
> summary. Each atom ships with a unit-test suite and a snapshot matrix
> under `tests/components/`.

### BaseButton (7.1.a)

**Purpose:** unified button element; replaces every legacy `.btn` across the
app (flows, drawers, views).

**Props:**

```ts
interface BaseButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  iconLeft?: string
  iconRight?: string
}
```

**Emits:** `click`.

**Slots:** default (label).

Spec: [`specs/7.1.a-base-button.md`](specs/7.1.a-base-button.md).

---

### BaseBadge (7.1.b)

**Purpose:** pill / tag element with a `tone × variant` contract. Consolidates
the former `StatusBadge` (Phase 7.7) — every status / chip / tag use case
on the dashboard now flows through this atom.

**Props:**

```ts
interface BaseBadgeProps {
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
  variant?: 'soft' | 'solid' | 'outline'
  size?: 'sm' | 'md'
}
```

**Slots:** default (label).

Spec: [`specs/7.1.b-base-badge.md`](specs/7.1.b-base-badge.md).

---

### BaseCard (7.1.f)

**Purpose:** chrome wrapper with header / body / footer slots; the default
shell for every panel and section after Phase 7.

**Props:**

```ts
interface BaseCardProps {
  padded?: boolean
  bordered?: boolean
  tone?: 'default' | 'muted'
}
```

**Slots:** `header`, default (body), `footer`.

Spec: [`specs/7.1.f-base-card.md`](specs/7.1.f-base-card.md).

---

### BaseTable (7.1.c)

**Purpose:** greenfield table atom with explicit `rowKey` / `rowClass`
contract and named slots per column. Every admin / chain / mempool list now
renders through it (via `PaginatedTable` for paginated chrome).

**Props (sketch):**

```ts
interface BaseTableProps<T> {
  rows: readonly T[]
  rowKey: (row: T) => string
  rowClass?: (row: T) => string | string[] | undefined
  columns: ReadonlyArray<{ key: string; label: string; width?: string }>
  empty?: string
}
```

**Slots:** one per column key (`#cell-<key>`), plus `#empty`.

Spec: [`specs/7.1.c-base-table.md`](specs/7.1.c-base-table.md).

---

### BaseModal & BaseDrawer (7.1.e)

**Purpose:** `BaseModal` is a centred dialog primitive (Teleport + focus
trap + `Esc` close). `BaseDrawer` wraps `BaseModal` with a side variant
(`left | right`). All confirm / detail surfaces (ProfileDrawer, UserDrawer,
WalletDrawer, ConfirmUserModal) sit on top of these.

**Props (shared):**

```ts
interface BaseModalProps {
  open: boolean
  size?: 'sm' | 'md' | 'lg'
  dismissible?: boolean
}
interface BaseDrawerProps extends BaseModalProps {
  side?: 'left' | 'right'
}
```

**Emits:** `update:open`, `close`.

Spec: [`specs/7.1.e-base-modal-drawer.md`](specs/7.1.e-base-modal-drawer.md).

---

### Stepper (7.1.d)

**Purpose:** linear progress indicator used by multi-step flows
(`TreasuryApprovalFlow`, `KYCReviewFlow`, AdminView dashboard fetch
indicator). Supports error / done / current states.

**Props:**

```ts
interface StepperProps {
  steps: ReadonlyArray<{
    key: string
    label: string
    state: 'pending' | 'current' | 'done' | 'error'
    note?: string
  }>
}
```

Spec: [`specs/7.1.d-stepper.md`](specs/7.1.d-stepper.md).

---

### HashChip

**Purpose:** renders a truncated hash (e.g. `0x4f2a...9c1b`) with click-to-copy.

**Props:**

```ts
interface HashChipProps {
  hash: string
  full?: boolean
}
```

**Emits:** none.

**Usage:**

```vue
<HashChip :hash="block.hash" />
```

---

### AmountDisplay

**Purpose:** formats a `Decimal`-like string (backend precision 28,8) with
thousands separators and the currency symbol.

**Props:**

```ts
interface AmountDisplayProps {
  amount: number
  precision?: number
  unit?: string
}
```

**Emits:** none.

**Usage:**

```vue
<AmountDisplay :amount="tx.amount" unit="BTC" />
```

---

## Molecules

Molecules compose atoms and simple PrimeVue primitives. Still no store access.

### AuthLayout (Phase 7.2)

**Purpose:** shared chrome for `LoginView`, `RegisterView` and `ActivateView`
— renders the brand panel + a slotted form column, plus an optional inline
`Stepper` for multi-step flows (registration → activation). Replaces the
ad-hoc layouts each auth view used pre-Phase 7.

**Props:**

```ts
interface AuthLayoutProps {
  title: string
  subtitle?: string
  steps?: StepperProps['steps']
}
```

**Slots:** default (form body), `footer`.

Spec: [`specs/7.2-login-migration.md`](specs/7.2-login-migration.md).

---

### BlockCard

**Purpose:** summary card for a single block (index, timestamp, previous hash,
merkle root, tx count, proof).

**Props:**

```ts
interface BlockCardProps {
  block: Block
  compact?: boolean
}
```

**Emits:** none.

**Usage:**

```vue
<BlockCard :block="block" :compact="true" />
```

---

### TransactionRow

**Purpose:** compact row for a transaction (sender, receiver, amount, status).

**Props:**

```ts
interface TransactionRowProps {
  transaction: Transaction
  status?: 'pending' | 'confirmed'
}
```

**Emits:** none.

**Usage:**

```vue
<TransactionRow v-for="tx in pending" :key="tx.id" :transaction="tx" status="pending" />
```

---

### NodeBadge

**Purpose:** visual representation of a peer node (URL, online/offline, last
seen).

**Props:**

```ts
interface NodeBadgeProps {
  url: string
  online?: boolean
}
```

**Emits:** none.

**Usage:**

```vue
<NodeBadge :url="peer" online />
```

---

### MetricTile

**Purpose:** labelled number tile used in `MetricsBar` and `HealthView`.

**Props:**

```ts
interface MetricTileProps {
  label: string
  value: number | string | null
  unit?: string
}
```

**Emits:** none.

**Usage:**

```vue
<MetricTile label="Mempool depth" :value="depth" unit="tx" />
```

---

### SeedPhraseModal

**Purpose:** modal that reveals the 12-word recovery phrase once and forces a
user confirmation before continuing.

**Props:**

```ts
interface SeedPhraseModalProps {
  mnemonic: string
  visible: boolean
}
```

**Emits:**

- `confirm: () => void`

**Usage:**

```vue
<SeedPhraseModal :mnemonic="wallet.mnemonic" :visible="showSeed" @confirm="ackSeedPhrase" />
```

---

## Organisms

Organisms orchestrate molecules, consume Pinia stores, and handle side effects.

### ChainList

**Purpose:** vertically scrolling list of `BlockCard`s with entry animation.

**Props:**

```ts
interface ChainListProps {
  blocks: Block[]
  compact?: boolean
}
```

**Emits:** none.

**Usage:**

```vue
<ChainList :blocks="store.blocks" compact />
```

---

### MempoolTable

**Purpose:** PrimeVue DataTable for pending transactions (sender, receiver,
amount) sourced from `useMempoolStore`.

**Props:**

```ts
interface MempoolTableProps {
  transactions: Transaction[]
}
```

**Emits:** none.

**Usage:**

```vue
<MempoolTable :transactions="store.transactions" />
```

---

### ConfirmedTransactionsTable

**Purpose:** paginated table of confirmed transactions loaded from
`useConfirmedTransactionsStore`.

**Props:**

```ts
interface ConfirmedTransactionsTableProps {
  transactions: ConfirmedTransaction[]
}
```

**Emits:** none.

**Usage:**

```vue
<ConfirmedTransactionsTable :transactions="confirmedStore.records" />
```

---

### NodePanel

**Purpose:** peer registry UI — list peers, add a new peer URL, trigger
consensus resolve.

**Props:** none.

**Emits:** none.

**Usage:**

```vue
<NodePanel />
```

---

### MetricsBar

**Purpose:** horizontal strip of `MetricTile`s and status badges (chain height,
pending count, avg mine time, node/database status).

**Props:**

```ts
interface MetricsBarProps {
  metrics: Metrics | null
  health: Health | null
}
```

**Emits:** none.

**Usage:**

```vue
<MetricsBar :metrics="metricsStore.metrics" :health="metricsStore.health" />
```

---

### MineButton

**Purpose:** triggers `POST /api/v1/mine_block` and updates chain, mempool,
metrics, and confirmed transactions with a success toast.

**Props:** none.

**Emits:** none.

**Usage:**

```vue
<MineButton />
```

---

### MiningChart

**Purpose:** Chart.js line chart showing blocks mined per minute over the last
20 blocks; uses block timestamps to compute mine-time deltas.

**Props:**

```ts
interface MiningChartProps {
  blocks: Block[]
}
```

**Emits:** none.

**Usage:**

```vue
<MiningChart :blocks="store.blocks" />
```

---

## Flows

Flows are multi-step modal overlays rendered directly inside views. They
manage their own internal state and emit `close` + `complete` events. They
never import stores directly; all domain data is passed via props.

### MineBlockFlow

**File:** `src/components/flows/MineBlockFlow.vue`
**Purpose:** animated PoW simulation — shows nonce/hash progress in a
terminal-style dark panel, fires `complete` when the block is "mined".

**Props:**
```ts
interface MineBlockData {
  nextHeight: number
  pendingCount: number
  prevHash: string
}
// received as: :data="mineData"
```

**Emits:** `close`, `complete`

**Steps:** `0` ready → `1` mining (RAF loop, 8 attempts/frame) → `2` mined

---

### TransactionDetailFlow

**File:** `src/components/flows/TransactionDetailFlow.vue`
**Purpose:** full transaction detail overlay — from/to boxes, amount display,
`.kvs` key-value grid, and a trace timeline that appends confirmation rows when
`status === 'completed'`.

**Props:**
```ts
interface TxDetailData {
  tx: { id: string; sender: string; receiver: string; amount: number; currency: string; fee: number; size: number }
  status: 'pending' | 'completed'
  block?: number
  confirmedAt?: string
}
// received as: :data="selectedTx"
```

**Emits:** `close`

---

## Drawers

Drawers are slide-in panels anchored to the right edge of the viewport.
They overlay content with a semi-transparent scrim and are dismissed via
an Escape key listener, scrim click, or an explicit close button.

> **Phase 7.6** rebased every drawer onto `BaseDrawer` (a `BaseModal` with
> `side='right'`). The per-drawer logic below survived the migration; only
> the chrome changed.

### WalletDrawer

**File:** `src/components/drawers/WalletDrawer.vue`
**Purpose:** wallet-level detail (Resumen / Movimientos / Auditoría) opened
from `AdminWalletsView` rows or, since Phase 6d.4, from a wallet row inside
`UserDrawer` (cross-navigation). Surfaces freeze / unfreeze in the header.

### ProfileDrawer

**File:** `src/components/drawers/ProfileDrawer.vue`
**Purpose:** end-user profile (Identidad + KYC tabs) opened from the sidebar
avatar. The KYC tab consumes `src/api/kyc.ts` (`/me/kyc/*`) for upload and
review-submission flows (Phase 6g).

### UserDrawer

**File:** `src/components/drawers/UserDrawer.vue`
**Purpose:** full user profile drawer for admin views — 5 tabs (overview /
wallets / movements / kyc / audit), status banners for deleted/banned/frozen/
pending_kyc states, conditional action buttons (ban, unban, freeze,
unfreeze, delete, restore, edit), a **Roles section** (Phase 6d.3) with
ADMIN / OPERATOR / VIEWER toggles, and a **cross-navigation hook**
(Phase 6d.4) so a wallet row click emits `view-wallet` for the parent
view to open a `WalletDrawer`.

**Exported types:**
```ts
interface DrawerUser {
  id: string; fullName: string; email: string; phone: string
  country: { name: string; code: string; flag: string }
  role: 'user' | 'staff' | 'admin'
  roles: string[]                       // raw RBAC roles, drives the Roles section
  twoFA: boolean
  kyc: 'L0' | 'L1' | 'L2' | 'L3'
  status: 'active' | 'banned' | 'frozen' | 'pending_kyc' | 'deleted'
  wallets: DrawerWallet[]
  movements: DrawerMovement[]
  audit: DrawerAuditEvent[]
  flags: { banReason?: string; freezeReason?: string; deletedAt?: string }
  // ...identity fields
}
type DrawerAction =
  | 'ban' | 'unban' | 'freeze' | 'unfreeze' | 'delete' | 'restore' | 'edit'
  | 'grant_role' | 'revoke_role'
```

**Props:** `user: DrawerUser | null`, `open: boolean`

**Emits:**
- `close`
- `action: [DrawerAction, DrawerUser, string?]` — third element carries
  the role name for `grant_role` / `revoke_role`
- `view-wallet: string` — `wallet_id` of the clicked wallet row

**CSS:** `.scrim` (fixed overlay, opacity transition) + `.drawer` (480 px
fixed right panel, `transform: translateX(100%)` → `translateX(0)`),
`.roles-card` / `.role-row` / `.wallet-row` (Phase 6d.3 / 6d.4)

### WalletDrawer

**File:** `src/components/drawers/WalletDrawer.vue`
**Purpose:** per-wallet detail drawer with three tabs (Resumen,
Movimientos, Auditoría). Used from `AdminWalletsView` (row click) and
from `AdminUsersView` via the `UserDrawer` cross-navigation hook.
Header surfaces a single action: Freeze / Unfreeze.

**Exported types:**
```ts
interface DrawerWalletMovement {
  id: string
  direction: 'in' | 'out'
  counterparty: string
  amount: string
  amountUsd: number
  status: 'completed' | 'pending' | 'failed'
  createdAt: string
}
interface DrawerWalletAuditEvent { id: string; action: string; meta: string; actor: string; at: string }
interface DrawerWallet { wallet: WalletAdminRecord; movements: DrawerWalletMovement[]; audit: DrawerWalletAuditEvent[] }
type WalletDrawerAction = 'freeze' | 'unfreeze'
```

**Props:** `data: DrawerWallet | null`, `open: boolean`, `loading?: boolean`

**Emits:** `close`, `action: [WalletDrawerAction, WalletAdminRecord]`

### ProfileDrawer

**File:** `src/components/drawers/ProfileDrawer.vue`
**Purpose:** the **user's own** profile drawer (opened from the
sidebar avatar). Two tabs: Identidad (read-only profile + roles
display) and **KYC** (Phase 6g): current level card, level ladder
with current/past badges, per-document upload + status row, and a
"Solicitar nivel X" CTA gated on the required document set.

**Data source:** `GET /me/kyc/status` (loaded on open + tab switch);
uploads go through `POST /me/kyc/documents` (base64 payload);
review submission through `POST /me/kyc/review`. The current KYC
level is sourced from `auth.user.kyc_level` (filled by `/auth/me`).
**No localStorage cache** — the backend is the source of truth.

**Props:** `user: AuthUser | null`, `open: boolean`

**Emits:** `close`

## Topbar

The topbar lives in `src/App.vue` and hosts two interactive components
introduced by Phase 6f:

### NotificationCenter

**File:** `src/components/topbar/NotificationCenter.vue`
**Purpose:** bell with unread-count badge and a dropdown listing
recent chain events (new blocks, visible to everyone) merged with
admin audit entries (`listAuditLog`, polled every 30s when the user
is admin). Severity is inferred client-side from the action verb
(`severityFromAction`) and the unread count is computed against
`localStorage`-persisted `notif:lastSeenAt` / `notif:lastSeenBlock`.

**Props:** none (self-contained, reads `useAuthStore` + `useChainStore`).

### CommandPalette (⌘K)

**File:** `src/components/topbar/CommandPalette.vue`
**Purpose:** Teleport-mounted modal palette that always shows
Navegación entries filtered by the auth store. With `query.length >= 2`
it also matches against chain blocks (by `index` / `merkleRoot` prefix)
and — for admins, after a lazy load — `AdminUser` and
`WalletAdminRecord` rows. Keyboard nav: ↑↓ / Enter / Esc.

**Props:** `open: boolean`

**Emits:** `close`

**Trigger surface:** topbar `.topbar-search` button **and** a global
`window.keydown` listener in `App.vue` that captures `Cmd+K` /
`Ctrl+K` with `preventDefault` (so the browser binding is bypassed).

---

## Views

Views are route targets. They compose organisms and handle route params.

### LoginView

**Route:** `/login`
**Purpose:** JWT login form; redirects authenticated users to `/wallet`.

**Props:** none.

---

### RegisterView

**Route:** `/register`
**Purpose:** create a new account and receive an activation code.

**Props:** none.

---

### ActivateView

**Route:** `/activate`
**Purpose:** set the initial password using an activation code.

**Props:** none.

---

### WalletView

**Route:** `/wallet`
**Purpose:** create wallets, view balances, and submit signed transfers; opens
`SeedPhraseModal` after wallet creation.

**Props:** none.

---

### AdminView

**Route:** `/admin`
**Purpose:** mint tokens and perform quick admin actions (ADMIN only).

**Props:** none.

---

### AdminUsersView

**Route:** `/admin/users`
**Purpose:** admin user management (edit, ban, soft delete, restore, roles).
Opens `UserDrawer` on row click; action handler calls the corresponding
ban/unban/softDelete/restore API and refreshes the list.

**Props:** none.

---

### AdminWalletsView

**Route:** `/admin/wallets`
**Purpose:** list all wallets and freeze/unfreeze (ADMIN only). Phase 5f:
bigstat row (Total / Activas / Congeladas / Inactivas), asset-pill first
column, `.btn .btn-sm` header actions (Exportar, Congelar selección).

**Props:** none.

---

### DashboardView

**Route:** `/dashboard`
**Purpose:** landing page with `MetricsBar`, `MineButton`, recent blocks, and
pending mempool.

**Props:** none (route-level).

**Usage:** `/` redirects here.

---

### ChainView

**Route:** `/chain`
**Purpose:** Phase 5e — bigstat row (height, transactions, avg time, last
hash) + two-column explorer (block list + block detail panel). Launches
`MineBlockFlow` from a header button. Clicking a block row selects it in
the detail panel.

**Props:** none.

---

### MempoolView

**Route:** `/mempool`
**Purpose:** Phase 5e — bigstat row (pending, confirmed, total volume, avg
fee) + clickable pending table (opens `TransactionDetailFlow`) + confirmed
history table. Header button launches `MineBlockFlow`.

**Props:** none.

---

### NodesView

**Route:** `/nodes`
**Purpose:** Phase 5e — bigstat row (peers, active, consensus status,
longest chain) + peer table with status badges (deterministic from URL) +
register peer input + resolve consensus with result banner.

**Props:** none.

---

### ValidationView

**Route:** `/validation`
**Purpose:** chain validation plus local block/node/transaction checks with
exportable history.

**Props:** none.

---

### HealthView

**Route:** `/health`
**Purpose:** metrics overview plus node/db status badges and refresh action.

**Props:** none.

---

## Authoring Conventions

- **Naming:** `PascalCase` for component file names; one component per file.
- **Props:** defined via `defineProps<T>()` with an explicit TS interface; no
  runtime props object.
- **Emits:** typed with `defineEmits<{ (e: 'name', payload: Type): void }>()`.
- **Styling:** scoped style with CSS variables from the PrimeVue theme; no
  inline styles except for dynamic values.
- **Tests:** every organism and molecule must have a component test under
  `tests/component/`. Atoms need unit tests for formatting logic only.
- **Storybook (optional):** if enabled, every component gets a `.stories.ts`
  matching its folder.
