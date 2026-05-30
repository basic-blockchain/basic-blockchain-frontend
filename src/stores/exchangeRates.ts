import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { listExchangeRates, type ExchangeRate } from '@/api/wallets'

export const useExchangeRatesStore = defineStore('exchangeRates', () => {
  const rates = ref<ExchangeRate[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchRates(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const resp = await listExchangeRates({ limit: 200 })
      rates.value = resp.rates
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load exchange rates'
    } finally {
      loading.value = false
    }
  }

  const rateMap = computed<Map<string, number>>(() => {
    const m = new Map<string, number>()
    for (const r of rates.value) {
      m.set(`${r.from_currency}:${r.to_currency}`, parseFloat(r.rate))
    }
    return m
  })

  function rateFor(from: string, to: string): number | null {
    return rateMap.value.get(`${from}:${to}`) ?? null
  }

  function usdValue(amount: number, currency: string): number | null {
    if (currency === 'USD') return amount
    const rate = rateFor(currency, 'USD')
    return rate !== null ? amount * rate : null
  }

  return { rates, loading, error, fetchRates, rateFor, usdValue }
})
