<script setup lang="ts">
import { computed } from 'vue'
import { useToast } from '@/composables/useToast'
import { formatHash } from '@/domain/block'

const props = withDefaults(
  defineProps<{ hash: string; full?: boolean; length?: number; label?: string }>(),
  {
    length: 12,
    label: 'hash',
  }
)
const display = computed(() => (props.full ? props.hash : formatHash(props.hash, props.length)))
const toast = useToast()

async function copy() {
  if (!navigator.clipboard) {
    toast.add({
      severity: 'warn',
      summary: 'No se pudo copiar',
      detail: 'Clipboard no disponible en este navegador.',
      life: 3000,
    })
    return
  }
  try {
    await navigator.clipboard.writeText(props.hash)
    toast.add({
      severity: 'success',
      summary: `${props.label.charAt(0).toUpperCase() + props.label.slice(1)} copiado`,
      detail: display.value,
      life: 2000,
    })
  } catch {
    toast.add({
      severity: 'error',
      summary: 'No se pudo copiar',
      detail: 'El portapapeles rechazó la operación.',
      life: 3000,
    })
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
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.15rem 0.5rem;
  cursor: pointer;
  color: var(--text-2);
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease;
}
.chip:hover,
.chip:focus-visible {
  background: var(--hover);
  border-color: var(--accent);
  color: var(--text);
  outline: none;
}
.chip:focus-visible {
  box-shadow: 0 0 0 2px var(--accent-soft, transparent);
}
.chip code {
  font-family: var(--font-mono);
}
.copy-icon {
  font-size: 0.7rem;
  color: var(--text-3);
}
.chip:hover .copy-icon,
.chip:focus-visible .copy-icon {
  color: var(--accent);
}
</style>
