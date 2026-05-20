<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getConfirmed, getPending } from '@/api/mempool'
import type { ConfirmedTransaction, Transaction } from '@/domain/transaction'
import { listAllWallets, listExchangeRates } from '@/api/admin'
import { useToast } from 'primevue/usetoast'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import PaginatedTable from '@/components/organisms/PaginatedTable.vue'

const QUOTE = 'USDT'

const toast = useToast()
const confirmed = ref<ConfirmedTransaction[]>([])
const pending = ref<Transaction[]>([])
const loading = ref(false)
const searchQuery = ref('')
const activeTab = ref<'all' | 'pending' | 'confirmed'>('all')

// Phase 6j — currency / rate lookups so the table can show USD per
// row. Transactions ship only sender/receiver public keys + native
// amount; we resolve currency via the wallet store and apply the
// current X/<QUOTE> rate (rate-as-of-now, because pending mempool
// rows have no confirmed_at to anchor against).
const pubkeyToCurrency = ref<Record<string, string>>({})
const rateByCurrency = ref<Record<string, number>>({})

const stats = computed(() => ({
  total: confirmed.value.length + pending.value.length,
  pending: pending.value.length,
  confirmed: confirmed.value.length,
}))

async function load() {
  loading.value = true
  try {
    const [conf, pend, walletsRes, ratesRes] = await Promise.all([
      getConfirmed(),
      getPending(),
      listAllWallets(),
      listExchangeRates({ to: QUOTE, limit: 200 }),
    ])
    confirmed.value = conf.transactions
    pending.value = pend.transactions

    const pkMap: Record<string, string> = {}
    for (const w of walletsRes.wallets) pkMap[w.public_key] = w.currency
    pubkeyToCurrency.value = pkMap

    // Keep only the freshest row per from_currency (the rates endpoint
    // returns history). Latest-wins so an operator's manual override
    // takes precedence over a stale BOOTSTRAP_SEED row.
    const rates: Record<string, number> = {}
    for (const r of ratesRes.rates) {
      if (r.to_currency !== QUOTE) continue
      if (rates[r.from_currency] === undefined) {
        rates[r.from_currency] = Number(r.rate)
      }
    }
    // Quote-vs-quote is implicit 1:1 — set it so $USDT amounts pass through.
    rates[QUOTE] = 1
    rateByCurrency.value = rates
  } catch (e: unknown) {
    toast.add({ severity: 'error', summary: 'Error al cargar', detail: String(e), life: 4000 })
  } finally {
    loading.value = false
  }
}

interface Row {
  sender: string
  receiver: string
  amount: number
  currency: string | null
  amountUsd: number | null
  status: 'completed' | 'pending'
  blockIndex?: number
  timestamp?: string
}

interface MovementColumn {
  key: string
  label: string
  num?: boolean
}

const movementColumns: MovementColumn[] = [
  { key: 'type', label: 'Tipo' },
  { key: 'sender', label: 'De' },
  { key: 'receiver', label: 'Para' },
  { key: 'amount', label: 'Monto', num: true },
  { key: 'usd', label: 'USD', num: true },
  { key: 'status', label: 'Estado' },
  { key: 'when', label: 'Bloque / Cuando' },
]

function rowFromTx(
  t: Transaction & { blockIndex?: number; blockTimestamp?: string },
  status: 'completed' | 'pending'
): Row {
  // Sender first — owner side carries the source currency; receiver
  // is the fallback (mint/coinbase rows have an empty sender wallet).
  const currency = pubkeyToCurrency.value[t.sender] ?? pubkeyToCurrency.value[t.receiver] ?? null
  let amountUsd: number | null = null
  if (currency && rateByCurrency.value[currency] !== undefined) {
    const rate = rateByCurrency.value[currency]
    if (Number.isFinite(rate)) amountUsd = t.amount * rate
  }
  return {
    sender: t.sender,
    receiver: t.receiver,
    amount: t.amount,
    currency,
    amountUsd,
    status,
    blockIndex: t.blockIndex,
    timestamp: t.blockTimestamp,
  }
}

