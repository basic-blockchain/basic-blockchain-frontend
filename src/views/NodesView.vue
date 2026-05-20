<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useNodesStore } from '@/stores/nodes'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import PaginatedTable from '@/components/organisms/PaginatedTable.vue'

const nodesStore = useNodesStore()

const newUrl = ref('http://localhost:5001')
const resolving = ref(false)

onMounted(() => nodesStore.fetchNodes())

async function resolveConsensus() {
  resolving.value = true
  try {
    await nodesStore.resolve()
  } finally {
    resolving.value = false
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
@media (max-width: 900px) {
  .bigstat-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
