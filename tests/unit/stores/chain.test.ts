import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChainStore } from '@/stores/chain'
import * as chainApi from '@/api/chain'
import type { Block } from '@/domain/block'

const mockBlock: Block = { index: 1, timestamp: '2026-01-01', proof: 1, previousHash: '0' }

describe('useChainStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('fetchChain populates blocks', async () => {
    vi.spyOn(chainApi, 'getChain').mockResolvedValue({ chain: [mockBlock], length: 1 })
    const store = useChainStore()
    await store.fetchChain()
    expect(store.blocks).toHaveLength(1)
    expect(store.length).toBe(1)
  })

  it('appendBlock adds unique blocks', () => {
    const store = useChainStore()
    store.appendBlock(mockBlock)
    store.appendBlock(mockBlock) // duplicate — ignored
    expect(store.blocks).toHaveLength(1)
  })

  it('latestBlock returns last block', () => {
    const store = useChainStore()
    store.appendBlock(mockBlock)
    expect(store.latestBlock?.index).toBe(1)
  })

  it('fetchChain sets error on failure', async () => {
    vi.spyOn(chainApi, 'getChain').mockRejectedValue(new Error('network'))
    const store = useChainStore()
    await store.fetchChain()
    expect(store.error).toBe('network')
  })
})
