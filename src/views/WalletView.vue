<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { useConfirmedTransactionsStore } from '@/stores/confirmedTransactions'
import { useAuthStore } from '@/stores/auth'
import { useExchangeRatesStore } from '@/stores/exchangeRates'
import { defaultLandingFor } from '@/router'
import type { Wallet } from '@/api/wallets'
import { useWalletCreate } from '@/composables/useWalletCreate'
import WalletCreateFlow from '@/components/flows/WalletCreateFlow.vue'
import QRCodeCanvas from '@/components/atoms/QRCodeCanvas.vue'
import { useToast } from '@/composables/useToast'
import SendConfirmFlow from '@/components/flows/SendConfirmFlow.vue'
import type { SendData } from '@/components/flows/SendConfirmFlow.vue'
import ReceiveFlow from '@/components/flows/ReceiveFlow.vue'
import type { ReceiveData } from '@/components/flows/ReceiveFlow.vue'
import ConvertFlow from '@/components/flows/ConvertFlow.vue'
import type { ConvertData } from '@/components/flows/ConvertFlow.vue'

const walletStore   = useWalletStore()
const confirmedStore = useConfirmedTransactionsStore()
const auth          = useAuthStore()
const ratesStore    = useExchangeRatesStore()
const router        = useRouter()
const route         = useRoute()
const toast         = useToast()

const { showCreateFlow, handleCreateWallet, onCreateComplete } = useWalletCreate()

// Local currency name map (currency selector is inside WalletCreateFlow)
const CURRENCY_NAMES: Record<string, string> = {
  NATIVE: 'Native', cUSD: 'Cadena USD', BTC: 'Bitcoin',
  ETH: 'Ethereum', USDT: 'Tether', USDC: 'USD Coin', SOL: 'Solana',
}
function currencyName(code: string): string {
  return CURRENCY_NAMES[code] ?? code
}

// ── Wallet selection (auto-select first on load) ──────────────────────────────

const selectedWalletId = ref<string | null>(null)

const activeWallet = computed<Wallet | null>(
  () => walletStore.wallets.find((w) => w.wallet_id === selectedWalletId.value)
    ?? walletStore.wallets[0]
    ?? null
)

const otherWallets = computed(() =>
  walletStore.wallets.filter((w) => w.wallet_id !== activeWallet.value?.wallet_id)
)

watch(() => walletStore.wallets, (ws) => {
  if (ws.length > 0 && !selectedWalletId.value) {
    selectedWalletId.value = ws[0].wallet_id
  }
}, { immediate: true })

function selectWallet(walletId: string) {
  selectedWalletId.value = walletId
  receiveCopied.value = false
}

// ── Copy receive address ──────────────────────────────────────────────────────

const receiveCopied = ref(false)

function copyAddress() {
  const addr = activeWallet.value?.wallet_id ?? ''
  if (!addr) return
  navigator.clipboard.writeText(addr).catch(() => {})
  receiveCopied.value = true
  setTimeout(() => { receiveCopied.value = false }, 1500)
}

// ── USD values ────────────────────────────────────────────────────────────────

function usdStr(balance: number, currency: string): string {
  const v = ratesStore.usdValue(balance, currency)
  if (v === null) return ''
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)
}

// ── Movements — enriched labels ───────────────────────────────────────────────
// sender/receiver in confirmedStore are usernames, not wallet IDs.

const myUsername = computed(() => auth.user?.username ?? '')

const movements = computed(() =>
  confirmedStore.records
    .filter((r) => r.sender === myUsername.value || r.receiver === myUsername.value)
    .slice()
    .reverse()
)

function movementDirection(sender: string): 'out' | 'in' {
  return sender === myUsername.value ? 'out' : 'in'
}

function movementLabel(sender: string, receiver: string): string {
  return sender === myUsername.value
    ? `Enviado a ${displayName(receiver)}`
    : `Recibido de ${displayName(sender)}`
}

function displayName(username: string): string {
  if (!username) return '—'
  // Shorten system/treasury names
  if (username.startsWith('TREASURY') || username.startsWith('COINBASE')) {
    return username.slice(0, 14) + (username.length > 14 ? '…' : '')
  }
  return username
}

