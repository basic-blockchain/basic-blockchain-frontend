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
import { useDashboardFetchSteps } from '@/composables/useDashboardFetchSteps'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import PaginatedTable from '@/components/organisms/PaginatedTable.vue'
import Stepper from '@/components/atoms/Stepper.vue'

const router = useRouter()
const toast = useToast()
const statsStore = useStatsStore()
const metricsStore = useMetricsStore()

const mintForm = ref({ walletId: '', amount: '' })
const minting = ref(false)

// ── Phase 6e widgets state ───────────────────────────────────────────
const volumeRange = ref<VolumeRange>('30d')
const volume = ref<VolumeResponse | null>(null)
const topMovements = ref<TopMovement[]>([])
const criticalEvents = ref<AuditEntry[]>([])

const volumeOptions = useVolumeChartOptions(volume)

// ── Dashboard refresh tracking ───────────────────────────────────────
const fetch = useDashboardFetchSteps([
  { key: 'stats', label: 'Stats' },
  { key: 'metrics', label: 'Metrics' },
  { key: 'volume', label: 'Volumen' },
  { key: 'top-movements', label: 'Top mov' },
  { key: 'critical-events', label: 'Eventos' },
] as const)

async function loadVolume() {
  await fetch.run('volume', async () => {
    try {
      volume.value = await getVolume({ range: volumeRange.value })
    } catch (e) {
      toast.add({
        severity: 'error',
        summary: 'Error al cargar volumen',
        detail: e instanceof Error ? e.message : 'Error',
        life: 4000,
      })
      throw e
    }
  })
}

async function loadTopMovements() {
  await fetch.run('top-movements', async () => {
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
      throw e
    }
  })
}

async function loadCriticalEvents() {
  await fetch.run('critical-events', async () => {
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
      throw e
    }
  })
}

async function loadStats() {
  await fetch.run('stats', () => statsStore.fetchStats({ compare: '7d' }))
}

async function loadMetrics() {
  await fetch.run('metrics', () => metricsStore.fetchAll())
}

