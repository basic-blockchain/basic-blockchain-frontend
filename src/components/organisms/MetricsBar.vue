<script setup lang="ts">
import type { Metrics, Health } from '@/domain/metrics'
import StatusBadge from '@/components/atoms/StatusBadge.vue'
import MetricTile from '@/components/molecules/MetricTile.vue'

defineProps<{ metrics: Metrics | null; health: Health | null }>()
</script>

<template>
  <div
    class="metrics-bar"
    role="region"
    aria-label="Blockchain metrics"
    aria-live="polite"
    aria-atomic="false"
  >
    <MetricTile
      label="Chain Height"
      :value="metrics?.chainHeight ?? null"
    />
    <MetricTile
      label="Pending Txs"
      :value="metrics?.pendingTransactions ?? null"
    />
    <MetricTile
      label="Avg Mine Time"
      :value="metrics?.avgMineTimeSeconds !== null && metrics?.avgMineTimeSeconds !== undefined
        ? metrics.avgMineTimeSeconds.toFixed(2)
        : null"
      unit="s"
    />
    <div class="metric status-metric">
      <StatusBadge
        v-if="health"
        :status="health.status"
      />
      <span
        v-else
        class="dash"
      >—</span>
      <div class="label">
        Node Status
      </div>
    </div>
    <div class="metric status-metric">
      <StatusBadge
        v-if="health"
        :status="health.db"
      />
      <span
        v-else
        class="dash"
      >—</span>
      <div class="label">
        Database
      </div>
    </div>
  </div>
</template>

<style scoped>
.metrics-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 1rem 1.5rem;
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius);
  padding: 1rem 1.5rem;
  box-shadow: var(--shadow-soft);
}
.metric {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
}
.status-metric { justify-content: center; }
.dash { font-size: 1.5rem; font-weight: 700; color: var(--text-strong); }
.label {
  font-size: 0.72rem;
  color: var(--text-body);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
