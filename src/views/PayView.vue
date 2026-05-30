<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import { useExchangeRatesStore } from '@/stores/exchangeRates'
import { getPaymentRequest, fulfillPaymentRequest, type PaymentRequest } from '@/api/paymentRequests'
import { isValidMnemonic } from '@/lib/crypto'
import { useToast } from '@/composables/useToast'
import { BlockchainApiError } from '@/api/errors'

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()
const walletStore   = useWalletStore()
const ratesStore    = useExchangeRatesStore()
const toast  = useToast()

const reqId = route.params.id as string

// ── Load payment request ──────────────────────────────────────────────────────

const loading   = ref(true)
const loadError = ref<string | null>(null)
const payReq    = ref<PaymentRequest | null>(null)

async function load() {
  loading.value = true
  loadError.value = null
  try {
    payReq.value = await getPaymentRequest(reqId)
  } catch {
    loadError.value = 'Solicitud de pago no encontrada o expirada.'
  } finally {
    loading.value = false
  }
}

// ── Send form ─────────────────────────────────────────────────────────────────

const mnemonic = ref('')
const nonce    = ref('1')
const step     = ref<0 | 1>(0)  // 0=confirm, 1=success
const sending  = ref(false)

const mnemonicValid = computed(
  () => !mnemonic.value || isValidMnemonic(mnemonic.value)
)

// Find the sender's wallet matching the requested currency
const senderWallet = computed(() => {
  if (!payReq.value) return null
  return walletStore.wallets.find((w) => w.currency === payReq.value!.currency && !w.frozen) ?? null
})

// Auto-fill nonce
const autoNonce = computed(() => senderWallet.value?.next_nonce ?? 1)

const usdEquiv = computed<number | null>(() => {
  if (!payReq.value) return null
  return ratesStore.usdValue(parseFloat(payReq.value.amount), payReq.value.currency)
})

async function submitPayment() {
  if (!payReq.value || !senderWallet.value) return
  if (!isValidMnemonic(mnemonic.value)) {
    toast.warn('Frase inválida', 'Verifica tu frase de recuperación BIP-39')
    return
  }
  sending.value = true
  try {
    await walletStore.transfer(
      mnemonic.value,
      senderWallet.value.wallet_id,
      payReq.value.payee_wallet_id,
      parseFloat(payReq.value.amount),
      parseInt(nonce.value, 10),
    )
    // Mark the request as fulfilled
    await fulfillPaymentRequest(reqId, auth.user?.username ?? 'unknown').catch(() => {})
    step.value = 1
  } catch (e) {
    const detail =
      e instanceof BlockchainApiError
        ? e.message
        : e instanceof Error
          ? e.message
          : 'Error al enviar'
    toast.error('Error al pagar', detail)
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  await load()
  if (auth.isAuthenticated) {
    await Promise.all([walletStore.fetchMine(), ratesStore.fetchRates()])
    if (senderWallet.value?.next_nonce) {
      nonce.value = String(senderWallet.value.next_nonce)
    }
  }
})
</script>

