<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { useConfirmedTransactionsStore } from '@/stores/confirmedTransactions'
import { useExchangeRatesStore } from '@/stores/exchangeRates'
import { useAuthStore } from '@/stores/auth'
// sender/receiver in confirmedStore are usernames (not wallet IDs)
import { listCurrencies, type CurrencyRecord } from '@/api/wallets'
import { useWalletCreate } from '@/composables/useWalletCreate'
import WalletCreateFlow from '@/components/flows/WalletCreateFlow.vue'
import SparklineChart from '@/components/atoms/SparklineChart.vue'

const router = useRouter()
const walletStore = useWalletStore()
const confirmedStore = useConfirmedTransactionsStore()
const ratesStore = useExchangeRatesStore()
const auth = useAuthStore()

const { showCreateFlow, handleCreateWallet, onCreateComplete } = useWalletCreate()

const currencies = ref<CurrencyRecord[]>([])


// ── Portfolio hero ───────────────────────────────────────────────────────────

const totalUsd = computed<number | null>(() => {
  if (ratesStore.rates.length === 0) return null
  let sum = 0
  let anyNull = false
  for (const w of walletStore.wallets) {
    const v = ratesStore.usdValue(w.balance, w.currency)
    if (v === null) { anyNull = true; continue }
    sum += v
  }
  return anyNull && sum === 0 ? null : sum
})

function formatUsd(val: number | null): string {
  if (val === null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

// ── Assets table ─────────────────────────────────────────────────────────────

interface AssetRow {
  currency: string
  name: string
  balance: number
  usdValue: number | null
  sparkline: number[]
  changePct: number | null
}

const assetRows = computed<AssetRow[]>(() => {
  const byCode = new Map<string, { balance: number; name: string }>()
  for (const w of walletStore.wallets) {
    const existing = byCode.get(w.currency)
    const name = currencies.value.find((c) => c.code === w.currency)?.name ?? w.currency
    byCode.set(w.currency, {
      balance: (existing?.balance ?? 0) + Number(w.balance),
      name,
    })
  }
  return Array.from(byCode.entries()).map(([currency, { balance, name }]) => ({
    currency,
    name,
    balance,
    usdValue: ratesStore.usdValue(balance, currency),
    // Sparkline values are placeholder until a price-history endpoint exists.
    // The chart renders a flat line when all values are equal, which is honest.
    sparkline: [balance, balance],
    changePct: null,
  }))
})

// ── Recent movements ─────────────────────────────────────────────────────────
// confirmedStore sender/receiver are usernames, not wallet IDs.

const myUsername = computed(() => auth.user?.username ?? '')

const recentMovements = computed(() =>
  confirmedStore.records
    .filter((r) => r.sender === myUsername.value || r.receiver === myUsername.value)
    .slice()
    .reverse()
    .slice(0, 5)
)

function movementDirection(sender: string): 'out' | 'in' {
  return sender === myUsername.value ? 'out' : 'in'
}

function shortAddr(addr: string, n = 8): string {
  if (!addr) return '—'
  return addr.length > n * 2 ? `${addr.slice(0, n)}…${addr.slice(-n)}` : addr
}

function relativeTime(ts: string | undefined): string {
  if (!ts) return '—'
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}

// ── Quick actions — all navigate to dedicated views ───────────────────────────

function openSend()    { router.push('/send') }
function openReceive() { router.push({ path: '/send', query: { tab: 'receive' } }) }
function openConvert() { router.push('/exchange') }

// ── KYC ───────────────────────────────────────────────────────────────────────

const kycLevel = computed(() => auth.user?.kyc_level ?? 'L0')

const kycLimitLabel = computed(() => {
  const limits: Record<string, string> = {
    L0: 'Sin límite definido',
    L1: 'USD 1,000 mensuales',
    L2: 'USD 50,000 mensuales',
    L3: 'Sin límite',
  }
  return limits[kycLevel.value] ?? '—'
})

const canUpgradeKyc = computed(() => kycLevel.value !== 'L3')

// ── P2P best price (static placeholder) ──────────────────────────────────────

const p2pTab = ref<'buy' | 'sell'>('buy')

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([
    walletStore.fetchMine(),
    confirmedStore.fetchConfirmed(),
    ratesStore.fetchRates(),
    listCurrencies(true).then((r) => { currencies.value = r.currencies }).catch(() => {}),
  ])
})
</script>

