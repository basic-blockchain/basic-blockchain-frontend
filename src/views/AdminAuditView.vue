<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { listAuditLog, type AuditEntry } from '@/api/admin'
import { useToast } from 'primevue/usetoast'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseTable from '@/components/atoms/BaseTable.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'

const toast = useToast()
const entries = ref<AuditEntry[]>([])
const loading = ref(false)
const searchQuery = ref('')
const filterAction = ref('')

async function load() {
  loading.value = true
  try {
    const res = await listAuditLog({ limit: 100 })
    entries.value = res.entries
  } catch (e: unknown) {
    toast.add({ severity: 'error', summary: 'Error al cargar', detail: String(e), life: 4000 })
  } finally {
    loading.value = false
  }
}

const filtered = computed(() => {
  const q = searchQuery.value.toLowerCase()
  const af = filterAction.value.toLowerCase()
  return entries.value.filter((e) => {
    const matchQ = !q || e.actor_id.toLowerCase().includes(q) || e.action.toLowerCase().includes(q)
    const matchA = !af || e.action.toLowerCase().startsWith(af)
    return matchQ && matchA
  })
})

type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const catMap: Record<string, { label: string; tone: BadgeTone }> = {
  user: { label: 'usuario', tone: 'info' },
  wallet: { label: 'wallet', tone: 'info' },
  treasury: { label: 'tesorería', tone: 'warning' },
  security: { label: 'seguridad', tone: 'danger' },
  kyc: { label: 'kyc', tone: 'success' },
  config: { label: 'config', tone: 'neutral' },
  p2p: { label: 'p2p', tone: 'warning' },
  role: { label: 'rol', tone: 'warning' },
  permission: { label: 'permiso', tone: 'info' },
}

function getCat(action: string): { label: string; tone: BadgeTone } {
  const prefix = action.split('.')[0] ?? ''
  return catMap[prefix] ?? { label: prefix || 'otro', tone: 'neutral' }
}

function formatDetail(entry: AuditEntry): string {
  if (entry.target_id) return `Target: ${entry.target_id}`
  const keys = Object.keys(entry.details ?? {})
  if (keys.length === 0) return '—'
  return keys.map((k) => `${k}: ${(entry.details as Record<string, unknown>)[k]}`).join(' · ')
}

const uniqueCategories = computed(() => {
  const seen = new Set<string>()
  entries.value.forEach((e) => seen.add(e.action.split('.')[0] ?? ''))
  return Array.from(seen).sort()
})

const securityCount = computed(
  () => entries.value.filter((e) => e.action.startsWith('security')).length
)
const userCount = computed(() => entries.value.filter((e) => e.action.startsWith('user')).length)
const walletCount = computed(
  () =>
    entries.value.filter((e) => e.action.startsWith('wallet') || e.action.startsWith('treasury'))
      .length
)

interface AuditColumn {
  key: string
  label: string
}

const auditColumns: AuditColumn[] = [
  { key: 'created_at', label: 'Cuando' },
  { key: 'actor', label: 'Actor' },
  { key: 'event', label: 'Evento' },
  { key: 'origin', label: 'IP / Origen' },
]

onMounted(load)
</script>

