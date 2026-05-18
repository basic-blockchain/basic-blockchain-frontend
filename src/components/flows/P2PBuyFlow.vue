<script setup lang="ts">
import { ref, computed } from 'vue'
import Stepper from '@/components/atoms/Stepper.vue'

export interface P2POffer {
  id: string
  name: string
  verified: boolean
  completed: number
  rate: number
  price: string
  limitMin: number
  limitMax: number
  methods: string[]
  asset: string
  online: boolean
}

const props = defineProps<{ offer: P2POffer }>()
const emit = defineEmits<{
  close: []
  complete: [{ amount: string; asset: string }]
}>()

const step = ref(0)
const amount = ref('500.00')
const method = ref(props.offer.methods[0] ?? '')

const steps = [
  { key: 'amount', label: 'Monto' },
  { key: 'pay', label: 'Pagar' },
  { key: 'wait', label: 'Esperar' },
  { key: 'received', label: 'Recibido' },
]

const arsTotal = computed(() => {
  const a = parseFloat(amount.value.replace(',', '')) || 0
  const p = parseFloat(props.offer.price.replace(',', '')) || 0
  return (a * p).toFixed(2)
})

const limit = computed(() => `${props.offer.limitMin}–${props.offer.limitMax}`)

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}
</script>

<template>
  <div class="modal-scrim" @click.self="emit('close')">
    <div class="modal" style="width: 560px">
      <div class="modal-h" style="padding-bottom: 18px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0">
          <h2>Comprar {{ offer.asset }}</h2>
          <button class="btn btn-icon btn-ghost" @click="emit('close')">
            <span class="pi pi-times" />
          </button>
        </div>
        <Stepper :steps="steps" :current="step" />
      </div>

      <div class="modal-b">
        <!-- Step 0: Amount -->
        <template v-if="step === 0">
          <div class="flow-card" style="padding:14px">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="avatar-circle">{{ offer.name[0] }}</div>
              <div style="flex:1">
                <div style="font-weight:600;font-size:13px">
                  {{ offer.name }}
                  <span v-if="offer.verified" class="verified-dot">● verificado</span>
                </div>
                <div class="muted" style="font-size:11.5px">
                  {{ offer.completed.toLocaleString('es-AR') }} operaciones · {{ offer.rate }}% completadas · tiempo medio 4 min
                </div>
              </div>
              <div style="text-align:right">
                <div class="mono" style="font-size:18px;font-weight:700">${{ offer.price }}</div>
                <div class="muted" style="font-size:10.5px">ARS / {{ offer.asset }}</div>
              </div>
            </div>
          </div>

          <div class="fld">
            <label>Quiero comprar</label>
            <div style="position:relative">
              <input v-model="amount" class="mono" style="font-size:18px;height:44px;font-weight:500" />
              <span class="input-suffix">{{ offer.asset }}</span>
            </div>
            <div class="muted" style="font-size:11.5px;margin-top:4px">
              Pagás aproximadamente <b class="mono" style="color:var(--text)">${{ arsTotal }}</b> ARS · Límite: {{ limit }} {{ offer.asset }}
            </div>
          </div>

          <div class="fld">
            <label>Método de pago</label>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              <button
                v-for="m in offer.methods"
                :key="m"
                class="chip"
                :class="{ active: method === m }"
                @click="method = m"
              >{{ m }}</button>
            </div>
          </div>

          <div class="warn-box warn-box-info">
            <span class="pi pi-shield" style="font-size:14px;flex-shrink:0;margin-top:1px" />
            <div>Tus fondos quedan bloqueados en escrow. Si el vendedor no libera, podés abrir una disputa con compliance.</div>
          </div>
        </template>

        <!-- Step 1: Pay -->
        <template v-else-if="step === 1">
          <div style="text-align:center;margin-bottom:16px">
            <div class="muted" style="font-size:11.5px;text-transform:uppercase;letter-spacing:0.04em">Tenés que transferir</div>
            <div class="mono" style="font-size:32px;font-weight:600;letter-spacing:-0.02em">${{ arsTotal }}</div>
            <div class="muted" style="font-size:12px">ARS · vía {{ method }}</div>
          </div>

          <div class="flow-card" style="padding:14px">
            <div style="font-size:12px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:10px">
              Datos del vendedor
            </div>
            <div
              v-for="([label, value]) in [
                ['Nombre', offer.name + ' (verificado)'],
                ['CBU / CVU', '0000003100099876543210'],
                ['Alias', 'cripto.maria.usdt'],
                ['Concepto', 'P2P-' + offer.id.slice(0,8).toUpperCase()],
              ]"
              :key="label"
              class="detail-row"
            >
              <span class="muted" style="font-size:12px">{{ label }}</span>
              <span class="mono" style="font-size:12px;font-weight:500;display:inline-flex;align-items:center;gap:6px">
                {{ value }}
                <button class="copy-btn" @click="copyText(value)">
                  <span class="pi pi-copy" style="font-size:12px" />
                </button>
              </span>
            </div>
          </div>

          <div class="warn-box">
            <span class="pi pi-exclamation-triangle" style="font-size:14px;flex-shrink:0;margin-top:1px" />
            <div>
              Transferí <b>desde una cuenta a tu nombre</b>. No incluyas referencias a cripto en el motivo.
              Después tocá "Marcar pago realizado".
            </div>
          </div>
        </template>

        <!-- Step 2: Wait -->
        <template v-else-if="step === 2">
          <div style="text-align:center;padding:12px 0 18px">
            <div class="spinner-wrap">
              <div class="spinner" style="width:24px;height:24px" />
            </div>
            <div style="font-size:16px;font-weight:600;margin-bottom:4px">Esperando confirmación del vendedor</div>
            <div class="muted" style="font-size:12.5px">
              {{ offer.name }} tiene hasta <b style="color:var(--text)">15 minutos</b> para liberar los {{ offer.asset }}.
            </div>
          </div>

          <div class="flow-card" style="padding:14px;background:var(--surface-2)">
            <div style="font-size:12px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:10px">
              Chat con vendedor
            </div>
            <div
              v-for="(msg, i) in [
                { who: 'sys', text: `Operación iniciada · ${amount} ${offer.asset}`, t: 'hace 2 min' },
                { who: 'you', text: 'Hola, ya hice la transferencia.', t: 'hace 1 min' },
                { who: 'them', text: '¡Recibido! Te libero ahora mismo 👍', t: 'hace 12 s' },
              ]"
              :key="i"
              class="chat-row"
              :class="msg.who"
            >
              <div class="chat-bubble" :class="msg.who">
                <span v-if="msg.who === 'sys'" class="muted" style="font-size:10.5px">{{ msg.text }}</span>
                <template v-else>{{ msg.text }}</template>
              </div>
            </div>
          </div>

          <div style="display:flex;gap:6px">
            <input placeholder="Escribir mensaje…" class="chat-input" />
            <button class="btn btn-sm">Enviar</button>
          </div>

          <div style="text-align:center;font-size:11.5px;color:var(--danger)">
            <a href="#" style="color:inherit">Abrir disputa con compliance →</a>
          </div>
        </template>

        <!-- Step 3: Done -->
        <template v-else>
          <div style="text-align:center;padding:24px 0 8px">
            <div class="success-circle">
              <span class="pi pi-check" style="font-size:32px" />
            </div>
            <div style="font-size:20px;font-weight:600;letter-spacing:-0.01em;margin-bottom:4px">
              ¡Recibiste {{ amount }} {{ offer.asset }}!
            </div>
            <div class="muted" style="font-size:13px">El vendedor liberó los fondos · operación P2P-481928</div>
          </div>

          <div class="flow-card" style="padding:14px">
            <div
              v-for="([label, value], i) in [
                ['Recibido en wallet', `${amount} ${offer.asset} (≈ $${amount} USD)`],
                ['Pagaste', `$${arsTotal} ARS vía ${method}`],
                ['Tipo de cambio', `1 ${offer.asset} = ${offer.price} ARS`],
                ['Vendedor', offer.name],
                ['Comisión', 'Gratis'],
                ['Tiempo total', '3 min 24 s'],
              ]"
              :key="label"
              class="detail-row"
              :style="{ borderBottom: i < 5 ? '1px solid var(--border)' : 'none' }"
            >
              <span class="muted" style="font-size:12px">{{ label }}</span>
              <span class="mono" style="font-size:12px;font-weight:500">{{ value }}</span>
            </div>
          </div>
        </template>
      </div>

      <div class="modal-f">
        <template v-if="step === 0">
          <button class="btn" @click="emit('close')">Cancelar</button>
          <button class="btn btn-primary" @click="step = 1">Continuar al pago</button>
        </template>
        <template v-else-if="step === 1">
          <button class="btn" @click="step = 0">Atrás</button>
          <button class="btn btn-primary" @click="step = 2">Marcar pago realizado</button>
        </template>
        <template v-else-if="step === 2">
          <button class="btn" @click="emit('close')">Minimizar</button>
          <button class="btn btn-primary" @click="step = 3">
            <span class="muted" style="font-size:10.5px;font-weight:400;margin-right:6px;color:rgba(250,249,246,0.65)">(demo)</span>
            Simular liberación del vendedor
          </button>
        </template>
        <template v-else>
          <button class="btn" @click="emit('complete', { amount, asset: offer.asset }); emit('close')">Cerrar</button>
          <button class="btn btn-primary" @click="emit('complete', { amount, asset: offer.asset }); emit('close')">
            Ir a mi wallet
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.verified-dot { color: var(--success); font-size: 11px; margin-left: 4px; }

.avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent-text);
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

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
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}
.detail-row:last-child { border-bottom: none; }

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

.chat-row {
  display: flex;
  margin-bottom: 6px;
}
.chat-row.you { justify-content: flex-end; }
.chat-row.sys { justify-content: center; }
.chat-row.them { justify-content: flex-start; }

.chat-bubble {
  max-width: 75%;
  padding: 6px 10px;
  border-radius: 12px;
  font-size: 12px;
}
.chat-bubble.you { background: var(--accent); color: #fff; }
.chat-bubble.them { background: var(--surface); border: 1px solid var(--border); color: var(--text); }
.chat-bubble.sys { background: transparent; border-radius: 999px; color: var(--text-3); padding: 3px 8px; }

.chat-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  font-family: var(--font-sans);
  background: var(--surface);
  color: var(--text);
  outline: none;
}
.chat-input:focus { border-color: var(--accent); }

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
