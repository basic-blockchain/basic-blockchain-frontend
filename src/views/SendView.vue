<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { useConfirmedTransactionsStore } from '@/stores/confirmedTransactions'
import { useExchangeRatesStore } from '@/stores/exchangeRates'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { useRecipientResolve } from '@/composables/useRecipientResolve'
import {
  createPaymentRequest,
  cancelPaymentRequest,
  paymentRequestUrl,
  type PaymentRequest,
} from '@/api/paymentRequests'
import { isValidMnemonic } from '@/lib/crypto'
import { BlockchainApiError } from '@/api/errors'
import type { Wallet } from '@/api/wallets'
import ReceiveFlow from '@/components/flows/ReceiveFlow.vue'
import type { ReceiveData } from '@/components/flows/ReceiveFlow.vue'
import QRCodeCanvas from '@/components/atoms/QRCodeCanvas.vue'
import { useBlockchainWebSocket } from '@/api/websocket'

const route = useRoute()
const walletStore = useWalletStore()
const confirmedStore = useConfirmedTransactionsStore()
const ratesStore = useExchangeRatesStore()
const auth = useAuthStore()
const toast = useToast()

// ── Tabs ─────────────────────────────────────────────────────────────────────

const activeTab = ref<'send' | 'receive' | 'request' | 'schedule'>('send')

// ── Recipient ─────────────────────────────────────────────────────────────────

const RECIPIENT_TYPES = [
  { key: 'user',    label: 'Usuario Cadena', icon: 'pi-user',          placeholder: '@usuario' },
  { key: 'email',   label: 'Email',          icon: 'pi-envelope',       placeholder: 'destinatario@dominio' },
  { key: 'wallet',  label: 'ID de wallet',   icon: 'pi-wallet',         placeholder: 'w_abc123…' },
  { key: 'onchain', label: 'Dirección on-chain', icon: 'pi-link',      placeholder: '0x… / bc1q…' },
] as const
type RecipientType = typeof RECIPIENT_TYPES[number]['key']

const recipientType = ref<RecipientType>('wallet')
const recipientValue = ref('')

// ── Wallet selector ───────────────────────────────────────────────────────────

const fromWalletId = ref('')
const selectedWallet = computed<Wallet | null>(
  () => walletStore.wallets.find((w) => w.wallet_id === fromWalletId.value) ?? null
)

// ── Live recipient resolution (must come after selectedWallet) ────────────────

const senderCurrency = computed(() => selectedWallet.value?.currency ?? '')
const { state: resolveState, resolvedWalletId, resolvedDisplayName } = useRecipientResolve(
  recipientType,
  recipientValue,
  senderCurrency,
)

function recipientHelp(): string {
  switch (recipientType.value) {
    case 'user':    return 'Ingresá el @usuario de la plataforma Cadena.'
    case 'email':   return 'Ingresá el email registrado del destinatario.'
    case 'wallet':  return 'Ingresá el ID completo de la wallet (w_…).'
    case 'onchain': return 'Dirección de billetera externa en la red seleccionada.'
  }
}

const resolveBadge = computed(() => {
  const s = resolveState.value
  if (!recipientValue.value.trim()) return null
  if (s.status === 'idle') return null
  if (s.status === 'resolving') return { type: 'loading' as const, text: 'Buscando…', sub: null }
  if (s.status === 'resolved') {
    const name = resolvedDisplayName()
    const r = s.result
    if (r.match_type === 'exchange') {
      return {
        type: 'warning' as const,
        text: name || r.wallet_id,
        sub: `Conversión ${r.rate_from} → ${r.rate_to} (tasa: ${Number(r.rate).toFixed(6)})`,
      }
    }
    return { type: 'success' as const, text: name || r.wallet_id, sub: r.currency }
  }
  if (s.status === 'error') {
    const extra = s.availableCurrencies?.length
      ? ` · Disponibles: ${s.availableCurrencies.join(', ')}`
      : ''
    return { type: 'error' as const, text: s.message + extra, sub: null }
  }
  return null
})

function walletOptionLabel(w: Wallet): string {
  const usd = ratesStore.usdValue(w.balance, w.currency)
  const usdStr = usd !== null
    ? ' · ≈ $' + usd.toFixed(2)
    : ''
  return `${w.currency} · ${Number(w.balance).toFixed(4)} disponible${usdStr}`
}

// ── Amount ────────────────────────────────────────────────────────────────────

const amount = ref('')
const amountNum = computed(() => parseFloat(amount.value) || 0)

const usdEquiv = computed<number | null>(() => {
  if (!selectedWallet.value || !amountNum.value) return null
  return ratesStore.usdValue(amountNum.value, selectedWallet.value.currency)
})

const overBalance = computed(() => {
  if (!selectedWallet.value || !amountNum.value) return false
  return amountNum.value > Number(selectedWallet.value.balance)
})

function setPct(pct: number) {
  if (!selectedWallet.value) return
  const bal = Number(selectedWallet.value.balance)
  amount.value = (bal * pct).toFixed(8).replace(/\.?0+$/, '')
}

// ── Priority (on-chain only) ──────────────────────────────────────────────────

const PRIORITIES = [
  { key: 'eco',    label: 'Económica', eta: '30-60 min',  mult: 0.6 },
  { key: 'normal', label: 'Normal',    eta: '10-20 min',  mult: 1.0 },
  { key: 'fast',   label: 'Rápida',    eta: '< 3 min',    mult: 2.5 },
] as const
type Priority = typeof PRIORITIES[number]['key']

const priority = ref<Priority>('normal')
const isOnChain = computed(() => recipientType.value === 'onchain')

// ── Note ─────────────────────────────────────────────────────────────────────

const note = ref('')

// ── Fee breakdown ─────────────────────────────────────────────────────────────

const networkFee = computed(() => {
  if (!isOnChain.value || !selectedWallet.value) return 0
  const baseFee = 0.001 // base fee in native
  const mult = PRIORITIES.find((p) => p.key === priority.value)?.mult ?? 1
  return baseFee * mult
})

const platformFee = computed(() => {
  if (!isOnChain.value || !usdEquiv.value) return 0
  return Math.max(usdEquiv.value * 0.001, 0.5)
})

const totalDebit = computed(() => amountNum.value + networkFee.value)

const priorityEta = computed(() =>
  PRIORITIES.find((p) => p.key === priority.value)?.eta ?? '—'
)

// ── Recent contacts (derived from confirmed txs) ──────────────────────────────


