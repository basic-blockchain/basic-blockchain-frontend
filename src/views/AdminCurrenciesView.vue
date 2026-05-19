<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createCurrency, listCurrencies, type CurrencyRecord } from '@/api/admin'
import { useToast } from 'primevue/usetoast'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseTable from '@/components/atoms/BaseTable.vue'

const toast = useToast()
const currencies = ref<CurrencyRecord[]>([])
const loading = ref(false)
const error = ref('')
const form = ref({ code: 'NATIVE', name: 'Native', decimals: 8, active: true })
const formAnchor = ref<HTMLElement | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await listCurrencies(false)
    currencies.value = res.currencies
  } catch (e: unknown) {
    error.value = String(e)
  } finally {
    loading.value = false
  }
}

async function submit() {
  const code = form.value.code.trim().toUpperCase()
  if (!code || !form.value.name.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'Campos requeridos',
      detail: 'Código y nombre son obligatorios',
      life: 3000,
    })
    return
  }
  try {
    await createCurrency({
      code,
      name: form.value.name.trim(),
      decimals: Number(form.value.decimals) || 0,
      active: form.value.active,
    })
    toast.add({ severity: 'success', summary: 'Moneda creada', detail: code, life: 3000 })
    await load()
  } catch (e: unknown) {
    toast.add({
      severity: 'error',
      summary: 'Error al crear',
      detail: e instanceof Error ? e.message : 'Error',
      life: 4000,
    })
  }
}

interface CurrencyColumn {
  key: string
  label: string
}
const currencyColumns: CurrencyColumn[] = [
  { key: 'asset', label: 'Activo' },
  { key: 'code', label: 'Código' },
  { key: 'name', label: 'Nombre' },
  { key: 'decimals', label: 'Decimales' },
  { key: 'type', label: 'Tipo' },
  { key: 'status', label: 'Estado' },
]

type CurrencyTone = 'success' | 'warning' | 'accent'
function currencyType(code: string): { label: string; tone: CurrencyTone } {
  if (['USDT', 'USDC', 'DAI'].includes(code)) return { label: 'stablecoin', tone: 'success' }
  if (code === 'NATIVE' || code === 'cUSD') return { label: 'platform', tone: 'warning' }
  return { label: 'native', tone: 'accent' }
}

function statusTone(active: boolean): 'success' | 'neutral' {
  return active ? 'success' : 'neutral'
}

function scrollToForm() {
  formAnchor.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(load)
</script>

<template>
  <div class="currencies-view">
    <div class="page-h">
      <div>
        <h1>Catálogo de monedas</h1>
        <p>Gestión de monedas soportadas por la plataforma</p>
      </div>
      <div class="page-actions">
        <BaseButton
          variant="ghost"
          size="sm"
          :loading="loading"
          @click="load"
        >
          Actualizar
        </BaseButton>
        <BaseButton
          variant="primary"
          size="sm"
          @click="scrollToForm"
        >
          <i class="pi pi-plus" />
          <span>Agregar moneda</span>
        </BaseButton>
      </div>
    </div>

    <div class="bigstat-row">
      <BaseCard variant="bigstat">
        <template #header>
          Total
        </template>
        {{ currencies.length }}
        <template #footer>
          registradas
        </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          Activas
        </template>
        {{ currencies.filter((c) => c.active).length }}
        <template #footer>
          habilitadas
        </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          Inactivas
        </template>
        {{ currencies.filter((c) => !c.active).length }}
        <template #footer>
          deshabilitadas
        </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          Tipos
        </template>
        3
        <template #footer>
          native / stable / platform
        </template>
      </BaseCard>
    </div>

    <div
      v-if="error"
      class="inline-alert danger"
    >
      {{ error }}
    </div>

    <div class="catalog-grid">
      <BaseCard
        variant="default"
        padding="none"
        class="catalog-card"
      >
        <div class="panel-h">
          <span>Monedas registradas</span>
          <span class="count-badge sm">{{ currencies.length }}</span>
        </div>
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
          :columns="currencyColumns"
          :rows="currencies"
          :row-key="(c: CurrencyRecord) => c.code"
        >
          <template #cell-asset="{ row }">
            <span class="asset-pill">{{ row.code }}</span>
          </template>
          <template #cell-code="{ row }">
            <span class="mono code-cell">{{ row.code }}</span>
          </template>
          <template #cell-decimals="{ row }">
            <span class="mono">{{ row.decimals }}</span>
          </template>
          <template #cell-type="{ row }">
            <BaseBadge :tone="currencyType(row.code).tone">
              {{ currencyType(row.code).label }}
            </BaseBadge>
          </template>
          <template #cell-status="{ row }">
            <BaseBadge :tone="statusTone(row.active)">
              {{ row.active ? 'Activa' : 'Inactiva' }}
            </BaseBadge>
          </template>
          <template #empty>
            Sin monedas todavía.
          </template>
        </BaseTable>
      </BaseCard>

      <div ref="formAnchor">
        <BaseCard
          variant="default"
          padding="none"
          class="form-panel"
        >
          <div class="panel-h">
            Añadir moneda
          </div>
          <form
            class="panel-form"
            @submit.prevent="submit"
          >
            <div class="field">
              <label
                class="field-label"
                for="code"
              >Código</label>
              <input
                id="code"
                v-model="form.code"
                class="field-input"
                maxlength="10"
                placeholder="USD"
              >
            </div>
            <div class="field">
              <label
                class="field-label"
                for="name"
              >Nombre</label>
              <input
                id="name"
                v-model="form.name"
                class="field-input"
                placeholder="US Dollar"
              >
            </div>
            <div class="field">
              <label
                class="field-label"
                for="decimals"
              >Decimales</label>
              <input
                id="decimals"
                v-model.number="form.decimals"
                class="field-input"
                type="number"
                min="0"
                max="18"
              >
            </div>
            <div class="field">
              <label
                class="field-label"
                for="active"
              >Estado</label>
              <select
                id="active"
                v-model="form.active"
                class="field-select"
              >
                <option :value="true">
                  Activa
                </option>
                <option :value="false">
                  Inactiva
                </option>
              </select>
            </div>
            <BaseButton
              variant="primary"
              size="sm"
              type="submit"
            >
              <i class="pi pi-check" />
              <span>Crear moneda</span>
            </BaseButton>
          </form>
        </BaseCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.currencies-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
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

.catalog-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 14px;
  align-items: start;
}
.catalog-card {
  overflow: hidden;
}

.asset-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  padding: 2px 7px;
  border-radius: 5px;
  background: var(--accent-soft);
  color: var(--accent-text);
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-mono);
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
.form-panel {
  overflow: hidden;
}
.panel-form {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
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
.code-cell {
  font-weight: 600;
  color: var(--text);
}
.empty-row {
  padding: 24px;
  text-align: center;
  color: var(--text-3);
}

.count-badge.sm {
  font-size: 11px;
  padding: 1px 7px;
}

@media (max-width: 900px) {
  .catalog-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .page-h {
    flex-direction: column;
    align-items: flex-start;
  }
  .bigstat-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
