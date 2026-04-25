import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getHealth, getMetrics } from '@/api/health'
import type { Health, Metrics } from '@/domain/metrics'

export const useMetricsStore = defineStore('metrics', () => {
  const health = ref<Health | null>(null)
  const metrics = ref<Metrics | null>(null)
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      const [h, m] = await Promise.all([getHealth(), getMetrics()])
      health.value = h
      metrics.value = m
    } finally {
      loading.value = false
    }
  }

  return { health, metrics, loading, fetchAll }
})