const recentContacts = computed(() => {
  // sender/receiver in confirmedStore are usernames, not wallet IDs.
  const myUsername = auth.user?.username ?? ''
  const seen = new Set<string>()
  const contacts: { id: string; display: string; count: number }[] = []
  for (const r of confirmedStore.records) {
    const counterparty = r.sender === myUsername ? r.receiver : r.sender
    if (!counterparty || counterparty === myUsername) continue
    if (!seen.has(counterparty)) {
      seen.add(counterparty)
      contacts.push({ id: counterparty, display: counterparty, count: 1 })
    } else {
      const entry = contacts.find((c) => c.id === counterparty)
      if (entry) entry.count++
    }
  }
  // Sort by frequency, return top 4
  return contacts.sort((a, b) => b.count - a.count).slice(0, 4)
})

function selectContact(id: string) {
  // Contacts are usernames → use Usuario Cadena type
  recipientType.value = 'user'
  recipientValue.value = id
}

// ── Form validation ───────────────────────────────────────────────────────────

const touched = ref(false)

const formError = computed<string | null>(() => {
  if (!touched.value) return null
  if (!fromWalletId.value) return 'Seleccioná una wallet de origen.'
  if (!recipientValue.value.trim()) return 'Ingresá un destinatario.'
  if (resolveState.value.status === 'resolving' || resolveState.value.status === 'idle') return null
  if (resolveState.value.status === 'error') return resolveState.value.message
  if (!amountNum.value || amountNum.value <= 0) return 'Ingresá un monto válido.'
  if (overBalance.value) return 'Monto supera el saldo disponible.'
  return null
})

const formValid = computed(() => {
  if (!fromWalletId.value || !recipientValue.value.trim()) return false
  const rs = resolveState.value.status
  if (rs === 'error' || rs === 'idle' || rs === 'resolving') return false
  if (!amountNum.value || amountNum.value <= 0) return false
  if (overBalance.value) return false
  return true
})

// ── Step 2: Confirm + submit ──────────────────────────────────────────────────

const step = ref<0 | 1 | 2>(0) // 0=form 1=confirm 2=success
const confirmMnemonic = ref('')
const confirmNonce = ref('1')
const submitting = ref(false)

// Auto-update nonce when the source wallet changes
watch(selectedWallet, (w) => {
  if (w) confirmNonce.value = String(w.next_nonce ?? 1)
})

const mnemonicValid = computed(
  () => !confirmMnemonic.value || isValidMnemonic(confirmMnemonic.value)
)

function goToConfirm() {
  touched.value = true
  if (!formValid.value) return
  step.value = 1
}

function backToForm() {
  step.value = 0
}

async function submitTransfer() {
  if (!isValidMnemonic(confirmMnemonic.value)) {
    toast.warn('Frase inválida', 'Verifica tu frase de recuperación BIP-39')
    return
  }
  const targetWalletId = resolvedWalletId()
  if (!targetWalletId) {
    toast.error('Destinatario no resuelto', 'Verifica el destinatario antes de enviar.')
    return
  }
  submitting.value = true
  try {
    await walletStore.transfer(
      confirmMnemonic.value,
      fromWalletId.value,
      targetWalletId,
      amountNum.value,
      parseInt(confirmNonce.value, 10),
    )
    step.value = 2
  } catch (e) {
    const detail =
      e instanceof BlockchainApiError
        ? e.message
        : e instanceof Error
          ? e.message
          : 'Transferencia fallida'
    toast.error('Error en transferencia', detail)
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  step.value = 0
  recipientValue.value = ''
  amount.value = ''
  note.value = ''
  confirmMnemonic.value = ''
  confirmNonce.value = '1'
  touched.value = false
}

// ── Recibir tab ───────────────────────────────────────────────────────────────

const receiveFlowData = ref<ReceiveData | null>(null)

function openReceive() {
  const w = selectedWallet.value ?? walletStore.wallets[0]
  if (w) {
    receiveFlowData.value = { asset: w.currency, address: w.wallet_id }
  }
}

// Inline receive panel state
const receiveCopied = ref(false)

function copyReceiveAddress() {
  const addr = selectedWallet.value?.wallet_id ?? ''
  if (!addr) return
  navigator.clipboard.writeText(addr).catch(() => {})
  receiveCopied.value = true
  setTimeout(() => { receiveCopied.value = false }, 1500)
}

// Real-time incoming transaction detection via WebSocket
interface IncomingPayment { amount: number; from: string; currency: string; blockIndex: number }
const incomingPayment = ref<IncomingPayment | null>(null)

const myUsername = computed(() => auth.user?.username ?? '')

const { status: wsStatus } = useBlockchainWebSocket((block) => {
  // Only detect while Recibir tab is active and a wallet is selected
  if (activeTab.value !== 'receive' || !selectedWallet.value) return
  const myWallet = selectedWallet.value
  const myUser = myUsername.value
  for (const tx of block.transactions) {
    if (tx.receiver === myUser && (tx.currency ?? myWallet.currency) === myWallet.currency) {
      incomingPayment.value = {
        amount: tx.amount,
        from: tx.sender,
        currency: tx.currency ?? myWallet.currency,
        blockIndex: block.index,
      }
      break
    }
  }
})

// Reset incoming notification when switching wallet or tab
watch([() => fromWalletId.value, activeTab], () => { incomingPayment.value = null })

// ── Solicitar tab state ───────────────────────────────────────────────────────

const REQ_EXPIRES = [
  { key: '1h',    label: '1 hora',          hours: 1 },
  { key: '24h',   label: '24 horas',        hours: 24 },
  { key: '7d',    label: '7 días',          hours: 24 * 7 },
  { key: 'never', label: 'Sin vencimiento', hours: null },
] as const

const reqStep = ref<0 | 1>(0)
const reqAmount = ref('')
const reqAsset = ref('cUSD')
const reqRecipient = ref('')
const reqConcept = ref('')
const reqExpires = ref<'1h' | '24h' | '7d' | 'never'>('24h')
const reqCopied = ref(false)
const reqCreating = ref(false)
const reqRecord = ref<PaymentRequest | null>(null)

const reqAmountNum = computed(() => parseFloat(reqAmount.value) || 0)

// Assets are driven by the user's actual wallets + fallback list
const REQ_ASSETS = computed(() => {
  const available = walletStore.wallets.map((w) => w.currency)
  const defaults = ['cUSD', 'USDT', 'BTC', 'ETH']
  const combined = [...new Set([...available, ...defaults])]
  return combined.slice(0, 6)
})

// Auto-select asset matching the first available wallet
watch(() => walletStore.wallets, (ws) => {
  if (ws.length > 0 && !ws.some((w) => w.currency === reqAsset.value)) {
    reqAsset.value = ws[0].currency
  }
}, { immediate: true })

const reqLink = computed(() =>
  reqRecord.value ? paymentRequestUrl(reqRecord.value.req_id) : ''
)

async function reqGenerate() {
  if (!reqAmountNum.value) return
  reqCreating.value = true
  try {
    const expiresConfig = REQ_EXPIRES.find((e) => e.key === reqExpires.value)
    let expires_at: string | undefined
    if (expiresConfig?.hours) {
      const exp = new Date(Date.now() + expiresConfig.hours * 3600 * 1000)
      expires_at = exp.toISOString()
    }
    reqRecord.value = await createPaymentRequest({
      amount: reqAmountNum.value,
      currency: reqAsset.value,
      from_username: reqRecipient.value.trim().replace(/^@/, '') || undefined,
      concept: reqConcept.value.trim() || undefined,
      expires_at,
    })
    reqStep.value = 1
  } catch (e) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.error('Error al generar link', msg ?? 'Verificá que tenés una wallet en esa moneda.')
  } finally {
    reqCreating.value = false
  }
}

