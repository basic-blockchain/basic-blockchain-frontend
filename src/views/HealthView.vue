<script setup lang="ts">
import { onMounted } from 'vue'
import { useMetricsStore } from '@/stores/metrics'
import MetricsBar from '@/components/organisms/MetricsBar.vue'
import StatusBadge from '@/components/atoms/StatusBadge.vue'
import Button from 'primevue/button'

const store = useMetricsStore()

onMounted(() => store.fetchAll())
</script>

<template>
  <div class="health-view">
    <div class="header">
      <h1>Health & Metrics</h1>
      <Button
        label="Refresh"
        icon="pi pi-refresh"
        severity="secondary"
        :loading="store.loading"
        @click="store.fetchAll()"
      />
    </div>
    <MetricsBar :metrics="store.metrics" :health="store.health" />
    <section v-if="store.health" class="panel">
      <h2>Node Details</h2>
      <dl>
        <dt>Status</dt>
        <dd><StatusBadge :status="store.health.status" /></dd>
        <dt>Database</dt>
        <dd><StatusBadge :status="store.health.db" /></dd>
        <dt>Chain Height</dt>
        <dd>{{ store.health.chainHeight }}</dd>
      </dl>
    </section>
  </div>
</template>

<style scoped>
.health-view { display: flex; flex-direction: column; gap: 1.5rem; }
.header { display: flex; justify-content: space-between; align-items: center; }
.panel {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius);
  padding: 1.25rem;
  box-shadow: var(--shadow-soft);
}
dl { display: grid; grid-template-columns: 160px 1fr; gap: 0.5rem 1rem; }
dt { font-weight: 600; color: var(--text-body); }
dd { margin: 0; }
</style>
