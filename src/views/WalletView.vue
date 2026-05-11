<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { createWallet, listCurrencies, type CurrencyRecord } from '@/api/wallets'
import { isValidMnemonic } from '@/lib/crypto'
import SeedPhraseModal from '@/components/molecules/SeedPhraseModal.vue'
import HashChip from '@/components/atoms/HashChip.vue'
import AmountDisplay from '@/components/atoms/AmountDisplay.vue'
import { useToast } from 'primevue/usetoast'
import { BlockchainApiError } from '@/api/errors'

const walletStore = useWalletStore()
const toast = useToast()

// ── Wallet creation ────────────────────────────────────────────────────────
const pendingMnemonic = ref('')
const showSeedModal = ref(false)
const creatingWallet = ref(false)
const currencies = ref<CurrencyRecord[]>([])
const selectedCurrency = ref('NATIVE')

async function handleCreateWallet() {
  creatingWallet.value = true
  try {
    const resp = await createWallet(selectedCurrency.value)
    pendingMnemonic.value = resp.mnemonic
    showSeedModal.value = true
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Wallet creation failed',
      detail: e instanceof Error ? e.message : 'Unexpected error',
      life: 4000,
    })
  } finally {
    creatingWallet.value = false
  }
}

async function onSeedConfirmed() {
  showSeedModal.value = false
  pendingMnemonic.value = ''
  await walletStore.fetchMine()
  toast.add({
    severity: 'success',
    summary: 'Wallet created',
    detail: 'Your new wallet is ready',
    life: 3000,
  })
}

// ── Transfer form ──────────────────────────────────────────────────────────
const transferForm = ref({
  senderWalletId: '',
  receiverWalletId: '',
  amount: '',
  nonce: '',
  mnemonic: '',
})
const transferring = ref(false)

const mnemonicValid = computed(
  () => !transferForm.value.mnemonic || isValidMnemonic(transferForm.value.mnemonic)
)
const selectedSender = computed(() =>
  walletStore.wallets.find((w) => w.wallet_id === transferForm.value.senderWalletId)
)

function formatWalletOption(walletId: string, balance: number, currency: string): string {
  return `${walletId.slice(0, 16)}… (${balance.toFixed(8)} ${currency})`
}

async function loadCurrencies() {
  try {
    const resp = await listCurrencies(true)
    currencies.value = resp.currencies
    if (!currencies.value.find((c) => c.code === selectedCurrency.value)) {
      selectedCurrency.value = currencies.value[0]?.code ?? 'NATIVE'
    }
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Failed to load currencies',
      detail: e instanceof Error ? e.message : 'Unexpected error',
      life: 4000,
    })
  }
}

async function submitTransfer() {
  const { senderWalletId, receiverWalletId, amount, nonce, mnemonic } = transferForm.value
  if (!senderWalletId || !receiverWalletId || !amount || !nonce || !mnemonic) return
  if (!isValidMnemonic(mnemonic)) {
    toast.add({
      severity: 'warn',
      summary: 'Invalid phrase',
      detail: 'Check your recovery phrase',
      life: 3000,
    })
    return
  }
  if (Number(amount) <= 0) {
    toast.add({
      severity: 'warn',
      summary: 'Invalid amount',
      detail: 'Amount must be positive',
      life: 3000,
    })
    return
  }

  transferring.value = true
  try {
    await walletStore.transfer(
      mnemonic,
      senderWalletId,
      receiverWalletId,
      Number(amount),
      Number(nonce)
    )
    toast.add({
      severity: 'success',
      summary: 'Transfer submitted',
      detail: 'Transaction is in the mempool — mine a block to confirm it',
      life: 5000,
    })
    transferForm.value = {
      senderWalletId: '',
      receiverWalletId: '',
      amount: '',
      nonce: '',
      mnemonic: '',
    }
  } catch (e) {
    const detail =
      e instanceof BlockchainApiError
        ? e.message
        : e instanceof Error
          ? e.message
          : 'Transfer failed'
    toast.add({ severity: 'error', summary: 'Transfer failed', detail, life: 5000 })
  } finally {
    transferring.value = false
  }
}

onMounted(async () => {
  await Promise.all([walletStore.fetchMine(), loadCurrencies()])
})
</script>