function reqReset() {
  reqStep.value = 0
  reqRecord.value = null
  reqAmount.value = ''
  reqRecipient.value = ''
  reqConcept.value = ''
}

async function reqCopyLink() {
  if (!reqLink.value) return
  await navigator.clipboard.writeText(reqLink.value).catch(() => {})
  reqCopied.value = true
  setTimeout(() => { reqCopied.value = false }, 1400)
}

function reqShareWhatsApp() {
  const url = `https://wa.me/?text=${encodeURIComponent('Te solicito pago: ' + reqLink.value)}`
  window.open(url, '_blank')
}

function reqShareEmail() {
  if (!reqRecord.value) return
  const subject = 'Solicitud de pago'
  const body = `Te solicito pago de ${reqRecord.value.amount} ${reqRecord.value.currency}.\n\n${reqLink.value}`
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

async function reqCancel() {
  if (!reqRecord.value) return
  try {
    await cancelPaymentRequest(reqRecord.value.req_id)
    reqReset()
    toast.add({ severity: 'info', summary: 'Solicitud cancelada', life: 2500 })
  } catch {
    // ignore
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  const tabParam = route.query.tab as string | undefined
  if (tabParam === 'request' || tabParam === 'receive' || tabParam === 'schedule') {
    activeTab.value = tabParam as typeof activeTab.value
  }
  await Promise.all([
    walletStore.fetchMine(),
    confirmedStore.fetchConfirmed(),
    ratesStore.fetchRates(),
  ])
  if (walletStore.wallets.length > 0) {
    fromWalletId.value = walletStore.wallets[0].wallet_id
  }
})
</script>

<template>
  <div class="send-view">
    <!-- Tabs -->
    <div class="tabs-bar">
      <button
        v-for="tab in [
          { key: 'send',     label: 'Enviar' },
          { key: 'receive',  label: 'Recibir' },
          { key: 'request',  label: 'Solicitar' },
          { key: 'schedule', label: 'Programar' },
        ]"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = (tab.key as typeof activeTab)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- ── ENVIAR TAB ── -->
    <div v-if="activeTab === 'send'" class="sv-layout">
      <div class="sv-main">

        <!-- Step 0: form -->
        <template v-if="step === 0">
          <div class="form-card">
            <div class="form-card-h">
              <h2>Enviar fondos</h2>
              <p>
                Movimientos internos son
                <strong class="inline-success">instantáneos y sin costo</strong>
                · on-chain depende de la red.
              </p>
            </div>

            <!-- Recipient type chips -->
            <div class="field">
              <label class="field-label">Destinatario</label>
              <div class="type-chips">
                <button
                  v-for="t in RECIPIENT_TYPES"
                  :key="t.key"
                  class="type-chip"
                  :class="{ active: recipientType === t.key }"
                  @click="recipientType = t.key; recipientValue = ''"
                >
                  <span :class="'pi ' + t.icon" aria-hidden="true" />
                  {{ t.label }}
                </button>
              </div>
              <div class="recipient-input-row">
                <input
                  v-model="recipientValue"
                  class="field-input"
                  :class="{
                    invalid: touched && (!recipientValue.trim() || resolveState.status === 'error'),
                  }"
                  :placeholder="RECIPIENT_TYPES.find(t => t.key === recipientType)?.placeholder"
                  autocomplete="off"
                />
                <span
                  v-if="resolveBadge"
                  class="resolved-badge"
                  :class="{
                    'badge-success':  resolveBadge.type === 'success',
                    'badge-loading':  resolveBadge.type === 'loading',
                    'badge-warning':  resolveBadge.type === 'warning',
                    'badge-error':    resolveBadge.type === 'error',
                  }"
                >
                  <span
                    :class="{
                      'pi pi-check-circle': resolveBadge.type === 'success',
                      'pi pi-spin pi-spinner': resolveBadge.type === 'loading',
                      'pi pi-exclamation-triangle': resolveBadge.type === 'warning',
                      'pi pi-times-circle': resolveBadge.type === 'error',
                    }"
                    aria-hidden="true"
                  />
                  {{ resolveBadge.text }}
                </span>
              </div>
              <span v-if="resolveBadge?.sub" class="field-hint resolved-detail" :class="{ 'hint-warn': resolveBadge.type === 'warning' }">
                {{ resolveBadge.sub }}
              </span>
              <span v-else-if="!resolveBadge || resolveBadge.type === 'loading'" class="field-hint">
                {{ recipientHelp() }}
              </span>
            </div>

            <!-- Wallet selector -->
            <div class="field">
              <label class="field-label">Desde</label>
              <select
                v-model="fromWalletId"
                class="field-select"
                :class="{ invalid: touched && !fromWalletId }"
              >
                <option value="" disabled>Seleccioná una wallet…</option>
                <option
                  v-for="w in walletStore.wallets.filter((w) => !w.frozen)"
                  :key="w.wallet_id"
                  :value="w.wallet_id"
                >
                  {{ walletOptionLabel(w) }}
                </option>
              </select>
            </div>

            <!-- Amount -->
            <div class="field">
              <div class="amount-display-row">
                <input
                  v-model="amount"
                  class="amount-input"
                  :class="{ 'amount-over': overBalance }"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                />
                <span v-if="selectedWallet" class="amount-currency">{{ selectedWallet.currency }}</span>
              </div>
              <div v-if="usdEquiv !== null" class="amount-usd">
                ≈ ${{ usdEquiv.toFixed(2) }} USD
              </div>
              <div class="pct-chips">
                <button
                  v-for="pct in [0.25, 0.50, 0.75, 1]"
                  :key="pct"
                  class="pct-chip"
                  :disabled="!selectedWallet"
                  @click="setPct(pct)"
                >
                  {{ pct === 1 ? 'MÁX' : (pct * 100) + '%' }}
                </button>
              </div>
            </div>

            <!-- Network priority (on-chain only) -->
            <div v-if="isOnChain" class="field">
              <label class="field-label">Prioridad de red</label>
              <div class="priority-chips">
                <button
                  v-for="p in PRIORITIES"
                  :key="p.key"
                  class="priority-chip"
                  :class="{ active: priority === p.key }"
                  @click="priority = p.key"
                >
                  <span class="priority-label">{{ p.label }}</span>
                  <span class="priority-eta muted">{{ p.eta }}</span>
                </button>
              </div>
            </div>

            <!-- Note -->
            <div class="field">
              <label class="field-label">Nota <span class="optional">(opcional)</span></label>
              <input
                v-model="note"
                class="field-input"
                placeholder="Devolución cena, alquiler de marzo…"
                maxlength="200"
              />
            </div>

            <!-- Fee breakdown -->
            <div v-if="amountNum > 0 && selectedWallet" class="fee-box">
              <div class="fee-row">
                <span>Tipo de envío</span>
                <span :class="isOnChain ? '' : 'pos'">{{ isOnChain ? 'On-chain · ' + selectedWallet.currency : 'Interno · Cadena' }}</span>
              </div>
              <div class="fee-row">
                <span>Comisión de red</span>
                <span :class="networkFee === 0 ? 'pos' : ''">
                  {{ networkFee === 0 ? 'Gratis' : networkFee.toFixed(6) + ' ' + selectedWallet.currency }}
                </span>
              </div>
              <div v-if="isOnChain" class="fee-row">
                <span>Comisión Cadena 0.1%</span>
                <span>≈ ${{ platformFee.toFixed(2) }} USD</span>
              </div>
              <div class="fee-row">
                <span>Tiempo estimado</span>
                <span>{{ isOnChain ? priorityEta : 'Instantáneo' }}</span>
              </div>
              <div class="fee-row fee-total">
                <span><strong>Total débito de tu wallet</strong></span>
                <span class="mono"><strong>{{ totalDebit.toFixed(8) }} {{ selectedWallet.currency }}</strong></span>
              </div>
              <div class="fee-row">
                <span>{{ resolvedDisplayName() || 'Destinatario' }} recibe</span>
                <span class="mono">{{ amountNum.toFixed(8) }} {{ selectedWallet.currency }}</span>
              </div>
            </div>

            <!-- Form error -->
            <p v-if="formError" class="form-error">{{ formError }}</p>

            <button
              class="btn btn-primary btn-submit"
              :disabled="touched && !formValid"
              @click="goToConfirm"
            >
              Revisar y enviar
            </button>
          </div>
        </template>

        <!-- Step 1: confirm + mnemonic -->
        <template v-else-if="step === 1">
          <div class="form-card">
            <div class="form-card-h">
              <h2>Confirmar envío</h2>
              <p>Revisá los datos. Los envíos no son reversibles una vez minados.</p>
            </div>

            <div class="confirm-summary">
              <div class="confirm-row">
                <span>Para</span>
                <span class="mono">
                  {{ resolvedDisplayName() || recipientValue }}
                  <span v-if="resolvedWalletId() && resolvedWalletId() !== recipientValue" class="muted" style="font-size:11px"> ({{ resolvedWalletId()?.slice(0, 12) }}…)</span>
                </span>
              </div>
              <div class="confirm-row"><span>Monto</span><span class="mono">{{ amount }} {{ selectedWallet?.currency }}</span></div>
              <div v-if="usdEquiv" class="confirm-row"><span>Valor USD</span><span>≈ ${{ usdEquiv.toFixed(2) }}</span></div>
              <div class="confirm-row"><span>Comisión</span><span :class="networkFee === 0 ? 'pos' : ''">{{ networkFee === 0 ? 'Gratis' : networkFee.toFixed(6) + ' ' + selectedWallet?.currency }}</span></div>
              <div class="confirm-row confirm-total"><span><strong>Total débito</strong></span><span class="mono"><strong>{{ totalDebit.toFixed(8) }} {{ selectedWallet?.currency }}</strong></span></div>
              <div v-if="note" class="confirm-row"><span>Nota</span><span>{{ note }}</span></div>
            </div>

            <div class="field">
              <label class="field-label">Frase de recuperación BIP-39</label>
              <textarea
                v-model="confirmMnemonic"
                class="field-input mnemonic-input"
                :class="{ invalid: confirmMnemonic && !mnemonicValid }"
                placeholder="Frase de 12 palabras BIP-39"
                rows="2"
              />
              <span v-if="confirmMnemonic && !mnemonicValid" class="field-error">Frase inválida</span>
              <span v-else class="field-hint">Tu frase nunca sale del navegador — se usa para firmar localmente</span>
            </div>

            <div class="field">
              <label class="field-label">Nonce</label>
              <input
                v-model="confirmNonce"
                class="field-input"
                type="number"
                min="1"
                step="1"
                placeholder="1"
              />
              <span class="field-hint">Debe ser mayor al nonce anterior de esta wallet</span>
            </div>

            <div class="confirm-actions">
              <button class="btn" @click="backToForm">Volver</button>
              <button
                class="btn btn-primary"
                :disabled="submitting || !confirmMnemonic || !mnemonicValid"
                @click="submitTransfer"
              >
                <span v-if="submitting" class="pi pi-spin pi-spinner" aria-hidden="true" />
                {{ submitting ? 'Enviando…' : 'Confirmar y enviar' }}
              </button>
            </div>
          </div>
        </template>

        <!-- Step 2: success -->
        <template v-else>
          <div class="form-card success-card">
            <div class="success-circle">
              <span class="pi pi-check" aria-hidden="true" />
            </div>
            <div class="success-amount mono">−{{ amount }} {{ selectedWallet?.currency }}</div>
            <p class="muted">La transacción está en el mempool. Se confirmará al minarse el próximo bloque.</p>
            <button class="btn btn-primary" @click="resetForm">Nuevo envío</button>
          </div>
        </template>
      </div>

      <!-- Sidebar -->
      <aside class="sv-sidebar">
        <!-- Frecuentes -->
        <div class="sidebar-card" v-if="recentContacts.length > 0">
          <div class="sidebar-card-h">Contactos frecuentes</div>
          <div class="contacts-list">
            <button
              v-for="c in recentContacts"
              :key="c.id"
              class="contact-item"
              @click="selectContact(c.id)"
            >
              <div class="contact-avatar">{{ c.id.charAt(2).toUpperCase() }}</div>
              <div class="contact-info">
                <span class="contact-id mono">{{ c.display }}</span>
                <span class="muted" style="font-size:11px">{{ c.count }} envío{{ c.count !== 1 ? 's' : '' }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Atajos -->
        <div class="sidebar-card">
          <div class="sidebar-card-h">Atajos</div>
          <div class="shortcuts-list">
            <button class="shortcut-item" @click="activeTab = 'receive'; openReceive()">
              <span class="pi pi-download sh-icon sh-buy" aria-hidden="true" />
              <span>Recibir fondos</span>
              <span class="pi pi-chevron-right sh-arrow" aria-hidden="true" />
            </button>
            <button class="shortcut-item" @click="activeTab = 'request'">
              <span class="pi pi-link sh-icon sh-link" aria-hidden="true" />
              <span>Solicitar pago a alguien</span>
              <span class="pi pi-chevron-right sh-arrow" aria-hidden="true" />
            </button>
            <button class="shortcut-item" disabled title="Próximamente">
              <span class="pi pi-calendar sh-icon sh-cal" aria-hidden="true" />
              <span>Programar envío recurrente</span>
              <span class="pi pi-chevron-right sh-arrow" aria-hidden="true" />
            </button>
          </div>
        </div>

        <!-- Seguridad al enviar -->
        <div class="sidebar-card">
          <div class="sidebar-card-h">
            <span class="pi pi-shield-check" aria-hidden="true" style="color:var(--warning)" />
            Antes de enviar
          </div>
          <div class="sec-checks">
            <div class="sec-item">
              <span class="sec-icon sec-ok"><span class="pi pi-user-check" aria-hidden="true" /></span>
              <span>Verificá el nombre del destinatario en el badge verde</span>
            </div>
            <div class="sec-item">
              <span class="sec-icon sec-ok"><span class="pi pi-calculator" aria-hidden="true" /></span>
              <span>Revisá el monto y el desglose de comisiones</span>
            </div>
            <div class="sec-item">
              <span class="sec-icon sec-warn"><span class="pi pi-exclamation-circle" aria-hidden="true" /></span>
              <span>Los envíos confirmados no son reversibles</span>
            </div>
          </div>
          <div class="sec-never">
            <div class="sec-never-title">
              <span class="pi pi-times-circle" aria-hidden="true" /> Nunca hagas esto
            </div>
            <ul class="sec-never-list">
              <li>Envíes a una dirección que no reconocés</li>
              <li>Ignores el badge rojo de error</li>
              <li>Compartas tu frase semilla para "confirmar"</li>
            </ul>
          </div>
        </div>
      </aside>
    </div>

    <!-- ── RECIBIR TAB ── -->
    <div v-else-if="activeTab === 'receive'" class="sv-layout">
      <div class="sv-main">

        <!-- Payment received notification -->
        <div v-if="incomingPayment" class="received-banner">
          <div class="received-icon">
            <span class="pi pi-check" aria-hidden="true" />
          </div>
          <div class="received-info">
            <strong>+{{ incomingPayment.amount }} {{ incomingPayment.currency }}</strong>
            <span class="muted">Recibido de <b>{{ incomingPayment.from }}</b> · bloque #{{ incomingPayment.blockIndex }}</span>
          </div>
          <button class="btn-close-banner" @click="incomingPayment = null">✕</button>
        </div>

        <div class="form-card receive-card">
          <div class="form-card-h">
            <h2>Recibir fondos</h2>
            <p>Compartí tu dirección o QR para que te envíen fondos.</p>
          </div>

          <!-- Wallet selector -->
          <div class="field">
            <label class="field-label">Wallet</label>
            <select v-model="fromWalletId" class="field-select">
              <option value="" disabled>Seleccioná una wallet…</option>
              <option
                v-for="w in walletStore.wallets"
                :key="w.wallet_id"
                :value="w.wallet_id"
              >
                {{ w.currency }} · {{ Number(w.balance).toFixed(4) }} · {{ w.wallet_id.slice(0, 16) }}…
              </option>
            </select>
          </div>

          <template v-if="selectedWallet">
            <!-- QR Code -->
            <div class="qr-section">
              <div class="qr-wrapper">
                <QRCodeCanvas :value="selectedWallet.wallet_id" :size="172" />
                <div class="qr-brand">◆</div>
              </div>

              <div class="addr-label">TU DIRECCIÓN {{ selectedWallet.currency }}</div>

              <button class="addr-chip-lg" @click="copyReceiveAddress">
                <span class="mono addr-text">{{ selectedWallet.wallet_id }}</span>
                <span
                  :class="receiveCopied ? 'pi pi-check' : 'pi pi-copy'"
                  :style="{ color: receiveCopied ? 'var(--success)' : 'var(--accent)' }"
                  aria-hidden="true"
                />
              </button>
              <p v-if="receiveCopied" class="copy-confirm">
                <span class="pi pi-check" aria-hidden="true" /> Copiado al portapapeles
              </p>

              <!-- Action row -->
              <div class="receive-actions">
                <button class="btn" @click="copyReceiveAddress">
                  <span class="pi pi-copy" aria-hidden="true" />
                  {{ receiveCopied ? 'Copiado' : 'Copiar dirección' }}
                </button>
                <button class="btn" @click="openReceive">
                  <span class="pi pi-external-link" aria-hidden="true" />
                  Ver en modal
                </button>
              </div>
            </div>

            <!-- Live listener -->
            <div class="listening-bar" :class="{ 'listening-active': wsStatus === 'OPEN' }">
              <span
                :class="wsStatus === 'OPEN' ? 'ws-dot ws-dot-live' : 'ws-dot ws-dot-off'"
                aria-hidden="true"
              />
              <span v-if="wsStatus === 'OPEN'">Escuchando transacciones en tiempo real…</span>
              <span v-else class="muted">Reconectando al servidor…</span>
              <span v-if="wsStatus === 'OPEN'" class="muted" style="font-size:10.5px;margin-left:auto">en vivo</span>
            </div>

            <!-- Warning -->
            <div class="warn-box warn-box-info">
              <span class="pi pi-info-circle" aria-hidden="true" />
              <span>
                Sólo enviá <strong>{{ selectedWallet.currency }}</strong> a esta dirección en la red
                <strong>Cadena</strong>. Otros tokens podrían perderse.
              </span>
            </div>
          </template>

          <div v-else class="empty-state sm muted">
            Seleccioná una wallet para ver su dirección y QR.
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <aside class="sv-sidebar">
        <!-- Otras wallets -->
        <div v-if="walletStore.wallets.length > 1" class="sidebar-card">
          <div class="sidebar-card-h">Otras wallets</div>
          <div class="contacts-list">
            <button
              v-for="w in walletStore.wallets.filter(w => w.wallet_id !== fromWalletId)"
              :key="w.wallet_id"
              class="contact-item"
              @click="fromWalletId = w.wallet_id"
            >
              <div class="contact-avatar" style="background: var(--success)">{{ w.currency.charAt(0) }}</div>
              <div class="contact-info">
                <span class="contact-id">{{ w.currency }} · {{ Number(w.balance).toFixed(4) }}</span>
                <span class="muted" style="font-size:11px">{{ w.wallet_id.slice(0, 16) }}…</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Atajos -->
        <div class="sidebar-card">
          <div class="sidebar-card-h">Atajos</div>
          <div class="shortcuts-list">
            <button class="shortcut-item" @click="activeTab = 'send'">
              <span class="pi pi-send sh-icon sh-buy" aria-hidden="true" />
              <span>Enviar fondos</span>
              <span class="pi pi-chevron-right sh-arrow" aria-hidden="true" />
            </button>
            <button class="shortcut-item" @click="activeTab = 'request'">
              <span class="pi pi-link sh-icon sh-link" aria-hidden="true" />
              <span>Solicitar pago a alguien</span>
              <span class="pi pi-chevron-right sh-arrow" aria-hidden="true" />
            </button>
          </div>
        </div>

        <!-- Seguridad al recibir -->
        <div class="sidebar-card">
          <div class="sidebar-card-h">
            <span class="pi pi-shield-check" aria-hidden="true" style="color:var(--warning)" />
            Al recibir fondos
          </div>
          <div class="sec-checks">
            <div class="sec-item">
              <span class="sec-icon sec-ok"><span class="pi pi-link" aria-hidden="true" /></span>
              <span>Compartí solo la dirección o el QR, nunca la frase semilla</span>
            </div>
            <div class="sec-item">
              <span class="sec-icon sec-ok"><span class="pi pi-tag" aria-hidden="true" /></span>
              <span>Verificá que el remitente use la red <strong>Cadena</strong></span>
            </div>
          </div>
          <div class="sec-never">
            <div class="sec-never-title">
              <span class="pi pi-times-circle" aria-hidden="true" /> Nunca hagas esto
            </div>
            <ul class="sec-never-list">
              <li>Compartas tu frase semilla para recibir</li>
              <li>Aceptes tokens de redes distintas a Cadena</li>
              <li>Confíes en "soporte" que te pida la dirección privada</li>
            </ul>
          </div>
          <button class="btn sec-cta" @click="copyReceiveAddress">
            <span class="pi pi-copy" aria-hidden="true" />
            Copiar mi dirección
          </button>
        </div>
      </aside>
    </div>

    <!-- ── SOLICITAR TAB ── -->
    <div v-else-if="activeTab === 'request'" class="sv-layout">
      <div class="sv-main">
        <div class="form-card">

          <!-- Step 0: form -->
          <template v-if="reqStep === 0">
            <div class="form-card-h">
              <h2>Solicitar pago</h2>
              <p>Generá un link o QR · cualquiera con el link puede pagarte.</p>
            </div>

            <div class="amount-display-row">
              <input v-model="reqAmount" class="amount-input" type="number" min="0" step="any" placeholder="0.00" />
              <span class="amount-currency">{{ reqAsset }}</span>
            </div>
            <div class="amount-usd">
              {{ reqAsset }}
              <template v-if="ratesStore.usdValue(reqAmountNum, reqAsset) !== null">
                · ≈ ${{ ratesStore.usdValue(reqAmountNum, reqAsset)!.toFixed(2) }} USD
              </template>
            </div>

            <div class="field">
              <label class="field-label">Activo</label>
              <div class="type-chips">
                <button
                  v-for="a in REQ_ASSETS"
                  :key="a"
                  class="type-chip"
                  :class="{ active: reqAsset === a }"
                  @click="reqAsset = a"
                >{{ a }}</button>
              </div>
            </div>

            <div class="field">
              <label class="field-label">De <span class="optional">(opcional)</span></label>
              <input
                v-model="reqRecipient"
                class="field-input"
                placeholder="@usuario, email o nombre · si lo dejás vacío, link abierto"
              />
            </div>

            <div class="field">
              <label class="field-label">Concepto <span class="optional">(opcional)</span></label>
              <input v-model="reqConcept" class="field-input" placeholder="Devolución cena, alquiler de marzo…" />
            </div>

            <div class="field">
              <label class="field-label">Expira en</label>
              <div class="type-chips">
                <button
                  v-for="e in REQ_EXPIRES"
                  :key="e.key"
                  class="type-chip"
                  :class="{ active: reqExpires === e.key }"
                  @click="reqExpires = e.key"
                >{{ e.label }}</button>
              </div>
            </div>

            <div class="fee-box">
              <div class="fee-row"><span>Comisión</span><span class="pos">Gratis</span></div>
              <div class="fee-row"><span>Tipo</span><span>movimientos internos · instantáneos</span></div>
            </div>

            <button
              class="btn btn-primary btn-submit"
              :disabled="!reqAmountNum || reqCreating"
              @click="reqGenerate"
            >
              <span v-if="reqCreating" class="pi pi-spin pi-spinner" aria-hidden="true" />
              {{ reqCreating ? 'Generando…' : 'Generar link' }}
            </button>
          </template>

          <!-- Step 1: share link + QR -->
          <template v-else-if="reqRecord">
            <div class="form-card-h">
              <h2>¡Link de pago listo!</h2>
              <p>Compartilo — quien lo abra verá el formulario de pago pre-cargado.</p>
            </div>

            <!-- QR -->
            <div class="qr-section">
              <div class="qr-wrapper">
                <QRCodeCanvas :value="reqLink" :size="160" />
                <div class="qr-brand">◆</div>
              </div>
            </div>

            <!-- Summary -->
            <div class="confirm-summary">
              <div class="confirm-row">
                <span>Monto</span>
                <span class="mono">{{ reqRecord.amount }} {{ reqRecord.currency }}</span>
              </div>
              <div v-if="reqRecord.concept" class="confirm-row">
                <span>Concepto</span><span>{{ reqRecord.concept }}</span>
              </div>
              <div v-if="reqRecord.from_username" class="confirm-row">
                <span>Para cobrar a</span><span>@{{ reqRecord.from_username }}</span>
              </div>
              <div class="confirm-row">
                <span>Expira</span>
                <span>{{ reqRecord.expires_at ? new Date(reqRecord.expires_at).toLocaleString('es') : 'Sin vencimiento' }}</span>
              </div>
              <div class="confirm-row">
                <span>ID</span>
                <span class="mono" style="font-size:11px">{{ reqRecord.req_id }}</span>
              </div>
            </div>

            <!-- Link row -->
            <div class="field">
              <label class="field-label">Link de pago</label>
              <div class="link-row">
                <span class="link-value mono">{{ reqLink }}</span>
                <button class="btn btn-sm" @click="reqCopyLink">
                  <span :class="'pi ' + (reqCopied ? 'pi-check' : 'pi-copy')" aria-hidden="true" />
                  {{ reqCopied ? 'Copiado' : 'Copiar' }}
                </button>
              </div>
            </div>

            <!-- Share buttons -->
            <div class="share-buttons">
              <button class="share-btn" @click="reqCopyLink">
                <span class="pi pi-copy" aria-hidden="true" /> Copiar link
              </button>
              <button class="share-btn" @click="reqShareWhatsApp">
                <span class="pi pi-whatsapp" aria-hidden="true" /> WhatsApp
              </button>
              <button class="share-btn" @click="reqShareEmail">
                <span class="pi pi-envelope" aria-hidden="true" /> Email
              </button>
              <button class="share-btn" @click="reqCancel">
                <span class="pi pi-times" aria-hidden="true" /> Cancelar link
              </button>
            </div>

            <div class="confirm-actions" style="margin-top:8px">
              <button class="btn" @click="reqReset">Nueva solicitud</button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- ── PROGRAMAR TAB ── -->
    <div v-else class="sv-layout">
      <div class="sv-main">
        <div class="form-card coming-soon">
          <span class="pi pi-calendar coming-icon" aria-hidden="true" />
          <h3>Envío recurrente</h3>
          <p class="muted">Próximamente podrás configurar envíos automáticos periódicos.</p>
        </div>
      </div>
    </div>
  </div>

  <ReceiveFlow
    v-if="receiveFlowData"
    :data="receiveFlowData"
    @close="receiveFlowData = null"
    @complete="receiveFlowData = null"
  />
</template>

<style scoped>
.send-view {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 0;
}

/* Tabs */
.tabs-bar {
  display: flex;
  gap: 2px;
  border-bottom: 2px solid var(--border);
  margin-bottom: 20px;
}
.tab-btn {
  background: none;
  border: none;
  padding: 8px 18px 10px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-3);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.12s, border-color 0.12s;
}
.tab-btn:hover { color: var(--text); }
.tab-btn.active {
  color: var(--text);
  border-bottom-color: var(--accent);
  font-weight: 600;
}

