<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type { ConfirmedTransaction } from '@/domain/transaction'

defineProps<{ transactions: ConfirmedTransaction[] }>()
</script>

<template>
  <DataTable
    :value="transactions"
    :rows="10"
    paginator
    striped-rows
    class="confirmed-table"
    empty-message="No confirmed transactions yet — mine a block to populate this table."
  >
    <Column
      field="blockIndex"
      header="Block"
      sortable
    >
      <template #body="{ data }">
        <span class="block-badge">#{{ data.blockIndex }}</span>
      </template>
    </Column>
    <Column
      field="sender"
      header="Sender"
      sortable
    />
    <Column
      field="receiver"
      header="Receiver"
      sortable
    />
    <Column
      field="amount"
      header="Amount"
      sortable
    >
      <template #body="{ data }">
        {{ data.amount.toLocaleString() }} <span class="unit">BTC</span>
      </template>
    </Column>
    <Column
      field="blockTimestamp"
      header="Confirmed at"
      sortable
    >
      <template #body="{ data }">
        {{ new Date(data.blockTimestamp).toLocaleString() }}
      </template>
    </Column>
  </DataTable>
</template>

<style scoped>
.block-badge {
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 0.8rem;
  padding: 0.1rem 0.45rem;
  border-radius: 8px;
  border: 1px solid rgba(180, 169, 230, 0.32);
}
.unit {
  font-size: 0.78rem;
  color: var(--text-muted);
}
</style>
