<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

export interface ReceiveData {
  asset: string
  address: string
}

const props = defineProps<{ data: ReceiveData }>()
const emit = defineEmits<{ close: []; complete: [] }>()

const received = ref(false)
const copied = ref(false)

let timeout: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  timeout = setTimeout(() => { received.value = true }, 8000)
})
onUnmounted(() => { if (timeout) clearTimeout(timeout) })

function copy() {
  navigator.clipboard.writeText(props.data.address).catch(() => {})
  copied.value = true
  setTimeout(() => { copied.value = false }, 1200)
}

const txId = 'TXN-' + Math.random().toString(36).slice(2, 9).toUpperCase()
const nowTime = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

const shortAddr = computed(() => {
  const a = props.data.address
  return a.slice(0, 10) + '…' + a.slice(-6)
})

import { computed } from 'vue'
</script>

<template>
  <!-- Success screen -->
  <div v-if="received" class="modal-scrim" @click.self="emit('close')">
    <div class="modal" style="width:420px">
      <div class="modal-b">
        <div style="text-align:center;padding:24px 0 8px">
          <div class="success-circle">
            <span class="pi pi-check" style="font-size:36px" />
          </div>
          <div style="font-size:14px;font-weight:500;color:var(--text-2)">Recibiste</div>
          <div class="mono" style="font-size:32px;font-weight:600;letter-spacing:-0.02em;margin:4px 0">
            +50.00 <span style="font-size:22px">{{ data.asset }}</span>
          </div>
          <div class="muted" style="font-size:13px">De <b style="color:var(--text)">Sofía Pérez</b> · @sofia.p</div>
        </div>

        <div class="flow-card" style="padding:14px;margin-top:18px">
          <div
            v-for="([label, value], i) in [
              ['Operación', txId],
              ['Tu nuevo saldo', `1,096.68 ${data.asset}`],
              ['Hora', nowTime],
              ['Tipo', 'Envío interno · instantáneo'],
            ]"
            :key="label"
            class="detail-row"
            :style="{ borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }"
          >
            <span class="muted" style="font-size:12px">{{ label }}</span>
            <span class="mono" style="font-size:12px;font-weight:500">{{ value }}</span>
          </div>
        </div>
      </div>
      <div class="modal-f">
        <button class="btn" @click="emit('close')">Cerrar</button>
        <button class="btn btn-primary" @click="emit('complete'); emit('close')">Ir a la wallet</button>
      </div>
    </div>
  </div>

  <!-- Waiting screen -->
  <div v-else class="modal-scrim" @click.self="emit('close')">
    <div class="modal" style="width:420px">
      <div class="modal-h">
        <h2>Recibir {{ data.asset }}</h2>
        <p>Compartí esta dirección o el QR para recibir transferencias.</p>
      </div>

      <div class="modal-b">
        <div style="text-align:center">
          <!-- Fake QR (SVG grid pattern) -->
          <div class="qr-frame">
            <div class="brand-mark">◆</div>
            <svg :width="180" :height="180" style="display:block">
              <rect width="180" height="180" fill="white" />
              <g fill="#1a1917">
                <template v-for="row in 18" :key="row">
                  <template v-for="col in 18" :key="col">
                    <rect
                      v-if="((row + col + row * col) % 3 !== 0)"
                      :x="(col - 1) * 10"
                      :y="(row - 1) * 10"
                      width="9"
                      height="9"
                    />
                  </template>
                </template>
                <!-- Corner markers -->
                <rect x="0" y="0" width="60" height="60" rx="4" fill="#1a1917" />
                <rect x="6" y="6" width="48" height="48" rx="2" fill="white" />
                <rect x="12" y="12" width="36" height="36" rx="1" fill="#1a1917" />
                <rect x="120" y="0" width="60" height="60" rx="4" fill="#1a1917" />
                <rect x="126" y="6" width="48" height="48" rx="2" fill="white" />
                <rect x="132" y="12" width="36" height="36" rx="1" fill="#1a1917" />
                <rect x="0" y="120" width="60" height="60" rx="4" fill="#1a1917" />
                <rect x="6" y="126" width="48" height="48" rx="2" fill="white" />
                <rect x="12" y="132" width="36" height="36" rx="1" fill="#1a1917" />
              </g>
            </svg>
          </div>

          <div class="muted" style="font-size:10.5px;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;margin-top:14px">
            Tu dirección {{ data.asset }}
          </div>
          <button class="addr-chip" @click="copy">
            <span class="mono" style="font-size:12px;font-weight:500">{{ shortAddr }}</span>
            <span
              :class="copied ? 'pi pi-check' : 'pi pi-copy'"
              :style="{ color: copied ? 'var(--success)' : 'var(--accent-text)', fontSize: '13px' }"
            />
          </button>
          <div v-if="copied" style="font-size:11px;color:var(--success);margin-top:6px">Copiado al portapapeles</div>
        </div>

        <div style="display:flex;gap:8px;margin-top:4px">
          <button class="btn" style="flex:1;justify-content:center" @click="copy">
            <span class="pi pi-copy" style="font-size:12px" />
            {{ copied ? 'Copiado' : 'Copiar' }}
          </button>
          <button class="btn" style="flex:1;justify-content:center">
            <span class="pi pi-share-alt" style="font-size:12px" />
            Compartir
          </button>
        </div>

        <div class="listening-bar">
          <div class="spinner" style="width:12px;height:12px" />
          <span style="flex:1">Escuchando transacciones entrantes…</span>
          <span class="muted" style="font-size:10.5px">en vivo</span>
        </div>

        <div class="warn-box warn-box-info" style="font-size:11.5px">
          <span class="pi pi-info-circle" style="font-size:13px;flex-shrink:0;margin-top:1px" />
          <span>Sólo enviá <b style="color:var(--text)">{{ data.asset }}</b> a esta dirección en la red <b>Cadena</b>. Otros tokens podrían perderse.</span>
        </div>
      </div>

      <div class="modal-f">
        <button class="btn" @click="emit('close')">Cerrar</button>
        <button class="btn btn-primary" @click="received = true">
          <span style="font-size:10.5px;font-weight:400;margin-right:6px;color:rgba(250,249,246,0.65)">(demo)</span>
          Simular pago entrante
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qr-frame {
  position: relative;
  display: inline-block;
  padding: 14px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
}
.brand-mark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: linear-gradient(135deg, #1a1917, #3a3530);
  color: #faf9f6;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  z-index: 1;
}
.addr-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.12s;
}
.addr-chip:hover { border-color: var(--accent); }
.listening-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--accent-soft);
  border-radius: var(--radius);
  font-size: 12px;
  color: var(--accent-text);
}
.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
}
.success-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--success-soft);
  color: var(--success);
  display: grid;
  place-items: center;
  margin: 0 auto 16px;
}
</style>