function relativeTime(ts: string | undefined): string {
  if (!ts) return '—'
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ayer'
  if (d < 7) return `hace ${d} d`
  return new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

// ── Currency icon color ───────────────────────────────────────────────────────

const CURRENCY_COLORS: Record<string, string> = {
  BTC:   '#F7931A',
  ETH:   '#627EEA',
  USDT:  '#26A17B',
  USDC:  '#2775CA',
  SOL:   '#9945FF',
  cUSD:  '#35D07F',
  NATIVE:'#6B7280',
}

function currencyColor(code: string): string {
  return CURRENCY_COLORS[code] ?? '#6B7280'
}

// ── Flows ─────────────────────────────────────────────────────────────────────

const sendFlowData    = ref<SendData | null>(null)
const receiveFlowData = ref<ReceiveData | null>(null)
const convertFlowData  = ref<ConvertData | null>(null)

function openSend(w?: Wallet) {
  const wallet = w ?? activeWallet.value
  if (!wallet) return
  sendFlowData.value = {
    to: wallet.wallet_id,
    handle: wallet.wallet_id.slice(0, 12) + '…',
    amount: '',
    asset: wallet.currency,
  }
}

function openReceive(w?: Wallet) {
  const wallet = w ?? activeWallet.value
  if (!wallet) return
  receiveFlowData.value = { asset: wallet.currency, address: wallet.wallet_id }
}

function openConvert(w?: Wallet) {
  const wallet = w ?? activeWallet.value
  convertFlowData.value = { from: wallet?.currency }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([
    walletStore.fetchMine(),
    confirmedStore.fetchConfirmed(),
    ratesStore.fetchRates(),
  ])
  if (walletStore.errorCode === 'FORBIDDEN') {
    toast.add({ severity: 'warn', summary: 'Acceso restringido', detail: 'Tu rol no puede operar la vista de wallets de usuario.', life: 4500 })
    await router.replace(defaultLandingFor(auth.user?.roles ?? []))
  }
  // Pre-select wallet from ?currency= query param (e.g. from PortfolioView)
  const currencyParam = route.query.currency as string | undefined
  if (currencyParam) {
    const match = walletStore.wallets.find((w) => w.currency === currencyParam)
    if (match) selectedWalletId.value = match.wallet_id
  }
})
</script>

