<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import {
  initiateTreasuryDistribution,
  listAllWallets,
  listUsers,
  type AdminUser,
  type TreasuryDistributionRecord,
  type WalletAdminRecord,
} from '@/api/admin'
import { BlockchainApiError } from '@/api/errors'
import BaseModal from '@/components/atoms/BaseModal.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import AssetBadge from '@/components/atoms/AssetBadge.vue'
import SlideToConfirm from '@/components/atoms/SlideToConfirm.vue'

interface Props {
  open: boolean
}
const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  close: []
  complete: [record: TreasuryDistributionRecord]
}>()

const toast = useToast()

const step = ref<0 | 1 | 2>(0)
const submitting = ref(false)
const loading = ref(false)
/** Tracks whether the user has tried to advance past the form at
 *  least once. We hide the form-error block until then so the user
 *  isn't slapped with a red banner before they've filled anything. */
const formTouched = ref(false)

const treasuryWallets = ref<WalletAdminRecord[]>([])
const allUsers = ref<AdminUser[]>([])
/** Map user_id → set of currency codes the user holds a non-frozen,
 *  non-treasury wallet for. Used to filter the recipient autocomplete
 *  to only users who can actually receive the chosen currency — the
 *  backend (treasury_distribution_service.py:398) requires an exact
 *  currency match and tires RecipientNoWallet otherwise. */
const userCurrencies = ref<Map<string, Set<string>>>(new Map())

// Form state
const sourceWalletId = ref<string>('')
const recipientQuery = ref<string>('')
const recipientUserId = ref<string>('')
const amount = ref<string>('')
const note = ref<string>('')

// Result of the API call (step 2 reads from this)
const record = ref<TreasuryDistributionRecord | null>(null)

const selectedSource = computed<WalletAdminRecord | null>(() => {
  return treasuryWallets.value.find((w) => w.wallet_id === sourceWalletId.value) ?? null
})
const selectedRecipient = computed<AdminUser | null>(() => {
  return allUsers.value.find((u) => u.user_id === recipientUserId.value) ?? null
})

const recipientMatches = computed<AdminUser[]>(() => {
  if (recipientUserId.value) return [] // hide dropdown once a pick is made
  const q = recipientQuery.value.trim().toLowerCase()
  if (!q) return []
  const targetCurrency = selectedSource.value?.currency
  return allUsers.value
    .filter((u) => !u.banned && !u.deleted_at)
    .filter((u) => {
      if (!targetCurrency) return true
      const owned = userCurrencies.value.get(u.user_id)
      return owned ? owned.has(targetCurrency) : false
    })
    .filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.display_name && u.display_name.toLowerCase().includes(q))
    )
    .slice(0, 6)
})

const sourceBalance = computed<number>(() => {
  if (!selectedSource.value) return 0
  return Number(selectedSource.value.balance)
})

const amountNumber = computed<number>(() => {
  const n = Number(amount.value)
  return Number.isFinite(n) ? n : 0
})

const formError = computed<string | null>(() => {
  if (!selectedSource.value) return 'Elegí una wallet de tesorería como origen.'
  if (!selectedRecipient.value) return 'Buscá y seleccioná un destinatario.'
  if (selectedRecipient.value.user_id === selectedSource.value.user_id) {
    return 'El destinatario no puede ser el mismo dueño de la wallet origen.'
  }
  if (amountNumber.value <= 0) return 'Ingresá un monto positivo.'
  if (amountNumber.value > sourceBalance.value) {
    return `El monto supera el saldo disponible (${sourceBalance.value} ${selectedSource.value.currency}).`
  }
  return null
})

const formValid = computed(() => formError.value === null)

async function loadCatalog() {
  loading.value = true
  try {
    const [walletsRes, usersRes] = await Promise.all([listAllWallets(), listUsers()])
    treasuryWallets.value = walletsRes.wallets.filter(
      (w) => w.wallet_type === 'TREASURY' && !w.frozen
    )
    allUsers.value = usersRes.users
    // Build the user -> currencies map for the recipient-currency
    // filter. Treasury and frozen wallets are excluded — they wouldn't
    // be usable as recipients server-side anyway.
    const map = new Map<string, Set<string>>()
    for (const w of walletsRes.wallets) {
      if (w.wallet_type === 'TREASURY' || w.frozen) continue
      const set = map.get(w.user_id) ?? new Set<string>()
      set.add(w.currency)
      map.set(w.user_id, set)
    }
    userCurrencies.value = map
  } catch (e: unknown) {
    toast.add({
      severity: 'error',
      summary: 'No se pudo cargar el catálogo',
      detail: String(e),
      life: 4000,
    })
  } finally {
    loading.value = false
  }
}

