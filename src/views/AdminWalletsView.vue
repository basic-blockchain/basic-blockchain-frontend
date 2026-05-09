<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  listAllWallets,
  freezeWallet,
  unfreezeWallet,
  type WalletAdminRecord,
} from '@/api/admin'
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
    const matchUser =
      !q ||
      w.username.toLowerCase().includes(q) ||
      w.display_name.toLowerCase().includes(q)
    const matchFrozen =
      filterFrozen.value === 'all' ||
      (filterFrozen.value === 'frozen' ? w.frozen : !w.frozen)
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
  <div class="admin-wallets">
    <div class="page-header">
      <h1>Wallets</h1>
      <button
        class="btn-secondary"
        :disabled="loading"
        @click="load"
      >
        Refresh
      </button>
    </div>

    <div class="filters">
      <input
        v-model="filterUser"
        placeholder="Filter by user…"
        class="filter-input"
      >
      <select
        v-model="filterFrozen"
        class="filter-select"
      >
        <option value="all">
          All statuses
        </option>
        <option value="active">
          Active
        </option>
        <option value="frozen">
          Frozen
        </option>
      </select>
      <span class="count-badge">{{ filtered.length }} wallet{{ filtered.length !== 1 ? 's' : '' }}</span>
    </div>

    <div
      v-if="error"
      class="error-banner"
    >
      {{ error }}
    </div>
    <div
      v-if="loading"
      class="loading"
    >
      Loading…
    </div>

    <table
      v-else
      class="wallets-table"
    >
      <thead>
        <tr>
          <th>Wallet ID</th>
          <th>Owner</th>
          <th>Balance</th>
          <th>Public key</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="w in filtered"
          :key="w.wallet_id"
          :class="{ 'row-frozen': w.frozen }"
        >
          <td class="mono">
            <HashChip
              :hash="w.wallet_id"
              :length="16"
              label="wallet id"
            />
          </td>
          <td>
            <span class="display-name">{{ w.display_name }}</span>
            <span class="username"> @{{ w.username }}</span>
          </td>
          <td class="mono">
            <AmountDisplay
              :amount="parseBalance(w.balance)"
              :precision="8"
              :unit="w.currency"
            />
          </td>
          <td class="mono text-muted">
            <HashChip
              :hash="w.public_key"
              :length="14"
              label="public key"
            />
          </td>
          <td>
            <span
              :class="w.frozen ? 'badge-frozen' : 'badge-active'"
              class="status-badge"
            >
              {{ w.frozen ? 'Frozen' : 'Active' }}
            </span>
          </td>
          <td>
            <button
              class="btn-sm"
              :class="w.frozen ? 'btn-unfreeze' : 'btn-freeze'"
              @click="toggleFreeze(w)"
            >
              {{ w.frozen ? 'Unfreeze' : 'Freeze' }}
            </button>
          </td>
        </tr>
        <tr v-if="filtered.length === 0 && !loading">
          <td
            colspan="6"
            class="empty"
          >
            No wallets found.
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.admin-wallets { padding: 1.5rem; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 600; }
.filters { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; }
.filter-input { background: var(--surface2, #2a2a3a); border: 1px solid var(--border, #444); border-radius: 0.375rem; color: var(--text, #eee); padding: 0.4rem 0.75rem; font-size: 0.875rem; min-width: 180px; }
.filter-select { background: var(--surface2, #2a2a3a); border: 1px solid var(--border, #444); border-radius: 0.375rem; color: var(--text, #eee); padding: 0.4rem 0.75rem; font-size: 0.875rem; }
.count-badge { color: var(--text-muted, #888); font-size: 0.85rem; }
.wallets-table { width: 100%; border-collapse: collapse; }
.wallets-table th { text-align: left; padding: 0.5rem 1rem; color: var(--text-muted, #888); font-size: 0.75rem; text-transform: uppercase; border-bottom: 1px solid var(--border, #333); }
.wallets-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border, #222); vertical-align: middle; }
.row-frozen td { opacity: 0.6; }
.mono { font-family: monospace; font-size: 0.85rem; }
.text-muted { color: var(--text-muted, #888); }
.display-name { font-weight: 500; }
.username { color: var(--text-muted, #888); font-size: 0.85rem; }
.status-badge { padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
.badge-active { background: rgba(34,197,94,0.15); color: #22c55e; }
.badge-frozen { background: rgba(96,165,250,0.15); color: #60a5fa; }
.btn-sm { padding: 0.25rem 0.6rem; border-radius: 0.375rem; border: none; cursor: pointer; font-size: 0.8rem; font-weight: 500; }
.btn-freeze { background: rgba(96,165,250,0.2); color: #60a5fa; }
.btn-unfreeze { background: rgba(34,197,94,0.15); color: #22c55e; }
.btn-secondary { padding: 0.5rem 1.25rem; background: var(--surface2, #2a2a3a); color: var(--text, #eee); border: 1px solid var(--border, #444); border-radius: 0.375rem; cursor: pointer; }
.loading, .empty { padding: 2rem; text-align: center; color: var(--text-muted, #888); }
.error-banner { background: rgba(239,68,68,0.1); border: 1px solid #ef4444; border-radius: 0.375rem; padding: 0.75rem 1rem; color: #ef4444; margin-bottom: 1rem; }
</style>
