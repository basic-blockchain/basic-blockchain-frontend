<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  listAllWallets,
  createTreasuryWallet,
  listCurrencies,
  type WalletAdminRecord,
  type CurrencyRecord,
} from '@/api/admin'
import { mint as mintApi } from '@/api/wallets'
import HashChip from '@/components/atoms/HashChip.vue'
import AmountDisplay from '@/components/atoms/AmountDisplay.vue'
import { useToast } from '@/composables/useToast'
import TreasuryApprovalFlow from '@/components/flows/TreasuryApprovalFlow.vue'
import type { TreasuryData } from '@/components/flows/TreasuryApprovalFlow.vue'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import PaginatedTable from '@/components/organisms/PaginatedTable.vue'

const toast = useToast()
const wallets = ref<WalletAdminRecord[]>([])
const currencies = ref<CurrencyRecord[]>([])
const selectedCurrency = ref('NATIVE')
const loading = ref(false)
const creating = ref(false)

const treasuryWallets = computed(() => wallets.value.filter((w) => w.wallet_type === 'TREASURY'))

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
    await load()
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
    toast.add({
      severity: 'success',
      summary: 'Wallet de tesorería creada',
      detail: selectedCurrency.value,
      life: 3000,
    })
    await load()
  } catch (e: unknown) {
    toast.add({
      severity: 'error',
      summary: 'Error al crear',
      detail: e instanceof Error ? e.message : 'Error',
      life: 4000,
    })
  } finally {
    creating.value = false
  }
}

onMounted(load)

const treasuryFlowData = ref<TreasuryData | null>(null)

const treasurySourceWallet = computed(
  () =>
    treasuryWallets.value.find((w) => w.currency === 'USDT' && w.wallet_type === 'TREASURY') ??
    treasuryWallets.value[0] ??
    null
)

const treasuryRecipients = computed(() => {
  const sourceCurrency = treasurySourceWallet.value?.currency
  if (!sourceCurrency) {
    return []
  }

  return wallets.value.filter((w) => w.wallet_type === 'USER' && w.currency === sourceCurrency)
})

function openDistribution() {
  const source = treasurySourceWallet.value
  const recipients = treasuryRecipients.value

  if (!source) {
    toast.add({
      severity: 'error',
      summary: 'Sin wallet de tesorería',
      detail: 'No hay una wallet de tesorería disponible para distribuir.',
      life: 4000,
    })
    return
  }
  if (!recipients.length) {
    toast.add({
      severity: 'error',
      summary: 'Sin destinatarios',
      detail: 'No hay wallets de usuarios compatibles con esa moneda.',
      life: 4000,
    })
    return
  }

  const totalBalance = Number(source.balance)
  const recipientCount = recipients.length
  const perWallet = Math.max(1, Math.min(5000, Math.floor(totalBalance / recipientCount)))
  const totalAmount = perWallet * recipientCount

  treasuryFlowData.value = {
    source: `${source.currency} Treasury`,
    destination: `${recipientCount} wallets de usuarios activos`,
    amount: totalAmount.toLocaleString('es-ES'),
    perWallet: perWallet.toLocaleString('es-ES'),
    asset: source.currency,
    source_wallet_id: source.wallet_id,
    recipient_user_ids: recipients.map((w) => w.user_id),
    currency: source.currency,
  }
}

interface TreasuryColumn {
  key: string
  label: string
}
const treasuryColumns: TreasuryColumn[] = [
  { key: 'wallet_id', label: 'Wallet ID' },
  { key: 'currency', label: 'Moneda' },
  { key: 'balance', label: 'Balance' },
  { key: 'pub_key', label: 'Clave pública' },
]

function rowKey(w: WalletAdminRecord): string {
  return w.wallet_id
}
</script>

