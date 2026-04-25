import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useValidationHistoryStore } from '@/stores/validationHistory'

describe('useValidationHistoryStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('record adds an event with correct fields', () => {
    const store = useValidationHistoryStore()
    store.record('chain', 'valid', 'full chain', 'Chain is valid')

    expect(store.total).toBe(1)
    const ev = store.events[0]
    expect(ev.type).toBe('chain')
    expect(ev.status).toBe('valid')
    expect(ev.target).toBe('full chain')
    expect(ev.message).toBe('Chain is valid')
    expect(ev.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(ev.timestamp).toBeTruthy()
  })

  it('record accumulates events across multiple calls', () => {
    const store = useValidationHistoryStore()
    store.record('block', 'valid', 'block #1', 'ok')
    store.record('transaction', 'invalid', 'alice→alice', 'Self-transfer rejected')

    expect(store.total).toBe(2)
    expect(store.latest?.type).toBe('transaction')
  })

  it('latest returns null when no events exist', () => {
    const store = useValidationHistoryStore()
    expect(store.latest).toBeNull()
  })

  it('clear resets all events', () => {
    const store = useValidationHistoryStore()
    store.record('node', 'error', 'http://peer:5001', 'unreachable')
    store.clear()
    expect(store.total).toBe(0)
    expect(store.latest).toBeNull()
  })

  it('exportJson returns parseable JSON array', () => {
    const store = useValidationHistoryStore()
    store.record('chain', 'invalid', 'full chain', 'Hash mismatch at block 3')
    const json = store.exportJson()
    const parsed = JSON.parse(json) as unknown[]
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed).toHaveLength(1)
  })
})
