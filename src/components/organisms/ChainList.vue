<script setup lang="ts">
import type { Block } from '@/domain/block'
import BlockCard from '@/components/molecules/BlockCard.vue'

defineProps<{ blocks: Block[]; compact?: boolean }>()
</script>

<template>
  <div class="chain-list">
    <div v-if="blocks.length === 0" class="empty">No blocks yet.</div>
    <TransitionGroup name="block-slide" tag="div" class="list-inner">
      <BlockCard
        v-for="block in blocks"
        :key="block.index"
        :block="block"
        :compact="compact"
      />
    </TransitionGroup>
  </div>
</template>

<style scoped>
.chain-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
}
.list-inner { display: flex; flex-direction: column; gap: 0.5rem; }
.empty { color: var(--text-muted); text-align: center; padding: 2rem; }
.block-slide-enter-active { transition: all 0.3s ease; }
.block-slide-enter-from { opacity: 0; transform: translateY(-12px); }
</style>
