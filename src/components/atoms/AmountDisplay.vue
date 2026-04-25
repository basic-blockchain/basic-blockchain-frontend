<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ amount: number; precision?: number; unit?: string }>(), {
  precision: 4,
  unit: '',
})

const formatted = computed(() => props.amount.toFixed(props.precision))
</script>

<template>
  <span class="amount">
    <span class="value">{{ formatted }}</span>
    <span
      v-if="unit"
      class="unit"
    >{{ unit }}</span>
  </span>
</template>

<style scoped>
.amount { font-variant-numeric: tabular-nums; font-weight: 500; }
.unit { margin-left: 0.25rem; font-size: 0.75rem; color: #64748b; }
</style>
