<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createCurrency, listCurrencies, type CurrencyRecord } from '@/api/admin'
import { useToast } from 'primevue/usetoast'

const toast = useToast()
const currencies = ref<CurrencyRecord[]>([])
const loading = ref(false)
const error = ref('')
const form = ref({ code: 'NATIVE', name: 'Native', decimals: 8, active: true })

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
    toast.add({ severity: 'warn', summary: 'Campos requeridos', detail: 'Código y nombre son obligatorios', life: 3000 })
    return
  }
  try {
    await createCurrency({ code, name: form.value.name.trim(), decimals: Number(form.value.decimals) || 0, active: form.value.active })
    toast.add({ severity: 'success', summary: 'Moneda creada', detail: code, life: 3000 })
    await load()
  } catch (e: unknown) {
    toast.add({ severity: 'error', summary: 'Error al crear', detail: e instanceof Error ? e.message : 'Error', life: 4000 })
  }
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
      <button class="btn-ghost" :disabled="loading" @click="load">
        <span class="pi pi-refresh" :class="{ 'pi-spin': loading }" aria-hidden="true" />
        Actualizar
      </button>
    </div>

    <!-- Create currency panel -->
    <section class="panel">
      <div class="panel-h">Añadir moneda</div>
      <form class="panel-form" @submit.prevent="submit">
        <div class="form-row">
          <div class="field">
            <label class="field-label" for="code">Código</label>
            <input id="code" v-model="form.code" class="field-input" maxlength="10" placeholder="USD" />
          </div>
          <div class="field">
            <label class="field-label" for="name">Nombre</label>
            <input id="name" v-model="form.name" class="field-input" placeholder="US Dollar" />
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label class="field-label" for="decimals">Decimales</label>
            <input id="decimals" v-model.number="form.decimals" class="field-input" type="number" min="0" max="18" />
          </div>
          <div class="field">
            <label class="field-label" for="active">Estado</label>
            <select id="active" v-model="form.active" class="field-select">
              <option :value="true">Activa</option>
              <option :value="false">Inactiva</option>
            </select>
          </div>
        </div>
        <button class="btn-primary" type="submit">Crear moneda</button>
      </form>
    </section>

    <div v-if="error" class="inline-alert danger">{{ error }}</div>

    <!-- Currencies table -->
    <div class="panel">
      <div class="panel-h">
        <span>Monedas registradas</span>
        <span class="count-badge sm">{{ currencies.length }}</span>
      </div>
      <div v-if="loading" class="loading-row">
        <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Decimales</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in currencies" :key="c.code">
            <td class="mono code-cell">{{ c.code }}</td>
            <td>{{ c.name }}</td>
            <td class="mono">{{ c.decimals }}</td>
            <td>
              <span class="status-dot" :class="c.active ? 'active' : 'inactive'">
                {{ c.active ? 'Activa' : 'Inactiva' }}
              </span>
            </td>
          </tr>
          <tr v-if="currencies.length === 0 && !loading">
            <td colspan="4" class="empty-row">Sin monedas todavía.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.currencies-view { display: flex; flex-direction: column; gap: 18px; }

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
.field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 12px; font-weight: 500; color: var(--text-2); }
.field-input, .field-select {
  padding: 7px 10px; border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface-2); color: var(--text); font-size: 13px; outline: none;
  transition: border-color 0.12s; font-family: var(--font-sans); width: 100%; box-sizing: border-box;
}
.field-input:focus, .field-select:focus { border-color: var(--accent); }

.btn-primary {
  align-self: flex-start; display: flex; align-items: center; gap: 6px;
  padding: 7px 14px; background: var(--accent); color: #fff; border: none;
  border-radius: var(--radius); font-size: 13px; font-weight: 600;
  cursor: pointer; transition: opacity 0.12s; font-family: var(--font-sans);
}
.btn-primary:hover { opacity: 0.88; }

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
.code-cell { font-weight: 600; color: var(--text); }
.empty-row { padding: 24px; text-align: center; color: var(--text-3); }

.status-dot { font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 20px; }
.status-dot.active   { background: var(--success-soft); color: var(--success); }
.status-dot.inactive { background: var(--muted-soft);   color: var(--muted); }
.count-badge.sm { font-size: 11px; padding: 1px 7px; }

@media (max-width: 640px) {
  .page-h   { flex-direction: column; align-items: flex-start; }
  .form-row { grid-template-columns: 1fr; }
}
</style>
