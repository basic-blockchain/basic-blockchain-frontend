<script setup lang="ts">
import { onMounted } from 'vue'
import { useMempoolStore } from '@/stores/mempool'
import { useConfirmedTransactionsStore } from '@/stores/confirmedTransactions'
import MempoolTable from '@/components/organisms/MempoolTable.vue'
import ConfirmedTransactionsTable from '@/components/organisms/ConfirmedTransactionsTable.vue'

const store = useMempoolStore()
const confirmedStore = useConfirmedTransactionsStore()

onMounted(() => {
  store.fetchPending()
  confirmedStore.fetchConfirmed()
})
</script>

<template>
  <div class="mempool-view">
    <h1>Mempool <span class="count">{{ store.count }}</span></h1>
    <section class="panel">
      <h2>Pending Transactions</h2>
      <MempoolTable :transactions="store.transactions" />
    </section>
    <section class="panel">
      <h2>
        Transaction History
        <span
          v-if="confirmedStore.total > 0"
          class="count"
        >{{ confirmedStore.total }}</span>
      </h2>
      <ConfirmedTransactionsTable :transactions="confirmedStore.records" />
    </section>
  </div>
</template>

<style scoped>
.mempool-view { display: flex; flex-direction: column; gap: 1.5rem; }
.panel {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius);
  padding: 1.25rem;
  box-shadow: var(--shadow-soft);
}
.count {
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 0.8rem;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  margin-left: 0.5rem;
  vertical-align: middle;
  border: 1px solid rgba(180, 169, 230, 0.32);
}
</style>
