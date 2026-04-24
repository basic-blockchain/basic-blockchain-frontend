<script setup lang="ts">
import type { Transaction } from '@/domain/transaction'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

defineProps<{ transactions: Transaction[] }>()
</script>

<template>
  <DataTable :value="transactions" size="small" striped-rows>
    <Column field="sender" header="Sender" />
    <Column field="receiver" header="Receiver" />
    <Column field="amount" header="Amount">
      <template #body="{ data }">{{ Number(data.amount).toFixed(4) }}</template>
    </Column>
    <template #empty>Mempool is empty.</template>
  </DataTable>
</template>