async function refreshAll() {
  fetch.reset()
  await Promise.allSettled([
    loadStats(),
    loadMetrics(),
    loadVolume(),
    loadTopMovements(),
    loadCriticalEvents(),
  ])
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

function trendBadgeTone(pct: number | null | undefined): 'success' | 'danger' | 'neutral' {
  const t = deltaTone(pct)
  if (t === 'up') return 'success'
  if (t === 'down') return 'danger'
  return 'neutral'
}

function formatPct(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return '—'
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

const usersTrend = computed(() => statsStore.stats?.compare?.users.total ?? null)
const activeTrend = computed(() => statsStore.stats?.compare?.users.active ?? null)
const txTrend = computed(() => statsStore.stats?.compare?.transactions.count ?? null)

// ── Top movements table columns ──────────────────────────────────────
interface MovementColumn {
  key: string
  label: string
  num?: boolean
}
const movementColumns: MovementColumn[] = [
  { key: 'from-to', label: 'De → Para' },
  { key: 'amount', label: 'Monto', num: true },
  { key: 'amount_usd', label: 'USD', num: true },
  { key: 'confirmed_at', label: 'Cuando' },
]

// ── Mint (unchanged behavior) ────────────────────────────────────────
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

function formatUsd(value: number | string): string {
  return Number(value).toLocaleString('es-AR', { maximumFractionDigits: 2 })
}

onMounted(() => {
  void refreshAll()
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
        <BaseButton variant="ghost" size="sm" @click="refreshAll"> Actualizar </BaseButton>
        <BaseButton variant="ghost" size="sm" @click="router.push('/admin/users')">
          Ver usuarios
        </BaseButton>
        <BaseButton variant="ghost" size="sm" @click="router.push('/admin/audit')">
          Ver auditoría
        </BaseButton>
      </div>
    </div>

    <!-- Stepper refresh indicator -->
    <Transition name="fade">
      <div v-if="fetch.hasStarted.value && !fetch.refreshComplete.value" class="refresh-indicator">
        <Stepper :steps="fetch.steps.value" :current="fetch.currentIndex.value" />
      </div>
    </Transition>

    <!-- Platform KPIs (bigstat) -->
    <div class="bigstat-row">
      <BaseCard variant="bigstat">
        <template #header>
          <span>Usuarios</span>
          <BaseBadge
            v-if="usersTrend"
            variant="outline"
            :tone="trendBadgeTone(usersTrend.delta_pct)"
          >
            {{ formatPct(usersTrend.delta_pct) }}
          </BaseBadge>
        </template>
        {{ statsStore.stats?.users.total ?? '—' }}
        <template #footer> {{ statsStore.stats?.users.active ?? '—' }} activos </template>
      </BaseCard>

      <BaseCard variant="bigstat">
        <template #header>
          <span>Activos</span>
          <BaseBadge
            v-if="activeTrend"
            variant="outline"
            :tone="trendBadgeTone(activeTrend.delta_pct)"
          >
            {{ formatPct(activeTrend.delta_pct) }}
          </BaseBadge>
        </template>
        {{ statsStore.stats?.users.active ?? '—' }}
        <template #footer> {{ statsStore.stats?.users.banned ?? 0 }} baneados </template>
      </BaseCard>

      <BaseCard variant="bigstat">
        <template #header>
          <span>Wallets</span>
        </template>
        {{ statsStore.stats?.wallets.total ?? '—' }}
        <template #footer>
          {{ statsStore.stats?.wallets.user_wallets ?? '—' }} de usuario
        </template>
      </BaseCard>

      <BaseCard variant="bigstat">
        <template #header>
          <span>Transacciones · 7d</span>
          <BaseBadge v-if="txTrend" variant="outline" :tone="trendBadgeTone(txTrend.delta_pct)">
            {{ formatPct(txTrend.delta_pct) }}
          </BaseBadge>
        </template>
        {{ txTrend?.current ?? '—' }}
        <template #footer> vs {{ txTrend?.previous ?? '—' }} previo </template>
      </BaseCard>
    </div>

    <!-- Volume chart -->
    <BaseCard variant="default" padding="none">
      <template #header>
        <div class="panel-h chart-h">
          <span>Volumen confirmado · USD</span>
          <div class="range-tabs">
            <button
              v-for="r in ['30d', '90d', '1y'] as VolumeRange[]"
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
      </template>
      <div class="chart-body">
        <div v-if="fetch.status.volume === 'current'" class="chart-loading">
          <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
        </div>
        <VChart v-else-if="volume" class="chart" :option="volumeOptions" autoresize />
        <div v-else class="chart-empty">Sin datos en el rango.</div>
      </div>
      <div v-if="volume" class="chart-totals">
        <span>
          Total <strong>${{ formatUsd(volume.totals.volume_usd) }}</strong>
        </span>
        <span>· {{ volume.totals.tx_count }} tx</span>
        <span v-if="volume.totals.unpriced_count > 0" class="unpriced-note">
          · {{ volume.totals.unpriced_count }} sin tasa FX
        </span>
      </div>
    </BaseCard>

    <!-- Critical events + Top movements -->
    <div class="content-grid">
      <BaseCard variant="default" padding="none">
        <template #header>
          <div class="panel-h">Eventos críticos · 24h</div>
        </template>
        <div v-if="fetch.status['critical-events'] === 'current'" class="panel-loading">
          <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
        </div>
        <div v-else-if="criticalEvents.length === 0" class="panel-empty">
          Sin eventos críticos en las últimas 24h.
        </div>
        <ul v-else class="event-list">
          <li v-for="e in criticalEvents" :key="e.id" class="event-row">
            <span class="event-dot" :class="`sev-${e.severity ?? 'info'}`" />
            <div class="event-body">
              <div class="event-action mono">
                {{ e.action }}
              </div>
              <div class="event-meta">
                <span class="mono">{{ shortenId(e.actor_id) }}</span>
                <span v-if="e.target_id"
                  >→ <span class="mono">{{ shortenId(e.target_id) }}</span></span
                >
              </div>
            </div>
            <div class="event-ts">
              {{ relativeTime(e.created_at) }}
            </div>
          </li>
        </ul>
      </BaseCard>

      <BaseCard variant="default" padding="none">
        <template #header>
          <div class="panel-h">Top movimientos · 24h</div>
        </template>
        <div v-if="fetch.status['top-movements'] === 'current'" class="panel-loading">
          <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
        </div>
        <div v-else-if="topMovements.length === 0" class="panel-empty">
          Sin movimientos en las últimas 24h.
        </div>
        <PaginatedTable
          v-else
          :columns="movementColumns"
          :rows="topMovements"
          :row-key="(m: TopMovement) => m.tx_id"
        >
          <template #cell-from-to="{ row }">
            <div class="movement-pair">
              <span class="mono">{{ row.from_username ?? shortenId(row.from_user_id) }}</span>
              <span class="arrow">→</span>
              <span class="mono">{{ row.to_username ?? shortenId(row.to_user_id) }}</span>
            </div>
          </template>
          <template #cell-amount="{ row }">
            <span class="mono">{{ row.amount }} {{ row.currency }}</span>
          </template>
          <template #cell-amount_usd="{ row }">
            <span class="mono usd">${{ formatUsd(row.amount_usd) }}</span>
          </template>
          <template #cell-confirmed_at="{ row }">
            <span class="ts mono">{{ relativeTime(row.confirmed_at) }}</span>
          </template>
        </PaginatedTable>
      </BaseCard>
    </div>

    <!-- Blockchain KPIs + Mint -->
    <div class="content-grid">
      <BaseCard variant="default" padding="none">
        <template #header>
          <div class="panel-h">Blockchain</div>
        </template>
        <div class="chain-kpis">
          <div class="chain-kpi">
            <div class="ck-val">
              {{ metricsStore.metrics?.chainHeight ?? '—' }}
            </div>
            <div class="ck-lbl">Altura de cadena</div>
            <div class="ck-sub">bloques confirmados</div>
          </div>
          <div class="chain-kpi">
            <div class="ck-val">
              {{ metricsStore.metrics?.pendingTransactions ?? '—' }}
            </div>
            <div class="ck-lbl">Txs pendientes</div>
            <div class="ck-sub">en mempool</div>
          </div>
        </div>
      </BaseCard>

      <BaseCard variant="default" padding="none">
        <template #header>
          <div class="panel-h">Mintear tokens</div>
        </template>
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
            />
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
            />
          </div>
          <BaseButton variant="primary" type="submit" :loading="minting"> Mintear </BaseButton>
        </form>
      </BaseCard>
    </div>

    <!-- Balances by currency -->
    <BaseCard
      v-if="statsStore.stats?.balances && Object.keys(statsStore.stats.balances).length"
      variant="default"
      padding="none"
    >
      <template #header>
        <div class="panel-h">Balances en circulación</div>
      </template>
      <div class="balances-grid">
        <div
          v-for="(amount, currency) in statsStore.stats.balances"
          :key="currency"
          class="balance-card"
        >
          <div class="bc-currency">
            {{ currency }}
          </div>
          <div class="bc-amount">
            {{ amount }}
          </div>
        </div>
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
.admin-view {
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

/* Refresh indicator container */
.refresh-indicator {
  display: flex;
  justify-content: flex-start;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-base) var(--ease-out);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Bigstat row */
.bigstat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

/* Panel header (shared by every default BaseCard) */
.panel-h {
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.chart-h {
  border-bottom: 1px solid var(--border);
}

/* Range tabs (volume chart) */
.range-tabs {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: var(--surface-2);
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
}
.range-tab {
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  border: 0;
  background: transparent;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  font-family: var(--font-sans);
}
.range-tab.active {
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 0 0 1px var(--border);
}
.range-tab:hover:not(.active) {
  color: var(--text-2);
}

/* Chart body */
.chart-body {
  padding: 8px 12px 0;
}
.chart {
  width: 100%;
  height: 260px;
}
.chart-loading,
.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 200px;
  color: var(--text-3);
  font-size: 12.5px;
}
.chart-totals {
  display: flex;
  gap: 10px;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-2);
}
.chart-totals strong {
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.unpriced-note {
  color: var(--warning);
}

/* Content grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.panel-loading,
.panel-empty {
  padding: 24px;
  text-align: center;
  color: var(--text-3);
  font-size: 12.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

/* Events list */
.event-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.event-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
}
.event-row:last-child {
  border-bottom: none;
}
.event-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--text-3);
}
.event-dot.sev-critical {
  background: var(--danger);
}
.event-dot.sev-warning {
  background: var(--warning);
}
.event-dot.sev-info {
  background: var(--info, var(--text-3));
}
.event-body {
  flex: 1;
  min-width: 0;
}
.event-action {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text);
  font-family: var(--font-mono);
}
.event-meta {
  font-size: 11px;
  color: var(--text-3);
  margin-top: 1px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.event-ts {
  font-size: 11px;
  color: var(--text-3);
  white-space: nowrap;
}

/* Movements table cell wrappers (BaseTable owns the table chrome) */
.mono {
  font-family: var(--font-mono);
  font-size: 11.5px;
}
.usd {
  font-weight: 600;
  color: var(--text);
}
.ts {
  color: var(--text-3);
}
.movement-pair {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.arrow {
  color: var(--text-3);
  font-size: 11px;
}

/* Chain KPIs */
.chain-kpis {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--border);
}
.chain-kpi {
  background: var(--surface);
  padding: 16px;
}
.ck-val {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}
.ck-lbl {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-2);
  margin-top: 4px;
}
.ck-sub {
  font-size: 11.5px;
  color: var(--text-3);
  margin-top: 2px;
}

/* Mint form */
.mint-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-2);
}
.field-input {
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  font-size: 13px;
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-out);
  width: 100%;
  box-sizing: border-box;
  font-family: var(--font-sans);
}
.field-input:focus {
  border-color: var(--accent);
}

/* Balances */
.balances-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  background: var(--border);
}
.balance-card {
  background: var(--surface);
  padding: 14px 20px;
  min-width: 140px;
}
.bc-currency {
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-2);
}
.bc-amount {
  font-size: 20px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.015em;
  color: var(--text);
  margin-top: 2px;
}

@media (max-width: 900px) {
  .bigstat-row {
    grid-template-columns: 1fr 1fr;
  }
  .content-grid {
    grid-template-columns: 1fr;
  }
  .page-h {
    flex-direction: column;
    align-items: flex-start;
  }
  .chart {
    height: 220px;
  }
}
@media (max-width: 560px) {
  .bigstat-row {
    grid-template-columns: 1fr;
  }
}
</style>
