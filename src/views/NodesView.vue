<script setup lang="ts">
import { onMounted } from 'vue'
import { useNodesStore } from '@/stores/nodes'
import NodePanel from '@/components/organisms/NodePanel.vue'

const store = useNodesStore()
onMounted(() => store.fetchNodes())
</script>

<template>
  <div class="nodes-view">
    <h1>Nodes</h1>
    <section class="panel">
      <NodePanel />
    </section>
  </div>
</template>

<style scoped>
.nodes-view { display: flex; flex-direction: column; gap: 1.5rem; }
.panel {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius);
  padding: 1.25rem;
  box-shadow: var(--shadow-soft);
}
</style>