function selectRecipient(u: AdminUser) {
  recipientUserId.value = u.user_id
  recipientQuery.value = u.username
}

function formatTimestamp(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return iso
  return new Date(t).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function goToConfirm() {
  formTouched.value = true
  if (!formValid.value) return
  step.value = 1
}

function backToForm() {
  step.value = 0
}

async function submit() {
  if (!selectedSource.value || !selectedRecipient.value) return
  submitting.value = true
  try {
    const result = await initiateTreasuryDistribution({
      source_wallet_id: selectedSource.value.wallet_id,
      currency: selectedSource.value.currency,
      amount_per_wallet: String(amountNumber.value),
      recipient_user_ids: [selectedRecipient.value.user_id],
      memo: note.value.trim() || null,
    })
    record.value = result
    step.value = 2
  } catch (e: unknown) {
    if (e instanceof BlockchainApiError && e.code === 'FORBIDDEN') {
      toast.add({
        severity: 'error',
        summary: 'Permiso insuficiente',
        detail: 'Necesitás INITIATE_TREASURY_DISTRIBUTION para crear envíos de tesorería.',
        life: 6000,
      })
    } else {
      toast.add({
        severity: 'error',
        summary: 'No se pudo iniciar el envío',
        detail: String(e),
        life: 5000,
      })
    }
  } finally {
    submitting.value = false
  }
}

function close() {
  if (record.value && step.value === 2) {
    emit('complete', record.value)
  }
  // Reset state so the next open starts clean.
  step.value = 0
  sourceWalletId.value = ''
  recipientQuery.value = ''
  recipientUserId.value = ''
  amount.value = ''
  note.value = ''
  record.value = null
  formTouched.value = false
  emit('update:open', false)
  emit('close')
}

onMounted(() => {
  if (props.open) loadCatalog()
})
// Re-load whenever the modal is (re)opened.
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) loadCatalog()
  }
)

const TITLES: Record<0 | 1 | 2, string> = {
  0: 'Nuevo envío de tesorería',
  1: 'Confirmar envío',
  2: 'Envío iniciado',
}
</script>

