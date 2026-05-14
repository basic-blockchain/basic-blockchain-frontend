<script setup lang="ts">
import { onMounted } from 'vue'
import { useMetricsStore } from '@/stores/metrics'
import MetricsBar from '@/components/organisms/MetricsBar.vue'
import StatusBadge from '@/components/atoms/StatusBadge.vue'

const store = useMetricsStore()

onMounted(() => store.fetchAll())
</script>

<template>
  <div class="health-view">
    <div class="page-h">
      <div>
        <h1>Salud del nodo</h1>
        <p>Estado en tiempo real del backend y la base de datos</p>
      </div>
      <button class="btn btn-ghost" type="button" :disabled="store.loading" @click="store.fetchAll()">
        <span class="pi pi-refresh" :class="{ 'pi-spin': store.loading }" aria-hidden="true" />
        Actualizar
      </button>
    </div>

    <!-- KPI bigstat row -->
    <div class="bigstat-row">
      <div class="bigstat">
        <div class="lb">Estado nodo</div>
        <div class="vl" :class="store.health?.status === 'ok' ? 'vl-ok' : store.health?.status === 'degraded' ? 'vl-warn' : ''">
          {{ store.health?.status === 'ok' ? 'Operativo' : store.health?.status === 'degraded' ? 'Degradado' : '—' }}
        </div>
        <div class="ds">último check ahora</div>
      </div>
      <div class="bigstat">
        <div class="lb">Base de datos</div>
        <div class="vl" :class="store.health?.db === 'ok' ? 'vl-ok' : store.health?.db === 'error' ? 'vl-err' : ''">
          {{ store.health?.db === 'ok' ? 'Conectada' : store.health?.db === 'error' ? 'Error' : '—' }}
        </div>
        <div class="ds">PostgreSQL</div>
      </div>
      <div class="bigstat">
        <div class="lb">Altura de cadena</div>
        <div class="vl">{{ store.health?.chainHeight ?? store.metrics?.chainHeight ?? '—' }}</div>
        <div class="ds">bloques confirmados</div>
      </div>
      <div class="bigstat">
        <div class="lb">Avg. minado</div>
        <div class="vl">
          {{ store.metrics?.avgMineTimeSeconds != null
              ? store.metrics.avgMineTimeSeconds.toFixed(2)
              : '—' }}<span v-if="store.metrics?.avgMineTimeSeconds != null" class="vl-unit">s</span>
        </div>
        <div class="ds">tiempo medio por bloque</div>
      </div>
    </div>

    <MetricsBar :metrics="store.metrics" :health="store.health" />

    <section v-if="store.health" class="panel">
      <div class="panel-h">Detalles del nodo</div>
      <div class="details-grid">
        <div class="detail-row">
          <span class="detail-label">Estado</span>
          <StatusBadge :status="store.health.status" />
        </div>
        <div class="detail-row">
          <span class="detail-label">Base de datos</span>
          <StatusBadge :status="store.health.db" />
        </div>
        <div class="detail-row">
          <span class="detail-label">Altura de cadena</span>
          <span class="detail-val">{{ store.health.chainHeight }}</span>
        </div>
      </div>
    </section>
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

/* Bigstat KPI row */
.bigstat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.bigstat {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
}
.lb { font-size: 11.5px; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.04em; }
.vl {
  font-size: 26px; font-weight: 600; letter-spacing: -0.02em; margin: 4px 0;
  color: var(--text); font-variant-numeric: tabular-nums;
  display: inline-flex; align-items: baseline; gap: 6px;
}
.vl-unit { font-size: 14px; font-weight: 400; color: var(--text-2); }
.vl-ok   { color: var(--success); }
.vl-warn { color: var(--warning); }
.vl-err  { color: var(--danger); }
.ds { font-size: 11.5px; color: var(--text-3); }

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
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
.detail-row:last-child { border-bottom: none; }
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

@media (max-width: 900px) { .bigstat-row { grid-template-columns: 1fr 1fr; } }
@media (max-width: 640px) {
  .page-h { flex-direction: column; align-items: flex-start; }
  .bigstat-row { grid-template-columns: 1fr; }
}
</style>
