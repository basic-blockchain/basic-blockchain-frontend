import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConfirmedTransactionsStore } from '@/stores/confirmedTransactions'
import * as mempoolApi from '@/api/mempool'
import type { Transaction } from '@/domain/transaction'

const txA: Transaction = { sender: 'alice', receiver: 'bob', amount: 10 }
const txB: Transaction = { sender: 'carol', receiver: 'dave', amount: 5 }

describe('useConfirmedTransactionsStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('addFromBlock persists transactions with block metadata', () => {
    const store = useConfirmedTransactionsStore()
    store.addFromBlock(3, '2026-01-03T00:00:00', [txA, txB])

    expect(store.total).toBe(2)
    expect(store.records[0]).toMatchObject({ ...txA, blockIndex: 3, blockTimestamp: '2026-01-03T00:00:00' })
    expect(store.records[1]).toMatchObject({ ...txB, blockIndex: 3 })
  })

  it('addFromBlock appends across multiple blocks', () => {
    const store = useConfirmedTransactionsStore()
    store.addFromBlock(1, '2026-01-01T00:00:00', [txA])
    store.addFromBlock(2, '2026-01-02T00:00:00', [txB])

    expect(store.total).toBe(2)
    expect(store.records[0].blockIndex).toBe(1)
    expect(store.records[1].blockIndex).toBe(2)
  })

  it('addFromBlock with empty array does not change total', () => {
    const store = useConfirmedTransactionsStore()
    store.addFromBlock(5, '2026-01-05T00:00:00', [])
    expect(store.total).toBe(0)
  })

  it('clear resets all records', () => {
    const store = useConfirmedTransactionsStore()
    store.addFromBlock(1, '2026-01-01T00:00:00', [txA])
    store.clear()
    expect(store.total).toBe(0)
    expect(store.records).toHaveLength(0)
  })

  it('fetchConfirmed loads records from the API and replaces local state', async () => {
    vi.spyOn(mempoolApi, 'getConfirmed').mockResolvedValue({
      count: 2,
      transactions: [
        { ...txA, blockIndex: 1, blockTimestamp: '2026-01-01T00:00:00' },
        { ...txB, blockIndex: 2, blockTimestamp: '2026-01-02T00:00:00' },
      ],
    })

    const store = useConfirmedTransactionsStore()
    store.addFromBlock(99, '2026-01-99T00:00:00', [txA])
    await store.fetchConfirmed()

    expect(store.total).toBe(2)
    expect(store.records[0]).toMatchObject({ sender: 'alice', blockIndex: 1 })
    expect(store.records[1]).toMatchObject({ sender: 'carol', blockIndex: 2 })
    expect(store.error).toBeNull()
  })

  it('fetchConfirmed records error message on failure', async () => {
    vi.spyOn(mempoolApi, 'getConfirmed').mockRejectedValue(new Error('network down'))
    const store = useConfirmedTransactionsStore()
    await store.fetchConfirmed()
    expect(store.error).toBe('network down')
  })
})