<template>
  <BaseModal :open="open" :title="TITLES[step]" :width="520" @close="close">
    <!-- ──────────── Step 0 — form ──────────── -->
    <template v-if="step === 0">
      <div v-if="loading" class="loading-row">
        <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando catálogo…
      </div>
      <div v-else class="form-grid">
        <label class="field">
          <span class="field__label">Wallet origen (tesorería)</span>
          <select v-model="sourceWalletId" class="field__input">
            <option value="" disabled>Elegí una wallet</option>
            <option
              v-for="w in treasuryWallets"
              :key="w.wallet_id"
              :value="w.wallet_id"
            >
              {{ w.username }} · {{ w.currency }} · saldo {{ w.balance }}
            </option>
          </select>
          <span v-if="treasuryWallets.length === 0" class="field__hint">
            No hay wallets de tesorería disponibles. Creá una en Tesorería primero.
          </span>
        </label>

        <label class="field">
          <span class="field__label">Destinatario</span>
          <input
            v-model="recipientQuery"
            class="field__input"
            placeholder="Buscar por usuario…"
            @input="recipientUserId = ''"
          />
          <div v-if="recipientMatches.length > 0" class="autocomplete">
            <button
              v-for="u in recipientMatches"
              :key="u.user_id"
              type="button"
              class="autocomplete__item"
              @click="selectRecipient(u)"
            >
              <span class="mono">@{{ u.username }}</span>
              <span class="muted">· {{ u.display_name }}</span>
            </button>
          </div>
          <span
            v-else-if="recipientQuery.trim() && !recipientUserId && selectedSource"
            class="field__hint field__hint--warn"
          >
            Sin coincidencias con wallet {{ selectedSource.currency }}.
            Sólo aparecen usuarios que ya tienen una wallet en esa moneda.
          </span>
          <span v-if="selectedRecipient" class="field__hint field__hint--ok">
            <span class="pi pi-check-circle" aria-hidden="true" />
            <b>@{{ selectedRecipient.username }}</b>
            · {{ selectedRecipient.display_name }}
          </span>
        </label>

        <label class="field">
          <span class="field__label">
            Monto
            <AssetBadge
              v-if="selectedSource"
              :code="selectedSource.currency"
              size="sm"
            />
          </span>
          <input
            v-model="amount"
            class="field__input"
            type="number"
            min="0"
            step="any"
            inputmode="decimal"
            placeholder="0.00"
          />
          <span v-if="selectedSource" class="field__hint">
            Saldo disponible: {{ sourceBalance }} {{ selectedSource.currency }}
          </span>
        </label>

        <label class="field">
          <span class="field__label">Nota (opcional)</span>
          <textarea
            v-model="note"
            class="field__input"
            rows="2"
            placeholder="Motivo, referencia interna…"
          />
        </label>

        <div v-if="formError && formTouched" class="form-error">{{ formError }}</div>
      </div>
    </template>

    <!-- ──────────── Step 1 — confirm ──────────── -->
    <template v-else-if="step === 1 && selectedSource && selectedRecipient">
      <div class="confirm">
        <div class="confirm__avatar" aria-hidden="true">
          {{ selectedRecipient.display_name.charAt(0).toUpperCase() }}
        </div>
        <div class="confirm__name">{{ selectedRecipient.display_name }}</div>
        <div class="muted small">@{{ selectedRecipient.username }}</div>

        <div class="kv">
          <div class="kv__row">
            <span class="muted">Origen</span>
            <span class="mono">{{ selectedSource.username }} · {{ selectedSource.currency }}</span>
          </div>
          <div class="kv__row">
            <span class="muted">Monto</span>
            <span class="mono">{{ amount }} {{ selectedSource.currency }}</span>
          </div>
          <div class="kv__row">
            <span class="muted">Comisión</span>
            <span>Gratis</span>
          </div>
          <div class="kv__row">
            <span class="muted">Tipo</span>
            <BaseBadge tone="warning">Tesorería</BaseBadge>
          </div>
          <div v-if="note.trim()" class="kv__row">
            <span class="muted">Nota</span>
            <span>{{ note }}</span>
          </div>
        </div>

        <p class="warning-copy">
          Este envío requiere aprobación de un segundo admin con
          <code>APPROVE_TREASURY_DISTRIBUTION</code> antes de ejecutarse en cadena.
        </p>

        <SlideToConfirm
          v-if="!submitting"
          class="confirm__slide"
          @confirm="submit"
        />
        <p class="confirm__hint">o tocá el botón para confirmar</p>
      </div>
    </template>

    <!-- ──────────── Step 2 — receipt ──────────── -->
    <!-- Layout mirrors docs/propuesta_rediseno_blockchain_2/flows.jsx:692-712
         (the SendConfirmFlow success state) but uses the warning palette
         instead of success because the send is not yet final — it sits
         in pending_approval until a second admin signs. -->
    <template v-else-if="step === 2 && record">
      <div class="receipt">
        <div class="receipt__circle" aria-hidden="true">
          <span class="pi pi-clock" />
        </div>
        <div class="receipt__amount mono">
          −{{ record.amount_per_wallet }} {{ record.currency }}
        </div>
        <div class="receipt__sub muted">Iniciado · pendiente de aprobación</div>

        <div class="kv kv--receipt">
          <div class="kv__row">
            <span class="muted">Operación</span>
            <span class="mono">{{ record.op_id }}</span>
          </div>
          <div class="kv__row">
            <span class="muted">Iniciado</span>
            <span class="mono">{{ formatTimestamp(record.initiated_at) }}</span>
          </div>
          <div class="kv__row">
            <span class="muted">Destinatarios</span>
            <span class="mono">{{ record.recipient_count }}</span>
          </div>
          <div class="kv__row">
            <span class="muted">Estado</span>
            <BaseBadge tone="warning">{{ record.status }}</BaseBadge>
          </div>
        </div>

        <p class="receipt__hint">
          La aprobación queda en manos de otro admin con
          <code>APPROVE_TREASURY_DISTRIBUTION</code>. Hasta entonces el envío
          aparece como <b>Pendiente</b> en la lista.
        </p>
      </div>
    </template>

    <template #footer>
      <template v-if="step === 0">
        <BaseButton variant="ghost" @click="close">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="!formValid" @click="goToConfirm">
          Continuar
        </BaseButton>
      </template>
      <template v-else-if="step === 1">
        <BaseButton variant="ghost" :disabled="submitting" @click="backToForm">Volver</BaseButton>
        <BaseButton variant="primary" :loading="submitting" @click="submit">
          Confirmar y enviar
        </BaseButton>
      </template>
      <template v-else>
        <BaseButton variant="primary" @click="close">Listo</BaseButton>
      </template>
    </template>
  </BaseModal>
