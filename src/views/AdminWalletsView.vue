<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  listAllWallets,
  listAuditLog,
  freezeWallet,
  unfreezeWallet,
  type WalletAdminRecord,
} from '@/api/admin'
import { getConfirmed, getPending } from '@/api/mempool'
import HashChip from '@/components/atoms/HashChip.vue'
import AmountDisplay from '@/components/atoms/AmountDisplay.vue'
import WalletDrawer, {
  type DrawerWallet,
  type DrawerWalletMovement,
  type DrawerWalletAuditEvent,
  type WalletDrawerAction,
} from '@/components/drawers/WalletDrawer.vue'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import PaginatedTable from '@/components/organisms/PaginatedTable.vue'

const wallets = ref<WalletAdminRecord[]>([])
const totalBalanceUsd = ref('0')
const unpricedCurrencies = ref<string[]>([])
const loading = ref(false)
const error = ref('')
const filterUser = ref('')
const filterFrozen = ref<'all' | 'frozen' | 'active'>('all')

const drawer = ref<DrawerWallet | null>(null)
const drawerOpen = ref(false)
const drawerLoading = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await listAllWallets()
    wallets.value = res.wallets
    totalBalanceUsd.value = res.total_balance_usd
    unpricedCurrencies.value = res.unpriced_currencies
  } catch (e: unknown) {
    error.value = String(e)
  } finally {
    loading.value = false
  }
}

function formatUsd(value: string | number): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('es-AR', { maximumFractionDigits: 2 })
}

function formatNative(value: number, currency: string): string {
  const fixed = value.toFixed(8).replace(/\.?0+$/, '')
  const [intPart, frac] = fixed.split('.')
  const grouped = Number(intPart).toLocaleString('es-AR')
  return frac ? `${grouped}.${frac} ${currency}` : `${grouped} ${currency}`
}

const nativeAggregate = computed(() => {
  const byCurrency: Record<string, number> = {}
  for (const w of wallets.value) {
    const n = Number(w.balance)
    if (!Number.isFinite(n) || n === 0) continue
    byCurrency[w.currency] = (byCurrency[w.currency] ?? 0) + n
  }
  return Object.entries(byCurrency)
    .map(([c, sum]) => formatNative(sum, c))
    .join(' · ')
})

const hasPricedBalance = computed(() => Number(totalBalanceUsd.value) > 0)

onMounted(load)

const filtered = computed(() => {
  return wallets.value.filter((w) => {
    const q = filterUser.value.toLowerCase()
    const matchUser =
      !q || w.username.toLowerCase().includes(q) || w.display_name.toLowerCase().includes(q)
    const matchFrozen =
      filterFrozen.value === 'all' || (filterFrozen.value === 'frozen' ? w.frozen : !w.frozen)
    return matchUser && matchFrozen
  })
})

async function toggleFreeze(w: WalletAdminRecord) {
  if (w.frozen) await unfreezeWallet(w.wallet_id)
  else await freezeWallet(w.wallet_id)
  await load()
}

function parseBalance(balance: string): number {
  const value = Number(balance)
  return Number.isFinite(value) ? value : 0
}

async function openDrawer(w: WalletAdminRecord) {
  drawer.value = { wallet: w, movements: [], audit: [] }
  drawerOpen.value = true
  drawerLoading.value = true
  const targetKey = w.public_key
  const walletId = w.wallet_id

  try {
    const [pendingRes, confirmedRes, auditRes] = await Promise.all([
      getPending(),
      getConfirmed(),
      listAuditLog({ target_id: walletId, limit: 50 }),
    ])

    const movements: DrawerWalletMovement[] = []
    pendingRes.transactions
      .filter((t) => t.sender === targetKey || t.receiver === targetKey)
      .forEach((t, i) => {
        const direction: 'in' | 'out' = t.receiver === targetKey ? 'in' : 'out'
        movements.push({
          id: `p-${i}-${t.sender.slice(0, 6)}`,
          direction,
          counterparty: direction === 'in' ? t.sender : t.receiver,
          amount: String(t.amount),
          amountUsd: Number(t.amount) || 0,
          status: 'pending',
          createdAt: new Date().toISOString(),
        })
      })
    confirmedRes.transactions
      .filter((t) => t.sender === targetKey || t.receiver === targetKey)
      .forEach((t, i) => {
        const direction: 'in' | 'out' = t.receiver === targetKey ? 'in' : 'out'
        movements.push({
          id: `c-${i}-${t.sender.slice(0, 6)}`,
          direction,
          counterparty: direction === 'in' ? t.sender : t.receiver,
          amount: String(t.amount),
          amountUsd: Number(t.amount) || 0,
          status: 'completed',
          createdAt: t.blockTimestamp,
        })
      })

    const audit: DrawerWalletAuditEvent[] = auditRes.entries.map((e) => ({
      id: e.id,
      action: e.action,
      meta: Object.keys(e.details ?? {}).length ? JSON.stringify(e.details) : '',
      actor: e.actor_id,
      at: e.created_at,
    }))

    if (drawer.value && drawer.value.wallet.wallet_id === walletId) {
      drawer.value = { wallet: w, movements, audit }
    }
  } catch {
    /* keep skeleton */
  } finally {
    if (drawer.value?.wallet.wallet_id === walletId) drawerLoading.value = false
  }
}

