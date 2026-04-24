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
  background: #fff;
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.count {
  background: #3b82f6;
  color: #fff;
  font-size: 0.8rem;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  margin-left: 0.5rem;
  vertical-align: middle;
}
</style>