<template>
  <div class="portfolio-view">
    <WalletCreateFlow
      v-if="showCreateFlow"
      @close="showCreateFlow = false; onCreateComplete()"
      @complete="onCreateComplete"
    />

    <div class="pv-layout">
      <!-- ── Left / main column ── -->
      <div class="pv-main">

        <!-- Hero card -->
        <div class="hero-card">
          <div class="hero-meta">PATRIMONIO TOTAL</div>
          <div class="hero-value">{{ formatUsd(totalUsd) }}</div>
          <div v-if="totalUsd !== null" class="hero-change muted">
            <span class="pi pi-chart-line" aria-hidden="true" />
            Actualizado en tiempo real
          </div>
          <div class="hero-actions">
            <button class="btn btn-hero" @click="openSend">
              <span class="pi pi-send" aria-hidden="true" /> Enviar
            </button>
            <button class="btn btn-hero-ghost" @click="openReceive">
              <span class="pi pi-download" aria-hidden="true" /> Recibir
            </button>
            <button class="btn btn-hero-ghost" @click="openConvert">
              <span class="pi pi-arrows-h" aria-hidden="true" /> Convertir
            </button>
            <button class="btn btn-hero-ghost" @click="handleCreateWallet">
              <span class="pi pi-plus" aria-hidden="true" />
              Nueva wallet
            </button>
          </div>
        </div>

        <!-- Assets table -->
        <section class="panel">
          <div class="panel-h">
            <span>Mis activos</span>
            <router-link to="/wallet" class="panel-link">
              Ver todas las wallets →
            </router-link>
          </div>

          <div v-if="walletStore.loading" class="empty-state sm">
            <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
          </div>
          <div v-else-if="assetRows.length === 0" class="empty-state sm muted">
            Sin activos todavía. Crea tu primera wallet.
          </div>
          <table v-else class="assets-tbl">
            <thead>
              <tr>
                <th>Activo</th>
                <th class="num">Balance</th>
                <th class="num">Valor</th>
                <th class="sparkline-col">30d</th>
                <th class="num">Cambio</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in assetRows"
                :key="row.currency"
                class="asset-row"
                @click="router.push({ path: '/wallet', query: { currency: row.currency } })"
              >
                <td>
                  <div class="asset-cell">
                    <span class="asset-icon">{{ row.currency.charAt(0) }}</span>
                    <div>
                      <span class="asset-code">{{ row.currency }}</span>
                      <span class="asset-name">{{ row.name }}</span>
                    </div>
                  </div>
                </td>
                <td class="num mono">
                  {{ row.balance.toFixed(row.currency === 'BTC' ? 5 : 2) }}
                  <span class="currency-unit">{{ row.currency }}</span>
                </td>
                <td class="num">
                  {{ row.usdValue !== null ? formatUsd(row.usdValue) : '—' }}
                </td>
                <td class="sparkline-col">
                  <SparklineChart
                    :values="row.sparkline"
                    :color="row.usdValue !== null ? 'var(--success)' : 'var(--text-3)'"
                    :width="80"
                    :height="28"
                  />
                </td>
                <td class="num">
                  <span v-if="row.changePct !== null" :class="row.changePct >= 0 ? 'pos' : 'neg'">
                    {{ row.changePct >= 0 ? '+' : '' }}{{ row.changePct?.toFixed(1) }}%
                  </span>
                  <span v-else class="muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- Recent movements -->
        <section class="panel">
          <div class="panel-h">
            <span>Últimos movimientos</span>
            <router-link to="/historial" class="panel-link">
              Ver historial completo →
            </router-link>
          </div>

          <div v-if="confirmedStore.loading" class="empty-state sm">
            <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
          </div>
          <div v-else-if="recentMovements.length === 0" class="empty-state sm muted">
            Sin movimientos confirmados todavía.
          </div>
          <div v-else class="movements-list">
            <div
              v-for="(rec, i) in recentMovements"
              :key="i"
              class="movement-row"
            >
              <div
                class="mv-icon"
                :class="movementDirection(rec.sender) === 'out' ? 'mv-out' : 'mv-in'"
              >
                <span
                  :class="movementDirection(rec.sender) === 'out' ? 'pi pi-arrow-up-right' : 'pi pi-arrow-down-left'"
                  aria-hidden="true"
                />
              </div>
              <div class="mv-info">
                <span class="mv-label">
                  {{ movementDirection(rec.sender) === 'out' ? 'Enviado' : 'Recibido' }}
                </span>
                <span class="mv-counterparty muted">
                  {{
                    movementDirection(rec.sender) === 'out'
                      ? shortAddr(rec.receiver)
                      : shortAddr(rec.sender)
                  }}
                </span>
              </div>
              <div class="mv-right">
                <span
                  class="mv-amount mono"
                  :class="movementDirection(rec.sender) === 'out' ? 'neg' : 'pos'"
                >
                  {{ movementDirection(rec.sender) === 'out' ? '-' : '+' }}{{ rec.amount }}
                </span>
                <span class="mv-time muted">{{ relativeTime(rec.blockTimestamp) }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- ── Right sidebar ── -->
      <aside class="pv-sidebar">

        <!-- KYC level card -->
        <div class="sidebar-card">
          <div class="sidebar-card-header">
            <span>Verificación</span>
            <span class="kyc-badge">
              <span class="pi pi-check-circle" aria-hidden="true" />
              Verificado
            </span>
          </div>
          <div class="kyc-level">Nivel {{ kycLevel }}</div>
          <p class="kyc-desc">
            Operás con un límite de <strong>{{ kycLimitLabel }}</strong>.
            <template v-if="canUpgradeKyc">
              Subí a {{ kycLevel === 'L2' ? 'L3' : 'L2' }} para operar sin límite.
            </template>
          </p>
          <button
            v-if="canUpgradeKyc"
            class="btn btn-primary btn-full"
            disabled
            title="Flujo de verificación próximamente"
          >
            Mejorar a {{ kycLevel === 'L2' ? 'L3' : 'L2' }}
          </button>
        </div>

        <!-- Shortcuts -->
        <div class="sidebar-card">
          <div class="sidebar-card-header"><span>Atajos</span></div>
          <div class="shortcuts-list">
            <button class="shortcut-item" @click="router.push('/p2p')">
              <span class="pi pi-arrow-down-left sh-icon sh-buy" aria-hidden="true" />
              <span>Comprar USDT en P2P</span>
              <span class="pi pi-chevron-right sh-arrow" aria-hidden="true" />
            </button>
            <button class="shortcut-item" @click="router.push({ path: '/send', query: { tab: 'request' } })">
              <span class="pi pi-link sh-icon sh-link" aria-hidden="true" />
              <span>Solicitar pago a alguien</span>
              <span class="pi pi-chevron-right sh-arrow" aria-hidden="true" />
            </button>
            <button class="shortcut-item" disabled title="Próximamente">
              <span class="pi pi-calendar sh-icon sh-cal" aria-hidden="true" />
              <span>Programar envío recurrente</span>
              <span class="pi pi-chevron-right sh-arrow" aria-hidden="true" />
            </button>
            <button class="shortcut-item" disabled title="Próximamente">
              <span class="pi pi-shield sh-icon sh-shield" aria-hidden="true" />
              <span>Activar 2FA</span>
              <span class="pi pi-chevron-right sh-arrow" aria-hidden="true" />
            </button>
          </div>
        </div>

        <!-- Best P2P price -->
        <div class="sidebar-card">
          <div class="sidebar-card-header"><span>Mejor precio P2P</span></div>
          <div class="p2p-tabs">
            <button
              class="p2p-tab"
              :class="{ active: p2pTab === 'buy' }"
              @click="p2pTab = 'buy'"
            >
              Comprar
            </button>
            <button
              class="p2p-tab"
              :class="{ active: p2pTab === 'sell' }"
              @click="p2pTab = 'sell'"
            >
              Vender
            </button>
          </div>
          <div class="p2p-rate">
            <span class="p2p-lhs">1 USDT =</span>
            <div>
              <div class="p2p-value">
                {{ ratesStore.rateFor('USDT', 'USD') !== null
                   ? new Intl.NumberFormat('es-AR').format(Number((ratesStore.rateFor('USDT', 'USD') ?? 1248.4).toFixed(2)))
                   : '1,248.40' }}
                <span class="p2p-currency">USD</span>
              </div>
            </div>
          </div>
          <button class="btn btn-primary btn-full" disabled>
            Comprar ahora
          </button>
        </div>
      </aside>
    </div>
  </div>

</template>

<style scoped>
.portfolio-view {
  min-height: 0;
}

/* ── Layout ── */
.pv-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 20px;
  align-items: start;
}
.pv-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

