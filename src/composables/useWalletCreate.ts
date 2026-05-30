import { ref } from 'vue'

/**
 * Entry point for the wallet creation flow.
 * All API logic (previewWallet / confirmWallet) now lives inside
 * WalletCreateFlow.vue; this composable only manages the visibility flag
 * so callers stay decoupled from the flow internals.
 */
export function useWalletCreate() {
  const showCreateFlow = ref(false)

  function handleCreateWallet() {
    showCreateFlow.value = true
  }

  function onCreateComplete() {
    showCreateFlow.value = false
  }

  return { showCreateFlow, handleCreateWallet, onCreateComplete }
}
