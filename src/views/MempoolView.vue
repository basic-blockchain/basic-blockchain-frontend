<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMempoolStore } from '@/stores/mempool'
import { useConfirmedTransactionsStore } from '@/stores/confirmedTransactions'
import { useAuthStore } from '@/stores/auth'
import type { Transaction } from '@/domain/transaction'
import { listAllWallets } from '@/api/admin'
import { myWallets } from '@/api/wallets'
import MineBlockFlow, { type MineBlockData } from '@/components/flows/MineBlockFlow.vue'
import TransactionDetailFlow, {
  type TxDetailData,
} from '@/components/flows/TransactionDetailFlow.vue'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import PaginatedTable from '@/components/organisms/PaginatedTable.vue'

interface PendingTx extends Transaction {
  id?: string | number
  currency?: string
  // The Transaction model already exposes `fee` (post BR-TX-10); this
  // alias allows callers that still pass `PendingTx`-shaped objects
  // (older fixtures, stores not yet typed to the new model) to keep
  // working without losing the real value.
  fee?: number
}

const mempoolStore = useMempoolStore()
const confirmedStore = useConfirmedTransactionsStore()
const auth = useAuthStore()
const router = useRouter()

// Wallet resolution maps. The transaction model carries wallet IDs
// (post BR-TX-09) but no currency — currency lives on the wallet. We
// hydrate these maps from `/admin/wallets` when the caller's role
// allows it (ADMIN / OPERATOR hold VIEW_WALLETS), and fall back to
// `/wallets/me` for VIEWER so at least the caller's own counterparty
// rows resolve. Unknown wallet IDs leave the modal showing
// "unidad desconocida" — honest, per the no-lying-defaults rule.
const walletIdToCurrency = ref<Record<string, string>>({})
const walletIdToUsername = ref<Record<string, string>>({})
const walletIdToType = ref<Record<string, string>>({})

async function loadWalletIndex() {
  try {
    if (auth.hasRole('ADMIN') || auth.hasRole('OPERATOR')) {
      const res = await listAllWallets()
      const c: Record<string, string> = {}
      const u: Record<string, string> = {}
      const t: Record<string, string> = {}
      for (const w of res.wallets) {
        c[w.wallet_id] = w.currency
        u[w.wallet_id] = w.username
        t[w.wallet_id] = w.wallet_type
      }
      walletIdToCurrency.value = c
      walletIdToUsername.value = u
      walletIdToType.value = t
      return
    }
    if (auth.isAuthenticated) {
      const res = await myWallets()
      const c: Record<string, string> = {}
      for (const w of res.wallets) {
        c[w.wallet_id] = w.currency
      }
      walletIdToCurrency.value = c
      // /wallets/me does not carry username/wallet_type — that's
      // fine, the modal falls back to the tx's existing labels.
    }
  } catch {
    // Resolution is best-effort: the modal still works without it,
    // just with "—" / "unidad desconocida" in the gaps.
  }
}

function roleFromType(walletType: string | undefined): string | undefined {
  if (!walletType) return undefined
  if (walletType === 'TREASURY') return 'Tesorería'
  if (walletType === 'USER') return 'Usuario'
  if (walletType === 'FEE_COLLECTOR') return 'Recolector'
  return walletType
}

function resolveCurrency(walletId: string | undefined): string | undefined {
  if (!walletId) return undefined
  return walletIdToCurrency.value[walletId]
}

function resolveLabel(walletId: string | undefined, fallback: string): string {
  if (walletId && walletIdToUsername.value[walletId]) {
    return walletIdToUsername.value[walletId]
  }
  return fallback
}

function resolveRole(walletId: string | undefined): string | undefined {
  if (!walletId) return undefined
  return roleFromType(walletIdToType.value[walletId])
}

