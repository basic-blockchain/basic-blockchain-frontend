<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { listAllWallets, freezeWallet, unfreezeWallet, type WalletAdminRecord } from '@/api/admin'
import HashChip from '@/components/atoms/HashChip.vue'
import AmountDisplay from '@/components/atoms/AmountDisplay.vue'

const wallets = ref<WalletAdminRecord[]>([])
const loading = ref(false)
const error = ref('')
const filterUser = ref('')
const filterFrozen = ref<'all' | 'frozen' | 'active'>('all')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await listAllWallets()
    wallets.value = res.wallets
  } catch (e: unknown) {
    error.value = String(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

const filtered = computed(() => {
  return wallets.value.filter((w) => {
    const q = filterUser.value.toLowerCase()
    const matchUser = !q || w.username.toLowerCase().includes(q) || w.display_name.toLowerCase().includes(q)
    const matchFrozen = filterFrozen.value === 'all' || (filterFrozen.value === 'frozen' ? w.frozen : !w.frozen)
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
</script>

<template>
  <div class="wallets-view">
    <div class="page-h">
      <div>
        <h1>Wallets</h1>
        <p>Gestión y congelamiento de wallets de la plataforma</p>
      </div>
      <button class="btn-ghost" :disabled="loading" @click="load">
        <span class="pi pi-refresh" :class="{ 'pi-spin': loading }" aria-hidden="true" />
        Actualizar
      </button>
    </div>

    <div class="filters-bar">
      <input v-model="filterUser" class="filter-input" placeholder="Buscar por usuario…" />
      <select v-model="filterFrozen" class="filter-select">
        <option value="all">Todos los estados</option>
        <option value="active">Activa</option>
        <option value="frozen">Congelada</option>
      </select>
      <span class="count-badge">{{ filtered.length }} wallet{{ filtered.length !== 1 ? 's' : '' }}</span>
    </div>

    <div v-if="error" class="inline-alert danger">{{ error }}</div>
    <div v-if="loading" class="loading-row">
      <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
    </div>

    <div v-else class="panel">
      <table class="data-table">
        <thead>
          <tr>
            <th>Wallet ID</th>
            <th>Usuario</th>
            <th>Balance</th>
            <th>Tipo</th>
            <th>Clave pública</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in filtered" :key="w.wallet_id" :class="{ 'row-muted': w.frozen }">
            <td class="mono"><HashChip :hash="w.wallet_id" :length="16" label="wallet id" /></td>
            <td>
              <span class="display-name">{{ w.display_name }}</span>
              <span class="username"> @{{ w.username }}</span>
            </td>
            <td class="mono"><AmountDisplay :amount="parseBalance(w.balance)" :precision="8" :unit="w.currency" /></td>
            <td>
              <span class="type-badge" :class="`type-${w.wallet_type.toLowerCase()}`">{{ w.wallet_type }}</span>
            </td>
            <td class="mono text-dim"><HashChip :hash="w.public_key" :length="14" label="public key" /></td>
            <td>
              <span class="status-dot" :class="w.frozen ? 'frozen' : 'active'">
                {{ w.frozen ? 'Congelada' : 'Activa' }}
              </span>
            </td>
            <td>
              <button class="btn-sm" :class="w.frozen ? 'btn-success' : 'btn-info'" @click="toggleFreeze(w)">
                {{ w.frozen ? 'Descongelar' : 'Congelar' }}
              </button>
            </td>
          </tr>
          <tr v-if="filtered.length === 0 && !loading">
            <td colspan="7" class="empty-row">No se encontraron wallets.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.wallets-view { display: flex; flex-direction: column; gap: 18px; }

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

.filters-bar {
  display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
}
.filter-input, .filter-select {
  padding: 7px 10px; border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface-2); color: var(--text); font-size: 13px; outline: none;
  font-family: var(--font-sans);
}
.filter-input { min-width: 180px; }
.filter-input:focus, .filter-select:focus { border-color: var(--accent); }

.inline-alert { padding: 10px 14px; border-radius: var(--radius); border: 1px solid; font-size: 13px; }
.inline-alert.danger { background: var(--danger-soft); border-color: var(--danger); color: var(--danger); }
.loading-row { display: flex; align-items: center; gap: 8px; color: var(--text-2); font-size: 13px; }

.panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th {
  text-align: left; padding: 8px 14px; font-size: 11.5px; font-weight: 600; color: var(--text-3);
  text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid var(--border); background: var(--surface-2);
}
.data-table td { padding: 10px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; font-size: 13px; }
.data-table tr:last-child td { border-bottom: none; }
.row-muted td { opacity: 0.6; }

.mono { font-family: var(--font-mono); font-size: 12px; }
.text-dim { color: var(--text-3); }
.display-name { font-weight: 500; color: var(--text); }
.username { color: var(--text-2); font-size: 12px; }
.empty-row { padding: 24px; text-align: center; color: var(--text-3); }

.type-badge {
  padding: 2px 7px; border-radius: 20px; font-size: 11px;
  font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
}
.type-user     { background: var(--muted-soft);    color: var(--muted); }
.type-treasury { background: var(--warning-soft);  color: var(--warning); }
.type-fee      { background: var(--info-soft);     color: var(--info); }

.status-dot { font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 20px; }
.status-dot.active { background: var(--success-soft); color: var(--success); }
.status-dot.frozen { background: var(--info-soft);    color: var(--info); }

.btn-sm { padding: 3px 10px; border-radius: var(--radius-sm); border: none; cursor: pointer; font-size: 12px; font-weight: 500; font-family: var(--font-sans); }
.btn-success { background: var(--success-soft); color: var(--success); }
.btn-info    { background: var(--info-soft);    color: var(--info); }

@media (max-width: 640px) {
  .page-h { flex-direction: column; align-items: flex-start; }
}
</style>
