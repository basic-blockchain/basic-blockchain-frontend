<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { previewWallet, confirmWallet, listCurrencies, type CurrencyRecord } from '@/api/wallets'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const walletStore = useWalletStore()
const toast = useToast()

const emit = defineEmits<{ close: []; complete: [] }>()

// ── State ─────────────────────────────────────────────────────────────────────

// 0=activo 1=learn-why 2=learn-risks 3=learn-how 4=frase 5=verify 6=done
const step = ref(0)

const selectedCurrency = ref('NATIVE')
const label            = ref('')
const currencies       = ref<CurrencyRecord[]>([])
const loading          = ref(false)    // previewWallet call

const draft = ref<{ mnemonic: string; draft_id: string } | null>(null)
const mnemonicWords = computed(() => draft.value?.mnemonic.split(' ') ?? [])

const revealed     = ref(false)
const acknowledged = ref(false)
const copied       = ref(false)

const challenge = ref<number[]>([])   // 3 random positions
const answers   = ref<string[]>(['', '', ''])

const submitting     = ref(false)
const createdWalletId = ref('')

// ── Currency metadata ─────────────────────────────────────────────────────────

const CURRENCY_META: Record<string, { label: string; desc: string; recommended?: boolean }> = {
  NATIVE: { label: 'Native',   desc: 'Token nativo de la plataforma', recommended: true },
  cUSD:   { label: 'Cadena USD', desc: 'Stablecoin nativo de la plataforma', recommended: true },
  BTC:    { label: 'Bitcoin',  desc: 'Red Bitcoin' },
  ETH:    { label: 'Ether',    desc: 'Red Ethereum' },
  USDT:   { label: 'Tether',   desc: 'Stablecoin · Ethereum' },
  USDC:   { label: 'USD Coin', desc: 'Stablecoin · Ethereum' },
  SOL:    { label: 'Solana',   desc: 'Red Solana' },
}

function currencyLabel(code: string): string {
  return CURRENCY_META[code]?.label ?? code
}
function currencyDesc(code: string): string {
  return CURRENCY_META[code]?.desc ?? ''
}
function isRecommended(code: string): boolean {
  return !!CURRENCY_META[code]?.recommended
}

// First letter of currency for the icon circle
const CURRENCY_COLORS: Record<string, string> = {
  NATIVE: '#6B7280', cUSD: '#35D07F', BTC: '#F7931A',
  ETH: '#627EEA', USDT: '#26A17B', USDC: '#2775CA', SOL: '#9945FF',
}
function currencyColor(code: string): string {
  return CURRENCY_COLORS[code] ?? '#6B7280'
}

// ── Stepper ───────────────────────────────────────────────────────────────────

const STEPPER = ['Activo', 'Aprender', 'Frase', 'Verificar', 'Listo']

const stepperActive = computed(() => {
  if (step.value === 0) return 0
  if (step.value <= 3)  return 1
  if (step.value === 4) return 2
  if (step.value === 5) return 3
  return 4
})

// ── Navigation ────────────────────────────────────────────────────────────────

async function goNext() {
  if (step.value === 0) {
    // Call previewWallet; advance after success
    loading.value = true
    try {
      const resp = await previewWallet(selectedCurrency.value)
      draft.value = { mnemonic: resp.mnemonic, draft_id: resp.draft_id }
      step.value = 1
    } catch (e) {
      toast.error('Error al preparar la wallet', e instanceof Error ? e.message : 'Error inesperado')
    } finally {
      loading.value = false
    }
    return
  }
  if (step.value === 4) {
    // Generate 3-word challenge before entering verify step
    const positions = Array.from({ length: 12 }, (_, i) => i)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .sort((a, b) => a - b)
    challenge.value = positions
    answers.value = ['', '', '']
  }
  step.value++
}

function goBack() {
  if (step.value > 0) step.value--
}

// ── Challenge validation ──────────────────────────────────────────────────────

const answerValid = computed(() =>
  challenge.value.map((pos, i) =>
    answers.value[i].trim().toLowerCase() === (mnemonicWords.value[pos] ?? '').toLowerCase()
  )
)

const allCorrect = computed(() => answerValid.value.every(Boolean) && answers.value.every(a => a.trim()))

// ── Create wallet ─────────────────────────────────────────────────────────────

