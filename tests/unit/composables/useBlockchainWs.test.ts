import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/api/websocket', () => ({
  useBlockchainWebSocket: vi.fn(),
}))

vi.mock('@/stores/chain', () => ({
  useChainStore: vi.fn(),
}))
vi.mock('@/stores/mempool', () => ({
  useMempoolStore: vi.fn(),
}))
vi.mock('@/stores/metrics', () => ({
  useMetricsStore: vi.fn(),
}))

import { useBlockchainWebSocket } from '@/api/websocket'
import { useChainStore } from '@/stores/chain'
import { useMempoolStore } from '@/stores/mempool'
import { useMetricsStore } from '@/stores/metrics'
import type { Block } from '@/domain/block'

const mockBlock: Block = {
  index: 3,
  timestamp: '2026-01-03T00:00:00',
  proof: 99,
  previousHash: 'deadbeef',
}

function setupStoreMocks() {
  const chainStore = { appendBlock: vi.fn() }
  const mempoolStore = { fetchPending: vi.fn().mockResolvedValue(undefined) }
  const metricsStore = { fetchAll: vi.fn().mockResolvedValue(undefined) }

  ;(useChainStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(chainStore)
  ;(useMempoolStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mempoolStore)
  ;(useMetricsStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(metricsStore)

  return { chainStore, mempoolStore, metricsStore }
}

describe('useBlockchainWs', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('exposes wsStatus from useBlockchainWebSocket', async () => {
    const { useBlockchainWs } = await import('@/composables/useBlockchainWs')
    setupStoreMocks()

    const status = ref<string>('OPEN')
    const lastError = ref<string | null>(null)
    ;(useBlockchainWebSocket as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ status, lastError })

    const { wsStatus } = useBlockchainWs()
    expect(wsStatus.value).toBe('OPEN')
  })

  it('exposes wsError from useBlockchainWebSocket', async () => {
    vi.resetModules()
    const { useBlockchainWs } = await import('@/composables/useBlockchainWs')
    setupStoreMocks()

    const status = ref<string>('OPEN')
    const lastError = ref<string | null>('parse error')
    ;(useBlockchainWebSocket as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ status, lastError })

    const { wsError } = useBlockchainWs()
    expect(wsError.value).toBe('parse error')
  })

  it('calls appendBlock and refreshes stores when block_mined fires', async () => {
    vi.resetModules()
    const { useBlockchainWs } = await import('@/composables/useBlockchainWs')
    const { chainStore, mempoolStore, metricsStore } = setupStoreMocks()

    let capturedCallback: ((block: Block) => Promise<void>) | undefined

    ;(useBlockchainWebSocket as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (cb: (block: Block) => Promise<void>) => {
        capturedCallback = cb
        return { status: ref('OPEN'), lastError: ref(null) }
      },
    )

    useBlockchainWs()

    await capturedCallback!(mockBlock)

    expect(chainStore.appendBlock).toHaveBeenCalledWith(mockBlock)
    expect(mempoolStore.fetchPending).toHaveBeenCalledOnce()
    expect(metricsStore.fetchAll).toHaveBeenCalledOnce()
  })

  it('runs fetchPending and fetchAll concurrently (Promise.all)', async () => {
    vi.resetModules()
    const { useBlockchainWs } = await import('@/composables/useBlockchainWs')
    const { mempoolStore, metricsStore } = setupStoreMocks()

    const order: string[] = []
    mempoolStore.fetchPending.mockImplementation(async () => { order.push('mempool') })
    metricsStore.fetchAll.mockImplementation(async () => { order.push('metrics') })

    let capturedCallback: ((block: Block) => Promise<void>) | undefined
    ;(useBlockchainWebSocket as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (cb: (block: Block) => Promise<void>) => {
        capturedCallback = cb
        return { status: ref('OPEN'), lastError: ref(null) }
      },
    )

    useBlockchainWs()
    await capturedCallback!(mockBlock)

    expect(order).toContain('mempool')
    expect(order).toContain('metrics')
  })
})
