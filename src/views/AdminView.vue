<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import VChart from 'vue-echarts'
import '@/lib/echarts'
import { mint as mintApi } from '@/api/wallets'
import { useStatsStore } from '@/stores/stats'
import { useMetricsStore } from '@/stores/metrics'
import { useToast } from 'primevue/usetoast'
import {
  getVolume,
  getTopMovements,
  type VolumeRange,
  type VolumeResponse,
  type TopMovement,
} from '@/api/dashboard'
import { listAuditLog, type AuditEntry } from '@/api/admin'
import { useVolumeChartOptions } from '@/composables/useVolumeChartOptions'

const router = useRouter()
const toast = useToast()
const statsStore = useStatsStore()
const metricsStore = useMetricsStore()

const mintForm = ref({ walletId: '', amount: '' })
const minting = ref(false)

// ── Phase 6e widgets state ───────────────────────────────────────────
const volumeRange = ref<VolumeRange>('30d')
const volume = ref<VolumeResponse | null>(null)
const volumeLoading = ref(false)
const topMovements = ref<TopMovement[]>([])
const movementsLoading = ref(false)
const criticalEvents = ref<AuditEntry[]>([])
const criticalLoading = ref(false)

const volumeOptions = useVolumeChartOptions(volume)

async function loadVolume() {
  volumeLoading.value = true
  try {
    volume.value = await getVolume({ range: volumeRange.value })
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error al cargar volumen',
      detail: e instanceof Error ? e.message : 'Error',
      life: 4000,
    })
  } finally {
    volumeLoading.value = false
  }
}

async function loadTopMovements() {
  movementsLoading.value = true
  try {
    const res = await getTopMovements({ range: '24h', limit: 5 })
    topMovements.value = res.movements
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error al cargar movimientos',
      detail: e instanceof Error ? e.message : 'Error',
      life: 4000,
    })
  } finally {
    movementsLoading.value = false
  }
}

async function loadCriticalEvents() {
  criticalLoading.value = true
  try {
    const res = await listAuditLog({ severity: 'critical', since: '24h', limit: 10 })
    criticalEvents.value = res.entries
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error al cargar eventos críticos',
      detail: e instanceof Error ? e.message : 'Error',
      life: 4000,
    })
  } finally {
    criticalLoading.value = false
  }
}

function changeRange(range: VolumeRange) {
  volumeRange.value = range
  loadVolume()
}

// ── Trend pill helpers ───────────────────────────────────────────────
type DeltaTone = 'up' | 'down' | 'flat'

function deltaTone(pct: number | null | undefined): DeltaTone {
  if (pct === null || pct === undefined || pct === 0) return 'flat'
  return pct > 0 ? 'up' : 'down'
}

function formatPct(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return '—'
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

const usersTrend = computed(() => statsStore.stats?.compare?.users.total ?? null)
const activeTrend = computed(() => statsStore.stats?.compare?.users.active ?? null)
const txTrend = computed(() => statsStore.stats?.compare?.transactions.count ?? null)

// ── Mint (unchanged) ─────────────────────────────────────────────────
async function submitMint() {
  const amount = Number(mintForm.value.amount)
  if (!mintForm.value.walletId || !amount || amount <= 0) return
  minting.value = true
  try {
    await mintApi({ wallet_id: mintForm.value.walletId, amount })
    toast.add({
      severity: 'success',
      summary: 'Mint enviado',
      detail: 'Transacción en mempool — mina un bloque para confirmar',
      life: 5000,
    })
    mintForm.value = { walletId: '', amount: '' }
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error al mintear',
      detail: e instanceof Error ? e.message : 'Error',
      life: 4000,
    })
  } finally {
    minting.value = false
  }
}

function relativeTime(iso: string): string {
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return iso
  const diffMs = Date.now() - ts
  const m = Math.floor(diffMs / 60_000)
  if (m < 1) return 'recién'
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return `hace ${d} d`
}

function shortenId(value: string | null | undefined, head = 6, tail = 4): string {
  if (!value) return '—'
  if (value.length <= head + tail + 1) return value
  return `${value.slice(0, head)}…${value.slice(-tail)}`
}

onMounted(async () => {
  await Promise.all([
    statsStore.fetchStats({ compare: '7d' }),
    metricsStore.fetchAll(),
    loadVolume(),
    loadTopMovements(),
    loadCriticalEvents(),
  ])
})
</script>

