<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAppToast } from '@/composables/useAppToast'
import { useNodesStore } from '@/stores/nodes'
import type { Block } from '@/domain/block'
import { formatHash } from '@/domain/block'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import BaseModal from '@/components/atoms/BaseModal.vue'
import BackgroundTaskIndicator from '@/components/organisms/BackgroundTaskIndicator.vue'
import PaginatedTable from '@/components/organisms/PaginatedTable.vue'

const nodesStore = useNodesStore()
const toast = useAppToast()

const newUrl = ref('http://localhost:5001')
const resolving = ref(false)
const consensusStartOpen = ref(false)
const consensusIndicatorOpen = ref(false)
const consensusDetailOpen = ref(false)
const consensusStatus = ref<'running' | 'success' | 'info' | 'error'>('running')
const consensusMessage = ref('')
const consensusProgress = ref(0)
const consensusStartedAt = ref<number | null>(null)
const consensusFinishedAt = ref<number | null>(null)
const consensusChain = ref<Block[]>([])
const showFullMerkle = ref(false)
let consensusTimer: ReturnType<typeof setInterval> | null = null
let consensusAutoClose: ReturnType<typeof setTimeout> | null = null

onMounted(() => nodesStore.fetchNodes())

async function resolveConsensus() {
  resolving.value = true
  consensusStartOpen.value = true
  consensusIndicatorOpen.value = true
  consensusDetailOpen.value = false
  consensusStatus.value = 'running'
  consensusMessage.value = 'Resolviendo consenso entre peers...'
  consensusProgress.value = 8
  consensusStartedAt.value = Date.now()
  consensusFinishedAt.value = null
  consensusChain.value = []
  showFullMerkle.value = false
  if (consensusTimer) clearInterval(consensusTimer)
  consensusTimer = setInterval(() => {
    consensusProgress.value = Math.min(92, consensusProgress.value + 6)
  }, 280)
  try {
    const result = await nodesStore.resolve()
    consensusStatus.value = result.replaced ? 'success' : 'info'
    consensusMessage.value = result.message
    consensusProgress.value = 100
    consensusFinishedAt.value = Date.now()
    consensusChain.value = result.chain ?? []
    toast.add({
      severity: result.replaced ? 'success' : 'info',
      summary: result.replaced ? 'Consenso aplicado' : 'Consenso finalizado',
      detail: result.replaced
        ? 'La cadena local fue reemplazada por una mas larga y valida.'
        : 'La cadena local ya era la mas larga.',
      life: 4200,
    })
  } catch (error: unknown) {
    consensusStatus.value = 'error'
    consensusMessage.value = 'No se pudo resolver el consenso.'
    consensusProgress.value = 100
    consensusFinishedAt.value = Date.now()
    consensusChain.value = []
    toast.add({
      severity: 'error',
      summary: 'Error de consenso',
      detail: error instanceof Error ? error.message : 'No se pudo completar la operacion.',
      life: 5000,
    })
  } finally {
    resolving.value = false
    if (consensusTimer) {
      clearInterval(consensusTimer)
      consensusTimer = null
    }
    if (consensusAutoClose) clearTimeout(consensusAutoClose)
    consensusAutoClose = setTimeout(() => {
      if (consensusStatus.value !== 'running') consensusIndicatorOpen.value = false
    }, 1600)
    if (consensusStatus.value !== 'running') {
      consensusDetailOpen.value = true
      consensusStartOpen.value = false
    }
  }
}

function closeConsensusIndicator() {
  if (consensusStatus.value === 'running') return
  if (consensusAutoClose) {
    clearTimeout(consensusAutoClose)
    consensusAutoClose = null
  }
  consensusIndicatorOpen.value = false
}

function openConsensusDetails() {
  consensusDetailOpen.value = true
}

function closeConsensusDetails() {
  consensusDetailOpen.value = false
  showFullMerkle.value = false
}

function closeConsensusStart() {
  consensusStartOpen.value = false
}

async function copyMerkleRoot() {
  const root = consensusLastBlock.value?.merkleRoot
  if (!root) return
  try {
    await navigator.clipboard.writeText(root)
    toast.add({
      severity: 'success',
      summary: 'Merkle root copiado',
      detail: 'Listo para compartir o verificar.',
      life: 2200,
    })
  } catch {
    toast.add({
      severity: 'error',
      summary: 'No se pudo copiar',
      detail: 'Intenta nuevamente.',
      life: 2600,
    })
  }
}

