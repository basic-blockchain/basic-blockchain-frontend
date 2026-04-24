<script setup lang="ts">
import type { Block } from '@/domain/block'
import HashChip from '@/components/atoms/HashChip.vue'

defineProps<{ block: Block; compact?: boolean }>()

function formatTs(ts: string) {
  return new Date(ts).toLocaleString()
}
</script>

<template>
  <div class="block-card" :class="{ compact }">
    <div class="block-index">#{{ block.index }}</div>
    <div class="block-meta">
      <div class="block-ts">{{ formatTs(block.timestamp) }}</div>
      <div class="block-hash"><HashChip :hash="block.previousHash" /></div>
      <div class="block-proof">Proof: <strong>{{ block.proof }}</strong></div>
    </div>
  </div>
</template>

<style scoped>
.block-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
}
.block-index {
  font-size: 1.25rem;
  font-weight: 700;
  color: #3b82f6;
  min-width: 2.5rem;
}
.block-meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.85rem;
}
.block-ts { color: #64748b; }
.compact .block-meta { gap: 0; }
</style>
