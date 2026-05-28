<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import VChart from 'vue-echarts'
import '@/lib/echarts'
import { useStatsStore } from '@/stores/stats'
import { useToast } from '@/composables/useToast'
import { getVolume, type VolumeRange, type VolumeResponse } from '@/api/dashboard'
import { listAuditLog, listAllWallets, type AuditEntry } from '@/api/admin'
import { getConfirmed } from '@/api/mempool'
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

// ── Phase 6e widgets state ───────────────────────────────────────────
const volumeRange = ref<VolumeRange>('30d')
const volume = ref<VolumeResponse | null>(null)
const recentMovements = ref<RecentMovement[]>([])
const criticalEvents = ref<AuditEntry[]>([])

interface RecentMovement {
  txKey: string
  fromLabel: string
  toLabel: string
  amount: number
  currency: string | null
  confirmedAt: string
  blockIndex: number | null
}

const volumeOptions = useVolumeChartOptions(volume)

// ── Dashboard refresh tracking ───────────────────────────────────────
const fetch = useDashboardFetchSteps([
  { key: 'stats', label: 'Stats' },
  { key: 'volume', label: 'Volumen' },
  { key: 'recent-movements', label: 'Movimientos' },
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

const RECENT_MOVEMENTS_LIMIT = 5
const RECENT_MOVEMENTS_WINDOW_MS = 24 * 60 * 60 * 1000

async function loadRecentMovements() {
  await fetch.run('recent-movements', async () => {
    try {
      const [conf, walletsRes] = await Promise.all([getConfirmed(), listAllWallets()])
      const pkToUsername: Record<string, string> = {}
      const pkToCurrency: Record<string, string> = {}
      for (const w of walletsRes.wallets) {
        pkToUsername[w.public_key] = w.username
        pkToCurrency[w.public_key] = w.currency
      }
      const since = Date.now() - RECENT_MOVEMENTS_WINDOW_MS
      recentMovements.value = conf.transactions
        .map((t) => {
          const ts = new Date(t.blockTimestamp).getTime()
          return { tx: t, ts }
        })
        .filter(({ ts }) => Number.isFinite(ts) && ts >= since)
        .sort((a, b) => b.ts - a.ts)
        .slice(0, RECENT_MOVEMENTS_LIMIT)
        .map<RecentMovement>(({ tx }) => ({
          txKey: `${tx.blockIndex}:${tx.sender}:${tx.receiver}:${tx.amount}`,
          fromLabel: pkToUsername[tx.sender] ?? shortenId(tx.sender),
          toLabel: pkToUsername[tx.receiver] ?? shortenId(tx.receiver),
          amount: tx.amount,
          currency: pkToCurrency[tx.sender] ?? pkToCurrency[tx.receiver] ?? null,
          confirmedAt: tx.blockTimestamp,
          blockIndex: tx.blockIndex ?? null,
        }))
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

async function refreshAll() {
  fetch.reset()
  await Promise.allSettled([
    loadStats(),
    loadVolume(),
    loadRecentMovements(),
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
  { key: 'confirmed_at', label: 'Cuando' },
]

// ── Composición del saldo ────────────────────────────────────────────
type CompositionTone = 'green' | 'orange' | 'blue' | 'teal' | 'gray'

interface CompositionItem {
  currency: string
  amount: number
  pct: number
  tone: CompositionTone
}

const COMPOSITION_TONES: Record<string, CompositionTone> = {
  USDT: 'green',
  BTC: 'orange',
  ETH: 'blue',
  USDC: 'teal',
}

const composition = computed<CompositionItem[]>(() => {
  const balances = statsStore.stats?.balances
  if (!balances) return []
  const entries = Object.entries(balances).map(([currency, raw]) => ({
    currency,
    amount: Number(raw),
  }))
  const total = entries.reduce((acc, e) => acc + (Number.isFinite(e.amount) ? e.amount : 0), 0)
  if (total <= 0) return []
  return entries
    .map((e) => ({
      currency: e.currency,
      amount: e.amount,
      pct: Math.round((e.amount / total) * 1000) / 10,
      tone: COMPOSITION_TONES[e.currency] ?? 'gray',
    }))
    .sort((a, b) => b.pct - a.pct)
})

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
        <BaseButton
          variant="ghost"
          size="sm"
          @click="refreshAll"
        >
          Actualizar
        </BaseButton>
        <BaseButton
          variant="ghost"
          size="sm"
          @click="router.push('/admin/users')"
        >
          Ver usuarios
        </BaseButton>
        <BaseButton
          variant="ghost"
          size="sm"
          @click="router.push('/admin/audit')"
        >
          Ver auditoría
        </BaseButton>
      </div>
    </div>

    <!-- Stepper refresh indicator -->
    <Transition name="fade">
      <div
        v-if="fetch.hasStarted.value && !fetch.refreshComplete.value"
        class="refresh-indicator"
      >
        <Stepper
          :steps="fetch.steps.value"
          :current="fetch.currentIndex.value"
        />
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
        <template #footer>
          {{ statsStore.stats?.users.active ?? '—' }} activos
        </template>
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
        <template #footer>
          {{ statsStore.stats?.users.banned ?? 0 }} baneados
        </template>
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
          <BaseBadge
            v-if="txTrend"
            variant="outline"
            :tone="trendBadgeTone(txTrend.delta_pct)"
          >
            {{ formatPct(txTrend.delta_pct) }}
          </BaseBadge>
        </template>
        {{ txTrend?.current ?? '—' }}
        <template #footer>
          vs {{ txTrend?.previous ?? '—' }} previo
        </template>
      </BaseCard>
    </div>

    <!-- Volume chart + Composición del saldo -->
    <div class="volume-grid">
      <BaseCard
        variant="default"
        padding="none"
      >
        <template #header>
          <div class="panel-h chart-h">
            <div class="panel-title">
              <span>Volumen últimos 30 días</span>
              <span class="panel-sub">Operaciones P2P + Exchange + on-chain</span>
            </div>
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
          <div
            v-if="fetch.status.volume === 'current'"
            class="chart-loading"
          >
            <span
              class="pi pi-spin pi-spinner"
              aria-hidden="true"
            /> Cargando…
          </div>
          <VChart
            v-else-if="volume"
            class="chart"
            :option="volumeOptions"
            autoresize
          />
          <div
            v-else
            class="chart-empty"
          >
            Sin datos en el rango.
          </div>
        </div>
        <div
          v-if="volume"
          class="chart-totals"
        >
          <span>
            Total <strong>${{ formatUsd(volume.totals.volume_usd) }}</strong>
          </span>
          <span>· {{ volume.totals.tx_count }} tx</span>
          <span
            v-if="volume.totals.unpriced_count > 0"
            class="unpriced-note"
          >
            · {{ volume.totals.unpriced_count }} sin tasa FX
          </span>
        </div>
      </BaseCard>

      <BaseCard
        variant="default"
        padding="none"
      >
        <template #header>
          <div class="panel-h">
            <div class="panel-title">
              <span>Composición del saldo</span>
              <span class="panel-sub">Por activo en wallets de usuarios</span>
            </div>
          </div>
        </template>
        <div
          v-if="composition.length === 0"
          class="panel-empty"
        >
          Sin balances en circulación todavía.
        </div>
        <ul
          v-else
          class="composition-list"
        >
          <li
            v-for="item in composition"
            :key="item.currency"
            class="composition-row"
          >
            <div class="comp-meta">
              <span class="comp-currency">{{ item.currency }}</span>
              <span class="comp-pct">{{ item.pct }}%</span>
            </div>
            <div class="comp-bar">
              <div
                class="comp-bar-fill"
                :class="`tone-${item.tone}`"
                :style="{ width: item.pct + '%' }"
              />
            </div>
          </li>
        </ul>
      </BaseCard>
    </div>

    <!-- Critical events + Top movements -->
    <div class="content-grid">
      <BaseCard
        variant="default"
        padding="none"
      >
        <template #header>
          <div class="panel-h">
            Eventos críticos · 24h
          </div>
        </template>
        <div
          v-if="fetch.status['critical-events'] === 'current'"
          class="panel-loading"
        >
          <span
            class="pi pi-spin pi-spinner"
            aria-hidden="true"
          /> Cargando…
        </div>
        <div
          v-else-if="criticalEvents.length === 0"
          class="panel-empty"
        >
          Sin eventos críticos en las últimas 24h.
        </div>
        <ul
          v-else
          class="event-list"
        >
          <li
            v-for="e in criticalEvents"
            :key="e.id"
            class="event-row"
          >
            <span
              class="event-dot"
              :class="`sev-${e.severity ?? 'info'}`"
            />
            <div class="event-body">
              <div class="event-action mono">
                {{ e.action }}
              </div>
              <div class="event-meta">
                <span class="mono">{{ shortenId(e.actor_id) }}</span>
                <span v-if="e.target_id">→ <span class="mono">{{ shortenId(e.target_id) }}</span></span>
              </div>
            </div>
            <div class="event-ts">
              {{ relativeTime(e.created_at) }}
            </div>
          </li>
        </ul>
      </BaseCard>

      <BaseCard
        variant="default"
        padding="none"
      >
        <template #header>
          <div class="panel-h">
            <div class="panel-title">
              <span>Movimientos recientes · 24h</span>
              <span class="panel-sub">Últimas transacciones confirmadas en la plataforma</span>
            </div>
            <RouterLink
              to="/admin/movements"
              class="panel-link"
            >
              Ver todos →
            </RouterLink>
          </div>
        </template>
        <div
          v-if="fetch.status['recent-movements'] === 'current'"
          class="panel-loading"
        >
          <span
            class="pi pi-spin pi-spinner"
            aria-hidden="true"
          /> Cargando…
        </div>
        <div
          v-else-if="recentMovements.length === 0"
          class="panel-empty"
        >
          Sin movimientos en las últimas 24h.
        </div>
        <PaginatedTable
          v-else
          :columns="movementColumns"
          :rows="recentMovements"
          :row-key="(m: RecentMovement) => m.txKey"
        >
          <template #cell-from-to="{ row }">
            <div class="movement-pair">
              <span class="mono">{{ row.fromLabel }}</span>
              <span class="arrow">→</span>
              <span class="mono">{{ row.toLabel }}</span>
            </div>
          </template>
          <template #cell-amount="{ row }">
            <span class="mono">{{ row.amount }} {{ row.currency ?? '' }}</span>
          </template>
          <template #cell-confirmed_at="{ row }">
            <span class="ts mono">{{ relativeTime(row.confirmedAt) }}</span>
          </template>
        </PaginatedTable>
      </BaseCard>
    </div>
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

/* Volume + composition layout */
.volume-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 12px;
}

.panel-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.panel-sub {
  font-size: 11.5px;
  font-weight: 400;
  color: var(--text-3);
}
.panel-link {
  font-size: 12px;
  font-weight: 500;
  color: var(--accent);
  text-decoration: none;
  white-space: nowrap;
}
.panel-link:hover {
  text-decoration: underline;
}

/* Composición del saldo */
.composition-list {
  list-style: none;
  margin: 0;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.composition-row {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.comp-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-2);
}
.comp-currency {
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0.02em;
}
.comp-pct {
  font-variant-numeric: tabular-nums;
  color: var(--text-2);
}
.comp-bar {
  position: relative;
  height: 4px;
  background: var(--surface-2);
  border-radius: 999px;
  overflow: hidden;
}
.comp-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
  transition: width var(--duration-base) var(--ease-out);
}
.comp-bar-fill.tone-green { background: var(--success, #2f9e44); }
.comp-bar-fill.tone-orange { background: var(--warning, #e8590c); }
.comp-bar-fill.tone-blue { background: var(--accent, #4263eb); }
.comp-bar-fill.tone-teal { background: var(--info, #1098ad); }
.comp-bar-fill.tone-gray { background: var(--border-strong, #adb5bd); }

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

@media (max-width: 900px) {
  .volume-grid {
    grid-template-columns: 1fr;
  }
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