// Chain height = highest blockIndex we've seen confirmed, used to
// derive a "Confirmaciones" count for the detail modal.
const chainHeight = computed<number | null>(() => {
  let max = -1
  for (const r of confirmedStore.records) {
    if (r.blockIndex != null && r.blockIndex > max) max = r.blockIndex
  }
  return max >= 0 ? max : null
})

function confirmationsFor(blockIndex: number | undefined): number | null {
  if (blockIndex == null || chainHeight.value === null) return null
  return Math.max(0, chainHeight.value - blockIndex + 1)
}

function viewInChain() {
  const block = selectedTx.value?.block
  router.push(block != null ? { path: '/chain', query: { block: String(block) } } : '/chain')
  selectedTx.value = null
}

const showMineFlow = ref(false)
const selectedTx = ref<TxDetailData | null>(null)

const mineData = computed<MineBlockData>(() => ({
  nextHeight: confirmedStore.total ?? 0,
  pendingCount: mempoolStore.count,
  prevHash: '',
}))

onMounted(async () => {
  await Promise.all([
    mempoolStore.fetchPending(),
    confirmedStore.fetchConfirmed(),
    loadWalletIndex(),
  ])
})

function shortId(tx: PendingTx, i: number): string {
  if (tx.id != null) return String(tx.id)
  return `tx_${(i + 1).toString(36).padStart(6, '0')}`
}

function shortAddr(addr: string, n = 6): string {
  if (!addr) return '—'
  return addr.length > n * 2 ? `${addr.slice(0, n)}…${addr.slice(-n)}` : addr
}

/** Count of pending transactions that carry a non-zero fee. Replaces
 * the previous "fees acumulados" KPI that summed raw fee amounts —
 * a misleading aggregate when transactions span multiple currencies
 * (BR-TX-10: fees are always denominated in the sender's currency).
 * The honest answer for a multi-currency mempool is a count, not a
 * cross-currency sum; per-currency breakdowns can ship as a follow-up. */
const txsWithFee = computed(() => {
  let n = 0
  for (const tx of mempoolStore.transactions as PendingTx[]) {
    const f = Number(tx.fee ?? 0)
    if (!Number.isNaN(f) && f > 0) n += 1
  }
  return n
})

/** Approximate mempool byte size from the JSON-serialised transactions
 * themselves. The simulator does not yet persist a real size column on
 * `Transaction`, so this is the best deterministic approximation we
 * can give the operator until that backend field exists. */
const totalSize = computed(() => {
  let bytes = 0
  for (const tx of mempoolStore.transactions) {
    bytes += JSON.stringify(tx).length
  }
  return `${bytes} B`
})

function feeText(tx: PendingTx): string {
  const f = Number(tx.fee ?? 0)
  return Number.isFinite(f) && f > 0 ? String(f) : '—'
}

function txSize(tx: Transaction): number {
  return JSON.stringify(tx).length
}

interface OpenTxBlockInfo {
  blockIndex?: number
  blockTimestamp?: string
}

function openTx(
  tx: Transaction,
  i: number,
  status: 'pending' | 'completed',
  block: OpenTxBlockInfo = {},
) {
  const ptx = tx as PendingTx
  const fee = Number(tx.fee ?? ptx.fee ?? 0)
  // BR-WL-11 + BR-TX-09: resolve currency / username / role through
  // wallet_id, which is the authoritative key shared with
  // `/admin/wallets`. Sender side first; receiver as fallback for
  // coinbase-style rows whose sender wallet is not in the index.
  const senderCurrency = resolveCurrency(tx.senderWalletId)
  const receiverCurrency = resolveCurrency(tx.receiverWalletId)
  const currency = senderCurrency ?? receiverCurrency
  const crossCurrency =
    senderCurrency !== undefined &&
    receiverCurrency !== undefined &&
    senderCurrency !== receiverCurrency
  selectedTx.value = {
    tx: {
      id: shortId(ptx, i),
      sender: tx.sender,
      receiver: tx.receiver,
      senderLabel: resolveLabel(tx.senderWalletId, tx.sender),
      receiverLabel: resolveLabel(tx.receiverWalletId, tx.receiver),
      senderRole: resolveRole(tx.senderWalletId),
      receiverRole: resolveRole(tx.receiverWalletId),
      amount: String(tx.amount),
      // Real currency when we can resolve it; left undefined
      // otherwise so the modal renders "unidad desconocida" rather
      // than lie with a default.
      currency,
      receiverAmount:
        crossCurrency && tx.receiverAmount != null
          ? String(tx.receiverAmount)
          : undefined,
      receiverCurrency: crossCurrency ? receiverCurrency : undefined,
      fee: fee > 0 ? String(fee) : undefined,
      size: txSize(tx),
    },
    status,
    block: block.blockIndex,
    confirmedAt: block.blockTimestamp,
    confirmations: confirmationsFor(block.blockIndex),
  }
}

