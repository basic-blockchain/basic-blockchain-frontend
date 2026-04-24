import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMetricsStore } from '@/stores/metrics'
import * as healthApi from '@/api/health'
import type { Health, Metrics } from '@/domain/metrics'

const mockHealth: Health = { status: 'ok', db: 'ok', chainHeight: 3 }
const mockMetrics: Metrics = { chainHeight: 3, pendingTransactions: 1, avgMineTimeSeconds: 12.5 }

describe('useMetricsStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('fetchAll populates health and metrics', async () => {
    vi.spyOn(healthApi, 'getHealth').mockResolvedValue(mockHealth)
    vi.spyOn(healthApi, 'getMetrics').mockResolvedValue(mockMetrics)
    const store = useMetricsStore()
    await store.fetchAll()
    expect(store.health?.status).toBe('ok')
    expect(store.metrics?.chainHeight).toBe(3)
    expect(store.metrics?.avgMineTimeSeconds).toBe(12.5)
  })

  it('loading is false after fetchAll completes', async () => {
    vi.spyOn(healthApi, 'getHealth').mockResolvedValue(mockHealth)
    vi.spyOn(healthApi, 'getMetrics').mockResolvedValue(mockMetrics)
    const store = useMetricsStore()
    await store.fetchAll()
    expect(store.loading).toBe(false)
  })

  it('handles degraded health status', async () => {
    const degraded: Health = { status: 'degraded', db: 'error', chainHeight: 5 }
    vi.spyOn(healthApi, 'getHealth').mockResolvedValue(degraded)
    vi.spyOn(healthApi, 'getMetrics').mockResolvedValue(mockMetrics)
    const store = useMetricsStore()
    await store.fetchAll()
    expect(store.health?.status).toBe('degraded')
    expect(store.health?.db).toBe('error')
  })

  it('handles null avgMineTimeSeconds (single block)', async () => {
    const noAvg: Metrics = { chainHeight: 1, pendingTransactions: 0, avgMineTimeSeconds: null }
    vi.spyOn(healthApi, 'getHealth').mockResolvedValue(mockHealth)
    vi.spyOn(healthApi, 'getMetrics').mockResolvedValue(noAvg)
    const store = useMetricsStore()
    await store.fetchAll()
    expect(store.metrics?.avgMineTimeSeconds).toBeNull()
  })
})
