<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useMempoolStore } from '@/stores/mempool'
import { useConfirmedTransactionsStore } from '@/stores/confirmedTransactions'
import type { Transaction } from '@/domain/transaction'
import MineBlockFlow, { type MineBlockData } from '@/components/flows/MineBlockFlow.vue'
import TransactionDetailFlow, { type TxDetailData } from '@/components/flows/TransactionDetailFlow.vue'

interface PendingTx extends Transaction {
  id?: string | number
  currency?: string
  fee?: number
}

const mempoolStore = useMempoolStore()
const confirmedStore = useConfirmedTransactionsStore()

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
</script>

<template>
  <div class="mempool-view">
    <div class="page-h">
      <div>
        <h1>Mempool</h1>
        <p>Transacciones pendientes de confirmación · se incluyen en el próximo bloque.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-sm" @click="mempoolStore.fetchPending()">
          <i class="pi pi-refresh" />
          <span>Refrescar</span>
        </button>
        <button class="btn btn-sm btn-primary" @click="showMineFlow = true">
          <span>⛏</span>
          <span>Minar ahora</span>
        </button>
      </div>
    </div>

    <div class="bigstat-row">
      <div class="bigstat">
        <div class="lb">Pendientes</div>
        <div class="vl">{{ mempoolStore.count }}</div>
        <div class="ds">la más antigua hace 8 min</div>
      </div>
      <div class="bigstat">
        <div class="lb">Fees acumulados</div>
        <div class="vl">{{ totalFees }}</div>
        <div class="ds">a recompensar al minero</div>
      </div>
      <div class="bigstat">
        <div class="lb">Tamaño total</div>
        <div class="vl">{{ totalSize }}</div>
        <div class="ds">de 1 MB por bloque</div>
      </div>
      <div class="bigstat">
        <div class="lb">Tiempo medio espera</div>
        <div class="vl">4m 22s</div>
        <div class="ds">hasta confirmación</div>
      </div>
    </div>

    <div v-if="mempoolStore.loading" class="loading-wrap">
      <div class="spinner" />
    </div>

    <section>
      <div class="section-h">Transacciones pendientes ({{ mempoolStore.count }})</div>
      <div class="flow-card">
        <div v-if="mempoolStore.count === 0" class="empty muted">
          No hay transacciones pendientes en el mempool
        </div>
        <table v-else class="tbl">
          <thead>
            <tr>
              <th>TX hash</th>
              <th>De → Para</th>
              <th class="num">Monto</th>
              <th class="num">Fee</th>
              <th class="num">Tamaño</th>
              <th>Esperando</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(tx, i) in mempoolStore.transactions"
              :key="i"
              class="row-click"
              @click="openTx(tx, i, 'pending')"
            >
              <td class="mono xs">{{ shortId(tx as PendingTx, i) }}</td>
              <td class="mono xs">{{ shortAddr(tx.sender) }} → {{ shortAddr(tx.receiver) }}</td>
              <td class="num mono">{{ tx.amount }}</td>
              <td class="num mono xs muted">{{ (tx as PendingTx).fee ?? '0.0001' }}</td>
              <td class="num muted">240 B</td>
              <td><span class="bdg bdg-pending_kyc">En mempool</span></td>
              <td>
                <button class="btn btn-icon btn-sm" @click.stop="openTx(tx, i, 'pending')">
                  <i class="pi pi-external-link" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <div class="section-h">Confirmadas recientemente</div>
      <div class="flow-card">
        <div v-if="confirmedStore.total === 0" class="empty muted">
          Aún no hay transacciones confirmadas.
        </div>
        <table v-else class="tbl">
          <thead>
            <tr>
              <th>Bloque</th>
              <th>De</th>
              <th>Para</th>
              <th class="num">Monto</th>
              <th>Confirmado</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(rec, i) in confirmedStore.records"
              :key="i"
              class="row-click"
              @click="openTx(rec, i, 'completed')"
            >
              <td class="mono">#{{ rec.blockIndex ?? rec.block_index ?? '—' }}</td>
              <td class="mono xs">{{ shortAddr(rec.sender) }}</td>
              <td class="mono xs">{{ shortAddr(rec.receiver) }}</td>
              <td class="num mono">{{ rec.amount }}</td>
              <td class="muted xs">{{ rec.blockTimestamp ?? rec.block_timestamp ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
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
.bigstat {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
}
.lb {
  font-size: 11.5px;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.vl {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 4px 0;
  color: var(--text);
}
.ds {
  font-size: 11.5px;
  color: var(--text-3);
}
.section-h {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
}
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.tbl th,
.tbl td {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
.tbl tr:last-child td {
  border-bottom: none;
}
.tbl th.num,
.tbl td.num {
  text-align: right;
}
.row-click {
  cursor: pointer;
}
.row-click:hover {
  background: var(--surface-2);
}
.xs {
  font-size: 11.5px;
}
.empty {
  padding: 40px;
  text-align: center;
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
