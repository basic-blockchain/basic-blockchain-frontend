import { defineStore } from 'pinia'
import { ref } from 'vue'
import { myWallets, signedTransfer, type Wallet } from '@/api/wallets'
import { BlockchainApiError, type ApiErrorCode } from '@/api/errors'
import { signTransfer } from '@/lib/crypto'

export const useWalletStore = defineStore('wallet', () => {
  const wallets = ref<Wallet[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  // Exposed alongside `error` so the view can act on specific failure
  // shapes (e.g. redirecting on `FORBIDDEN` from BR-WL-11) without
  // re-parsing the message string.
  const errorCode = ref<ApiErrorCode | null>(null)

  async function fetchMine(): Promise<void> {
    loading.value = true
    error.value = null
    errorCode.value = null
    try {
      const resp = await myWallets()
      wallets.value = resp.wallets
    } catch (e) {
      if (e instanceof BlockchainApiError) {
        error.value = e.message
        errorCode.value = e.code
      } else {
        error.value = e instanceof Error ? e.message : 'Failed to load wallets'
      }
    } finally {
      loading.value = false
    }
  }

  async function transfer(
    mnemonic: string,
    senderWalletId: string,
    receiverWalletId: string,
    amount: number,
    nonce: number,
  ): Promise<void> {
    const signature = signTransfer(mnemonic, senderWalletId, receiverWalletId, amount, nonce)
    await signedTransfer({ sender_wallet_id: senderWalletId, receiver_wallet_id: receiverWalletId, amount, nonce, signature })
    // Refresh balances after a successful transfer submission.
    await fetchMine()
  }

  return { wallets, loading, error, errorCode, fetchMine, transfer }
})