async function registerPeer() {
  if (!newUrl.value.trim()) return
  await nodesStore.register([newUrl.value.trim()])
  newUrl.value = ''
}

const latencies = [38, 82, 124, 4, 56]
const statuses: Array<'online' | 'syncing' | 'offline'> = ['online', 'online', 'syncing', 'offline']

type PeerStatus = 'online' | 'syncing' | 'offline'

interface PeerRow {
  url: string
  region: string
  version: string
  height: number
  latency: string
  status: PeerStatus
  lastSync: string
}

function regionFor(url: string): string {
  if (url.includes('localhost') || url.includes('127.0.0.1')) return '🏠 local'
  if (url.endsWith('.io')) return '🇪🇺 eu-west'
  if (url.endsWith('.com')) return '🇺🇸 us-east'
  return '🌐 global'
}

const peerRows = computed<PeerRow[]>(() =>
  nodesStore.peers.map((url, i) => {
    const lat = latencies[i % latencies.length]
    const status: PeerStatus =
      url.includes('localhost') || url.includes('127.0.0.1')
        ? 'online'
        : statuses[i % statuses.length]
    return {
      url,
      region: regionFor(url),
      version: 'v0.6.0',
      height: 11,
      latency: lat == null ? '—' : `${lat}ms`,
      status,
      lastSync: 'hace 12s',
    }
  })
)

const STATUS_TONE: Record<PeerStatus, 'success' | 'warning' | 'neutral'> = {
  online: 'success',
  syncing: 'warning',
  offline: 'neutral',
}
const STATUS_LABEL: Record<PeerStatus, string> = {
  online: 'Online',
  syncing: 'Sincronizando',
  offline: 'Offline',
}

function peerStatusTone(status: PeerStatus): 'success' | 'warning' | 'neutral' {
  return STATUS_TONE[status]
}

function peerStatusLabel(status: PeerStatus): string {
  return STATUS_LABEL[status]
}

const consensusTitle = computed(() =>
  consensusStatus.value === 'running' ? 'Resolviendo consenso' : 'Consenso finalizado'
)

const consensusActionLabel = computed(() =>
  consensusStatus.value === 'running' ? 'Ver estado' : 'Ver detalles'
)

const consensusResultLabel = computed(() => {
  if (consensusStatus.value === 'success') return 'Cadena actualizada'
  if (consensusStatus.value === 'info') return 'Cadena local vigente'
  if (consensusStatus.value === 'error') return 'No se pudo resolver'
  return 'En progreso'
})

const consensusSummary = computed(() => {
  if (consensusStatus.value === 'success') {
    return 'La cadena local fue reemplazada por una mas larga y valida.'
  }
  if (consensusStatus.value === 'info') {
    return 'La cadena local ya era la mas larga y valida.'
  }
  if (consensusStatus.value === 'error') {
    return 'No se pudo validar el consenso. Revisa el estado de los peers.'
  }
  return 'Sincronizando peers y validando cadena.'
})

const consensusDuration = computed(() => {
  if (!consensusStartedAt.value) return '—'
  const end = consensusFinishedAt.value ?? Date.now()
  const seconds = Math.max(0, Math.round((end - consensusStartedAt.value) / 1000))
  return `${seconds}s`
})

const consensusFinishedLabel = computed(() => {
  if (!consensusFinishedAt.value) return '—'
  return new Date(consensusFinishedAt.value).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
})

const consensusChainLength = computed(() =>
  consensusChain.value.length > 0 ? `${consensusChain.value.length}` : '—'
)

const consensusLastBlock = computed(() =>
  consensusChain.value.length > 0 ? consensusChain.value[consensusChain.value.length - 1] : null
)

const consensusLastHeight = computed(() =>
  consensusLastBlock.value ? `#${consensusLastBlock.value.index}` : '—'
)

const consensusLastMerkle = computed(() =>
  consensusLastBlock.value ? formatHash(consensusLastBlock.value.merkleRoot, 12) : '—'
)

const consensusFullMerkle = computed(() => consensusLastBlock.value?.merkleRoot ?? '')

