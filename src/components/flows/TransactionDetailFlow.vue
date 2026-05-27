<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from '@/components/atoms/BaseModal.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import HashChip from '@/components/atoms/HashChip.vue'

export interface TxDetailData {
  tx: {
    id?: string
    sender: string
    receiver: string
    senderLabel?: string
    receiverLabel?: string
    amount: string
    currency?: string
    fee?: string
    size?: number
  }
  status: 'pending' | 'completed'
  block?: number
  confirmedAt?: string
  /** Total confirmations (chain height - block + 1). `null` if unknown. */
  confirmations?: number | null
  /** USD equivalent at `confirmedAt`, when available. */
  amountUsd?: number | null
  /** Current/last known FX rate (currency → USD). */
  fxRate?: number | null
}

const props = defineProps<{ data: TxDetailData }>()
const emit = defineEmits<{
  close: []
  'view-in-chain': []
}>()

type CurrencyTone = 'green' | 'orange' | 'blue' | 'teal' | 'gray'
const CURRENCY_TONES: Record<string, CurrencyTone> = {
  USDT: 'green',
  USDC: 'teal',
  BTC: 'orange',
  ETH: 'blue',
}
function currencyTone(code: string | undefined | null): CurrencyTone {
  if (!code) return 'gray'
  return CURRENCY_TONES[code] ?? 'gray'
}
function assetBadgeTone(code: string | undefined | null): 'success' | 'warning' | 'neutral' {
  const t = currencyTone(code)
  if (t === 'green') return 'success'
  if (t === 'orange') return 'warning'
  return 'neutral'
}

const subtitle = computed(() => {
  if (props.data.status === 'pending') return 'En mempool · pendiente de confirmación'
  if (props.data.block != null) return `Confirmada en Bloque #${props.data.block}`
  return 'Confirmada'
})

const statusTone = computed<'success' | 'warning'>(() =>
  props.data.status === 'completed' ? 'success' : 'warning',
)
const statusText = computed(() =>
  props.data.status === 'completed' ? 'Confirmada' : 'Pendiente',
)

const confirmationsText = computed(() => {
  if (props.data.confirmations === null || props.data.confirmations === undefined) {
    return props.data.status === 'pending' ? '0' : '—'
  }
  return String(props.data.confirmations)
})

const fmtUsd = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—'
  return `$${value.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const fmtFx = (value: number | null | undefined, currency: string | undefined): string => {
  if (value === null || value === undefined) return '—'
  const formatted = value.toLocaleString('es-AR', { maximumFractionDigits: 6 })
  return `1 ${currency ?? '—'} ≈ $${formatted}`
}

const formattedConfirmedAt = computed(() => {
  const iso = props.data.confirmedAt
  if (!iso) return '—'
  const ts = new Date(iso)
  if (Number.isNaN(ts.getTime())) return iso
  return ts.toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })
})

interface TraceRow {
  key: string
  label: string
  detail: string
}
const traceRows = computed<TraceRow[]>(() => {
  const rows: TraceRow[] = [
    { key: 'tx.created', label: 'Transacción firmada por el emisor', detail: '' },
    { key: 'mempool.accepted', label: 'Validación de firma + saldo OK', detail: '' },
  ]
  if (props.data.status === 'completed') {
    if (props.data.block != null) {
      rows.push({
        key: 'block.included',
        label: `Incluida en bloque #${props.data.block}`,
        detail: '',
      })
    }
    if (
      props.data.confirmations !== null &&
      props.data.confirmations !== undefined &&
      props.data.confirmations > 0
    ) {
      rows.push({
        key: 'block.confirmed',
        label: `${props.data.confirmations} confirmación${props.data.confirmations === 1 ? '' : 'es'} · final`,
        detail: '',
      })
    }
  }
  return rows
})

const senderDisplay = computed(() => props.data.tx.senderLabel ?? props.data.tx.sender)
const receiverDisplay = computed(() => props.data.tx.receiverLabel ?? props.data.tx.receiver)
</script>

