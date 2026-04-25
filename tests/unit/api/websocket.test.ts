import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@vueuse/core', () => ({
  useWebSocket: vi.fn(),
}))

import { useWebSocket } from '@vueuse/core'
import { useBlockchainWebSocket } from '@/api/websocket'
import type { ApiBlock } from '@/domain/block'

const mockBlock: ApiBlock = {
  index: 2,
  timestamp: '2026-01-02T00:00:00',
  proof: 42,
  previous_hash: 'abc123',
}

function makeUseWebSocketMock(triggerMessage?: (raw: string) => void) {
  let capturedHandler: ((ws: unknown, event: MessageEvent) => void) | undefined

  ;(useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
    (_url: string, opts: { onMessage: (ws: unknown, e: MessageEvent) => void }) => {
      capturedHandler = opts.onMessage
      if (triggerMessage) {
        triggerMessage((raw: string) => {
          capturedHandler?.(null, { data: raw } as MessageEvent)
        })
      }
      return { status: { value: 'OPEN' }, data: { value: null }, lastError: { value: null } }
    },
  )

  return { getCaptured: () => capturedHandler }
}

describe('useBlockchainWebSocket', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls onBlockMined with mapped block on block_mined event', () => {
    const onBlockMined = vi.fn()
    let fire: ((raw: string) => void) | undefined

    makeUseWebSocketMock((trigger) => {
      fire = trigger
    })

    useBlockchainWebSocket(onBlockMined)

    const payload = JSON.stringify({ event: 'block_mined', block: mockBlock })
    fire?.(payload)

    expect(onBlockMined).toHaveBeenCalledOnce()
    expect(onBlockMined).toHaveBeenCalledWith(
      expect.objectContaining({ index: 2, previousHash: 'abc123' }),
    )
  })

  it('ignores events with unknown event type', () => {
    const onBlockMined = vi.fn()
    let fire: ((raw: string) => void) | undefined

    makeUseWebSocketMock((trigger) => {
      fire = trigger
    })

    useBlockchainWebSocket(onBlockMined)

    fire?.(JSON.stringify({ event: 'unknown_event', data: {} }))

    expect(onBlockMined).not.toHaveBeenCalled()
  })

  it('sets lastError and warns on malformed JSON', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const onBlockMined = vi.fn()
    let fire: ((raw: string) => void) | undefined

    makeUseWebSocketMock((trigger) => {
      fire = trigger
    })

    const { lastError } = useBlockchainWebSocket(onBlockMined)

    fire?.('not-valid-json{{{')

    expect(lastError.value).not.toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      '[ws] parse error:',
      expect.any(String),
      '— raw:',
      'not-valid-json{{{',
    )
    expect(onBlockMined).not.toHaveBeenCalled()

    warnSpy.mockRestore()
  })
})
