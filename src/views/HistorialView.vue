<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useConfirmedTransactionsStore } from '@/stores/confirmedTransactions'
import { useAuthStore } from '@/stores/auth'
import { useExchangeRatesStore } from '@/stores/exchangeRates'
import { useWalletStore } from '@/stores/wallet'
import { useChainStore } from '@/stores/chain'
import TransactionDetailFlow from '@/components/flows/TransactionDetailFlow.vue'
import type { TxDetailData } from '@/components/flows/TransactionDetailFlow.vue'
import type { ConfirmedTransaction } from '@/domain/transaction'

const router         = useRouter()
const confirmedStore = useConfirmedTransactionsStore()
const auth           = useAuthStore()
const ratesStore     = useExchangeRatesStore()
const walletStore    = useWalletStore()
const chainStore     = useChainStore()

// ── Pagination ────────────────────────────────────────────────────────────────

const PAGE_SIZE   = 10
const currentPage = ref(1)

// ── Period filter ─────────────────────────────────────────────────────────────

type PeriodKey = '1d' | '7d' | '30d' | '90d' | '180d' | 'custom'

interface PeriodOption { key: PeriodKey; label: string; days: number | null }

const PERIODS: PeriodOption[] = [
  { key: '1d',     label: 'Hoy',         days: 1   },
  { key: '7d',     label: '7 días',      days: 7   },
  { key: '30d',    label: '30 días',     days: 30  },
  { key: '90d',    label: '90 días',     days: 90  },
  { key: '180d',   label: '180 días',    days: 180 },
  { key: 'custom', label: 'Personalizado', days: null },
]

const activePeriod = ref<PeriodKey>('30d')
const customFrom   = ref('')
const customTo     = ref('')

// ── Direction + currency filters ─────────────────────────────────────────────

type Direction = 'all' | 'in' | 'out'
const activeDirection = ref<Direction>('all')
const activeCurrency  = ref('all')

const myUsername = computed(() => auth.user?.username ?? '')


// ── Raw filtered records ──────────────────────────────────────────────────────

const myRecords = computed(() =>
  confirmedStore.records.filter(
    (r) => r.sender === myUsername.value || r.receiver === myUsername.value,
  ),
)

const nowMs = Date.now()

function inPeriod(ts: string | undefined): boolean {
  if (!ts) return false
  const d = new Date(ts).getTime()
  if (activePeriod.value === 'custom') {
    const from = customFrom.value ? new Date(customFrom.value).getTime() : 0
    const to   = customTo.value   ? new Date(customTo.value).getTime() + 86_400_000 : Infinity
    return d >= from && d <= to
  }
  const opt = PERIODS.find((p) => p.key === activePeriod.value)
  const cutoff = opt?.days ? nowMs - opt.days * 86_400_000 : 0
  return d >= cutoff
}

const direction = (sender: string): 'out' | 'in' =>
  sender === myUsername.value ? 'out' : 'in'

const filtered = computed(() =>
  myRecords.value
    .filter((r) => inPeriod(r.blockTimestamp))
    .filter((r) => {
      if (activeDirection.value === 'in')  return direction(r.sender) === 'in'
      if (activeDirection.value === 'out') return direction(r.sender) === 'out'
      return true
    })
    .filter(() => activeCurrency.value === 'all' ? true : true)
    .slice()
    .sort((a, b) => new Date(b.blockTimestamp ?? 0).getTime() - new Date(a.blockTimestamp ?? 0).getTime())
)

// ── Period summary ────────────────────────────────────────────────────────────

const summary = computed(() => {
  let totalIn = 0, totalOut = 0
  for (const r of filtered.value) {
    if (direction(r.sender) === 'in') totalIn  += Number(r.amount)
    else                              totalOut += Number(r.amount)
  }
  return { count: filtered.value.length, totalIn, totalOut }
})

// ── Group by date ─────────────────────────────────────────────────────────────

interface DateGroup {
  label: string
  dateKey: string
  records: typeof filtered.value
}

function dateGroupLabel(ts: string | undefined): string {
  if (!ts) return '—'
  const d = new Date(ts)
  const today     = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const thisWeek  = new Date(today); thisWeek.setDate(today.getDate() - 6)

  d.setHours(0,0,0,0)
  if (d.getTime() === today.getTime())     return 'Hoy'
  if (d.getTime() === yesterday.getTime()) return 'Ayer'
  if (d.getTime() >= thisWeek.getTime())   return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' })
  return d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
}