async function handleDrawerAction(action: WalletDrawerAction, w: WalletAdminRecord) {
  if (action === 'freeze') await freezeWallet(w.wallet_id)
  else await unfreezeWallet(w.wallet_id)
  drawerOpen.value = false
  drawer.value = null
  await load()
}

// ── BaseTable column definitions ─────────────────────────────────────
interface WalletColumn {
  key: string
  label: string
  num?: boolean
}
const walletColumns: WalletColumn[] = [
  { key: 'asset', label: 'Activo' },
  { key: 'wallet_id', label: 'Wallet ID' },
  { key: 'user', label: 'Usuario' },
  { key: 'balance', label: 'Balance' },
  { key: 'usd', label: 'USD', num: true },
  { key: 'type', label: 'Tipo' },
  { key: 'pub_key', label: 'Clave pública' },
  { key: 'status', label: 'Estado' },
]

// ── Status / Type tone mapping ───────────────────────────────────────
type WalletStatusTone = 'success' | 'info'
const STATUS_TONE: Record<'active' | 'frozen', WalletStatusTone> = {
  active: 'success',
  frozen: 'info',
}

type WalletTypeTone = 'neutral' | 'warning' | 'info'
const TYPE_TONE: Record<string, WalletTypeTone> = {
  USER: 'neutral',
  TREASURY: 'warning',
  FEE: 'info',
}
function typeTone(t: string): WalletTypeTone {
  return TYPE_TONE[t] ?? 'neutral'
}

function rowClass(w: WalletAdminRecord): string | undefined {
  return w.frozen ? 'row-muted' : undefined
}

function onRowClick(payload: { row: WalletAdminRecord }) {
  void openDrawer(payload.row)
}
</script>

