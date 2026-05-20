<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  listExchangeRates,
  setExchangeRate,
  syncExchangeRates,
  type ExchangeRateRecord,
} from '@/api/admin'
import { useToast } from 'primevue/usetoast'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import BaseCard from '@/components/atoms/BaseCard.vue'
import PaginatedTable from '@/components/organisms/PaginatedTable.vue'

const toast = useToast()
const rates = ref<ExchangeRateRecord[]>([])
const loading = ref(false)
const syncing = ref(false)
const error = ref('')

const form = ref({ fromCurrency: 'NATIVE', toCurrency: 'NATIVE', rate: '', feeRate: '0' })
const syncForm = ref({ provider: 'BINANCE', pairs: '' })

interface RateColumn {
  key: string
  label: string
}
const rateColumns: RateColumn[] = [
  { key: 'pair', label: 'Par' },
  { key: 'rate', label: 'Tasa' },
  { key: 'fee', label: 'Comisión' },
  { key: 'source', label: 'Fuente' },
  { key: 'updated', label: 'Actualizado' },
]

function sourceTone(source: string): 'accent' | 'success' {
  return source === 'MANUAL' ? 'accent' : 'success'
}

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
      summary: 'Par inválido',
      detail: 'Las monedas deben ser distintas',
      life: 3000,
    })
    return
  }
  const rate = Number(form.value.rate)
  if (!Number.isFinite(rate) || rate <= 0) {
    toast.add({
      severity: 'warn',
      summary: 'Tasa inválida',
      detail: 'La tasa debe ser positiva',
      life: 3000,
    })
    return
  }
  const feeRate = Number(form.value.feeRate || 0)
  if (!Number.isFinite(feeRate) || feeRate < 0 || feeRate > 1) {
    toast.add({
      severity: 'warn',
      summary: 'Comisión inválida',
      detail: 'La comisión debe estar entre 0 y 1',
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
      summary: 'Tasa actualizada',
      detail: `${form.value.fromCurrency} → ${form.value.toCurrency}`,
      life: 3000,
    })
    await load()
  } catch (e: unknown) {
    toast.add({
      severity: 'error',
      summary: 'Error al actualizar',
      detail: e instanceof Error ? e.message : 'Error',
      life: 4000,
    })
  }
}