function dateKey(ts: string | undefined): string {
  if (!ts) return ''
  return new Date(ts).toISOString().slice(0, 10) // YYYY-MM-DD
}

const groupedRecords = computed<DateGroup[]>(() => {
  const map = new Map<string, DateGroup>()
  for (const r of paginatedFiltered.value) {
    const key = dateKey(r.blockTimestamp)
    if (!map.has(key)) {
      map.set(key, { label: dateGroupLabel(r.blockTimestamp), dateKey: key, records: [] })
    }
    map.get(key)!.records.push(r)
  }
  return Array.from(map.values())
})

// ── Pagination ────────────────────────────────────────────────────────────────

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))

const paginatedFiltered = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

// Reset to page 1 when filters change
watch([activePeriod, activeDirection, customFrom, customTo], () => { currentPage.value = 1 })

// ── Transaction detail modal ──────────────────────────────────────────────────

const selectedTx = ref<ConfirmedTransaction | null>(null)

function openDetail(tx: ConfirmedTransaction) {
  selectedTx.value = tx
}

function closeDetail() {
  selectedTx.value = null
}

const selectedTxData = computed<TxDetailData | null>(() => {
  const tx = selectedTx.value
  if (!tx) return null

  const currency = tx.currency ?? undefined
  const amount   = Number(tx.amount)
  const usdVal   = currency ? ratesStore.usdValue(amount, currency) : null
  const fxRate   = currency ? ratesStore.rateFor(currency, 'USD') : null
  const chainHeight = chainStore.blocks.length
  const confirmations = tx.blockIndex != null && chainHeight > 0
    ? chainHeight - tx.blockIndex
    : null

  return {
    tx: {
      id:            tx.senderWalletId ? `${tx.senderWalletId.slice(0, 8)}:${tx.blockIndex}` : undefined,
      sender:        tx.sender,
      receiver:      tx.receiver,
      senderLabel:   tx.sender,
      receiverLabel: tx.receiver,
      amount:        String(tx.amount),
      currency,
      receiverAmount:   tx.receiverAmount != null ? String(tx.receiverAmount) : undefined,
      receiverCurrency: tx.receiverAmount != null && currency ? currency : undefined,
      fee:           tx.fee != null ? String(tx.fee) : undefined,
    },
    status:       'completed',
    block:        tx.blockIndex,
    confirmedAt:  tx.blockTimestamp,
    confirmations,
    amountUsd:    usdVal,
    fxRate,
  }
})

