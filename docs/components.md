# Component Catalog

Status: Accepted
Last updated: 2026-05-14
Scope: All reusable UI components under `src/components/` and `src/views/`.

Components are organised under the **Atomic Design** methodology:
`atoms -> molecules -> organisms -> views`.

Dependency direction is **strictly bottom-up**: an atom never imports a
molecule, a molecule never imports an organism, and **only organisms and views
may call `useXxxStore()`**.

---

## Table of Contents

- Atoms
  - StatusBadge
  - HashChip
  - AmountDisplay
- Molecules
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
- Flows
  - MineBlockFlow
  - TransactionDetailFlow
- Drawers
  - UserDrawer
- Views
  - LoginView
  - RegisterView
  - ActivateView
  - WalletView
  - AdminView
  - AdminUsersView
  - AdminWalletsView
  - DashboardView
  - ChainView
  - MempoolView
  - NodesView
  - ValidationView
  - HealthView

---

## Atoms

Atoms are **pure presentational** components. They have no access to stores,
no side effects, and rely only on props and emits.

### StatusBadge

**Purpose:** displays a coloured pill indicating the health or state of an entity
(block, node, transaction, connection).

**Props:**

```ts
interface StatusBadgeProps {
  status: 'ok' | 'degraded' | 'error' | 'n/a'
}
```

**Emits:** none.

**Usage:**

```vue
<StatusBadge status="ok" />
<StatusBadge status="degraded" />
```

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
