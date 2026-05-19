<script setup lang="ts">
import { onMounted } from 'vue'
import { useMetricsStore } from '@/stores/metrics'
import MetricsBar from '@/components/organisms/MetricsBar.vue'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'

const store = useMetricsStore()

onMounted(() => store.fetchAll())

type HealthStatus = 'ok' | 'degraded' | 'error' | 'n/a'

const HEALTH_LABEL: Record<HealthStatus, string> = {
  ok: 'Operativo',
  degraded: 'Degradado',
  error: 'Error',
  'n/a': 'N/D',
}

function healthTone(status: string | null | undefined): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'ok') return 'success'
  if (status === 'degraded') return 'warning'
  if (status === 'error') return 'danger'
  return 'neutral'
}

function healthLabel(status: string | null | undefined): string {
  if (!status) return 'N/D'
  return HEALTH_LABEL[status as HealthStatus] ?? status
}
</script>

<template>
  <div class="health-view">
    <div class="page-h">
      <div>
        <h1>Salud del nodo</h1>
        <p>Estado en tiempo real del backend y la base de datos</p>
      </div>
      <BaseButton
        variant="ghost"
        size="sm"
        :loading="store.loading"
        @click="store.fetchAll()"
      >
        Actualizar
      </BaseButton>
    </div>

    <!-- KPI bigstat row -->
    <div class="bigstat-row">
      <BaseCard variant="bigstat">
        <template #header>
          <span>Estado nodo</span>
        </template>
        <span :class="store.health?.status === 'ok' ? 'vl-ok' : store.health?.status === 'degraded' ? 'vl-warn' : ''">
          {{ healthLabel(store.health?.status) }}
        </span>
        <template #footer>
          último check ahora
        </template>
      </BaseCard>

      <BaseCard variant="bigstat">
        <template #header>
          <span>Base de datos</span>
        </template>
        <span :class="store.health?.db === 'ok' ? 'vl-ok' : store.health?.db === 'error' ? 'vl-err' : ''">
          {{ store.health?.db === 'ok' ? 'Conectada' : store.health?.db === 'error' ? 'Error' : '—' }}
        </span>
        <template #footer>
          PostgreSQL
        </template>
      </BaseCard>

      <BaseCard variant="bigstat">
        <template #header>
          <span>Altura de cadena</span>
        </template>
        {{ store.health?.chainHeight ?? store.metrics?.chainHeight ?? '—' }}
        <template #footer>
          bloques confirmados
        </template>
      </BaseCard>

      <BaseCard variant="bigstat">
        <template #header>
          <span>Avg. minado</span>
        </template>
        <template v-if="store.metrics?.avgMineTimeSeconds != null">
          {{ store.metrics.avgMineTimeSeconds.toFixed(2) }}<span class="vl-unit">s</span>
        </template>
        <template v-else>
          —
        </template>
        <template #footer>
          tiempo medio por bloque
        </template>
      </BaseCard>
    </div>

    <MetricsBar
      :metrics="store.metrics"
      :health="store.health"
    />

    <BaseCard
      v-if="store.health"
      variant="default"
      padding="none"
    >
      <template #header>
        <div class="panel-h">
          Detalles del nodo
        </div>
      </template>
      <div class="details-grid">
        <div class="detail-row">
          <span class="detail-label">Estado</span>
          <BaseBadge :tone="healthTone(store.health.status)">
            {{ healthLabel(store.health.status) }}
          </BaseBadge>
        </div>
        <div class="detail-row">
          <span class="detail-label">Base de datos</span>
          <BaseBadge :tone="healthTone(store.health.db)">
            {{ healthLabel(store.health.db) }}
          </BaseBadge>
        </div>
        <div class="detail-row">
          <span class="detail-label">Altura de cadena</span>
          <span class="detail-val">{{ store.health.chainHeight }}</span>
        </div>
      </div>
    </BaseCard>
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
</style>
