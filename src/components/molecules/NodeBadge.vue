<script setup lang="ts">
defineProps<{ url: string; online?: boolean }>()
</script>

<template>
  <div class="node-badge">
    <span class="dot" :class="{ online }" />
    <code class="url">{{ url }}</code>
  </div>
</template>

<style scoped>
.node-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}
.dot { width: 8px; height: 8px; border-radius: 50%; background: #94a3b8; }
.dot.online { background: #22c55e; }
.url { color: #1e293b; }
</style>