/* Layout */
.sv-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 20px;
  align-items: start;
}
.sv-main { min-width: 0; }

/* Form card */
.form-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-card-h h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px;
  color: var(--text);
}
.form-card-h p {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.5;
}
.inline-success { color: var(--success); }

/* Field */
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.optional { font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--text-3); font-size: 11px; }
.field-input,
.field-select {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  font-size: 13px;
  font-family: var(--font-sans);
  outline: none;
  transition: border-color 0.12s;
  width: 100%;
  box-sizing: border-box;
}
.field-input:focus, .field-select:focus { border-color: var(--accent); }
.field-input.invalid, .field-select.invalid { border-color: var(--danger); }
.mnemonic-input { resize: vertical; font-family: var(--font-mono); }
.field-hint { font-size: 11.5px; color: var(--text-3); }
.field-error { font-size: 11.5px; color: var(--danger); }

/* Recipient type chips */
.type-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.type-chip {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 5px 10px;
  font-size: 12.5px;
  color: var(--text-2);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.12s;
}
.type-chip:hover { border-color: var(--accent); color: var(--text); }
.type-chip.active {
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}

/* Recipient input + resolved */
.recipient-input-row { position: relative; display: flex; align-items: center; gap: 8px; }
.recipient-input-row .field-input { flex: 1; }
.resolved-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-3);
  white-space: nowrap;
  padding: 4px 8px;
  border-radius: var(--radius);
  background: var(--surface-2);
  border: 1px solid var(--border);
  flex-shrink: 0;
}
.badge-success { color: var(--success); border-color: color-mix(in srgb, var(--success) 30%, var(--border)); background: color-mix(in srgb, var(--success) 8%, var(--surface)); }
.badge-loading { color: var(--text-3); }
.badge-warning { color: var(--warning); border-color: color-mix(in srgb, var(--warning) 30%, var(--border)); background: color-mix(in srgb, var(--warning) 8%, var(--surface)); }
.badge-error   { color: var(--danger);  border-color: color-mix(in srgb, var(--danger)  30%, var(--border)); background: color-mix(in srgb, var(--danger)  8%, var(--surface)); }
.resolved-detail { color: var(--text-2); }
.hint-warn { color: var(--warning); }