function viewInChain() {
  closeDetail()
  // Chain view is ADMIN/OPERATOR only; viewers get a soft redirect to portfolio
  if (auth.hasRole('ADMIN') || auth.hasRole('OPERATOR')) {
    router.push('/chain')
  } else {
    router.push(`/chain`)
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function displayName(username: string): string {
  if (!username) return '—'
  if (username.startsWith('TREASURY') || username.startsWith('COINBASE')) {
    return username.slice(0, 16) + (username.length > 16 ? '…' : '')
  }
  return username
}

function movementLabel(sender: string, receiver: string): string {
  return direction(sender) === 'out'
    ? `Enviado a ${displayName(receiver)}`
    : `Recibido de ${displayName(sender)}`
}

function timeStr(ts: string | undefined): string {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([
    confirmedStore.fetchConfirmed(),
    ratesStore.fetchRates(),
    walletStore.fetchMine(),
    chainStore.fetchChain(),
  ])
})
</script>

<template>
  <div class="historial-view">
    <!-- Header -->
    <div class="hist-header">
      <div>
        <h1>Historial</h1>
        <p>Todos tus movimientos confirmados en la red Cadena.</p>
      </div>
    </div>

    <!-- Filters row -->
    <div class="filters-row">
      <!-- Period chips -->
      <div class="filter-group">
        <button
          v-for="p in PERIODS"
          :key="p.key"
          class="filter-chip"
          :class="{ active: activePeriod === p.key }"
          @click="activePeriod = p.key"
        >
          {{ p.label }}
        </button>
      </div>

      <!-- Direction filter -->
      <div class="filter-group">
        <button class="filter-chip" :class="{ active: activeDirection === 'all' }" @click="activeDirection = 'all'">Todos</button>
        <button class="filter-chip" :class="{ active: activeDirection === 'in' }"  @click="activeDirection = 'in'">
          <span class="pi pi-arrow-down-left" aria-hidden="true" /> Recibidos
        </button>
        <button class="filter-chip" :class="{ active: activeDirection === 'out' }" @click="activeDirection = 'out'">
          <span class="pi pi-arrow-up-right" aria-hidden="true" /> Enviados
        </button>
      </div>
    </div>

    <!-- Custom date range -->
    <div v-if="activePeriod === 'custom'" class="custom-range">
      <label class="field-label">Desde</label>
      <input v-model="customFrom" type="date" class="date-input" />
      <label class="field-label">Hasta</label>
      <input v-model="customTo" type="date" class="date-input" />
    </div>

    <!-- Period summary -->
    <div v-if="summary.count > 0" class="summary-bar">
      <div class="summary-stat">
        <span class="summary-label">Movimientos</span>
        <span class="summary-val">{{ summary.count }}</span>
      </div>
      <div class="summary-divider" />
      <div class="summary-stat">
        <span class="summary-label">Total recibido</span>
        <span class="summary-val pos">+{{ summary.totalIn.toFixed(4) }}</span>
      </div>
      <div class="summary-divider" />
      <div class="summary-stat">
        <span class="summary-label">Total enviado</span>
        <span class="summary-val neg">−{{ summary.totalOut.toFixed(4) }}</span>
      </div>
      <div class="summary-note muted">
        Período:
        <template v-if="activePeriod === 'custom'">
          {{ customFrom || '—' }} → {{ customTo || 'hoy' }}
        </template>
        <template v-else>
          {{ PERIODS.find(p => p.key === activePeriod)?.label }}
        </template>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="confirmedStore.loading" class="empty-center">
      <span class="pi pi-spin pi-spinner" aria-hidden="true" style="font-size:22px" />
      Cargando historial…
    </div>

    <!-- Empty -->
    <div v-else-if="filtered.length === 0" class="empty-center">
      <span class="pi pi-calendar" aria-hidden="true" style="font-size:32px;opacity:.3" />
      <p>Sin movimientos en el período seleccionado.</p>
    </div>

    <!-- Grouped list -->
    <div v-else class="groups">
      <div v-for="group in groupedRecords" :key="group.dateKey" class="date-group">
        <div class="date-group-label">{{ group.label }}</div>
        <div class="movements-list panel">
          <div
            v-for="(rec, i) in group.records"
            :key="i"
            class="mv-row"
            role="button"
            tabindex="0"
            @click="openDetail(rec)"
            @keydown.enter="openDetail(rec)"
          >
            <div
              class="mv-icon"
              :class="direction(rec.sender) === 'out' ? 'mv-out' : 'mv-in'"
            >
              <span
                :class="direction(rec.sender) === 'out'
                  ? 'pi pi-arrow-up-right'
                  : 'pi pi-arrow-down-left'"
                aria-hidden="true"
              />
            </div>

            <div class="mv-info">
              <span class="mv-label">{{ movementLabel(rec.sender, rec.receiver) }}</span>
              <span class="mv-meta muted">
                Bloque #{{ rec.blockIndex ?? '—' }}
                <span class="dot">·</span>
                {{ timeStr(rec.blockTimestamp) }}
              </span>
            </div>

            <div class="mv-right">
              <span
                class="mv-amount mono"
                :class="direction(rec.sender) === 'out' ? 'neg' : 'pos'"
              >
                {{ direction(rec.sender) === 'out' ? '−' : '+' }}{{ rec.amount }}
              </span>
              <span class="pi pi-chevron-right mv-chevron muted" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="filtered.length > PAGE_SIZE" class="pagination">
      <span class="page-info muted">
        {{ (currentPage - 1) * PAGE_SIZE + 1 }}–{{ Math.min(currentPage * PAGE_SIZE, filtered.length) }}
        de {{ filtered.length }} movimientos
      </span>
      <div class="page-controls">
        <button
          class="page-btn"
          :disabled="currentPage === 1"
          @click="currentPage = 1"
          aria-label="Primera página"
        >
          <span class="pi pi-angle-double-left" aria-hidden="true" />
        </button>
        <button
          class="page-btn"
          :disabled="currentPage === 1"
          @click="currentPage--"
          aria-label="Página anterior"
        >
          <span class="pi pi-angle-left" aria-hidden="true" />
        </button>
        <button
          v-for="p in totalPages <= 7
            ? Array.from({ length: totalPages }, (_, i) => i + 1)
            : [1, 2, currentPage - 1, currentPage, currentPage + 1, totalPages - 1, totalPages]
              .filter((n, idx, arr) => n >= 1 && n <= totalPages && arr.indexOf(n) === idx)
              .sort((a, b) => a - b)"
          :key="p"
          class="page-btn"
          :class="{ 'page-btn-active': p === currentPage }"
          @click="currentPage = p"
        >
          {{ p }}
        </button>
        <button
          class="page-btn"
          :disabled="currentPage === totalPages"
          @click="currentPage++"
          aria-label="Página siguiente"
        >
          <span class="pi pi-angle-right" aria-hidden="true" />
        </button>
        <button
          class="page-btn"
          :disabled="currentPage === totalPages"
          @click="currentPage = totalPages"
          aria-label="Última página"
        >
          <span class="pi pi-angle-double-right" aria-hidden="true" />
        </button>
      </div>
      <div class="rows-per-page muted" style="font-size:11.5px">
        {{ PAGE_SIZE }} filas por página
      </div>
    </div>
  </div>

  <!-- Transaction detail modal -->
  <TransactionDetailFlow
    v-if="selectedTx && selectedTxData"
    :data="selectedTxData"
    @close="closeDetail"
    @view-in-chain="viewInChain"
  />
</template>

<style scoped>
.historial-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

/* Header */
.hist-header h1 {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.015em;
  margin: 0 0 2px;
  color: var(--text);
}
.hist-header p {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
}

/* Filters */
.filters-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}
.filter-group {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.filter-chip {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 5px 13px;
  font-size: 12.5px;
  color: var(--text-2);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.12s;
  white-space: nowrap;
}
.filter-chip:hover { border-color: var(--accent); color: var(--text); }
.filter-chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  font-weight: 600;
}