/* ── Hero card ── */
.hero-card {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%);
  border-radius: var(--radius-lg);
  padding: 28px 28px 24px;
  color: #fff;
}
.hero-meta {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,.5);
  text-transform: uppercase;
  margin-bottom: 6px;
}
.hero-value {
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  color: #fff;
  margin-bottom: 4px;
}
.hero-change {
  font-size: 12px;
  color: rgba(255,255,255,.45);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.hero-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.btn-hero {
  background: rgba(255,255,255,.18);
  border: 1px solid rgba(255,255,255,.25);
  color: #fff;
  padding: 7px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background 0.15s;
}
.btn-hero:hover {
  background: rgba(255,255,255,.28);
}
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
  transition: background 0.15s;
}
.btn-hero-ghost:hover {
  background: rgba(255,255,255,.1);
}
.btn-hero-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.no-wallets-hint {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  font-size: 13px;
}
.currency-select {
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  font-size: 12px;
}
.hint-text {
  color: var(--text-3);
  font-size: 12px;
}

/* ── Panel ── */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.panel-h {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.panel-link {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--accent);
  text-decoration: none;
  text-transform: none;
  letter-spacing: 0;
}
.panel-link:hover {
  text-decoration: underline;
}

/* ── Assets table ── */
.assets-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.assets-tbl th {
  text-align: left;
  padding: 8px 14px;
  font-size: 11.5px;
  color: var(--text-3);
  font-weight: 500;
  border-bottom: 1px solid var(--border);
}
.assets-tbl th.num {
  text-align: right;
}
.assets-tbl td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
.assets-tbl tr:last-child td {
  border-bottom: none;
}
.asset-row {
  cursor: pointer;
  transition: background 0.12s;
}
.asset-row:hover {
  background: var(--surface-2);
}
.assets-tbl td.num {
  text-align: right;
}
.asset-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.asset-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.asset-code {
  font-weight: 600;
  font-size: 13px;
  color: var(--text);
  display: block;
}
.asset-name {
  font-size: 11.5px;
  color: var(--text-3);
  display: block;
}
.currency-unit {
  font-size: 11px;
  color: var(--text-3);
  margin-left: 3px;
}
.sparkline-col {
  width: 90px;
  text-align: center;
}

