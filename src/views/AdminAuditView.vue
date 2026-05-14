<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { listAuditLog, type AuditEntry } from '@/api/admin'
import { useToast } from 'primevue/usetoast'

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

const catMap: Record<string, { label: string; color: string }> = {
  user:       { label: 'usuario',   color: 'var(--accent)' },
  wallet:     { label: 'wallet',    color: 'var(--info)' },
  treasury:   { label: 'tesorería', color: '#5b21b6' },
  security:   { label: 'seguridad', color: 'var(--danger)' },
  kyc:        { label: 'kyc',       color: 'var(--success)' },
  config:     { label: 'config',    color: 'var(--text-2)' },
  p2p:        { label: 'p2p',       color: 'var(--warning)' },
  role:       { label: 'rol',       color: 'var(--warning)' },
  permission: { label: 'permiso',   color: 'var(--info)' },
}

function getCat(action: string): { label: string; color: string } {
  const prefix = action.split('.')[0] ?? ''
  return catMap[prefix] ?? { label: prefix || 'otro', color: 'var(--text-3)' }
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

const securityCount = computed(() =>
  entries.value.filter((e) => e.action.startsWith('security')).length,
)
const userCount = computed(() =>
  entries.value.filter((e) => e.action.startsWith('user')).length,
)
const walletCount = computed(() =>
  entries.value.filter((e) => e.action.startsWith('wallet') || e.action.startsWith('treasury')).length,
)

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
        <button class="btn btn-ghost" :disabled="loading" @click="load">
          <span class="pi pi-refresh" :class="{ 'pi-spin': loading }" aria-hidden="true" />
          Actualizar
        </button>
      </div>
    </div>

    <!-- KPI bigstat row -->
    <div class="bigstat-row">
      <div class="bigstat">
        <div class="lb">Total eventos</div>
        <div class="vl">{{ entries.length }}</div>
        <div class="ds">últimas 100 entradas</div>
      </div>
      <div class="bigstat">
        <div class="lb">Seguridad</div>
        <div class="vl" :class="{ 'vl-danger': securityCount > 0 }">{{ securityCount }}</div>
        <div class="ds">eventos críticos</div>
      </div>
      <div class="bigstat">
        <div class="lb">Usuarios</div>
        <div class="vl">{{ userCount }}</div>
        <div class="ds">acciones de usuario</div>
      </div>
      <div class="bigstat">
        <div class="lb">Wallets</div>
        <div class="vl">{{ walletCount }}</div>
        <div class="ds">wallet y tesorería</div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flow-card toolbar">
      <div class="toolbar-search">
        <span class="pi pi-search" aria-hidden="true" />
        <input v-model="searchQuery" placeholder="Buscar por actor, acción o detalle…" />
      </div>
      <select v-model="filterAction" class="toolbar-chip-select">
        <option value="">Categoría · Todas</option>
        <option v-for="cat in uniqueCategories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
      <span class="count-badge">{{ filtered.length }}</span>
    </div>

    <!-- Table -->
    <div class="panel">
      <div v-if="loading" class="loading-row">
        <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
      </div>
      <table v-else class="tbl">
        <thead>
          <tr>
            <th>Cuando</th>
            <th>Actor</th>
            <th>Evento</th>
            <th>IP / Origen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in filtered" :key="e.id">
            <td class="mono text-dim ts-cell">{{ e.created_at }}</td>
            <td>
              <div class="mono actor-id">{{ e.actor_id }}</div>
              <div class="cat-badge" :style="{ '--cat-color': getCat(e.action).color }">
                <span class="cat-dot" />
                {{ getCat(e.action).label }}
              </div>
            </td>
            <td>
              <div class="action-name">{{ e.action }}</div>
              <div class="action-detail">{{ formatDetail(e) }}</div>
            </td>
            <td class="mono text-dim">—</td>
          </tr>
          <tr v-if="filtered.length === 0 && !loading">
            <td colspan="4" class="empty-row">Sin entradas de auditoría.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.audit-view { display: flex; flex-direction: column; gap: 14px; }

.page-h { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
.page-h h1 { font-size: 22px; font-weight: 600; letter-spacing: -0.015em; margin: 0 0 2px; color: var(--text); }
.page-h p  { margin: 0; font-size: 13px; color: var(--text-2); }
.page-h-actions { display: flex; gap: 8px; }

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

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 14px;
}
.toolbar-search {
  display: flex; align-items: center; gap: 8px;
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 7px 10px;
  flex: 1; min-width: 240px;
  color: var(--text-3); font-size: 12.5px;
}
.toolbar-search input {
  border: 0; outline: 0; background: transparent; flex: 1;
  font: inherit; color: var(--text); font-family: var(--font-sans); font-size: 13px;
}
.toolbar-search input::placeholder { color: var(--text-3); }
.toolbar-search .pi { font-size: 12px; flex-shrink: 0; }

.toolbar-chip-select {
  padding: 6px 10px; border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface-2); color: var(--text-2); font-size: 12.5px;
  font-family: var(--font-sans); outline: none; cursor: pointer;
}
.toolbar-chip-select:focus { border-color: var(--accent); }

/* Panel + table */
.panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
.loading-row { display: flex; align-items: center; gap: 8px; color: var(--text-2); font-size: 13px; padding: 16px; }

.tbl { width: 100%; border-collapse: collapse; }
.tbl th {
  text-align: left; padding: 8px 14px; font-size: 11.5px; font-weight: 600; color: var(--text-3);
  text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.tbl td { padding: 9px 14px; border-bottom: 1px solid var(--border); font-size: 13px; vertical-align: top; }
.tbl tr:last-child td { border-bottom: none; }

.ts-cell { white-space: nowrap; font-size: 11.5px; }
.mono { font-family: var(--font-mono); font-size: 11.5px; }
.text-dim { color: var(--text-3); }
.actor-id { color: var(--text); }

.cat-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--text-3); margin-top: 2px;
}
.cat-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--cat-color, var(--text-3));
  flex-shrink: 0; display: block;
}

.action-name { font-weight: 500; font-size: 12.5px; font-family: var(--font-mono); color: var(--text); }
.action-detail { font-size: 11.5px; color: var(--text-2); margin-top: 2px; }

.empty-row { padding: 24px; text-align: center; color: var(--text-3); }

@media (max-width: 900px) { .bigstat-row { grid-template-columns: 1fr 1fr; } }
@media (max-width: 640px) {
  .page-h { flex-direction: column; align-items: flex-start; }
  .bigstat-row { grid-template-columns: 1fr; }
  .tbl th:nth-child(4), .tbl td:nth-child(4) { display: none; }
}
</style>
