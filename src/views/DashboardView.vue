<script setup lang="ts">
import { onMounted } from 'vue'
import { useChainStore } from '@/stores/chain'
import { useMempoolStore } from '@/stores/mempool'
import { useMetricsStore } from '@/stores/metrics'
import MetricsBar from '@/components/organisms/MetricsBar.vue'
import ChainList from '@/components/organisms/ChainList.vue'
import MempoolTable from '@/components/organisms/MempoolTable.vue'
import MineButton from '@/components/organisms/MineButton.vue'

const chainStore = useChainStore()
const mempoolStore = useMempoolStore()
const metricsStore = useMetricsStore()

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
    <div class="dashboard-header">
      <h1>Dashboard</h1>
      <MineButton />
    </div>
    <MetricsBar :metrics="metricsStore.metrics" :health="metricsStore.health" />
    <div class="dashboard-grid">
      <section class="panel">
        <h2>Recent Blocks</h2>
        <ChainList :blocks="chainStore.recentBlocks" compact />
      </section>
      <section class="panel">
        <h2>Mempool <span class="badge">{{ mempoolStore.count }}</span></h2>
        <MempoolTable :transactions="mempoolStore.transactions" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: 1.5rem; }
.dashboard-header { display: flex; justify-content: space-between; align-items: center; }
.dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.panel {
  background: #fff;
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.badge {
  background: #3b82f6;
  color: #fff;
  font-size: 0.75rem;
  padding: 0.1rem 0.4rem;
  border-radius: 10px;
  margin-left: 0.4rem;
}
@media (max-width: 900px) {
  .dashboard-grid { grid-template-columns: 1fr; }
}
</style>
