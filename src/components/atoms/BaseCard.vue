<script setup lang="ts">
defineProps<{
  padding?: 'default' | 'none' | 'sm'
}>()
</script>

<template>
  <div class="card" :class="padding === 'none' ? 'card-no-pad' : padding === 'sm' ? 'card-sm-pad' : ''">
    <slot />
  </div>
</template>

<style scoped>
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 14px 16px;
}
.card-no-pad {
  padding: 0;
  overflow: hidden;
}
.card-sm-pad {
  padding: 8px 12px;
}
</style>