const rows = computed<Row[]>(() => {
  const c: Row[] = confirmed.value.map((t) => rowFromTx(t, 'completed'))
  const p: Row[] = pending.value.map((t) => rowFromTx(t, 'pending'))
  const all = [...p, ...c]
  const q = searchQuery.value.toLowerCase()
  const filtered = q
    ? all.filter((r) => r.sender.toLowerCase().includes(q) || r.receiver.toLowerCase().includes(q))
    : all
  if (activeTab.value === 'pending') return filtered.filter((r) => r.status === 'pending')
  if (activeTab.value === 'confirmed') return filtered.filter((r) => r.status === 'completed')
  return filtered
})

function truncate(s: string, n = 16): string {
  return s.length > n ? `${s.slice(0, n / 2)}…${s.slice(-4)}` : s
}

function fmtUsd(value: number | null): string {
  if (value === null) return '—'
  return `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function statusTone(status: Row['status']): 'success' | 'warning' {
  return status === 'completed' ? 'success' : 'warning'
}

onMounted(load)
</script>

<template>
  <div class="movements-view">
    <div class="page-h">
      <div>
        <h1>Movimientos</h1>
        <p>Historial consolidado · transacciones confirmadas y pendientes en la plataforma.</p>
      </div>
      <div class="page-h-actions">
        <BaseButton variant="ghost" size="sm" :loading="loading" @click="load">
          <template #leading>
            <span class="pi pi-refresh" :class="{ 'pi-spin': loading }" aria-hidden="true" />
          </template>
          Actualizar
        </BaseButton>
      </div>
    </div>

    <!-- Big stats -->
    <div class="bigstat-row">
      <BaseCard variant="bigstat">
        <template #header>
          <span>Operaciones totales</span>
        </template>
        {{ stats.total.toLocaleString('es-AR') }}
        <template #footer> Confirmadas + pendientes </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          <span>Confirmadas</span>
        </template>
        <span class="kpi-success">{{ stats.confirmed.toLocaleString('es-AR') }}</span>
        <template #footer> En bloques minados </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          <span>Pendientes</span>
        </template>
        <span :class="{ 'kpi-warning': stats.pending > 0 }">{{ stats.pending }}</span>
        <template #footer> En mempool </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          <span>Mostrando</span>
        </template>
        {{ rows.length }}
        <template #footer> Con filtros actuales </template>
      </BaseCard>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="tabstrip-inline">
        <button
          v-for="t in [
            { key: 'all', label: 'Todos' },
            { key: 'confirmed', label: 'Confirmados' },
            { key: 'pending', label: 'Pendientes' },
          ]"
          :key="t.key"
          class="tab-btn"
          :class="{ active: activeTab === t.key }"
          @click="activeTab = t.key as 'all' | 'pending' | 'confirmed'"
        >
          {{ t.label }}
        </button>
      </div>
      <div class="toolbar-search">
        <span class="pi pi-search" aria-hidden="true" />
        <input v-model="searchQuery" placeholder="Buscar por sender, receiver o hash…" />
      </div>
    </div>

    <!-- Table -->
    <div v-if="loading" class="loading-row">
      <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
    </div>
    <BaseCard v-else class="table-panel" variant="default" padding="none">
      <PaginatedTable :columns="movementColumns" :rows="rows">
        <template #cell-type="{ row }">
          <div class="mv-type">
            <span
              class="mv-ic"
              :class="row.status === 'completed' ? 'mv-buy' : 'mv-pending'"
              aria-hidden="true"
            >
              <span
                class="pi"
                :class="row.status === 'completed' ? 'pi-arrow-right' : 'pi-clock'"
              />
            </span>
            {{ row.status === 'completed' ? 'Transferencia' : 'Pendiente' }}
          </div>
        </template>
        <template #cell-sender="{ row }">
          <span class="mono cell-addr">{{ truncate(row.sender) }}</span>
        </template>
        <template #cell-receiver="{ row }">
          <span class="mono cell-addr">{{ truncate(row.receiver) }}</span>
        </template>
        <template #cell-amount="{ row }">
          <span class="mono">
            {{ row.amount.toLocaleString('es-AR', { maximumFractionDigits: 8 }) }}
            <span v-if="row.currency" class="cell-currency">{{ row.currency }}</span>
          </span>
        </template>
        <template #cell-usd="{ row }">
          <span class="mono usd-cell">
            <template v-if="row.amountUsd !== null">{{ fmtUsd(row.amountUsd) }}</template>
            <span v-else class="usd-missing" title="Sin tasa FX para esta moneda">—</span>
          </span>
        </template>
        <template #cell-status="{ row }">
          <BaseBadge :tone="statusTone(row.status)">
            {{ row.status === 'completed' ? 'Confirmado' : 'Pendiente' }}
          </BaseBadge>
        </template>
        <template #cell-when="{ row }">
          <span class="text-dim mono">
            <template v-if="row.blockIndex != null">Bloque #{{ row.blockIndex }}</template>
            <template v-else-if="row.timestamp">{{ row.timestamp }}</template>
            <template v-else>—</template>
          </span>
        </template>
        <template #empty> Sin movimientos. </template>
      </PaginatedTable>
    </BaseCard>
  </div>
</template>

<style scoped>
.movements-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
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
.page-h-actions {
  display: flex;
  gap: 8px;
}

/* Big stats */
.bigstat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.kpi-success {
  color: var(--success);
}
.kpi-warning {
  color: var(--warning);
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tabstrip-inline {
  display: flex;
  gap: 2px;
}
.tab-btn {
  padding: 6px 12px;
  font-size: 12.5px;
  font-weight: 500;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text-2);
  cursor: pointer;
  font-family: var(--font-sans);
  transition:
    background 0.12s,
    color 0.12s;
}
.tab-btn:hover {
  background: var(--hover);
  color: var(--text);
}
.tab-btn.active {
  background: var(--text);
  color: var(--bg);
  border-color: var(--text);
}

.toolbar-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 7px 10px;
  flex: 1;
  min-width: 200px;
  color: var(--text-3);
  font-size: 12.5px;
}
.toolbar-search input {
  border: 0;
  outline: 0;
  background: transparent;
  flex: 1;
  font: inherit;
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 13px;
}
.toolbar-search input::placeholder {
  color: var(--text-3);
}
.toolbar-search .pi {
  font-size: 12px;
  flex-shrink: 0;
}

.loading-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
  font-size: 13px;
  padding: 16px;
}

/* Table */
.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
.text-dim {
  color: var(--text-3);
}
.cell-addr {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cell-currency {
  margin-left: 4px;
  font-size: 10.5px;
  font-weight: 500;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.usd-cell {
  font-variant-numeric: tabular-nums;
}
.usd-missing {
  color: var(--text-3);
}

/* Movement type */
.mv-type {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
}
.mv-ic {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-size: 11px;
}
.mv-buy {
  background: var(--success-soft);
  color: var(--success);
}
.mv-sell {
  background: var(--danger-soft);
  color: var(--danger);
}
.mv-pending {
  background: var(--warning-soft);
  color: var(--warning);
}
.mv-dep {
  background: var(--accent-soft);
  color: var(--accent-text);
}

@media (max-width: 900px) {
  .bigstat-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .bigstat-row {
    grid-template-columns: 1fr;
  }
  .page-h {
    flex-direction: column;
    align-items: flex-start;
  }
  :deep(.base-tbl__head th:nth-child(7)),
  :deep(.base-tbl__body td:nth-child(7)) {
    display: none;
  }
}
</style>
