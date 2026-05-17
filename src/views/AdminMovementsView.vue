<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getConfirmed, getPending } from '@/api/mempool'
import type { ConfirmedTransaction, Transaction } from '@/domain/transaction'
import { listAllWallets, listExchangeRates } from '@/api/admin'
import { useToast } from 'primevue/usetoast'

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

function rowFromTx(
  t: Transaction & { blockIndex?: number; blockTimestamp?: string },
  status: 'completed' | 'pending',
): Row {
  // Sender first — owner side carries the source currency; receiver
  // is the fallback (mint/coinbase rows have an empty sender wallet).
  const currency =
    pubkeyToCurrency.value[t.sender] ??
    pubkeyToCurrency.value[t.receiver] ??
    null
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
  const filtered = q ? all.filter((r) => r.sender.toLowerCase().includes(q) || r.receiver.toLowerCase().includes(q)) : all
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
        <button class="btn-ghost" :disabled="loading" @click="load">
          <span class="pi pi-refresh" :class="{ 'pi-spin': loading }" aria-hidden="true" />
          Actualizar
        </button>
      </div>
    </div>

    <!-- Big stats -->
    <div class="bigstat-row">
      <div class="bigstat">
        <div class="bigstat-lb">Operaciones totales</div>
        <div class="bigstat-vl">{{ stats.total.toLocaleString('es-AR') }}</div>
        <div class="bigstat-ds">Confirmadas + pendientes</div>
      </div>
      <div class="bigstat">
        <div class="bigstat-lb">Confirmadas</div>
        <div class="bigstat-vl" style="color: var(--success)">{{ stats.confirmed.toLocaleString('es-AR') }}</div>
        <div class="bigstat-ds">En bloques minados</div>
      </div>
      <div class="bigstat">
        <div class="bigstat-lb">Pendientes</div>
        <div class="bigstat-vl" :style="stats.pending > 0 ? { color: 'var(--warning)' } : {}">
          {{ stats.pending }}
        </div>
        <div class="bigstat-ds">En mempool</div>
      </div>
      <div class="bigstat">
        <div class="bigstat-lb">Mostrando</div>
        <div class="bigstat-vl">{{ rows.length }}</div>
        <div class="bigstat-ds">Con filtros actuales</div>
      </div>
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
          @click="activeTab = (t.key as 'all' | 'pending' | 'confirmed')"
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
    <div v-else class="panel table-panel">
      <table class="data-table">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>De</th>
            <th>Para</th>
            <th class="num">Monto</th>
            <th class="num">USD</th>
            <th>Estado</th>
            <th>Bloque / Cuando</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(r, i) in rows"
            :key="i"
            class="data-row"
          >
            <td>
              <div class="mv-type">
                <span class="mv-ic" :class="r.status === 'completed' ? 'mv-buy' : 'mv-pending'" aria-hidden="true">
                  <span class="pi" :class="r.status === 'completed' ? 'pi-arrow-right' : 'pi-clock'" />
                </span>
                {{ r.status === 'completed' ? 'Transferencia' : 'Pendiente' }}
              </div>
            </td>
            <td class="mono cell-addr">{{ truncate(r.sender) }}</td>
            <td class="mono cell-addr">{{ truncate(r.receiver) }}</td>
            <td class="num mono">
              {{ r.amount.toLocaleString('es-AR', { maximumFractionDigits: 8 }) }}
              <span v-if="r.currency" class="cell-currency">{{ r.currency }}</span>
            </td>
            <td class="num mono usd-cell">
              <template v-if="r.amountUsd !== null">{{ fmtUsd(r.amountUsd) }}</template>
              <span v-else class="usd-missing" title="Sin tasa FX para esta moneda">—</span>
            </td>
            <td>
              <span class="status-badge" :class="r.status">
                {{ r.status === 'completed' ? 'Confirmado' : 'Pendiente' }}
              </span>
            </td>
            <td class="text-dim mono">
              <template v-if="r.blockIndex != null">Bloque #{{ r.blockIndex }}</template>
              <template v-else-if="r.timestamp">{{ r.timestamp }}</template>
              <template v-else>—</template>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="7" class="empty-row">Sin movimientos.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.movements-view { display: flex; flex-direction: column; gap: 14px; }

.page-h { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
.page-h h1 { font-size: 22px; font-weight: 600; letter-spacing: -0.015em; margin: 0 0 2px; color: var(--text); }
.page-h p  { margin: 0; font-size: 13px; color: var(--text-2); }
.page-h-actions { display: flex; gap: 8px; }

.btn-ghost {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 13px; border-radius: var(--radius); border: 1px solid var(--border);
  background: var(--surface); color: var(--text-2); font-size: 13px; font-weight: 500;
  cursor: pointer; transition: background 0.12s, color 0.12s; font-family: var(--font-sans);
}
.btn-ghost:hover:not(:disabled) { background: var(--hover); color: var(--text); }
.btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

/* Big stats */
.bigstat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.bigstat {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 16px 18px;
}
.bigstat-lb { font-size: 11.5px; font-weight: 500; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
.bigstat-vl { font-size: 28px; font-weight: 600; letter-spacing: -0.02em; color: var(--text); line-height: 1; }
.bigstat-ds { font-size: 11.5px; color: var(--text-2); margin-top: 6px; }

/* Toolbar */
.toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.tabstrip-inline { display: flex; gap: 2px; }
.tab-btn {
  padding: 6px 12px; font-size: 12.5px; font-weight: 500;
  border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface); color: var(--text-2);
  cursor: pointer; font-family: var(--font-sans); transition: background 0.12s, color 0.12s;
}
.tab-btn:hover { background: var(--hover); color: var(--text); }
.tab-btn.active { background: var(--text); color: var(--bg); border-color: var(--text); }

.toolbar-search {
  display: flex; align-items: center; gap: 8px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 7px 10px; flex: 1; min-width: 200px;
  color: var(--text-3); font-size: 12.5px;
}
.toolbar-search input {
  border: 0; outline: 0; background: transparent; flex: 1;
  font: inherit; color: var(--text); font-family: var(--font-sans); font-size: 13px;
}
.toolbar-search input::placeholder { color: var(--text-3); }
.toolbar-search .pi { font-size: 12px; flex-shrink: 0; }

.loading-row { display: flex; align-items: center; gap: 8px; color: var(--text-2); font-size: 13px; padding: 16px; }

/* Table */
.panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th {
  text-align: left; padding: 8px 14px; font-size: 11.5px; font-weight: 600; color: var(--text-3);
  text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid var(--border); background: var(--surface-2);
}
.data-table th.num, .data-table td.num { text-align: right; }
.data-table td { padding: 10px 14px; border-bottom: 1px solid var(--border); font-size: 13px; vertical-align: middle; }
.data-table tr:last-child td { border-bottom: none; }
.data-row { cursor: default; transition: background 0.08s; }
.data-row:hover { background: var(--hover); }

.mono { font-family: var(--font-mono); font-size: 12px; }
.text-dim { color: var(--text-3); }
.cell-addr { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell-currency {
  margin-left: 4px; font-size: 10.5px; font-weight: 500;
  color: var(--text-3); text-transform: uppercase; letter-spacing: 0.04em;
}
.usd-cell { font-variant-numeric: tabular-nums; }
.usd-missing { color: var(--text-3); }
.empty-row { padding: 24px; text-align: center; color: var(--text-3); }

/* Movement type */
.mv-type { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 500; color: var(--text); white-space: nowrap; }
.mv-ic {
  width: 26px; height: 26px; border-radius: 50%;
  display: grid; place-items: center; flex-shrink: 0; font-size: 11px;
}
.mv-buy    { background: var(--success-soft); color: var(--success); }
.mv-sell   { background: var(--danger-soft);  color: var(--danger); }
.mv-pending { background: var(--warning-soft); color: var(--warning); }
.mv-dep    { background: var(--accent-soft);  color: var(--accent-text); }

/* Status badge */
.status-badge {
  padding: 2px 8px; border-radius: 20px; font-size: 11.5px; font-weight: 500;
}
.status-badge.completed { background: var(--success-soft); color: var(--success); }
.status-badge.pending   { background: var(--warning-soft); color: var(--warning); }

@media (max-width: 900px) { .bigstat-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) {
  .bigstat-row { grid-template-columns: 1fr; }
  .page-h { flex-direction: column; align-items: flex-start; }
  .data-table th:nth-child(7), .data-table td:nth-child(7) { display: none; }
}
</style>
