<script setup lang="ts">
import { computed } from 'vue'
import { formatHash } from '@/domain/block'

const props = withDefaults(
  defineProps<{ hash: string; full?: boolean; length?: number; label?: string }>(),
  {
    length: 12,
    label: 'hash',
  }
)
const display = computed(() => (props.full ? props.hash : formatHash(props.hash, props.length)))

async function copy() {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(props.hash)
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    void copy()
  }
}
</script>

<template>
  <span
    class="chip"
    :title="hash"
    role="button"
    tabindex="0"
    :aria-label="`Copy ${label} ${hash}`"
    @click="copy"
    @keydown="onKeydown"
  >
    <code>{{ display }}</code>
    <span class="pi pi-copy copy-icon" aria-hidden="true" />
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
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}
.chip:hover {
  background: #262844;
  border-color: var(--primary);
  color: var(--text-strong);
}
.copy-icon {
  font-size: 0.7rem;
  color: var(--text-muted);
}
</style>