async function runSync() {
  const pairs = syncForm.value.pairs
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (pairs.length === 0) {
    toast.add({
      severity: 'warn',
      summary: 'Sin pares',
      detail: 'Añade uno o más pares como BTC/USDT',
      life: 3000,
    })
    return
  }
  syncing.value = true
  try {
    await syncExchangeRates({ provider: syncForm.value.provider, pairs })
    toast.add({
      severity: 'success',
      summary: 'Sincronización completa',
      detail: `${pairs.length} par(es) actualizado(s)`,
      life: 3000,
    })
    await load()
  } catch (e: unknown) {
    toast.add({
      severity: 'error',
      summary: 'Error de sincronización',
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
  <div class="exchange-view">
    <div class="page-h">
      <div>
        <h1>Tasas de cambio</h1>
        <p>Gestión manual y sincronización automática de tasas</p>
      </div>
      <div class="page-actions">
        <BaseButton variant="ghost" size="sm" :loading="loading" @click="load">
          Refrescar
        </BaseButton>
      </div>
    </div>

    <div class="bigstat-row">
      <BaseCard variant="bigstat">
        <template #header> Pares activos </template>
        {{ rates.length }}
        <template #footer> tasas vigentes </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header> Fuente BINANCE </template>
        {{ rates.filter((r) => r.source === 'BINANCE').length }}
        <template #footer> automáticas </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header> Fuente MANUAL </template>
        {{ rates.filter((r) => r.source === 'MANUAL').length }}
        <template #footer> configuradas </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header> Última actualización </template>
        {{ rates[0]?.updated_at?.slice(0, 16) ?? '—' }}
        <template #footer> más reciente </template>
      </BaseCard>
    </div>

    <div class="forms-grid">
      <BaseCard variant="default" padding="none" class="form-card">
        <div class="panel-h">Sincronizar desde proveedor</div>
        <form class="panel-form" @submit.prevent="runSync">
          <div class="field">
            <label class="field-label" for="provider">Proveedor</label>
            <select id="provider" v-model="syncForm.provider" class="field-select">
              <option value="BINANCE">Binance</option>
              <option value="CRYPTO_COM">Crypto.com</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label" for="pairs">Pares</label>
            <input
              id="pairs"
              v-model="syncForm.pairs"
              class="field-input"
              placeholder="BTC/USDT,ETH/USDT"
            />
          </div>
          <div class="form-footer">
            <BaseButton variant="primary" size="sm" type="submit" :loading="syncing">
              <i class="pi pi-sync" />
              <span>Sincronizar ahora</span>
            </BaseButton>
            <span class="hint"
              >Los pares deben coincidir con las monedas activas del catálogo.</span
            >
          </div>
        </form>
      </BaseCard>

      <BaseCard variant="default" padding="none" class="form-card">
        <div class="panel-h">Tasa manual</div>
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
            <div class="field">
              <label class="field-label" for="fee">Comisión</label>
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
          <div class="form-footer">
            <BaseButton variant="primary" size="sm" type="submit">
              <i class="pi pi-save" />
              <span>Guardar tasa</span>
            </BaseButton>
            <span class="hint">Las tasas manuales se almacenan con fuente MANUAL.</span>
          </div>
        </form>
      </BaseCard>
    </div>

    <div v-if="error" class="inline-alert danger">
      {{ error }}
    </div>

    <div class="section-h">Tasas vigentes</div>
    <BaseCard variant="default" padding="none" class="table-card">
      <div v-if="loading" class="loading-row">
        <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
      </div>
      <PaginatedTable
        v-else
        :columns="rateColumns"
        :rows="rates"
        :row-key="(r: ExchangeRateRecord) => r.rate_id"
      >
        <template #cell-pair="{ row }">
          <span class="mono pair-cell"
            >{{ row.from_currency }}<span class="arrow"> → </span>{{ row.to_currency }}</span
          >
        </template>
        <template #cell-rate="{ row }">
          <span class="mono">{{ row.rate }}</span>
        </template>
        <template #cell-fee="{ row }">
          <span class="mono">{{ row.fee_rate }}</span>
        </template>
        <template #cell-source="{ row }">
          <BaseBadge :tone="sourceTone(row.source)">
            {{ row.source }}
          </BaseBadge>
        </template>
        <template #cell-updated="{ row }">
          <span class="mono text-dim">{{ row.updated_at }}</span>
        </template>
        <template #empty> Sin tasas de cambio todavía. </template>
      </PaginatedTable>
    </BaseCard>
  </div>
</template>

<style scoped>
.exchange-view {
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
.page-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.bigstat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.forms-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}
.form-card {
  overflow: hidden;
}
.table-card {
  overflow: hidden;
}

.section-h {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
}

.panel-h {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.panel-form {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.form-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-2);
}
.field-input,
.field-select {
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  font-size: 13px;
  outline: none;
  transition: border-color 0.12s;
  font-family: var(--font-sans);
  width: 100%;
  box-sizing: border-box;
}
.field-input:focus,
.field-select:focus {
  border-color: var(--accent);
}
.hint {
  font-size: 12px;
  color: var(--text-3);
}

.inline-alert {
  padding: 10px 14px;
  border-radius: var(--radius);
  border: 1px solid;
  font-size: 13px;
}
.inline-alert.danger {
  background: var(--danger-soft);
  border-color: var(--danger);
  color: var(--danger);
}
.loading-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
  font-size: 13px;
  padding: 16px;
}

.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
.text-dim {
  color: var(--text-3);
}
.pair-cell {
  font-weight: 600;
  color: var(--text);
}
.arrow {
  color: var(--text-3);
}
.empty-row {
  padding: 24px;
  text-align: center;
  color: var(--text-3);
}

@media (max-width: 900px) {
  .forms-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .page-h {
    flex-direction: column;
    align-items: flex-start;
  }
  .form-row {
    grid-template-columns: 1fr;
  }
  .bigstat-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
