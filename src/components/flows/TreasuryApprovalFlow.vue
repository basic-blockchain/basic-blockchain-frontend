<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { useToast } from '@/composables/useToast'
import Stepper, { type Step } from '@/components/atoms/Stepper.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import {
  approveTreasuryDistribution,
  cancelTreasuryDistribution,
  initiateTreasuryDistribution,
} from '@/api/admin'

export interface TreasuryData {
  source: string
  destination: string
  amount: string
  perWallet: string
  asset: string
  source_wallet_id: string
  recipient_user_ids: string[]
  currency: string
  memo?: string | null
}

const props = defineProps<{ data: TreasuryData }>()
const emit = defineEmits<{ close: []; complete: [] }>()
const toast = useToast()

const step = ref(0)
const pwd = ref('')
const approver2Signed = ref(false)
const operationId = ref('')
const busy = ref(false)
const progress = ref(0)
let intervalId: ReturnType<typeof setInterval> | null = null

// Phase 7.8: cancellation path. The simulator's treasury state
// machine is `pending_approval → executed | cancelled` — there is
// no rejection by second approver; instead, the INITIATOR can
// cancel via POST /api/v1/admin/treasury/distribute/<op_id>/cancel
// (BR-TR-06). This local state mirrors that semantics: a
// "Cancelar" affordance flips the current Stepper step to error,
// shows a "Operación cancelada" banner. Backend wiring lands in
// Phase 7.8.1.
const cancelledStep = ref<number | null>(null)

const baseSteps: Step[] = [
  { key: 'review', label: 'Revisar' },
  { key: 'sign', label: 'Firmar' },
  { key: 'approve', label: '2ª aprobación' },
  { key: 'execute', label: 'Ejecutado' },
]

const stepsWithStatus = computed<Step[]>(() =>
  baseSteps.map((s, i) => (i === cancelledStep.value ? { ...s, status: 'error' as const } : s))
)

function cancel() {
  cancelledStep.value = step.value
}

function normalizeAmount(value: string): string {
  return value.replace(/,/g, '').trim()
}

async function startDistribution() {
  if (busy.value) {
    return
  }
  if (!props.data.source_wallet_id || props.data.recipient_user_ids.length === 0) {
    toast.add({
      severity: 'error',
      summary: 'Distribución inválida',
      detail: 'Faltan datos de tesorería o destinatarios.',
      life: 4000,
    })
    return
  }

  busy.value = true
  try {
    const record = await initiateTreasuryDistribution({
      source_wallet_id: props.data.source_wallet_id,
      currency: props.data.currency,
      amount_per_wallet: normalizeAmount(props.data.perWallet),
      recipient_user_ids: props.data.recipient_user_ids,
      memo: props.data.memo ?? null,
    })
    operationId.value = record.op_id
    toast.add({
      severity: 'success',
      summary: 'Distribución iniciada',
      detail: record.op_id,
      life: 3000,
    })
    step.value = 2
  } catch (e: unknown) {
    toast.add({
      severity: 'error',
      summary: 'No se pudo iniciar',
      detail: e instanceof Error ? e.message : 'Error',
      life: 5000,
    })
  } finally {
    busy.value = false
  }
}

async function approveDistribution() {
  if (busy.value || !operationId.value) {
    return
  }

  busy.value = true
  try {
    await approveTreasuryDistribution(operationId.value)
    approver2Signed.value = true
    step.value = 3
    toast.add({
      severity: 'success',
      summary: 'Distribución aprobada',
      detail: operationId.value,
      life: 3000,
    })
  } catch (e: unknown) {
    toast.add({
      severity: 'error',
      summary: 'No se pudo aprobar',
      detail: e instanceof Error ? e.message : 'Error',
      life: 5000,
    })
  } finally {
    busy.value = false
  }
}

async function cancelDistribution() {
  if (busy.value || !operationId.value) {
    return
  }

  busy.value = true
  try {
    await cancelTreasuryDistribution(operationId.value)
    cancel()
    toast.add({
      severity: 'warn',
      summary: 'Distribución cancelada',
      detail: operationId.value,
      life: 3000,
    })
  } catch (e: unknown) {
    toast.add({
      severity: 'error',
      summary: 'No se pudo cancelar',
      detail: e instanceof Error ? e.message : 'Error',
      life: 5000,
    })
  } finally {
    busy.value = false
  }
}

watch(step, (s) => {
  if (s === 3) {
    progress.value = 0
    intervalId = setInterval(() => {
      progress.value += 100 / 25
      if (progress.value >= 100) {
        progress.value = 100
        clearInterval(intervalId!)
        step.value = 4
      }
    }, 80)
  }
})
onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})

