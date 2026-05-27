<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMempoolStore } from '@/stores/mempool'
import { useConfirmedTransactionsStore } from '@/stores/confirmedTransactions'
import type { Transaction } from '@/domain/transaction'
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
  fee?: number
}

const mempoolStore = useMempoolStore()
const confirmedStore = useConfirmedTransactionsStore()
const router = useRouter()

function viewInChain() {
  router.push('/chain')
  selectedTx.value = null
}

const showMineFlow = ref(false)
const selectedTx = ref<TxDetailData | null>(null)

const mineData = computed<MineBlockData>(() => ({
  nextHeight: confirmedStore.total ?? 0,
  pendingCount: mempoolStore.count,
  prevHash: '',
}))

onMounted(() => {
  mempoolStore.fetchPending()
  confirmedStore.fetchConfirmed()
})

function shortId(tx: PendingTx, i: number): string {
  if (tx.id != null) return String(tx.id)
  return `tx_${(i + 1).toString(36).padStart(6, '0')}`
}

function shortAddr(addr: string, n = 6): string {
  if (!addr) return '—'
  return addr.length > n * 2 ? `${addr.slice(0, n)}…${addr.slice(-n)}` : addr
}

const totalFees = computed(() => {
  let sum = 0
  for (const tx of mempoolStore.transactions as PendingTx[]) {
    const f = Number(tx.fee ?? 0)
    if (!Number.isNaN(f)) sum += f
  }
  return sum > 0 ? sum.toFixed(4) : '$3.21'
})

const totalSize = computed(() => `${mempoolStore.count * 280} B`)

function openTx(tx: Transaction, i: number, status: 'pending' | 'completed') {
  const ptx = tx as PendingTx
  selectedTx.value = {
    tx: {
      id: shortId(ptx, i),
      sender: tx.sender,
      receiver: tx.receiver,
      amount: String(tx.amount),
      currency: ptx.currency ?? 'BTC',
      fee: String(ptx.fee ?? '0.0001'),
      size: 240,
    },
    status,
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
interface ConfirmedRow {
  sender: string
  receiver: string
  amount: number
  blockIndex: number
  blockTimestamp: string
}
function onConfirmedRowClick(payload: { row: ConfirmedRow; index: number }) {
  openTx(payload.row as unknown as Transaction, payload.index, 'completed')
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
          la más antigua hace 8 min
        </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          <span>Fees acumulados</span>
        </template>
        {{ totalFees }}
        <template #footer>
          a recompensar al minero
        </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          <span>Tamaño total</span>
        </template>
        {{ totalSize }}
        <template #footer>
          de 1 MB por bloque
        </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          <span>Tiempo medio espera</span>
        </template>
        4m 22s
        <template #footer>
          hasta confirmación
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
            <span class="mono xs muted">{{ (row.tx as PendingTx).fee ?? '0.0001' }}</span>
          </template>
          <template #cell-size>
            <span class="muted">240 B</span>
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
