<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getAdminSends, grantPermission } from '@/api/admin'
import { BlockchainApiError } from '@/api/errors'
import type { SendRow, SendsAggregates, SendKind, SendStatus } from '@/domain/send'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import AssetBadge from '@/components/atoms/AssetBadge.vue'
import UserChip from '@/components/atoms/UserChip.vue'
import PaginatedTable from '@/components/organisms/PaginatedTable.vue'

const toast = useToast()
const auth = useAuthStore()
const rows = ref<SendRow[]>([])
const aggregates = ref<SendsAggregates>({
  count_24h: 0,
  count_24h_by_kind: { internal: 0, onchain: 0, treasury: 0 },
  volume_usd_24h: '0',
  pending_onchain: 0,
  fees_collected_usd_7d: '0',
})
const loading = ref(false)
const needsElevation = ref(false)
const elevating = ref(false)
const activeTab = ref<'all' | 'internal' | 'onchain' | 'pending' | 'failed'>('all')
const searchQuery = ref('')

async function load() {
  loading.value = true
  needsElevation.value = false
  try {
    const res = await getAdminSends({ window: '24h', limit: 500 })
    rows.value = res.rows
    aggregates.value = res.aggregates
  } catch (e: unknown) {
    if (e instanceof BlockchainApiError && e.code === 'FORBIDDEN') {
      needsElevation.value = true
    } else {
      toast.add({ severity: 'error', summary: 'Error al cargar', detail: String(e), life: 4000 })
    }
  } finally {
    loading.value = false
  }
}

async function requestAccess() {
  const userId = auth.user?.user_id
  if (!userId) {
    toast.add({ severity: 'error', summary: 'No autenticado', life: 3000 })
    return
  }
  elevating.value = true
  try {
    await grantPermission(userId, 'VIEW_TRANSFERS')
    toast.add({
      severity: 'success',
      summary: 'Permiso concedido',
      detail: 'VIEW_TRANSFERS otorgado. La elevación queda registrada en audit_log.',
      life: 4000,
    })
    await load()
  } catch (e: unknown) {
    toast.add({ severity: 'error', summary: 'No se pudo elevar', detail: String(e), life: 5000 })
  } finally {
    elevating.value = false
  }
}

interface SendColumn {
  key: string
  label: string
  num?: boolean
}

const sendColumns: SendColumn[] = [
  { key: 'kind', label: 'Tipo' },
  { key: 'from', label: 'De' },
  { key: 'to', label: 'Para' },
  { key: 'asset', label: 'Activo' },
  { key: 'amount', label: 'Monto', num: true },
  { key: 'ref', label: 'Hash / Ref' },
  { key: 'status', label: 'Estado' },
  { key: 'when', label: 'Cuando' },
]

