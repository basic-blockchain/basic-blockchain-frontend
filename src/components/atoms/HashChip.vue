<script setup lang="ts">
import { computed } from 'vue'
import { formatHash } from '@/domain/block'

const props = defineProps<{ hash: string; full?: boolean }>()
const display = computed(() => (props.full ? props.hash : formatHash(props.hash)))

async function copy() {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(props.hash)
  }
}
</script>

<template>
  <span
    class="chip"
    :title="hash"
    @click="copy"
  >
    <code>{{ display }}</code>
    <span class="pi pi-copy copy-icon" />
  </span>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  background: var(--surface-soft);
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  padding: 0.15rem 0.5rem;
  cursor: pointer;
  color: var(--text-body);
  transition: border-color 0.15s ease, background 0.15s ease;
}
.chip:hover {
  background: #262844;
  border-color: var(--primary);
  color: var(--text-strong);
}
.copy-icon { font-size: 0.7rem; color: var(--text-muted); }
</style>