<template>
  <div class="treasury-view">
    <div class="page-h">
      <div>
        <h1>Tesorería</h1>
        <p>Wallets de reserva de la plataforma por moneda</p>
      </div>
      <div class="page-actions">
        <BaseButton
          variant="ghost"
          size="sm"
          @click="openDistribution"
        >
          Distribuir
        </BaseButton>
        <BaseButton
          variant="ghost"
          size="sm"
          :loading="loading"
          @click="load"
        >
          Actualizar
        </BaseButton>
      </div>
    </div>

    <!-- Treasury KPIs -->
    <div class="bigstat-row">
      <BaseCard variant="bigstat">
        <template #header>
          <span>Wallets tesorería</span>
        </template>
        {{ totalTreasury }}
        <template #footer>
          wallets activas
        </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          <span>Monedas</span>
        </template>
        {{ currencies_count }}
        <template #footer>
          tipos distintos
        </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          <span>Balance NATIVE</span>
        </template>
        {{ totalNative }}
        <template #footer>
          NATIVE en reserva
        </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          <span>Estado</span>
        </template>
        {{ loading ? 'Cargando' : 'OK' }}
        <template #footer>
          sincronizado
        </template>
      </BaseCard>
    </div>

    <!-- Create treasury + Mint side-by-side -->
    <div class="content-grid">
      <BaseCard
        variant="default"
        padding="default"
      >
        <template #header>
          <div class="section-h">
            Crear wallet de tesorería
          </div>
        </template>
        <div class="inline-form">
          <div class="field">
            <label
              class="field-label"
              for="currency"
            >Moneda</label>
            <select
              id="currency"
              v-model="selectedCurrency"
              class="field-select"
              :disabled="creating"
            >
              <option
                v-for="c in currencies"
                :key="c.code"
                :value="c.code"
              >
                {{ c.code }} · {{ c.name }}
              </option>
            </select>
          </div>
          <BaseButton
            variant="primary"
            :loading="creating"
            @click="createTreasury"
          >
            Crear
          </BaseButton>
        </div>
      </BaseCard>

      <BaseCard
        variant="default"
        padding="default"
      >
        <template #header>
          <div class="section-h">
            Mintear tokens
          </div>
        </template>
        <form
          class="mint-form"
          @submit.prevent="submitMint"
        >
          <div class="field">
            <label
              class="field-label"
              for="mint-wallet-id"
            >Wallet ID</label>
            <input
              id="mint-wallet-id"
              v-model="mintForm.walletId"
              class="field-input"
              type="text"
              placeholder="ID de la wallet destinataria"
              required
            >
          </div>
          <div class="field">
            <label
              class="field-label"
              for="mint-amount"
            >Cantidad</label>
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
          <BaseButton
            variant="primary"
            type="submit"
            :loading="minting"
          >
            Mintear
          </BaseButton>
        </form>
      </BaseCard>
    </div>

    <!-- Treasury wallets table -->
    <BaseCard
      variant="default"
      padding="none"
    >
      <template #header>
        <div class="panel-h">
          <span>Wallets de tesorería</span>
          <span class="count-badge sm">{{ treasuryWallets.length }}</span>
        </div>
      </template>
      <div
        v-if="loading"
        class="loading-row"
      >
        <span
          class="pi pi-spin pi-spinner"
          aria-hidden="true"
        /> Cargando…
      </div>
      <PaginatedTable
        v-else
        :columns="treasuryColumns"
        :rows="treasuryWallets"
        :row-key="rowKey"
      >
        <template #cell-wallet_id="{ row }">
          <span class="mono">
            <HashChip
              :hash="row.wallet_id"
              :length="16"
              label="wallet id"
            />
          </span>
        </template>
        <template #cell-currency="{ row }">
          <BaseBadge
            variant="outline"
            tone="warning"
          >
            {{ row.currency }}
          </BaseBadge>
        </template>
        <template #cell-balance="{ row }">
          <span class="mono">
            <AmountDisplay
              :amount="Number(row.balance)"
              :precision="8"
              :unit="row.currency"
            />
          </span>
        </template>
        <template #cell-pub_key="{ row }">
          <span class="mono text-dim">
            <HashChip
              :hash="row.public_key"
              :length="14"
              label="public key"
            />
          </span>
        </template>
        <template #empty>
          Sin wallets de tesorería todavía.
        </template>
      </PaginatedTable>
    </BaseCard>
  </div>

  <TreasuryApprovalFlow
    v-if="treasuryFlowData"
    :data="treasuryFlowData"
    @close="treasuryFlowData = null"
    @complete="treasuryFlowData = null"
  />
</template>

<style scoped>
.treasury-view {
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
}

.bigstat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.section-h,
.panel-h {
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.section-h {
  border-bottom: none;
  padding: 0 0 8px;
}

.inline-form {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 200px;
}
.field-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-2);
}
.field-select {
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  font-size: 13px;
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-out);
  font-family: var(--font-sans);
}
.field-select:focus {
  border-color: var(--accent);
}

.field-input {
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  font-size: 13px;
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-out);
  width: 100%;
  box-sizing: border-box;
  font-family: var(--font-sans);
}
.field-input:focus {
  border-color: var(--accent);
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.mint-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
  font-size: 13px;
  padding: 16px;
}

.count-badge.sm {
  font-size: 10.5px;
  padding: 1px 6px;
  line-height: 1.2;
  background: var(--surface-2);
  color: var(--text-3);
  border-radius: var(--radius-pill);
  font-weight: 500;
}

.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
.text-dim {
  color: var(--text-3);
}

@media (max-width: 900px) {
  .bigstat-row {
    grid-template-columns: 1fr 1fr;
  }
  .content-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .page-h {
    flex-direction: column;
    align-items: flex-start;
  }
  .bigstat-row {
    grid-template-columns: 1fr;
  }
}
</style>
