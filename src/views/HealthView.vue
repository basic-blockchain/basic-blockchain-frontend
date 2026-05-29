<script setup lang="ts">
import { onMounted } from 'vue'
import { useMetricsStore } from '@/stores/metrics'
import MetricsBar from '@/components/organisms/MetricsBar.vue'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import HealthLogsPanel from '@/components/organisms/HealthLogsPanel.vue'

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

    <!-- KPI bigstat row -->
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

    <MetricsBar :metrics="store.metrics" :health="store.health" />

    <div class="two-col-row">
      <div>
        <div class="section-h">Componentes</div>
        <div class="card components-card">
          <div class="comp-row">
            <div>
              <div class="comp-name">Estado</div>
              <div class="comp-sub">Último check</div>
            </div>
            <BaseBadge :tone="healthTone(store.health?.status)">{{
              healthLabel(store.health?.status)
            }}</BaseBadge>
          </div>

          <div class="comp-list">
            <div class="comp-item">
              <div class="comp-title">Node (Python · Flask)</div>
              <div class="comp-sub muted">v0.4.2 · puerto 5000</div>
              <BaseBadge tone="success">OK</BaseBadge>
            </div>
            <div class="comp-item">
              <div class="comp-title">Database (PostgreSQL)</div>
              <div class="comp-sub muted">
                cadena · {{ store.metrics?.pendingTransactions ?? 0 }} TX · conexiones
              </div>
              <BaseBadge :tone="healthTone(store.health?.db)">{{
                store.health?.db === 'ok' ? 'OK' : 'Error'
              }}</BaseBadge>
            </div>
            <div class="comp-item">
              <div class="comp-title">Mempool relay</div>
              <div class="comp-sub muted">broadcast a peers</div>
              <BaseBadge tone="success">OK</BaseBadge>
            </div>
            <div class="comp-item">
              <div class="comp-title">Block validator</div>
              <div class="comp-sub muted">re-validación cada 5 min</div>
              <BaseBadge tone="success">OK</BaseBadge>
            </div>
          </div>
        </div>
      </div>

      <div>
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

/* Two column layout for Health view */
.two-col-row {
  display: grid;
  grid-template-columns: 1.2fr 420px;
  gap: 18px;
  align-items: start;
}
.components-card {
  padding: 12px 14px;
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  min-height: 360px;
}
.comp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.comp-name {
  font-weight: 600;
}
.comp-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.comp-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 6px;
  border-radius: 6px;
}
.comp-title {
  font-weight: 600;
}
.muted {
  color: var(--text-2);
  font-size: 13px;
}

@media (max-width: 900px) {
  .two-col-row {
    grid-template-columns: 1fr;
  }
}
</style>