</template>

<style scoped>
.loading-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
  font-size: 13px;
  padding: 24px 0;
  justify-content: center;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.field__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.field__input {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: var(--radius);
  padding: 8px 10px;
  font-size: 13px;
  font-family: var(--font-sans);
  color: var(--text);
  outline: none;
}
.field__input:focus {
  border-color: var(--accent, var(--text));
}
.field__hint {
  font-size: 11.5px;
  color: var(--text-3);
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.field__hint--ok {
  color: var(--success, rgb(22, 101, 52));
}
.field__hint--warn {
  color: var(--warning, #b45309);
}
.field__hint--ok .pi {
  font-size: 12px;
}

.autocomplete {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  margin-top: 4px;
  max-height: 180px;
  overflow-y: auto;
}
.autocomplete__item {
  text-align: left;
  background: transparent;
  border: 0;
  padding: 7px 10px;
  font-size: 12.5px;
  cursor: pointer;
  display: flex;
  gap: 6px;
  align-items: baseline;
}
.autocomplete__item:hover {
  background: var(--muted-soft);
}

.form-error {
  color: var(--danger, #b91c1c);
  font-size: 12.5px;
  padding: 8px 10px;
  background: rgba(185, 28, 28, 0.08);
  border-radius: var(--radius);
}

.confirm, .receipt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 0;
}
.confirm__avatar, .receipt__circle {
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 600;
  flex-shrink: 0;
}
.confirm__avatar {
  width: 56px;
  height: 56px;
  font-size: 20px;
  background: var(--accent-soft);
  color: var(--accent-text);
  margin-bottom: 4px;
}
.receipt__circle {
  width: 72px;
  height: 72px;
  font-size: 32px;
  background: rgba(217, 119, 6, 0.15);
  color: var(--warning, #d97706);
  margin: 4px 0 14px;
}
.receipt__sub {
  font-size: 13px;
  margin-bottom: 12px;
}
.receipt__hint {
  margin: 14px 0 0;
  font-size: 11.5px;
  color: var(--text-2);
  text-align: center;
  line-height: 1.5;
}
.receipt__hint code {
  font-family: var(--font-mono);
  font-size: 10.5px;
  background: var(--muted-soft);
  padding: 1px 4px;
  border-radius: 3px;
}
.kv--receipt {
  text-align: left;
}
.confirm__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}
.receipt__amount {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text);
  margin-top: 2px;
  margin-bottom: 4px;
}

.kv {
  width: 100%;
  margin-top: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}
.kv__row {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 12px;
  align-items: center;
  padding: 9px 12px;
  border-bottom: 1px solid var(--border);
  font-size: 12.5px;
}
.kv__row:last-child {
  border-bottom: 0;
}
.kv__row span:nth-child(2) {
  justify-self: end;
  text-align: right;
}

.warning-copy {
  margin: 16px 0 0;
  padding: 10px 12px;
  background: rgba(217, 119, 6, 0.08);
  border: 1px solid rgba(217, 119, 6, 0.3);
  border-radius: var(--radius);
  font-size: 12px;
  color: var(--text-2);
  text-align: left;
}

.confirm__slide {
  width: 100%;
  margin-top: 14px;
}
.confirm__hint {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--text-3);
  text-align: center;
}
.warning-copy code {
  font-family: var(--font-mono);
  font-size: 11px;
  background: var(--muted-soft);
  padding: 1px 4px;
  border-radius: 3px;
}

.muted {
  color: var(--text-2);
}
.muted.small {
  font-size: 11.5px;
}
.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
</style>
