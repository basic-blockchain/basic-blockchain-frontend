import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWalletStore } from '@/stores/wallet'
import * as walletsApi from '@/api/wallets'
import * as crypto from '@/lib/crypto'
import type { Wallet } from '@/api/wallets'

const w: Wallet = {
  wallet_id: 'w1',
  public_key: 'pk1',
  balance: 100,
  frozen: false,
  created_at: '2026-01-01T00:00:00Z',
  currency: 'BBT',
  wallet_type: 'USER',
}

describe('useWalletStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('fetchMine populates wallets and clears loading', async () => {
    vi.spyOn(walletsApi, 'myWallets').mockResolvedValue({ wallets: [w] })
    const store = useWalletStore()
    await store.fetchMine()
    expect(store.wallets).toHaveLength(1)
    expect(store.wallets[0].wallet_id).toBe('w1')
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchMine surfaces api error into store.error', async () => {
    vi.spyOn(walletsApi, 'myWallets').mockRejectedValue(new Error('boom'))
    const store = useWalletStore()
    await store.fetchMine()
    expect(store.error).toBe('boom')
    expect(store.loading).toBe(false)
  })

  it('fetchMine handles non-Error rejection with fallback message', async () => {
    vi.spyOn(walletsApi, 'myWallets').mockRejectedValue('weird')
    const store = useWalletStore()
    await store.fetchMine()
    expect(store.error).toBe('Failed to load wallets')
  })

  it('transfer signs, posts and refreshes wallets', async () => {
    const signSpy = vi.spyOn(crypto, 'signTransfer').mockReturnValue('SIGNED')
    const postSpy = vi.spyOn(walletsApi, 'signedTransfer').mockResolvedValue({
      transaction_id: 'tx1',
      message: 'ok',
    })
    const refreshSpy = vi.spyOn(walletsApi, 'myWallets').mockResolvedValue({ wallets: [w] })

    const store = useWalletStore()
    await store.transfer('seed phrase', 'wa', 'wb', 10, 1)

    expect(signSpy).toHaveBeenCalledWith('seed phrase', 'wa', 'wb', 10, 1)
    expect(postSpy).toHaveBeenCalledWith({
      sender_wallet_id: 'wa',
      receiver_wallet_id: 'wb',
      amount: 10,
      nonce: 1,
      signature: 'SIGNED',
    })
    expect(refreshSpy).toHaveBeenCalled()
    expect(store.wallets).toHaveLength(1)
  })

  it('transfer propagates api errors and skips refresh', async () => {
    vi.spyOn(crypto, 'signTransfer').mockReturnValue('SIGNED')
    vi.spyOn(walletsApi, 'signedTransfer').mockRejectedValue(new Error('rejected'))
    const refreshSpy = vi.spyOn(walletsApi, 'myWallets')

    const store = useWalletStore()
    await expect(store.transfer('seed', 'wa', 'wb', 5, 1)).rejects.toThrow('rejected')
    expect(refreshSpy).not.toHaveBeenCalled()
  })
})
