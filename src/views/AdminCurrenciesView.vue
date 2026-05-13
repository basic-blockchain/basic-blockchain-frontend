<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createCurrency, listCurrencies, type CurrencyRecord } from '@/api/admin'
import { useToast } from 'primevue/usetoast'

const toast = useToast()

const currencies = ref<CurrencyRecord[]>([])
const loading = ref(false)
const error = ref('')

const form = ref({
  code: 'NATIVE',
  name: 'Native',
  decimals: 8,
  active: true,
})

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
      summary: 'Missing fields',
      detail: 'Code and name are required',
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
    toast.add({ severity: 'success', summary: 'Currency created', detail: code, life: 3000 })
    await load()
  } catch (e: unknown) {
    toast.add({
      severity: 'error',
      summary: 'Create failed',
      detail: e instanceof Error ? e.message : 'Error',
      life: 4000,
    })
  }
}

onMounted(load)
</script>

<template>
  <div class="admin-currencies">
    <div class="page-header">
      <h1>Currency Catalog</h1>
      <button class="btn-secondary" :disabled="loading" @click="load">Refresh</button>
    </div>

    <section class="admin-section">
      <h2 class="section-title">Add currency</h2>
      <form class="currency-form" @submit.prevent="submit">
        <div class="form-row">
          <div class="form-field">
            <label class="field-label" for="code">Code</label>
            <input
              id="code"
              v-model="form.code"
              class="field-input"
              maxlength="10"
              placeholder="USD"
            />
          </div>
          <div class="form-field">
            <label class="field-label" for="name">Name</label>
            <input id="name" v-model="form.name" class="field-input" placeholder="US Dollar" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label class="field-label" for="decimals">Decimals</label>
            <input
              id="decimals"
              v-model.number="form.decimals"
              class="field-input"
              type="number"
              min="0"
              max="18"
            />
          </div>
          <div class="form-field">
            <label class="field-label" for="active">Active</label>
            <select id="active" v-model="form.active" class="field-select">
              <option :value="true">Active</option>
              <option :value="false">Inactive</option>
            </select>
          </div>
        </div>
        <button class="btn-primary" type="submit">Create</button>
      </form>
    </section>

    <div v-if="error" class="error-banner">{{ error }}</div>
    <div v-if="loading" class="loading">Loading…</div>

    <table v-else class="currencies-table">
      <thead>
        <tr>
          <th>Code</th>
          <th>Name</th>
          <th>Decimals</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in currencies" :key="c.code">
          <td class="mono">{{ c.code }}</td>
          <td>{{ c.name }}</td>
          <td>{{ c.decimals }}</td>
          <td>
            <span class="status-badge" :class="c.active ? 'badge-active' : 'badge-inactive'">
              {{ c.active ? 'Active' : 'Inactive' }}
            </span>
          </td>
        </tr>
        <tr v-if="currencies.length === 0 && !loading">
          <td colspan="4" class="empty">No currencies yet.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.admin-currencies {
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
.currency-form {
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
.field-input,
.field-select {
  padding: 0.55rem 0.8rem;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-ground);
  color: var(--text-body);
  font-size: 0.9rem;
  outline: none;
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
.currencies-table {
  width: 100%;
  border-collapse: collapse;
}
.currencies-table th {
  text-align: left;
  padding: 0.5rem 1rem;
  color: var(--text-muted, #888);
  font-size: 0.75rem;
  text-transform: uppercase;
  border-bottom: 1px solid var(--border, #333);
}
.currencies-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border, #222);
}
.mono {
  font-family: monospace;
  font-size: 0.85rem;
}
.status-badge {
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}
.badge-active {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}
.badge-inactive {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
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
