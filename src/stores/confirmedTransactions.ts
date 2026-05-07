import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getConfirmed } from '@/api/mempool'
import type { ConfirmedTransaction, Transaction } from '@/domain/transaction'

// Phase H+ note: backend v0.10.0 also exposes confirmed transactions nested
// under `block.transactions` on every chain entry, so this store and the
// chain store now hold redundant copies of the same data. The flat
// `/api/v1/transactions` endpoint is kept (it predates v0.10.0 and the
// frontend already paginates / sorts on this denormalised list), but the
// chain itself remains the source of truth — derive from `useChainStore`
// when the redundancy becomes a problem.
export const useConfirmedTransactionsStore = defineStore('confirmedTransactions', () => {
  const records = ref<ConfirmedTransaction[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const total = computed(() => records.value.length)

  function addFromBlock(blockIndex: number, blockTimestamp: string, txs: Transaction[]) {
    const incoming = txs.map((tx) => ({ ...tx, blockIndex, blockTimestamp }))
    records.value.push(...incoming)
  }

  async function fetchConfirmed() {
    loading.value = true
    error.value = null
    try {
      const result = await getConfirmed()
      records.value = result.transactions
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch confirmed transactions'
    } finally {
      loading.value = false
    }
  }

  function clear() {
    records.value = []
  }

  return { records, loading, error, total, addFromBlock, fetchConfirmed, clear }
})
