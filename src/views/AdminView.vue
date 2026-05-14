<script setup lang="ts">
import { ref, onMounted } from 'vue'
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
        <button class="btn btn-ghost" type="button" @click="router.push('/admin/users')">
          Ver usuarios
        </button>
        <button class="btn btn-ghost" type="button" @click="router.push('/admin/audit')">
          Ver auditoría
        </button>
      </div>
    </div>

    <!-- Platform KPIs (bigstat) -->
    <div class="bigstat-row">
      <div class="bigstat">
        <div class="lb">Usuarios</div>
        <div class="vl">{{ statsStore.stats?.users.total ?? '—' }}</div>
        <div class="ds">{{ statsStore.stats?.users.active ?? '—' }} activos</div>
      </div>
      <div class="bigstat">
        <div class="lb">Activos</div>
        <div class="vl">{{ statsStore.stats?.users.active ?? '—' }}</div>
        <div class="ds">{{ statsStore.stats?.users.banned ?? 0 }} baneados</div>
      </div>
      <div class="bigstat">
        <div class="lb">Wallets</div>
        <div class="vl">{{ statsStore.stats?.wallets.total ?? '—' }}</div>
        <div class="ds">{{ statsStore.stats?.wallets.user_wallets ?? '—' }} de usuario</div>
      </div>
      <div class="bigstat">
        <div class="lb">Congeladas</div>
        <div
          class="vl"
          :class="{ 'vl-danger': (statsStore.stats?.wallets.frozen ?? 0) > 0 }"
        >
          {{ statsStore.stats?.wallets.frozen ?? '—' }}
        </div>
        <div class="ds">de {{ statsStore.stats?.wallets.total ?? '—' }} total</div>
      </div>
    </div>

    <!-- Content grid -->
    <div class="content-grid">
      <!-- Chain summary -->
      <section class="panel">
        <div class="panel-h">Blockchain</div>
        <div class="chain-kpis">
          <div class="chain-kpi">
            <div class="ck-val">{{ metricsStore.metrics?.chainHeight ?? '—' }}</div>
            <div class="ck-lbl">Altura de cadena</div>
            <div class="ck-sub">bloques confirmados</div>
          </div>
          <div class="chain-kpi">
            <div class="ck-val">{{ metricsStore.metrics?.pendingTransactions ?? '—' }}</div>
            <div class="ck-lbl">Txs pendientes</div>
            <div class="ck-sub">en mempool</div>
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
          <button class="btn btn-primary" type="submit" :disabled="minting">
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

/* Bigstat row (Phase 5 design system) */
.bigstat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.bigstat {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
}
.lb { font-size: 11.5px; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.04em; }
.vl { font-size: 26px; font-weight: 600; letter-spacing: -0.02em; margin: 4px 0; color: var(--text); font-variant-numeric: tabular-nums; }
.ds { font-size: 11.5px; color: var(--text-3); }
.vl-danger { color: var(--danger) !important; }

/* Content grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
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
  .bigstat-row  { grid-template-columns: 1fr 1fr; }
  .content-grid { grid-template-columns: 1fr; }
  .page-h       { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 560px) {
  .bigstat-row { grid-template-columns: 1fr; }
}
</style>
