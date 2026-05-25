<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '@/components/atoms/BaseButton.vue'

export interface DisputeData {
  opId: string
  buyer: string
  seller: string
  amount: string
  asset: string
}

const props = defineProps<{ data: DisputeData }>()
const emit = defineEmits<{ close: []; complete: [] }>()

type Decision = 'buyer' | 'seller' | 'split' | 'escalate'
const decision = ref<Decision | null>(null)
const note = ref('')
const submitted = ref(false)

const decisionLabel: Record<Decision, string> = {
  buyer: 'Reembolsado al comprador',
  seller: 'Liberado al vendedor',
  split: 'Operación dividida 50/50',
  escalate: 'Escalado a legales',
}

function resolve(d: Decision) {
  decision.value = d
  submitted.value = true
}

const chat = [
  {
    who: 'sys',
    msg: `Operación P2P-${props.data.opId} iniciada · ${props.data.amount} ${props.data.asset}`,
    t: '17:42',
  },
  { who: 'buyer', msg: 'Hola, ya hice la transferencia de $2.27M ARS a tu CBU.', t: '17:48' },
  { who: 'seller', msg: 'No me llegó nada. ¿Cuándo la hiciste?', t: '17:58' },
  { who: 'buyer', msg: 'A las 17:46 desde Brubank. Te paso el comprobante 📎', t: '18:01' },
  {
    who: 'seller',
    msg: 'Esa transferencia no figura en mi cuenta. ¿Mandaste al CBU correcto?',
    t: '18:14',
  },
  { who: 'buyer', msg: 'Sí, copié el de tu perfil. Quiero abrir disputa.', t: '18:25' },
  { who: 'sys', msg: 'Disputa abierta · compliance notificada', t: '18:26' },
]

const autoChecks = [
  ['CBU origen → CBU declarado', 'match'],
  ['Importe coincide', 'match'],
  ['Concepto no menciona "crypto"', 'match'],
  ['CBU destino existe en banco', 'warn'],
]
</script>

