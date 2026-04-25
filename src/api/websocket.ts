import { useWebSocket } from '@vueuse/core'
import { ref } from 'vue'
import type { Block, ApiBlock } from '@/domain/block'
import { blockFromApi } from '@/domain/block'

export interface BlockMinedEvent {
  event: 'block_mined'
  block: ApiBlock
}

export function useBlockchainWebSocket(onBlockMined: (block: Block) => void) {
  const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:5000/api/v1/ws'
  const lastError = ref<string | null>(null)

  const { status, data } = useWebSocket(WS_URL, {
    autoReconnect: { retries: 10, delay: 3000 },
    onMessage(_ws, event) {
      try {
        const payload = JSON.parse(event.data) as BlockMinedEvent
        if (payload.event === 'block_mined') {
          onBlockMined(blockFromApi(payload.block))
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Malformed WebSocket message'
        lastError.value = msg
        console.warn('[ws] parse error:', msg, '— raw:', event.data)
      }
    },
  })

  return { status, lastMessage: data, lastError }
}
