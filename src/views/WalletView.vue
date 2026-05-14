<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { useConfirmedTransactionsStore } from '@/stores/confirmedTransactions'
import { confirmWallet, listCurrencies, previewWallet, type CurrencyRecord, type Wallet } from '@/api/wallets'
import { isValidMnemonic } from '@/lib/crypto'
import SeedPhraseModal from '@/components/molecules/SeedPhraseModal.vue'
import HashChip from '@/components/atoms/HashChip.vue'
import AmountDisplay from '@/components/atoms/AmountDisplay.vue'
import { useToast } from 'primevue/usetoast'
import { BlockchainApiError } from '@/api/errors'
import SendConfirmFlow from '@/components/flows/SendConfirmFlow.vue'
import type { SendData } from '@/components/flows/SendConfirmFlow.vue'
import ReceiveFlow from '@/components/flows/ReceiveFlow.vue'
import type { ReceiveData } from '@/components/flows/ReceiveFlow.vue'
import WithdrawFlow from '@/components/flows/WithdrawFlow.vue'
import type { WithdrawData } from '@/components/flows/WithdrawFlow.vue'
import ConvertFlow from '@/components/flows/ConvertFlow.vue'
import type { ConvertData } from '@/components/flows/ConvertFlow.vue'

const walletStore = useWalletStore()
const confirmedStore = useConfirmedTransactionsStore()
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
  await Promise.all([walletStore.fetchMine(), loadCurrencies(), confirmedStore.fetchConfirmed()])
})

const sendFlowData = ref<SendData | null>(null)
const receiveFlowData = ref<ReceiveData | null>(null)
const withdrawFlowData = ref<WithdrawData | null>(null)
const convertFlowData = ref<ConvertData | null>(null)

// KPI tiles
const totalWallets = computed(() => walletStore.wallets.length)
const totalBalance = computed(() => {
  const native = walletStore.wallets.filter((w) => w.currency === 'NATIVE')
  if (native.length === 0) return '—'
  return native.reduce((sum, w) => sum + Number(w.balance), 0).toFixed(4)
})
const currencyCount = computed(
  () => new Set(walletStore.wallets.map((w) => w.currency)).size,
)
const frozenCount = computed(
  () => walletStore.wallets.filter((w) => w.frozen).length,
)

// Wallet selection
const selectedWalletId = ref<string | null>(null)
const activeWallet = computed(() =>
  walletStore.wallets.find((w) => w.wallet_id === selectedWalletId.value) ?? null,
)

function selectWallet(walletId: string) {
  selectedWalletId.value = selectedWalletId.value === walletId ? null : walletId
}

// Movement history — confirmed txs involving any of the user's wallet IDs
const ownWalletIds = computed(() => new Set(walletStore.wallets.map((w) => w.wallet_id)))
const movements = computed(() =>
  confirmedStore.records
    .filter((r) => ownWalletIds.value.has(r.sender) || ownWalletIds.value.has(r.receiver))
    .slice()
    .reverse(),
)

function shortAddr(addr: string, n = 8): string {
  if (!addr) return '—'
  return addr.length > n * 2 ? `${addr.slice(0, n)}…${addr.slice(-n)}` : addr
}

function movementDirection(sender: string): 'out' | 'in' {
  return ownWalletIds.value.has(sender) ? 'out' : 'in'
}

function openSend(w?: Wallet) {
  const wallet = w ?? activeWallet.value
  sendFlowData.value = {
    to: wallet?.wallet_id ?? '',
    handle: wallet ? shortAddr(wallet.wallet_id) : '',
    amount: '',
    asset: wallet?.currency ?? 'NATIVE',
  }
}

function openReceive(w?: Wallet) {
  const wallet = w ?? activeWallet.value
  receiveFlowData.value = {
    asset: wallet?.currency ?? 'NATIVE',
    address: wallet?.wallet_id ?? '',
  }
}

function openWithdraw(w?: Wallet) {
  const wallet = w ?? activeWallet.value
  withdrawFlowData.value = {
    asset: wallet?.currency ?? 'NATIVE',
    balance: wallet ? Number(wallet.balance).toFixed(8) : '0',
  }
}

