# Component Catalog

Status: Accepted
Last updated: 2026-04-24
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
- Organisms
  - ChainList
  - MempoolTable
  - NodePanel
  - MetricsBar
  - MineButton
  - MiningChart
- Views
  - DashboardView
  - ChainView
  - MempoolView
  - NodesView
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
  status: 'ok' | 'warn' | 'error' | 'pending' | 'unknown'
  label?: string
  size?: 'sm' | 'md'
}
```

**Emits:** none.

**Usage:**

```vue
<StatusBadge status="ok" label="Connected" />
<StatusBadge status="pending" />
```

---

### HashChip

**Purpose:** renders a truncated hash (e.g. `0x4f2a...9c1b`) with click-to-copy.

**Props:**

```ts
interface HashChipProps {
  hash: string
  length?: number
  copyable?: boolean
}
```

**Emits:**

- `copied: (hash: string) => void` — fired when user clicks and copy succeeds.

**Usage:**

```vue
<HashChip :hash="block.hash" :length="8" @copied="onCopied" />
```

---

### AmountDisplay

**Purpose:** formats a `Decimal`-like string (backend precision 28,8) with
thousands separators and the currency symbol.

**Props:**

```ts
interface AmountDisplayProps {
  amount: string
  currency?: string
  precision?: number
  colorize?: boolean
}
```

**Emits:** none.

**Usage:**

```vue
<AmountDisplay :amount="tx.amount" currency="BTC" colorize />
```

---

## Molecules

Molecules compose atoms and simple PrimeVue primitives. Still no store access.

### BlockCard

**Purpose:** summary card for a single block (index, hash, tx-count, timestamp,
nonce, miner).

**Props:**

```ts
interface BlockCardProps {
  block: Block
  highlighted?: boolean
}
```

**Emits:**

- `select: (block: Block) => void` — click on the card.

**Usage:**

```vue
<BlockCard :block="block" :highlighted="block.index === chain.height"
           @select="openDetails" />
```

---

### TransactionRow

**Purpose:** single row in a transaction table (sender, recipient, amount, fee,
status).

**Props:**

```ts
interface TransactionRowProps {
  tx: Transaction
  showFee?: boolean
  confirmations?: number
}
```

**Emits:**

- `inspect: (tx: Transaction) => void`

**Usage:**

```vue
<TransactionRow v-for="tx in pending" :key="tx.id" :tx="tx"
                @inspect="showDialog" />
```

---

### NodeBadge

**Purpose:** visual representation of a peer node (URL, online/offline, last
seen).

**Props:**

```ts
interface NodeBadgeProps {
  node: Node
  compact?: boolean
}
```

**Emits:**

- `ping: (node: Node) => void`
- `remove: (node: Node) => void`

**Usage:**

```vue
<NodeBadge :node="peer" @ping="onPing" @remove="onRemove" />
```

---

### MetricTile

**Purpose:** labelled number tile used in `MetricsBar` and `HealthView`.

**Props:**

```ts
interface MetricTileProps {
  label: string
  value: number | string
  unit?: string
  trend?: 'up' | 'down' | 'flat'
  icon?: string
}
```

**Emits:** none.

**Usage:**

```vue
<MetricTile label="Mempool depth" :value="depth" unit="tx" trend="up"
            icon="pi pi-inbox" />
```

---

## Organisms

Organisms orchestrate molecules, consume Pinia stores, and handle side effects.

### ChainList

**Purpose:** vertically scrolling list of `BlockCard`s; subscribes to
`useChainStore` and auto-scrolls to newly mined blocks.

**Props:**

```ts
interface ChainListProps {
  limit?: number
  autoscroll?: boolean
}
```

**Emits:**

- `block-selected: (block: Block) => void`

**Usage:**

```vue
<ChainList :limit="100" @block-selected="openDrawer" />
```

---

### MempoolTable

**Purpose:** PrimeVue DataTable bound to `useMempoolStore.pending`, with
filters and per-row actions.

**Props:**

```ts
interface MempoolTableProps {
  pageSize?: number
  filterable?: boolean
}
```

**Emits:**

- `inspect: (tx: Transaction) => void`

**Usage:**

```vue
<MempoolTable :page-size="25" @inspect="showTxDialog" />
```

---

### NodePanel

**Purpose:** peer registry UI — list peers, add a new peer URL, trigger
consensus resolve.

**Props:** none.

**Emits:**

- `resolved: (payload: { replaced: boolean }) => void`

**Usage:**

```vue
<NodePanel @resolved="onResolve" />
```

---

### MetricsBar

**Purpose:** horizontal strip of `MetricTile`s (height, mempool depth, mining
rate, latency). Polls `useMetricsStore` every 5 s via `useIntervalFn`.

**Props:**

```ts
interface MetricsBarProps {
  compact?: boolean
}
```

**Emits:** none.

**Usage:**

```vue
<MetricsBar />
```

---

### MineButton

**Purpose:** triggers `POST /api/mine`; handles HTTP 429 by parsing
`Retry-After` and disabling itself for the remaining interval.

**Props:**

```ts
interface MineButtonProps {
  label?: string
  severity?: 'primary' | 'secondary'
}
```

**Emits:**

- `mined: (block: Block) => void`
- `rate-limited: (retryAfterSec: number) => void`

**Usage:**

```vue
<MineButton @mined="onMined" @rate-limited="flashCooldown" />
```

---

### MiningChart

**Purpose:** Chart.js line chart showing blocks mined per minute over the last
N minutes; bound to `useMetricsStore.miningRate` history.

**Props:**

```ts
interface MiningChartProps {
  windowMinutes?: number
}
```

**Emits:** none.

**Usage:**

```vue
<MiningChart :window-minutes="30" />
```

---

## Views

Views are route targets. They compose organisms and handle route params.

### DashboardView

**Route:** `/`
**Purpose:** landing page with `MetricsBar`, `MineButton`, `MiningChart`.

**Props:** none (route-level).

**Usage:** registered in `router/index.ts` as the default route.

---

### ChainView

**Route:** `/chain`
**Purpose:** full-height `ChainList` with a detail drawer on block click.

**Props:** none; reads `?block=<hash>` query param to open a drawer directly.

---

### MempoolView

**Route:** `/mempool`
**Purpose:** `MempoolTable` plus a transaction-submission form (sender,
recipient, amount, fee). Performs client-side validation via
`domain/transaction.ts -> validateTransaction`.

**Props:** none.

---

### NodesView

**Route:** `/nodes`
**Purpose:** `NodePanel` plus a sequence-style log of consensus events.

**Props:** none.

---

### HealthView

**Route:** `/health`
**Purpose:** grid of `MetricTile`s showing liveness, readiness, backend latency
percentiles (p50, p95, p99) and error rate.

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