async function createWallet() {
  if (!draft.value || !allCorrect.value) return
  submitting.value = true
  try {
    const resp = await confirmWallet(draft.value.draft_id)
    createdWalletId.value = resp.wallet_id
    await walletStore.fetchMine()
    step.value = 6
  } catch (e) {
    toast.error('Error al crear la wallet', e instanceof Error ? e.message : 'Error inesperado')
  } finally {
    submitting.value = false
  }
}

// ── Mnemonic actions ──────────────────────────────────────────────────────────

async function copyMnemonic() {
  if (!draft.value) return
  await navigator.clipboard.writeText(draft.value.mnemonic).catch(() => {})
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}

function downloadMnemonic() {
  if (!draft.value) return
  const words = draft.value.mnemonic.split(' ')
  const text  = `Frase semilla Cadena — ${selectedCurrency.value}\n\n` +
    words.map((w, i) => `${i + 1}. ${w}`).join('\n') +
    '\n\nGuarda este archivo en un lugar seguro y cifrado.'
  const blob = new Blob([text], { type: 'text/plain' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'cadena-frase-semilla.txt'
  a.click()
  URL.revokeObjectURL(url)
}

// ── Copy address ──────────────────────────────────────────────────────────────

const addrCopied = ref(false)

async function copyAddress() {
  await navigator.clipboard.writeText(createdWalletId.value).catch(() => {})
  addrCopied.value = true
  setTimeout(() => { addrCopied.value = false }, 1400)
}

// ── Close / complete ──────────────────────────────────────────────────────────

function onClose() { emit('close') }

function onReceive() {
  emit('complete')
  router.push({ path: '/send', query: { tab: 'receive' } })
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  try {
    const resp = await listCurrencies(true)
    currencies.value = resp.currencies
  } catch {
    // fallback: show only NATIVE
    currencies.value = [{ code: 'NATIVE', name: 'Native', decimals: 8, active: true }]
  }
})

// Reset blur when step changes
watch(step, () => { revealed.value = false; acknowledged.value = false })
</script>

<template>
  <Teleport to="body">
    <div class="wcf-scrim" @click.self="onClose">
      <div class="wcf-modal" role="dialog" aria-modal="true">

        <!-- Header -->
        <div class="wcf-header">
          <div class="wcf-header-text">
            <!-- Dynamic title per step -->
            <h2 class="wcf-title">
              <template v-if="step === 0">Crear nueva wallet</template>
              <template v-else-if="step === 1">Tu frase semilla es tu wallet</template>
              <template v-else-if="step === 2">Si la perdés, no hay vuelta atrás</template>
              <template v-else-if="step === 3">Cómo guardarla segura</template>
              <template v-else-if="step === 4">Tu frase de 12 palabras</template>
              <template v-else-if="step === 5">Confirmá tu frase</template>
              <template v-else>¡Wallet creada!</template>
            </h2>
            <p class="wcf-sub">
              <template v-if="step === 0">Elegí el activo · cada wallet maneja un solo tipo.</template>
              <template v-else-if="step === 1">Lo más importante que vas a aprender hoy.</template>
              <template v-else-if="step === 2">Entendé el riesgo antes de continuar.</template>
              <template v-else-if="step === 3">Buenas prácticas y qué nunca hacer.</template>
              <template v-else-if="step === 4">Anotá ahora. No se vuelve a mostrar.</template>
              <template v-else-if="step === 5">Ingresá las palabras pedidas para verificar.</template>
              <template v-else>Tu wallet está lista para recibir fondos.</template>
            </p>
          </div>
          <button class="wcf-close" aria-label="Cerrar" @click="onClose">
            <span class="pi pi-times" aria-hidden="true" />
          </button>
        </div>

        <!-- Stepper -->
        <div v-if="step < 6" class="wcf-stepper">
          <template v-for="(label_, i) in STEPPER" :key="i">
            <div
              class="step-item"
              :class="{
                'step-done':   i < stepperActive,
                'step-active': i === stepperActive,
              }"
            >
              <span class="step-num">
                <span v-if="i < stepperActive" class="pi pi-check" aria-hidden="true" />
                <template v-else>{{ i + 1 }}</template>
              </span>
              <span class="step-label">{{ label_ }}</span>
            </div>
            <div v-if="i < STEPPER.length - 1" class="step-line" :class="{ done: i < stepperActive }" />
          </template>
        </div>

        <!-- ── STEP 0: Asset selection ── -->
        <div v-if="step === 0" class="wcf-body">
          <div class="field">
            <label class="field-label">Etiqueta <span class="opt">(opcional)</span></label>
            <input v-model="label" class="field-input" placeholder="Ej: ahorros, gastos diarios…" />
          </div>

          <div class="field">
            <label class="field-label">Activo</label>
            <div class="currency-list">
              <label
                v-for="c in currencies"
                :key="c.code"
                class="currency-item"
                :class="{ selected: selectedCurrency === c.code }"
              >
                <input v-model="selectedCurrency" type="radio" :value="c.code" class="currency-radio" />
                <div class="currency-icon" :style="{ background: currencyColor(c.code) }">
                  {{ c.code.charAt(0) }}
                </div>
                <div class="currency-text">
                  <span class="currency-name">
                    {{ currencyLabel(c.code) }}
                    <span v-if="isRecommended(c.code)" class="badge-rec">recomendado</span>
                  </span>
                  <span class="currency-desc">{{ currencyDesc(c.code) || c.name }}</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- ── STEP 1: Why the phrase matters ── -->
        <div v-else-if="step === 1" class="wcf-body">
          <div class="edu-icon edu-icon-blue">🔑</div>
          <div class="edu-cards">
            <div class="edu-card">
              <div class="edu-card-icon" style="background: color-mix(in srgb, #4263eb 15%, var(--surface))">
                <span class="pi pi-lock" style="color:#4263eb" />
              </div>
              <div>
                <strong>Sos vos quien la custodia</strong>
                <p>No la guardamos en ningún servidor. Es self-custody real.</p>
              </div>
            </div>
            <div class="edu-card">
              <div class="edu-card-icon" style="background: color-mix(in srgb, #2f9e44 15%, var(--surface))">
                <span class="pi pi-refresh" style="color:#2f9e44" />
              </div>
              <div>
                <strong>Sirve para recuperar la wallet</strong>
                <p>Si cambiás de teléfono, con la frase recuperás todo.</p>
              </div>
            </div>
            <div class="edu-card">
              <div class="edu-card-icon" style="background: color-mix(in srgb, #6B7280 15%, var(--surface))">
                <span class="pi pi-eye-slash" style="color:#6B7280" />
              </div>
              <div>
                <strong>Se muestra una sola vez</strong>
                <p>Por seguridad, no la volvemos a mostrar después.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ── STEP 2: Risks ── -->
        <div v-else-if="step === 2" class="wcf-body">
          <div class="edu-icon edu-icon-red">⚠️</div>
          <div class="edu-cards">
            <div class="edu-card risk">
              <div class="risk-x">✕</div>
              <div>
                <strong>No hay "olvidé mi contraseña"</strong>
                <p>Nadie —ni Cadena ni un banco— puede recuperarla por vos.</p>
              </div>
            </div>
            <div class="edu-card risk">
              <div class="risk-x">✕</div>
              <div>
                <strong>Fondos perdidos para siempre</strong>
                <p>Sin la frase, el saldo queda inaccesible de forma permanente.</p>
              </div>
            </div>
            <div class="edu-card risk">
              <div class="risk-x">✕</div>
              <div>
                <strong>Si alguien la ve, te roba</strong>
                <p>Quien copie tus 12 palabras puede vaciar la wallet sin permiso.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ── STEP 3: How to save it ── -->
        <div v-else-if="step === 3" class="wcf-body">
          <div class="edu-icon edu-icon-green">🛡</div>
          <div class="edu-cards">
            <div class="edu-card good">
              <div class="good-check">✓</div>
              <div>
                <strong>Escribila en papel</strong>
                <p>Anotá las 12 palabras en orden. Mejor dos copias en lugares distintos.</p>
              </div>
            </div>
            <div class="edu-card good">
              <div class="good-check">✓</div>
              <div>
                <strong>Placa de metal para montos grandes</strong>
                <p>Grabarla en metal la protege de fuego e inundación.</p>
              </div>
            </div>
            <div class="edu-card good">
              <div class="good-check">✓</div>
              <div>
                <strong>Gestor de contraseñas con 2FA</strong>
                <p>1Password o Bitwarden es una opción digital razonable.</p>
              </div>
            </div>
          </div>
          <div class="never-box">
            <div class="never-title">
              <span class="pi pi-times-circle" aria-hidden="true" /> NUNCA HAGAS ESTO
            </div>
            <ul class="never-list">
              <li>✕ Sacarle captura o foto con el teléfono</li>
              <li>✕ Mandarla por WhatsApp, mail o nube sin cifrar</li>
              <li>✕ Compartirla con "soporte" — siempre es estafa</li>
              <li>✕ Tipearla en sitios web que te la pidan</li>
            </ul>
          </div>
        </div>

        <!-- ── STEP 4: Reveal seed ── -->
        <div v-else-if="step === 4" class="wcf-body">
          <!-- Warning banner -->
          <div class="seed-warning">
            <span class="pi pi-exclamation-triangle" aria-hidden="true" />
            <span>
              <strong>Es la única vez que se muestra.</strong>
              Anotala en orden y asegurate de que nadie te esté mirando la pantalla.
            </span>
          </div>

          <!-- Seed grid -->
          <div class="seed-container" :class="{ blurred: !revealed }">
            <div class="seed-grid">
              <div v-for="(word, i) in mnemonicWords" :key="i" class="seed-chip">
                <span class="seed-num">{{ i + 1 }}</span>
                <span class="seed-word">{{ word }}</span>
              </div>
            </div>

            <!-- Blur overlay -->
            <div v-if="!revealed" class="seed-overlay" @click="revealed = true">
              <div class="seed-lock-circle">
                <span class="pi pi-lock" aria-hidden="true" />
              </div>
              <p class="seed-overlay-title">Tocá para revelar tu frase</p>
              <p class="seed-overlay-sub">Asegurate de estar en un lugar privado. Nadie debería ver esta pantalla.</p>
            </div>
          </div>

          <!-- Actions (only after reveal) -->
          <div v-if="revealed" class="seed-actions">
            <button class="btn btn-sm" @click="copyMnemonic">
              <span :class="'pi ' + (copied ? 'pi-check' : 'pi-copy')" aria-hidden="true" />
              {{ copied ? 'Copiada' : 'Copiar' }}
            </button>
            <button class="btn btn-sm" @click="downloadMnemonic">
              <span class="pi pi-download" aria-hidden="true" />
              Descargar TXT
            </button>
          </div>

          <!-- Toggle -->
          <label class="seed-toggle">
            <div
              class="toggle-track"
              :class="{ on: acknowledged }"
              role="switch"
              :aria-checked="acknowledged"
              tabindex="0"
              @click="acknowledged = !acknowledged"
              @keydown.enter="acknowledged = !acknowledged"
              @keydown.space.prevent="acknowledged = !acknowledged"
            >
              <div class="toggle-thumb" />
            </div>
            <span>Anoté la frase y la guardé en un lugar seguro</span>
          </label>
        </div>

        <!-- ── STEP 5: Verify ── -->
        <div v-else-if="step === 5" class="wcf-body">
          <p class="verify-desc">Para asegurarnos de que la copiaste bien, ingresá estas 3 palabras.</p>
          <div class="verify-fields">
            <div v-for="(pos, i) in challenge" :key="i" class="field">
              <label class="field-label">Palabra #{{ pos + 1 }}</label>
              <input
                v-model="answers[i]"
                class="field-input"
                :class="{
                  'input-ok':  answers[i].trim() && answerValid[i],
                  'input-err': answers[i].trim() && !answerValid[i],
                }"
                :placeholder="`Palabra ${pos + 1}…`"
                autocomplete="off"
                spellcheck="false"
              />
            </div>
          </div>
          <div v-if="allCorrect" class="verify-ok">
            <span class="pi pi-check-circle" aria-hidden="true" />
            Las 3 palabras coinciden
          </div>
        </div>

        <!-- ── STEP 6: Done ── -->
        <div v-else class="wcf-body done-body">
          <div class="done-circle">
            <span class="pi pi-check" aria-hidden="true" />
          </div>
          <h3 class="done-title">Wallet {{ selectedCurrency }} creada</h3>
          <p v-if="label" class="done-label">{{ label }}</p>

          <div class="done-addr-wrap">
            <div class="done-addr-label">TU DIRECCIÓN</div>
            <button class="done-addr-chip" @click="copyAddress">
              <span class="mono done-addr-text">{{ createdWalletId }}</span>
              <span
                :class="'pi ' + (addrCopied ? 'pi-check' : 'pi-copy')"
                :style="{ color: addrCopied ? 'var(--success)' : 'var(--accent)' }"
                aria-hidden="true"
              />
            </button>
          </div>

          <div class="done-info">
            <span class="pi pi-info-circle" aria-hidden="true" />
            <span>Próximo paso: Recibí tu primer depósito desde otra wallet o desde tesorería.</span>
          </div>
        </div>

        <!-- ── Footer ── -->
        <div class="wcf-footer">
          <!-- Step 0 -->
          <template v-if="step === 0">
            <button class="btn" @click="onClose">Cancelar</button>
            <button class="btn btn-dark" :disabled="loading" @click="goNext">
              <span v-if="loading" class="pi pi-spin pi-spinner" aria-hidden="true" />
              {{ loading ? 'Preparando…' : 'Continuar' }}
            </button>
          </template>

          <!-- Steps 1-3: Aprender -->
          <template v-else-if="step === 1">
            <button class="btn" @click="goBack">Atrás</button>
            <button class="btn btn-dark" @click="goNext">Entendido, ¿y si la pierdo?</button>
          </template>
          <template v-else-if="step === 2">
            <button class="btn" @click="goBack">Atrás</button>
            <button class="btn btn-dark" @click="goNext">¿Cómo la guardo bien?</button>
          </template>
          <template v-else-if="step === 3">
            <button class="btn" @click="goBack">Atrás</button>
            <button class="btn btn-dark" @click="goNext">Mostrar mi frase</button>
          </template>

          <!-- Step 4: Frase -->
          <template v-else-if="step === 4">
            <button class="btn" @click="goBack">Atrás</button>
            <button
              class="btn btn-dark"
              :disabled="!revealed || !acknowledged"
              @click="goNext"
            >
              Verificar que la anoté
            </button>
          </template>

          <!-- Step 5: Verify -->
          <template v-else-if="step === 5">
            <button class="btn" @click="goBack">Volver a la frase</button>
            <button
              class="btn btn-dark"
              :disabled="!allCorrect || submitting"
              @click="createWallet"
            >
              <span v-if="submitting" class="pi pi-spin pi-spinner" aria-hidden="true" />
              {{ submitting ? 'Creando…' : 'Crear wallet' }}
            </button>
          </template>

          <!-- Step 6: Done -->
          <template v-else>
            <button class="btn" @click="onClose">Cerrar</button>
            <button class="btn btn-dark" @click="onReceive">
              <span class="pi pi-download" aria-hidden="true" />
              Recibir mi primer depósito
            </button>
          </template>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Scrim + modal shell ── */
