<script setup lang="ts">
import type { Block } from '@/domain/block'
import HashChip from '@/components/atoms/HashChip.vue'

defineProps<{ block: Block; compact?: boolean }>()

function formatTs(ts: string) {
  return new Date(ts).toLocaleString()
}
</script>

<template>
  <div
    class="block-card"
    :class="{ compact }"
  >
    <div class="block-index">
      #{{ block.index }}
    </div>
    <div class="block-meta">
      <div class="block-ts">
        {{ formatTs(block.timestamp) }}
      </div>
      <div class="block-hash">
        <span class="label">prev</span>
        <HashChip :hash="block.previousHash" />
      </div>
      <div
        v-if="block.merkleRoot"
        class="block-hash"
      >
        <span class="label">merkle</span>
        <HashChip :hash="block.merkleRoot" />
        <span class="tx-count">
          {{ block.transactions.length }} tx{{ block.transactions.length === 1 ? '' : 's' }}
        </span>
      </div>
      <div class="block-proof">
        Proof: <strong>{{ block.proof }}</strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
.block-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  background: var(--surface-soft);
}
.block-index {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary-alt);
  min-width: 2.5rem;
}
.block-meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.85rem;
}
.block-ts { color: var(--text-body); }
.block-hash { display: flex; align-items: center; gap: 0.4rem; }
.label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}
.tx-count {
  font-size: 0.75rem;
  color: var(--text-muted);
  padding-left: 0.25rem;
}
.compact .block-meta { gap: 0; }
</style>