/* Amount */
.amount-display-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.amount-input {
  flex: 1;
  font-size: 32px;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--text);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 12px;
  text-align: center;
  outline: none;
  transition: border-color 0.12s;
  font-variant-numeric: tabular-nums;
  -moz-appearance: textfield;
}
.amount-input::-webkit-outer-spin-button,
.amount-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.amount-input:focus { border-color: var(--accent); }
.amount-input.amount-over { color: var(--danger); border-color: var(--danger); }
.amount-currency {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-2);
  min-width: 48px;
  text-align: left;
}
.amount-usd { font-size: 13px; color: var(--text-3); text-align: center; }

.pct-chips {
  display: flex;
  gap: 6px;
}
.pct-chip {
  flex: 1;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 5px 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-2);
  cursor: pointer;
  transition: all 0.12s;
  text-align: center;
}
.pct-chip:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.pct-chip:disabled { opacity: 0.4; cursor: not-allowed; }

/* Priority */
.priority-chips { display: flex; gap: 8px; }
.priority-chip {
  flex: 1;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: all 0.12s;
}
.priority-chip:hover { border-color: var(--accent); }
.priority-chip.active {
  background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  border-color: var(--accent);
}
.priority-label { font-size: 12.5px; font-weight: 600; color: var(--text); }
.priority-eta { font-size: 11px; }

