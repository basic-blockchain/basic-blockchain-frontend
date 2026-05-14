<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getConfirmed, getPending } from '@/api/mempool'
import type { ConfirmedTransaction, Transaction } from '@/domain/transaction'
import { useToast } from 'primevue/usetoast'

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
    const matchQ = !q || r.from.toLowerCase().includes(q) || r.to.toLowerCase().includes(q) || r.ref.toLowerCase().includes(q)
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

function typeStyle(type: string): { background: string; color: string } {
  if (type === 'On-chain') return { background: 'var(--info-soft)', color: 'var(--info)' }
  if (type === 'Tesorería') return { background: '#ede9fe', color: '#5b21b6' }
  return { background: 'var(--muted-soft)', color: 'var(--muted)' }
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
      <button class="btn-ghost" :disabled="loading" @click="load">
        <span class="pi pi-refresh" :class="{ 'pi-spin': loading }" aria-hidden="true" />
        Actualizar
      </button>
    </div>

    <!-- Big stats -->
    <div class="bigstat-row">
      <div class="bigstat">
        <div class="bigstat-lb">Envíos totales</div>
        <div class="bigstat-vl">{{ stats.total.toLocaleString('es-AR') }}</div>
        <div class="bigstat-ds">Confirmados + pendientes</div>
      </div>
      <div class="bigstat">
        <div class="bigstat-lb">Volumen total</div>
        <div class="bigstat-vl">{{ stats.volume.toLocaleString('es-AR', { maximumFractionDigits: 2 }) }}</div>
        <div class="bigstat-ds">Suma de montos</div>
      </div>
      <div class="bigstat">
        <div class="bigstat-lb">Pendientes on-chain</div>
        <div class="bigstat-vl" :style="stats.pending > 0 ? { color: 'var(--warning)' } : {}">{{ stats.pending }}</div>
        <div class="bigstat-ds">Confirmaciones &lt; 3</div>
      </div>
      <div class="bigstat">
        <div class="bigstat-lb">Confirmados</div>
        <div class="bigstat-vl" style="color: var(--success)">{{ stats.confirmed.toLocaleString('es-AR') }}</div>
        <div class="bigstat-ds">En blockchain</div>
      </div>
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
        @click="activeTab = (t.key as 'all' | 'internal' | 'onchain' | 'pending' | 'failed')"
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
    <div v-else class="panel">
      <table class="data-table">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>De</th>
            <th>Para</th>
            <th class="num">Monto</th>
            <th>Hash / Ref</th>
            <th>Estado</th>
            <th>Cuando</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in filteredRows" :key="i" class="data-row">
            <td>
              <span class="type-badge" :style="typeStyle(r.type)">{{ r.type }}</span>
            </td>
            <td class="mono cell-addr">{{ truncate(r.from) }}</td>
            <td class="mono cell-addr">{{ truncate(r.to) }}</td>
            <td class="num mono">{{ r.amount.toLocaleString('es-AR', { maximumFractionDigits: 8 }) }}</td>
            <td class="mono text-dim ref-cell">{{ r.ref }}</td>
            <td>
              <span class="status-badge" :class="r.status">
                {{ r.status === 'completed' ? 'Completado' : r.status === 'pending' ? 'Pendiente' : 'Fallido' }}
              </span>
            </td>
            <td class="text-dim ts-cell">{{ r.when }}</td>
          </tr>
          <tr v-if="filteredRows.length === 0">
            <td colspan="7" class="empty-row">Sin envíos en esta categoría.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.sends-view { display: flex; flex-direction: column; gap: 14px; }

.page-h { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
.page-h h1 { font-size: 22px; font-weight: 600; letter-spacing: -0.015em; margin: 0 0 2px; color: var(--text); }
.page-h p  { margin: 0; font-size: 13px; color: var(--text-2); }

.btn-ghost {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 13px; border-radius: var(--radius); border: 1px solid var(--border);
  background: var(--surface); color: var(--text-2); font-size: 13px; font-weight: 500;
  cursor: pointer; transition: background 0.12s, color 0.12s; font-family: var(--font-sans);
}
.btn-ghost:hover:not(:disabled) { background: var(--hover); color: var(--text); }
.btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

/* Big stats */
.bigstat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.bigstat { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px 18px; }
.bigstat-lb { font-size: 11.5px; font-weight: 500; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
.bigstat-vl { font-size: 28px; font-weight: 600; letter-spacing: -0.02em; color: var(--text); line-height: 1; }
.bigstat-ds { font-size: 11.5px; color: var(--text-2); margin-top: 6px; }

/* Tab strip */
.tabstrip { display: flex; gap: 2px; border-bottom: 1px solid var(--border); overflow-x: auto; }
.tab-item {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; font-size: 13px; font-weight: 500; color: var(--text-2);
  background: transparent; border: none; border-bottom: 2px solid transparent;
  cursor: pointer; white-space: nowrap; font-family: var(--font-sans);
  transition: color 0.12s; margin-bottom: -1px;
}
.tab-item:hover { color: var(--text); }
.tab-item.active { color: var(--text); border-bottom-color: var(--text); }

/* Search */
.toolbar-search-bar { display: flex; align-items: center; gap: 8px; }
.toolbar-search {
  display: flex; align-items: center; gap: 8px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 7px 10px; flex: 1;
  color: var(--text-3); font-size: 12.5px;
}
.toolbar-search input {
  border: 0; outline: 0; background: transparent; flex: 1;
  font-family: var(--font-sans); font-size: 13px; color: var(--text);
}
.toolbar-search input::placeholder { color: var(--text-3); }
.toolbar-search .pi { font-size: 12px; flex-shrink: 0; }

.count-badge {
  padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600;
  background: var(--muted-soft); color: var(--muted); white-space: nowrap;
}

.loading-row { display: flex; align-items: center; gap: 8px; color: var(--text-2); font-size: 13px; }

/* Table */
.panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th {
  text-align: left; padding: 8px 14px; font-size: 11.5px; font-weight: 600; color: var(--text-3);
  text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid var(--border); background: var(--surface-2);
}
.data-table th.num, .data-table td.num { text-align: right; }
.data-table td { padding: 10px 14px; border-bottom: 1px solid var(--border); font-size: 13px; vertical-align: middle; }
.data-table tr:last-child td { border-bottom: none; }
.data-row { cursor: default; transition: background 0.08s; }
.data-row:hover { background: var(--hover); }

.mono { font-family: var(--font-mono); font-size: 12px; }
.text-dim { color: var(--text-3); }
.cell-addr { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ref-cell  { font-size: 11px; }
.ts-cell   { font-size: 11.5px; white-space: nowrap; }
.empty-row { padding: 24px; text-align: center; color: var(--text-3); }

.type-badge { padding: 2px 8px; border-radius: 20px; font-size: 11.5px; font-weight: 500; border: 1px solid var(--border); }

.status-badge { padding: 2px 8px; border-radius: 20px; font-size: 11.5px; font-weight: 500; }
.status-badge.completed { background: var(--success-soft); color: var(--success); }
.status-badge.pending   { background: var(--warning-soft); color: var(--warning); }
.status-badge.failed    { background: var(--danger-soft);  color: var(--danger); }

@media (max-width: 900px) { .bigstat-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) {
  .bigstat-row { grid-template-columns: 1fr; }
  .page-h { flex-direction: column; align-items: flex-start; }
  .data-table th:nth-child(5), .data-table td:nth-child(5),
  .data-table th:nth-child(7), .data-table td:nth-child(7) { display: none; }
}
</style>
