<script setup lang="ts">
import { ref, computed } from 'vue'

type OrderType = 'market' | 'limit' | 'stop'
type Side = 'buy' | 'sell'
type TimeFrame = '1m' | '5m' | '15m' | '1H' | '4H' | '1D'

const pair = ref('NATIVE/USDT')
const timeFrame = ref<TimeFrame>('15m')
const orderType = ref<OrderType>('market')
const tradeSide = ref<Side>('buy')
const tradeAmount = ref('0.05000')
const tradeTotal = ref('3,375.01')

const ticker = {
  last: '67,500.20',
  change24h: '+2.41%',
  volume: '$184.2M',
  high24h: '68,124.00',
  low24h: '65,890.50',
}

const bids = [
  [67500.20, 0.4821], [67499.80, 0.2104], [67498.50, 1.2042], [67497.10, 0.0842],
  [67495.60, 0.5212], [67494.00, 2.1100], [67492.50, 0.3320], [67490.10, 0.8910],
]

const asks = [
  [67502.10, 0.3201], [67503.50, 0.5102], [67505.00, 1.0410], [67506.80, 0.1820],
  [67508.20, 0.7541], [67510.00, 0.4012], [67512.50, 0.2210], [67515.00, 1.5200],
]

const timeFrames: TimeFrame[] = ['1m', '5m', '15m', '1H', '4H', '1D']

const percentButtons = ['25%', '50%', '75%', '100%']

const ctaLabel = computed(() => {
  return `${tradeSide.value === 'buy' ? 'Comprar' : 'Vender'} ${tradeAmount.value} ${pair.value.split('/')[0]}`
})

interface Candle {
  x: number
  open: number
  close: number
  high: number
  low: number
  bullish: boolean
}

const candles = computed<Candle[]>(() => {
  const result: Candle[] = []
  for (let i = 0; i < 40; i++) {
    const seed = i * 7919
    const r1 = ((seed * 9301 + 49297) % 233280) / 233280
    const r2 = ((seed * 7919 + 12345) % 233280) / 233280
    const baseY = 110 + Math.sin(i * 0.4) * 30 + (i / 40) * -40
    const open = baseY + r1 * 20 - 10
    const close = baseY + r2 * 20 - 10
    const bullish = close < open
    result.push({
      x: 15 + i * 14.5,
      open,
      close,
      high: Math.min(open, close) - 8 * r1,
      low: Math.max(open, close) + 8 * r2,
      bullish,
    })
  }
  return result
})
</script>

