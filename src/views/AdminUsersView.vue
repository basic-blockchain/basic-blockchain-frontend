<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  listUsers, listAllWallets, listAuditLog, banUser, unbanUser, softDeleteUser,
  restoreUser, updateUser, grantRole, revokeRole,
  type AdminUser, type WalletAdminRecord, type AuditEntry,
} from '@/api/admin'
import { getConfirmed, getPending } from '@/api/mempool'
import type { Transaction, ConfirmedTransaction } from '@/domain/transaction'
import UserDrawer, {
  type DrawerUser, type DrawerAction, type DrawerWallet,
  type DrawerMovement, type DrawerAuditEvent,
} from '@/components/drawers/UserDrawer.vue'
import WalletDrawer, {
  type DrawerWallet as WalletDrawerData,
  type DrawerWalletMovement, type DrawerWalletAuditEvent,
  type WalletDrawerAction,
} from '@/components/drawers/WalletDrawer.vue'
import { freezeWallet, unfreezeWallet } from '@/api/admin'
import ConfirmUserModal from '@/components/modals/ConfirmUserModal.vue'
import type { UserAction, ConfirmUserTarget } from '@/components/modals/ConfirmUserModal.vue'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseTable from '@/components/atoms/BaseTable.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseModal from '@/components/atoms/BaseModal.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'

const users = ref<AdminUser[]>([])
const wallets = ref<WalletAdminRecord[]>([])
const loading = ref(false)
const error = ref('')

const editTarget = ref<AdminUser | null>(null)
const editForm = ref({ display_name: '', email: '' })
const editOpen = computed({
  get: () => editTarget.value !== null,
  set: (open: boolean) => {
    if (!open) editTarget.value = null
  },
})

const confirmModal = ref<{ action: UserAction; target: ConfirmUserTarget; userId: string } | null>(null)

// Phase 5b — filters, search and pagination state
type FilterTab = 'all' | 'active' | 'kyc' | 'frozen' | 'banned'
const filterTab = ref<FilterTab>('all')
const filterKyc = ref<string>('')
const filterCountry = ref<string>('')
const showDeleted = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const PAGE_SIZE = 12

watch([filterTab, filterKyc, filterCountry, showDeleted, searchQuery], () => {
  currentPage.value = 1
})

const kycOptions = computed(() => {
  const set = new Set<string>()
  for (const u of users.value) if (u.kyc_level) set.add(u.kyc_level)
  return Array.from(set).sort()
})

const countryOptions = computed(() => {
  const set = new Set<string>()
  for (const u of users.value) if (u.country) set.add(u.country)
  return Array.from(set).sort()
})

function hasFrozenWallets(userId: string): boolean {
  return wallets.value.some((w) => w.user_id === userId && w.frozen)
}

function hasPendingKyc(u: AdminUser): boolean {
  return u.kyc_level === 'L0' || u.kyc_level === 'L1'
}

const filteredUsers = computed<AdminUser[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return users.value.filter((u) => {
    if (!showDeleted.value && u.deleted_at) return false
    if (filterTab.value === 'active' && (u.banned || u.deleted_at)) return false
    if (filterTab.value === 'banned' && !u.banned) return false
    if (filterTab.value === 'frozen' && !hasFrozenWallets(u.user_id)) return false
    if (filterTab.value === 'kyc' && !hasPendingKyc(u)) return false
    if (filterKyc.value && u.kyc_level !== filterKyc.value) return false
    if (filterCountry.value && u.country !== filterCountry.value) return false
    if (q) {
      const match =
        u.display_name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        u.user_id.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredUsers.value.length / PAGE_SIZE)))
const pagedUsers = computed<AdminUser[]>(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredUsers.value.slice(start, start + PAGE_SIZE)
})
const pageStartIdx = computed(() => (currentPage.value - 1) * PAGE_SIZE + 1)
const pageEndIdx = computed(() => Math.min(currentPage.value * PAGE_SIZE, filteredUsers.value.length))