<template>
  <div class="admin-view">
    <!-- Page header -->
    <div class="page-h">
      <div>
        <h1>Resumen</h1>
        <p>Panel de administración de la plataforma</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost" type="button" @click="router.push('/admin/users')">
          Ver usuarios
        </button>
        <button class="btn btn-ghost" type="button" @click="router.push('/admin/audit')">
          Ver auditoría
        </button>
      </div>
    </div>

    <!-- Platform KPIs (bigstat) with Phase 6e trend pills -->
    <div class="bigstat-row">
      <div class="bigstat">
        <div class="bs-h">
          <div class="lb">Usuarios</div>
          <span
            v-if="usersTrend"
            class="trend-pill"
            :class="`tone-${deltaTone(usersTrend.delta_pct)}`"
            :title="`${usersTrend.previous} hace 7d → ${usersTrend.current} ahora`"
          >
            {{ formatPct(usersTrend.delta_pct) }}
          </span>
        </div>
        <div class="vl">{{ statsStore.stats?.users.total ?? '—' }}</div>
        <div class="ds">{{ statsStore.stats?.users.active ?? '—' }} activos</div>
      </div>
      <div class="bigstat">
        <div class="bs-h">
          <div class="lb">Activos</div>
          <span
            v-if="activeTrend"
            class="trend-pill"
            :class="`tone-${deltaTone(activeTrend.delta_pct)}`"
            :title="`${activeTrend.previous} hace 7d → ${activeTrend.current} ahora`"
          >
            {{ formatPct(activeTrend.delta_pct) }}
          </span>
        </div>
        <div class="vl">{{ statsStore.stats?.users.active ?? '—' }}</div>
        <div class="ds">{{ statsStore.stats?.users.banned ?? 0 }} baneados</div>
      </div>
      <div class="bigstat">
        <div class="bs-h">
          <div class="lb">Wallets</div>
        </div>
        <div class="vl">{{ statsStore.stats?.wallets.total ?? '—' }}</div>
        <div class="ds">{{ statsStore.stats?.wallets.user_wallets ?? '—' }} de usuario</div>
      </div>
      <div class="bigstat">
        <div class="bs-h">
          <div class="lb">Transacciones · 7d</div>
          <span
            v-if="txTrend"
            class="trend-pill"
            :class="`tone-${deltaTone(txTrend.delta_pct)}`"
            :title="`${txTrend.previous} en 7d previos`"
          >
            {{ formatPct(txTrend.delta_pct) }}
          </span>
        </div>
        <div class="vl">{{ txTrend?.current ?? '—' }}</div>
        <div class="ds">vs {{ txTrend?.previous ?? '—' }} previo</div>
      </div>
    </div>

    <!-- Volume chart -->
    <section class="panel chart-panel">
      <div class="panel-h chart-h">
        <span>Volumen confirmado · USD</span>
        <div class="range-tabs">
          <button
            v-for="r in (['30d', '90d', '1y'] as VolumeRange[])"
            :key="r"
            type="button"
            class="range-tab"
            :class="{ active: volumeRange === r }"
            @click="changeRange(r)"
          >
            {{ r === '1y' ? '1A' : r.toUpperCase() }}
          </button>
        </div>
      </div>
      <div class="chart-body">
        <div v-if="volumeLoading" class="chart-loading">
          <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
        </div>
        <VChart
          v-else-if="volume"
          class="chart"
          :option="volumeOptions"
          autoresize
        />
        <div v-else class="chart-empty">Sin datos en el rango.</div>
      </div>
      <div v-if="volume" class="chart-totals">
        <span>
          Total <strong>${{ Number(volume.totals.volume_usd).toLocaleString('en-US', { maximumFractionDigits: 2 }) }}</strong>
        </span>
        <span>· {{ volume.totals.tx_count }} tx</span>
        <span v-if="volume.totals.unpriced_count > 0" class="unpriced-note">
          · {{ volume.totals.unpriced_count }} sin tasa FX
        </span>
      </div>
    </section>

    <!-- Critical events + Top movements -->
    <div class="content-grid">
      <section class="panel">
        <div class="panel-h">Eventos críticos · 24h</div>
        <div v-if="criticalLoading" class="panel-loading">
          <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
        </div>
        <div v-else-if="criticalEvents.length === 0" class="panel-empty">
          Sin eventos críticos en las últimas 24h.
        </div>
        <ul v-else class="event-list">
          <li v-for="e in criticalEvents" :key="e.id" class="event-row">
            <span class="event-dot" :class="`sev-${e.severity ?? 'info'}`" />
            <div class="event-body">
              <div class="event-action mono">{{ e.action }}</div>
              <div class="event-meta">
                <span class="mono">{{ shortenId(e.actor_id) }}</span>
                <span v-if="e.target_id">→ <span class="mono">{{ shortenId(e.target_id) }}</span></span>
              </div>
            </div>
            <div class="event-ts">{{ relativeTime(e.created_at) }}</div>
          </li>
        </ul>
      </section>

      <section class="panel">
        <div class="panel-h">Top movimientos · 24h</div>
        <div v-if="movementsLoading" class="panel-loading">
          <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
        </div>
        <div v-else-if="topMovements.length === 0" class="panel-empty">
          Sin movimientos en las últimas 24h.
        </div>
        <table v-else class="tbl">
          <thead>
            <tr>
              <th>De → Para</th>
              <th class="num">Monto</th>
              <th class="num">USD</th>
              <th>Cuando</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in topMovements" :key="m.tx_id">
              <td>
                <div class="movement-pair">
                  <span class="mono">{{ m.from_username ?? shortenId(m.from_user_id) }}</span>
                  <span class="arrow">→</span>
                  <span class="mono">{{ m.to_username ?? shortenId(m.to_user_id) }}</span>
                </div>
              </td>
              <td class="num mono">{{ m.amount }} {{ m.currency }}</td>
              <td class="num mono usd">${{ Number(m.amount_usd).toLocaleString('en-US', { maximumFractionDigits: 2 }) }}</td>
              <td class="ts mono">{{ relativeTime(m.confirmed_at) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    <!-- Existing content grid -->
    <div class="content-grid">
      <section class="panel">
        <div class="panel-h">Blockchain</div>
        <div class="chain-kpis">
          <div class="chain-kpi">
            <div class="ck-val">{{ metricsStore.metrics?.chainHeight ?? '—' }}</div>
            <div class="ck-lbl">Altura de cadena</div>
            <div class="ck-sub">bloques confirmados</div>
          </div>
          <div class="chain-kpi">
            <div class="ck-val">{{ metricsStore.metrics?.pendingTransactions ?? '—' }}</div>
            <div class="ck-lbl">Txs pendientes</div>
            <div class="ck-sub">en mempool</div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-h">Mintear tokens</div>
        <form class="mint-form" @submit.prevent="submitMint">
          <div class="field">
            <label class="field-label" for="wallet-id">Wallet ID</label>
            <input
              id="wallet-id"
              v-model="mintForm.walletId"
              class="field-input"
              type="text"
              placeholder="ID de la wallet destinataria"
              required
            >
          </div>
          <div class="field">
            <label class="field-label" for="mint-amount">Cantidad</label>
            <input
              id="mint-amount"
              v-model="mintForm.amount"
              class="field-input"
              type="number"
              min="0.00000001"
              step="any"
              placeholder="100"
              required
            >
          </div>
          <button class="btn btn-primary" type="submit" :disabled="minting">
            <span v-if="minting" class="pi pi-spin pi-spinner" aria-hidden="true" />
            <span v-else class="pi pi-plus" aria-hidden="true" />
            {{ minting ? 'Enviando…' : 'Mintear' }}
          </button>
        </form>
      </section>
    </div>

    <!-- Balances by currency -->
    <section
      v-if="statsStore.stats?.balances && Object.keys(statsStore.stats.balances).length"
      class="panel"
    >
      <div class="panel-h">Balances en circulación</div>
      <div class="balances-grid">
        <div
          v-for="(amount, currency) in statsStore.stats.balances"
          :key="currency"
          class="balance-card"
        >
          <div class="bc-currency">{{ currency }}</div>
          <div class="bc-amount">{{ amount }}</div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin-view { display: flex; flex-direction: column; gap: 18px; }

.page-h { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
.page-h h1 { font-size: 22px; font-weight: 600; letter-spacing: -0.015em; margin: 0 0 2px; color: var(--text); }
.page-h p  { margin: 0; font-size: 13px; color: var(--text-2); }
.page-actions { display: flex; gap: 8px; }

/* Bigstat row */
.bigstat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.bigstat {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 16px;
}
.bs-h { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.lb { font-size: 11.5px; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.04em; }
.vl { font-size: 26px; font-weight: 600; letter-spacing: -0.02em; margin: 4px 0; color: var(--text); font-variant-numeric: tabular-nums; }
.ds { font-size: 11.5px; color: var(--text-3); }
.vl-danger { color: var(--danger) !important; }

/* Trend pills */
.trend-pill {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 99px;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}
.trend-pill.tone-up   { background: rgba(34, 197, 94, 0.15); color: var(--success); }
.trend-pill.tone-down { background: rgba(239, 68, 68, 0.15); color: var(--danger); }
.trend-pill.tone-flat { background: var(--surface-2);        color: var(--text-3); }

/* Chart */
.chart-panel { padding: 0; }
.chart-h {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  font-size: 13px; font-weight: 600;
}
.range-tabs { display: inline-flex; gap: 2px; padding: 2px; background: var(--surface-2); border-radius: 99px; border: 1px solid var(--border); }
.range-tab {
  padding: 3px 10px; border-radius: 99px; border: 0;
  background: transparent; color: var(--text-3);
  font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
  cursor: pointer; font-family: var(--font-sans);
}
.range-tab.active { background: var(--surface); color: var(--text); box-shadow: 0 0 0 1px var(--border); }
.range-tab:hover:not(.active) { color: var(--text-2); }
.chart-body { padding: 8px 12px 0; }
.chart { width: 100%; height: 260px; }
.chart-loading, .chart-empty {
  display: flex; align-items: center; justify-content: center;
  gap: 6px; height: 200px; color: var(--text-3); font-size: 12.5px;
}
.chart-totals {
  display: flex; gap: 10px; padding: 10px 16px;
  border-top: 1px solid var(--border);
  font-size: 12px; color: var(--text-2);
}
.chart-totals strong { color: var(--text); font-variant-numeric: tabular-nums; }
.unpriced-note { color: var(--warning); }

/* Content grid */
.content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.panel {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); overflow: hidden;
}
.panel-h {
  padding: 12px 16px; font-size: 13px; font-weight: 600;
  border-bottom: 1px solid var(--border);
}
.panel-loading, .panel-empty {
  padding: 24px; text-align: center;
  color: var(--text-3); font-size: 12.5px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
}

/* Events list */
.event-list { list-style: none; margin: 0; padding: 0; }
.event-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; border-bottom: 1px solid var(--border);
}
.event-row:last-child { border-bottom: none; }
.event-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
  background: var(--text-3);
}
.event-dot.sev-critical { background: var(--danger); }
.event-dot.sev-warning  { background: var(--warning); }
.event-dot.sev-info     { background: var(--info, var(--text-3)); }
.event-body { flex: 1; min-width: 0; }
.event-action {
  font-size: 12.5px; font-weight: 600; color: var(--text);
  font-family: var(--font-mono);
}
.event-meta {
  font-size: 11px; color: var(--text-3); margin-top: 1px;
  display: flex; gap: 6px; flex-wrap: wrap;
}
.event-ts { font-size: 11px; color: var(--text-3); white-space: nowrap; }

/* Movements table */
.tbl { width: 100%; border-collapse: collapse; }
.tbl th {
  text-align: left; padding: 8px 14px; font-size: 11px; font-weight: 600;
  color: var(--text-3); text-transform: uppercase; letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border); background: var(--surface-2);
}
.tbl td {
  padding: 9px 14px; border-bottom: 1px solid var(--border);
  font-size: 12.5px; vertical-align: middle;
}
.tbl tr:last-child td { border-bottom: none; }
.num { text-align: right; }
.mono { font-family: var(--font-mono); font-size: 11.5px; }
.usd { font-weight: 600; color: var(--text); }
.ts { color: var(--text-3); }
.movement-pair { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.arrow { color: var(--text-3); font-size: 11px; }

/* Chain KPIs */
.chain-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--border); }
.chain-kpi { background: var(--surface); padding: 16px; }
.ck-val { font-size: 28px; font-weight: 600; letter-spacing: -0.025em; font-variant-numeric: tabular-nums; color: var(--text); }
.ck-lbl { font-size: 12px; font-weight: 500; color: var(--text-2); margin-top: 4px; }
.ck-sub { font-size: 11.5px; color: var(--text-3); margin-top: 2px; }

