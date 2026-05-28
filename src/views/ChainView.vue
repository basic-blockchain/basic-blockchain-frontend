<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useChainStore } from '@/stores/chain'
import { formatHash, type Block } from '@/domain/block'
import MineBlockFlow, { type MineBlockData } from '@/components/flows/MineBlockFlow.vue'
import BaseCard from '@/components/atoms/BaseCard.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import HashChip from '@/components/atoms/HashChip.vue'

const chainStore = useChainStore()
const route = useRoute()
const showMineFlow = ref(false)
const selectedIndex = ref<number>(0)
const blockHashes = ref<Record<number, string>>({})

function deepLinkedBlock(): number | null {
  const raw = route.query.block
  if (typeof raw !== 'string') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

async function focusBlock(index: number) {
  selectedIndex.value = index
  await nextTick()
  const el = document.getElementById(`block-row-${index}`)
  if (el && typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

onMounted(async () => {
  await chainStore.fetchChain()
  const target = deepLinkedBlock()
  if (target !== null) await focusBlock(target)
})

watch(
  () => route.query.block,
  async (raw) => {
    if (typeof raw !== 'string') return
    const n = Number(raw)
    if (Number.isFinite(n)) await focusBlock(n)
  }
)

watch(
  () => chainStore.blocks,
  (blocks) => {
    if (!blocks.length) return
    const target = deepLinkedBlock()
    if (target !== null && blocks.some((b) => b.index === target)) {
      selectedIndex.value = target
      return
    }
    if (selectedIndex.value === 0) {
      selectedIndex.value = blocks[blocks.length - 1].index
    }
  },
  { immediate: true }
)

const selectedBlock = computed<Block | null>(() => {
  return (
    chainStore.blocks.find((b) => b.index === selectedIndex.value) ?? chainStore.latestBlock ?? null
  )
})

async function computeBlockHash(block: Block): Promise<string | null> {
  if (!('crypto' in window) || !window.crypto?.subtle) return null
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
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

watch(
  selectedBlock,
  async (block) => {
    if (!block) return
    if (blockHashes.value[block.index]) return
    const hash = await computeBlockHash(block)
    if (!hash) return
    blockHashes.value = { ...blockHashes.value, [block.index]: hash }
  },
  { immediate: true }
)

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

function isCoinbaseTx(sender: string): boolean {
  const upper = sender.trim().toUpperCase()
  return upper.startsWith('COINBASE') || upper.startsWith('MINT')
}

function txRef(index: number, blockIndex: number): string {
  return `tx_${blockIndex}_${index + 1}`
}
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
        <BaseButton variant="ghost" size="sm" @click="chainStore.fetchChain()">
          Sincronizar
        </BaseButton>
        <BaseButton variant="primary" size="sm" @click="showMineFlow = true">
          Minar bloque
        </BaseButton>
      </div>
    </div>

    <div class="bigstat-row">
      <BaseCard variant="bigstat">
        <template #header>
          <span>Altura</span>
        </template>
        {{ heightLabel }}
        <template #footer> {{ chainStore.length }} bloques </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          <span>Tiempo medio</span>
        </template>
        5m 42s
        <template #footer> objetivo: 6m </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          <span>Dificultad</span>
        </template>
        {{ chainStore.latestBlock?.proof ?? '—' }}
        <template #footer> nonce · PoW </template>
      </BaseCard>
      <BaseCard variant="bigstat">
        <template #header>
          <span>Último bloque</span>
        </template>
        {{ latestTime }}
        <template #footer> timestamp on-chain </template>
      </BaseCard>
    </div>

    <div v-if="chainStore.loading" class="loading-wrap">
      <div class="spinner" />
    </div>

    <div v-else class="explorer">
      <BaseCard variant="default" padding="none">
        <template #header>
          <div class="list-h">
            <span>Bloques recientes</span>
            <span class="muted">{{ chainStore.length }} bloques</span>
          </div>
        </template>
        <div class="list-body">
          <div
            v-for="b in reversedBlocks"
            :id="`block-row-${b.index}`"
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
              <div class="muted xs">
                {{ timeAgo(b.timestamp) }}
              </div>
            </div>
          </div>
        </div>
      </BaseCard>

      <BaseCard variant="default" padding="default">
        <template v-if="selectedBlock">
          <div class="detail-h">
            <div class="hash-box mono">#{{ selectedBlock.index }}</div>
            <div class="grow">
              <div class="title">Bloque #{{ selectedBlock.index }}</div>
              <div class="muted small">
                {{ selectedBlock.timestamp }} · minado proof {{ selectedBlock.proof }}
              </div>
            </div>
            <BaseBadge tone="success"> Confirmado </BaseBadge>
          </div>

          <div class="kvs">
            <div class="kv">
              <span class="muted">Hash</span>
              <span v-if="selectedBlock" class="mono">
                <HashChip
                  v-if="blockHashes[selectedBlock.index]"
                  :hash="blockHashes[selectedBlock.index]"
                  :length="16"
                  label="hash"
                />
                <span v-else>—</span>
              </span>
            </div>
            <div
              v-for="(row, i) in kvs"
              :key="row[0]"
              class="kv"
              :class="{ last: i === kvs.length - 1 }"
            >
              <span class="muted">{{ row[0] }}</span>
              <span class="mono">{{ row[1] }}</span>
            </div>
          </div>

          <div class="txs">
            <div class="section-h">Transacciones</div>
            <div v-if="selectedBlock.transactions.length" class="tx-list">
              <div
                v-for="(tx, index) in selectedBlock.transactions"
                :key="txRef(index, selectedBlock.index)"
                class="tx-row"
              >
                <span class="tx-ic" :class="{ 'tx-ic--coinbase': isCoinbaseTx(tx.sender) }">
                  {{ isCoinbaseTx(tx.sender) ? '⛏' : '→' }}
                </span>
                <div class="tx-body">
                  <div class="tx-main mono">
                    <span v-if="isCoinbaseTx(tx.sender)" class="tx-coinbase">
                      {{ tx.sender }}
                    </span>
                    <span v-else>{{ tx.sender }}</span>
                    <span class="tx-arrow">→</span>
                    <span>{{ tx.receiver }}</span>
                  </div>
                  <div class="tx-sub mono muted">
                    {{ txRef(index, selectedBlock.index) }}
                  </div>
                </div>
                <div class="tx-amt">
                  <div class="mono tx-amt-val">
                    {{ tx.amount }}
                    <span class="tx-cur muted">{{ tx.currency ?? '—' }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="tx-empty">
              <span class="mono muted">Sin transacciones en este bloque.</span>
            </div>
          </div>
        </template>
        <div v-else class="empty muted">Selecciona un bloque para ver el detalle.</div>
      </BaseCard>
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
.explorer {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 12px;
}
.list-h {
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: var(--text);
  border-bottom: 1px solid var(--border);
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
.muted {
  color: var(--text-3);
}
.mono {
  font-family: var(--font-mono);
}
.xs {
  font-size: 10.5px;
  margin-top: 2px;
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
.txs {
  margin-top: 18px;
}
.tx-list {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--surface);
}
.tx-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
}
.tx-row:last-child {
  border-bottom: none;
}
.tx-ic {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent-text);
  font-size: 12px;
}
.tx-ic--coinbase {
  background: var(--success-soft);
  color: var(--success);
}
.tx-body {
  flex: 1;
  min-width: 0;
}
.tx-main {
  font-size: 11.5px;
  color: var(--text);
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}
.tx-coinbase {
  color: var(--accent-text);
}
.tx-arrow {
  color: var(--text-3);
}
.tx-sub {
  font-size: 10.5px;
  margin-top: 2px;
}
.tx-amt {
  text-align: right;
  min-width: 80px;
}
.tx-amt-val {
  font-weight: 500;
}
.tx-cur {
  font-size: 11px;
  margin-left: 6px;
}
.tx-empty {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 16px;
  text-align: center;
  font-size: 12px;
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