interface PendingRow {
  tx: Transaction
  index: number
}
const pendingRows = computed<PendingRow[]>(() =>
  mempoolStore.transactions.map((tx, index) => ({ tx, index }))
)

interface PendingColumn {
  key: string
  label: string
  num?: boolean
}
const pendingColumns: PendingColumn[] = [
  { key: 'hash', label: 'TX hash' },
  { key: 'route', label: 'De → Para' },
  { key: 'amount', label: 'Monto', num: true },
  { key: 'fee', label: 'Fee', num: true },
  { key: 'size', label: 'Tamaño', num: true },
  { key: 'status', label: 'Esperando' },
]

interface ConfirmedColumn {
  key: string
  label: string
  num?: boolean
}
const confirmedColumns: ConfirmedColumn[] = [
  { key: 'block', label: 'Bloque' },
  { key: 'sender', label: 'De' },
  { key: 'receiver', label: 'Para' },
  { key: 'amount', label: 'Monto', num: true },
  { key: 'when', label: 'Confirmado' },
]

function onPendingRowClick(payload: { row: PendingRow }) {
  openTx(payload.row.tx, payload.row.index, 'pending')
}
interface ConfirmedRow extends Transaction {
  blockIndex: number
  blockTimestamp: string
}
function onConfirmedRowClick(payload: { row: ConfirmedRow; index: number }) {
  // BR-TX-09 confirmed rows carry block + timestamp; thread them
  // through so the detail modal can render the "Confirmada en Bloque
  // #N" header and the per-row Confirmaciones count.
  openTx(payload.row, payload.index, 'completed', {
    blockIndex: payload.row.blockIndex,
    blockTimestamp: payload.row.blockTimestamp,
  })
}
function pendingRowKey(r: PendingRow): string {
  return `${r.index}-${r.tx.sender}`
}
function confirmedRowKey(r: ConfirmedRow): string {
  return `${r.blockIndex}-${r.sender}-${r.receiver}`
}
</script>

