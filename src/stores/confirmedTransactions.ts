import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ConfirmedTransaction, Transaction } from '@/domain/transaction'

export const useConfirmedTransactionsStore = defineStore('confirmedTransactions', () => {
  const records = ref<ConfirmedTransaction[]>([])

  const total = computed(() => records.value.length)

  function addFromBlock(blockIndex: number, blockTimestamp: string, txs: Transaction[]) {
    const incoming = txs.map((tx) => ({ ...tx, blockIndex, blockTimestamp }))
    records.value.push(...incoming)
  }

  function clear() {
    records.value = []
  }

  return { records, total, addFromBlock, clear }
})
