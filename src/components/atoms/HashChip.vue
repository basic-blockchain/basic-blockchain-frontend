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
  background: #f1f5f9;
  border-radius: 4px;
  padding: 0.15rem 0.5rem;
  cursor: pointer;
}
.chip:hover { background: #e2e8f0; }
.copy-icon { font-size: 0.7rem; opacity: 0.5; }
</style>
