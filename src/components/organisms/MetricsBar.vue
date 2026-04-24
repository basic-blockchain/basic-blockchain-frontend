<script setup lang="ts">
import type { Metrics, Health } from '@/domain/metrics'
import StatusBadge from '@/components/atoms/StatusBadge.vue'
import MetricTile from '@/components/molecules/MetricTile.vue'

defineProps<{ metrics: Metrics | null; health: Health | null }>()
</script>

<template>
  <div class="metrics-bar">
    <MetricTile label="Chain Height" :value="metrics?.chainHeight ?? null" />
    <MetricTile label="Pending Txs" :value="metrics?.pendingTransactions ?? null" />
    <MetricTile
      label="Avg Mine Time"
      :value="metrics?.avgMineTimeSeconds !== null && metrics?.avgMineTimeSeconds !== undefined
        ? metrics.avgMineTimeSeconds.toFixed(2)
        : null"
      unit="s"
    />
    <div class="metric status-metric">
      <StatusBadge v-if="health" :status="health.status" />
      <span v-else class="dash">—</span>
      <div class="label">Node Status</div>
    </div>
    <div class="metric status-metric">
      <StatusBadge v-if="health" :status="health.db" />
      <span v-else class="dash">—</span>
      <div class="label">Database</div>
    </div>
  </div>
</template>

<style scoped>
.metrics-bar {
  display: flex;
  gap: 1.5rem;
  background: #fff;
  border-radius: 8px;
  padding: 1rem 1.5rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  flex-wrap: wrap;
}
.metric {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
}
.status-metric { justify-content: center; }
.dash { font-size: 1.5rem; font-weight: 700; color: #1e293b; }
.label {
  font-size: 0.72rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
