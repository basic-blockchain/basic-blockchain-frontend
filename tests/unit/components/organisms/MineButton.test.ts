import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PrimeVue from 'primevue/config'

vi.mock('@/api/mining', () => ({ mineBlock: vi.fn() }))
vi.mock('@/stores/chain', () => ({ useChainStore: vi.fn() }))
vi.mock('@/stores/mempool', () => ({ useMempoolStore: vi.fn() }))
vi.mock('@/stores/metrics', () => ({ useMetricsStore: vi.fn() }))
vi.mock('@/stores/confirmedTransactions', () => ({ useConfirmedTransactionsStore: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: vi.fn() }))

import { mineBlock } from '@/api/mining'
import { useChainStore } from '@/stores/chain'
import { useMempoolStore } from '@/stores/mempool'
import { useMetricsStore } from '@/stores/metrics'
import { useConfirmedTransactionsStore } from '@/stores/confirmedTransactions'
import { useToast } from '@/composables/useToast'
import MineButton from '@/components/organisms/MineButton.vue'
import type { Block } from '@/domain/block'

const globalConfig = { plugins: [PrimeVue] }

const minedBlock: Block = {
  index: 5,
  timestamp: '2026-01-05T00:00:00',
  proof: 77,
  previousHash: 'prev',
  merkleRoot: 'e3b0c44298fc1c14',
  transactions: [],
}

function buildStoreMocks() {
  const chainStore = { appendBlock: vi.fn() }
  const mempoolStore = { fetchPending: vi.fn().mockResolvedValue(undefined) }
  const metricsStore = { fetchAll: vi.fn().mockResolvedValue(undefined) }
  const confirmedStore = { addFromBlock: vi.fn() }
  const toast = { success: vi.fn(), error: vi.fn() }

  ;(useChainStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(chainStore)
  ;(useMempoolStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mempoolStore)
  ;(useMetricsStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(metricsStore)
  ;(useConfirmedTransactionsStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(confirmedStore)
  ;(useToast as unknown as ReturnType<typeof vi.fn>).mockReturnValue(toast)

  return { chainStore, mempoolStore, metricsStore, confirmedStore, toast }
}

describe('MineButton', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders "Mine Block" label initially', () => {
    buildStoreMocks()
    ;(mineBlock as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ block: minedBlock, transactions: [] })
    const wrapper = mount(MineButton, { global: globalConfig })
    expect(wrapper.text()).toContain('Mine Block')
  })

  it('calls mineBlock and appendBlock on click', async () => {
    const { chainStore } = buildStoreMocks()
    ;(mineBlock as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ block: minedBlock, transactions: [] })

    const wrapper = mount(MineButton, { global: globalConfig })
    await wrapper.find('button').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(mineBlock).toHaveBeenCalledOnce()
    expect(chainStore.appendBlock).toHaveBeenCalledWith(minedBlock)
  })

  it('calls addFromBlock when transactions are included', async () => {
    const txs = [{ sender: 'A', receiver: 'B', amount: 1 }]
    const { confirmedStore } = buildStoreMocks()
    ;(mineBlock as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ block: minedBlock, transactions: txs })

    const wrapper = mount(MineButton, { global: globalConfig })
    await wrapper.find('button').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(confirmedStore.addFromBlock).toHaveBeenCalledWith(
      minedBlock.index,
      minedBlock.timestamp,
      txs,
    )
  })

  it('does NOT call addFromBlock for empty block', async () => {
    const { confirmedStore } = buildStoreMocks()
    ;(mineBlock as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ block: minedBlock, transactions: [] })

    const wrapper = mount(MineButton, { global: globalConfig })
    await wrapper.find('button').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(confirmedStore.addFromBlock).not.toHaveBeenCalled()
  })

  it('shows error toast when mineBlock rejects', async () => {
    const { toast } = buildStoreMocks()
    ;(mineBlock as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network error'))

    const wrapper = mount(MineButton, { global: globalConfig })
    await wrapper.find('button').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(toast.error).toHaveBeenCalledWith('Mining failed', 'network error')
  })

  it('is guarded against double-click while loading', async () => {
    buildStoreMocks()
    let resolve!: () => void
    ;(mineBlock as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise<{ block: Block; transactions: [] }>((r) => { resolve = () => r({ block: minedBlock, transactions: [] }) }),
    )

    const wrapper = mount(MineButton, { global: globalConfig })
    await wrapper.find('button').trigger('click')
    await wrapper.find('button').trigger('click')
    resolve()
    await new Promise((r) => setTimeout(r, 0))

    expect(mineBlock).toHaveBeenCalledOnce()
  })
})
