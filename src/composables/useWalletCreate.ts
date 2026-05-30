import { ref } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { previewWallet, confirmWallet } from '@/api/wallets'
import { useToast } from '@/composables/useToast'

export function useWalletCreate() {
  const walletStore = useWalletStore()
  const toast = useToast()

  const pendingMnemonic = ref('')
  const showSeedModal = ref(false)
  const creatingWallet = ref(false)
  const pendingDraftId = ref('')
  const selectedCurrency = ref('NATIVE')

  async function handleCreateWallet() {
    creatingWallet.value = true
    try {
      const resp = await previewWallet(selectedCurrency.value)
      pendingDraftId.value = resp.draft_id
      pendingMnemonic.value = resp.mnemonic
      showSeedModal.value = true
    } catch (e) {
      toast.add({
        severity: 'error',
        summary: 'Error al crear wallet',
        detail: e instanceof Error ? e.message : 'Error inesperado',
        life: 4000,
      })
    } finally {
      creatingWallet.value = false
    }
  }

  async function onSeedConfirmed() {
    try {
      await confirmWallet(pendingDraftId.value)
      await walletStore.fetchMine()
      toast.add({
        severity: 'success',
        summary: 'Wallet creada',
        detail: 'Tu nueva wallet está lista',
        life: 3000,
      })
    } catch (e) {
      toast.add({
        severity: 'error',
        summary: 'Error al confirmar wallet',
        detail: e instanceof Error ? e.message : 'Error inesperado',
        life: 4000,
      })
    } finally {
      showSeedModal.value = false
      pendingMnemonic.value = ''
      pendingDraftId.value = ''
    }
  }

  function onSeedClosed() {
    showSeedModal.value = false
    pendingMnemonic.value = ''
    pendingDraftId.value = ''
  }

  return {
    pendingMnemonic,
    showSeedModal,
    creatingWallet,
    pendingDraftId,
    selectedCurrency,
    handleCreateWallet,
    onSeedConfirmed,
    onSeedClosed,
  }
}
