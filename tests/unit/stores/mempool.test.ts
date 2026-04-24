import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMempoolStore } from '@/stores/mempool'
import * as mempoolApi from '@/api/mempool'
import type { Transaction } from '@/domain/transaction'

const tx: Transaction = { sender: 'alice', receiver: 'bob', amount: 5 }

describe('useMempoolStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('fetchPending populates transactions', async () => {
    vi.spyOn(mempoolApi, 'getPending').mockResolvedValue({ transactions: [tx], count: 1 })
    const store = useMempoolStore()
    await store.fetchPending()
    expect(store.count).toBe(1)
  })

  it('submitTransaction rejects invalid input without calling API', async () => {
    const spy = vi.spyOn(mempoolApi, 'addTransaction')
    const store = useMempoolStore()
    await expect(
      store.submitTransaction({ sender: 'a', receiver: 'a', amount: 0 })
    ).rejects.toThrow()
    expect(spy).not.toHaveBeenCalled()
  })

  it('clear resets transactions', () => {
    const store = useMempoolStore()
    store.transactions = [tx]
    store.clear()
    expect(store.count).toBe(0)
  })
})