<template>
  <div class="wallets-view">
    <div class="page-h">
      <div>
        <h1>Wallets</h1>
        <p>Gestión y congelamiento de wallets de la plataforma</p>
      </div>
      <div class="page-actions">
        <BaseButton variant="ghost" size="sm" :loading="loading" @click="load">
          Actualizar
        </BaseButton>
        <BaseButton variant="ghost" size="sm"> Exportar </BaseButton>
        <BaseButton variant="ghost" size="sm"> Congelar selección </BaseButton>
      </div>
    </div>

    <div class="bigstat-row">
      <BaseCard variant="bigstat">
        <template #header>
          <span>Total</span>
        </template>
        {{ wallets.length }}
        <template #footer> {{ wallets.length }} registradas </template>
      </BaseCard>

      <BaseCard variant="bigstat">
        <template #header>
          <span>Activas</span>
        </template>
        {{ wallets.filter((w) => !w.frozen).length }}
        <template #footer> en operación </template>
      </BaseCard>

      <BaseCard variant="bigstat">
        <template #header>
          <span>Congeladas</span>
        </template>
        {{ wallets.filter((w) => w.frozen).length }}
        <template #footer> bloqueadas </template>
      </BaseCard>

      <BaseCard variant="bigstat">
        <template #header>
          <span>Saldo bajo gestión</span>
        </template>
        <template v-if="hasPricedBalance"> ${{ formatUsd(totalBalanceUsd) }} </template>
        <template v-else-if="nativeAggregate">
          <span class="vl-native" :title="nativeAggregate">{{ nativeAggregate }}</span>
        </template>
        <template v-else> $0 </template>
        <template #footer>
          <template v-if="hasPricedBalance && unpricedCurrencies.length">
            <span class="unpriced">{{ unpricedCurrencies.length }} sin tasa FX</span>
            ({{ unpricedCurrencies.join(', ') }})
          </template>
          <template v-else-if="hasPricedBalance"> USD agregado </template>
          <template v-else-if="nativeAggregate">
            <span class="unpriced">sin tasa FX para mostrar USD</span>
          </template>
          <template v-else> sin balances </template>
        </template>
      </BaseCard>
    </div>

    <div class="filters-bar">
      <input v-model="filterUser" class="filter-input" placeholder="Buscar por usuario…" />
      <select v-model="filterFrozen" class="filter-select">
        <option value="all">Todos los estados</option>
        <option value="active">Activa</option>
        <option value="frozen">Congelada</option>
      </select>
      <span class="count-badge"
        >{{ filtered.length }} wallet{{ filtered.length !== 1 ? 's' : '' }}</span
      >
    </div>

    <div v-if="error" class="inline-alert danger">
      {{ error }}
    </div>
    <div v-if="loading" class="loading-row">
      <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
    </div>

    <BaseCard v-else variant="default" padding="none">
      <PaginatedTable
        :columns="walletColumns"
        :rows="filtered"
        :row-key="(w: WalletAdminRecord) => w.wallet_id"
        :row-class="rowClass"
        @row-click="onRowClick"
      >
        <template #cell-asset="{ row }">
          <span class="asset-pill">{{ row.currency }}</span>
        </template>

        <template #cell-wallet_id="{ row }">
          <div class="mono" @click.stop>
            <HashChip :hash="row.wallet_id" :length="16" label="wallet id" />
          </div>
        </template>

        <template #cell-user="{ row }">
          <span class="display-name">{{ row.display_name }}</span>
          <span class="username"> @{{ row.username }}</span>
        </template>

        <template #cell-balance="{ row }">
          <span class="mono">
            <AmountDisplay
              :amount="parseBalance(row.balance)"
              :precision="8"
              :unit="row.currency"
            />
          </span>
        </template>

        <template #cell-usd="{ row }">
          <span class="mono usd-cell">
            <template v-if="row.balance_usd !== null">${{ formatUsd(row.balance_usd) }}</template>
            <span v-else class="usd-missing" title="Sin tasa FX para esta moneda">—</span>
          </span>
        </template>

        <template #cell-type="{ row }">
          <BaseBadge :tone="typeTone(row.wallet_type)" :dot="false">
            {{ row.wallet_type }}
          </BaseBadge>
        </template>

        <template #cell-pub_key="{ row }">
          <div class="mono text-dim" @click.stop>
            <HashChip :hash="row.public_key" :length="14" label="public key" />
          </div>
        </template>

        <template #cell-status="{ row }">
          <BaseBadge :tone="row.frozen ? STATUS_TONE.frozen : STATUS_TONE.active">
            {{ row.frozen ? 'Congelada' : 'Activa' }}
          </BaseBadge>
        </template>

        <template #row-actions="{ row }">
          <BaseButton variant="secondary" size="sm" @click="toggleFreeze(row)">
            {{ row.frozen ? 'Descongelar' : 'Congelar' }}
          </BaseButton>
        </template>

        <template #empty> No se encontraron wallets. </template>
      </PaginatedTable>
    </BaseCard>

    <WalletDrawer
      :data="drawer"
      :open="drawerOpen"
      :loading="drawerLoading"
      @close="drawerOpen = false"
      @action="([action, wallet]) => handleDrawerAction(action, wallet)"
    />
  </div>
</template>

<style scoped>
.wallets-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-h {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
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
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.bigstat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

/* Native-currency multi-line fallback inside the 4th KPI value slot.
 * BaseCard bigstat default body is 24px tabular-nums; this overrides
 * for the multi-currency string so e.g. "1.5 BTC · 200 USDT" reads
 * without truncating silently. */
.vl-native {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.unpriced {
  color: var(--warning);
  font-weight: 500;
}

.usd-cell {
  font-variant-numeric: tabular-nums;
}
.usd-missing {
  color: var(--text-3);
}

/* AssetPill candidate (DESIGN-v2 §4 "orden a definir"). Kept inline
 * until a second consumer surfaces. */
.asset-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  padding: 2px 7px;
  border-radius: 5px;
  background: var(--accent-soft);
  color: var(--accent-text);
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-mono);
}

.filters-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.filter-input,
.filter-select {
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  font-size: 13px;
  outline: none;
  font-family: var(--font-sans);
}
.filter-input {
  min-width: 180px;
}
.filter-input:focus,
.filter-select:focus {
  border-color: var(--accent);
}
.count-badge {
  font-size: 11.5px;
  color: var(--text-2);
  background: var(--surface-2);
  border: 1px solid var(--border);
  padding: 3px 8px;
  border-radius: var(--radius-pill);
}

.inline-alert {
  padding: 10px 14px;
  border-radius: var(--radius);
  border: 1px solid;
  font-size: 13px;
}
.inline-alert.danger {
  background: var(--danger-soft);
  border-color: var(--danger);
  color: var(--danger);
}
.loading-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
  font-size: 13px;
}

/* BaseTable cell wrappers */
.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
.text-dim {
  color: var(--text-3);
}
.display-name {
  font-weight: 500;
  color: var(--text);
}
.username {
  color: var(--text-2);
  font-size: 12px;
}

/* BaseTable row-muted (frozen wallets) */
:deep(.row-muted) td {
  opacity: 0.6;
}

@media (max-width: 640px) {
  .page-h {
    flex-direction: column;
    align-items: flex-start;
  }
  .bigstat-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
