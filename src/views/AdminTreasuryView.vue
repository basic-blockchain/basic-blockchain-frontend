<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  listAllWallets,
  createTreasuryWallet,
  listCurrencies,
  type WalletAdminRecord,
  type CurrencyRecord,
} from '@/api/admin'
import HashChip from '@/components/atoms/HashChip.vue'
import AmountDisplay from '@/components/atoms/AmountDisplay.vue'
import { useToast } from 'primevue/usetoast'

const toast = useToast()

const wallets = ref<WalletAdminRecord[]>([])
const currencies = ref<CurrencyRecord[]>([])
const selectedCurrency = ref('NATIVE')
const loading = ref(false)
const creating = ref(false)

const treasuryWallets = computed(() => wallets.value.filter((w) => w.wallet_type === 'TREASURY'))

async function load() {
  loading.value = true
  try {
    const [walletRes, currencyRes] = await Promise.all([listAllWallets(), listCurrencies(true)])
    wallets.value = walletRes.wallets
    currencies.value = currencyRes.currencies
    if (!currencies.value.find((c) => c.code === selectedCurrency.value)) {
      selectedCurrency.value = currencies.value[0]?.code ?? 'NATIVE'
    }
  } catch (e: unknown) {
    toast.add({ severity: 'error', summary: 'Load failed', detail: String(e), life: 4000 })
  } finally {
    loading.value = false
  }
}

async function createTreasury() {
  creating.value = true
  try {
    await createTreasuryWallet(selectedCurrency.value)
    toast.add({
      severity: 'success',
      summary: 'Treasury wallet created',
      detail: selectedCurrency.value,
      life: 3000,
    })
    await load()
  } catch (e: unknown) {
    toast.add({
      severity: 'error',
      summary: 'Create failed',
      detail: e instanceof Error ? e.message : 'Error',
      life: 4000,
    })
  } finally {
    creating.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="admin-treasury">
    <div class="page-header">
      <h1>Treasury Wallets</h1>
      <button class="btn-secondary" :disabled="loading" @click="load">Refresh</button>
    </div>

    <section class="admin-section">
      <h2 class="section-title">Create treasury wallet</h2>
      <div class="form-row">
        <div class="form-field">
          <label class="field-label" for="currency">Currency</label>
          <select
            id="currency"
            v-model="selectedCurrency"
            class="field-select"
            :disabled="creating"
          >
            <option v-for="c in currencies" :key="c.code" :value="c.code">
              {{ c.code }} · {{ c.name }}
            </option>
          </select>
        </div>
        <button class="btn-primary" :disabled="creating" @click="createTreasury">
          {{ creating ? 'Creating…' : 'Create' }}
        </button>
      </div>
    </section>

    <div v-if="loading" class="loading">Loading…</div>

    <table v-else class="wallets-table">
      <thead>
        <tr>
          <th>Wallet ID</th>
          <th>Currency</th>
          <th>Balance</th>
          <th>Public key</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="w in treasuryWallets" :key="w.wallet_id">
          <td class="mono"><HashChip :hash="w.wallet_id" :length="16" label="wallet id" /></td>
          <td class="mono">{{ w.currency }}</td>
          <td class="mono">
            <AmountDisplay :amount="Number(w.balance)" :precision="8" :unit="w.currency" />
          </td>
          <td class="mono text-muted">
            <HashChip :hash="w.public_key" :length="14" label="public key" />
          </td>
        </tr>
        <tr v-if="treasuryWallets.length === 0">
          <td colspan="4" class="empty">No treasury wallets yet.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.admin-treasury {
  padding: 1.5rem;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.page-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
}
.admin-section {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-soft);
  margin-bottom: 1.5rem;
}
.section-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-heading);
  margin: 0 0 1rem;
}
.form-row {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 200px;
}
.field-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
}
.field-select {
  padding: 0.55rem 0.8rem;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-ground);
  color: var(--text-body);
  font-size: 0.9rem;
}
.btn-primary {
  padding: 0.55rem 1rem;
  background: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-secondary {
  padding: 0.5rem 1.25rem;
  background: var(--surface2, #2a2a3a);
  color: var(--text, #eee);
  border: 1px solid var(--border, #444);
  border-radius: 0.375rem;
  cursor: pointer;
}
.wallets-table {
  width: 100%;
  border-collapse: collapse;
}
.wallets-table th {
  text-align: left;
  padding: 0.5rem 1rem;
  color: var(--text-muted, #888);
  font-size: 0.75rem;
  text-transform: uppercase;
  border-bottom: 1px solid var(--border, #333);
}
.wallets-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border, #222);
  vertical-align: middle;
}
.mono {
  font-family: monospace;
  font-size: 0.85rem;
}
.text-muted {
  color: var(--text-muted, #888);
}
.loading,
.empty {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted, #888);
}
</style>
