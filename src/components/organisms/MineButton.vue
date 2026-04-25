<script setup lang="ts">
import { ref } from 'vue'
import { mineBlock } from '@/api/mining'
import Button from 'primevue/button'
import { useToast } from '@/composables/useToast'
import { useChainStore } from '@/stores/chain'
import { useMempoolStore } from '@/stores/mempool'
import { useMetricsStore } from '@/stores/metrics'

const loading = ref(false)
const toast = useToast()
const chainStore = useChainStore()
const mempoolStore = useMempoolStore()
const metricsStore = useMetricsStore()

async function mine() {
  if (loading.value) return
  loading.value = true
  try {
    const { block, transactions } = await mineBlock()
    chainStore.appendBlock(block)
    await Promise.all([mempoolStore.fetchPending(), metricsStore.fetchAll()])
    const detail =
      transactions.length > 0
        ? `${transactions.length} transaction(s) included and removed from mempool`
        : 'Empty block (no pending transactions)'
    toast.success(`Block #${block.index} mined`, detail)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Mining failed'
    toast.error('Mining failed', msg)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Button
    :loading="loading"
    label="Mine Block"
    icon="pi pi-hammer"
    severity="primary"
    @click="mine"
  />
</template>
