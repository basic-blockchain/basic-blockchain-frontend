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
  background: #fff;
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
</style>
