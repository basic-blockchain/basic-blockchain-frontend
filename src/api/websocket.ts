import { useWebSocket } from '@vueuse/core'
import type { Block, ApiBlock } from '@/domain/block'
import { blockFromApi } from '@/domain/block'

export interface BlockMinedEvent {
  event: 'block_mined'
  block: ApiBlock
}

export function useBlockchainWebSocket(onBlockMined: (block: Block) => void) {
  const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:5000/api/v1/ws'

  const { status, data } = useWebSocket(WS_URL, {
    autoReconnect: { retries: 10, delay: 3000 },
    onMessage(_ws, event) {
      try {
        const payload = JSON.parse(event.data) as BlockMinedEvent
        if (payload.event === 'block_mined') {
          onBlockMined(blockFromApi(payload.block))
        }
      } catch {
        // malformed message — ignore
      }
    },
  })

  return { status, lastMessage: data }
}
