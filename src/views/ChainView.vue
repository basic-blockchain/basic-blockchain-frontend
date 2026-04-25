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
    <h1>Chain <span class="count">{{ store.length }}</span></h1>
    <section class="panel">
      <h2>Mine Time (last 20)</h2>
      <MiningChart :blocks="store.blocks" />
    </section>
    <section class="panel">
      <h2>All Blocks</h2>
      <ChainList :blocks="[...store.blocks].reverse()" />
    </section>
  </div>
</template>

<style scoped>
.chain-view { display: flex; flex-direction: column; gap: 1.5rem; }
.panel {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius);
  padding: 1.25rem;
  box-shadow: var(--shadow-soft);
}
.count {
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 0.8rem;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  margin-left: 0.5rem;
  vertical-align: middle;
  border: 1px solid rgba(180, 169, 230, 0.32);
}
</style>