function openConvert(w?: Wallet) {
  const wallet = w ?? activeWallet.value
  convertFlowData.value = {
    from: wallet?.currency ?? 'NATIVE',
    to: undefined,
  }
}
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
        <button class="btn btn-primary" :disabled="creatingWallet" @click="handleCreateWallet">
          <span v-if="creatingWallet" class="pi pi-spin pi-spinner" aria-hidden="true" />
          <span v-else class="pi pi-plus" aria-hidden="true" />
          Nueva wallet
        </button>
      </div>
    </div>

    <!-- KPI tiles -->
    <div class="bigstat-row">
      <div class="bigstat">
        <div class="lb">Wallets</div>
        <div class="vl">{{ totalWallets }}</div>
        <div class="ds">cuentas activas</div>
      </div>
      <div class="bigstat">
        <div class="lb">Balance NATIVE</div>
        <div class="vl">{{ totalBalance }}</div>
        <div class="ds">saldo nativo total</div>
      </div>
      <div class="bigstat">
        <div class="lb">Monedas</div>
        <div class="vl">{{ currencyCount }}</div>
        <div class="ds">tipos de activo</div>
      </div>
      <div class="bigstat">
        <div class="lb">Congeladas</div>
        <div class="vl" :class="{ 'vl-danger': frozenCount > 0 }">{{ frozenCount }}</div>
        <div class="ds">requieren atención</div>
      </div>
    </div>

    <!-- Quick actions — use selected wallet if any -->
    <div class="quick-actions">
      <button class="btn btn-primary btn-sm" @click="openSend()">
        <span class="pi pi-send" aria-hidden="true" /> Enviar
      </button>
      <button class="btn btn-sm" @click="openReceive()">
        <span class="pi pi-download" aria-hidden="true" /> Recibir
      </button>
      <button class="btn btn-sm" @click="openWithdraw()">
        <span class="pi pi-external-link" aria-hidden="true" /> Retirar
      </button>
      <button class="btn btn-sm" @click="openConvert()">
        <span class="pi pi-arrows-h" aria-hidden="true" /> Convertir
      </button>
      <span v-if="activeWallet" class="selected-hint">
        Usando: <strong>{{ shortAddr(activeWallet.wallet_id) }}</strong>
        <button class="btn-clear" @click="selectedWalletId = null">✕</button>
      </span>
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
    <section v-else class="panel">
      <div class="panel-h">
        <span>Mis wallets</span>
        <span class="count-badge sm">{{ totalWallets }}</span>
      </div>
      <div class="wallet-grid">
        <div
          v-for="w in walletStore.wallets"
          :key="w.wallet_id"
          class="wallet-card"
          :class="{ frozen: w.frozen, selected: selectedWalletId === w.wallet_id }"
          role="button"
          tabindex="0"
          @click="selectWallet(w.wallet_id)"
          @keydown.enter="selectWallet(w.wallet_id)"
          @keydown.space.prevent="selectWallet(w.wallet_id)"
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
          <div class="wc-actions" @click.stop>
            <button
              class="btn btn-sm btn-primary"
              :disabled="w.frozen"
              @click="openSend(w)"
            >
              <span class="pi pi-send" aria-hidden="true" /> Enviar
            </button>
            <button class="btn btn-sm" @click="openReceive(w)">
              <span class="pi pi-download" aria-hidden="true" /> Recibir
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Transfer panel -->
    <section v-if="walletStore.wallets.length > 0" class="flow-card">
      <div class="panel-h">Transferencia directa</div>
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
          <button class="btn btn-primary" type="submit" :disabled="transferring || !mnemonicValid">
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

    <!-- Movement history -->
    <section class="panel">
      <div class="panel-h">
        <span>Historial de movimientos</span>
        <span v-if="movements.length > 0" class="count-badge sm">{{ movements.length }}</span>
      </div>
      <div v-if="confirmedStore.loading" class="empty-state sm">
        <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
      </div>
      <div v-else-if="movements.length === 0" class="empty-state sm muted">
        Sin movimientos confirmados todavía.
      </div>
      <table v-else class="tbl">
        <thead>
          <tr>
            <th>Bloque</th>
            <th>Dirección</th>
            <th>Contraparte</th>
            <th class="num">Monto</th>
            <th>Confirmado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(rec, i) in movements" :key="i">
            <td class="mono">#{{ rec.blockIndex ?? '—' }}</td>
            <td>
              <span
                class="dir-badge"
                :class="movementDirection(rec.sender) === 'out' ? 'dir-out' : 'dir-in'"
              >
                {{ movementDirection(rec.sender) === 'out' ? '↑ Enviado' : '↓ Recibido' }}
              </span>
            </td>
            <td class="mono xs">
              {{
                movementDirection(rec.sender) === 'out'
                  ? shortAddr(rec.receiver)
                  : shortAddr(rec.sender)
              }}
            </td>
            <td class="num mono">{{ rec.amount }}</td>
            <td class="muted xs">{{ rec.blockTimestamp ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>

  <SendConfirmFlow
    v-if="sendFlowData"
    :data="sendFlowData"
    @close="sendFlowData = null"
    @complete="sendFlowData = null"
  />
  <ReceiveFlow
    v-if="receiveFlowData"
    :data="receiveFlowData"
    @close="receiveFlowData = null"
    @complete="receiveFlowData = null"
  />
  <WithdrawFlow
    v-if="withdrawFlowData"
    :data="withdrawFlowData"
    @close="withdrawFlowData = null"
    @complete="withdrawFlowData = null"
  />
  <ConvertFlow
    v-if="convertFlowData"
    :data="convertFlowData"
    @close="convertFlowData = null"
    @complete="convertFlowData = null"
  />
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

/* Bigstat KPI row */
.bigstat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.bigstat {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
}
.lb { font-size: 11.5px; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.04em; }
.vl { font-size: 26px; font-weight: 600; letter-spacing: -0.02em; margin: 4px 0; color: var(--text); font-variant-numeric: tabular-nums; }
.ds { font-size: 11.5px; color: var(--text-3); }
.vl-danger { color: var(--danger); }

/* Quick actions bar */
.quick-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.selected-hint {
  font-size: 12px;
  color: var(--text-2);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
}
.selected-hint strong { color: var(--text); }
.btn-clear {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-3);
  font-size: 11px;
  padding: 0 2px;
  line-height: 1;
}
.btn-clear:hover { color: var(--text); }

/* Wallet grid */
.wallet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  padding: 14px;
}
.wallet-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.15s, box-shadow 0.15s;
  cursor: pointer;
  outline: none;
}
.wallet-card:hover { border-color: var(--accent); }
.wallet-card:focus-visible { box-shadow: 0 0 0 2px var(--accent); }
.wallet-card.frozen { border-color: var(--warning); }
.wallet-card.selected {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, var(--surface));
}

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
.wc-actions {
  display: flex;
  gap: 6px;
  padding-top: 4px;
  border-top: 1px solid var(--border);
}

/* Panel header override (global .panel has padding, not overflow:hidden) */
.panel {
  overflow: hidden;
}
.panel-h {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}

/* Movement history table */
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.tbl th,
.tbl td {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
.tbl tr:last-child td { border-bottom: none; }
.tbl th.num,
.tbl td.num { text-align: right; }
.mono { font-family: var(--font-mono); }
.xs { font-size: 11.5px; }
.muted { color: var(--text-3); }

.dir-badge {
  display: inline-block;
  font-size: 11.5px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
}
.dir-out {
  background: color-mix(in srgb, var(--danger) 12%, transparent);
  color: var(--danger);
}
.dir-in {
  background: color-mix(in srgb, var(--success) 12%, transparent);
  color: var(--success);
}

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
.empty-state.sm { padding: 24px; font-size: 13px; }
.empty-icon { font-size: 36px; opacity: 0.3; }

/* Transfer form */
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

@media (max-width: 900px) {
  .bigstat-row { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .page-h  { flex-direction: column; align-items: flex-start; }
  .form-row { grid-template-columns: 1fr; }
  .bigstat-row { grid-template-columns: 1fr 1fr; }
}
</style>