/* ── Recent movements ── */
.movements-list {
  display: flex;
  flex-direction: column;
}
.movement-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}
.movement-row:last-child {
  border-bottom: none;
}
.mv-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
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
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}
.mv-counterparty {
  font-size: 11.5px;
  font-family: var(--font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mv-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}
.mv-amount {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.mv-time {
  font-size: 11.5px;
}

/* ── Sidebar ── */
.pv-sidebar {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.sidebar-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.sidebar-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.kyc-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--success);
  text-transform: none;
  letter-spacing: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}
.kyc-level {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  padding: 12px 14px 4px;
}
.kyc-desc {
  font-size: 12px;
  color: var(--text-2);
  padding: 0 14px 12px;
  margin: 0;
  line-height: 1.6;
}
.kyc-desc strong {
  color: var(--text);
}
.btn-full {
  width: calc(100% - 28px);
  margin: 0 14px 14px;
  justify-content: center;
}

/* ── Shortcuts ── */
.shortcuts-list {
  display: flex;
  flex-direction: column;
}
.shortcut-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: none;
  border: none;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  font-size: 13px;
  color: var(--text);
  text-align: left;
  transition: background 0.12s;
  width: 100%;
}
.shortcut-item:last-child {
  border-bottom: none;
}
.shortcut-item:hover:not(:disabled) {
  background: var(--surface-2);
}
.shortcut-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.sh-icon {
  font-size: 14px;
  flex-shrink: 0;
}
.sh-buy { color: var(--success); }
.sh-link { color: var(--accent); }
.sh-cal { color: var(--warning); }
.sh-shield { color: var(--info, var(--accent)); }
.sh-arrow {
  margin-left: auto;
  font-size: 10px;
  color: var(--text-3);
}
.shortcut-item > span:not(.sh-icon):not(.sh-arrow) {
  flex: 1;
}

/* ── P2P best price ── */
.p2p-tabs {
  display: flex;
  padding: 10px 14px 0;
  gap: 8px;
}
.p2p-tab {
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-3);
  cursor: pointer;
  padding: 5px 10px;
  border-radius: var(--radius);
  transition: all 0.12s;
}
.p2p-tab.active {
  background: var(--accent);
  color: #fff;
}
.p2p-rate {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 8px;
}
.p2p-lhs {
  font-size: 12px;
  color: var(--text-3);
}
.p2p-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.p2p-currency {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
  margin-left: 4px;
}

/* ── Shared utils ── */
.mono { font-family: var(--font-mono); }
.muted { color: var(--text-3); }
.pos { color: var(--success); }
.neg { color: var(--danger); }
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
  padding: 20px;
  font-size: 13px;
}

@media (max-width: 1024px) {
  .pv-layout {
    grid-template-columns: 1fr;
  }
  .pv-sidebar {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
}
</style>
