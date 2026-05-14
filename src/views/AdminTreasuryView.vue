<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { listAllWallets, createTreasuryWallet, listCurrencies, type WalletAdminRecord, type CurrencyRecord } from '@/api/admin'
import HashChip from '@/components/atoms/HashChip.vue'
import AmountDisplay from '@/components/atoms/AmountDisplay.vue'
import { useToast } from 'primevue/usetoast'
import TreasuryApprovalFlow from '@/components/flows/TreasuryApprovalFlow.vue'
import type { TreasuryData } from '@/components/flows/TreasuryApprovalFlow.vue'

const toast = useToast()
const wallets = ref<WalletAdminRecord[]>([])
const currencies = ref<CurrencyRecord[]>([])
const selectedCurrency = ref('NATIVE')
const loading = ref(false)
const creating = ref(false)

const treasuryWallets = computed(() => wallets.value.filter((w) => w.wallet_type === 'TREASURY'))

const totalTreasury = computed(() => treasuryWallets.value.length)
const currencies_count = computed(() => new Set(treasuryWallets.value.map((w) => w.currency)).size)
const totalNative = computed(() => {
  const n = treasuryWallets.value.find((w) => w.currency === 'NATIVE')
  return n ? Number(n.balance).toFixed(2) : '—'
})

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
    toast.add({ severity: 'error', summary: 'Error al cargar', detail: String(e), life: 4000 })
  } finally {
    loading.value = false
  }
}

async function createTreasury() {
  creating.value = true
  try {
    await createTreasuryWallet(selectedCurrency.value)
    toast.add({ severity: 'success', summary: 'Wallet de tesorería creada', detail: selectedCurrency.value, life: 3000 })
    await load()
  } catch (e: unknown) {
    toast.add({ severity: 'error', summary: 'Error al crear', detail: e instanceof Error ? e.message : 'Error', life: 4000 })
  } finally {
    creating.value = false
  }
}

onMounted(load)

const treasuryFlowData = ref<TreasuryData | null>(null)

function openDistribution() {
  treasuryFlowData.value = {
    source: 'USDT Treasury',
    destination: '41 wallets de usuarios activos',
    amount: '205,000',
    perWallet: '5,000',
    asset: 'USDT',
  }
}
</script>

<template>
  <div class="treasury-view">
    <div class="page-h">
      <div>
        <h1>Tesorería</h1>
        <p>Wallets de reserva de la plataforma por moneda</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost" @click="openDistribution">
          <span class="pi pi-send" aria-hidden="true" />
          Distribuir
        </button>
        <button class="btn btn-ghost" :disabled="loading" @click="load">
          <span class="pi pi-refresh" :class="{ 'pi-spin': loading }" aria-hidden="true" />
          Actualizar
        </button>
      </div>
    </div>

    <!-- Treasury KPIs (bigstat) -->
    <div class="bigstat-row">
      <div class="bigstat">
        <div class="lb">Wallets tesorería</div>
        <div class="vl">{{ totalTreasury }}</div>
        <div class="ds">wallets activas</div>
      </div>
      <div class="bigstat">
        <div class="lb">Monedas</div>
        <div class="vl">{{ currencies_count }}</div>
        <div class="ds">tipos distintos</div>
      </div>
      <div class="bigstat">
        <div class="lb">Balance NATIVE</div>
        <div class="vl">{{ totalNative }}</div>
        <div class="ds">NATIVE en reserva</div>
      </div>
      <div class="bigstat">
        <div class="lb">Estado</div>
        <div class="vl">{{ loading ? 'Cargando' : 'OK' }}</div>
        <div class="ds">sincronizado</div>
      </div>
    </div>

    <!-- Create treasury panel -->
    <section class="panel">
      <div class="panel-h">Crear wallet de tesorería</div>
      <div class="panel-form inline-form">
        <div class="field">
          <label class="field-label" for="currency">Moneda</label>
          <select id="currency" v-model="selectedCurrency" class="field-select" :disabled="creating">
            <option v-for="c in currencies" :key="c.code" :value="c.code">{{ c.code }} · {{ c.name }}</option>
          </select>
        </div>
        <button class="btn btn-primary" :disabled="creating" @click="createTreasury">
          <span v-if="creating" class="pi pi-spin pi-spinner" aria-hidden="true" />
          {{ creating ? 'Creando…' : 'Crear' }}
        </button>
      </div>
    </section>

    <!-- Treasury wallets table -->
    <div class="panel">
      <div class="panel-h">
        <span>Wallets de tesorería</span>
        <span class="count-badge sm">{{ treasuryWallets.length }}</span>
      </div>
      <div v-if="loading" class="loading-row">
        <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
      </div>
      <table v-else class="tbl">
        <thead>
          <tr>
            <th>Wallet ID</th>
            <th>Moneda</th>
            <th>Balance</th>
            <th>Clave pública</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in treasuryWallets" :key="w.wallet_id">
            <td class="mono"><HashChip :hash="w.wallet_id" :length="16" label="wallet id" /></td>
            <td>
              <span class="currency-badge">{{ w.currency }}</span>
            </td>
            <td class="mono"><AmountDisplay :amount="Number(w.balance)" :precision="8" :unit="w.currency" /></td>
            <td class="mono text-dim"><HashChip :hash="w.public_key" :length="14" label="public key" /></td>
          </tr>
          <tr v-if="treasuryWallets.length === 0 && !loading">
            <td colspan="4" class="empty-row">Sin wallets de tesorería todavía.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <TreasuryApprovalFlow
    v-if="treasuryFlowData"
    :data="treasuryFlowData"
    @close="treasuryFlowData = null"
    @complete="treasuryFlowData = null"
  />
</template>

<style scoped>
.treasury-view { display: flex; flex-direction: column; gap: 18px; }

.page-h { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
.page-h h1 { font-size: 22px; font-weight: 600; letter-spacing: -0.015em; margin: 0 0 2px; color: var(--text); }
.page-h p  { margin: 0; font-size: 13px; color: var(--text-2); }

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

.field { display: flex; flex-direction: column; gap: 4px; min-width: 200px; }
.field-label { font-size: 12px; font-weight: 500; color: var(--text-2); }
.field-select {
  padding: 7px 10px; border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface-2); color: var(--text); font-size: 13px; outline: none;
  transition: border-color 0.12s; font-family: var(--font-sans);
}
.field-select:focus { border-color: var(--accent); }

.tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.tbl th, .tbl td { text-align: left; padding: 8px 14px; border-bottom: 1px solid var(--border); }
.tbl th { font-size: 11.5px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.04em; background: var(--surface-2); }
.tbl tr:last-child td { border-bottom: none; }
.empty-row { text-align: center; color: var(--text-3); padding: 24px; }
.loading-row { display: flex; align-items: center; gap: 8px; color: var(--text-2); font-size: 13px; padding: 16px; }
.panel-form { padding: 16px; }
.inline-form { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }

.mono { font-family: var(--font-mono); font-size: 12px; }
.text-dim { color: var(--text-3); }

.currency-badge {
  padding: 2px 8px; border-radius: 20px; font-size: 12px;
  font-weight: 600; background: var(--warning-soft); color: var(--warning);
  font-family: var(--font-mono);
}

@media (max-width: 900px) {
  .bigstat-row { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 640px) {
  .page-h { flex-direction: column; align-items: flex-start; }
  .bigstat-row { grid-template-columns: 1fr; }
}
</style>