<template>
  <div class="exchange-view">
    <!-- Header row -->
    <div class="exchange-header">
      <div class="pair-info">
        <div class="pair-mark" aria-hidden="true">N</div>
        <h1>{{ pair }}</h1>
      </div>
      <div class="ticker-stats">
        <div class="ticker-stat">
          <span class="ticker-lbl">Último</span>
          <span class="ticker-val success">{{ ticker.last }}</span>
        </div>
        <div class="ticker-stat">
          <span class="ticker-lbl">24h %</span>
          <span class="ticker-val success">{{ ticker.change24h }}</span>
        </div>
        <div class="ticker-stat">
          <span class="ticker-lbl">Volumen</span>
          <span class="ticker-val">{{ ticker.volume }}</span>
        </div>
        <div class="ticker-stat">
          <span class="ticker-lbl">Máx 24h</span>
          <span class="ticker-val">{{ ticker.high24h }}</span>
        </div>
        <div class="ticker-stat">
          <span class="ticker-lbl">Mín 24h</span>
          <span class="ticker-val">{{ ticker.low24h }}</span>
        </div>
      </div>
    </div>

    <!-- Three-column body -->
    <div class="exchange-body">

      <!-- Chart -->
      <div class="chart-panel">
        <div class="chart-toolbar">
          <div class="tf-tabs">
            <button
              v-for="tf in timeFrames"
              :key="tf"
              class="tf-btn"
              :class="{ active: timeFrame === tf }"
              @click="timeFrame = tf"
            >{{ tf }}</button>
          </div>
        </div>
        <div class="chart-wrap">
          <svg viewBox="0 0 600 220" class="chart-svg" aria-label="Gráfico de velas" role="img">
            <line v-for="y in [40, 80, 120, 160, 200]" :key="y" :x1="0" :x2="600" :y1="y" :y2="y" class="chart-grid-line" />
            <g v-for="(c, i) in candles" :key="i">
              <line
                :x1="c.x" :x2="c.x"
                :y1="c.high" :y2="c.low"
                :stroke="c.bullish ? 'var(--success)' : 'var(--danger)'"
                stroke-width="1"
              />
              <rect
                :x="c.x - 4" :y="Math.min(c.open, c.close)"
                width="8" :height="Math.max(Math.abs(c.close - c.open), 1)"
                :fill="c.bullish ? 'var(--success)' : 'var(--danger)'"
              />
            </g>
          </svg>
        </div>
      </div>

      <!-- Order book -->
      <div class="orderbook-panel">
        <div class="ob-header">Libro de órdenes</div>
        <div class="ob-cols">
          <span>Precio (USDT)</span>
          <span class="right">{{ pair.split('/')[0] }}</span>
          <span class="right">Total</span>
        </div>

        <div class="ob-asks">
          <div v-for="(r, i) in asks.slice(0, 6).slice().reverse()" :key="i" class="ob-row ob-ask">
            <span class="mono sell-price">{{ r[0].toFixed(2) }}</span>
            <span class="mono right">{{ (r[1] as number).toFixed(4) }}</span>
            <span class="mono right muted">{{ Math.round((r[0] as number) * (r[1] as number)).toLocaleString('en-US') }}</span>
          </div>
        </div>

        <div class="ob-mid">
          <span class="mono ob-mid-price">{{ ticker.last }}</span>
          <span class="ob-mid-sub">≈ ${{ ticker.last }}</span>
        </div>

        <div class="ob-bids">
          <div v-for="(r, i) in bids.slice(0, 6)" :key="i" class="ob-row ob-bid">
            <span class="mono buy-price">{{ r[0].toFixed(2) }}</span>
            <span class="mono right">{{ (r[1] as number).toFixed(4) }}</span>
            <span class="mono right muted">{{ Math.round((r[0] as number) * (r[1] as number)).toLocaleString('en-US') }}</span>
          </div>
        </div>
      </div>

      <!-- Trade panel -->
      <div class="trade-panel">
        <div class="trade-sides">
          <button class="trade-side buy" :class="{ active: tradeSide === 'buy' }" @click="tradeSide = 'buy'">Comprar</button>
          <button class="trade-side sell" :class="{ active: tradeSide === 'sell' }" @click="tradeSide = 'sell'">Vender</button>
        </div>

        <div class="trade-order-types">
          <button v-for="t in ['market', 'limit', 'stop'] as OrderType[]" :key="t" class="ot-btn" :class="{ active: orderType === t }" @click="orderType = t">
            {{ t === 'market' ? 'Mercado' : t === 'limit' ? 'Límite' : 'Stop' }}
          </button>
        </div>

        <div class="trade-fld">
          <label>Disponible</label>
          <div class="trade-avail mono">12,420.50 USDT</div>
        </div>

        <div class="trade-fld">
          <label :for="`trade-amount`">Cantidad</label>
          <div class="trade-input-wrap">
            <input id="trade-amount" v-model="tradeAmount" class="trade-input mono" />
            <span class="trade-input-unit">{{ pair.split('/')[0] }}</span>
          </div>
        </div>

        <div class="trade-fld">
          <label :for="`trade-total`">Total</label>
          <div class="trade-input-wrap">
            <input id="trade-total" v-model="tradeTotal" class="trade-input mono" />
            <span class="trade-input-unit">{{ pair.split('/')[1] }}</span>
          </div>
        </div>

        <div class="pct-row">
          <button v-for="p in percentButtons" :key="p" class="pct-btn">{{ p }}</button>
        </div>

        <button class="trade-cta" :class="tradeSide === 'buy' ? 'cta-buy' : 'cta-sell'">
          {{ ctaLabel }}
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.exchange-view { display: flex; flex-direction: column; gap: 14px; }

/* Header */
.exchange-header { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
.pair-info { display: flex; align-items: center; gap: 10px; }
.pair-mark {
  width: 30px; height: 30px; border-radius: 50%;
  background: linear-gradient(135deg, #1a1917, #3a3833);
  display: grid; place-items: center;
  color: #faf9f6; font-weight: 700; font-size: 11px; flex-shrink: 0;
}
.pair-info h1 { font-size: 18px; font-weight: 600; letter-spacing: -0.01em; color: var(--text); margin: 0; }

.ticker-stats { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.ticker-stat { display: flex; flex-direction: column; gap: 1px; }
.ticker-lbl { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-3); }
.ticker-val { font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--text); }
.ticker-val.success { color: var(--success); }

/* Body layout */
.exchange-body {
  display: grid;
  grid-template-columns: 1fr 260px 220px;
  gap: 12px;
  min-height: 400px;
}

/* Chart panel */
.chart-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.chart-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}