/* Fee breakdown */
.fee-box {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.fee-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12.5px;
  color: var(--text-2);
}
.fee-total { border-top: 1px solid var(--border); padding-top: 8px; margin-top: 4px; color: var(--text); }

.form-error {
  font-size: 12.5px;
  color: var(--danger);
  margin: 0;
}
.btn-submit { width: 100%; justify-content: center; }

/* Confirm step */
.confirm-summary {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px;
}
.confirm-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.confirm-row:last-child { border-bottom: none; }
.confirm-total { color: var(--text); }
.confirm-actions { display: flex; gap: 10px; justify-content: flex-end; }

/* Success */
.success-card { align-items: center; text-align: center; padding: 40px 24px; }
.success-circle {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--success) 15%, var(--surface));
  color: var(--success);
  display: grid; place-items: center;
  font-size: 32px;
  margin-bottom: 16px;
}
.success-amount { font-size: 28px; font-weight: 700; color: var(--text); margin-bottom: 8px; }

/* Link share */
.link-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 12px;
}
.link-value {
  flex: 1;
  font-size: 12px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.share-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.share-btn {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 12px;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 0.12s;
}
.share-btn:hover { background: var(--surface); border-color: var(--accent); }

/* Coming soon */
.coming-soon {
  align-items: center;
  text-align: center;
  padding: 60px 24px;
}
.coming-icon { font-size: 40px; color: var(--text-3); margin-bottom: 12px; }
.coming-soon h3 { margin: 0 0 8px; font-size: 18px; }

/* Sidebar */
.sv-sidebar { display: flex; flex-direction: column; gap: 14px; }
.sidebar-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.sidebar-card-h {
  padding: 9px 14px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.contacts-list { display: flex; flex-direction: column; }
.contact-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 14px;
  background: none; border: none; cursor: pointer;
  border-bottom: 1px solid var(--border); width: 100%;
  text-align: left; transition: background 0.12s;
}
.contact-item:last-child { border-bottom: none; }
.contact-item:hover { background: var(--surface-2); }
.contact-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--accent);
  color: #fff; font-size: 11px; font-weight: 700;
  display: grid; place-items: center; flex-shrink: 0;
}
.contact-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.contact-id { font-size: 11.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text); }

