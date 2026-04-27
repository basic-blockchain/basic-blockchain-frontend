import { describe, it, expect } from 'vitest'
import { validateTransaction } from '@/domain/transaction'

describe('validateTransaction', () => {
  it('accepts a valid transaction', () => {
    expect(validateTransaction({ sender: 'alice', receiver: 'bob', amount: 10 })).toHaveLength(0)
  })

  it('BR-TX-01: rejects zero amount', () => {
    const errors = validateTransaction({ sender: 'alice', receiver: 'bob', amount: 0 })
    expect(errors.some((e) => e.field === 'amount')).toBe(true)
  })

  it('BR-TX-01: rejects negative amount', () => {
    const errors = validateTransaction({ sender: 'alice', receiver: 'bob', amount: -5 })
    expect(errors.some((e) => e.field === 'amount')).toBe(true)
  })

  it('BR-TX-02: rejects empty sender', () => {
    const errors = validateTransaction({ sender: '', receiver: 'bob', amount: 10 })
    expect(errors.some((e) => e.field === 'sender')).toBe(true)
  })

  it('BR-TX-03: rejects empty receiver', () => {
    const errors = validateTransaction({ sender: 'alice', receiver: '', amount: 10 })
    expect(errors.some((e) => e.field === 'receiver')).toBe(true)
  })

  it('BR-TX-04: rejects self-transfer', () => {
    const errors = validateTransaction({ sender: 'alice', receiver: 'alice', amount: 10 })
    expect(errors.some((e) => e.field === 'receiver')).toBe(true)
  })

  it('BR-TX-02: rejects whitespace-only sender', () => {
    const errors = validateTransaction({ sender: '   ', receiver: 'bob', amount: 10 })
    expect(errors.some((e) => e.field === 'sender')).toBe(true)
  })

  it('BR-TX-05: rejects sender longer than 255 characters', () => {
    const long = 'a'.repeat(256)
    const errors = validateTransaction({ sender: long, receiver: 'bob', amount: 10 })
    expect(errors.some((e) => e.field === 'sender')).toBe(true)
  })

  it('BR-TX-05: rejects receiver longer than 255 characters', () => {
    const long = 'b'.repeat(256)
    const errors = validateTransaction({ sender: 'alice', receiver: long, amount: 10 })
    expect(errors.some((e) => e.field === 'receiver')).toBe(true)
  })

  it('BR-TX-05: accepts sender and receiver at exactly 255 characters', () => {
    const exact = 'x'.repeat(255)
    const errors = validateTransaction({ sender: exact, receiver: 'bob', amount: 10 })
    expect(errors.some((e) => e.field === 'sender')).toBe(false)
  })
})
