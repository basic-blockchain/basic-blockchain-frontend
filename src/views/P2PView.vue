<script setup lang="ts">
import { ref, computed } from 'vue'

type Direction = 'sell' | 'buy'
type TabKey = 'buy' | 'sell' | 'orders'

interface Offer {
  id: string
  dir: Direction
  name: string
  verified: boolean
  completed: number
  rate: number
  price: string
  limitMin: string
  limitMax: string
  methods: string[]
  asset: string
  online: boolean
}

const activeTab = ref<TabKey>('buy')
const filterOnline = ref(true)
const filterAsset = ref('USDT')

const offers: Offer[] = [
  { id: 'o1', dir: 'sell', name: 'CryptoMaria',  verified: true,  completed: 1248, rate: 98.2, price: '1,250.50', limitMin: '50',   limitMax: '5,000',  methods: ['Mercado Pago', 'Transferencia', 'Cash'], asset: 'USDT', online: true },
  { id: 'o2', dir: 'sell', name: 'PesosBTC',     verified: true,  completed: 8412, rate: 99.4, price: '1,248.00', limitMin: '500',  limitMax: '12,000', methods: ['Transferencia bancaria', 'Brubank'],      asset: 'USDT', online: true },
  { id: 'o3', dir: 'sell', name: 'GauchoCripto', verified: false, completed: 142,  rate: 96.1, price: '1,255.10', limitMin: '100',  limitMax: '1,500',  methods: ['Mercado Pago'],                           asset: 'USDT', online: true },
  { id: 'o4', dir: 'sell', name: 'TradeAR',      verified: true,  completed: 412,  rate: 97.8, price: '1,251.80', limitMin: '200',  limitMax: '8,000',  methods: ['Uala', 'Transferencia'],                  asset: 'USDT', online: false },
  { id: 'o5', dir: 'buy',  name: 'NorteCambio',  verified: true,  completed: 2841, rate: 99.0, price: '1,243.00', limitMin: '500',  limitMax: '10,000', methods: ['Transferencia bancaria'],                 asset: 'USDT', online: true },
  { id: 'o6', dir: 'buy',  name: 'SurCoin',      verified: true,  completed: 642,  rate: 98.5, price: '1,241.50', limitMin: '100',  limitMax: '4,000',  methods: ['Mercado Pago', 'Brubank'],                asset: 'USDT', online: true },
]

const stats = [
  { label: 'Ofertas activas',       value: '412',       detail: '218 compra · 194 venta' },
  { label: 'Precio prom. USDT',     value: '$1,248.40', detail: '+0.4% 24h', detailColor: 'var(--success)' },
  { label: 'Volumen 24h',           value: '$782K',     detail: '3.1k operaciones' },
  { label: 'Disputas abiertas',     value: '3',         valueColor: 'var(--danger)', detail: 'SLA 4h · 1 vencida' },
]

const displayOffers = computed<Offer[]>(() => {
  const side: Direction = activeTab.value === 'buy' ? 'sell' : 'buy'
  return offers.filter((o) => {
    const matchDir = o.dir === side
    const matchOnline = !filterOnline.value || o.online
    const matchAsset = o.asset === filterAsset.value
    return matchDir && matchOnline && matchAsset
  })
})

function avatarInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}
</script>