const approvers = [
  {
    name: 'María Acosta',
    email: 'admin@cadena.io',
    me: true,
    get status() {
      return 'signed'
    },
    when: 'hace 8 s',
  },
  {
    name: 'Sergio Romero',
    email: 'sergio@cadena.io',
    me: false,
    get status() {
      return approver2Signed.value ? 'signed' : 'pending'
    },
    get when() {
      return approver2Signed.value ? 'hace 2 s' : 'en línea · pendiente'
    },
  },
  { name: 'Daniela Kim', email: 'daniela@cadena.io', me: false, status: 'idle', when: 'en línea' },
  { name: 'Pablo Iturri', email: 'pablo@cadena.io', me: false, status: 'idle', when: 'offline' },
  { name: 'Renata Vega', email: 'renata@cadena.io', me: false, status: 'idle', when: 'offline' },
]

const confirmations = () => Math.floor((progress.value / 100) * 12)
</script>

<template>
  <div class="modal-scrim" @click.self="emit('close')">
    <div class="modal" style="width: 600px">
      <div class="modal-h" style="padding-bottom: 18px">
        <div style="display: flex; align-items: center; justify-content: space-between">
          <div>
            <h2>Distribución de tesorería</h2>
            <p style="margin-top: 4px">Requiere doble aprobación (2 de 5 administradores).</p>
          </div>
          <button class="btn btn-icon btn-ghost" @click="emit('close')">
            <span class="pi pi-times" />
          </button>
        </div>
        <Stepper :steps="stepsWithStatus" :current="Math.min(step, 3)" />
        <div v-if="cancelledStep !== null" class="reject-banner">
          <span class="pi pi-times-circle" aria-hidden="true" />
          <span
            >Operación cancelada por el iniciador. Cerrá esta ventana para volver al panel.</span
          >
        </div>
      </div>

      <div class="modal-b">
        <!-- Step 0: Review -->
        <template v-if="step === 0">
          <div class="flow-card" style="padding: 14px">
            <div
              v-for="([label, value], i) in [
                ['Operación', 'Distribución a usuarios (lote)'],
                ['Origen', `${data.source} · 4.8M disponible`],
                ['Destino', data.destination],
                ['Monto total', `${data.amount} ${data.asset}`],
                ['Por wallet', `${data.perWallet} ${data.asset}`],
                ['Valor USD', `≈ $${data.amount} USD`],
                ['Solicitante', 'admin@cadena.io'],
              ]"
              :key="label"
              class="detail-row"
              :style="{
                borderBottom: i < 6 ? '1px solid var(--border)' : 'none',
                fontSize: '12.5px',
              }"
            >
              <span class="muted">{{ label }}</span>
              <span class="mono" style="font-weight: 500">{{ value }}</span>
            </div>
          </div>

          <div class="warn-box warn-box-info">
            <span class="pi pi-shield" style="font-size: 14px; flex-shrink: 0; margin-top: 1px" />
            <div>
              <b>Política de aprobación dual.</b> Esta operación va a la cola hasta que un segundo
              administrador firme. Si nadie firma en 24 h, expira.
            </div>
          </div>
        </template>

        <!-- Step 1: Sign -->
        <template v-else-if="step === 1">
          <div style="text-align: center; padding: 8px 0 16px">
            <div class="lock-icon">
              <span class="pi pi-lock" style="font-size: 22px" />
            </div>
            <div style="font-size: 16px; font-weight: 600">Firmá la operación</div>
            <div class="muted" style="font-size: 12.5px; margin-top: 4px">
              Ingresá tu clave de transacción + código del autenticador.
            </div>
          </div>
          <div class="fld">
            <label>Clave de transacción</label>
            <input v-model="pwd" type="password" placeholder="••••••••••" autofocus />
          </div>
          <div class="fld">
            <label>Código 2FA</label>
            <div class="otp-grid">
              <div
                v-for="d in ['4', '9', '2', '7', '1', '3']"
                :key="d"
                class="otp-cell filled"
                style="pointer-events: none"
              >
                {{ d }}
              </div>
            </div>
          </div>
        </template>

        <!-- Steps 2-3: Waiting / Executing -->
        <template v-else-if="step === 2 || step === 3">
          <div style="text-align: center; padding: 8px 0 16px">
            <div class="status-icon" :class="approver2Signed ? 'signed' : 'waiting'">
              <div v-if="!approver2Signed" class="spinner" style="width: 22px; height: 22px" />
              <span v-else class="pi pi-check" style="font-size: 20px" />
            </div>
            <div style="font-size: 16px; font-weight: 600">
              {{
                step === 3
                  ? 'Ejecutando en blockchain…'
                  : approver2Signed
                    ? 'Ambas firmas listas'
                    : 'Esperando 2ª aprobación'
              }}
            </div>
            <div class="muted" style="font-size: 12.5px; margin-top: 4px">
              {{
                step === 3
                  ? 'Emitiendo a 41 wallets · podés cerrar este modal'
                  : approver2Signed
                    ? 'Tocá "Ejecutar ahora" para emitir'
                    : 'Sergio R. y Daniela K. están en línea'
              }}
            </div>
          </div>

          <div class="flow-card">
            <div
              v-for="(a, i) in approvers"
              :key="a.email"
              class="approver-row"
              :style="{
                borderBottom: i < approvers.length - 1 ? '1px solid var(--border)' : 'none',
              }"
            >
              <div class="approver-avatar">
                {{ a.name[0] }}
              </div>
              <div style="flex: 1">
                <div style="font-size: 13px; font-weight: 500">
                  {{ a.name }} <span v-if="a.me" class="muted" style="font-weight: 400">(vos)</span>
                </div>
                <div class="muted mono" style="font-size: 11px">
                  {{ a.email }}
                </div>
              </div>
              <div style="text-align: right">
                <span
                  class="bdg"
                  :class="
                    a.status === 'signed'
                      ? 'bdg-active'
                      : a.status === 'pending'
                        ? 'bdg-pending_kyc'
                        : 'bdg-deleted'
                  "
                >
                  {{
                    a.status === 'signed' ? 'Firmado' : a.status === 'pending' ? 'Notificado' : '—'
                  }}
                </span>
                <div class="muted" style="font-size: 10.5px; margin-top: 3px">
                  {{ a.when }}
                </div>
              </div>
            </div>
          </div>

          <template v-if="step === 3">
            <div
              style="
                font-size: 11px;
                color: var(--text-3);
                display: flex;
                justify-content: space-between;
                margin-bottom: 4px;
              "
            >
              <span>Confirmaciones blockchain · {{ confirmations() }}/12</span>
              <span>{{ Math.floor(progress) }}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill success" :style="{ width: progress + '%' }" />
            </div>
          </template>
        </template>

        <!-- Step 4: Done -->
        <template v-else>
          <div style="text-align: center; padding: 20px 0 8px">
            <div class="success-circle">
              <span class="pi pi-check" style="font-size: 32px" />
            </div>
            <div
              style="font-size: 20px; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 4px"
            >
              Operación ejecutada
            </div>
            <div class="muted" style="font-size: 13px">
              41 wallets recibieron {{ data.perWallet }} {{ data.asset }} · TX 0x4f1a…d77e
            </div>
          </div>
          <div class="flow-card" style="padding: 14px; margin-top: 14px">
            <div
              v-for="([label, value], i) in [
                ['Wallets impactadas', '41'],
                ['Total emitido', `${data.amount} ${data.asset}`],
                ['Comisión de red', '0.0021 ETH ≈ $7.25'],
                ['Firmas', 'María A. · Sergio R.'],
                ['Hash de aprobación', '0xa8c4…11e9'],
                ['Anclado en auditoría', '✓ inmutable'],
              ]"
              :key="label"
              class="detail-row"
              :style="{
                borderBottom: i < 5 ? '1px solid var(--border)' : 'none',
                fontSize: '12.5px',
              }"
            >
              <span class="muted">{{ label }}</span>
              <span class="mono" style="font-weight: 500">{{ value }}</span>
            </div>
          </div>
        </template>
      </div>

      <div class="modal-f">
        <template v-if="step === 0">
          <button class="btn" @click="emit('close')">Cancelar</button>
          <button class="btn btn-primary" @click="step = 1">Firmar y enviar</button>
        </template>
        <template v-else-if="step === 1">
          <button class="btn" @click="step = 0">Atrás</button>
          <button class="btn btn-primary" :disabled="!pwd || busy" @click="startDistribution">
            Firmar operación
          </button>
        </template>
        <template v-else-if="step === 2">
          <button class="btn" @click="emit('close')">Cerrar (queda en cola)</button>
          <BaseButton
            v-if="!approver2Signed && cancelledStep === null"
            variant="danger"
            :loading="busy"
            @click="cancelDistribution"
          >
            Cancelar operación
          </BaseButton>
          <button
            v-if="!approver2Signed && cancelledStep === null"
            class="btn btn-primary"
            :disabled="busy"
            @click="approveDistribution"
          >
            Aprobar ahora
          </button>
          <button
            v-else-if="approver2Signed && cancelledStep === null"
            class="btn btn-primary"
            @click="step = 3"
          >
            Ejecutar ahora
          </button>
        </template>
        <template v-else-if="step === 3">
          <button class="btn" @click="emit('close')">Cerrar (sigue corriendo)</button>
        </template>
        <template v-else>
          <button class="btn" @click="emit('close')">Cerrar</button>
          <button
            class="btn btn-primary"
            @click="
              emit('complete')
              emit('close')
            "
          >
            Ver en auditoría
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reject-banner {
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--danger-soft);
  border: 1px solid var(--danger);
  border-radius: var(--radius);
  color: var(--danger);
  font-size: 12.5px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
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
.status-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin: 0 auto 12px;
}
.status-icon.waiting {
  background: var(--warning-soft);
  color: var(--warning);
}
.status-icon.signed {
  background: var(--success-soft);
  color: var(--success);
}
.approver-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
}
.approver-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent-text);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}
.success-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--success-soft);
  color: var(--success);
  display: grid;
  place-items: center;
  margin: 0 auto 16px;
}
</style>