<template>
  <div class="wallet-page">
    <SeedPhraseModal
      :mnemonic="pendingMnemonic"
      :visible="showSeedModal"
      @confirm="onSeedConfirmed"
    />

    <!-- Header -->
    <div class="page-header">
      <h1 class="page-title">
        <span class="pi pi-wallet" aria-hidden="true" />
        My Wallets
      </h1>
      <div class="create-controls">
        <select v-model="selectedCurrency" class="field-select" :disabled="creatingWallet">
          <option v-for="currency in currencies" :key="currency.code" :value="currency.code">
            {{ currency.code }} · {{ currency.name }}
          </option>
        </select>
        <button class="btn-primary" :disabled="creatingWallet" @click="handleCreateWallet">
          <span v-if="creatingWallet" class="pi pi-spin pi-spinner" aria-hidden="true" />
          <span v-else class="pi pi-plus" aria-hidden="true" />
          New wallet
        </button>
      </div>
    </div>

    <!-- Wallet list -->
    <div v-if="walletStore.loading" class="loading-state">
      <span class="pi pi-spin pi-spinner" aria-hidden="true" />
      Loading wallets…
    </div>
    <div v-else-if="walletStore.wallets.length === 0" class="empty-state">
      <span class="pi pi-wallet empty-icon" aria-hidden="true" />
      <p>No wallets yet. Create one to get started.</p>
    </div>
    <div v-else class="wallet-grid">
      <div
        v-for="w in walletStore.wallets"
        :key="w.wallet_id"
        class="wallet-card"
        :class="{ frozen: w.frozen }"
      >
        <div class="wallet-card-header">
          <HashChip :hash="w.wallet_id" :length="16" label="wallet id" />
          <span v-if="w.frozen" class="frozen-badge">
            <span class="pi pi-lock" aria-hidden="true" /> Frozen
          </span>
        </div>
        <div class="wallet-balance">
          <AmountDisplay :amount="w.balance" :precision="8" :unit="w.currency" />
        </div>
        <div class="wallet-footer">
          <HashChip :hash="w.public_key" :length="20" label="public key" />
        </div>
      </div>
    </div>

    <!-- Transfer form -->
    <section v-if="walletStore.wallets.length > 0" class="transfer-section">
      <h2 class="section-title">
        <span class="pi pi-send" aria-hidden="true" />
        Transfer
      </h2>
      <form class="transfer-form" @submit.prevent="submitTransfer">
        <div class="form-row">
          <div class="form-field">
            <label class="field-label" for="sender">From wallet</label>
            <select id="sender" v-model="transferForm.senderWalletId" class="field-select" required>
              <option value="" disabled>Select wallet…</option>
              <option
                v-for="w in walletStore.wallets.filter((w) => !w.frozen)"
                :key="w.wallet_id"
                :value="w.wallet_id"
              >
                {{ formatWalletOption(w.wallet_id, w.balance, w.currency) }}
              </option>
            </select>
            <span v-if="selectedSender" class="field-hint balance-hint">
              Available:
              <AmountDisplay
                :amount="selectedSender.balance"
                :precision="8"
                :unit="selectedSender.currency"
              />
            </span>
          </div>
          <div class="form-field">
            <label class="field-label" for="receiver">To wallet ID</label>
            <input
              id="receiver"
              v-model="transferForm.receiverWalletId"
              class="field-input"
              type="text"
              placeholder="recipient wallet ID"
              required
            />
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label class="field-label" for="amount">Amount</label>
            <input
              id="amount"
              v-model="transferForm.amount"
              class="field-input"
              type="number"
              min="0.00000001"
              step="any"
              placeholder="0.00"
              required
            />
          </div>
          <div class="form-field">
            <label class="field-label" for="nonce">Nonce</label>
            <input
              id="nonce"
              v-model="transferForm.nonce"
              class="field-input"
              type="number"
              min="1"
              step="1"
              placeholder="1"
              required
            />
            <span class="field-hint">Must be higher than the previous nonce for this wallet</span>
          </div>
        </div>
        <div class="form-field full-width">
          <label class="field-label" for="mnemonic">Recovery phrase</label>
          <textarea
            id="mnemonic"
            v-model="transferForm.mnemonic"
            class="field-input mnemonic-input"
            :class="{ invalid: !mnemonicValid }"
            placeholder="12-word BIP-39 recovery phrase"
            rows="2"
            required
          />
          <span v-if="!mnemonicValid" class="field-error">Invalid recovery phrase</span>
          <span v-else class="field-hint"
            >Your phrase never leaves the browser — it is used only to sign the transaction
            locally</span
          >
        </div>
        <div class="form-actions">
          <button class="btn-primary" type="submit" :disabled="transferring || !mnemonicValid">
            <span v-if="transferring" class="pi pi-spin pi-spinner" aria-hidden="true" />
            <span v-else class="pi pi-send" aria-hidden="true" />
            {{ transferring ? 'Submitting…' : 'Submit transfer' }}
          </button>
        </div>
      </form>
      <p class="transfer-note">
        <span class="pi pi-info-circle" aria-hidden="true" />
        The transfer is placed in the mempool. Ask the operator to mine a block to confirm it. The
        balance shown above updates once a block is mined.
      </p>
    </section>
  </div>
</template>

<style scoped>
.wallet-page {
  max-width: 900px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.create-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.page-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-heading);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}
.btn-primary {
  padding: 0.55rem 1rem;
  background: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: opacity 0.15s;
}
.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* Wallet cards */
.wallet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}
.wallet-card {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  padding: 1.2rem;
  box-shadow: var(--shadow-soft);
  transition: border-color 0.15s;
}
.wallet-card.frozen {
  border-color: #f59e0b;
  opacity: 0.8;
}
.wallet-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}
.frozen-badge {
  font-size: 0.75rem;
  color: #f59e0b;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.2rem;
}
.wallet-balance {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-heading);
  margin-bottom: 0.75rem;
}
.currency {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 400;
}
.wallet-footer {
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* States */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  color: var(--text-muted);
  font-size: 0.95rem;
}
.empty-icon {
  font-size: 2.5rem;
  opacity: 0.4;
}

/* Transfer form */
.transfer-section {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-soft);
}
.section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-heading);
  margin: 0 0 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.transfer-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.full-width {
  grid-column: 1 / -1;
}
.field-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
}
.field-input,
.field-select {
  padding: 0.55rem 0.8rem;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-ground);
  color: var(--text-body);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
}
.field-input:focus,
.field-select:focus {
  border-color: var(--primary-color);
}
.field-input.invalid {
  border-color: #ef4444;
}
.mnemonic-input {
  resize: vertical;
  font-family: monospace;
}
.field-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
}
.balance-hint {
  margin-top: 0.15rem;
}
.field-error {
  font-size: 0.75rem;
  color: #ef4444;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
}
.transfer-note {
  margin-top: 1rem;
  font-size: 0.82rem;
  color: var(--text-muted);
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  line-height: 1.5;
}
</style>