<template>
  <div class="p2p-view">
    <div class="page-h">
      <div>
        <h1>Mercado P2P</h1>
        <p>Comprá y vendé activos de forma directa con otros usuarios de la plataforma.</p>
      </div>
    </div>

    <!-- Big stats -->
    <div class="bigstat-row">
      <div v-for="s in stats" :key="s.label" class="bigstat">
        <div class="bigstat-lb">{{ s.label }}</div>
        <div class="bigstat-vl" :style="s.valueColor ? { color: s.valueColor } : {}">{{ s.value }}</div>
        <div class="bigstat-ds" :style="s.detailColor ? { color: s.detailColor } : {}">{{ s.detail }}</div>
      </div>
    </div>

    <!-- Tab strip -->
    <div class="tabstrip" role="tablist">
      <button role="tab" class="tab-item" :class="{ active: activeTab === 'buy' }" :aria-selected="activeTab === 'buy'" @click="activeTab = 'buy'">
        Quiero comprar
      </button>
      <button role="tab" class="tab-item" :class="{ active: activeTab === 'sell' }" :aria-selected="activeTab === 'sell'" @click="activeTab = 'sell'">
        Quiero vender
      </button>
      <button role="tab" class="tab-item" :class="{ active: activeTab === 'orders' }" :aria-selected="activeTab === 'orders'" @click="activeTab = 'orders'">
        Mis órdenes
      </button>
    </div>

    <!-- Filters toolbar -->
    <div class="toolbar">
      <select v-model="filterAsset" class="chip-select">
        <option value="USDT">Activo · USDT</option>
        <option value="NATIVE">Activo · NATIVE</option>
      </select>
      <span class="chip">Pago · Todos</span>
      <label class="toggle-label">
        <input v-model="filterOnline" type="checkbox" class="toggle-input-hidden" />
        <span class="toggle-track"><span class="toggle-thumb" /></span>
        <span class="toggle-text">Online ahora</span>
      </label>
      <span class="count-badge">{{ displayOffers.length }} oferta{{ displayOffers.length !== 1 ? 's' : '' }}</span>
    </div>

    <!-- My orders placeholder -->
    <template v-if="activeTab === 'orders'">
      <div class="empty-state">
        <span class="pi pi-inbox" style="font-size: 28px; color: var(--text-3)" aria-hidden="true" />
        <p>No tenés órdenes activas.</p>
      </div>
    </template>

    <!-- Offers grid -->
    <template v-else>
      <div v-if="displayOffers.length === 0" class="empty-state">
        <span class="pi pi-search" style="font-size: 28px; color: var(--text-3)" aria-hidden="true" />
        <p>Sin ofertas disponibles con los filtros actuales.</p>
      </div>
      <div v-else class="offers-grid">
        <div v-for="offer in displayOffers" :key="offer.id" class="offer-card">
          <div class="offer-seller">
            <div class="offer-avatar" aria-hidden="true">{{ avatarInitial(offer.name) }}</div>
            <div class="offer-seller-info">
              <div class="offer-name">
                {{ offer.name }}
                <span v-if="offer.verified" class="verified-dot" aria-label="Verificado">● verificado</span>
              </div>
              <div class="offer-meta">{{ offer.completed.toLocaleString('es-AR') }} operaciones · {{ offer.rate }}% completadas</div>
            </div>
            <div class="online-dot" :class="offer.online ? 'online' : 'offline'" :title="offer.online ? 'Online' : 'Offline'" />
          </div>

          <div class="offer-price">
            ${{ offer.price }}
            <span class="offer-unit">ARS / {{ offer.asset }}</span>
          </div>

          <div class="offer-limits">Límite: {{ offer.limitMin }} – {{ offer.limitMax }} {{ offer.asset }}</div>

          <div class="offer-methods">
            <span v-for="m in offer.methods.slice(0, 2)" :key="m" class="method-chip">{{ m }}</span>
            <span v-if="offer.methods.length > 2" class="method-chip method-more">+{{ offer.methods.length - 2 }}</span>
          </div>

          <button
            class="offer-cta"
            :class="activeTab === 'buy' ? 'cta-buy' : 'cta-sell'"
          >
            {{ activeTab === 'buy' ? 'Comprar' : 'Vender' }} {{ offer.asset }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.p2p-view { display: flex; flex-direction: column; gap: 14px; }

.page-h { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
.page-h h1 { font-size: 22px; font-weight: 600; letter-spacing: -0.015em; margin: 0 0 2px; color: var(--text); }
.page-h p  { margin: 0; font-size: 13px; color: var(--text-2); }

/* Big stats */
.bigstat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.bigstat { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px 18px; }
.bigstat-lb { font-size: 11.5px; font-weight: 500; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
.bigstat-vl { font-size: 26px; font-weight: 600; letter-spacing: -0.02em; color: var(--text); line-height: 1; }
.bigstat-ds { font-size: 11.5px; color: var(--text-2); margin-top: 6px; }

/* Tab strip */
.tabstrip { display: flex; gap: 2px; border-bottom: 1px solid var(--border); }
.tab-item {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px; font-size: 13px; font-weight: 500; color: var(--text-2);
  background: transparent; border: none; border-bottom: 2px solid transparent;
  cursor: pointer; white-space: nowrap; font-family: var(--font-sans);
  transition: color 0.12s; margin-bottom: -1px;
}
.tab-item:hover { color: var(--text); }
.tab-item.active { color: var(--text); border-bottom-color: var(--text); }

/* Toolbar */
.toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.chip-select {
  padding: 6px 10px; border: 1px solid var(--border); border-radius: 20px;
  background: var(--surface); color: var(--text-2); font-size: 12px;
  font-family: var(--font-sans); outline: none; cursor: pointer;
}
.chip-select:focus { border-color: var(--accent); }

.chip {
  padding: 5px 10px; border: 1px solid var(--border); border-radius: 20px;
  background: var(--surface); color: var(--text-2); font-size: 12px;
  cursor: pointer; white-space: nowrap; user-select: none;
}
.chip:hover { background: var(--hover); color: var(--text); }

/* Custom toggle */
.toggle-label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.toggle-input-hidden { position: absolute; opacity: 0; width: 0; height: 0; }
.toggle-track {
  position: relative; width: 32px; height: 18px;
  background: var(--border-strong); border-radius: 9px;
  transition: background 0.18s; display: block; flex-shrink: 0;
}
.toggle-input-hidden:checked + .toggle-track { background: var(--accent); }
.toggle-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 14px; height: 14px; background: #fff;
  border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.15);
  transition: left 0.18s;
}
.toggle-input-hidden:checked + .toggle-track .toggle-thumb { left: 16px; }
.toggle-text { font-size: 12px; font-weight: 500; color: var(--text-2); }

.count-badge {
  margin-left: auto;
  padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600;
  background: var(--muted-soft); color: var(--muted);
}

/* Offers grid */
.offers-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }

