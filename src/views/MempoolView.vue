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
    <div class="page-h">
      <div>
        <h1>Mempool</h1>
        <p>Transacciones pendientes de confirmación</p>
      </div>
      <span class="count-badge">{{ store.count }} pendientes</span>
    </div>

    <section class="panel">
      <div class="panel-h">
        <span>Transacciones pendientes</span>
        <span class="count-badge sm">{{ store.count }}</span>
      </div>
      <MempoolTable :transactions="store.transactions" />
    </section>

    <section class="panel">
      <div class="panel-h">
        <span>Historial de transacciones</span>
        <span v-if="confirmedStore.total > 0" class="count-badge sm">{{ confirmedStore.total }}</span>
      </div>
      <ConfirmedTransactionsTable :transactions="confirmedStore.records" />
    </section>
  </div>
</template>

<style scoped>
.mempool-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-h {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}
.page-h h1 {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.015em;
  margin: 0 0 2px;
  color: var(--text);
}
.page-h p {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.panel-h {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}

.count-badge.sm {
  font-size: 11px;
  padding: 1px 7px;
}

@media (max-width: 640px) {
  .page-h { flex-direction: column; align-items: flex-start; }
}
</style>