<template>
  <div class="mempool-view">
    <div class="page-h">
      <div>
        <h1>Mempool</h1>
        <p>Transacciones pendientes de confirmación · se incluyen en el próximo bloque.</p>
      </div>
      <div class="page-actions">
        <BaseButton
          variant="ghost"
          size="sm"
          @click="mempoolStore.fetchPending()"
        >
          Refrescar
        </BaseButton>
        <BaseButton
          variant="primary"
          size="sm"
          @click="showMineFlow = true"
        >
          Minar ahora
        </BaseButton>
      </div>
    </div>

    <div class="bigstat-row">
      <BaseCard variant="bigstat">
        <template #header>
          <span>Pendientes</span>
        </template>
        {{ mempoolStore.count }}
        <template #footer>
          en cola para el próximo bloque
        </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          <span>Operaciones con fee</span>
        </template>
        {{ txsWithFee }}
        <template #footer>
          aportan al recolector de fees
        </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          <span>Tamaño total</span>
        </template>
        {{ totalSize }}
        <template #footer>
          aproximado por JSON serializado
        </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          <span>Tiempo medio espera</span>
        </template>
        —
        <template #footer>
          sin telemetría aún
        </template>
      </BaseCard>
    </div>

    <div
      v-if="mempoolStore.loading"
      class="loading-wrap"
    >
      <div class="spinner" />
    </div>

    <section>
      <div class="section-h">
        Transacciones pendientes ({{ mempoolStore.count }})
      </div>
      <BaseCard
        variant="default"
        padding="none"
      >
        <PaginatedTable
          :columns="pendingColumns"
          :rows="pendingRows"
          :row-key="pendingRowKey"
          @row-click="onPendingRowClick"
        >
          <template #cell-hash="{ row }">
            <span class="mono xs">{{ shortId(row.tx as PendingTx, row.index) }}</span>
          </template>
          <template #cell-route="{ row }">
            <span class="mono xs">{{ shortAddr(row.tx.sender) }} → {{ shortAddr(row.tx.receiver) }}</span>
          </template>
          <template #cell-amount="{ row }">
            <span class="mono">{{ row.tx.amount }}</span>
          </template>
          <template #cell-fee="{ row }">
            <span class="mono xs muted">{{ feeText(row.tx as PendingTx) }}</span>
          </template>
          <template #cell-size="{ row }">
            <span class="muted">{{ txSize(row.tx) }} B</span>
          </template>
          <template #cell-status>
            <BaseBadge tone="warning">
              En mempool
            </BaseBadge>
          </template>
          <template #row-actions="{ row }">
            <BaseButton
              variant="ghost"
              size="sm"
              icon-only
              aria-label="Ver detalle"
              @click="openTx(row.tx, row.index, 'pending')"
            >
              <span class="pi pi-external-link" />
            </BaseButton>
          </template>
          <template #empty>
            No hay transacciones pendientes en el mempool
          </template>
        </PaginatedTable>
      </BaseCard>
    </section>

    <section>
      <div class="section-h">
        Confirmadas recientemente
      </div>
      <BaseCard
        variant="default"
        padding="none"
      >
        <PaginatedTable
          :columns="confirmedColumns"
          :rows="confirmedStore.records"
          :row-key="confirmedRowKey"
          @row-click="onConfirmedRowClick"
        >
          <template #cell-block="{ row }">
            <span class="mono">#{{ row.blockIndex ?? '—' }}</span>
          </template>
          <template #cell-sender="{ row }">
            <span class="mono xs">{{ shortAddr(row.sender) }}</span>
          </template>
          <template #cell-receiver="{ row }">
            <span class="mono xs">{{ shortAddr(row.receiver) }}</span>
          </template>
          <template #cell-amount="{ row }">
            <span class="mono">{{ row.amount }}</span>
          </template>
          <template #cell-when="{ row }">
            <span class="muted xs">{{ row.blockTimestamp ?? '—' }}</span>
          </template>
          <template #empty>
            Aún no hay transacciones confirmadas.
          </template>
        </PaginatedTable>
      </BaseCard>
    </section>

    <MineBlockFlow
      v-if="showMineFlow"
      :data="mineData"
      @close="showMineFlow = false"
      @complete="mempoolStore.fetchPending()"
    />
    <TransactionDetailFlow
      v-if="selectedTx"
      :data="selectedTx"
      @close="selectedTx = null"
      @view-in-chain="viewInChain"
    />
  </div>
</template>

<style scoped>
.mempool-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.page-h {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}
.page-h h1 {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.015em;
  margin: 0 0 2px;
  color: var(--text);
}
.page-h p {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
}
.page-actions {
  display: flex;
  gap: 8px;
}
.bigstat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.section-h {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
}
.xs {
  font-size: 11.5px;
}
.muted {
  color: var(--text-3);
}
.mono {
  font-family: var(--font-mono);
}
.loading-wrap {
  display: grid;
  place-items: center;
  padding: 40px;
}
@media (max-width: 900px) {
  .bigstat-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
