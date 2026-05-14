<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useChainStore } from '@/stores/chain'
import { formatHash, type Block } from '@/domain/block'
import MineBlockFlow, { type MineBlockData } from '@/components/flows/MineBlockFlow.vue'

const chainStore = useChainStore()
const showMineFlow = ref(false)
const selectedIndex = ref<number>(0)

onMounted(() => chainStore.fetchChain())

watch(
  () => chainStore.blocks,
  (blocks) => {
    if (blocks.length && selectedIndex.value === 0) {
      selectedIndex.value = blocks[blocks.length - 1].index
    }
  },
  { immediate: true },
)

const selectedBlock = computed<Block | null>(() => {
  return (
    chainStore.blocks.find((b) => b.index === selectedIndex.value) ??
    chainStore.latestBlock ??
    null
  )
})

function timeAgo(ts: string | null | undefined): string {
  if (!ts) return '—'
  const then = new Date(ts).getTime()
  if (Number.isNaN(then)) return ts
  const diff = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (diff < 60) return `hace ${diff}s`
  if (diff < 3600) {
    const m = Math.floor(diff / 60)
    const s = diff % 60
    return `hace ${m}m ${s}s`
  }
  return ts
}

const heightLabel = computed(() => Math.max(0, chainStore.length - 1))
const latestTime = computed(() => timeAgo(chainStore.latestBlock?.timestamp))
const reversedBlocks = computed(() => [...chainStore.blocks].reverse())

const kvs = computed(() => {
  const b = selectedBlock.value
  if (!b) return [] as Array<[string, string]>
  return [
    ['Hash', '—'],
    ['Previous hash', formatHash(b.previousHash, 16)],
    ['Merkle root', formatHash(b.merkleRoot, 16)],
    ['Proof / nonce', b.proof.toLocaleString('en-US')],
    ['Dificultad', '4 (hash empieza con 4 ceros)'],
    ['Tamaño', `${b.transactions.length * 280 + 240} bytes`],
    ['Transacciones', String(b.transactions.length)],
  ] as Array<[string, string]>
})

const mineData = computed<MineBlockData>(() => ({
  nextHeight: chainStore.length,
  pendingCount: 3,
  prevHash: chainStore.latestBlock?.previousHash ?? '',
}))
</script>

