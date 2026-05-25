<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import Stepper from '@/components/atoms/Stepper.vue'

export interface WithdrawData {
  asset: string
  network?: string
  balance: string
}

const props = defineProps<{ data: WithdrawData }>()
const emit = defineEmits<{ close: []; complete: [] }>()

const step = ref(0)
const addr = ref('')
const pasted = ref('')
const amount = ref('250.00')
const otp = ref(['', '', '', '', '', ''])
const progress = ref(0)
const otpInputs = ref<HTMLInputElement[]>([])

const fee = '4.20'
const network = computed(() => props.data.network ?? 'Ethereum (ERC-20)')
const steps = [
  { key: 'data', label: 'Datos' },
  { key: 'verify', label: 'Verificar' },
  { key: '2fa', label: '2FA' },
  { key: 'sent', label: 'Enviado' },
]
const addrMatches = computed(() => pasted.value.length > 0 && pasted.value === addr.value)
const otpFilled = computed(() => otp.value.every((d) => d.length === 1))
const totalDebit = computed(() =>
  (parseFloat(amount.value.replace(',', '') || '0') + parseFloat(fee)).toFixed(2)
)

let intervalId: ReturnType<typeof setInterval> | null = null

function startBroadcast() {
  progress.value = 0
  intervalId = setInterval(() => {
    progress.value += 100 / 30
    if (progress.value >= 100) {
      progress.value = 100
      clearInterval(intervalId!)
      setTimeout(() => {
        step.value = 4
      }, 200)
    }
  }, 80)
}

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})

function setOtpDigit(i: number, v: string) {
  if (v && !/^\d$/.test(v)) return
  const next = [...otp.value]
  next[i] = v
  otp.value = next
  if (v && i < 5) otpInputs.value[i + 1]?.focus()
}

function otpKeydown(e: KeyboardEvent, i: number) {
  if (e.key === 'Backspace' && !otp.value[i] && i > 0) otpInputs.value[i - 1]?.focus()
}

const confirmations = computed(() => Math.floor((progress.value / 100) * 12))
const remainingBalance = computed(() => {
  const b = parseFloat(props.data.balance.replace(',', '')) || 0
  const a = parseFloat(amount.value.replace(',', '')) || 0
  return (b - a - parseFloat(fee)).toFixed(2)
})
</script>

