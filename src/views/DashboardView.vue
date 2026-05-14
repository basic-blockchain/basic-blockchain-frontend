<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useChainStore } from '@/stores/chain'
import { useMempoolStore } from '@/stores/mempool'
import { useMetricsStore } from '@/stores/metrics'
import ChainList from '@/components/organisms/ChainList.vue'
import MempoolTable from '@/components/organisms/MempoolTable.vue'
import MineButton from '@/components/organisms/MineButton.vue'

const chainStore = useChainStore()
const mempoolStore = useMempoolStore()
const metricsStore = useMetricsStore()

const nodeStatus = computed(() => metricsStore.health?.status ?? null)

onMounted(async () => {
  await Promise.all([
    chainStore.fetchChain(),
    mempoolStore.fetchPending(),
    metricsStore.fetchAll(),
  ])
})
</script>

<template>
  <div class="dashboard">
    <div class="page-h">
      <div>
        <h1>Dashboard</h1>
        <p>Estado en tiempo real de la cadena</p>
      </div>
      <MineButton />
    </div>

    <!-- KPI stat bar -->
    <div class="stats">
      <div class="stat">
        <div class="stat-lbl">Altura de cadena</div>
        <div class="stat-val">{{ metricsStore.metrics?.chainHeight ?? '—' }}</div>
        <div class="stat-sub">bloques confirmados</div>
      </div>
      <div class="stat">
        <div class="stat-lbl">Transacciones pendientes</div>
        <div class="stat-val">{{ metricsStore.metrics?.pendingTransactions ?? '—' }}</div>
        <div class="stat-sub">en mempool</div>
      </div>
      <div class="stat">
        <div class="stat-lbl">Tiempo medio de minado</div>
        <div class="stat-val tnum">
          {{ metricsStore.metrics?.avgMineTimeSeconds != null
              ? metricsStore.metrics.avgMineTimeSeconds.toFixed(2)
              : '—' }}
          <span v-if="metricsStore.metrics?.avgMineTimeSeconds != null" class="stat-unit">s</span>
        </div>
        <div class="stat-sub">últimos bloques</div>
      </div>
      <div class="stat">
        <div class="stat-lbl">Estado del nodo</div>
        <div class="stat-val">
          <span
            class="node-dot"
            :class="nodeStatus === 'ok' ? 'ok' : nodeStatus === 'degraded' ? 'degraded' : 'unknown'"
            aria-hidden="true"
          />
          {{ nodeStatus === 'ok' ? 'Operativo' : nodeStatus === 'degraded' ? 'Degradado' : '—' }}
        </div>
        <div class="stat-sub">{{ metricsStore.health?.db === 'ok' ? 'DB conectada' : metricsStore.health?.db === 'error' ? 'DB error' : 'DB n/a' }}</div>
      </div>
    </div>

    <!-- Content grid -->
    <div class="dashboard-grid">
      <section class="panel-section">
        <div class="section-h">
          <span>Bloques recientes</span>
          <span class="count-badge">{{ chainStore.length }}</span>
        </div>
        <div class="table-wrap">
          <ChainList :blocks="chainStore.recentBlocks" compact />
        </div>
      </section>

      <section class="panel-section">
        <div class="section-h">
          <span>Mempool</span>
          <span class="count-badge">{{ mempoolStore.count }}</span>
        </div>
        <div class="table-wrap">
          <MempoolTable :transactions="mempoolStore.transactions" />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
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
  color: var(--text-2);
  font-size: 13px;
}

/* KPI stats — reuse design system classes via deep selector */
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.stat {
  background: var(--surface);
  padding: 14px 16px 16px;
}
.stat-lbl {
  font-size: 11.5px;
  color: var(--text-2);
  font-weight: 500;
}
.stat-val {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.stat-unit {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-2);
}
.stat-sub {
  font-size: 11.5px;
  color: var(--text-3);
  margin-top: 4px;
}

.node-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-bottom: 2px;
}
.node-dot.ok       { background: var(--success); box-shadow: 0 0 0 3px var(--success-soft); }
.node-dot.degraded { background: var(--warning); box-shadow: 0 0 0 3px var(--warning-soft); }
.node-dot.unknown  { background: var(--border-strong); }

/* Content grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.panel-section {
  background: var(--surface);
  display: flex;
  flex-direction: column;
}
.section-h {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}

.table-wrap {
  flex: 1;
  overflow: hidden;
}

@media (max-width: 900px) {
  .stats            { grid-template-columns: 1fr 1fr; }
  .dashboard-grid   { grid-template-columns: 1fr; }
  .page-h           { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 560px) {
  .stats { grid-template-columns: 1fr; }
}
</style>