<template>
  <div class="pay-page">
    <div class="pay-card">

      <!-- Header -->
      <div class="pay-header">
        <div class="pay-brand">◆ Cadena</div>
        <h1>Solicitud de pago</h1>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="pay-state">
        <span class="pi pi-spin pi-spinner" aria-hidden="true" style="font-size:24px" />
        <p>Cargando solicitud…</p>
      </div>

      <!-- Error -->
      <div v-else-if="loadError || !payReq" class="pay-state error">
        <span class="pi pi-times-circle" aria-hidden="true" style="font-size:32px;color:var(--danger)" />
        <p>{{ loadError }}</p>
        <button class="btn btn-primary" @click="router.push('/')">Ir al inicio</button>
      </div>

      <!-- Already paid/cancelled -->
      <div v-else-if="payReq.status === 'paid'" class="pay-state success">
        <div class="pay-circle pay-circle-success"><span class="pi pi-check" aria-hidden="true" /></div>
        <h2>Ya fue pagada</h2>
        <p class="muted">Esta solicitud ya fue satisfecha por <strong>{{ payReq.paid_by }}</strong>.</p>
      </div>

      <div v-else-if="payReq.status === 'cancelled'" class="pay-state">
        <span class="pi pi-ban" aria-hidden="true" style="font-size:32px;color:var(--text-3)" />
        <h2>Solicitud cancelada</h2>
        <p class="muted">El destinatario canceló esta solicitud.</p>
      </div>

      <!-- Success after paying -->
      <div v-else-if="step === 1" class="pay-state success">
        <div class="pay-circle pay-circle-success"><span class="pi pi-check" aria-hidden="true" /></div>
        <h2>¡Pago enviado!</h2>
        <p class="muted">
          La transacción está en el mempool. Se confirmará cuando se mine el próximo bloque.
        </p>
        <button class="btn btn-primary" @click="router.push('/portfolio')">
          Ir a mi portafolio
        </button>
      </div>

      <!-- Active request — pay form -->
      <template v-else-if="payReq.status === 'pending'">
        <!-- Request summary -->
        <div class="req-summary">
          <div class="req-amount mono">
            {{ payReq.amount }}
            <span class="req-currency">{{ payReq.currency }}</span>
          </div>
          <div v-if="usdEquiv !== null" class="req-usd muted">
            ≈ ${{ usdEquiv.toFixed(2) }} USD
          </div>
          <div class="req-from">
            Solicitado por <strong>{{ payReq.owner_username }}</strong>
          </div>
          <div v-if="payReq.concept" class="req-concept">
            "{{ payReq.concept }}"
          </div>
          <div v-if="payReq.expires_at" class="req-expires muted">
            Expira: {{ new Date(payReq.expires_at).toLocaleString('es') }}
          </div>
        </div>

        <!-- Login gate -->
        <div v-if="!auth.isAuthenticated" class="pay-gate">
          <p>Necesitás iniciar sesión para pagar esta solicitud.</p>
          <button class="btn btn-primary btn-full" @click="router.push('/login')">
            Iniciar sesión
          </button>
        </div>

        <!-- No matching wallet -->
        <div v-else-if="!senderWallet" class="pay-gate">
          <p class="muted">
            No tenés una wallet en <strong>{{ payReq.currency }}</strong>.
            Creá una desde tu portafolio para poder pagar esta solicitud.
          </p>
          <button class="btn btn-primary btn-full" @click="router.push('/wallet')">
            Ir a Mis wallets
          </button>
        </div>

        <!-- Pay form -->
        <div v-else class="pay-form">
          <div class="pay-info-row">
            <span class="muted">Desde tu wallet</span>
            <span class="mono">
              {{ senderWallet.currency }} · {{ Number(senderWallet.balance).toFixed(4) }} disponible
            </span>
          </div>

          <div class="field">
            <label class="field-label">Frase de recuperación BIP-39</label>
            <textarea
              v-model="mnemonic"
              class="field-input mnemonic-input"
              :class="{ invalid: mnemonic && !mnemonicValid }"
              placeholder="Frase de 12 palabras BIP-39"
              rows="2"
            />
            <span v-if="mnemonic && !mnemonicValid" class="field-error">Frase inválida</span>
            <span v-else class="field-hint">Tu frase nunca sale del navegador — se usa para firmar localmente</span>
          </div>

          <div class="field">
            <label class="field-label">Nonce</label>
            <input
              v-model="nonce"
              class="field-input"
              type="number"
              min="1"
              step="1"
              :placeholder="String(autoNonce)"
            />
            <span class="field-hint">Debe ser mayor al nonce anterior de esta wallet (sugerido: {{ autoNonce }})</span>
          </div>

          <div class="fee-box" style="margin-bottom:4px">
            <div class="fee-row">
              <span><strong>Total a enviar</strong></span>
              <span class="mono"><strong>{{ payReq.amount }} {{ payReq.currency }}</strong></span>
            </div>
            <div class="fee-row"><span>Comisión</span><span class="pos">Gratis</span></div>
          </div>

          <button
            class="btn btn-primary btn-submit"
            :disabled="sending || !mnemonic || !mnemonicValid"
            @click="submitPayment"
          >
            <span v-if="sending" class="pi pi-spin pi-spinner" aria-hidden="true" />
            {{ sending ? 'Enviando…' : `Pagar ${payReq.amount} ${payReq.currency}` }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.pay-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: var(--bg, #f5f4f1);
  padding: 24px 16px;
}

.pay-card {
  width: 100%;
  max-width: 460px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.pay-header {
  background: linear-gradient(135deg, #1a1917, #3a3530);
  color: #faf9f6;
  padding: 20px 24px 18px;
}
.pay-brand {
  font-size: 13px;
  font-weight: 700;
  opacity: 0.6;
  margin-bottom: 6px;
}
.pay-header h1 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.pay-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 24px;
  text-align: center;
}
.pay-state.success { background: color-mix(in srgb, var(--success) 5%, var(--surface)); }
.pay-state.error { background: color-mix(in srgb, var(--danger) 5%, var(--surface)); }

.pay-circle {
  width: 64px; height: 64px; border-radius: 50%;
  display: grid; place-items: center; font-size: 28px;
}
.pay-circle-success {
  background: color-mix(in srgb, var(--success) 15%, var(--surface));
  color: var(--success);
}

/* Request summary */
.req-summary {
  padding: 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}
.req-amount {
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.req-currency { font-size: 20px; font-weight: 500; margin-left: 6px; color: var(--text-2); }
.req-usd { font-size: 14px; }
.req-from { font-size: 13px; color: var(--text-2); }
.req-concept {
  font-size: 13px;
  color: var(--text);
  font-style: italic;
}
.req-expires { font-size: 12px; }

/* Pay form + gate */
.pay-gate {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: center;
}
.pay-form {
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.pay-info-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 8px 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 12px; font-weight: 600; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.04em; }
.field-input {
  padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface-2); color: var(--text); font-size: 13px;
  font-family: var(--font-sans); outline: none; transition: border-color 0.12s;
}
.field-input:focus { border-color: var(--accent); }
.field-input.invalid { border-color: var(--danger); }
.mnemonic-input { resize: vertical; font-family: var(--font-mono); }
.field-hint { font-size: 11.5px; color: var(--text-3); }
.field-error { font-size: 11.5px; color: var(--danger); }

.fee-box {
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 10px 14px;
  display: flex; flex-direction: column; gap: 5px;
}
.fee-row { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--text-2); }

.btn-submit { width: 100%; justify-content: center; }
.btn-full { width: 100%; justify-content: center; }

.mono { font-family: var(--font-mono); }
.muted { color: var(--text-3); }
.pos { color: var(--success); }
</style>
