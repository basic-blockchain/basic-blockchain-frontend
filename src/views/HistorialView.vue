<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useConfirmedTransactionsStore } from '@/stores/confirmedTransactions'
import { useAuthStore } from '@/stores/auth'
import { useExchangeRatesStore } from '@/stores/exchangeRates'
import { useWalletStore } from '@/stores/wallet'

const confirmedStore = useConfirmedTransactionsStore()
const auth           = useAuthStore()
const ratesStore     = useExchangeRatesStore()
const walletStore    = useWalletStore()

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
  for (const r of filtered.value) {
    const key = dateKey(r.blockTimestamp)
    if (!map.has(key)) {
      map.set(key, { label: dateGroupLabel(r.blockTimestamp), dateKey: key, records: [] })
    }
    map.get(key)!.records.push(r)
  }
  return Array.from(map.values())
})

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
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
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
}
.mv-row:last-child { border-bottom: none; }
.mv-row:hover { background: var(--surface-2); }

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

.mv-right { flex-shrink: 0; text-align: right; }
.mv-amount { font-size: 13.5px; font-weight: 600; font-variant-numeric: tabular-nums; }

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
