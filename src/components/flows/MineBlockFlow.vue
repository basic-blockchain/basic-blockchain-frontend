<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useMiningStore } from '@/stores/mining'

export interface MineBlockData {
  nextHeight: number
  pendingCount: number
  prevHash: string
}

const props = defineProps<{ data: MineBlockData }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'complete'): void }>()

const step = ref<0 | 1>(0)
const nonce = ref(0)
const hash = ref('')
const iter = ref(0)

const miningStore = useMiningStore()

let rafId = 0
let counter = 0
let finishTimer: ReturnType<typeof setTimeout> | null = null

function randHex(len: number): string {
  const chars = '0123456789abcdef'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * 16)]
  return out
}

function truncPrev(): string {
  const h =
    props.data.prevHash && props.data.prevHash.length > 0 ? props.data.prevHash : '0xa4f1…d77e'
  if (h === '0xa4f1…d77e') return h
  return h.slice(0, 18) + '…'
}

function tick(): void {
  for (let i = 0; i < 8; i++) {
    counter++
    const h = randHex(12)
    if (counter > 240 && Math.random() < 0.04) {
      nonce.value = 100000 + Math.floor(Math.random() * 900000)
      hash.value = '0x0000' + h.slice(4) + 'a8c4f9d12b3e7f1a9b2c8d77'
      iter.value = counter
      return
    }
    if (i === 0) {
      hash.value = '0x' + h + 'a8c4f9d'
      nonce.value = counter
    }
  }
  iter.value = counter
  rafId = requestAnimationFrame(tick)
}

function startMining(): void {
  step.value = 1
  counter = 0
  nonce.value = 0
  hash.value = ''
  iter.value = 0

  // Start animation
  rafId = requestAnimationFrame(tick)

  // Start mining in background via store
  miningStore.mine()

  // Close modal after brief animation (1.5s)
  finishTimer = setTimeout(() => {
    emit('complete')
    emit('close')
  }, 1500)
}

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  if (finishTimer) clearTimeout(finishTimer)
})
</script>

<template>
  <div class="modal-scrim" @click.self="emit('close')">
    <div class="modal" style="width: 540px">
      <div class="modal-h">
        <div>
          <div style="font-size: 14px; font-weight: 600">Minar nuevo bloque</div>
          <div class="muted" style="font-size: 11.5px">
            Proof of Work · altura #{{ data.nextHeight }}
          </div>
        </div>
        <button class="btn btn-ghost btn-icon" @click="emit('close')">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <div class="modal-b">
        <div v-if="step === 0">
          <div class="flow-card">
            <div class="detail-row">
              <span class="muted">Próxima altura</span>
              <span class="mono">#{{ data.nextHeight }}</span>
            </div>
            <div class="detail-row">
              <span class="muted">Previous hash</span>
              <span class="mono">{{ truncPrev() }}</span>
            </div>
            <div class="detail-row">
              <span class="muted">Transacciones a incluir</span>
              <span
                >{{ data.pendingCount }} del mempool + 1 coinbase =
                {{ data.pendingCount + 1 }}</span
              >
            </div>
            <div class="detail-row">
              <span class="muted">Recompensa de bloque</span>
              <span>50 BTC → admin_platform</span>
            </div>
            <div class="detail-row">
              <span class="muted">Fees acumulados</span>
              <span>$3.21</span>
            </div>
            <div class="detail-row">
              <span class="muted">Dificultad</span>
              <span class="mono">4 (0000…)</span>
            </div>
          </div>
          <div class="dry-run" style="margin-top: 12px">
            <i class="pi pi-info-circle"></i>
            <span>Tiempo estimado: ~3-5 segundos</span>
          </div>
        </div>

        <div v-else-if="step === 1">
          <div style="text-align: center; padding: 8px 0 16px">
            <div style="font-size: 48px; line-height: 1">⛏</div>
            <div style="font-size: 16px; font-weight: 600; margin-top: 8px">Proof of Work</div>
            <div class="muted" style="font-size: 12px; margin-top: 4px">
              iter: {{ iter.toLocaleString('en-US') }} · nonce: {{ nonce.toLocaleString('en-US') }}
            </div>
          </div>
          <div
            style="
              background: #0a0a0a;
              color: #86efac;
              border-radius: 8px;
              font-family: var(--font-mono);
              font-size: 11px;
              padding: 14px;
              margin-bottom: 12px;
            "
          >
            <div style="color: #6a6a64">
              $ mining... target prefix: <span style="color: #ffaa00">0000</span>
            </div>
            <div style="color: #67e8f9">nonce = {{ nonce.toLocaleString('en-US') }}</div>
            <div style="color: #fda4af">hash = {{ hash }}</div>
          </div>
          <div class="muted" style="font-size: 11px">
            El minado continúa en background. Puedes cerrar este modal.
          </div>
        </div>
      </div>

      <div class="modal-f">
        <template v-if="step === 0">
          <button class="btn" @click="emit('close')">Cancelar</button>
          <button class="btn btn-primary" @click="startMining">⛏ Empezar a minar</button>
        </template>
        <template v-else>
          <button class="btn" @click="emit('close')">Cerrar</button>
        </template>
      </div>
    </div>
  </div>
</template>