<template>
  <div class="chain-view">
    <div class="page-h">
      <div>
        <h1>Cadena de bloques</h1>
        <p>
          Explorador on-chain · altura actual <strong>{{ heightLabel }}</strong>
        </p>
      </div>
      <div class="page-actions">
        <button class="btn btn-sm" @click="chainStore.fetchChain()">
          <i class="pi pi-refresh" />
          <span>Sincronizar</span>
        </button>
        <button class="btn btn-sm btn-primary" @click="showMineFlow = true">
          <span>⛏</span>
          <span>Minar bloque</span>
        </button>
      </div>
    </div>

    <div class="bigstat-row">
      <div class="bigstat">
        <div class="lb">Altura</div>
        <div class="vl">{{ heightLabel }}</div>
        <div class="ds">{{ chainStore.length }} bloques</div>
      </div>
      <div class="bigstat">
        <div class="lb">Tiempo medio</div>
        <div class="vl">5m 42s</div>
        <div class="ds">objetivo: 6m</div>
      </div>
      <div class="bigstat">
        <div class="lb">Dificultad</div>
        <div class="vl">{{ chainStore.latestBlock?.proof ?? '—' }}</div>
        <div class="ds">nonce · PoW</div>
      </div>
      <div class="bigstat">
        <div class="lb">Último bloque</div>
        <div class="vl">{{ latestTime }}</div>
        <div class="ds">timestamp on-chain</div>
      </div>
    </div>

    <div v-if="chainStore.loading" class="loading-wrap">
      <div class="spinner" />
    </div>

    <div v-else class="explorer">
      <div class="flow-card">
        <div class="list-h">
          <span>Bloques recientes</span>
          <span class="muted">{{ chainStore.length }} bloques</span>
        </div>
        <div class="list-body">
          <div
            v-for="b in reversedBlocks"
            :key="b.index"
            class="block-row"
            :class="{ selected: selectedIndex === b.index }"
            @click="selectedIndex = b.index"
          >
            <div
              class="bh mono"
              :style="{ color: selectedIndex === b.index ? 'var(--accent-text)' : 'var(--accent)' }"
            >
              #{{ b.index }}
            </div>
            <div class="bi">
              <div class="mono small">PREV {{ formatHash(b.previousHash, 8) }}</div>
              <div class="mono small">MERKLE {{ formatHash(b.merkleRoot, 8) }}</div>
            </div>
            <div class="bs">
              <div>{{ b.transactions.length }} tx · proof {{ b.proof }}</div>
              <div class="muted xs">{{ timeAgo(b.timestamp) }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="flow-card detail">
        <template v-if="selectedBlock">
          <div class="detail-h">
            <div class="hash-box mono">#{{ selectedBlock.index }}</div>
            <div class="grow">
              <div class="title">Bloque #{{ selectedBlock.index }}</div>
              <div class="muted small">
                {{ selectedBlock.timestamp }} · minado proof {{ selectedBlock.proof }}
              </div>
            </div>
            <span class="bdg bdg-active">Confirmado</span>
          </div>

          <div class="kvs">
            <div v-for="(row, i) in kvs" :key="row[0]" class="kv" :class="{ last: i === kvs.length - 1 }">
              <span class="muted">{{ row[0] }}</span>
              <span class="mono">{{ row[1] }}</span>
            </div>
          </div>

          <div v-if="selectedBlock.transactions.length" class="txs">
            <div class="section-h">Transacciones</div>
            <table class="tbl">
              <thead>
                <tr>
                  <th>De</th>
                  <th>Para</th>
                  <th class="num">Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(tx, i) in selectedBlock.transactions" :key="i">
                  <td class="mono small">{{ tx.sender }}</td>
                  <td class="mono small">{{ tx.receiver }}</td>
                  <td class="num mono">{{ tx.amount }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
        <div v-else class="empty muted">Selecciona un bloque para ver el detalle.</div>
      </div>
    </div>

    <MineBlockFlow
      v-if="showMineFlow"
      :data="mineData"
      @close="showMineFlow = false"
      @complete="chainStore.fetchChain()"
    />
  </div>
</template>

<style scoped>
.chain-view {
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
.ds {
  font-size: 11.5px;
  color: var(--text-3);
}
.explorer {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 12px;
}
.list-h {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: var(--text);
}
.list-body {
  max-height: 460px;
  overflow-y: auto;
}
.block-row {
  display: grid;
  grid-template-columns: 50px 1fr auto;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  align-items: center;
}
.block-row.selected {
  background: var(--accent-soft);
}
.bh {
  font-size: 16px;
  font-weight: 600;
}
.bi .small {
  font-size: 11px;
  color: var(--text-3);
}
.bs {
  text-align: right;
  font-size: 11.5px;
  color: var(--text-2);
}
.bs .xs {
  font-size: 10.5px;
  margin-top: 2px;
}
.detail {
  padding: 16px;
}
.detail-h {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
}
.hash-box {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--accent-soft);
  display: grid;
  place-items: center;
  font-weight: 700;
  color: var(--accent-text);
}
.grow {
  flex: 1;
}
.title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}
.small {
  font-size: 11.5px;
}
.kvs {
  display: flex;
  flex-direction: column;
}
.kv {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
  font-size: 12.5px;
}
.kv.last {
  border-bottom: none;
}
.section-h {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 14px 0 8px;
}
.txs .tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.tbl th,
.tbl td {
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
}
.tbl th.num,
.tbl td.num {
  text-align: right;
}
.empty {
  padding: 40px;
  text-align: center;
}
.loading-wrap {
  display: grid;
  place-items: center;
  padding: 60px;
}
@media (max-width: 900px) {
  .bigstat-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .explorer {
    grid-template-columns: 1fr;
  }
}
</style>