const kpis = computed(() => {
  let total = 0
  let active = 0
  let restricted = 0
  let kycPending = 0
  let banned = 0
  for (const u of users.value) {
    total += 1
    if (u.deleted_at) { restricted += 1; continue }
    if (u.banned) { banned += 1; restricted += 1; continue }
    active += 1
    if (hasPendingKyc(u)) kycPending += 1
    if (hasFrozenWallets(u.user_id)) restricted += 1
  }
  let totalUsd = 0
  let unpricedCount = 0
  for (const w of wallets.value) {
    if (w.balance_usd === null) {
      const native = Number(w.balance)
      if (Number.isFinite(native) && native !== 0) unpricedCount += 1
      continue
    }
    const n = Number(w.balance_usd)
    if (Number.isFinite(n)) totalUsd += n
  }
  return { total, active, restricted, banned, kycPending, totalUsd, unpricedCount }
})

const countsByTab = computed(() => {
  const all = users.value.filter((u) => showDeleted.value || !u.deleted_at)
  return {
    all: all.length,
    active: all.filter((u) => !u.banned && !u.deleted_at).length,
    kyc: all.filter(hasPendingKyc).length,
    frozen: all.filter((u) => hasFrozenWallets(u.user_id)).length,
    banned: all.filter((u) => u.banned).length,
  }
})

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}k`
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function relTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const diff = Date.now() - d.getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} d`
  const months = Math.floor(days / 30)
  return `hace ${months} m`
}

function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function avatarHue(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h % 360
}

const FLAGS: Record<string, string> = {
  AR: '🇦🇷', BR: '🇧🇷', CL: '🇨🇱', CO: '🇨🇴', MX: '🇲🇽', PE: '🇵🇪',
  US: '🇺🇸', UY: '🇺🇾', VE: '🇻🇪', ES: '🇪🇸',
}
function countryFlag(code: string | null): string {
  if (!code) return '🌐'
  return FLAGS[code] ?? '🌐'
}

function userWalletCount(userId: string): number {
  return wallets.value.filter((w) => w.user_id === userId).length
}

function userTotals(userId: string): {
  walletCount: number
  totalUsd: number
  pricedCount: number
  nativeByCurrency: Record<string, number>
} {
  let walletCount = 0
  let totalUsd = 0
  let pricedCount = 0
  const nativeByCurrency: Record<string, number> = {}
  for (const w of wallets.value) {
    if (w.user_id !== userId) continue
    walletCount += 1
    const native = Number(w.balance)
    if (Number.isFinite(native) && native !== 0) {
      nativeByCurrency[w.currency] = (nativeByCurrency[w.currency] ?? 0) + native
    }
    if (w.balance_usd === null) continue
    const n = Number(w.balance_usd)
    if (Number.isFinite(n)) {
      totalUsd += n
      pricedCount += 1
    }
  }
  return { walletCount, totalUsd, pricedCount, nativeByCurrency }
}

function formatNative(value: number, currency: string): string {
  const fixed = value.toFixed(8).replace(/\.?0+$/, '')
  const [intPart, frac] = fixed.split('.')
  const grouped = Number(intPart).toLocaleString('es-AR')
  return frac ? `${grouped}.${frac} ${currency}` : `${grouped} ${currency}`
}

function userTotalLabel(userId: string): string {
  const t = userTotals(userId)
  const currencies = Object.keys(t.nativeByCurrency)
  if (currencies.length === 1) {
    return formatNative(t.nativeByCurrency[currencies[0]], currencies[0])
  }
  return fmtUsd(t.totalUsd)
}

function openConfirm(u: AdminUser, action: UserAction) {
  const totals = userTotals(u.user_id)
  confirmModal.value = {
    action,
    userId: u.user_id,
    target: {
      fullName: u.display_name,
      email: u.email ?? u.username,
      walletCount: totals.walletCount,
      totalUsd: totals.totalUsd,
    },
  }
}