<template>
  <BaseModal
    :open="true"
    width="560px"
    @close="emit('close')"
  >
    <template #header>
      <div class="tx-header">
        <div>
          <h2 class="tx-title">
            Detalle de transacción
          </h2>
          <p class="tx-sub">
            {{ subtitle }}
          </p>
        </div>
        <button
          type="button"
          class="tx-close"
          aria-label="Cerrar"
          @click="emit('close')"
        >
          <span
            class="pi pi-times"
            aria-hidden="true"
          />
        </button>
      </div>
    </template>

    <div class="tx-body">
      <!-- Hero amount -->
      <div class="tx-hero">
        <div class="tx-amount mono">
          {{ data.tx.amount }}
          <span
            v-if="data.tx.currency"
            class="tx-amount-unit"
          >{{ data.tx.currency }}</span>
        </div>
        <div
          v-if="data.amountUsd != null"
          class="tx-amount-usd mono"
        >
          ≈ {{ fmtUsd(data.amountUsd) }}
        </div>
        <div
          v-else
          class="tx-amount-usd mono dim"
        >
          Sin tasa FX disponible
        </div>
      </div>

      <!-- Parties -->
      <div class="tx-parties">
        <div class="tx-party">
          <span class="tx-party-label">De</span>
          <span class="tx-party-name">{{ senderDisplay }}</span>
          <HashChip
            :hash="data.tx.sender"
            :length="14"
            label="public key del emisor"
          />
        </div>
        <span
          class="tx-party-arrow pi pi-arrow-right"
          aria-hidden="true"
        />
        <div class="tx-party">
          <span class="tx-party-label">Para</span>
          <span class="tx-party-name">{{ receiverDisplay }}</span>
          <HashChip
            :hash="data.tx.receiver"
            :length="14"
            label="public key del receptor"
          />
        </div>
      </div>

      <!-- Pago section -->
      <section class="tx-section">
        <h3 class="tx-section-h">
          Pago
        </h3>
        <dl class="tx-grid">
          <div class="tx-row">
            <dt>Estado</dt>
            <dd>
              <BaseBadge :tone="statusTone">
                {{ statusText }}
              </BaseBadge>
            </dd>
          </div>
          <div class="tx-row">
            <dt>Activo</dt>
            <dd>
              <BaseBadge
                v-if="data.tx.currency"
                variant="outline"
                :tone="assetBadgeTone(data.tx.currency)"
              >
                <span
                  class="asset-dot"
                  :class="`asset-tone-${currencyTone(data.tx.currency)}`"
                />
                {{ data.tx.currency }}
              </BaseBadge>
              <span
                v-else
                class="dim"
              >—</span>
            </dd>
          </div>
          <div
            v-if="data.tx.id"
            class="tx-row"
          >
            <dt>Hash</dt>
            <dd>
              <HashChip
                :hash="data.tx.id"
                :length="18"
                label="tx hash"
              />
            </dd>
          </div>
          <div class="tx-row">
            <dt>Bloque</dt>
            <dd class="mono">
              <template v-if="data.block != null">
                #{{ data.block }}
              </template>
              <span
                v-else
                class="dim"
              >pendiente</span>
            </dd>
          </div>
          <div class="tx-row">
            <dt>Confirmaciones</dt>
            <dd class="mono">
              {{ confirmationsText }}
            </dd>
          </div>
          <div class="tx-row">
            <dt>Monto</dt>
            <dd class="mono">
              {{ data.tx.amount }} {{ data.tx.currency ?? '' }}
            </dd>
          </div>
          <div
            v-if="data.fxRate != null || data.amountUsd != null"
            class="tx-row"
          >
            <dt>FX</dt>
            <dd class="mono">
              {{ fmtFx(data.fxRate, data.tx.currency) }}
            </dd>
          </div>
          <div
            v-if="data.tx.fee != null"
            class="tx-row"
          >
            <dt>Fee</dt>
            <dd class="mono">
              {{ data.tx.fee }} {{ data.tx.currency ?? '' }}
            </dd>
          </div>
          <div
            v-if="data.tx.size != null"
            class="tx-row"
          >
            <dt>Tamaño</dt>
            <dd class="mono">
              {{ data.tx.size }} bytes
            </dd>
          </div>
          <div class="tx-row">
            <dt>Timing</dt>
            <dd class="mono dim">
              {{ formattedConfirmedAt }}
            </dd>
          </div>
        </dl>
      </section>

      <!-- Trazas section -->
      <section class="tx-section">
        <h3 class="tx-section-h">
          Trazas
        </h3>
        <ol class="tx-trace">
          <li
            v-for="row in traceRows"
            :key="row.key"
            class="tx-trace-row"
          >
            <span
              class="tx-trace-dot"
              :class="{ done: data.status === 'completed' }"
              aria-hidden="true"
            />
            <span class="tx-trace-key mono">{{ row.key }}</span>
            <span class="tx-trace-label">{{ row.label }}</span>
          </li>
        </ol>
      </section>
    </div>

    <template #footer>
      <BaseButton
        variant="ghost"
        size="sm"
        @click="emit('close')"
      >
        Cerrar
      </BaseButton>
      <BaseButton
        variant="primary"
        size="sm"
        @click="emit('view-in-chain')"
      >
        <template #leading>
          <span
            class="pi pi-external-link"
            aria-hidden="true"
          />
        </template>
        Ver en cadena
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.tx-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}
.tx-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text);
}
.tx-sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-3);
}
.tx-close {
  appearance: none;
  background: transparent;
  border: 0;
  width: 28px;
  height: 28px;
  border-radius: var(--radius);
  display: grid;
  place-items: center;
  font-size: 12px;
  color: var(--text-3);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
}
.tx-close:hover {
  background: var(--hover);
  color: var(--text);
}

