<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getConfirmed, getPending } from '@/api/mempool'
import type { ConfirmedTransaction, Transaction } from '@/domain/transaction'
import { useToast } from 'primevue/usetoast'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import PaginatedTable from '@/components/organisms/PaginatedTable.vue'

const toast = useToast()
const confirmed = ref<ConfirmedTransaction[]>([])
const pending = ref<Transaction[]>([])
const loading = ref(false)
const activeTab = ref<'all' | 'internal' | 'onchain' | 'pending' | 'failed'>('all')
const searchQuery = ref('')

async function load() {
  loading.value = true
  try {
    const [conf, pend] = await Promise.all([getConfirmed(), getPending()])
    confirmed.value = conf.transactions
    pending.value = pend.transactions
  } catch (e: unknown) {
    toast.add({ severity: 'error', summary: 'Error al cargar', detail: String(e), life: 4000 })
  } finally {
    loading.value = false
  }
}

interface SendRow {
  type: 'Interno' | 'On-chain' | 'Tesorería'
  from: string
  to: string
  amount: number
  ref: string
  status: 'completed' | 'pending' | 'failed'
  when: string
}

interface SendColumn {
  key: string
  label: string
  num?: boolean
}

const sendColumns: SendColumn[] = [
  { key: 'type', label: 'Tipo' },
  { key: 'from', label: 'De' },
  { key: 'to', label: 'Para' },
  { key: 'amount', label: 'Monto', num: true },
  { key: 'ref', label: 'Hash / Ref' },
  { key: 'status', label: 'Estado' },
  { key: 'when', label: 'Cuando' },
]

const allRows = computed<SendRow[]>(() => {
  const c: SendRow[] = confirmed.value.map((t) => ({
    type: 'Interno' as const,
    from: t.sender,
    to: t.receiver,
    amount: t.amount,
    ref: `blk-${t.blockIndex}`,
    status: 'completed' as const,
    when: t.blockTimestamp ?? '—',
  }))
  const p: SendRow[] = pending.value.map((t) => ({
    type: 'Interno' as const,
    from: t.sender,
    to: t.receiver,
    amount: t.amount,
    ref: 'mempool',
    status: 'pending' as const,
    when: 'En mempool',
  }))
  return [...p, ...c]
})

const filteredRows = computed<SendRow[]>(() => {
  const q = searchQuery.value.toLowerCase()
  return allRows.value.filter((r) => {
    const matchQ =
      !q ||
      r.from.toLowerCase().includes(q) ||
      r.to.toLowerCase().includes(q) ||
      r.ref.toLowerCase().includes(q)
    if (!matchQ) return false
    if (activeTab.value === 'internal') return r.type === 'Interno'
    if (activeTab.value === 'onchain') return r.type === 'On-chain'
    if (activeTab.value === 'pending') return r.status === 'pending'
    if (activeTab.value === 'failed') return r.status === 'failed'
    return true
  })
})

const stats = computed(() => ({
  total: allRows.value.length,
  pending: allRows.value.filter((r) => r.status === 'pending').length,
  confirmed: allRows.value.filter((r) => r.status === 'completed').length,
  volume: allRows.value.reduce((s, r) => s + r.amount, 0),
}))

function typeTone(type: SendRow['type']): 'neutral' | 'info' | 'warning' {
  if (type === 'On-chain') return 'info'
  if (type === 'Tesorería') return 'warning'
  return 'neutral'
}

function statusTone(status: SendRow['status']): 'success' | 'warning' | 'danger' {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'danger'
  return 'warning'
}

function truncate(s: string, n = 20): string {
  return s.length > n ? `${s.slice(0, n / 2)}…${s.slice(-4)}` : s
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

    <!-- Big stats -->
    <div class="bigstat-row">
      <BaseCard variant="bigstat">
        <template #header>
          <span>Envíos totales</span>
        </template>
        {{ stats.total.toLocaleString('es-AR') }}
        <template #footer> Confirmados + pendientes </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          <span>Volumen total</span>
        </template>
        {{ stats.volume.toLocaleString('es-AR', { maximumFractionDigits: 2 }) }}
        <template #footer> Suma de montos </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          <span>Pendientes on-chain</span>
        </template>
        <span :class="{ 'kpi-warning': stats.pending > 0 }">{{ stats.pending }}</span>
        <template #footer> Confirmaciones &lt; 3 </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          <span>Confirmados</span>
        </template>
        <span class="kpi-success">{{ stats.confirmed.toLocaleString('es-AR') }}</span>
        <template #footer> En blockchain </template>
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
        <template #cell-type="{ row }">
          <BaseBadge :tone="typeTone(row.type)">
            {{ row.type }}
          </BaseBadge>
        </template>
        <template #cell-from="{ row }">
          <span class="mono cell-addr">{{ truncate(row.from) }}</span>
        </template>
        <template #cell-to="{ row }">
          <span class="mono cell-addr">{{ truncate(row.to) }}</span>
        </template>
        <template #cell-amount="{ row }">
          <span class="mono">
            {{ row.amount.toLocaleString('es-AR', { maximumFractionDigits: 8 }) }}
          </span>
        </template>
        <template #cell-ref="{ row }">
          <span class="mono text-dim ref-cell">{{ row.ref }}</span>
        </template>
        <template #cell-status="{ row }">
          <BaseBadge :tone="statusTone(row.status)">
            {{
              row.status === 'completed'
                ? 'Completado'
                : row.status === 'pending'
                  ? 'Pendiente'
                  : 'Fallido'
            }}
          </BaseBadge>
        </template>
        <template #cell-when="{ row }">
          <span class="text-dim ts-cell">{{ row.when }}</span>
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
.kpi-success {
  color: var(--success);
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
.cell-addr {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ref-cell {
  font-size: 11px;
}
.ts-cell {
  font-size: 11.5px;
  white-space: nowrap;
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
  :deep(.base-tbl__head th:nth-child(5)),
  :deep(.base-tbl__body td:nth-child(5)),
  :deep(.base-tbl__head th:nth-child(7)),
  :deep(.base-tbl__body td:nth-child(7)) {
    display: none;
  }
}
</style>
