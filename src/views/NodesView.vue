<script setup lang="ts">
import { onMounted } from 'vue'
import { useNodesStore } from '@/stores/nodes'
import NodePanel from '@/components/organisms/NodePanel.vue'

const store = useNodesStore()
onMounted(() => store.fetchNodes())
</script>

<template>
  <div class="nodes-view">
    <div class="page-h">
      <div>
        <h1>Nodos</h1>
        <p>Gestión de peers y consenso de la red</p>
      </div>
      <span class="count-badge">{{ store.peers.length }} peers</span>
    </div>

    <section class="panel">
      <div class="panel-h">Red de nodos</div>
      <div class="panel-body">
        <NodePanel />
      </div>
    </section>
  </div>
</template>

<style scoped>
.nodes-view {
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
.panel-body {
  padding: 16px;
}

@media (max-width: 640px) {
  .page-h { flex-direction: column; align-items: flex-start; }
}
</style>
