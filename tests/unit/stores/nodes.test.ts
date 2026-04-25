import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNodesStore } from '@/stores/nodes'
import * as nodesApi from '@/api/nodes'

describe('useNodesStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('fetchNodes populates peers', async () => {
    vi.spyOn(nodesApi, 'getNodes').mockResolvedValue({
      nodes: ['http://localhost:5001', 'http://localhost:5002'],
      total: 2,
    })
    const store = useNodesStore()
    await store.fetchNodes()
    expect(store.peers).toHaveLength(2)
    expect(store.total).toBe(2)
  })

  it('register adds new nodes', async () => {
    vi.spyOn(nodesApi, 'registerNodes').mockResolvedValue({
      nodes: ['http://localhost:5001'],
      total: 1,
    })
    const store = useNodesStore()
    await store.register(['http://localhost:5001'])
    expect(store.peers).toContain('http://localhost:5001')
  })

  it('resolve sets consensusReplaced flag', async () => {
    vi.spyOn(nodesApi, 'resolveConsensus').mockResolvedValue({
      replaced: true,
      chain: [],
      message: 'Chain replaced',
    })
    const store = useNodesStore()
    const result = await store.resolve()
    expect(result.replaced).toBe(true)
    expect(store.consensusReplaced).toBe(true)
  })

  it('resolve sets replaced=false when local chain wins', async () => {
    vi.spyOn(nodesApi, 'resolveConsensus').mockResolvedValue({
      replaced: false,
      chain: [],
      message: 'Local chain is authoritative',
    })
    const store = useNodesStore()
    const result = await store.resolve()
    expect(result.replaced).toBe(false)
    expect(store.consensusReplaced).toBe(false)
  })
})
