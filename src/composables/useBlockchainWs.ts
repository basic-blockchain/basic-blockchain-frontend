import { ref, watch } from 'vue'
import { useBlockchainWebSocket } from '@/api/websocket'
import { useChainStore } from '@/stores/chain'
import { useMempoolStore } from '@/stores/mempool'
import { useMetricsStore } from '@/stores/metrics'

type WsStatus = 'OPEN' | 'CONNECTING' | 'CLOSING' | 'CLOSED'

// Module-level singleton refs — App.vue owns the socket; other components
// read these without opening additional connections.
export const sharedWsStatus = ref<WsStatus>('CONNECTING')
export const sharedWsError = ref<string | null>(null)

export function useBlockchainWs() {
  const chainStore = useChainStore()
  const mempoolStore = useMempoolStore()
  const metricsStore = useMetricsStore()

  const { status, lastError } = useBlockchainWebSocket(async (block) => {
    chainStore.appendBlock(block)
    await Promise.all([mempoolStore.fetchPending(), metricsStore.fetchAll()])
  })

  watch(status, (v) => { sharedWsStatus.value = v as WsStatus }, { immediate: true })
  watch(lastError, (v) => { sharedWsError.value = v })

  return { wsStatus: status, wsError: lastError }
}
