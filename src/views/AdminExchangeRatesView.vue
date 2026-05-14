<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listExchangeRates, setExchangeRate, syncExchangeRates, type ExchangeRateRecord } from '@/api/admin'
import { useToast } from 'primevue/usetoast'

const toast = useToast()
const rates = ref<ExchangeRateRecord[]>([])
const loading = ref(false)
const syncing = ref(false)
const error = ref('')

const form = ref({ fromCurrency: 'NATIVE', toCurrency: 'NATIVE', rate: '', feeRate: '0' })
const syncForm = ref({ provider: 'BINANCE', pairs: '' })

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
    toast.add({ severity: 'warn', summary: 'Par inválido', detail: 'Las monedas deben ser distintas', life: 3000 })
    return
  }
  const rate = Number(form.value.rate)
  if (!Number.isFinite(rate) || rate <= 0) {
    toast.add({ severity: 'warn', summary: 'Tasa inválida', detail: 'La tasa debe ser positiva', life: 3000 })
    return
  }
  const feeRate = Number(form.value.feeRate || 0)
  if (!Number.isFinite(feeRate) || feeRate < 0 || feeRate > 1) {
    toast.add({ severity: 'warn', summary: 'Comisión inválida', detail: 'La comisión debe estar entre 0 y 1', life: 3000 })
    return
  }
  try {
    await setExchangeRate(form.value.fromCurrency, form.value.toCurrency, { rate, fee_rate: feeRate })
    toast.add({ severity: 'success', summary: 'Tasa actualizada', detail: `${form.value.fromCurrency} → ${form.value.toCurrency}`, life: 3000 })
    await load()
  } catch (e: unknown) {
    toast.add({ severity: 'error', summary: 'Error al actualizar', detail: e instanceof Error ? e.message : 'Error', life: 4000 })
  }
}

