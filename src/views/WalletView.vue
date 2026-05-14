<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { confirmWallet, listCurrencies, previewWallet, type CurrencyRecord } from '@/api/wallets'
import { isValidMnemonic } from '@/lib/crypto'
import SeedPhraseModal from '@/components/molecules/SeedPhraseModal.vue'
import HashChip from '@/components/atoms/HashChip.vue'
import AmountDisplay from '@/components/atoms/AmountDisplay.vue'
import { useToast } from 'primevue/usetoast'
import { BlockchainApiError } from '@/api/errors'

const walletStore = useWalletStore()
const toast = useToast()

const pendingMnemonic = ref('')
const showSeedModal = ref(false)
const creatingWallet = ref(false)
const pendingDraftId = ref('')
const currencies = ref<CurrencyRecord[]>([])
const selectedCurrency = ref('NATIVE')

async function handleCreateWallet() {
  creatingWallet.value = true
  try {
    const resp = await previewWallet(selectedCurrency.value)
    pendingDraftId.value = resp.draft_id
    pendingMnemonic.value = resp.mnemonic
    showSeedModal.value = true
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error al crear wallet', detail: e instanceof Error ? e.message : 'Error inesperado', life: 4000 })
  } finally {
    creatingWallet.value = false
  }
}

async function onSeedConfirmed() {
  try {
    await confirmWallet(pendingDraftId.value)
    await walletStore.fetchMine()
    toast.add({ severity: 'success', summary: 'Wallet creada', detail: 'Tu nueva wallet está lista', life: 3000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error al confirmar wallet', detail: e instanceof Error ? e.message : 'Error inesperado', life: 4000 })
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

const transferForm = ref({ senderWalletId: '', receiverWalletId: '', amount: '', nonce: '', mnemonic: '' })
const transferring = ref(false)

const mnemonicValid = computed(() => !transferForm.value.mnemonic || isValidMnemonic(transferForm.value.mnemonic))
const selectedSender = computed(() => walletStore.wallets.find((w) => w.wallet_id === transferForm.value.senderWalletId))

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
    toast.add({ severity: 'error', summary: 'Error al cargar monedas', detail: e instanceof Error ? e.message : 'Error inesperado', life: 4000 })
  }
}

async function submitTransfer() {
  const { senderWalletId, receiverWalletId, amount, nonce, mnemonic } = transferForm.value
  if (!senderWalletId || !receiverWalletId || !amount || !nonce || !mnemonic) return
  if (!isValidMnemonic(mnemonic)) {
    toast.add({ severity: 'warn', summary: 'Frase inválida', detail: 'Verifica tu frase de recuperación', life: 3000 })
    return
  }
  if (Number(amount) <= 0) {
    toast.add({ severity: 'warn', summary: 'Monto inválido', detail: 'El monto debe ser positivo', life: 3000 })
    return
  }
  transferring.value = true
  try {
    await walletStore.transfer(mnemonic, senderWalletId, receiverWalletId, Number(amount), Number(nonce))
    toast.add({ severity: 'success', summary: 'Transferencia enviada', detail: 'Transacción en mempool — mina un bloque para confirmarla', life: 5000 })
    transferForm.value = { senderWalletId: '', receiverWalletId: '', amount: '', nonce: '', mnemonic: '' }
  } catch (e) {
    const detail = e instanceof BlockchainApiError ? e.message : e instanceof Error ? e.message : 'Transferencia fallida'
    toast.add({ severity: 'error', summary: 'Error en transferencia', detail, life: 5000 })
  } finally {
    transferring.value = false
  }
}

onMounted(async () => {
  await Promise.all([walletStore.fetchMine(), loadCurrencies()])
})
</script>

<template>
  <div class="wallet-view">
    <SeedPhraseModal
      :mnemonic="pendingMnemonic"
      :visible="showSeedModal"
      @confirm="onSeedConfirmed"
      @close="onSeedClosed"
    />

    <div class="page-h">
      <div>
        <h1>Mis wallets</h1>
        <p>Gestiona tus wallets y realiza transferencias</p>
      </div>
      <div class="page-actions">
        <select v-model="selectedCurrency" class="field-select" :disabled="creatingWallet">
          <option v-for="currency in currencies" :key="currency.code" :value="currency.code">
            {{ currency.code }} · {{ currency.name }}
          </option>
        </select>
        <button class="btn-primary" :disabled="creatingWallet" @click="handleCreateWallet">
          <span v-if="creatingWallet" class="pi pi-spin pi-spinner" aria-hidden="true" />
          <span v-else class="pi pi-plus" aria-hidden="true" />
          Nueva wallet
        </button>
      </div>
    </div>

    <!-- Wallet list -->
    <div v-if="walletStore.loading" class="empty-state">
      <span class="pi pi-spin pi-spinner" aria-hidden="true" />
      Cargando wallets…
    </div>
    <div v-else-if="walletStore.wallets.length === 0" class="empty-state">
      <span class="pi pi-wallet empty-icon" aria-hidden="true" />
      <p>Sin wallets todavía. Crea una para empezar.</p>
    </div>
    <div v-else class="wallet-grid">
      <div
        v-for="w in walletStore.wallets"
        :key="w.wallet_id"
        class="wallet-card"
        :class="{ frozen: w.frozen }"
      >
        <div class="wc-top">
          <HashChip :hash="w.wallet_id" :length="16" label="wallet id" />
          <span v-if="w.frozen" class="frozen-tag">
            <span class="pi pi-lock" aria-hidden="true" /> Congelada
          </span>
        </div>
        <div class="wc-balance">
          <AmountDisplay :amount="w.balance" :precision="8" :unit="w.currency" />
        </div>
        <div class="wc-key">
          <HashChip :hash="w.public_key" :length="20" label="public key" />
        </div>
      </div>
    </div>

    <!-- Transfer panel -->
    <section v-if="walletStore.wallets.length > 0" class="panel">
      <div class="panel-h">Transferencia</div>
      <form class="transfer-form" @submit.prevent="submitTransfer">
        <div class="form-row">
          <div class="field">
            <label class="field-label" for="sender">Desde wallet</label>
            <select id="sender" v-model="transferForm.senderWalletId" class="field-select" required>
              <option value="" disabled>Selecciona wallet…</option>
              <option v-for="w in walletStore.wallets.filter((w) => !w.frozen)" :key="w.wallet_id" :value="w.wallet_id">
                {{ formatWalletOption(w.wallet_id, w.balance, w.currency) }}
              </option>
            </select>
            <span v-if="selectedSender" class="field-hint">
              <AmountDisplay :amount="selectedSender.balance" :precision="8" :unit="selectedSender.currency" />
            </span>
          </div>
          <div class="field">
            <label class="field-label" for="receiver">Hacia wallet ID</label>
            <input id="receiver" v-model="transferForm.receiverWalletId" class="field-input" type="text" placeholder="ID de la wallet destinataria" required />
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label class="field-label" for="amount">Monto</label>
            <input id="amount" v-model="transferForm.amount" class="field-input" type="number" min="0.00000001" step="any" placeholder="0.00" required />
          </div>
          <div class="field">
            <label class="field-label" for="nonce">Nonce</label>
            <input id="nonce" v-model="transferForm.nonce" class="field-input" type="number" min="1" step="1" placeholder="1" required />
            <span class="field-hint">Debe ser mayor al nonce anterior de esta wallet</span>
          </div>
        </div>
        <div class="field">
          <label class="field-label" for="mnemonic">Frase de recuperación</label>
          <textarea
            id="mnemonic"
            v-model="transferForm.mnemonic"
            class="field-input mnemonic-input"
            :class="{ invalid: !mnemonicValid }"
            placeholder="Frase de 12 palabras BIP-39"
            rows="2"
            required
          />
          <span v-if="!mnemonicValid" class="field-error">Frase de recuperación inválida</span>
          <span v-else class="field-hint">Tu frase nunca sale del navegador — solo se usa para firmar la transacción localmente</span>
        </div>
        <div class="form-actions">
          <button class="btn-primary" type="submit" :disabled="transferring || !mnemonicValid">
            <span v-if="transferring" class="pi pi-spin pi-spinner" aria-hidden="true" />
            <span v-else class="pi pi-send" aria-hidden="true" />
            {{ transferring ? 'Enviando…' : 'Enviar transferencia' }}
          </button>
        </div>
      </form>
      <p class="transfer-note">
        <span class="pi pi-info-circle" aria-hidden="true" />
        La transferencia queda en el mempool. Se confirma cuando se mine un bloque. El balance se actualiza tras la minería.
      </p>
    </section>
  </div>
</template>

<style scoped>
.wallet-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-h {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.page-h h1 {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.015em;
  margin: 0 0 2px;
  color: var(--text);
}
.page-h p {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
}
.page-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.12s;
  font-family: var(--font-sans);
}
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-primary:not(:disabled):hover { opacity: 0.88; }

/* Wallet grid */
.wallet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
.wallet-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.15s;
}
.wallet-card.frozen { border-color: var(--warning); }
.wc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.frozen-tag {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--warning);
  display: flex;
  align-items: center;
  gap: 3px;
}
.wc-balance {
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.wc-key { font-size: 12px; color: var(--text-3); }

/* Empty / loading */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px;
  color: var(--text-2);
  font-size: 14px;
}
.empty-icon { font-size: 36px; opacity: 0.3; }

/* Transfer panel */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.panel-h {
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.transfer-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 12px; font-weight: 500; color: var(--text-2); }
.field-input,
.field-select {
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  font-size: 13px;
  outline: none;
  transition: border-color 0.12s;
  width: 100%;
  box-sizing: border-box;
  font-family: var(--font-sans);
}
.field-input:focus, .field-select:focus { border-color: var(--accent); }
.field-input.invalid { border-color: var(--danger); }
.mnemonic-input { resize: vertical; font-family: var(--font-mono); }
.field-hint { font-size: 11.5px; color: var(--text-3); }
.field-error { font-size: 11.5px; color: var(--danger); }
.form-actions { display: flex; justify-content: flex-end; }
.transfer-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 0 16px 14px;
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.5;
}

@media (max-width: 640px) {
  .page-h  { flex-direction: column; align-items: flex-start; }
  .form-row { grid-template-columns: 1fr; }
}
</style>
