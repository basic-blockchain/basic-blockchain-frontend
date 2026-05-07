import { describe, it, expect } from 'vitest'
import { isValidMnemonic, signTransfer } from '@/lib/crypto'

// A known valid BIP-39 12-word mnemonic for deterministic testing.
const VALID_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

describe('isValidMnemonic', () => {
  it('returns true for a valid 12-word BIP-39 phrase', () => {
    expect(isValidMnemonic(VALID_MNEMONIC)).toBe(true)
  })

  it('returns false for garbage input', () => {
    expect(isValidMnemonic('not a valid mnemonic at all xyz')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isValidMnemonic('')).toBe(false)
  })

  it('trims surrounding whitespace before validating', () => {
    expect(isValidMnemonic(`  ${VALID_MNEMONIC}  `)).toBe(true)
  })
})

describe('signTransfer', () => {
  it('returns a non-empty hex string for valid inputs', () => {
    const sig = signTransfer(VALID_MNEMONIC, 'wallet-a', 'wallet-b', 10, 1)
    expect(typeof sig).toBe('string')
    expect(sig.length).toBeGreaterThan(0)
    expect(/^[0-9a-f]+$/.test(sig)).toBe(true)
  })

  it('is deterministic — same inputs produce same signature', () => {
    const sig1 = signTransfer(VALID_MNEMONIC, 'wallet-a', 'wallet-b', 10, 1)
    const sig2 = signTransfer(VALID_MNEMONIC, 'wallet-a', 'wallet-b', 10, 1)
    expect(sig1).toBe(sig2)
  })

  it('produces different signatures for different nonces', () => {
    const sig1 = signTransfer(VALID_MNEMONIC, 'wallet-a', 'wallet-b', 10, 1)
    const sig2 = signTransfer(VALID_MNEMONIC, 'wallet-a', 'wallet-b', 10, 2)
    expect(sig1).not.toBe(sig2)
  })

  it('produces different signatures for different amounts', () => {
    const sig1 = signTransfer(VALID_MNEMONIC, 'wallet-a', 'wallet-b', 10, 1)
    const sig2 = signTransfer(VALID_MNEMONIC, 'wallet-a', 'wallet-b', 99, 1)
    expect(sig1).not.toBe(sig2)
  })

  it('throws for an invalid mnemonic', () => {
    expect(() => signTransfer('bad mnemonic', 'w-a', 'w-b', 1, 1)).toThrow('Invalid BIP-39 mnemonic')
  })
})
