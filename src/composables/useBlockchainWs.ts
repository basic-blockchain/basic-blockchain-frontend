import { useBlockchainWebSocket } from '@/api/websocket'
import { useChainStore } from '@/stores/chain'
import { useMempoolStore } from '@/stores/mempool'
import { useMetricsStore } from '@/stores/metrics'

export function useBlockchainWs() {
  const chainStore = useChainStore()
  const mempoolStore = useMempoolStore()
  const metricsStore = useMetricsStore()

  const { status, lastError } = useBlockchainWebSocket(async (block) => {
    chainStore.appendBlock(block)
    await Promise.all([mempoolStore.fetchPending(), metricsStore.fetchAll()])
  })

  return { wsStatus: status, wsError: lastError }
}
