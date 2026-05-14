<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

export interface SendData {
  to: string
  handle: string
  amount: string
  asset: string
  note?: string
}

const props = defineProps<{ data: SendData }>()
const emit = defineEmits<{
  close: []
  complete: []
}>()

const step = ref(0)
const drag = ref(0)
const dragging = ref(false)
const trackRef = ref<HTMLElement | null>(null)

function onDown(e: MouseEvent | TouchEvent) {
  dragging.value = true
  e.preventDefault()
}

function onMove(e: MouseEvent | TouchEvent) {
  if (!dragging.value || !trackRef.value) return
  const r = trackRef.value.getBoundingClientRect()
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  let pct = (clientX - r.left - 24) / (r.width - 48)
  pct = Math.max(0, Math.min(1, pct))
  drag.value = pct
}

function onUp() {
  if (!dragging.value) return
  dragging.value = false
  if (drag.value > 0.92) {
    drag.value = 1
    setTimeout(() => { step.value = 1 }, 200)
  } else {
    drag.value = 0
  }
}

onMounted(() => {
  window.addEventListener('mousemove', onMove)
  window.addEventListener('touchmove', onMove)
  window.addEventListener('mouseup', onUp)
  window.addEventListener('touchend', onUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('touchmove', onMove)
  window.removeEventListener('mouseup', onUp)
  window.removeEventListener('touchend', onUp)
})

const thumbLeft = computed(() => {
  if (!trackRef.value) return drag.value * 320
  return 4 + drag.value * (trackRef.value.clientWidth - 56)
})

const fillPct = computed(() => drag.value * 100)

function confirmAndSend() {
  drag.value = 1
  setTimeout(() => { step.value = 1 }, 200)
}

const txId = ref('TXN-' + Math.random().toString(36).slice(2, 9).toUpperCase())
const now = new Date().toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const remaining = computed(() => (1046.68 - parseFloat(props.data.amount)).toFixed(2))
</script>

<template>
  <div class="modal-scrim" @click.self="emit('close')">
    <div class="modal" style="width:440px">
      <div class="modal-h">
        <h2>{{ step === 0 ? 'Confirmar envío' : '¡Enviado!' }}</h2>
        <p>{{ step === 0 ? 'Revisá los datos. Los envíos internos no son reversibles.' : 'El destinatario ya tiene los fondos.' }}</p>
      </div>

      <div class="modal-b">
        <template v-if="step === 0">
          <div style="text-align:center;margin-bottom:18px">
            <div class="avatar-lg">{{ data.to[0] }}</div>
            <div style="font-weight:600;font-size:14px;margin-top:8px">{{ data.to }}</div>
            <div class="muted" style="font-size:11.5px">{{ data.handle }} · verificado ✓</div>
          </div>

          <div class="flow-card" style="padding:14px">
            <div
              v-for="([label, value], i) in [
                ['Monto', `${data.amount} ${data.asset}`],
                ['Valor USD', `≈ $${data.amount} USD`],
                ['Comisión', 'Gratis'],
                ['Tiempo estimado', 'Instantáneo'],
                ['Nota', data.note || '—'],
              ]"
              :key="label"
              class="detail-row"
              :style="{ borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }"
            >
              <span class="muted" style="font-size:12.5px">{{ label }}</span>
              <span class="mono" style="font-size:12.5px;font-weight:500">{{ value }}</span>
            </div>
          </div>

          <!-- Slide to confirm -->
          <div
            ref="trackRef"
            class="slide-track"
            @touchstart.prevent="onDown"
          >
            <div
              class="slide-fill"
              :style="{ width: fillPct + '%', opacity: drag > 0 ? 0.18 : 0 }"
            />
            <div class="slide-label" :style="{ color: drag > 0.5 ? 'var(--success)' : 'var(--text-2)' }">
              Deslizá para confirmar →
            </div>
            <div
              class="slide-thumb"
              :class="{ done: drag > 0.92 }"
              :style="{ left: thumbLeft + 'px' }"
              @mousedown="onDown"
              @touchstart.prevent="onDown"
            >
              <span class="pi pi-chevron-right" style="font-size:14px" />
            </div>
          </div>
          <div class="muted" style="font-size:11px;text-align:center">o tocá el botón para confirmar</div>
        </template>

        <template v-else>
          <div style="text-align:center;padding:20px 0">
            <div class="success-circle">
              <span class="pi pi-check" style="font-size:32px" />
            </div>
            <div class="mono" style="font-size:22px;font-weight:600;letter-spacing:-0.01em;margin-bottom:4px">
              −{{ data.amount }} {{ data.asset }}
            </div>
            <div class="muted" style="font-size:13px;margin-bottom:18px">{{ data.to }} recibió tu envío</div>

            <div class="flow-card" style="padding:14px;text-align:left">
              <div
                v-for="([label, value], i) in [
                  ['Operación', txId],
                  ['Hora', now],
                  ['Tu saldo restante', `${remaining} ${data.asset}`],
                ]"
                :key="label"
                class="detail-row"
                :style="{ borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }"
              >
                <span class="muted" style="font-size:12px">{{ label }}</span>
                <span class="mono" style="font-size:12px;font-weight:500">{{ value }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div class="modal-f">
        <template v-if="step === 0">
          <button class="btn" @click="emit('close')">Cancelar</button>
          <button class="btn btn-primary" @click="confirmAndSend">
            Confirmar y enviar
          </button>
        </template>
        <template v-else>
          <button class="btn" @click="emit('close')">Cerrar</button>
          <button class="btn btn-primary" @click="emit('complete'); emit('close')">
            <span class="pi pi-download" style="font-size:12px" />
            Compartir recibo
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.avatar-lg {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent-text);
  display: grid;
  place-items: center;
  font-size: 18px;
  font-weight: 600;
  margin: 0 auto;
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 0;
}

.slide-track {
  position: relative;
  height: 48px;
  background: var(--surface-2);
  border-radius: 999px;
  overflow: hidden;
  cursor: pointer;
  user-select: none;
  margin-top: 8px;
}
.slide-fill {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, var(--success), var(--success));
  transition: opacity 0.2s;
  pointer-events: none;
}
.slide-label {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 12.5px;
  font-weight: 600;
  pointer-events: none;
  transition: color 0.2s;
}
.slide-thumb {
  position: absolute;
  top: 4px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--text);
  color: #faf9f6;
  display: grid;
  place-items: center;
  cursor: grab;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  transition: background 0.15s, left 0.05s;
}
.slide-thumb.done { background: var(--success); }
.slide-thumb:active { cursor: grabbing; }

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