.offer-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: box-shadow 0.12s;
}
.offer-card:hover { box-shadow: var(--shadow-md); }

.offer-seller { display: flex; align-items: center; gap: 10px; }
.offer-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #c9a87a, #8a6a3e);
  color: #fff; display: grid; place-items: center;
  font-size: 13px; font-weight: 600; flex-shrink: 0;
}
.offer-seller-info { flex: 1; min-width: 0; }
.offer-name { font-weight: 500; font-size: 13px; color: var(--text); }
.verified-dot { color: var(--success); font-size: 10.5px; margin-left: 4px; font-weight: 400; }
.offer-meta { font-size: 11px; color: var(--text-3); margin-top: 1px; }

.online-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.online-dot.online  { background: var(--success); box-shadow: 0 0 0 2px var(--success-soft); }
.online-dot.offline { background: var(--border-strong); }

.offer-price {
  font-size: 20px; font-weight: 600; letter-spacing: -0.01em;
  font-family: var(--font-mono); color: var(--text);
}
.offer-unit { font-size: 12px; font-weight: 400; color: var(--text-3); margin-left: 4px; font-family: var(--font-sans); }

.offer-limits { font-size: 12px; color: var(--text-2); }

.offer-methods { display: flex; flex-wrap: wrap; gap: 4px; }
.method-chip {
  padding: 2px 7px; border-radius: 20px; font-size: 11px; font-weight: 500;
  background: var(--surface-2); color: var(--text-2); border: 1px solid var(--border);
}
.method-more { color: var(--text-3); }

.offer-cta {
  width: 100%; height: 34px; border-radius: var(--radius);
  font-size: 13px; font-weight: 600; font-family: var(--font-sans);
  border: none; cursor: pointer; transition: opacity 0.12s;
  display: flex; align-items: center; justify-content: center;
}
.cta-buy  { background: var(--success); color: #fff; }
.cta-sell { background: var(--danger);  color: #fff; }
.offer-cta:hover { opacity: 0.88; }

/* Empty state */
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 8px; padding: 48px 24px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); text-align: center;
}
.empty-state p { font-size: 13px; color: var(--text-2); margin: 0; }

@media (max-width: 1100px) { .offers-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 900px)  { .bigstat-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px)  {
  .offers-grid { grid-template-columns: 1fr; }
  .bigstat-row { grid-template-columns: 1fr; }
  .page-h { flex-direction: column; align-items: flex-start; }
}
</style>