<template>
  <div class="wallet-view">
    <WalletCreateFlow
      v-if="showCreateFlow"
      @close="showCreateFlow = false; onCreateComplete()"
      @complete="onCreateComplete"
    />

    <!-- Page header -->
    <div class="page-h">
      <h1>Mis wallets</h1>
      <div class="page-actions">
        <button class="btn btn-primary" @click="handleCreateWallet">
          <span class="pi pi-plus" aria-hidden="true" />
          Nueva wallet
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="walletStore.loading" class="empty-center">
      <span class="pi pi-spin pi-spinner" aria-hidden="true" style="font-size:24px" />
    </div>

    <!-- Empty state -->
    <div v-else-if="walletStore.wallets.length === 0" class="empty-center">
      <span class="pi pi-wallet" aria-hidden="true" style="font-size:36px;opacity:.3" />
      <p>Sin wallets todavía. Creá una para empezar.</p>
    </div>

    <!-- 2-column layout -->
    <div v-else class="wv-layout">

      <!-- ── LEFT: hero + wallet chips + movements ── -->
      <div class="wv-main">

        <!-- Hero card (active wallet) -->
        <div v-if="activeWallet" class="hero-card">
          <div class="hero-tag">
            <span
              class="currency-dot"
              :style="{ background: currencyColor(activeWallet.currency) }"
            />
            {{ activeWallet.currency }}
            <span class="muted" style="font-size:11px">·</span>
            <span class="muted" style="font-size:11.5px">
              {{ currencyName(activeWallet.currency) }}
            </span>
            <span v-if="activeWallet.frozen" class="frozen-pill">
              <span class="pi pi-lock" aria-hidden="true" /> Congelada
            </span>
          </div>

          <div class="hero-balance">{{ Number(activeWallet.balance).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 8 }) }}</div>
          <div class="hero-usd muted">
            <template v-if="usdStr(Number(activeWallet.balance), activeWallet.currency)">
              ≈ {{ usdStr(Number(activeWallet.balance), activeWallet.currency) }}
            </template>
          </div>

          <div class="hero-actions">
            <button class="btn-hero" :disabled="activeWallet.frozen" @click="openSend()">
              <span class="pi pi-send" aria-hidden="true" /> Enviar
            </button>
            <button class="btn-hero-ghost" @click="openReceive()">
              <span class="pi pi-download" aria-hidden="true" /> Recibir
            </button>
            <button class="btn-hero-ghost" @click="openConvert()">
              <span class="pi pi-arrows-h" aria-hidden="true" /> Convertir
            </button>
          </div>
        </div>

        <!-- Wallet chips (switcher) -->
        <div v-if="walletStore.wallets.length > 1" class="wallet-chips">
          <button
            v-for="w in walletStore.wallets"
            :key="w.wallet_id"
            class="wallet-chip"
            :class="{ active: w.wallet_id === activeWallet?.wallet_id, frozen: w.frozen }"
            @click="selectWallet(w.wallet_id)"
          >
            <span class="chip-dot" :style="{ background: currencyColor(w.currency) }" />
            <span class="chip-currency">{{ w.currency }}</span>
            <span class="chip-balance muted">{{ Number(w.balance).toFixed(4) }}</span>
          </button>
        </div>

        <!-- Movements panel -->
        <section class="panel">
          <div class="panel-h">
            <span>Movimientos de esta wallet</span>
            <span v-if="movements.length" class="count-badge sm">{{ movements.length }}</span>
          </div>

          <div v-if="confirmedStore.loading" class="empty-state sm">
            <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
          </div>
          <div v-else-if="movements.length === 0" class="empty-state sm muted">
            Sin movimientos confirmados todavía.
          </div>

          <div v-else class="movements-list">
            <div
              v-for="(rec, i) in movements"
              :key="i"
              class="mv-row"
            >
              <div
                class="mv-icon"
                :class="movementDirection(rec.sender) === 'out' ? 'mv-out' : 'mv-in'"
              >
                <span
                  :class="movementDirection(rec.sender) === 'out'
                    ? 'pi pi-arrow-up-right'
                    : 'pi pi-arrow-down-left'"
                  aria-hidden="true"
                />
              </div>
              <div class="mv-info">
                <span class="mv-label">{{ movementLabel(rec.sender, rec.receiver) }}</span>
                <span class="mv-time muted">{{ relativeTime(rec.blockTimestamp) }}</span>
              </div>
              <div class="mv-amount" :class="movementDirection(rec.sender) === 'out' ? 'mv-neg' : 'mv-pos'">
                {{ movementDirection(rec.sender) === 'out' ? '−' : '+' }}{{ rec.amount }}
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- ── RIGHT: receive + other wallets ── -->
      <aside class="wv-sidebar">

        <!-- Receive panel (inline QR + address) -->
        <div v-if="activeWallet" class="sidebar-card">
          <div class="sidebar-card-h">
            Recibir {{ activeWallet.currency }}
            <span class="muted" style="font-size:10.5px;font-weight:400">Escaneable · copiable</span>
          </div>
          <div class="receive-body">
            <div class="qr-wrapper-sm">
              <QRCodeCanvas :value="activeWallet.wallet_id" :size="132" />
              <div class="qr-brand-sm">◆</div>
            </div>
            <div class="addr-label-sm">TU DIRECCIÓN</div>
            <button class="addr-chip-sm" @click="copyAddress">
              <span class="mono addr-text-sm">{{ activeWallet.wallet_id }}</span>
              <span
                :class="receiveCopied ? 'pi pi-check' : 'pi pi-copy'"
                :style="{ color: receiveCopied ? 'var(--success)' : 'var(--accent)', fontSize: '12px' }"
                aria-hidden="true"
              />
            </button>
            <p v-if="receiveCopied" class="copy-ok">
              <span class="pi pi-check" aria-hidden="true" /> Copiado
            </p>
            <div class="receive-btns">
              <button class="btn btn-sm" style="flex:1;justify-content:center" @click="copyAddress">
                <span class="pi pi-copy" aria-hidden="true" />
                {{ receiveCopied ? 'Copiado' : 'Copiar' }}
              </button>
              <button class="btn btn-sm" style="flex:1;justify-content:center" @click="openReceive()">
                <span class="pi pi-qrcode" aria-hidden="true" />
                Ampliar
              </button>
            </div>
            <div class="receive-warn">
              <span class="pi pi-info-circle" aria-hidden="true" />
              <span>Sólo enviá <strong>{{ activeWallet.currency }}</strong> a esta dirección. Otros tokens podrían perderse.</span>
            </div>
          </div>
        </div>

        <!-- Other wallets -->
        <div v-if="otherWallets.length > 0" class="sidebar-card">
          <div class="sidebar-card-h">Otras wallets</div>
          <div class="other-wallets-list">
            <button
              v-for="w in otherWallets"
              :key="w.wallet_id"
              class="other-wallet-item"
              :class="{ frozen: w.frozen }"
              @click="selectWallet(w.wallet_id)"
            >
              <div class="ow-icon" :style="{ background: currencyColor(w.currency) }">
                {{ w.currency.charAt(0) }}
              </div>
              <div class="ow-info">
                <span class="ow-currency">{{ w.currency }}</span>
                <span class="ow-balance mono muted">{{ Number(w.balance).toFixed(4) }}</span>
              </div>
              <div class="ow-usd muted" style="font-size:12px">
                {{ usdStr(Number(w.balance), w.currency) || '—' }}
              </div>
            </button>
          </div>
        </div>

        <!-- If only one wallet, suggest creating another -->
        <div v-else-if="walletStore.wallets.length === 1" class="sidebar-card create-hint">
          <span class="pi pi-plus-circle" aria-hidden="true" style="font-size:22px;color:var(--text-3)" />
          <p class="muted">Podés tener wallets en distintas monedas. Creá otra desde el botón "Nueva wallet".</p>
        </div>
      </aside>
    </div>
  </div>

  <!-- Flow modals -->
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
  gap: 16px;
  min-height: 0;
}

