import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getPlatformStats,
  type GetPlatformStatsParams,
  type PlatformStats,
} from '@/api/stats'

export const useStatsStore = defineStore('stats', () => {
  const stats = ref<PlatformStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchStats(params: GetPlatformStatsParams = {}): Promise<void> {
    loading.value = true
    error.value = null
    try {
      stats.value = await getPlatformStats(params)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load stats'
    } finally {
      loading.value = false
    }
  }

  return { stats, loading, error, fetchStats }
})
