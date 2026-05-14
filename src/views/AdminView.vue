<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { mint as mintApi } from '@/api/wallets'
import { useStatsStore } from '@/stores/stats'
import { useMetricsStore } from '@/stores/metrics'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const toast = useToast()
const statsStore = useStatsStore()
const metricsStore = useMetricsStore()

const mintForm = ref({ walletId: '', amount: '' })
const minting = ref(false)

const kpis = computed(() => [
  {
    label: 'Usuarios totales',
    value: statsStore.stats?.users.total ?? '—',
    sub: `${statsStore.stats?.users.active ?? '—'} activos`,
    variant: 'default',
  },
  {
    label: 'Usuarios activos',
    value: statsStore.stats?.users.active ?? '—',
    sub: `${statsStore.stats?.users.banned ?? 0} baneados`,
    variant: 'default',
  },
  {
    label: 'Wallets',
    value: statsStore.stats?.wallets.total ?? '—',
    sub: `${statsStore.stats?.wallets.user_wallets ?? '—'} de usuario`,
    variant: 'default',
  },
  {
    label: 'Wallets congeladas',
    value: statsStore.stats?.wallets.frozen ?? '—',
    sub: `de ${statsStore.stats?.wallets.total ?? '—'} total`,
    variant: (statsStore.stats?.wallets.frozen ?? 0) > 0 ? 'warn' : 'default',
  },
])

const chainKpis = computed(() => [
  {
    label: 'Altura de cadena',
    value: metricsStore.metrics?.chainHeight ?? '—',
    sub: 'bloques confirmados',
  },
  {
    label: 'Txs pendientes',
    value: metricsStore.metrics?.pendingTransactions ?? '—',
    sub: 'en mempool',
  },
])

async function submitMint() {
  const amount = Number(mintForm.value.amount)
  if (!mintForm.value.walletId || !amount || amount <= 0) return
  minting.value = true
  try {
    await mintApi({ wallet_id: mintForm.value.walletId, amount })
    toast.add({
      severity: 'success',
      summary: 'Mint enviado',
      detail: 'Transacción en mempool — mina un bloque para confirmar',
      life: 5000,
    })
    mintForm.value = { walletId: '', amount: '' }
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error al mintear',
      detail: e instanceof Error ? e.message : 'Error',
      life: 4000,
    })
  } finally {
    minting.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    statsStore.fetchStats(),
    metricsStore.fetchAll(),
  ])
})
</script>

<template>
  <div class="admin-view">
    <!-- Page header -->
    <div class="page-h">
      <div>
        <h1>Resumen</h1>
        <p>Panel de administración de la plataforma</p>
      </div>
      <div class="page-actions">
        <button class="btn-ghost" type="button" @click="router.push('/admin/users')">
          Ver usuarios
        </button>
        <button class="btn-ghost" type="button" @click="router.push('/admin/audit')">
          Ver auditoría
        </button>
      </div>
    </div>

    <!-- Platform KPIs -->
    <div class="kpi-grid">
      <div
        v-for="kpi in kpis"
        :key="kpi.label"
        class="kpi-card"
        :class="kpi.variant === 'warn' ? 'kpi-warn' : ''"
      >
        <div class="kpi-lbl">{{ kpi.label }}</div>
        <div class="kpi-val">{{ kpi.value }}</div>
        <div class="kpi-sub">{{ kpi.sub }}</div>
      </div>
    </div>

    <!-- Content grid -->
    <div class="content-grid">
      <!-- Chain summary -->
      <section class="panel">
        <div class="panel-h">Blockchain</div>
        <div class="chain-kpis">
          <div v-for="ck in chainKpis" :key="ck.label" class="chain-kpi">
            <div class="ck-val">{{ ck.value }}</div>
            <div class="ck-lbl">{{ ck.label }}</div>
            <div class="ck-sub">{{ ck.sub }}</div>
          </div>
        </div>
      </section>

      <!-- Mint tokens -->
      <section class="panel">
        <div class="panel-h">Mintear tokens</div>
        <form class="mint-form" @submit.prevent="submitMint">
          <div class="field">
            <label class="field-label" for="wallet-id">Wallet ID</label>
            <input
              id="wallet-id"
              v-model="mintForm.walletId"
              class="field-input"
              type="text"
              placeholder="ID de la wallet destinataria"
              required
            >
          </div>
          <div class="field">
            <label class="field-label" for="mint-amount">Cantidad</label>
            <input
              id="mint-amount"
              v-model="mintForm.amount"
              class="field-input"
              type="number"
              min="0.00000001"
              step="any"
              placeholder="100"
              required
            >
          </div>
          <button class="btn-primary" type="submit" :disabled="minting">
            <span v-if="minting" class="pi pi-spin pi-spinner" aria-hidden="true" />
            <span v-else class="pi pi-plus" aria-hidden="true" />
            {{ minting ? 'Enviando…' : 'Mintear' }}
          </button>
        </form>
      </section>
    </div>

    <!-- Balances by currency -->
    <section
      v-if="statsStore.stats?.balances && Object.keys(statsStore.stats.balances).length"
      class="panel"
    >
      <div class="panel-h">Balances en circulación</div>
      <div class="balances-grid">
        <div
          v-for="(amount, currency) in statsStore.stats.balances"
          :key="currency"
          class="balance-card"
        >
          <div class="bc-currency">{{ currency }}</div>
          <div class="bc-amount">{{ amount }}</div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Header */
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
}
.btn-ghost {
  padding: 7px 13px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.btn-ghost:hover {
  background: var(--hover);
  color: var(--text);
}

/* KPI grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.kpi-card {
  background: var(--surface);
  padding: 14px 16px 16px;
}
.kpi-card.kpi-warn .kpi-val { color: var(--warning); }
.kpi-lbl {
  font-size: 11.5px;
  color: var(--text-2);
  font-weight: 500;
}
.kpi-val {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}
.kpi-sub {
  font-size: 11.5px;
  color: var(--text-3);
  margin-top: 4px;
}

/* Content grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* Panels */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.panel-h {
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}

/* Chain KPIs inside panel */
.chain-kpis {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--border);
}
.chain-kpi {
  background: var(--surface);
  padding: 16px;
}
.ck-val {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}
.ck-lbl {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-2);
  margin-top: 4px;
}
.ck-sub {
  font-size: 11.5px;
  color: var(--text-3);
  margin-top: 2px;
}

/* Mint form */
.mint-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
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
.field-input {
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  font-size: 13px;
  outline: none;
  transition: border-color 0.12s;
  width: 100%;
  box-sizing: border-box;
  font-family: var(--font-sans);
}
.field-input:focus { border-color: var(--accent); }
.btn-primary {
  align-self: flex-start;
  padding: 7px 14px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: opacity 0.12s;
  font-family: var(--font-sans);
}
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-primary:not(:disabled):hover { opacity: 0.88; }

/* Balances */
.balances-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  background: var(--border);
}
.balance-card {
  background: var(--surface);
  padding: 14px 20px;
  min-width: 140px;
}
.bc-currency {
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-2);
}
.bc-amount {
  font-size: 20px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.015em;
  color: var(--text);
  margin-top: 2px;
}

/* Responsive */
@media (max-width: 900px) {
  .kpi-grid     { grid-template-columns: 1fr 1fr; }
  .content-grid { grid-template-columns: 1fr; }
  .page-h       { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 560px) {
  .kpi-grid { grid-template-columns: 1fr; }
}
</style>
