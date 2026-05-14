<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useNodesStore } from '@/stores/nodes'

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

interface PeerRow {
  url: string
  region: string
  version: string
  height: number
  latency: string
  status: 'online' | 'syncing' | 'offline'
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
    const status =
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
  }),
)

function badgeClass(status: 'online' | 'syncing' | 'offline'): string {
  if (status === 'online') return 'bdg bdg-active'
  if (status === 'syncing') return 'bdg bdg-pending_kyc'
  return 'bdg bdg-banned'
}
</script>

<template>
  <div class="nodes-view">
    <div class="page-h">
      <div>
        <h1>Red de nodos</h1>
        <p>Peers conectados, sincronización y consenso PoW.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-sm btn-primary" :disabled="resolving" @click="resolveConsensus">
          <i class="pi pi-refresh" />
          <span>Resolver consenso</span>
        </button>
      </div>
    </div>

    <div class="bigstat-row">
      <div class="bigstat">
        <div class="lb">Peers totales</div>
        <div class="vl">{{ nodesStore.total }}</div>
        <div class="ds">{{ nodesStore.peers.length }} registrados</div>
      </div>
      <div class="bigstat">
        <div class="lb">Altura consenso</div>
        <div class="vl">11</div>
        <div class="ds">3 nodos coinciden</div>
      </div>
      <div class="bigstat">
        <div class="lb">Latencia media</div>
        <div class="vl">62ms</div>
        <div class="ds">peers online</div>
      </div>
      <div class="bigstat">
        <div class="lb">Estado red</div>
        <div class="vl ok">Saludable</div>
        <div class="ds">consenso estable</div>
      </div>
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
      <div class="flow-card">
        <div v-if="peerRows.length === 0" class="empty muted">
          No hay peers registrados todavía.
        </div>
        <table v-else class="tbl">
          <thead>
            <tr>
              <th>Endpoint</th>
              <th>Región</th>
              <th>Versión</th>
              <th class="num">Altura</th>
              <th class="num">Latencia</th>
              <th>Estado</th>
              <th>Último sync</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in peerRows" :key="p.url">
              <td class="mono xs">{{ p.url }}</td>
              <td>{{ p.region }}</td>
              <td class="muted xs">{{ p.version }}</td>
              <td class="num mono">#{{ p.height }}</td>
              <td class="num mono xs">{{ p.latency }}</td>
              <td><span :class="badgeClass(p.status)">{{ p.status }}</span></td>
              <td class="muted xs">{{ p.lastSync }}</td>
              <td>
                <button class="btn btn-icon btn-sm">
                  <i class="pi pi-ellipsis-h" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <div class="section-h">Registrar nuevo peer</div>
      <div class="flow-card register">
        <div class="reg-row">
          <input
            v-model="newUrl"
            class="reg-input mono"
            placeholder="http://node.example.io:5000"
            @keyup.enter="registerPeer"
          />
          <button class="btn btn-primary" @click="registerPeer">
            <i class="pi pi-plus" />
            <span>Registrar</span>
          </button>
        </div>
        <div class="muted xs hint">
          Al registrar, el nodo intercambia su altura y hash de cabecera. Si la cadena remota es más
          larga y válida, se inicia consenso automático.
        </div>
      </div>
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
.bigstat {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
}
.lb {
  font-size: 11.5px;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.vl {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 4px 0;
  color: var(--text);
}
.vl.ok {
  color: var(--success);
}
.ds {
  font-size: 11.5px;
  color: var(--text-3);
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
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.tbl th,
.tbl td {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
.tbl tr:last-child td {
  border-bottom: none;
}
.tbl th.num,
.tbl td.num {
  text-align: right;
}
.xs {
  font-size: 11.5px;
}
.empty {
  padding: 40px;
  text-align: center;
}
.register {
  padding: 14px;
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
