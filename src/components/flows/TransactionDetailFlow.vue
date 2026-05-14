<script setup lang="ts">
import { computed } from 'vue'

export interface TxDetailData {
  tx: {
    id: string
    sender: string
    receiver: string
    amount: string
    currency: string
    fee: string
    size: number
  }
  status: 'pending' | 'completed'
  block?: number
  confirmedAt?: string
}

const props = defineProps<{ data: TxDetailData }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const traceRows = computed(() => {
  const base: [string, string, string][] = [
    [
      'tx.created',
      `${props.data.tx.sender} firmó la transacción`,
      props.data.status === 'pending' ? 'hace 2 min' : '01:46:38',
    ],
    [
      'mempool.accepted',
      'Validación de firma + saldo OK',
      props.data.status === 'pending' ? 'hace 2 min' : '01:46:39',
    ],
    [
      'mempool.relayed',
      'Broadcast a 4 peers',
      props.data.status === 'pending' ? 'hace 1 min' : '01:46:42',
    ],
  ]
  if (props.data.status === 'completed') {
    base.push(['block.included', `Incluida en bloque #${props.data.block}`, '01:47:08'])
    base.push(['block.confirmed', '12 confirmaciones · final', '01:48:14'])
  }
  return base
})

const statusText = computed(() =>
  props.data.status === 'completed' ? 'Confirmada' : 'Pendiente en mempool',
)
const statusBadgeClass = computed(() =>
  props.data.status === 'completed' ? 'bdg bdg-active' : 'bdg bdg-pending_kyc',
)
const confirmations = computed(() => (props.data.status === 'completed' ? '12/12' : '0/12'))
</script>

<template>
  <div class="modal-scrim" @click.self="emit('close')">
    <div class="modal" style="width: 560px">
      <div class="modal-h">
        <div>
          <div style="font-size: 14px; font-weight: 600">Detalle de transacción</div>
          <div class="muted" style="font-size: 11.5px">
            <span class="mono">{{ data.tx.id }}</span> · {{ statusText }}
          </div>
        </div>
        <button class="btn btn-ghost btn-icon" @click="emit('close')">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <div class="modal-b">
        <div class="flow-card" style="padding: 14px">
          <div style="display: flex; gap: 16px">
            <div
              style="flex: 1; background: var(--surface-2); border-radius: 8px; padding: 10px 12px"
            >
              <div
                class="muted"
                style="font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px"
              >
                De
              </div>
              <div class="mono" style="font-size: 12px">{{ data.tx.sender }}</div>
            </div>
            <div
              style="flex: 1; background: var(--surface-2); border-radius: 8px; padding: 10px 12px"
            >
              <div
                class="muted"
                style="font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px"
              >
                Para
              </div>
              <div class="mono" style="font-size: 12px">{{ data.tx.receiver }}</div>
            </div>
          </div>

          <div
            style="border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 12px 0; margin: 14px 0; text-align: center"
          >
            <div class="mono" style="font-size: 22px; font-weight: 600">
              {{ data.tx.amount }} {{ data.tx.currency }}
            </div>
            <div class="muted" style="font-size: 11.5px; margin-top: 4px">
              fee: {{ data.tx.fee }} {{ data.tx.currency }}
            </div>
          </div>

          <div
            class="kvs"
            style="display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; font-size: 12px"
          >
            <span class="muted">Estado</span>
            <span><span :class="statusBadgeClass">{{ statusText }}</span></span>

            <span class="muted">Hash</span>
            <span class="mono" style="font-size: 11px">{{ data.tx.id }}</span>

            <span class="muted">Bloque</span>
            <span class="mono">{{ data.block !== undefined ? `#${data.block}` : 'pendiente' }}</span>

            <template v-if="data.confirmedAt">
              <span class="muted">Confirmado</span>
              <span>{{ data.confirmedAt }}</span>
            </template>

            <span class="muted">Tamaño</span>
            <span>{{ data.tx.size }} bytes</span>

            <span class="muted">Confirmaciones</span>
            <span class="mono">{{ confirmations }}</span>

            <span class="muted">Firma</span>
            <span><span class="bdg bdg-active">válida ✓</span></span>
          </div>
        </div>

        <div
          style="font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-2); margin: 16px 0 8px"
        >
          Trazas
        </div>

        <div class="flow-card" style="padding: 0">
          <div
            v-for="(row, idx) in traceRows"
            :key="row[0]"
            :style="{
              display: 'grid',
              gridTemplateColumns: '140px 1fr auto',
              gap: '10px',
              padding: '8px 14px',
              fontSize: '11.5px',
              borderBottom: idx < traceRows.length - 1 ? '1px solid var(--border)' : 'none',
            }"
          >
            <span class="mono" style="color: var(--accent-text)">{{ row[0] }}</span>
            <span style="color: var(--text-2)">{{ row[1] }}</span>
            <span class="muted">{{ row[2] }}</span>
          </div>
        </div>
      </div>

      <div class="modal-f">
        <button class="btn" @click="emit('close')">Cerrar</button>
        <button class="btn btn-primary">
          <i class="pi pi-external-link"></i>
          <span>Ver en explorer</span>
        </button>
      </div>
    </div>
  </div>
</template>
