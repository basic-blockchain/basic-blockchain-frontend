<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  listExchangeRates,
  setExchangeRate,
  syncExchangeRates,
  type ExchangeRateRecord,
} from '@/api/admin'
import { useToast } from 'primevue/usetoast'

const toast = useToast()

const rates = ref<ExchangeRateRecord[]>([])
const loading = ref(false)
const syncing = ref(false)
const error = ref('')

const form = ref({
  fromCurrency: 'NATIVE',
  toCurrency: 'NATIVE',
  rate: '',
  feeRate: '0',
})

const syncForm = ref({
  provider: 'BINANCE',
  pairs: '',
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await listExchangeRates({ limit: 100 })
    rates.value = res.rates
  } catch (e: unknown) {
    error.value = String(e)
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!form.value.fromCurrency || !form.value.toCurrency) return
  if (form.value.fromCurrency === form.value.toCurrency) {
    toast.add({
      severity: 'warn',
      summary: 'Invalid pair',
      detail: 'Currencies must differ',
      life: 3000,
    })
    return
  }
  const rate = Number(form.value.rate)
  if (!Number.isFinite(rate) || rate <= 0) {
    toast.add({
      severity: 'warn',
      summary: 'Invalid rate',
      detail: 'Rate must be positive',
      life: 3000,
    })
    return
  }
  const feeRate = Number(form.value.feeRate || 0)
  if (!Number.isFinite(feeRate) || feeRate < 0 || feeRate > 1) {
    toast.add({
      severity: 'warn',
      summary: 'Invalid fee',
      detail: 'Fee rate must be between 0 and 1',
      life: 3000,
    })
    return
  }

  try {
    await setExchangeRate(form.value.fromCurrency, form.value.toCurrency, {
      rate,
      fee_rate: feeRate,
    })
    toast.add({
      severity: 'success',
      summary: 'Rate updated',
      detail: `${form.value.fromCurrency} → ${form.value.toCurrency}`,
      life: 3000,
    })
    await load()
  } catch (e: unknown) {
    toast.add({
      severity: 'error',
      summary: 'Update failed',
      detail: e instanceof Error ? e.message : 'Error',
      life: 4000,
    })
  }
}

async function runSync() {
  const pairs = syncForm.value.pairs
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
  if (pairs.length === 0) {
    toast.add({
      severity: 'warn',
      summary: 'Missing pairs',
      detail: 'Add one or more pairs like BTC/USDT',
      life: 3000,
    })
    return
  }
  syncing.value = true
  try {
    await syncExchangeRates({
      provider: syncForm.value.provider,
      pairs,
    })
    toast.add({
      severity: 'success',
      summary: 'Sync complete',
      detail: `${pairs.length} pair(s) updated`,
      life: 3000,
    })
    await load()
  } catch (e: unknown) {
    toast.add({
      severity: 'error',
      summary: 'Sync failed',
      detail: e instanceof Error ? e.message : 'Error',
      life: 4000,
    })
  } finally {
    syncing.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="admin-exchange">
    <div class="page-header">
      <h1>Exchange Rates</h1>
      <button class="btn-secondary" :disabled="loading" @click="load">Refresh</button>
    </div>

    <section class="admin-section">
      <h2 class="section-title">Sync exchange rates</h2>
      <form class="rate-form" @submit.prevent="runSync">
        <div class="form-row">
          <div class="form-field">
            <label class="field-label" for="provider">Provider</label>
            <select id="provider" v-model="syncForm.provider" class="field-input">
              <option value="BINANCE">Binance</option>
              <option value="CRYPTO_COM">Crypto.com</option>
            </select>
          </div>
          <div class="form-field">
            <label class="field-label" for="pairs">Pairs</label>
            <input
              id="pairs"
              v-model="syncForm.pairs"
              class="field-input"
              placeholder="BTC/USDT,ETH/USDT"
            />
          </div>
        </div>
        <button class="btn-secondary" type="submit" :disabled="syncing">Sync now</button>
      </form>
      <p class="helper-text">Pairs must match active currencies in the catalog.</p>
    </section>

    <section class="admin-section">
      <h2 class="section-title">Set exchange rate</h2>
      <form class="rate-form" @submit.prevent="submit">
        <div class="form-row">
          <div class="form-field">
            <label class="field-label" for="from">From</label>
            <input id="from" v-model="form.fromCurrency" class="field-input" placeholder="USD" />
          </div>
          <div class="form-field">
            <label class="field-label" for="to">To</label>
            <input id="to" v-model="form.toCurrency" class="field-input" placeholder="EUR" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label class="field-label" for="rate">Rate</label>
            <input
              id="rate"
              v-model="form.rate"
              class="field-input"
              type="number"
              min="0"
              step="any"
              placeholder="1.05"
            />
          </div>
          <div class="form-field">
            <label class="field-label" for="fee">Fee rate</label>
            <input
              id="fee"
              v-model="form.feeRate"
              class="field-input"
              type="number"
              min="0"
              max="1"
              step="0.000001"
              placeholder="0.01"
            />
          </div>
        </div>
        <button class="btn-primary" type="submit">Save rate</button>
      </form>
      <p class="helper-text">
        Manual rates are stored with source MANUAL. Feed sync updates show provider sources.
      </p>
    </section>

    <div v-if="error" class="error-banner">{{ error }}</div>
    <div v-if="loading" class="loading">Loading…</div>

    <table v-else class="rates-table">
      <thead>
        <tr>
          <th>Pair</th>
          <th>Rate</th>
          <th>Fee</th>
          <th>Source</th>
          <th>Updated</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rates" :key="r.rate_id">
          <td class="mono">{{ r.from_currency }} → {{ r.to_currency }}</td>
          <td class="mono">{{ r.rate }}</td>
          <td class="mono">{{ r.fee_rate }}</td>
          <td class="mono">{{ r.source }}</td>
          <td class="mono text-muted">{{ r.updated_at }}</td>
        </tr>
        <tr v-if="rates.length === 0 && !loading">
          <td colspan="5" class="empty">No exchange rates yet.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.admin-exchange {
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
.rate-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}
@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
}
.field-input {
  padding: 0.55rem 0.8rem;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-ground);
  color: var(--text-body);
  font-size: 0.9rem;
}
.btn-primary {
  align-self: flex-start;
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
.rates-table {
  width: 100%;
  border-collapse: collapse;
}
.rates-table th {
  text-align: left;
  padding: 0.5rem 1rem;
  color: var(--text-muted, #888);
  font-size: 0.75rem;
  text-transform: uppercase;
  border-bottom: 1px solid var(--border, #333);
}
.rates-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border, #222);
}
.mono {
  font-family: monospace;
  font-size: 0.85rem;
}
.text-muted {
  color: var(--text-muted, #888);
}
.helper-text {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}
.loading,
.empty {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted, #888);
}
.error-banner {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  border-radius: 0.375rem;
  padding: 0.75rem 1rem;
  color: #ef4444;
  margin-bottom: 1rem;
}
</style>
