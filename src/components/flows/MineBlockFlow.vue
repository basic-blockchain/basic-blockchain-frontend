<script setup lang="ts">
import { ref, onUnmounted, watch } from 'vue'
import { useMiningStore } from '@/stores/mining'
import BaseModal from '@/components/atoms/BaseModal.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'

export interface MineBlockData {
  nextHeight: number
  pendingCount: number
  prevHash: string
  feeTotal?: number
  baseReward?: number
  rewardCurrency?: string
}

const props = defineProps<{ data: MineBlockData }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'complete'): void }>()

const step = ref<0 | 1>(0)
const nonce = ref(0)
const hash = ref('')
const iter = ref(0)

const miningStore = useMiningStore()

function hasFeeData(): boolean {
  return props.data.feeTotal !== undefined && props.data.feeTotal !== null
}

function formatAmount(value: number): string {
  return value.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
}

function feeText(): string {
  if (!hasFeeData()) return '—'
  const total = Number(props.data.feeTotal ?? 0)
  if (!Number.isFinite(total) || total <= 0) return '0,00'
  return formatAmount(total)
}

function rewardText(): string {
  const base = Number(props.data.baseReward)
  const currency = props.data.rewardCurrency ?? 'BTC'
  const feeSuffix = hasFeeData() ? `${feeText()} fees` : 'fees pendientes'
  if (!Number.isFinite(base) || base <= 0) {
    return `Recompensa base (coinbase) + ${feeSuffix}`
  }
  return `${formatAmount(base)} ${currency} + ${feeSuffix}`
}

let rafId = 0
let counter = 0
let autoCloseTimer: ReturnType<typeof setTimeout> | null = null
const closeFlow = () => emit('close')

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

  // Auto-close shortly after starting (mining continues in background)
  if (autoCloseTimer) clearTimeout(autoCloseTimer)
  autoCloseTimer = setTimeout(() => {
    closeFlow()
  }, 1200)
}

watch(
  () => miningStore.showResult,
  (show) => {
    if (!show) return
    miningStore.setClientStats(iter.value, nonce.value)
    if (rafId) cancelAnimationFrame(rafId)
    emit('complete')
    emit('close')
  }
)

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  if (autoCloseTimer) clearTimeout(autoCloseTimer)
})
</script>

<template>
  <BaseModal :open="true" width="560px" @close="closeFlow">
    <template #header>
      <div class="mine-flow__header">
        <div>
          <h2 class="mine-flow__title">Minar nuevo bloque</h2>
          <p class="mine-flow__sub">
            Se incluirá la transacción coinbase + todas las pendientes del mempool.
          </p>
        </div>
        <button class="mine-flow__close" type="button" aria-label="Cerrar" @click="closeFlow">
          <span class="pi pi-times" aria-hidden="true" />
        </button>
      </div>
    </template>

    <div class="mine-flow__body">
      <div v-if="step === 0">
        <div class="mine-flow__card">
          <div class="mine-flow__row">
            <span class="muted">Próxima altura</span>
            <span class="mono">#{{ data.nextHeight }}</span>
          </div>
          <div class="mine-flow__row">
            <span class="muted">Previous hash</span>
            <span class="mono">{{ truncPrev() }}</span>
          </div>
          <div class="mine-flow__row">
            <span class="muted">Transacciones a incluir</span>
            <span
              >{{ data.pendingCount }} del mempool + 1 coinbase = {{ data.pendingCount + 1 }}</span
            >
          </div>
          <div class="mine-flow__row">
            <span class="muted">Recompensa de bloque</span>
            <span class="mono">{{ rewardText() }}</span>
          </div>
          <div class="mine-flow__row">
            <span class="muted">Fees acumulados</span>
            <span class="mono">{{ feeText() }}</span>
          </div>
          <div v-if="!hasFeeData()" class="mine-flow__row-hint">
            Fees aun no disponibles en esta version.
          </div>
          <div class="mine-flow__row">
            <span class="muted">Dificultad</span>
            <span class="mono">4 (0000…)</span>
          </div>
        </div>
        <div class="mine-flow__hint">
          <span class="pi pi-info-circle" aria-hidden="true" />
          <span>Tiempo estimado: ~3-5 segundos</span>
        </div>
      </div>

      <div v-else-if="step === 1">
        <div class="mine-flow__pow">
          <div class="mine-flow__pow-icon" aria-hidden="true">⛏</div>
          <div class="mine-flow__pow-title">Proof of Work</div>
          <div class="mine-flow__pow-sub muted">
            iter: {{ iter.toLocaleString('en-US') }} · nonce: {{ nonce.toLocaleString('en-US') }}
          </div>
        </div>
        <div class="mine-flow__terminal">
          <div class="mine-flow__terminal-line">
            $ mining... target prefix: <span class="mine-flow__accent">0000</span>
          </div>
          <div class="mine-flow__terminal-line mine-flow__nonce">
            nonce = {{ nonce.toLocaleString('en-US') }}
          </div>
          <div class="mine-flow__terminal-line mine-flow__hash">hash = {{ hash }}</div>
        </div>
        <div class="mine-flow__note muted">
          El minado continúa en background. Puedes cerrar este modal.
        </div>
      </div>
    </div>

    <template #footer>
      <div class="mine-flow__footer">
        <template v-if="step === 0">
          <BaseButton variant="ghost" size="sm" @click="closeFlow">Cancelar</BaseButton>
          <BaseButton variant="primary" size="sm" @click="startMining">
            <template #leading>
              <span aria-hidden="true">⛏</span>
            </template>
            Empezar a minar
          </BaseButton>
        </template>
        <template v-else>
          <BaseButton variant="ghost" size="sm" @click="closeFlow">Cerrar</BaseButton>
        </template>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.mine-flow__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.mine-flow__title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px;
  color: var(--text);
}

.mine-flow__sub {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-2);
}

.mine-flow__close {
  border: 0;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 8px;
}

.mine-flow__close:hover {
  background: var(--hover);
  color: var(--text);
}

.mine-flow__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mine-flow__card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
}

.mine-flow__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12.5px;
  padding: 7px 0;
  border-bottom: 1px solid var(--border);
}

.mine-flow__row:last-child {
  border-bottom: 0;
}

.mine-flow__row-hint {
  font-size: 11px;
  color: var(--text-3);
  margin-top: -2px;
  padding-bottom: 6px;
}

.mine-flow__hint {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 10px;
  font-size: 12px;
  color: var(--text-2);
  width: 100%;
  box-sizing: border-box;
}

.mine-flow__pow {
  text-align: center;
  padding: 8px 0 16px;
}

.mine-flow__pow-icon {
  font-size: 48px;
  line-height: 1;
}

.mine-flow__pow-title {
  font-size: 16px;
  font-weight: 600;
  margin-top: 8px;
  color: var(--text);
}

.mine-flow__pow-sub {
  font-size: 12px;
  margin-top: 4px;
}

.mine-flow__terminal {
  background: #0a0a0a;
  color: #86efac;
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 14px;
  margin-bottom: 12px;
}

.mine-flow__terminal-line {
  color: #6a6a64;
}

.mine-flow__nonce {
  color: #67e8f9;
}

.mine-flow__hash {
  color: #fda4af;
}

.mine-flow__accent {
  color: #ffaa00;
}

.mine-flow__note {
  font-size: 11px;
}

.mine-flow__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.mono {
  font-family: var(--font-mono);
}

.muted {
  color: var(--text-3);
}
</style>
