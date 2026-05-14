import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStatsStore } from '@/stores/stats'
import * as statsApi from '@/api/stats'
import type { PlatformStats } from '@/api/stats'

const mockStats: PlatformStats = {
  users: { total: 10, active: 8, banned: 1, deleted: 1 },
  wallets: { total: 15, user_wallets: 12, frozen: 2, frozen_user_wallets: 1 },
  balances: { BTC: '100.5', ETH: '2500.0' },
}

describe('useStatsStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('fetchStats populates stats on success', async () => {
    vi.spyOn(statsApi, 'getPlatformStats').mockResolvedValue(mockStats)
    const store = useStatsStore()
    await store.fetchStats()
    expect(store.stats?.users.total).toBe(10)
    expect(store.stats?.users.active).toBe(8)
    expect(store.stats?.wallets.frozen).toBe(2)
    expect(store.stats?.balances['BTC']).toBe('100.5')
  })

  it('loading is false after fetchStats completes', async () => {
    vi.spyOn(statsApi, 'getPlatformStats').mockResolvedValue(mockStats)
    const store = useStatsStore()
    await store.fetchStats()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('sets error and keeps loading false on failure', async () => {
    vi.spyOn(statsApi, 'getPlatformStats').mockRejectedValue(new Error('Network error'))
    const store = useStatsStore()
    await store.fetchStats()
    expect(store.stats).toBeNull()
    expect(store.error).toBe('Network error')
    expect(store.loading).toBe(false)
  })

  it('sets generic error message for non-Error rejections', async () => {
    vi.spyOn(statsApi, 'getPlatformStats').mockRejectedValue('unexpected')
    const store = useStatsStore()
    await store.fetchStats()
    expect(store.error).toBe('Failed to load stats')
  })
})