async function handleConfirm(payload: { action: UserAction }) {
  if (!confirmModal.value) return
  const u = users.value.find((x) => x.user_id === confirmModal.value!.userId)
  if (!u) { confirmModal.value = null; return }
  try {
    if (payload.action === 'ban') await banUser(u.user_id)
    else if (payload.action === 'unban') await unbanUser(u.user_id)
    else if (payload.action === 'delete') await softDeleteUser(u.user_id)
    else if (payload.action === 'restore') await restoreUser(u.user_id)
    drawerOpen.value = false
    await load()
  } catch { /* handled by existing error display */ }
  confirmModal.value = null
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [usersRes, walletsRes] = await Promise.all([listUsers(), listAllWallets()])
    users.value = usersRes.users
    wallets.value = walletsRes.wallets
  } catch (e: unknown) {
    error.value = String(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

type UserStatus = 'deleted' | 'banned' | 'active'
function userStatus(u: AdminUser): UserStatus {
  if (u.deleted_at) return 'deleted'
  if (u.banned) return 'banned'
  return 'active'
}

const STATUS_LABEL: Record<UserStatus, string> = {
  active: 'Activo',
  banned: 'Baneado',
  deleted: 'Eliminado',
}
const STATUS_TONE: Record<UserStatus, 'success' | 'danger' | 'neutral'> = {
  active: 'success',
  banned: 'danger',
  deleted: 'neutral',
}

type KycLevel = 'L0' | 'L1' | 'L2' | 'L3'
const KYC_TONE: Record<KycLevel, 'success' | 'info' | 'warning'> = {
  L0: 'warning',
  L1: 'warning',
  L2: 'info',
  L3: 'success',
}
function kycTone(level: string | null | undefined): 'success' | 'info' | 'warning' | 'neutral' {
  if (level && level in KYC_TONE) return KYC_TONE[level as KycLevel]
  return 'neutral'
}

function openEdit(u: AdminUser) {
  editTarget.value = u
  editForm.value = { display_name: u.display_name, email: u.email ?? '' }
}

function closeEdit() { editTarget.value = null }

async function submitEdit() {
  if (!editTarget.value) return
  await updateUser(editTarget.value.user_id, {
    display_name: editForm.value.display_name || undefined,
    email: editForm.value.email || undefined,
  })
  closeEdit()
  await load()
}

const drawerUser = ref<DrawerUser | null>(null)
const drawerOpen = ref(false)
const drawerLoading = ref(false)

const walletDrawer = ref<WalletDrawerData | null>(null)
const walletDrawerOpen = ref(false)
const walletDrawerLoading = ref(false)

function userWalletsOf(userId: string): WalletAdminRecord[] {
  return wallets.value.filter((w) => w.user_id === userId)
}

function toDrawerWallets(records: WalletAdminRecord[]): DrawerWallet[] {
  return records.map((w) => ({
    id: w.wallet_id,
    asset: w.currency,
    network: w.currency,
    address: w.public_key,
    balance: w.balance,
    balanceUsd: w.balance_usd !== null ? Number(w.balance_usd) || 0 : 0,
    status: w.frozen ? 'frozen' : 'active',
    createdAt: '',
  }))
}

function toDrawerMovement(
  tx: Transaction | ConfirmedTransaction,
  userAddrs: Set<string>,
  addrCurrency: Map<string, string>,
  status: 'completed' | 'pending',
  idx: number,
): DrawerMovement {
  const isOutgoing = userAddrs.has(tx.sender)
  const asset = addrCurrency.get(tx.sender) ?? addrCurrency.get(tx.receiver) ?? '—'
  const createdAt = 'blockTimestamp' in tx ? tx.blockTimestamp : new Date().toISOString()
  return {
    id: `${status}-${idx}-${tx.sender.slice(0, 6)}-${tx.receiver.slice(0, 6)}`,
    type: isOutgoing ? 'withdraw' : 'deposit',
    asset,
    amount: String(tx.amount),
    amountUsd: Number(tx.amount) || 0,
    status,
    createdAt,
  }
}

function toDrawerAudit(entries: AuditEntry[]): DrawerAuditEvent[] {
  return entries.map((e) => ({
    id: e.id,
    action: e.action,
    meta: Object.keys(e.details ?? {}).length ? JSON.stringify(e.details) : '',
    actor: e.actor_id,
    at: e.created_at,
  }))
}

function toDrawerUser(u: AdminUser): DrawerUser {
  const status = u.deleted_at ? 'deleted' : u.banned ? 'banned' : 'active'
  const totals = userTotals(u.user_id)
  const userWallets = toDrawerWallets(userWalletsOf(u.user_id))
  return {
    id: u.user_id,
    fullName: u.display_name,
    email: u.email ?? u.username,
    phone: '—',
    country: { name: '—', code: '—', flag: '🌐' },
    role: u.roles?.includes('ADMIN') ? 'admin' : u.roles?.includes('OPERATOR') ? 'staff' : 'user',
    roles: u.roles ?? [],
    twoFA: false,
    kyc: 'L1',
    status,
    createdAt: u.created_at ?? new Date().toISOString(),
    lastActive: u.created_at ?? new Date().toISOString(),
    totalUsd: totals.totalUsd,
    wallets: userWallets,
    movements: [],
    audit: [],
    flags: { deletedAt: u.deleted_at ?? undefined },
  }
}

async function openDrawer(u: AdminUser) {
  drawerUser.value = toDrawerUser(u)
  drawerOpen.value = true
  drawerLoading.value = true
  const targetId = u.user_id

  const userAddrs = new Set(userWalletsOf(targetId).map((w) => w.public_key))
  const addrCurrency = new Map<string, string>()
  for (const w of wallets.value) addrCurrency.set(w.public_key, w.currency)

  try {
    const [auditRes, pendingRes, confirmedRes] = await Promise.all([
      listAuditLog({ target_id: targetId, limit: 50 }),
      getPending(),
      getConfirmed(),
    ])

    const pendingMovements = pendingRes.transactions
      .filter((t) => userAddrs.has(t.sender) || userAddrs.has(t.receiver))
      .map((t, i) => toDrawerMovement(t, userAddrs, addrCurrency, 'pending', i))

    const confirmedMovements = confirmedRes.transactions
      .filter((t) => userAddrs.has(t.sender) || userAddrs.has(t.receiver))
      .map((t, i) => toDrawerMovement(t, userAddrs, addrCurrency, 'completed', i))

    if (drawerUser.value && drawerUser.value.id === targetId) {
      drawerUser.value = {
        ...drawerUser.value,
        movements: [...pendingMovements, ...confirmedMovements],
        audit: toDrawerAudit(auditRes.entries),
      }
    }
  } catch {
    /* leave the skeleton; downstream UI handles empty arrays */
  } finally {
    if (drawerUser.value?.id === targetId) drawerLoading.value = false
  }
}

const DRAWER_TO_CONFIRM: Partial<Record<DrawerAction, UserAction>> = {
  ban: 'ban',
  unban: 'unban',
  delete: 'delete',
  restore: 'restore',
  freeze: 'freeze',
  unfreeze: 'unfreeze',
}

async function handleDrawerAction(action: DrawerAction, user: DrawerUser, role?: string) {
  if (action === 'edit') {
    const u = users.value.find((x) => x.user_id === user.id)
    if (u) openEdit(u)
    return
  }
  if (action === 'grant_role' || action === 'revoke_role') {
    if (!role) return
    try {
      if (action === 'grant_role') await grantRole(user.id, role)
      else await revokeRole(user.id, role)
      await load()
      const refreshed = users.value.find((x) => x.user_id === user.id)
      if (refreshed && drawerOpen.value) drawerUser.value = toDrawerUser(refreshed)
    } catch (e: unknown) {
      error.value = String(e)
    }
    return
  }
  const mapped = DRAWER_TO_CONFIRM[action]
  if (!mapped) return
  const u = users.value.find((x) => x.user_id === user.id)
  if (!u) return
  openConfirm(u, mapped)
}

async function openWalletDrawer(walletId: string) {
  const w = wallets.value.find((x) => x.wallet_id === walletId)
  if (!w) return
  walletDrawer.value = { wallet: w, movements: [], audit: [] }
  walletDrawerOpen.value = true
  walletDrawerLoading.value = true
  const targetKey = w.public_key

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

    if (walletDrawer.value && walletDrawer.value.wallet.wallet_id === walletId) {
      walletDrawer.value = { wallet: w, movements, audit }
    }
  } catch {
    /* keep skeleton */
  } finally {
    if (walletDrawer.value?.wallet.wallet_id === walletId) walletDrawerLoading.value = false
  }
}

async function handleWalletDrawerAction(action: WalletDrawerAction, w: WalletAdminRecord) {
  if (action === 'freeze') await freezeWallet(w.wallet_id)
  else await unfreezeWallet(w.wallet_id)
  walletDrawerOpen.value = false
  walletDrawer.value = null
  await load()
}

// ── BaseTable column definitions ─────────────────────────────────────
interface UserColumn {
  key: string
  label: string
  width?: string | number
  align?: 'left' | 'center' | 'right'
  num?: boolean
}
const userColumns: UserColumn[] = [
  { key: 'user', label: 'Usuario' },
  { key: 'status', label: 'Estado' },
  { key: 'kyc', label: 'KYC' },
  { key: 'country', label: 'País' },
  { key: 'wallets', label: 'Wallets', num: true },
  { key: 'balance', label: 'Saldo total', num: true },
  { key: 'last_active', label: 'Última actividad' },
  { key: 'created_at', label: 'Registro' },
]

function rowClass(u: AdminUser): string | undefined {
  return u.deleted_at ? 'row-muted' : undefined
}

function onRowClick(payload: { row: AdminUser }) {
  void openDrawer(payload.row)
}
</script>

<template>
  <div class="users-view">
    <div class="page-h">
      <div>
        <h1>Usuarios</h1>
        <p>Gestión de cuentas, wallets y movimientos en la plataforma.</p>
      </div>
      <BaseButton
        variant="ghost"
        size="sm"
        :loading="loading"
        @click="load"
      >
        Actualizar
      </BaseButton>
    </div>

    <!-- KPIs -->
    <div class="bigstat-row">
      <BaseCard variant="bigstat">
        <template #header>
          <span>Usuarios totales</span>
        </template>
        {{ kpis.total }}
        <template #footer>
          {{ kpis.active }} activos
        </template>
      </BaseCard>

      <BaseCard variant="bigstat">
        <template #header>
          <span>Activos</span>
        </template>
        {{ kpis.active }}
        <template #footer>
          {{ kpis.total ? Math.round((kpis.active / kpis.total) * 100) : 0 }}% del total
        </template>
      </BaseCard>

      <BaseCard variant="bigstat">
        <template #header>
          <span>Restringidos</span>
        </template>
        <span :class="{ 'vl-warn': kpis.restricted > 0 }">{{ kpis.restricted }}</span>
        <template #footer>
          {{ kpis.banned }} baneados · {{ kpis.kycPending }} pend. KYC
        </template>
      </BaseCard>

      <BaseCard variant="bigstat">
        <template #header>
          <span>Saldo bajo gestión</span>
        </template>
        {{ fmtUsd(kpis.totalUsd) }}
        <template #footer>
          {{ wallets.length }} wallets
          <template v-if="kpis.unpricedCount > 0">
            · <span class="unpriced">{{ kpis.unpricedCount }} sin tasa FX</span>
          </template>
        </template>
      </BaseCard>
    </div>

    <!-- Toolbar: tabs + search + filters + show-deleted (kept inline) -->
    <div class="toolbar">
      <div class="tabs filter-tabs">
        <button
          class="tab"
          :class="{ active: filterTab === 'all' }"
          @click="filterTab = 'all'"
        >
          Todos <span class="count-badge sm">{{ countsByTab.all }}</span>
        </button>
        <button
          class="tab"
          :class="{ active: filterTab === 'active' }"
          @click="filterTab = 'active'"
        >
          Activos <span class="count-badge sm">{{ countsByTab.active }}</span>
        </button>
        <button
          class="tab"
          :class="{ active: filterTab === 'kyc' }"
          @click="filterTab = 'kyc'"
        >
          KYC <span class="count-badge sm">{{ countsByTab.kyc }}</span>
        </button>
        <button
          class="tab"
          :class="{ active: filterTab === 'frozen' }"
          @click="filterTab = 'frozen'"
        >
          Congelados <span class="count-badge sm">{{ countsByTab.frozen }}</span>
        </button>
        <button
          class="tab"
          :class="{ active: filterTab === 'banned' }"
          @click="filterTab = 'banned'"
        >
          Baneados <span class="count-badge sm">{{ countsByTab.banned }}</span>
        </button>
      </div>
      <div class="toolbar-controls">
        <input
          v-model="searchQuery"
          class="filter-input"
          placeholder="Buscar por nombre, email, ID…"
        >
        <select
          v-model="filterKyc"
          class="filter-select"
        >
          <option value="">
            KYC
          </option>
          <option
            v-for="k in kycOptions"
            :key="k"
            :value="k"
          >
            {{ k }}
          </option>
        </select>
        <select
          v-model="filterCountry"
          class="filter-select"
        >
          <option value="">
            País
          </option>
          <option
            v-for="c in countryOptions"
            :key="c"
            :value="c"
          >
            {{ countryFlag(c) }} {{ c }}
          </option>
        </select>
        <label class="show-deleted">
          <input
            v-model="showDeleted"
            type="checkbox"
          >
          <span>Mostrar eliminados</span>
        </label>
      </div>
    </div>

    <div
      v-if="error"
      class="inline-alert danger"
    >
      {{ error }}
    </div>
    <div
      v-if="loading"
      class="loading-row"
    >
      <span
        class="pi pi-spin pi-spinner"
        aria-hidden="true"
      /> Cargando…
    </div>

    <BaseCard
      v-else
      variant="default"
      padding="none"
    >
      <BaseTable
        :columns="userColumns"
        :rows="pagedUsers"
        :row-key="(u: AdminUser) => u.user_id"
        :row-class="rowClass"
        @row-click="onRowClick"
      >
        <template #cell-user="{ row }">
          <div class="user-cell">
            <div
              class="avatar"
              :style="`background: hsl(${avatarHue(row.user_id)}, 60%, 92%); color: hsl(${avatarHue(row.user_id)}, 55%, 32%)`"
            >
              {{ avatarInitials(row.display_name) }}
            </div>
            <div class="user-meta">
              <div class="display-name">
                {{ row.display_name }}
              </div>
              <div class="user-sub">
                <span class="username">@{{ row.username }}</span>
                <span
                  v-if="row.email"
                  class="email"
                >· {{ row.email }}</span>
              </div>
            </div>
          </div>
        </template>

        <template #cell-status="{ row }">
          <BaseBadge :tone="STATUS_TONE[userStatus(row)]">
            {{ STATUS_LABEL[userStatus(row)] }}
          </BaseBadge>
        </template>

        <template #cell-kyc="{ row }">
          <BaseBadge
            variant="outline"
            :tone="kycTone(row.kyc_level)"
          >
            {{ row.kyc_level }}
          </BaseBadge>
        </template>

        <template #cell-country="{ row }">
          <span class="country-cell">{{ countryFlag(row.country) }} <span class="muted">{{ row.country ?? '—' }}</span></span>
        </template>

        <template #cell-wallets="{ row }">
          <span class="mono">{{ userWalletCount(row.user_id) }}</span>
        </template>

        <template #cell-balance="{ row }">
          <span class="mono">{{ userTotalLabel(row.user_id) }}</span>
        </template>

        <template #cell-last_active="{ row }">
          <span class="muted">{{ relTime(row.last_active) }}</span>
        </template>

        <template #cell-created_at="{ row }">
          <span class="muted">{{ fmtDate(row.created_at) }}</span>
        </template>

        <template #empty>
          No se encontraron usuarios con los filtros actuales.
        </template>
      </BaseTable>

      <div class="paging">
        <span class="paging-info">
          Mostrando {{ pageStartIdx }}–{{ pageEndIdx }} de {{ filteredUsers.length }}
        </span>
        <div class="paging-controls">
          <button
            class="paging-btn"
            :disabled="currentPage <= 1"
            @click="currentPage--"
          >
            <span class="pi pi-chevron-left" />
          </button>
          <span class="paging-pos">Página {{ currentPage }} de {{ totalPages }}</span>
          <button
            class="paging-btn"
            :disabled="currentPage >= totalPages"
            @click="currentPage++"
          >
            <span class="pi pi-chevron-right" />
          </button>
        </div>
      </div>
    </BaseCard>

    <!-- Edit modal -->
    <BaseModal
      v-model:open="editOpen"
      :title="editTarget ? `Editar @${editTarget.username}` : ''"
    >
      <div class="field">
        <label
          class="field-label"
          for="edit-name"
        >Nombre</label>
        <input
          id="edit-name"
          v-model="editForm.display_name"
          class="field-input"
          type="text"
          maxlength="255"
        >
      </div>
      <div class="field">
        <label
          class="field-label"
          for="edit-email"
        >Email</label>
        <input
          id="edit-email"
          v-model="editForm.email"
          class="field-input"
          type="email"
          maxlength="255"
        >
      </div>

      <template #footer>
        <BaseButton
          variant="ghost"
          @click="closeEdit"
        >
          Cancelar
        </BaseButton>
        <BaseButton
          variant="primary"
          @click="submitEdit"
        >
          Guardar
        </BaseButton>
      </template>
    </BaseModal>

    <UserDrawer
      :user="drawerUser"
      :open="drawerOpen"
      @close="drawerOpen = false"
      @action="([action, user, role]) => handleDrawerAction(action, user, role)"
      @view-wallet="openWalletDrawer"
    />
    <WalletDrawer
      :data="walletDrawer"
      :open="walletDrawerOpen"
      :loading="walletDrawerLoading"
      @close="walletDrawerOpen = false"
      @action="([action, wallet]) => handleWalletDrawerAction(action, wallet)"
    />
  </div>

  <Teleport to="body">
    <ConfirmUserModal
      v-if="confirmModal"
      :action="confirmModal.action"
      :user="confirmModal.target"
      @close="confirmModal = null"
      @confirm="handleConfirm"
    />
  </Teleport>
</template>

<style scoped>
.users-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
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

/* Bigstat row layout (BaseCard handles cell chrome + typography) */
.bigstat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.vl-warn {
  color: var(--warning);
}
.unpriced {
  color: var(--warning);
  font-weight: 500;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.filter-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.tab {
  padding: 6px 12px;
  font-size: 12.5px;
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  font-family: var(--font-sans);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition:
    background var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}
.tab:hover {
  background: var(--hover);
  color: var(--text);
}
.tab.active {
  background: var(--surface);
  color: var(--text);
  border-color: var(--border);
  font-weight: 600;
}
.count-badge.sm {
  font-size: 10.5px;
  padding: 1px 6px;
  line-height: 1.2;
  background: var(--surface-2);
  color: var(--text-3);
  border-radius: var(--radius-pill);
}

.toolbar-controls {
  display: flex;
  align-items: center;
  gap: 8px;
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
  min-width: 240px;
}
.filter-input:focus,
.filter-select:focus {
  border-color: var(--accent);
}

.show-deleted {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-2);
  cursor: pointer;
}
.show-deleted input {
  margin: 0;
  cursor: pointer;
}

.inline-alert {
  padding: 10px 14px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
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
.muted {
  color: var(--text-3);
}
.mono {
  font-family: var(--font-mono);
  font-size: 12.5px;
}

/* User cell with avatar */
.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}
.user-meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.display-name {
  font-weight: 600;
  color: var(--text);
  font-size: 13px;
}
.user-sub {
  font-size: 11.5px;
  color: var(--text-2);
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.username {
  color: var(--text-2);
}
.email {
  color: var(--text-3);
}

.country-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
}

/* BaseTable row-muted (consumer-driven) */
:deep(.row-muted) td {
  opacity: 0.55;
}

/* Paging */
.paging {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
  font-size: 12px;
  color: var(--text-2);
}
.paging-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}
.paging-pos {
  font-size: 12px;
  color: var(--text-2);
  padding: 0 4px;
}
.paging-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  cursor: pointer;
  display: grid;
  place-items: center;
}
.paging-btn:hover:not(:disabled) {
  background: var(--hover);
  color: var(--text);
}
.paging-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Edit modal inputs */
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}
.field-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-2);
}
.field-input {
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  font-size: 13px;
  outline: none;
  font-family: var(--font-sans);
}
.field-input:focus {
  border-color: var(--accent);
}

@media (max-width: 1100px) {
  .bigstat-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 760px) {
  .bigstat-row {
    grid-template-columns: 1fr;
  }
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .toolbar-controls {
    flex-direction: column;
    align-items: stretch;
  }
  .filter-input {
    min-width: 0;
  }
}
</style>