onBeforeUnmount(() => {
  if (consensusTimer) clearInterval(consensusTimer)
  if (consensusAutoClose) clearTimeout(consensusAutoClose)
})

interface PeerColumn {
  key: string
  label: string
  num?: boolean
}
const peerColumns: PeerColumn[] = [
  { key: 'url', label: 'Endpoint' },
  { key: 'region', label: 'Región' },
  { key: 'version', label: 'Versión' },
  { key: 'height', label: 'Altura', num: true },
  { key: 'latency', label: 'Latencia', num: true },
  { key: 'status', label: 'Estado' },
  { key: 'lastSync', label: 'Último sync' },
]
</script>

<template>
  <div class="nodes-view">
    <div class="page-h">
      <div>
        <h1>Red de nodos</h1>
        <p>Peers conectados, sincronización y consenso PoW.</p>
      </div>
      <div class="page-actions">
        <BaseButton variant="primary" size="sm" :loading="resolving" @click="resolveConsensus">
          <template #leading>
            <span class="pi pi-refresh" aria-hidden="true" />
          </template>
          Resolver consenso
        </BaseButton>
      </div>
    </div>

    <div class="bigstat-row">
      <BaseCard variant="bigstat">
        <template #header>
          <span>Peers totales</span>
        </template>
        {{ nodesStore.total }}
        <template #footer> {{ nodesStore.peers.length }} registrados </template>
      </BaseCard>

      <BaseCard variant="bigstat">
        <template #header>
          <span>Altura consenso</span>
        </template>
        11
        <template #footer> 3 nodos coinciden </template>
      </BaseCard>

      <BaseCard variant="bigstat">
        <template #header>
          <span>Latencia media</span>
        </template>
        62ms
        <template #footer> peers online </template>
      </BaseCard>

      <BaseCard variant="bigstat">
        <template #header>
          <span>Estado red</span>
        </template>
        <span class="ok">Saludable</span>
        <template #footer> consenso estable </template>
      </BaseCard>
    </div>

    <div v-if="nodesStore.loading" class="loading-wrap">
      <div class="spinner" />
    </div>

    <div v-if="nodesStore.consensusReplaced === true" class="banner banner-success">
      Consenso aplicado: la cadena local fue reemplazada por una más larga.
    </div>
    <div v-else-if="nodesStore.consensusReplaced === false" class="banner banner-info">
      La cadena local ya es la más larga.
    </div>

    <section>
      <div class="section-h-row">
        <span class="section-h">Peers registrados</span>
        <span class="muted xs">Auto-sync cada 30s</span>
      </div>
      <BaseCard variant="default" padding="none">
        <PaginatedTable :columns="peerColumns" :rows="peerRows" :row-key="(p: PeerRow) => p.url">
          <template #cell-url="{ row }">
            <span class="mono xs">{{ row.url }}</span>
          </template>
          <template #cell-region="{ row }">
            {{ row.region }}
          </template>
          <template #cell-version="{ row }">
            <span class="muted xs">{{ row.version }}</span>
          </template>
          <template #cell-height="{ row }">
            <span class="mono">#{{ row.height }}</span>
          </template>
          <template #cell-latency="{ row }">
            <span class="mono xs">{{ row.latency }}</span>
          </template>
          <template #cell-status="{ row }">
            <BaseBadge :tone="peerStatusTone(row.status)">
              {{ peerStatusLabel(row.status) }}
            </BaseBadge>
          </template>
          <template #cell-lastSync="{ row }">
            <span class="muted xs">{{ row.lastSync }}</span>
          </template>
          <template #row-actions>
            <BaseButton variant="ghost" size="sm" icon-only aria-label="Más acciones">
              ⋯
            </BaseButton>
          </template>
          <template #empty> No hay peers registrados todavía. </template>
        </PaginatedTable>
      </BaseCard>
    </section>

    <section>
      <div class="section-h">Registrar nuevo peer</div>
      <BaseCard variant="default" padding="default">
        <div class="reg-row">
          <input
            v-model="newUrl"
            class="reg-input mono"
            placeholder="http://node.example.io:5000"
            @keyup.enter="registerPeer"
          />
          <BaseButton variant="primary" @click="registerPeer"> Registrar </BaseButton>
        </div>
        <div class="muted xs hint">
          Al registrar, el nodo intercambia su altura y hash de cabecera. Si la cadena remota es más
          larga y válida, se inicia consenso automático.
        </div>
      </BaseCard>
    </section>

    <BaseModal :open="consensusStartOpen" width="520px" @close="closeConsensusStart">
      <template #header>
        <div class="consensus-modal__header">
          <div>
            <h2 class="consensus-modal__title">Consenso en curso</h2>
            <p class="consensus-modal__sub">Validando peers y sincronizando la cadena.</p>
          </div>
          <button
            type="button"
            class="consensus-modal__close"
            aria-label="Cerrar"
            @click="closeConsensusStart"
          >
            <span class="pi pi-times" aria-hidden="true" />
          </button>
        </div>
      </template>

      <div class="consensus-modal__body">
        <div class="consensus-modal__status is-info">
          <span class="pi pi-spin pi-spinner" />
        </div>
        <div class="consensus-modal__message">Resolviendo consenso entre peers...</div>
        <div class="consensus-modal__summary">
          Esto puede tardar unos segundos. Puedes seguir navegando mientras el sistema valida la
          cadena y compara alturas.
        </div>
        <div class="consensus-modal__kvs">
          <div class="consensus-modal__kv">
            <span class="muted">Peers registrados</span>
            <span class="mono">{{ nodesStore.peers.length }}</span>
          </div>
          <div class="consensus-modal__kv">
            <span class="muted">Estado</span>
            <span class="mono">En progreso</span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="consensus-modal__footer">
          <BaseButton variant="ghost" size="sm" @click="closeConsensusStart">
            Continuar en segundo plano
          </BaseButton>
          <BaseButton variant="primary" size="sm" @click="openConsensusDetails">
            Ver estado
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <BackgroundTaskIndicator
      :open="consensusIndicatorOpen"
      position="pill"
      :title="consensusTitle"
      :subtitle="consensusMessage"
      :status="consensusStatus"
      :progress="consensusProgress"
      :show-action="true"
      :action-label="consensusActionLabel"
      :dismissible="consensusStatus !== 'running'"
      @action="openConsensusDetails"
      @close="closeConsensusIndicator"
    />

    <BaseModal :open="consensusDetailOpen" width="520px" @close="closeConsensusDetails">
      <template #header>
        <div class="consensus-modal__header">
          <div>
            <h2 class="consensus-modal__title">Resolver consenso</h2>
            <p class="consensus-modal__sub">Estado de sincronizacion de red.</p>
          </div>
          <button
            type="button"
            class="consensus-modal__close"
            aria-label="Cerrar"
            @click="closeConsensusDetails"
          >
            <span class="pi pi-times" aria-hidden="true" />
          </button>
        </div>
      </template>

      <div class="consensus-modal__body">
        <div class="consensus-modal__status" :class="`is-${consensusStatus}`">
          <span v-if="consensusStatus === 'running'" class="pi pi-spin pi-spinner" />
          <span v-else-if="consensusStatus === 'success'" class="pi pi-check" />
          <span v-else-if="consensusStatus === 'info'" class="pi pi-info-circle" />
          <span v-else class="pi pi-exclamation-triangle" />
        </div>
        <div class="consensus-modal__message">{{ consensusMessage }}</div>
        <div class="consensus-modal__summary">{{ consensusSummary }}</div>
        <div class="consensus-modal__progress" aria-hidden="true">
          <div class="consensus-modal__progress-bar" :style="{ width: `${consensusProgress}%` }" />
        </div>
        <div class="consensus-modal__kvs">
          <div class="consensus-modal__kv">
            <span class="muted">Estado</span>
            <span class="mono">{{ consensusResultLabel }}</span>
          </div>
          <div class="consensus-modal__kv">
            <span class="muted">Peers registrados</span>
            <span class="mono">{{ nodesStore.peers.length }}</span>
          </div>
          <div class="consensus-modal__kv">
            <span class="muted">Altura final</span>
            <span class="mono">{{ consensusLastHeight }}</span>
          </div>
          <div class="consensus-modal__kv">
            <span class="muted">Merkle root</span>
            <span class="consensus-modal__merkle">
              <span class="mono">{{ consensusLastMerkle }}</span>
              <button
                type="button"
                class="consensus-modal__copy"
                :disabled="!consensusFullMerkle"
                @click="copyMerkleRoot"
              >
                Copiar
              </button>
              <button
                type="button"
                class="consensus-modal__toggle"
                :disabled="!consensusFullMerkle"
                @click="showFullMerkle = !showFullMerkle"
              >
                {{ showFullMerkle ? 'Ocultar' : 'Expandir' }}
              </button>
            </span>
          </div>
          <div v-if="showFullMerkle && consensusFullMerkle" class="consensus-modal__hash">
            <span class="mono">{{ consensusFullMerkle }}</span>
          </div>
          <div class="consensus-modal__kv">
            <span class="muted">Bloques en cadena</span>
            <span class="mono">{{ consensusChainLength }}</span>
          </div>
          <div class="consensus-modal__kv">
            <span class="muted">Duracion</span>
            <span class="mono">{{ consensusDuration }}</span>
          </div>
          <div class="consensus-modal__kv">
            <span class="muted">Finalizado</span>
            <span class="mono">{{ consensusFinishedLabel }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="consensus-modal__footer">
          <BaseButton variant="primary" size="sm" @click="closeConsensusDetails">
            Listo
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.nodes-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.page-h {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}
.page-h h1 {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.015em;
  margin: 0 0 2px;
  color: var(--text);
}
.page-h p {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
}
.page-actions {
  display: flex;
  gap: 8px;
}
.bigstat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.ok {
  color: var(--success);
}
.section-h-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}
.section-h {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
  display: inline-block;
}
.xs {
  font-size: 11.5px;
}
.muted {
  color: var(--text-3);
}
.mono {
  font-family: var(--font-mono);
}
.reg-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.reg-input {
  flex: 1;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  padding: 8px 12px;
  font-size: 12.5px;
  outline: none;
}
.reg-input:focus {
  border-color: var(--accent);
}
.hint {
  margin-top: 10px;
}
.banner {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 14px;
  font-size: 13px;
}
.banner-success {
  background: var(--success-soft);
  border-color: var(--success);
  color: var(--success);
}
.banner-info {
  background: var(--surface-2);
  color: var(--text-2);
}
.loading-wrap {
  display: grid;
  place-items: center;
  padding: 40px;
}
.consensus-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.consensus-modal__title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px;
  color: var(--text);
}
.consensus-modal__sub {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-2);
}
.consensus-modal__close {
  border: 0;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 8px;
}
.consensus-modal__close:hover {
  background: var(--hover);
  color: var(--text);
}
.consensus-modal__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 12px 0 4px;
  text-align: center;
}
.consensus-modal__status {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 22px;
  background: var(--surface-2);
  color: var(--text-2);
}
.consensus-modal__status.is-success {
  background: var(--success-soft);
  color: var(--success);
}
.consensus-modal__status.is-info {
  background: var(--surface-2);
  color: var(--text-2);
}
.consensus-modal__status.is-error {
  background: var(--danger-soft, rgba(185, 28, 28, 0.12));
  color: var(--danger, #b91c1c);
}
.consensus-modal__message {
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.5;
}
.consensus-modal__summary {
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.5;
  max-width: 420px;
}
.consensus-modal__kvs {
  width: 100%;
  margin-top: 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.consensus-modal__kv {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
}
.consensus-modal__merkle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.consensus-modal__copy,
.consensus-modal__toggle {
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 999px;
  cursor: pointer;
}
.consensus-modal__copy:hover,
.consensus-modal__toggle:hover {
  background: var(--hover);
  color: var(--text);
}
.consensus-modal__copy:disabled,
.consensus-modal__toggle:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.consensus-modal__hash {
  border: 1px dashed var(--border);
  border-radius: 10px;
  padding: 8px 10px;
  background: var(--surface-2);
  font-size: 11.5px;
  word-break: break-all;
}
.consensus-modal__progress {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  overflow: hidden;
}
.consensus-modal__progress-bar {
  height: 100%;
  background: var(--accent);
  transition: width 0.28s ease;
}
.consensus-modal__footer {
  display: flex;
  justify-content: flex-end;
}
@media (max-width: 900px) {
  .bigstat-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
