<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useChainStore } from '@/stores/chain'
import { useMempoolStore } from '@/stores/mempool'
import { useMetricsStore } from '@/stores/metrics'
import ChainList from '@/components/organisms/ChainList.vue'
import MempoolTable from '@/components/organisms/MempoolTable.vue'
import MineBlockFlow from '@/components/flows/MineBlockFlow.vue'
import type { MineBlockData } from '@/components/flows/MineBlockFlow.vue'

const chainStore = useChainStore()
const mempoolStore = useMempoolStore()
const metricsStore = useMetricsStore()

const nodeStatus = computed(() => metricsStore.health?.status ?? null)

const showMineFlow = ref(false)
const mineData = computed<MineBlockData>(() => ({
  nextHeight: (metricsStore.metrics?.chainHeight ?? 0) + 1,
  pendingCount: mempoolStore.count,
  prevHash: '—',
}))

async function refreshAll() {
  await Promise.all([
    chainStore.fetchChain(),
    mempoolStore.fetchPending(),
    metricsStore.fetchAll(),
  ])
}

onMounted(refreshAll)
</script>

<template>
  <div class="dashboard">
    <div class="page-h">
      <div>
        <h1>Dashboard</h1>
        <p>Estado en tiempo real de la cadena</p>
      </div>
      <button class="btn btn-primary btn-sm" type="button" @click="showMineFlow = true">
        <span class="pi pi-bolt" aria-hidden="true" />
        Minar
      </button>
    </div>

    <!-- KPI bigstat row -->
    <div class="bigstat-row">
      <div class="bigstat">
        <div class="lb">Altura</div>
        <div class="vl">{{ metricsStore.metrics?.chainHeight ?? '—' }}</div>
        <div class="ds">bloques confirmados</div>
      </div>
      <div class="bigstat">
        <div class="lb">Mempool</div>
        <div class="vl">{{ mempoolStore.count }}</div>
        <div class="ds">txs pendientes</div>
      </div>
      <div class="bigstat">
        <div class="lb">Avg. minado</div>
        <div class="vl">
          {{ metricsStore.metrics?.avgMineTimeSeconds != null
              ? metricsStore.metrics.avgMineTimeSeconds.toFixed(2)
              : '—' }}<span
            v-if="metricsStore.metrics?.avgMineTimeSeconds != null"
            class="vl-unit"
          >s</span>
        </div>
        <div class="ds">tiempo medio</div>
      </div>
      <div class="bigstat">
        <div class="lb">Nodo</div>
        <div class="vl">
          <span
            class="node-dot"
            :class="nodeStatus === 'ok' ? 'ok' : nodeStatus === 'degraded' ? 'degraded' : 'unknown'"
            aria-hidden="true"
          />
          {{ nodeStatus === 'ok' ? 'Operativo' : nodeStatus === 'degraded' ? 'Degradado' : '—' }}
        </div>
        <div class="ds">
          {{ metricsStore.health?.db === 'ok'
              ? 'DB conectada'
              : metricsStore.health?.db === 'error'
              ? 'DB error'
              : 'DB n/a' }}
        </div>
      </div>
    </div>

    <!-- Content grid -->
    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-h">
          <span>Bloques recientes</span>
          <span class="count-badge sm">{{ chainStore.length }}</span>
        </div>
        <ChainList :blocks="chainStore.recentBlocks" compact />
      </section>

      <section class="panel">
        <div class="panel-h">
          <span>Mempool</span>
          <span class="count-badge sm">{{ mempoolStore.count }}</span>
        </div>
        <MempoolTable :transactions="mempoolStore.transactions" />
      </section>
    </div>

    <MineBlockFlow
      v-if="showMineFlow"
      :data="mineData"
      @close="showMineFlow = false"
      @complete="refreshAll"
    />
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

/* Bigstat KPIs */
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
.lb {
  font-size: 11.5px;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.vl {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 4px 0;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
.vl-unit {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-2);
}
.ds {
  font-size: 11.5px;
  color: var(--text-3);
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

/* Two-column dashboard grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* Local panel/panel-h overrides (header + body container) */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  padding: 0;
  box-shadow: none;
}
.panel-h {
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

@media (max-width: 900px) {
  .bigstat-row     { grid-template-columns: 1fr 1fr; }
  .dashboard-grid  { grid-template-columns: 1fr; }
  .page-h          { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 560px) {
  .bigstat-row { grid-template-columns: 1fr; }
}
</style>
