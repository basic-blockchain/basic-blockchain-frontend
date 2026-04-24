<script setup lang="ts">
defineProps<{ label: string; value: string | number | null; unit?: string }>()
</script>

<template>
  <div class="metric-tile">
    <div class="value">
      {{ value ?? '—' }}<span v-if="unit" class="unit">{{ unit }}</span>
    </div>
    <div class="label">{{ label }}</div>
  </div>
</template>

<style scoped>
.metric-tile {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
  min-width: 120px;
}
.value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-strong);
  font-variant-numeric: tabular-nums;
}
.unit { font-size: 0.8rem; color: var(--text-body); margin-left: 0.2rem; font-weight: 400; }
.label {
  font-size: 0.72rem;
  color: var(--text-body);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
