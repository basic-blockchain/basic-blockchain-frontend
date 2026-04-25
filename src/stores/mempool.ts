import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getPending, addTransaction } from '@/api/mempool'
import { validateTransaction } from '@/domain/transaction'
import type { Transaction } from '@/domain/transaction'

export const useMempoolStore = defineStore('mempool', () => {
  const transactions = ref<Transaction[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const count = computed(() => transactions.value.length)

  async function fetchPending() {
    loading.value = true
    error.value = null
    try {
      const result = await getPending()
      transactions.value = result.transactions
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch mempool'
    } finally {
      loading.value = false
    }
  }

  async function submitTransaction(tx: Transaction): Promise<void> {
    const errors = validateTransaction(tx)
    if (errors.length > 0) throw new Error(errors.map((e) => e.message).join(', '))
    await addTransaction(tx)
    await fetchPending()
  }

  function clear() {
    transactions.value = []
  }

  return { transactions, loading, error, count, fetchPending, submitTransaction, clear }
})