.tx-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Hero */
.tx-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px 16px;
  border-bottom: 1px solid var(--border);
}
.tx-amount {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.tx-amount-unit {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-2);
  margin-left: 6px;
}
.tx-amount-usd {
  font-size: 12.5px;
  color: var(--text-2);
}
.tx-amount-usd.dim {
  color: var(--text-3);
}

/* Parties */
.tx-parties {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
}
.tx-party {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  min-width: 0;
}
.tx-party-label {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
}
.tx-party-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}
.tx-party-arrow {
  color: var(--text-3);
  font-size: 14px;
}

/* Sections */
.tx-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tx-section-h {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
}
.tx-grid {
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px;
}
.tx-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.tx-row dt {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-3);
}
.tx-row dd {
  margin: 0;
  font-size: 13px;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.mono {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
.dim {
  color: var(--text-3);
}

.asset-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
}
.asset-tone-green { background: var(--success, #2f9e44); }
.asset-tone-orange { background: var(--warning, #e8590c); }
.asset-tone-blue { background: var(--accent, #4263eb); }
.asset-tone-teal { background: var(--info, #1098ad); }
.asset-tone-gray { background: var(--border-strong, #adb5bd); }

/* Trazas */
.tx-trace {
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.tx-trace-row {
  display: grid;
  grid-template-columns: 8px 160px 1fr;
  gap: 10px;
  padding: 8px 12px;
  align-items: center;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
}
.tx-trace-row:last-child {
  border-bottom: 0;
}
.tx-trace-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--border-strong);
}
.tx-trace-dot.done {
  background: var(--success);
  box-shadow: 0 0 0 3px var(--success-soft);
}
.tx-trace-key {
  color: var(--accent);
  font-size: 11.5px;
}
.tx-trace-label {
  color: var(--text-2);
}

@media (max-width: 540px) {
  .tx-grid {
    grid-template-columns: 1fr;
  }
  .tx-parties {
    grid-template-columns: 1fr;
  }
  .tx-party-arrow {
    transform: rotate(90deg);
    justify-self: center;
  }
  .tx-trace-row {
    grid-template-columns: 8px 1fr;
  }
  .tx-trace-key {
    display: none;
  }
}
</style>