.tf-tabs { display: flex; gap: 2px; }
.tf-btn {
  padding: 4px 8px; font-size: 11.5px; font-weight: 500;
  border: 1px solid transparent; border-radius: var(--radius-sm);
  background: transparent; color: var(--text-2);
  cursor: pointer; font-family: var(--font-sans); transition: background 0.1s, color 0.1s;
}
.tf-btn:hover { background: var(--hover); color: var(--text); }
.tf-btn.active { background: var(--surface-2); color: var(--text); border-color: var(--border); }

.chart-wrap { flex: 1; padding: 10px 14px; }
.chart-svg { width: 100%; height: 220px; }
.chart-grid-line { stroke: var(--border); stroke-dasharray: 2 4; }

/* Order book */
.orderbook-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ob-header {
  padding: 10px 14px;
  font-size: 12px; font-weight: 600; color: var(--text);
  border-bottom: 1px solid var(--border);
}

.ob-cols {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 12px;
  padding: 5px 14px;
  font-size: 10.5px; font-weight: 600; color: var(--text-3);
  text-transform: uppercase; letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
}

.ob-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 12px;
  padding: 4px 14px;
  font-size: 11.5px;
}

.buy-price  { color: var(--success); }
.sell-price { color: var(--danger); }

.ob-mid {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: var(--surface-2);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.ob-mid-price { font-size: 15px; font-weight: 700; color: var(--success); }
.ob-mid-sub   { font-size: 11px; color: var(--text-3); }

.right { text-align: right; }
.mono  { font-family: var(--font-mono); }
.muted { color: var(--text-3); }

/* Trade panel */
.trade-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.trade-sides { display: grid; grid-template-columns: 1fr 1fr; border-radius: var(--radius); overflow: hidden; border: 1px solid var(--border); }
.trade-side {
  padding: 7px; font-size: 12.5px; font-weight: 600;
  background: transparent; border: none; cursor: pointer;
  font-family: var(--font-sans); transition: background 0.12s, color 0.12s;
  color: var(--text-2);
}
.trade-side.buy.active  { background: var(--success); color: #fff; }
.trade-side.sell.active { background: var(--danger);  color: #fff; }
.trade-side:not(.active):hover { background: var(--hover); }

.trade-order-types { display: flex; gap: 4px; }
.ot-btn {
  flex: 1; padding: 5px; font-size: 11.5px; font-weight: 500;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: transparent; color: var(--text-2); cursor: pointer;
  font-family: var(--font-sans); transition: background 0.1s, color 0.1s;
}
.ot-btn:hover { background: var(--hover); color: var(--text); }
.ot-btn.active { background: var(--surface-2); color: var(--text); border-color: var(--border-strong); }

.trade-fld { display: flex; flex-direction: column; gap: 3px; }
.trade-fld label { font-size: 11.5px; font-weight: 500; color: var(--text-2); }

.trade-avail {
  font-size: 12.5px; padding: 7px 10px;
  background: var(--surface-2); border-radius: var(--radius);
  border: 1px solid var(--border); color: var(--text);
}

.trade-input-wrap { position: relative; }
.trade-input {
  width: 100%; box-sizing: border-box;
  padding: 7px 38px 7px 10px;
  border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface-2); color: var(--text);
  font-size: 12.5px; font-family: var(--font-mono);
  outline: none; transition: border-color 0.12s;
}
.trade-input:focus { border-color: var(--accent); }
.trade-input-unit {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  font-size: 10.5px; color: var(--text-3);
}

.pct-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
.pct-btn {
  padding: 4px; font-size: 11px; font-weight: 500;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--surface-2); color: var(--text-2);
  cursor: pointer; font-family: var(--font-sans); transition: background 0.1s, color 0.1s;
}
.pct-btn:hover { background: var(--hover); color: var(--text); }

.trade-cta {
  width: 100%; height: 34px; border-radius: var(--radius);
  font-size: 13px; font-weight: 600; font-family: var(--font-sans);
  border: none; cursor: pointer; transition: opacity 0.12s;
  display: flex; align-items: center; justify-content: center;
}
.cta-buy  { background: var(--success); color: #fff; }
.cta-sell { background: var(--danger);  color: #fff; }
.trade-cta:hover { opacity: 0.88; }

@media (max-width: 1100px) { .exchange-body { grid-template-columns: 1fr 240px; } .trade-panel { display: none; } }
@media (max-width: 760px)  { .exchange-body { grid-template-columns: 1fr; } .orderbook-panel { display: none; } }
</style>
