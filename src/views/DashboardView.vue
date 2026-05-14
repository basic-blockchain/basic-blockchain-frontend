<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'
import { useChainStore } from '@/stores/chain'
import { useMempoolStore } from '@/stores/mempool'
import { useMetricsStore } from '@/stores/metrics'
import { sharedWsStatus } from '@/composables/useBlockchainWs'
import ChainList from '@/components/organisms/ChainList.vue'
import MempoolTable from '@/components/organisms/MempoolTable.vue'
import MineBlockFlow from '@/components/flows/MineBlockFlow.vue'
import type { MineBlockData } from '@/components/flows/MineBlockFlow.vue'

const chainStore = useChainStore()
const mempoolStore = useMempoolStore()
const metricsStore = useMetricsStore()

const nodeStatus = computed(() => metricsStore.health?.status ?? null)
const wsLive = computed(() => sharedWsStatus.value === 'OPEN')

const showMineFlow = ref(false)
const mineData = computed<MineBlockData>(() => ({
  nextHeight: (metricsStore.metrics?.chainHeight ?? 0) + 1,
  pendingCount: mempoolStore.count,
  prevHash: '—',
}))

// Flash state — triggers brief glow on the chain panel when a new block arrives
const flashBlocks = ref(false)
const newBlockIndex = ref<number | null>(null)
let flashTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => chainStore.latestBlock,
  (block, prev) => {
    if (block && block.index !== prev?.index) {
      newBlockIndex.value = block.index
      flashBlocks.value = true
      if (flashTimer) clearTimeout(flashTimer)
      flashTimer = setTimeout(() => {
        flashBlocks.value = false
      }, 2500)
    }
  },
)

async function refreshAll() {
  await Promise.all([
    chainStore.fetchChain(),
    mempoolStore.fetchPending(),
    metricsStore.fetchAll(),
  ])
}

onMounted(refreshAll)

function formatTs(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return ts
  }
}
</script>

<template>
  <div class="dashboard">
    <div class="page-h">
      <div>
        <h1>Dashboard</h1>
        <p class="page-sub">
          Estado en tiempo real de la cadena
          <span class="live-pill" :class="wsLive ? 'live' : 'reconnecting'">
            <span class="live-dot" aria-hidden="true" />
            {{ wsLive ? 'Live' : 'Reconectando…' }}
          </span>
        </p>
      </div>
      <button class="btn btn-primary btn-sm" type="button" @click="showMineFlow = true">
        <span class="pi pi-bolt" aria-hidden="true" />
        Minar
      </button>
    </div>

    <!-- KPI bigstat row -->
    <div class="bigstat-row">
      <div class="bigstat">
        <div class="lb">Altura</div>
        <div class="vl">{{ metricsStore.metrics?.chainHeight ?? '—' }}</div>
        <div class="ds">bloques confirmados</div>
      </div>
      <div class="bigstat">
        <div class="lb">Mempool</div>
        <div class="vl">{{ mempoolStore.count }}</div>
        <div class="ds">txs pendientes</div>
      </div>
      <div class="bigstat">
        <div class="lb">Avg. minado</div>
        <div class="vl">
          {{ metricsStore.metrics?.avgMineTimeSeconds != null
              ? metricsStore.metrics.avgMineTimeSeconds.toFixed(2)
              : '—' }}<span
            v-if="metricsStore.metrics?.avgMineTimeSeconds != null"
            class="vl-unit"
          >s</span>
        </div>
        <div class="ds">tiempo medio</div>
      </div>
      <div class="bigstat">
        <div class="lb">Nodo</div>
        <div class="vl">
          <span
            class="node-dot"
            :class="nodeStatus === 'ok' ? 'ok' : nodeStatus === 'degraded' ? 'degraded' : 'unknown'"
            aria-hidden="true"
          />
          {{ nodeStatus === 'ok' ? 'Operativo' : nodeStatus === 'degraded' ? 'Degradado' : '—' }}
        </div>
        <div class="ds">
          {{ metricsStore.health?.db === 'ok'
              ? 'DB conectada'
              : metricsStore.health?.db === 'error'
              ? 'DB error'
              : 'DB n/a' }}
        </div>
      </div>
    </div>

    <!-- Content grid -->
    <div class="dashboard-grid">
      <section class="panel" :class="{ 'panel-flash': flashBlocks }">
        <div class="panel-h">
          <span>Bloques recientes</span>
          <span class="count-badge sm">{{ chainStore.length }}</span>
          <Transition name="badge-pop">
            <span v-if="flashBlocks" class="new-block-badge">
              <span class="pi pi-bolt" aria-hidden="true" />
              Bloque #{{ newBlockIndex }}
              <span v-if="chainStore.latestBlock"> · {{ formatTs(chainStore.latestBlock.timestamp) }}</span>
            </span>
          </Transition>
          <span class="panel-h-spacer" />
          <span
            v-if="!wsLive"
            class="ws-warn"
            title="WebSocket desconectado — actualizaciones pausadas"
          >
            <span class="pi pi-wifi" aria-hidden="true" /> Sin live
          </span>
        </div>
        <ChainList :blocks="chainStore.recentBlocks" compact />
      </section>

      <section class="panel">
        <div class="panel-h">
          <span>Mempool</span>
          <span class="count-badge sm">{{ mempoolStore.count }}</span>
        </div>
        <MempoolTable :transactions="mempoolStore.transactions" />
      </section>
    </div>

    <MineBlockFlow
      v-if="showMineFlow"
      :data="mineData"
      @close="showMineFlow = false"
      @complete="refreshAll"
    />
  </div>