<template>
  <div class="modal-scrim" @click.self="emit('close')">
    <div class="modal" style="width: 540px">
      <div class="modal-h" style="padding-bottom: 18px">
        <div style="display: flex; align-items: center; justify-content: space-between">
          <h2>Retirar {{ data.asset }} a una dirección externa</h2>
          <button class="btn btn-icon btn-ghost" @click="emit('close')">
            <span class="pi pi-times" />
          </button>
        </div>
        <Stepper :steps="steps" :current="Math.min(step, 3)" />
      </div>

      <div class="modal-b">
        <!-- Step 0: Address + Amount -->
        <template v-if="step === 0">
          <div class="warn-box">
            <span
              class="pi pi-exclamation-triangle"
              style="font-size: 14px; flex-shrink: 0; margin-top: 1px"
            />
            <div>
              <b>Los retiros on-chain son irreversibles.</b> Verificá la dirección y la red. Si te
              equivocás, no podemos recuperar los fondos.
            </div>
          </div>

          <div class="fld">
            <label>Red</label>
            <select v-model="network">
              <option>Ethereum (ERC-20)</option>
              <option>Polygon</option>
              <option>Tron (TRC-20)</option>
              <option>Solana</option>
            </select>
          </div>

          <div class="fld">
            <label>Dirección de destino</label>
            <input
              v-model="addr"
              class="mono"
              placeholder="0x… (pegá la dirección destino)"
              style="font-size: 12px"
            />
            <div class="muted" style="font-size: 11px; margin-top: 4px">
              O escaneá un QR · soportamos ENS y direcciones guardadas.
            </div>
          </div>

          <div class="fld">
            <label>Cantidad</label>
            <div style="position: relative">
              <input
                v-model="amount"
                class="mono"
                style="font-size: 18px; height: 44px; font-weight: 500"
              />
              <span class="input-suffix">{{ data.asset }}</span>
            </div>
            <div class="muted" style="font-size: 11px; margin-top: 4px">
              Disponible:
              <b class="mono" style="color: var(--text)">{{ data.balance }} {{ data.asset }}</b>
            </div>
            <div class="pct-row" style="margin-top: 8px">
              <button v-for="p in ['25%', '50%', '75%', 'MÁX']" :key="p" class="pct-btn">
                {{ p }}
              </button>
            </div>
          </div>

          <div class="flow-card" style="padding: 12px; background: var(--surface-2)">
            <div
              v-for="([label, value], i) in [
                ['Recibirás', `${amount} ${data.asset}`],
                ['Comisión de red', `${fee} ${data.asset} (≈ $${fee})`],
                ['Total debitado', `${totalDebit} ${data.asset}`],
                ['Tiempo estimado', '~ 3 minutos'],
              ]"
              :key="label"
              class="detail-row"
              :style="{ borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }"
            >
              <span class="muted" style="font-size: 12px">{{ label }}</span>
              <span class="mono" style="font-size: 12px; font-weight: 500">{{ value }}</span>
            </div>
          </div>
        </template>

        <!-- Step 1: Verify address -->
        <template v-else-if="step === 1">
          <div style="text-align: center; padding: 8px 0 16px">
            <div style="font-size: 16px; font-weight: 600">Confirmá la dirección de destino</div>
            <div class="muted" style="font-size: 12.5px; margin-top: 4px">
              Pegá de nuevo la dirección para verificarla.
            </div>
          </div>

          <div class="flow-card" style="padding: 12px; background: var(--surface-2)">
            <div
              class="muted"
              style="
                font-size: 10.5px;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                margin-bottom: 6px;
              "
            >
              Dirección original
            </div>
            <div class="mono" style="font-size: 12px; word-break: break-all">{{ addr }}</div>
          </div>

          <div class="fld">
            <label>Pegá la dirección de nuevo</label>
            <input
              v-model="pasted"
              class="mono"
              placeholder="0x…"
              style="font-size: 12px"
              :style="{
                borderColor: pasted ? (addrMatches ? 'var(--success)' : 'var(--danger)') : '',
              }"
            />
            <div
              v-if="pasted"
              style="
                font-size: 11.5px;
                margin-top: 6px;
                display: flex;
                align-items: center;
                gap: 5px;
              "
              :style="{ color: addrMatches ? 'var(--success)' : 'var(--danger)' }"
            >
              <span :class="addrMatches ? 'pi pi-check' : 'pi pi-times'" style="font-size: 12px" />
              {{ addrMatches ? 'Las direcciones coinciden' : 'Las direcciones no coinciden' }}
            </div>
          </div>

          <div class="warn-box warn-box-info">
            <span class="pi pi-shield" style="font-size: 14px; flex-shrink: 0; margin-top: 1px" />
            <div>
              Esta dirección no está en tu lista de contactos. La próxima vez podés guardarla para
              verificar más rápido.
            </div>
          </div>
        </template>

        <!-- Step 2: 2FA -->
        <template v-else-if="step === 2">
          <div style="text-align: center; padding: 8px 0 16px">
            <div class="lock-icon">
              <span class="pi pi-lock" style="font-size: 22px" />
            </div>
            <div style="font-size: 16px; font-weight: 600">Código 2FA</div>
            <div class="muted" style="font-size: 12.5px; margin-top: 4px">
              Ingresá el código de tu app autenticadora.
            </div>
          </div>

          <div class="otp-grid" style="justify-content: center">
            <input
              v-for="(d, i) in otp"
              :key="i"
              :ref="
                (el) => {
                  if (el) otpInputs[i] = el as HTMLInputElement
                }
              "
              class="otp-cell"
              :class="{ filled: !!d }"
              :value="d"
              maxlength="1"
              :autofocus="i === 0"
              @input="setOtpDigit(i, ($event.target as HTMLInputElement).value)"
              @keydown="otpKeydown($event, i)"
            />
          </div>
          <div style="text-align: center; font-size: 11px; color: var(--text-3); margin-top: 12px">
            Demo · cualquier código funciona
          </div>
        </template>

        <!-- Step 3: Broadcasting -->
        <template v-else-if="step === 3">
          <div style="text-align: center; padding: 24px 0 16px">
            <div class="spinner-wrap">
              <div class="spinner" style="width: 24px; height: 24px" />
            </div>
            <div style="font-size: 16px; font-weight: 600">Transmitiendo a la red</div>
            <div class="muted" style="font-size: 12.5px; margin-top: 4px">
              Confirmaciones: <b style="color: var(--text)">{{ confirmations }}</b> / 12
            </div>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: progress + '%' }" />
          </div>
          <div
            style="
              margin-top: 14px;
              font-size: 11px;
              color: var(--text-3);
              font-family: var(--font-mono);
            "
          >
            TX hash: <span style="color: var(--text-2)">0xa8c41f9d4c8b2e7…11e9</span>
          </div>
        </template>

        <!-- Step 4: Done -->
        <template v-else>
          <div style="text-align: center; padding: 20px 0 8px">
            <div class="success-circle">
              <span class="pi pi-check" style="font-size: 32px" />
            </div>
            <div class="mono" style="font-size: 22px; font-weight: 600; letter-spacing: -0.01em">
              −{{ amount }} {{ data.asset }}
            </div>
            <div class="muted" style="font-size: 13px">Retiro completado · 12 confirmaciones</div>
          </div>
          <div class="flow-card" style="padding: 14px; margin-top: 14px">
            <div
              v-for="([label, value], i) in [
                ['Destino', addr ? addr.slice(0, 12) + '…' + addr.slice(-6) : '0xa8c4…'],
                ['Red', network],
                ['Comisión', `${fee} ${data.asset}`],
                ['Saldo restante', `${remainingBalance} ${data.asset}`],
                ['TX hash', '0xa8c4…11e9'],
              ]"
              :key="label"
              class="detail-row"
              :style="{ borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }"
            >
              <span class="muted" style="font-size: 12px">{{ label }}</span>
              <span class="mono" style="font-size: 11.5px; font-weight: 500">{{ value }}</span>
            </div>
          </div>
        </template>
      </div>

      <div class="modal-f">
        <template v-if="step === 0">
          <BaseButton variant="ghost" @click="emit('close')">Cancelar</BaseButton>
          <BaseButton variant="primary" :disabled="!addr || !amount" @click="step = 1"
            >Verificar dirección</BaseButton
          >
        </template>
        <template v-else-if="step === 1">
          <BaseButton variant="ghost" @click="step = 0">Atrás</BaseButton>
          <BaseButton variant="primary" :disabled="!addrMatches" @click="step = 2"
            >Continuar</BaseButton
          >
        </template>
        <template v-else-if="step === 2">
          <BaseButton variant="ghost" @click="step = 1">Atrás</BaseButton>
          <BaseButton
            variant="primary"
            :disabled="!otpFilled"
            @click="step = 3; startBroadcast()"
            >Firmar y transmitir</BaseButton
          >
        </template>
        <template v-else-if="step === 3">
          <BaseButton variant="ghost" @click="emit('close')">Cerrar (sigue corriendo)</BaseButton>
        </template>
        <template v-else>
          <BaseButton variant="ghost" @click="emit('close')">Cerrar</BaseButton>
          <BaseButton
            variant="primary"
            @click="emit('complete'); emit('close')"
          >
            <span class="pi pi-external-link" style="font-size: 12px" />
            Ver en explorador
          </BaseButton>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.input-suffix {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--text-3);
  font-weight: 500;
}
.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 0;
}
.lock-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--text);
  color: var(--bg);
  display: grid;
  place-items: center;
  margin: 0 auto 12px;
}
.spinner-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  display: grid;
  place-items: center;
  margin: 0 auto 14px;
}
.success-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--success-soft);
  color: var(--success);
  display: grid;
  place-items: center;
  margin: 0 auto 14px;
}
</style>