/* Header */
.page-h {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.page-h h1 {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.015em;
  margin: 0;
  color: var(--text);
}
.page-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.field-select {
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  font-size: 13px;
  font-family: var(--font-sans);
  outline: none;
}
.field-select:focus { border-color: var(--accent); }

/* Layout */
.wv-layout {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 20px;
  align-items: start;
}
.wv-main { display: flex; flex-direction: column; gap: 14px; min-width: 0; }

/* Hero card */
.hero-card {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 55%, #0f3460 100%);
  border-radius: var(--radius-lg);
  padding: 22px 24px 20px;
  color: #fff;
}
.hero-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,.75);
  margin-bottom: 10px;
}
.currency-dot {
  width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0;
}
.frozen-pill {
  margin-left: 8px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--warning);
  background: color-mix(in srgb, var(--warning) 18%, transparent);
  padding: 2px 8px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.hero-balance {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: #fff;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.hero-usd {
  font-size: 13px;
  color: rgba(255,255,255,.45);
  margin-bottom: 18px;
  margin-top: 3px;
}
.hero-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.btn-hero {
  background: rgba(255,255,255,.18);
  border: 1px solid rgba(255,255,255,.3);
  color: #fff;
  padding: 7px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background 0.14s;
}
.btn-hero:hover:not(:disabled) { background: rgba(255,255,255,.28); }
.btn-hero:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-hero-ghost {
  background: transparent;
  border: 1px solid rgba(255,255,255,.25);
  color: rgba(255,255,255,.85);
  padding: 7px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background 0.14s;
}
.btn-hero-ghost:hover { background: rgba(255,255,255,.1); }

