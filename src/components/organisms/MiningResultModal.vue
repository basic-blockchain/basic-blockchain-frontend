<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BaseModal from '@/components/atoms/BaseModal.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import HashChip from '@/components/atoms/HashChip.vue'
import { useMiningStore } from '@/stores/mining'

const miningStore = useMiningStore()
const router = useRouter()

const blockHash = ref<string | null>(null)

const result = computed(() => miningStore.lastResult)
const isOpen = computed(() => miningStore.showResult && result.value !== null)

async function computeBlockHash() {
  const block = result.value?.block
  if (!block || !('crypto' in window) || !window.crypto?.subtle) {
    blockHash.value = null
    return
  }
  const payload = {
    index: block.index,
    merkle_root: block.merkleRoot,
    previous_hash: block.previousHash,
    proof: block.proof,
    timestamp: block.timestamp,
  }
  const encoder = new TextEncoder()
  const data = encoder.encode(JSON.stringify(payload))
  const buffer = await window.crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(buffer))
  blockHash.value = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

watch(isOpen, (open) => {
  if (open) void computeBlockHash()
})

function closeModal() {
  miningStore.clearResult()
}

function viewInChain() {
  const block = result.value?.block
  if (block) {
    router.push({ path: '/chain', query: { block: String(block.index) } })
  } else {
    router.push('/chain')
  }
  closeModal()
}

const txCount = computed(() => result.value?.transactions.length ?? 0)
const elapsed = computed(() => result.value?.elapsedSeconds ?? 0)
const attempts = computed(() => miningStore.lastAttempts)
const feeTotal = computed(() => result.value?.feeTotal ?? null)
const feeText = computed(() => {
  if (feeTotal.value === null || feeTotal.value === undefined) return '—'
  return feeTotal.value.toLocaleString('es-AR', { maximumFractionDigits: 8 })
})
const rewardText = computed(() => {
  if (feeTotal.value === null || feeTotal.value === undefined) return '50 BTC'
  if (feeTotal.value <= 0) return '50 BTC'
  return `50 BTC + ${feeText.value} fees`
})
</script>

<template>
  <BaseModal :open="isOpen" width="560px" @close="closeModal">
    <template #header>
      <div class="mine-result__header">
        <div>
          <h2 class="mine-result__title">Bloque minado</h2>
          <p class="mine-result__sub">Tu bloque fue aceptado y agregado a la cadena.</p>
        </div>
        <button type="button" class="mine-result__close" aria-label="Cerrar" @click="closeModal">
          <span class="pi pi-times" aria-hidden="true" />
        </button>
      </div>
    </template>

    <div class="mine-result__body">
      <div class="mine-result__status">
        <div class="mine-result__circle">
          <span class="pi pi-check" aria-hidden="true" />
        </div>
        <div class="mine-result__headline">Bloque #{{ result?.block.index }} minado</div>
        <div class="mine-result__hint">Propagando a peers...</div>
      </div>

      <div class="mine-result__card">
        <div class="mine-result__row">
          <span class="muted">Altura</span>
          <span class="mono">#{{ result?.block.index }}</span>
        </div>
        <div class="mine-result__row">
          <span class="muted">Nonce ganador</span>
          <span class="mono">{{ result?.block.proof.toLocaleString('en-US') }}</span>
        </div>
        <div class="mine-result__row">
          <span class="muted">Hash</span>
          <span class="mono">
            <HashChip v-if="blockHash" :hash="blockHash" :length="16" label="hash" />
            <span v-else>—</span>
          </span>
        </div>
        <div class="mine-result__row">
          <span class="muted">Transacciones</span>
          <span>{{ txCount }} ({{ Math.max(txCount - 1, 0) }} + coinbase)</span>
        </div>
        <div class="mine-result__row">
          <span class="muted">Intentos</span>
          <span>{{ attempts ?? '—' }}</span>
        </div>
        <div class="mine-result__row">
          <span class="muted">Tiempo</span>
          <span>{{ elapsed }} s</span>
        </div>
        <div class="mine-result__row">
          <span class="muted">Fees acumulados</span>
          <span>{{ feeText }}</span>
        </div>
        <div class="mine-result__row">
          <span class="muted">Recompensa</span>
          <span>{{ rewardText }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="mine-result__footer">
        <BaseButton variant="ghost" size="sm" @click="closeModal">Cerrar</BaseButton>
        <BaseButton variant="primary" size="sm" @click="viewInChain">
          <template #leading>
            <span class="pi pi-external-link" aria-hidden="true" />
          </template>
          Ver en explorer
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.mine-result__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mine-result__title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px;
  color: var(--text);
}

.mine-result__sub {
  font-size: 12.5px;
  color: var(--text-2);
  margin: 0;
}

.mine-result__close {
  border: 0;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 8px;
}

.mine-result__close:hover {
  background: var(--hover);
  color: var(--text);
}

.mine-result__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mine-result__status {
  text-align: center;
}

.mine-result__circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--success-soft);
  color: var(--success);
  display: grid;
  place-items: center;
  font-size: 28px;
  margin: 0 auto 14px;
}

.mine-result__headline {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

.mine-result__hint {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 4px;
}

.mine-result__card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mine-result__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12.5px;
}

.mine-result__footer {
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
