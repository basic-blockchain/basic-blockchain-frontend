import { describe, it, expect } from 'vitest'
import { blockFromApi, formatHash } from '@/domain/block'

describe('blockFromApi', () => {
  it('maps snake_case to camelCase', () => {
    const block = blockFromApi({
      index: 1,
      timestamp: '2026-01-01',
      proof: 1,
      previous_hash: '0',
      merkle_root: 'e3b0c44298fc1c14',
      transactions: [],
    })
    expect(block.previousHash).toBe('0')
    expect(block.index).toBe(1)
    expect(block.merkleRoot).toBe('e3b0c44298fc1c14')
    expect(block.transactions).toEqual([])
  })

  it('maps merkle_root and nested transactions through', () => {
    const block = blockFromApi({
      index: 2,
      timestamp: '2026-01-02',
      proof: 9,
      previous_hash: 'abc',
      merkle_root: 'deadbeef',
      transactions: [{ sender: 'alice', receiver: 'bob', amount: 5 }],
    })
    expect(block.merkleRoot).toBe('deadbeef')
    expect(block.transactions).toEqual([{ sender: 'alice', receiver: 'bob', amount: 5 }])
  })

  it('defaults transactions to empty when the field is missing', () => {
    const block = blockFromApi({
      index: 1,
      timestamp: '2026-01-01',
      proof: 1,
      previous_hash: '0',
      merkle_root: 'e3b0',
    } as never)
    expect(block.transactions).toEqual([])
  })
})

describe('formatHash', () => {
  it('returns Genesis for "0"', () => expect(formatHash('0')).toBe('Genesis'))
  it('truncates long hash', () => {
    expect(formatHash('00000abcdefg1234', 8)).toMatch(/…$/)
  })
  it('returns short hash unchanged', () => expect(formatHash('abc', 12)).toBe('abc'))
})