<template>
  <!-- Result screen -->
  <div v-if="submitted" class="modal-scrim" @click.self="emit('close')">
    <div class="modal" style="width: 460px">
      <div class="modal-b">
        <div style="text-align: center; padding: 20px 0">
          <div class="success-circle">
            <span class="pi pi-check" style="font-size: 24px" />
          </div>
          <div style="font-size: 16px; font-weight: 600">Disputa resuelta</div>
          <div class="muted" style="font-size: 12.5px; margin-top: 4px">
            {{ decisionLabel[decision!] }} · ambas partes notificadas
          </div>
        </div>
      </div>
      <div class="modal-f">
        <BaseButton variant="ghost" @click="emit('close')">Cerrar</BaseButton>
        <BaseButton
          variant="primary"
          @click="emit('complete'); emit('close')"
          >Siguiente disputa</BaseButton
        >
      </div>
    </div>
  </div>

  <!-- Review screen -->
  <div v-else class="modal-scrim" @click.self="emit('close')">
    <div class="modal" style="width: 760px; max-height: 88vh">
      <div class="modal-h" style="padding-bottom: 14px">
        <div style="display: flex; align-items: flex-start; justify-content: space-between">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px">
              <h2 style="margin: 0">Disputa P2P #{{ data.opId }}</h2>
              <span class="bdg bdg-banned">SLA: 4 min</span>
            </div>
            <p style="margin: 0">
              {{ data.amount }} {{ data.asset }} · vía Mercado Pago · abierta hace 3h 56m
            </p>
          </div>
          <BaseButton class="btn-icon" variant="ghost" @click="emit('close')">
            <span class="pi pi-times" />
          </BaseButton>
        </div>
      </div>

      <div class="modal-b" style="padding-top: 8px">
        <!-- Parties -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
          <div
            v-for="(party, pk) in [
              {
                role: 'Comprador',
                name: data.buyer,
                stats: 'L2 · 142 ops · 98.4%',
                claim: `Reclamó que no recibió los ${data.asset}. Adjuntó comprobante de transferencia bancaria.`,
              },
              {
                role: 'Vendedor',
                name: data.seller,
                stats: 'L3 · 412 ops · 96.1%',
                claim: 'Declara que nunca recibió el pago. Adjuntó captura de su cuenta bancaria.',
              },
            ]"
            :key="pk"
            class="flow-card"
            style="padding: 12px"
          >
            <div class="section-label" style="margin-bottom: 6px">{{ party.role }}</div>
            <div style="display: flex; align-items: center; gap: 8px">
              <div class="party-avatar">{{ party.name[0] }}</div>
              <div>
                <div style="font-size: 13px; font-weight: 500">{{ party.name }}</div>
                <div class="muted" style="font-size: 11px">{{ party.stats }}</div>
              </div>
            </div>
            <div style="font-size: 12px; color: var(--text-2); margin-top: 8px">
              {{ party.claim }}
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 12px">
          <!-- Chat -->
          <div class="flow-card" style="padding: 12px">
            <div class="section-label" style="margin-bottom: 10px">Conversación</div>
            <div v-for="(m, i) in chat" :key="i" class="chat-row" :class="m.who">
              <div class="chat-bubble" :class="m.who">
                <div v-if="m.who !== 'sys'" class="chat-who">
                  {{ m.who === 'buyer' ? data.buyer : data.seller }} · {{ m.t }}
                </div>
                <span v-if="m.who === 'sys'" class="muted" style="font-size: 10.5px">{{
                  m.msg
                }}</span>
                <template v-else>{{ m.msg }}</template>
              </div>
            </div>
          </div>

          <!-- Evidence + auto analysis + note -->
          <div>
            <div class="section-label">Evidencia</div>
            <div
              v-for="ev in [
                {
                  ext: 'PDF',
                  name: 'Comprobante Brubank.pdf',
                  from: 'comprador',
                  size: '124 KB',
                  color: 'var(--accent-text)',
                },
                {
                  ext: 'JPG',
                  name: 'Saldo cuenta seller.jpg',
                  from: 'vendedor',
                  size: '312 KB',
                  color: 'var(--info)',
                },
              ]"
              :key="ev.name"
              class="flow-card"
              style="padding: 10px; margin-bottom: 8px"
            >
              <div style="display: flex; align-items: center; gap: 8px">
                <div class="ev-thumb" :style="{ color: ev.color }">{{ ev.ext }}</div>
                <div style="flex: 1; min-width: 0">
                  <div
                    style="
                      font-size: 12px;
                      font-weight: 500;
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: nowrap;
                    "
                  >
                    {{ ev.name }}
                  </div>
                  <div class="muted" style="font-size: 10.5px">
                    de {{ ev.from }} · {{ ev.size }}
                  </div>
                </div>
                <BaseButton class="btn-icon" variant="ghost" size="sm">
                  <span class="pi pi-eye" style="font-size: 11px" />
                </BaseButton>
              </div>
            </div>

            <div class="section-label" style="margin-top: 12px">Análisis automático</div>
            <div class="flow-card" style="padding: 10px">
              <div
                v-for="([label, st], i) in autoChecks"
                :key="label"
                class="check-row"
                :style="{
                  borderBottom: i < autoChecks.length - 1 ? '1px solid var(--border)' : 'none',
                }"
              >
                <span style="font-size: 11px">{{ label }}</span>
                <span
                  :style="{
                    color: st === 'match' ? 'var(--success)' : 'var(--warning)',
                    fontWeight: 600,
                  }"
                >
                  {{ st === 'match' ? '✓' : '⚠' }}
                </span>
              </div>
            </div>

            <div style="margin-top: 12px">
              <label
                style="
                  font-size: 11px;
                  font-weight: 500;
                  color: var(--text-2);
                  display: block;
                  margin-bottom: 5px;
                "
              >
                Resolución (visible para ambas partes)
              </label>
              <textarea v-model="note" placeholder="Justificá tu decisión…" class="note-area" />
            </div>
          </div>
        </div>
      </div>

      <div class="modal-f" style="flex-wrap: wrap; gap: 6px">
        <BaseButton variant="danger" @click="resolve('buyer')">
          <span class="pi pi-arrow-down" style="font-size: 11px" />
          Reembolsar al comprador
        </BaseButton>
        <BaseButton variant="ghost" @click="resolve('seller')">
          <span class="pi pi-check" style="font-size: 11px" />
          Liberar al vendedor
        </BaseButton>
        <BaseButton variant="ghost" @click="resolve('split')">Dividir 50/50</BaseButton>
        <div style="flex: 1" />
        <BaseButton variant="ghost" @click="emit('close')">Cancelar</BaseButton>
        <BaseButton variant="primary" @click="resolve('escalate')">
          <span class="pi pi-exclamation-triangle" style="font-size: 11px" />
          Escalar a legales
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.party-avatar {
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
.chat-row {
  display: flex;
  margin-bottom: 5px;
}
.chat-row.buyer {
  justify-content: flex-start;
}
.chat-row.seller {
  justify-content: flex-end;
}
.chat-row.sys {
  justify-content: center;
}
.chat-bubble {
  max-width: 78%;
  padding: 6px 10px;
  border-radius: 10px;
  font-size: 12px;
  color: var(--text);
}
.chat-bubble.buyer {
  background: var(--surface-2);
}
.chat-bubble.seller {
  background: var(--info-soft);
}
.chat-bubble.sys {
  background: transparent;
  border-radius: 999px;
}
.chat-who {
  font-size: 10px;
  color: var(--text-3);
  margin-bottom: 1px;
  font-weight: 600;
}
.ev-thumb {
  width: 36px;
  height: 44px;
  background: var(--surface-2);
  border-radius: 4px;
  display: grid;
  place-items: center;
  font-size: 9px;
  font-weight: 600;
  flex-shrink: 0;
}
.check-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}
.note-area {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  font-size: 12px;
  font-family: var(--font-sans);
  background: var(--surface-2);
  color: var(--text);
  min-height: 56px;
  resize: vertical;
  outline: none;
}
.note-area:focus {
  border-color: var(--accent);
}
.success-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--success-soft);
  color: var(--success);
  display: grid;
  place-items: center;
  margin: 0 auto 14px;
}
</style>