/* Wallet chips (switcher) */
.wallet-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.wallet-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  cursor: pointer;
  font-size: 12.5px;
  transition: all 0.12s;
  color: var(--text-2);
}
.wallet-chip:hover { border-color: var(--accent); color: var(--text); }
.wallet-chip.active {
  background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  border-color: var(--accent);
  color: var(--text);
  font-weight: 600;
}
.wallet-chip.frozen { border-color: var(--warning); }
.chip-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.chip-currency { font-weight: 600; }
.chip-balance { font-size: 11px; }

/* Movements panel */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.panel-h {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.movements-list { display: flex; flex-direction: column; }
.mv-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 16px;
  border-bottom: 1px solid var(--border);
  transition: background 0.1s;
}
.mv-row:last-child { border-bottom: none; }
.mv-row:hover { background: var(--surface-2); }
.mv-icon {
  width: 32px; height: 32px; border-radius: 50%;
  display: grid; place-items: center; font-size: 12px; flex-shrink: 0;
}
.mv-out {
  background: color-mix(in srgb, var(--danger) 12%, transparent);
  color: var(--danger);
}
.mv-in {
  background: color-mix(in srgb, var(--success) 12%, transparent);
  color: var(--success);
}
.mv-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.mv-label {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mv-time { font-size: 11.5px; }
.mv-amount {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}
.mv-pos { color: var(--success); }
.mv-neg { color: var(--danger); }

/* Sidebar */
.wv-sidebar { display: flex; flex-direction: column; gap: 14px; }
.sidebar-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.sidebar-card-h {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}

/* Receive panel */
.receive-body {
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.qr-wrapper-sm {
  position: relative;
  padding: 10px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid var(--border);
  line-height: 0;
}
.qr-brand-sm {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 22px; height: 22px; border-radius: 5px;
  background: linear-gradient(135deg, #1a1917, #3a3530);
  color: #faf9f6;
  display: grid; place-items: center;
  font-size: 10px; font-weight: 700;
  pointer-events: none;
}
.addr-label-sm {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.addr-chip-sm {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  width: 100%;
  transition: border-color 0.12s;
}
.addr-chip-sm:hover { border-color: var(--accent); }
.addr-text-sm {
  flex: 1;
  font-size: 10.5px;
  word-break: break-all;
  text-align: left;
  color: var(--text);
}
.copy-ok {
  font-size: 11.5px;
  color: var(--success);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}
.receive-btns { display: flex; gap: 6px; width: 100%; }
.receive-warn {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 11px;
  color: var(--text-3);
  line-height: 1.5;
  width: 100%;
}
.receive-warn .pi { flex-shrink: 0; margin-top: 1px; color: var(--accent); }

/* Other wallets */
.other-wallets-list { display: flex; flex-direction: column; }
.other-wallet-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: none;
  border: none;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
  width: 100%;
}
.other-wallet-item:last-child { border-bottom: none; }
.other-wallet-item:hover { background: var(--surface-2); }
.other-wallet-item.frozen { opacity: 0.6; }
.ow-icon {
  width: 28px; height: 28px; border-radius: 50%;
  color: #fff; font-size: 11px; font-weight: 700;
  display: grid; place-items: center; flex-shrink: 0;
}
.ow-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.ow-currency { font-size: 13px; font-weight: 600; color: var(--text); }
.ow-balance { font-size: 11.5px; overflow: hidden; text-overflow: ellipsis; }

/* Create hint */
.create-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 16px;
  text-align: center;
}
.create-hint p { margin: 0; font-size: 12.5px; }

/* Empty states */
.empty-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 24px;
  color: var(--text-2);
  font-size: 14px;
}
.empty-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 28px;
  color: var(--text-2);
  font-size: 14px;
  justify-content: center;
}
.empty-state.sm { font-size: 13px; padding: 20px; }

/* Shared */
.mono { font-family: var(--font-mono); }
.muted { color: var(--text-3); }

@media (max-width: 900px) {
  .wv-layout { grid-template-columns: 1fr; }
  .wv-sidebar { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
}
</style>