</template>

<style scoped>
.dashboard {
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
.page-sub {
  margin: 0;
  color: var(--text-2);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* Live / reconnecting pill */
.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  letter-spacing: 0.01em;
}
.live-pill.live {
  background: color-mix(in srgb, var(--success) 12%, transparent);
  color: var(--success);
}
.live-pill.reconnecting {
  background: color-mix(in srgb, var(--warning) 12%, transparent);
  color: var(--warning);
}
.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
.live-pill.live .live-dot {
  animation: pulse-live 2s ease-in-out infinite;
}
@keyframes pulse-live {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.7); }
}

/* Bigstat KPIs */
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
  font-variant-numeric: tabular-nums;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
.vl-unit {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-2);
}
.ds {
  font-size: 11.5px;
  color: var(--text-3);
}

.node-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-bottom: 2px;
}
.node-dot.ok       { background: var(--success); box-shadow: 0 0 0 3px var(--success-soft); }
.node-dot.degraded { background: var(--warning); box-shadow: 0 0 0 3px var(--warning-soft); }
.node-dot.unknown  { background: var(--border-strong); }

/* Two-column dashboard grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* Local panel override */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  padding: 0;
  box-shadow: none;
  transition: box-shadow 0.3s, border-color 0.3s;
}
.panel-flash {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
  animation: flash-glow 2.5s ease-out forwards;
}
@keyframes flash-glow {
  0%   { box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 28%, transparent); border-color: var(--accent); }
  100% { box-shadow: none; border-color: var(--border); }
}

.panel-h {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.panel-h-spacer { flex: 1; }

/* New block badge */
.new-block-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
  text-transform: none;
  letter-spacing: 0;
}
.badge-pop-enter-active { transition: opacity 0.2s, transform 0.2s; }
.badge-pop-leave-active { transition: opacity 0.4s, transform 0.3s; }
.badge-pop-enter-from   { opacity: 0; transform: scale(0.8); }
.badge-pop-leave-to     { opacity: 0; transform: scale(0.9); }

/* WS disconnected warning in panel header */
.ws-warn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  font-weight: 500;
  color: var(--warning);
  text-transform: none;
  letter-spacing: 0;
}

@media (max-width: 900px) {
  .bigstat-row     { grid-template-columns: 1fr 1fr; }
  .dashboard-grid  { grid-template-columns: 1fr; }
  .page-h          { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 560px) {
  .bigstat-row { grid-template-columns: 1fr; }
}
</style>
