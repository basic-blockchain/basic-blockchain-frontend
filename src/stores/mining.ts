import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mineBlock } from '@/api/mining'
import { useChainStore } from './chain'
import { useMempoolStore } from './mempool'
import { useMetricsStore } from './metrics'
import { useConfirmedTransactionsStore } from './confirmedTransactions'
import { useToast } from '@/composables/useToast'

export interface MiningState {
  isRunning: boolean
  progress: number // 0-100
  currentBlock: number | null
  startTime: number | null
  elapsedSeconds: number
}

export const useMiningStore = defineStore('mining', () => {
  const isRunning = ref(false)
  const progress = ref(0)
  const currentBlock = ref<number | null>(null)
  const startTime = ref<number | null>(null)
  const elapsedSeconds = ref(0)
  const error = ref<string | null>(null)

  const chainStore = useChainStore()
  const mempoolStore = useMempoolStore()
  const metricsStore = useMetricsStore()
  const confirmedStore = useConfirmedTransactionsStore()
  const toast = useToast()

  let progressInterval: ReturnType<typeof setInterval> | null = null

  const isVisible = computed(() => isRunning.value)

  function startProgressTracking() {
    startTime.value = Date.now()
    elapsedSeconds.value = 0
    progressInterval = setInterval(() => {
      if (startTime.value) {
        elapsedSeconds.value = ((Date.now() - startTime.value) / 1000).toFixed(
          1
        ) as unknown as number
        // Simular progreso: 10% cada segundo, máximo 90% hasta completar
        const estimatedProgress = Math.min(90, (elapsedSeconds.value as number) * 10)
        progress.value = Math.floor(estimatedProgress)
      }
    }, 100)
  }

  function stopProgressTracking() {
    if (progressInterval) {
      clearInterval(progressInterval)
      progressInterval = null
    }
  }

  async function mine() {
    if (isRunning.value) return

    isRunning.value = true
    progress.value = 0
    error.value = null
    currentBlock.value = (metricsStore.metrics?.chainHeight ?? 0) + 1

    startProgressTracking()

    try {
      const { block, transactions } = await mineBlock()

      // Actualizar stores
      chainStore.appendBlock(block)
      if (transactions.length > 0) {
        confirmedStore.addFromBlock(block.index, block.timestamp, transactions)
      }

      // Refrescar datos
      await Promise.all([mempoolStore.fetchPending(), metricsStore.fetchAll()])

      // Completar
      progress.value = 100
      const detail =
        transactions.length > 0
          ? `${transactions.length} transaction(s) included and removed from mempool`
          : 'Empty block (no pending transactions)'
      toast.success(`Block #${block.index} mined`, detail)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Mining failed'
      error.value = msg
      toast.error('Mining failed', msg)
    } finally {
      stopProgressTracking()
      // Mantener la notificación visible 1 segundo después de completar
      await new Promise((r) => setTimeout(r, 1000))
      isRunning.value = false
      progress.value = 0
      currentBlock.value = null
      elapsedSeconds.value = 0
    }
  }

  return {
    isRunning,
    progress,
    currentBlock,
    elapsedSeconds,
    error,
    isVisible,
    mine,
  }
})
