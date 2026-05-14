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
      <button class="btn-ghost" type="button" :disabled="store.loading" @click="store.fetchAll()">
        <span class="pi pi-refresh" :class="{ 'pi-spin': store.loading }" aria-hidden="true" />
        Actualizar
      </button>
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

.btn-ghost {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  font-family: var(--font-sans);
}
.btn-ghost:hover:not(:disabled) {
  background: var(--hover);
  color: var(--text);
}
.btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

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

@media (max-width: 640px) {
  .page-h { flex-direction: column; align-items: flex-start; }
}
</style>