async function runSync() {
  const pairs = syncForm.value.pairs.split(',').map((p) => p.trim()).filter(Boolean)
  if (pairs.length === 0) {
    toast.add({ severity: 'warn', summary: 'Sin pares', detail: 'Añade uno o más pares como BTC/USDT', life: 3000 })
    return
  }
  syncing.value = true
  try {
    await syncExchangeRates({ provider: syncForm.value.provider, pairs })
    toast.add({ severity: 'success', summary: 'Sincronización completa', detail: `${pairs.length} par(es) actualizado(s)`, life: 3000 })
    await load()
  } catch (e: unknown) {
    toast.add({ severity: 'error', summary: 'Error de sincronización', detail: e instanceof Error ? e.message : 'Error', life: 4000 })
  } finally {
    syncing.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="exchange-view">
    <div class="page-h">
      <div>
        <h1>Tasas de cambio</h1>
        <p>Gestión manual y sincronización automática de tasas</p>
      </div>
      <button class="btn-ghost" :disabled="loading" @click="load">
        <span class="pi pi-refresh" :class="{ 'pi-spin': loading }" aria-hidden="true" />
        Actualizar
      </button>
    </div>

    <!-- Sync panel -->
    <section class="panel">
      <div class="panel-h">Sincronizar tasas desde proveedor externo</div>
      <form class="panel-form" @submit.prevent="runSync">
        <div class="form-row">
          <div class="field">
            <label class="field-label" for="provider">Proveedor</label>
            <select id="provider" v-model="syncForm.provider" class="field-select">
              <option value="BINANCE">Binance</option>
              <option value="CRYPTO_COM">Crypto.com</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label" for="pairs">Pares</label>
            <input id="pairs" v-model="syncForm.pairs" class="field-input" placeholder="BTC/USDT,ETH/USDT" />
          </div>
        </div>
        <div class="form-footer">
          <button class="btn-primary" type="submit" :disabled="syncing">
            <span v-if="syncing" class="pi pi-spin pi-spinner" aria-hidden="true" />
            Sincronizar ahora
          </button>
          <span class="hint">Los pares deben coincidir con las monedas activas del catálogo.</span>
        </div>
      </form>
    </section>

    <!-- Set rate panel -->
    <section class="panel">
      <div class="panel-h">Establecer tasa manualmente</div>
      <form class="panel-form" @submit.prevent="submit">
        <div class="form-row">
          <div class="field">
            <label class="field-label" for="from">Desde</label>
            <input id="from" v-model="form.fromCurrency" class="field-input" placeholder="USD" />
          </div>
          <div class="field">
            <label class="field-label" for="to">Hacia</label>
            <input id="to" v-model="form.toCurrency" class="field-input" placeholder="EUR" />
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label class="field-label" for="rate">Tasa</label>
            <input id="rate" v-model="form.rate" class="field-input" type="number" min="0" step="any" placeholder="1.05" />
          </div>
          <div class="field">
            <label class="field-label" for="fee">Comisión</label>
            <input id="fee" v-model="form.feeRate" class="field-input" type="number" min="0" max="1" step="0.000001" placeholder="0.01" />
          </div>
        </div>
        <div class="form-footer">
          <button class="btn-primary" type="submit">Guardar tasa</button>
          <span class="hint">Las tasas manuales se almacenan con fuente MANUAL.</span>
        </div>
      </form>
    </section>

    <div v-if="error" class="inline-alert danger">{{ error }}</div>

    <!-- Rates table -->
    <div class="panel">
      <div class="panel-h">
        <span>Tasas vigentes</span>
        <span class="count-badge sm">{{ rates.length }}</span>
      </div>
      <div v-if="loading" class="loading-row">
        <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Par</th>
            <th>Tasa</th>
            <th>Comisión</th>
            <th>Fuente</th>
            <th>Actualizado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rates" :key="r.rate_id">
            <td class="mono pair-cell">{{ r.from_currency }}<span class="arrow"> → </span>{{ r.to_currency }}</td>
            <td class="mono">{{ r.rate }}</td>
            <td class="mono">{{ r.fee_rate }}</td>
            <td><span class="source-badge">{{ r.source }}</span></td>
            <td class="mono text-dim">{{ r.updated_at }}</td>
          </tr>
          <tr v-if="rates.length === 0 && !loading">
            <td colspan="5" class="empty-row">Sin tasas de cambio todavía.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.exchange-view { display: flex; flex-direction: column; gap: 18px; }

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

.panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
.panel-h {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; font-size: 12px; font-weight: 600; color: var(--text-2);
  text-transform: uppercase; letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border); background: var(--surface-2);
}
.panel-form { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-footer { display: flex; align-items: center; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 12px; font-weight: 500; color: var(--text-2); }
.field-input, .field-select {
  padding: 7px 10px; border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface-2); color: var(--text); font-size: 13px; outline: none;
  transition: border-color 0.12s; font-family: var(--font-sans); width: 100%; box-sizing: border-box;
}
.field-input:focus, .field-select:focus { border-color: var(--accent); }
.hint { font-size: 12px; color: var(--text-3); }

.btn-primary {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px; background: var(--accent); color: #fff; border: none;
  border-radius: var(--radius); font-size: 13px; font-weight: 600;
  cursor: pointer; transition: opacity 0.12s; font-family: var(--font-sans); white-space: nowrap;
}
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-primary:not(:disabled):hover { opacity: 0.88; }

.inline-alert { padding: 10px 14px; border-radius: var(--radius); border: 1px solid; font-size: 13px; }
.inline-alert.danger { background: var(--danger-soft); border-color: var(--danger); color: var(--danger); }
.loading-row { display: flex; align-items: center; gap: 8px; color: var(--text-2); font-size: 13px; padding: 16px; }

.data-table { width: 100%; border-collapse: collapse; }
.data-table th {
  text-align: left; padding: 8px 14px; font-size: 11.5px; font-weight: 600; color: var(--text-3);
  text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid var(--border); background: var(--surface-2);
}
.data-table td { padding: 10px 14px; border-bottom: 1px solid var(--border); font-size: 13px; }
.data-table tr:last-child td { border-bottom: none; }
.mono { font-family: var(--font-mono); font-size: 12px; }
.text-dim { color: var(--text-3); }
.pair-cell { font-weight: 600; color: var(--text); }
.arrow { color: var(--text-3); }
.source-badge {
  padding: 2px 7px; border-radius: 20px; font-size: 11px;
  font-weight: 600; background: var(--muted-soft); color: var(--muted);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.empty-row { padding: 24px; text-align: center; color: var(--text-3); }
.count-badge.sm { font-size: 11px; padding: 1px 7px; }

@media (max-width: 640px) {
  .page-h   { flex-direction: column; align-items: flex-start; }
  .form-row { grid-template-columns: 1fr; }
}
</style>
