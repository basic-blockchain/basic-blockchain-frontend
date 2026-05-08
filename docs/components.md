# Component Catalog

Status: Accepted
Last updated: 2026-05-08
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

**Props:** none.

---

### AdminWalletsView

**Route:** `/admin/wallets`
**Purpose:** list all wallets and freeze/unfreeze (ADMIN only).

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
**Purpose:** mining time chart plus full chain list.

**Props:** none.

---

### MempoolView

**Route:** `/mempool`
**Purpose:** pending mempool table plus confirmed history (loaded from
`GET /api/v1/transactions`).

**Props:** none.

---

### NodesView

**Route:** `/nodes`
**Purpose:** `NodePanel` for peer registration and consensus resolve.

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