const filteredRows = computed<SendRow[]>(() => {
  const q = searchQuery.value.toLowerCase()
  return rows.value.filter((r) => {
    if (q) {
      const hay = [
        r.tx_id,
        r.ref_short,
        r.from.username ?? '',
        r.to.username ?? '',
        r.from.address,
        r.to.address,
      ]
        .join(' ')
        .toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (activeTab.value === 'internal') return r.kind === 'internal'
    if (activeTab.value === 'onchain') return r.kind === 'onchain'
    if (activeTab.value === 'pending') return r.status === 'pending'
    if (activeTab.value === 'failed') return r.status === 'failed'
    return true
  })
})

const internalShare = computed(() => {
  const total = aggregates.value.count_24h
  if (total === 0) return { internal: 0, onchain: 0 }
  return {
    internal: Math.round((aggregates.value.count_24h_by_kind.internal / total) * 100),
    onchain: Math.round((aggregates.value.count_24h_by_kind.onchain / total) * 100),
  }
})

function kindLabel(kind: SendKind): string {
  if (kind === 'internal') return 'Interno'
  if (kind === 'onchain') return 'On-chain'
  return 'Tesorería'
}

function kindTone(kind: SendKind): 'neutral' | 'info' | 'warning' {
  if (kind === 'onchain') return 'info'
  if (kind === 'treasury') return 'warning'
  return 'neutral'
}

function statusLabel(status: SendStatus): string {
  if (status === 'completed') return 'Completado'
  if (status === 'pending') return 'Pendiente'
  return 'Fallido'
}

function statusTone(status: SendStatus): 'success' | 'warning' | 'danger' {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'danger'
  return 'warning'
}

function formatUsd(value: string | null): string {
  if (!value) return '—'
  const n = Number(value)
  if (Number.isNaN(n)) return value
  if (n >= 1000) {
    return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  }
  return `$${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`
}

function formatAmount(value: string): string {
  const n = Number(value)
  if (Number.isNaN(n)) return value
  return n.toLocaleString('es-AR', { maximumFractionDigits: 8 })
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'En mempool'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return iso
  const diff = Math.max(0, Date.now() - then)
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'hace segundos'
  if (min < 60) return `hace ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `hace ${hr} h`
  const days = Math.floor(hr / 24)
  return `hace ${days} d`
}

function displayName(row: SendRow, side: 'from' | 'to'): string {
  const p = row[side]
  if (p.username) return p.username
  return p.address.length > 14 ? `${p.address.slice(0, 6)}…${p.address.slice(-4)}` : p.address
}

onMounted(load)
</script>

<template>
  <div class="sends-view">
    <div class="page-h">
      <div>
        <h1>Envíos</h1>
        <p>Transferencias entre wallets · internas y on-chain.</p>
      </div>
      <BaseButton variant="ghost" size="sm" :loading="loading" @click="load">
        <template #leading>
          <span class="pi pi-refresh" :class="{ 'pi-spin': loading }" aria-hidden="true" />
        </template>
        Actualizar
      </BaseButton>
    </div>

    <!-- Permission elevation panel — surfaced when the backend returns
         403 (VIEW_TRANSFERS not yet granted to this admin). Self-grant
         is intentional: V009 leaves VIEW_TRANSFERS out of the ADMIN
         baseline so every elevation lands in audit_log. -->
    <BaseCard v-if="needsElevation" variant="default" class="elevation-panel">
      <div class="elev">
        <div class="elev__icon" aria-hidden="true">
          <span class="pi pi-lock" />
        </div>
        <div class="elev__text">
          <h2>Necesitás <code>VIEW_TRANSFERS</code> para ver envíos</h2>
          <p>
            Este permiso expone el historial financiero de toda la plataforma,
            por eso no está en el baseline de ADMIN. Solicitalo aquí — la
            elevación queda registrada en <code>audit_log</code>.
          </p>
        </div>
        <BaseButton variant="primary" :loading="elevating" @click="requestAccess">
          Solicitar acceso
        </BaseButton>
      </div>
    </BaseCard>

    <!-- Big stats -->
    <div class="bigstat-row">
      <BaseCard variant="bigstat">
        <template #header><span>Envíos 24h</span></template>
        {{ aggregates.count_24h.toLocaleString('es-AR') }}
        <template #footer>
          Internos {{ internalShare.internal }}% · On-chain {{ internalShare.onchain }}%
        </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header><span>Volumen 24h</span></template>
        {{ formatUsd(aggregates.volume_usd_24h) }}
        <template #footer>Suma en USD</template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header><span>Pendientes on-chain</span></template>
        <span :class="{ 'kpi-warning': aggregates.pending_onchain > 0 }">
          {{ aggregates.pending_onchain }}
        </span>
        <template #footer>Confirmaciones &lt; 3</template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header><span>Comisiones cobradas</span></template>
        {{ formatUsd(aggregates.fees_collected_usd_7d) }}
        <template #footer>Últimos 7 días</template>
      </BaseCard>
    </div>

    <!-- Tab strip -->
    <div class="tabstrip" role="tablist">
      <button
        v-for="t in [
          { key: 'all', label: 'Todos' },
          { key: 'internal', label: 'Internos' },
          { key: 'onchain', label: 'On-chain' },
          { key: 'pending', label: 'Pendientes' },
          { key: 'failed', label: 'Fallidos' },
        ]"
        :key="t.key"
        role="tab"
        class="tab-item"
        :class="{ active: activeTab === t.key }"
        :aria-selected="activeTab === t.key"
        @click="activeTab = t.key as 'all' | 'internal' | 'onchain' | 'pending' | 'failed'"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- Search bar -->
    <div class="toolbar-search-bar">
      <div class="toolbar-search">
        <span class="pi pi-search" aria-hidden="true" />
        <input v-model="searchQuery" placeholder="Buscar por wallet, referencia…" />
      </div>
      <span class="count-badge">{{ filteredRows.length }}</span>
    </div>

    <!-- Table -->
    <div v-if="loading" class="loading-row">
      <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
    </div>
    <BaseCard v-else variant="default" padding="none">
      <PaginatedTable :columns="sendColumns" :rows="filteredRows">
        <template #cell-kind="{ row }">
          <BaseBadge :tone="kindTone((row as SendRow).kind)">
            {{ kindLabel((row as SendRow).kind) }}
          </BaseBadge>
        </template>
        <template #cell-from="{ row }">
          <UserChip :name="displayName(row as SendRow, 'from')" size="sm" />
        </template>
        <template #cell-to="{ row }">
          <UserChip :name="displayName(row as SendRow, 'to')" size="sm" />
        </template>
        <template #cell-asset="{ row }">
          <AssetBadge :code="(row as SendRow).asset.code" />
        </template>
        <template #cell-amount="{ row }">
          <span class="mono">{{ formatAmount((row as SendRow).amount) }}</span>
        </template>
        <template #cell-ref="{ row }">
          <span class="mono text-dim ref-cell">{{ (row as SendRow).ref_short }}</span>
        </template>
        <template #cell-status="{ row }">
          <BaseBadge :tone="statusTone((row as SendRow).status)">
            {{ statusLabel((row as SendRow).status) }}
          </BaseBadge>
        </template>
        <template #cell-when="{ row }">
          <span class="text-dim ts-cell">{{ relativeTime((row as SendRow).confirmed_at) }}</span>
        </template>
        <template #empty> Sin envíos en esta categoría. </template>
      </PaginatedTable>
    </BaseCard>
  </div>
</template>

<style scoped>
.sends-view {
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

/* Big stats */
.bigstat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.kpi-warning {
  color: var(--warning);
}

/* Tab strip */
.tabstrip {
  display: flex;
  gap: 2px;
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
}
.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  font-family: var(--font-sans);
  transition: color 0.12s;
  margin-bottom: -1px;
}
.tab-item:hover {
  color: var(--text);
}
.tab-item.active {
  color: var(--text);
  border-bottom-color: var(--text);
}

/* Search */
.toolbar-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.toolbar-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 7px 10px;
  flex: 1;
  color: var(--text-3);
  font-size: 12.5px;
}
.toolbar-search input {
  border: 0;
  outline: 0;
  background: transparent;
  flex: 1;
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--text);
}
.toolbar-search input::placeholder {
  color: var(--text-3);
}
.toolbar-search .pi {
  font-size: 12px;
  flex-shrink: 0;
}

.count-badge {
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  background: var(--muted-soft);
  color: var(--muted);
  white-space: nowrap;
}

.loading-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
  font-size: 13px;
}

.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
.text-dim {
  color: var(--text-3);
}
.ref-cell {
  font-size: 11px;
}
.ts-cell {
  font-size: 11.5px;
  white-space: nowrap;
}

/* Permission elevation panel */
.elevation-panel {
  border: 1px solid var(--warning, #d97706);
}
.elev {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
}
.elev__icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(217, 119, 6, 0.15);
  color: var(--warning, #d97706);
  flex-shrink: 0;
}
.elev__icon .pi {
  font-size: 16px;
}
.elev__text {
  flex: 1;
  min-width: 0;
}
.elev__text h2 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.elev__text p {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-2);
  line-height: 1.45;
}
.elev__text code {
  font-family: var(--font-mono);
  font-size: 11.5px;
  background: var(--muted-soft);
  padding: 1px 5px;
  border-radius: 3px;
}

@media (max-width: 900px) {
  .bigstat-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .bigstat-row {
    grid-template-columns: 1fr;
  }
  .page-h {
    flex-direction: column;
    align-items: flex-start;
  }
  /* Hide Hash/Ref (col 6) and Cuando (col 8) on small screens. */
  :deep(.base-tbl__head th:nth-child(6)),
  :deep(.base-tbl__body td:nth-child(6)),
  :deep(.base-tbl__head th:nth-child(8)),
  :deep(.base-tbl__body td:nth-child(8)) {
    display: none;
  }
}
</style>