/* Custom range */
.custom-range {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}
.field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.date-input {
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  font-size: 13px;
  font-family: var(--font-sans);
  outline: none;
}
.date-input:focus { border-color: var(--accent); }

/* Summary bar */
.summary-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  flex-wrap: wrap;
}
.summary-stat {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.summary-label { font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.04em; }
.summary-val { font-size: 15px; font-weight: 600; color: var(--text); font-variant-numeric: tabular-nums; }
.summary-divider { width: 1px; height: 28px; background: var(--border); flex-shrink: 0; }
.summary-note { font-size: 12px; margin-left: auto; }

/* Groups */
.groups { display: flex; flex-direction: column; gap: 18px; }

.date-group { display: flex; flex-direction: column; gap: 6px; }
.date-group-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0 2px;
}

/* Movements */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.movements-list { display: flex; flex-direction: column; }
.mv-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 16px;
  border-bottom: 1px solid var(--border);
  transition: background 0.1s;
  cursor: pointer;
  outline: none;
}
.mv-row:last-child { border-bottom: none; }
.mv-row:hover { background: var(--surface-2); }
.mv-row:focus-visible { box-shadow: inset 0 0 0 2px var(--accent); }

.mv-icon {
  width: 32px; height: 32px; border-radius: 50%;
  display: grid; place-items: center; font-size: 12px; flex-shrink: 0;
}
.mv-out {
  background: color-mix(in srgb, var(--danger) 12%, transparent);
  color: var(--danger);
}
.mv-in {
  background: color-mix(in srgb, var(--success) 12%, transparent);
  color: var(--success);
}

.mv-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.mv-label {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mv-meta { font-size: 11.5px; display: flex; align-items: center; gap: 4px; }
.dot { opacity: 0.4; }

.mv-right {
  flex-shrink: 0;
  text-align: right;
  display: flex;
  align-items: center;
  gap: 8px;
}
.mv-amount { font-size: 13.5px; font-weight: 600; font-variant-numeric: tabular-nums; }
.mv-chevron { font-size: 10px; opacity: 0.4; }

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 0;
}
.page-info { font-size: 12.5px; }
.page-controls { display: flex; gap: 3px; align-items: center; }
.page-btn {
  min-width: 32px; height: 32px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-2);
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 0 6px;
  transition: all 0.12s;
}
.page-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-btn-active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  font-weight: 600;
}

/* States */
.empty-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 56px 24px;
  color: var(--text-2);
  font-size: 14px;
}

/* Utils */
.mono { font-family: var(--font-mono); }
.muted { color: var(--text-3); }
.pos { color: var(--success); }
.neg { color: var(--danger); }
</style>