/* Mint */
.mint-form { display: flex; flex-direction: column; gap: 12px; padding: 16px; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 12px; font-weight: 500; color: var(--text-2); }
.field-input {
  padding: 7px 10px; border: 1px solid var(--border);
  border-radius: var(--radius); background: var(--surface-2);
  color: var(--text); font-size: 13px; outline: none;
  transition: border-color 0.12s; width: 100%; box-sizing: border-box;
  font-family: var(--font-sans);
}
.field-input:focus { border-color: var(--accent); }

/* Balances */
.balances-grid { display: flex; flex-wrap: wrap; gap: 1px; background: var(--border); }
.balance-card { background: var(--surface); padding: 14px 20px; min-width: 140px; }
.bc-currency {
  font-size: 11.5px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--text-2);
}
.bc-amount {
  font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums;
  letter-spacing: -0.015em; color: var(--text); margin-top: 2px;
}

@media (max-width: 900px) {
  .bigstat-row  { grid-template-columns: 1fr 1fr; }
  .content-grid { grid-template-columns: 1fr; }
  .page-h       { flex-direction: column; align-items: flex-start; }
  .chart { height: 220px; }
}
@media (max-width: 560px) {
  .bigstat-row { grid-template-columns: 1fr; }
  .tbl th:nth-child(2), .tbl td:nth-child(2) { display: none; }
}
</style>
