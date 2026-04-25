<script setup lang="ts">
import type { Transaction } from '@/domain/transaction'
import AmountDisplay from '@/components/atoms/AmountDisplay.vue'

defineProps<{ transaction: Transaction; status?: 'pending' | 'confirmed' }>()
</script>

<template>
  <div class="tx-row">
    <span class="party">{{ transaction.sender }}</span>
    <span class="arrow pi pi-arrow-right" />
    <span class="party">{{ transaction.receiver }}</span>
    <AmountDisplay :amount="transaction.amount" />
    <span
      class="status"
      :class="status ?? 'pending'"
    >{{ status ?? 'pending' }}</span>
  </div>
</template>

<style scoped>
.tx-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.85rem;
}
.party { font-weight: 500; }
.arrow { color: #94a3b8; font-size: 0.7rem; }
.status {
  margin-left: auto;
  font-size: 0.7rem;
  text-transform: uppercase;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
}
.status.pending { background: #fef9c3; color: #854d0e; }
.status.confirmed { background: #dcfce7; color: #166534; }
</style>
