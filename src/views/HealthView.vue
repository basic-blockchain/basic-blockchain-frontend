<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useMetricsStore } from '@/stores/metrics'
import MetricsBar from '@/components/organisms/MetricsBar.vue'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import HealthLogsPanel from '@/components/organisms/HealthLogsPanel.vue'
import type { ComponentStatus } from '@/domain/metrics'

const store = useMetricsStore()

onMounted(() => store.fetchAll())

type HealthStatus = 'ok' | 'degraded' | 'error' | 'n/a'

const HEALTH_LABEL: Record<HealthStatus, string> = {
  ok: 'Operativo',
  degraded: 'Degradado',
  error: 'Error',
  'n/a': 'N/D',
}

function healthTone(
  status: string | null | undefined
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'ok') return 'success'
  if (status === 'degraded') return 'warning'
  if (status === 'error') return 'danger'
  return 'neutral'
}

function healthLabel(status: string | null | undefined): string {
  if (!status) return 'N/D'
  return HEALTH_LABEL[status as HealthStatus] ?? status
}

const STATIC_COMPONENTS: ComponentStatus[] = [
  {
    id: 'node',
    label: 'Node (Python · Quart)',
    meta: 'v0.4.2 · port 5000',
    status: 'ok',
  },
  {
    id: 'db',
    label: 'Database (PostgreSQL)',
    meta: `chain · ${0} TX · conexiones`,
    status: 'ok',
  },
  { id: 'mempool_relay', label: 'Mempool relay', meta: 'broadcast to peers', status: 'ok' },
  { id: 'block_validator', label: 'Block validator', meta: 're-validation every 5 min', status: 'ok' },
]

const components = computed<ComponentStatus[]>(
  () => store.health?.components ?? STATIC_COMPONENTS,
)
</script>

<template>
  <div class="health-view">
    <div class="page-h">
      <div>
        <h1>Salud del nodo</h1>
        <p>Estado en tiempo real del backend y la base de datos</p>
      </div>
      <BaseButton variant="ghost" size="sm" :loading="store.loading" @click="store.fetchAll()">
        Actualizar
      </BaseButton>
    </div>

    <!-- KPI bigstat row wrapped in unified card -->
    <BaseCard variant="default" class="kpi-card" padding="none">
      <div class="bigstat-row">
        <BaseCard variant="bigstat">
          <template #header>
            <span>Estado nodo</span>
          </template>
          <span
            :class="
              store.health?.status === 'ok'
                ? 'vl-ok'
                : store.health?.status === 'degraded'
                  ? 'vl-warn'
                  : ''
            "
          >
            {{ healthLabel(store.health?.status) }}
          </span>
          <template #footer> último check ahora </template>
        </BaseCard>

        <BaseCard variant="bigstat">
          <template #header>
            <span>Base de datos</span>
          </template>
          <span
            :class="
              store.health?.db === 'ok' ? 'vl-ok' : store.health?.db === 'error' ? 'vl-err' : ''
            "
          >
            {{
              store.health?.db === 'ok' ? 'Conectada' : store.health?.db === 'error' ? 'Error' : '—'
            }}
          </span>
          <template #footer> PostgreSQL </template>
        </BaseCard>

        <BaseCard variant="bigstat">
          <template #header>
            <span>Altura de cadena</span>
          </template>
          {{ store.health?.chainHeight ?? store.metrics?.chainHeight ?? '—' }}
          <template #footer> bloques confirmados </template>
        </BaseCard>

        <BaseCard variant="bigstat">
          <template #header>
            <span>Avg. minado</span>
          </template>
          <template v-if="store.metrics?.avgMineTimeSeconds != null">
            {{ store.metrics.avgMineTimeSeconds.toFixed(2) }}<span class="vl-unit">s</span>
          </template>
          <template v-else> — </template>
          <template #footer> tiempo medio por bloque </template>
        </BaseCard>
      </div>
    </BaseCard>

    <MetricsBar :metrics="store.metrics" :health="store.health" />

    <div class="two-col-row">
      <div>
        <div class="section-h">Componentes</div>
        <div class="card components-card">
          <div class="kvs">
            <div v-for="c in components" :key="c.id" class="kvs-row">
              <div class="kvs-key">{{ c.label }}</div>
              <div class="kvs-val">{{ c.meta ?? '—' }}</div>
              <div class="kvs-badge">
                <BaseBadge :tone="healthTone(c.status)">{{ healthLabel(c.status) }}</BaseBadge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="logs-right">
        <HealthLogsPanel />
      </div>
    </div>
  </div>
</template>

<style scoped>
.health-view {
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
  font-size: 21px;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 0 0 2px;
  color: var(--text);
}
.page-h p {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-2);
}

.bigstat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.vl-unit {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-2);
}
.vl-ok {
  color: var(--success);
}
.vl-warn {
  color: var(--warning);
}
.vl-err {
  color: var(--danger);
}

.panel-h {
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}

/* Section heading alignment to match card padding */
.section-h {
  margin: 0 0 6px 6px;
  font-size: 12.5px;
  font-weight: 650;
  color: var(--text);
}

.details-grid {
  display: flex;
  flex-direction: column;
}
.detail-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.detail-row:last-child {
  border-bottom: none;
}
.detail-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
  width: 160px;
  flex-shrink: 0;
}
.detail-val {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

@media (max-width: 900px) {
  .bigstat-row {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 640px) {
  .page-h {
    flex-direction: column;
    align-items: flex-start;
  }
  .bigstat-row {
    grid-template-columns: 1fr;
  }
}

/* Two column layout for Health view */
.two-col-row {
  display: grid;
  grid-template-columns: 1.2fr 420px;
  gap: 18px;
  align-items: start;
}
/* KPI card styling to visually group bigstats */
.kpi-card {
  border-radius: var(--radius);
  background: var(--surface-2);
  padding: 12px 14px;
}

/* Components card: no fixed min-height, content-driven */
.components-card {
  padding: 8px 10px;
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

/* KVS grid: key / value / badge */
.kvs-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 9px 10px;
  border-bottom: 1px solid var(--border);
}
.kvs-row:last-child {
  border-bottom: none;
}
.kvs-key {
  font-weight: 650;
  padding-left: 2px;
  font-size: 13px;
}
.kvs-val {
  color: var(--text-2);
  font-size: 13px;
}
.kvs-badge {
  justify-self: end;
  align-self: center;
}

/* remove extra padding to keep keys aligned with card */
.components-card .kvs-row {
  padding-left: 6px;
  padding-right: 6px;
}

@media (max-width: 1200px) {
  .two-col-row {
    grid-template-columns: 1fr 360px;
  }
}
@media (max-width: 900px) {
  .two-col-row {
    grid-template-columns: 1fr;
  }
}

.logs-right {
  position: sticky;
  top: var(--health-logs-top, 20px);
  align-self: start;
}
</style>
