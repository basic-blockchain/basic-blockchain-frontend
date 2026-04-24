import { describe, it, expect } from 'vitest'
import { blockFromApi, formatHash } from '@/domain/block'

describe('blockFromApi', () => {
  it('maps snake_case to camelCase', () => {
    const block = blockFromApi({
      index: 1,
      timestamp: '2026-01-01',
      proof: 1,
      previous_hash: '0',
    })
    expect(block.previousHash).toBe('0')
    expect(block.index).toBe(1)
  })
})

describe('formatHash', () => {
  it('returns Genesis for "0"', () => expect(formatHash('0')).toBe('Genesis'))
  it('truncates long hash', () => {
    expect(formatHash('00000abcdefg1234', 8)).toMatch(/…$/)
  })
  it('returns short hash unchanged', () => expect(formatHash('abc', 12)).toBe('abc'))
})