<template>
  <div class="audit-view">
    <div class="page-h">
      <div>
        <h1>Log de auditoría</h1>
        <p>Trazabilidad inmutable de toda acción administrativa, de seguridad y de tesorería.</p>
      </div>
      <div class="page-h-actions">
        <BaseButton
          variant="ghost"
          size="sm"
          :loading="loading"
          @click="load"
        >
          <template #leading>
            <span
              class="pi pi-refresh"
              :class="{ 'pi-spin': loading }"
              aria-hidden="true"
            />
          </template>
          Actualizar
        </BaseButton>
      </div>
    </div>

    <!-- KPI bigstat row -->
    <div class="bigstat-row">
      <BaseCard variant="bigstat">
        <template #header>
          <span>Total eventos</span>
        </template>
        {{ entries.length }}
        <template #footer>
          últimas 100 entradas
        </template>
      </BaseCard>

      <BaseCard variant="bigstat">
        <template #header>
          <span>Seguridad</span>
        </template>
        <span :class="{ 'kpi-danger': securityCount > 0 }">{{ securityCount }}</span>
        <template #footer>
          eventos críticos
        </template>
      </BaseCard>

      <BaseCard variant="bigstat">
        <template #header>
          <span>Usuarios</span>
        </template>
        {{ userCount }}
        <template #footer>
          acciones de usuario
        </template>
      </BaseCard>

      <BaseCard variant="bigstat">
        <template #header>
          <span>Wallets</span>
        </template>
        {{ walletCount }}
        <template #footer>
          wallet y tesorería
        </template>
      </BaseCard>
    </div>

    <!-- Toolbar -->
    <BaseCard class="toolbar">
      <div class="toolbar-search">
        <span
          class="pi pi-search"
          aria-hidden="true"
        />
        <input
          v-model="searchQuery"
          placeholder="Buscar por actor, acción o detalle…"
        >
      </div>
      <select
        v-model="filterAction"
        class="toolbar-chip-select"
      >
        <option value="">
          Categoría · Todas
        </option>
        <option
          v-for="cat in uniqueCategories"
          :key="cat"
          :value="cat"
        >
          {{ cat }}
        </option>
      </select>
      <span class="count-badge">{{ filtered.length }}</span>
    </BaseCard>

    <!-- Table -->
    <BaseCard
      class="audit-table"
      variant="default"
      padding="none"
    >
      <div
        v-if="loading"
        class="loading-row"
      >
        <span
          class="pi pi-spin pi-spinner"
          aria-hidden="true"
        /> Cargando…
      </div>
      <BaseTable
        v-else
        :columns="auditColumns"
        :rows="filtered"
        :row-key="(e: AuditEntry) => e.id"
      >
        <template #cell-created_at="{ row }">
          <span class="mono text-dim ts-cell">{{ row.created_at }}</span>
        </template>
        <template #cell-actor="{ row }">
          <div class="mono actor-id">
            {{ row.actor_id }}
          </div>
          <BaseBadge
            class="cat-badge"
            :tone="getCat(row.action).tone"
          >
            {{ getCat(row.action).label }}
          </BaseBadge>
        </template>
        <template #cell-event="{ row }">
          <div class="action-name">
            {{ row.action }}
          </div>
          <div class="action-detail">
            {{ formatDetail(row) }}
          </div>
        </template>
        <template #cell-origin>
          <span class="mono text-dim">—</span>
        </template>
        <template #empty>
          Sin entradas de auditoría.
        </template>
      </BaseTable>
    </BaseCard>
  </div>
</template>

<style scoped>
.audit-view {
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
.page-h-actions {
  display: flex;
  gap: 8px;
}

/* Bigstat KPI row */
.bigstat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.kpi-danger {
  color: var(--danger);
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.toolbar-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 7px 10px;
  flex: 1;
  min-width: 240px;
  color: var(--text-3);
  font-size: 12.5px;
}
.toolbar-search input {
  border: 0;
  outline: 0;
  background: transparent;
  flex: 1;
  font: inherit;
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 13px;
}
.toolbar-search input::placeholder {
  color: var(--text-3);
}
.toolbar-search .pi {
  font-size: 12px;
  flex-shrink: 0;
}

.toolbar-chip-select {
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 12.5px;
  font-family: var(--font-sans);
  outline: none;
  cursor: pointer;
}
.toolbar-chip-select:focus {
  border-color: var(--accent);
}

/* BaseTable wrappers */
.loading-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
  font-size: 13px;
  padding: 16px;
}

.ts-cell {
  white-space: nowrap;
  font-size: 11.5px;
}
.mono {
  font-family: var(--font-mono);
  font-size: 11.5px;
}
.text-dim {
  color: var(--text-3);
}
.actor-id {
  color: var(--text);
}

.cat-badge {
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.action-name {
  font-weight: 500;
  font-size: 12.5px;
  font-family: var(--font-mono);
  color: var(--text);
}
.action-detail {
  font-size: 11.5px;
  color: var(--text-2);
  margin-top: 2px;
}

@media (max-width: 900px) {
  .bigstat-row {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 640px) {
  .page-h {
    flex-direction: column;
    align-items: flex-start;
  }
  .bigstat-row {
    grid-template-columns: 1fr;
  }
  :deep(.base-tbl__head th:nth-child(4)),
  :deep(.base-tbl__body td:nth-child(4)) {
    display: none;
  }
}
</style>