.shortcuts-list { display: flex; flex-direction: column; }
.shortcut-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  background: none; border: none; border-bottom: 1px solid var(--border);
  cursor: pointer; font-size: 13px; color: var(--text);
  text-align: left; transition: background 0.12s; width: 100%;
}
.shortcut-item:last-child { border-bottom: none; }
.shortcut-item:hover:not(:disabled) { background: var(--surface-2); }
.shortcut-item:disabled { opacity: 0.4; cursor: not-allowed; }
.shortcut-item > span:not(.sh-icon):not(.sh-arrow) { flex: 1; }
.sh-icon { font-size: 14px; flex-shrink: 0; }
.sh-buy { color: var(--success); }
.sh-link { color: var(--accent); }
.sh-cal { color: var(--warning); }
.sh-arrow { margin-left: auto; font-size: 10px; color: var(--text-3); }

/* Security cards */
.sec-checks { display: flex; flex-direction: column; gap: 0; }
.sec-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 9px 14px;
  font-size: 12.5px; color: var(--text-2); line-height: 1.45;
  border-bottom: 1px solid var(--border);
}
.sec-item:last-child { border-bottom: none; }
.sec-icon {
  width: 22px; height: 22px; border-radius: 50%;
  display: grid; place-items: center; font-size: 11px; flex-shrink: 0;
}
.sec-ok   { background: color-mix(in srgb, var(--success) 15%, var(--surface)); color: var(--success); }
.sec-warn { background: color-mix(in srgb, var(--warning) 15%, var(--surface)); color: var(--warning); }

