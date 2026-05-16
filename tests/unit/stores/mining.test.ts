import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMiningStore } from '@/stores/mining'
import { useChainStore } from '@/stores/chain'
import { useMempoolStore } from '@/stores/mempool'
import { useMetricsStore } from '@/stores/metrics'
import { useConfirmedTransactionsStore } from '@/stores/confirmedTransactions'
import * as miningApi from '@/api/mining'
import type { Block } from '@/domain/block'
import type { Transaction } from '@/domain/transaction'

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}))

const block: Block = {
  index: 7,
  timestamp: '2026-01-01T00:00:00Z',
  proof: 42,
  previousHash: 'prev',
  merkleRoot: 'merkle',
  transactions: [],
}

const tx: Transaction = { sender: 'a', receiver: 'b', amount: 1 }

describe('useMiningStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('mine() success path: updates chain, confirms tx, resets state', async () => {
    const mineSpy = vi.spyOn(miningApi, 'mineBlock').mockResolvedValue({
      block, transactions: [tx],
    })
    const chain = useChainStore()
    const mempool = useMempoolStore()
    const metrics = useMetricsStore()
    const confirmed = useConfirmedTransactionsStore()
    const appendSpy = vi.spyOn(chain, 'appendBlock')
    const confirmSpy = vi.spyOn(confirmed, 'addFromBlock')
    vi.spyOn(mempool, 'fetchPending').mockResolvedValue()
    vi.spyOn(metrics, 'fetchAll').mockResolvedValue()

    const store = useMiningStore()
    const minePromise = store.mine()
    // Allow the awaited microtasks to advance up to the post-mining setTimeout.
    await vi.advanceTimersByTimeAsync(0)
    expect(store.isRunning).toBe(true)
    expect(mineSpy).toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1100)
    await minePromise

    expect(appendSpy).toHaveBeenCalledWith(block)
    expect(confirmSpy).toHaveBeenCalledWith(block.index, block.timestamp, [tx])
    expect(store.isRunning).toBe(false)
    expect(store.progress).toBe(0)
    expect(store.error).toBeNull()
  })

  it('mine() empty block path: skips confirmedStore.addFromBlock', async () => {
    vi.spyOn(miningApi, 'mineBlock').mockResolvedValue({
      block, transactions: [],
    })
    const confirmed = useConfirmedTransactionsStore()
    const confirmSpy = vi.spyOn(confirmed, 'addFromBlock')
    const mempool = useMempoolStore()
    const metrics = useMetricsStore()
    vi.spyOn(mempool, 'fetchPending').mockResolvedValue()
    vi.spyOn(metrics, 'fetchAll').mockResolvedValue()

    const store = useMiningStore()
    const minePromise = store.mine()
    await vi.advanceTimersByTimeAsync(1100)
    await minePromise

    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it('mine() failure path: records error and clears running flag', async () => {
    vi.spyOn(miningApi, 'mineBlock').mockRejectedValue(new Error('rpc down'))

    const store = useMiningStore()
    const minePromise = store.mine()
    await vi.advanceTimersByTimeAsync(1100)
    await minePromise

    expect(store.error).toBe('rpc down')
    expect(store.isRunning).toBe(false)
  })

  it('mine() ignores re-entry while already running', async () => {
    const mineSpy = vi.spyOn(miningApi, 'mineBlock').mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ block, transactions: [] }), 200),
        ),
    )
    const mempool = useMempoolStore()
    const metrics = useMetricsStore()
    vi.spyOn(mempool, 'fetchPending').mockResolvedValue()
    vi.spyOn(metrics, 'fetchAll').mockResolvedValue()

    const store = useMiningStore()
    const first = store.mine()
    const second = store.mine()
    await vi.advanceTimersByTimeAsync(2000)
    await Promise.all([first, second])

    expect(mineSpy).toHaveBeenCalledTimes(1)
  })

  it('currentBlock derives from metrics.chainHeight + 1', async () => {
    vi.spyOn(miningApi, 'mineBlock').mockImplementation(
      () => new Promise((resolve) =>
        setTimeout(() => resolve({ block, transactions: [] }), 50),
      ),
    )
    const metrics = useMetricsStore()
    metrics.metrics = {
      chainHeight: 11,
      pendingCount: 0,
      mempoolBytes: 0,
      averageBlockTimeSeconds: 0,
      difficulty: 0,
      lastBlockTimestamp: null,
    }
    vi.spyOn(metrics, 'fetchAll').mockResolvedValue()
    const mempool = useMempoolStore()
    vi.spyOn(mempool, 'fetchPending').mockResolvedValue()

    const store = useMiningStore()
    const p = store.mine()
    await vi.advanceTimersByTimeAsync(10)
    expect(store.currentBlock).toBe(12)
    await vi.advanceTimersByTimeAsync(1500)
    await p
  })
})
