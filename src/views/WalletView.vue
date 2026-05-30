<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { useConfirmedTransactionsStore } from '@/stores/confirmedTransactions'
import { useAuthStore } from '@/stores/auth'
import { defaultLandingFor } from '@/router'
import { listCurrencies, type CurrencyRecord, type Wallet } from '@/api/wallets'
import { useWalletCreate } from '@/composables/useWalletCreate'
import SeedPhraseModal from '@/components/molecules/SeedPhraseModal.vue'
import HashChip from '@/components/atoms/HashChip.vue'
import AmountDisplay from '@/components/atoms/AmountDisplay.vue'
import { useToast } from '@/composables/useToast'
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
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const {
  pendingMnemonic,
  showSeedModal,
  creatingWallet,
  selectedCurrency,
  handleCreateWallet,
  onSeedConfirmed,
  onSeedClosed,
} = useWalletCreate()

const currencies = ref<CurrencyRecord[]>([])

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
      summary: 'Error al cargar monedas',
      detail: e instanceof Error ? e.message : 'Error inesperado',
      life: 4000,
    })
  }
}

onMounted(async () => {
  await Promise.all([walletStore.fetchMine(), loadCurrencies(), confirmedStore.fetchConfirmed()])
  if (walletStore.errorCode === 'FORBIDDEN') {
    toast.add({
      severity: 'warn',
      summary: 'Acceso restringido',
      detail: 'Tu rol no puede operar la vista de wallets de usuario.',
      life: 4500,
    })
    await router.replace(defaultLandingFor(auth.user?.roles ?? []))
  }
  // Pre-select wallet if currency query param provided (e.g. from PortfolioView assets table)
  const currencyParam = route.query.currency as string | undefined
  if (currencyParam) {
    const match = walletStore.wallets.find((w) => w.currency === currencyParam)
    if (match) selectedWalletId.value = match.wallet_id
  }
})

// ── Flow refs ─────────────────────────────────────────────────────────────────

const sendFlowData = ref<SendData | null>(null)
const receiveFlowData = ref<ReceiveData | null>(null)
const withdrawFlowData = ref<WithdrawData | null>(null)
const convertFlowData = ref<ConvertData | null>(null)

// ── Wallet selection ──────────────────────────────────────────────────────────

const selectedWalletId = ref<string | null>(null)

const activeWallet = computed(
  () => walletStore.wallets.find((w) => w.wallet_id === selectedWalletId.value) ?? null
)

function selectWallet(walletId: string) {
  selectedWalletId.value = selectedWalletId.value === walletId ? null : walletId
}

// ── Movement history filtered to selected wallet ──────────────────────────────

const ownWalletIds = computed(() => new Set(walletStore.wallets.map((w) => w.wallet_id)))

const movements = computed(() => {
  const records = confirmedStore.records
    .filter((r) => ownWalletIds.value.has(r.sender) || ownWalletIds.value.has(r.receiver))
    .slice()
    .reverse()
  if (!selectedWalletId.value) return records
  const id = selectedWalletId.value
  return records.filter((r) => r.sender === id || r.receiver === id)
})

function shortAddr(addr: string, n = 8): string {
  if (!addr) return '—'
  return addr.length > n * 2 ? `${addr.slice(0, n)}…${addr.slice(-n)}` : addr
}

function movementDirection(sender: string): 'out' | 'in' {
  return ownWalletIds.value.has(sender) ? 'out' : 'in'
}

// ── Quick actions ─────────────────────────────────────────────────────────────

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
  convertFlowData.value = { from: wallet?.currency }
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

    <!-- Page header -->
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

    <!-- Quick action bar (uses active wallet if selected) -->
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

    <!-- Wallet grid -->
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
        <span class="count-badge sm">{{ walletStore.wallets.length }}</span>
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
            <button class="btn btn-sm btn-primary" :disabled="w.frozen" @click="openSend(w)">
              <span class="pi pi-send" aria-hidden="true" /> Enviar
            </button>
            <button class="btn btn-sm" @click="openReceive(w)">
              <span class="pi pi-download" aria-hidden="true" /> Recibir
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Movement history filtered to selected wallet -->
    <section class="panel">
      <div class="panel-h">
        <span>
          Historial de movimientos
          <template v-if="activeWallet">
            — {{ shortAddr(activeWallet.wallet_id) }}
          </template>
        </span>
        <span v-if="movements.length > 0" class="count-badge sm">{{ movements.length }}</span>
      </div>
      <div v-if="confirmedStore.loading" class="empty-state sm">
        <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
      </div>
      <div v-else-if="movements.length === 0" class="empty-state sm muted">
        <template v-if="activeWallet">
          Sin movimientos para esta wallet todavía.
        </template>
        <template v-else>
          Sin movimientos confirmados todavía.
        </template>
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

      <!-- Other wallets quick links -->
      <div v-if="activeWallet && walletStore.wallets.length > 1" class="other-wallets">
        <span class="other-wallets-label">Otras wallets:</span>
        <button
          v-for="w in walletStore.wallets.filter((w) => w.wallet_id !== selectedWalletId)"
          :key="w.wallet_id"
          class="other-wallet-chip"
          @click="selectWallet(w.wallet_id)"
        >
          {{ shortAddr(w.wallet_id, 6) }}
          <span class="chip-currency">{{ w.currency }}</span>
        </button>
      </div>
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
.selected-hint strong {
  color: var(--text);
}
.btn-clear {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-3);
  font-size: 11px;
  padding: 0 2px;
  line-height: 1;
}
.btn-clear:hover {
  color: var(--text);
}

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

.panel { overflow: hidden; }
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

.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.tbl th, .tbl td {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
.tbl tr:last-child td { border-bottom: none; }
.tbl th.num, .tbl td.num { text-align: right; }
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px;
  color: var(--text-2);
  font-size: 14px;
}
.empty-state.sm {
  padding: 24px;
  font-size: 13px;
}
.empty-icon {
  font-size: 36px;
  opacity: 0.3;
}

/* Other wallets quick links */
.other-wallets {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
  flex-wrap: wrap;
}
.other-wallets-label {
  font-size: 11.5px;
  color: var(--text-3);
  font-weight: 500;
}
.other-wallet-chip {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 3px 10px;
  font-size: 11.5px;
  font-family: var(--font-mono);
  color: var(--text);
  cursor: pointer;
  transition: border-color 0.12s;
  display: flex;
  align-items: center;
  gap: 4px;
}
.other-wallet-chip:hover {
  border-color: var(--accent);
}
.chip-currency {
  font-size: 10px;
  color: var(--text-3);
  font-family: var(--font-sans);
}

.field-select {
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  font-size: 13px;
  outline: none;
  transition: border-color 0.12s;
  font-family: var(--font-sans);
}
.field-select:focus { border-color: var(--accent); }

@media (max-width: 640px) {
  .page-h { flex-direction: column; align-items: flex-start; }
}
</style>