.sec-never {
  margin: 0 10px 10px;
  background: color-mix(in srgb, var(--danger) 8%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--danger) 22%, var(--border));
  border-radius: var(--radius);
  padding: 10px 12px;
}
.sec-never-title {
  font-size: 11px; font-weight: 700; color: var(--danger);
  text-transform: uppercase; letter-spacing: 0.04em;
  display: flex; align-items: center; gap: 5px; margin-bottom: 7px;
}
.sec-never-list {
  margin: 0; padding: 0 0 0 14px;
  font-size: 11.5px; color: var(--text-2); line-height: 1.7;
}
.sec-cta { width: calc(100% - 28px); margin: 0 14px 14px; justify-content: center; }

/* ── Receive tab ── */
.receive-card { align-items: center; }

.received-banner {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px;
  background: color-mix(in srgb, var(--success) 12%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--success) 30%, var(--border));
  border-radius: var(--radius-lg); margin-bottom: 4px;
}
.received-icon {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--success); color: #fff;
  display: grid; place-items: center; font-size: 16px; flex-shrink: 0;
}
.received-info { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.btn-close-banner { background: none; border: none; cursor: pointer; color: var(--text-3); font-size: 14px; padding: 4px; }

.qr-section { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 4px 0; width: 100%; }
.qr-wrapper {
  position: relative; padding: 12px;
  background: #fff; border-radius: 12px;
  border: 1px solid var(--border);
  box-shadow: 0 2px 8px rgba(0,0,0,.08); line-height: 0;
}
.qr-brand {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 28px; height: 28px;
  background: linear-gradient(135deg, #1a1917, #3a3530); border-radius: 6px;
  color: #faf9f6; display: grid; place-items: center; font-size: 12px; font-weight: 700;
  pointer-events: none;
}
.addr-label { font-size: 10.5px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; }
.addr-chip-lg {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius);
  cursor: pointer; transition: border-color 0.12s; width: 100%; max-width: 400px;
}
.addr-chip-lg:hover { border-color: var(--accent); }
.addr-text { flex: 1; font-size: 12px; word-break: break-all; text-align: left; color: var(--text); }
.copy-confirm { font-size: 12px; color: var(--success); margin: 0; display: flex; align-items: center; gap: 4px; }
.receive-actions { display: flex; gap: 8px; width: 100%; max-width: 400px; }
.receive-actions .btn { flex: 1; justify-content: center; }

.listening-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 14px; border-radius: var(--radius);
  font-size: 12.5px; width: 100%;
  background: var(--surface-2); border: 1px solid var(--border); color: var(--text-2);
}
.listening-active {
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
  border-color: color-mix(in srgb, var(--accent) 25%, var(--border)); color: var(--text);
}
.ws-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.ws-dot-live { background: var(--success); box-shadow: 0 0 0 2px color-mix(in srgb, var(--success) 30%, transparent); animation: pulse-dot 2s infinite; }
.ws-dot-off { background: var(--text-3); }
@keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.warn-box {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 14px; border-radius: var(--radius);
  font-size: 12.5px; line-height: 1.5; width: 100%;
}
.warn-box-info {
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 20%, var(--border)); color: var(--text-2);
}
.warn-box .pi { flex-shrink: 0; margin-top: 1px; color: var(--accent); }

/* Utils */
.mono { font-family: var(--font-mono); }
.muted { color: var(--text-3); }
.pos { color: var(--success); }

@media (max-width: 900px) {
  .sv-layout { grid-template-columns: 1fr; }
  .sv-sidebar { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
}
</style>
