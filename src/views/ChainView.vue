<script setup lang="ts">
import { onMounted } from 'vue'
import { useChainStore } from '@/stores/chain'
import ChainList from '@/components/organisms/ChainList.vue'
import MiningChart from '@/components/organisms/MiningChart.vue'

const store = useChainStore()

onMounted(() => store.fetchChain())
</script>

<template>
  <div class="chain-view">
    <div class="page-h">
      <div>
        <h1>Cadena de bloques</h1>
        <p>Historial completo de bloques confirmados</p>
      </div>
      <span class="count-badge">{{ store.length }} bloques</span>
    </div>

    <section class="panel">
      <div class="panel-h">Tiempo de minado (últimos 20)</div>
      <div class="chart-wrap">
        <MiningChart :blocks="store.blocks" />
      </div>
    </section>

    <section class="panel">
      <div class="panel-h">Todos los bloques</div>
      <ChainList :blocks="[...store.blocks].reverse()" />
    </section>
  </div>
</template>

<style scoped>
.chain-view {
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
.chart-wrap {
  padding: 16px;
}

@media (max-width: 640px) {
  .page-h { flex-direction: column; align-items: flex-start; }
}
</style>