.wcf-scrim {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}
.wcf-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 560px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 64px rgba(0,0,0,.28);
}

/* ── Header ── */
.wcf-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 22px 24px 14px;
  border-bottom: 1px solid var(--border);
}
.wcf-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 3px;
  color: var(--text);
  letter-spacing: -0.01em;
}
.wcf-sub {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
}
.wcf-close {
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-3);
  display: grid; place-items: center;
  cursor: pointer;
  font-size: 11px;
  flex-shrink: 0;
  transition: background 0.12s;
}
.wcf-close:hover { background: var(--surface); color: var(--text); }

/* ── Stepper ── */
.wcf-stepper {
  display: flex;
  align-items: center;
  padding: 14px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
  gap: 0;
  overflow-x: auto;
}
.step-item {
  display: flex; align-items: center; gap: 6px;
  flex-shrink: 0;
}
.step-num {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--surface-2);
  border: 1.5px solid var(--border);
  color: var(--text-3);
  font-size: 11px; font-weight: 600;
  display: grid; place-items: center;
  transition: all 0.15s;
}
.step-done .step-num  { background: var(--success); border-color: var(--success); color: #fff; }
.step-active .step-num { background: #1a1917; border-color: #1a1917; color: #faf9f6; }
.step-label {
  font-size: 12px; color: var(--text-3);
  white-space: nowrap;
}
.step-done .step-label  { color: var(--text-2); }
.step-active .step-label { font-weight: 700; color: var(--text); }
.step-line {
  flex: 1; height: 1.5px; background: var(--border); margin: 0 8px; min-width: 12px;
}
.step-line.done { background: var(--success); }

/* ── Body ── */
.wcf-body {
  flex: 1;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Fields ── */
.field { display: flex; flex-direction: column; gap: 5px; }
.field-label {
  font-size: 11.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--text-2);
}
.opt { font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--text-3); font-size: 11px; }
.field-input {
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  font-size: 13.5px;
  font-family: var(--font-sans);
  outline: none;
  transition: border-color 0.12s;
}
.field-input:focus { border-color: #1a1917; }

/* ── Currency list ── */
.currency-list {
  display: flex; flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.currency-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
  cursor: pointer;
  transition: background 0.12s;
  border-bottom: 1px solid var(--border);
}
.currency-item:last-child { border-bottom: none; }
.currency-item:hover { background: var(--surface-2); }
.currency-item.selected { background: color-mix(in srgb, #1a1917 5%, var(--surface)); }
.currency-radio { display: none; }
.currency-icon {
  width: 32px; height: 32px; border-radius: 50%;
  color: #fff; font-size: 13px; font-weight: 700;
  display: grid; place-items: center; flex-shrink: 0;
}
.currency-text { display: flex; flex-direction: column; gap: 1px; flex: 1; }
.currency-name { font-size: 13.5px; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 6px; }
.currency-desc { font-size: 12px; color: var(--text-3); }
.badge-rec {
  font-size: 10px; font-weight: 600;
  background: color-mix(in srgb, var(--success) 15%, var(--surface));
  color: var(--success);
  padding: 1px 6px; border-radius: 10px;
}
/* Show radio indicator via border */
.currency-item.selected .currency-icon { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px #1a1917; }

/* ── Education screens ── */
.edu-icon {
  width: 72px; height: 72px; border-radius: 18px;
  display: grid; place-items: center;
  font-size: 32px; margin: 0 auto 4px;
}
.edu-icon-blue  { background: color-mix(in srgb, #4263eb 15%, var(--surface)); }
.edu-icon-red   { background: color-mix(in srgb, #e03131 15%, var(--surface)); }
.edu-icon-green { background: color-mix(in srgb, #2f9e44 15%, var(--surface)); }

.edu-cards { display: flex; flex-direction: column; gap: 8px; }
.edu-card {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 14px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 13px;
  line-height: 1.5;
}
.edu-card strong { display: block; font-size: 13.5px; margin-bottom: 2px; color: var(--text); }
.edu-card p { margin: 0; color: var(--text-2); }
.edu-card-icon {
  width: 32px; height: 32px; border-radius: 50%;
  display: grid; place-items: center; flex-shrink: 0; font-size: 14px;
}

/* Risk cards */
.edu-card.risk { border-color: color-mix(in srgb, #e03131 20%, var(--border)); }
.risk-x {
  width: 24px; height: 24px; border-radius: 50%;
  background: color-mix(in srgb, #e03131 15%, var(--surface));
  color: #e03131; font-size: 13px; font-weight: 700;
  display: grid; place-items: center; flex-shrink: 0;
}

/* Good cards */
.edu-card.good { border-color: color-mix(in srgb, var(--success) 20%, var(--border)); }
.good-check {
  width: 24px; height: 24px; border-radius: 50%;
  background: color-mix(in srgb, var(--success) 15%, var(--surface));
  color: var(--success); font-size: 13px; font-weight: 700;
  display: grid; place-items: center; flex-shrink: 0;
}

/* Never box */
.never-box {
  background: color-mix(in srgb, #e03131 8%, var(--surface));
  border: 1px solid color-mix(in srgb, #e03131 22%, var(--border));
  border-radius: var(--radius);
  padding: 12px 14px;
}
.never-title {
  font-size: 13px; font-weight: 800;
  color: #e03131; text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex; align-items: center; gap: 5px;
  margin-bottom: 10px;
}
.never-list {
  list-style: none; margin: 0; padding: 0;
  font-size: 13.5px; font-weight: 500;
  color: var(--text); line-height: 1.9;
}

/* ── Seed step ── */
.seed-warning {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 14px;
  background: color-mix(in srgb, var(--warning) 10%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--warning) 25%, var(--border));
  border-radius: var(--radius);
  font-size: 13px; color: var(--text-2); line-height: 1.5;
}
.seed-warning .pi { color: var(--warning); flex-shrink: 0; margin-top: 1px; font-size: 14px; }
.seed-warning strong { color: var(--text); }

.seed-container { position: relative; }
.seed-container.blurred .seed-grid { filter: blur(8px); pointer-events: none; user-select: none; }

.seed-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 16px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}
.seed-chip {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 13px;
}
.seed-num {
  font-size: 10.5px; color: var(--text-3);
  font-weight: 600; min-width: 14px; text-align: right;
}
.seed-word {
  font-family: var(--font-mono);
  font-weight: 600; color: var(--text);
  font-size: 13px;
}

.seed-overlay {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 8px; cursor: pointer;
  background: color-mix(in srgb, var(--surface) 60%, transparent);
  border-radius: var(--radius-lg);
  text-align: center; padding: 16px;
}
.seed-lock-circle {
  width: 56px; height: 56px; border-radius: 50%;
  background: #1a1917; color: #faf9f6;
  display: grid; place-items: center; font-size: 22px;
  margin-bottom: 4px;
}
.seed-overlay-title {
  font-size: 15px; font-weight: 700; color: var(--text); margin: 0;
}
.seed-overlay-sub {
  font-size: 12px; color: var(--text-2); margin: 0; max-width: 260px;
}

.seed-actions { display: flex; gap: 8px; }
.seed-actions .btn { flex: 1; justify-content: center; }

.seed-toggle {
  display: flex; align-items: center; gap: 10px;
  cursor: pointer; font-size: 13px; color: var(--text-2);
  user-select: none;
}
.toggle-track {
  width: 40px; height: 22px; border-radius: 11px;
  background: var(--border);
  position: relative; flex-shrink: 0;
  transition: background 0.2s;
  cursor: pointer; outline: none;
}
.toggle-track.on { background: #1a1917; }
.toggle-track:focus-visible { box-shadow: 0 0 0 2px var(--accent); }
.toggle-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 18px; height: 18px; border-radius: 50%;
  background: #fff; transition: left 0.2s;
}
.toggle-track.on .toggle-thumb { left: 20px; }

/* ── Verify step ── */
.verify-desc {
  margin: 0; font-size: 13.5px; color: var(--text-2); line-height: 1.5;
}
.verify-fields { display: flex; flex-direction: column; gap: 12px; }
.input-ok  { border-color: var(--success) !important; }
.input-err { border-color: var(--danger)  !important; }
.verify-ok {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 600; color: var(--success);
  padding: 8px 12px;
  background: color-mix(in srgb, var(--success) 10%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--success) 25%, var(--border));
  border-radius: var(--radius);
}

/* ── Done step ── */
.done-body { align-items: center; text-align: center; padding: 28px 24px; }
.done-circle {
  width: 72px; height: 72px; border-radius: 50%;
  background: color-mix(in srgb, var(--success) 15%, var(--surface));
  color: var(--success);
  display: grid; place-items: center; font-size: 30px;
  margin-bottom: 8px;
}
.done-title { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text); }
.done-label { margin: 0 0 12px; font-size: 13.5px; color: var(--text-2); }

.done-addr-wrap { width: 100%; }
.done-addr-label {
  font-size: 10.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--text-3); margin-bottom: 6px;
}
.done-addr-chip {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 10px 14px;
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: var(--radius); cursor: pointer;
  transition: border-color 0.12s;
}
.done-addr-chip:hover { border-color: var(--accent); }
.done-addr-text {
  flex: 1; text-align: left; font-size: 12px;
  word-break: break-all; color: var(--text);
}
.done-info {
  display: flex; align-items: flex-start; gap: 6px;
  font-size: 12.5px; color: var(--text-3);
  line-height: 1.5; margin-top: 4px;
  text-align: left;
}
.done-info .pi { flex-shrink: 0; margin-top: 1px; }

/* ── Footer ── */
.wcf-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
  border-radius: 0 0 16px 16px;
}
.btn-dark {
  background: #1a1917;
  border-color: #1a1917;
  color: #faf9f6 !important;
  font-weight: 600;
}
.btn-dark:hover:not(:disabled) { background: #2e2b27; border-color: #2e2b27; color: #faf9f6 !important; }
.btn-dark:disabled { opacity: 0.45; cursor: not-allowed; }

/* Utils */
.mono { font-family: var(--font-mono); }
</style>
