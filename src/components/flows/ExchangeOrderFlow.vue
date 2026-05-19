<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import BaseButton from '@/components/atoms/BaseButton.vue'

export interface OrderData {
  side: 'buy' | 'sell'
  pair: string
  price: string
  amount: string
  total: string
  orderType: string
}

const props = defineProps<{ data: OrderData }>()
const emit = defineEmits<{ close: []; complete: [] }>()

const step = ref(0)
const progress = ref(0)
let intervalId: ReturnType<typeof setInterval> | null = null

const isBuy = computed(() => props.data.side === 'buy')
const [base, quote] = props.data.pair.split('/')

watch(step, (s) => {
  if (s === 1) {
    progress.value = 0
    intervalId = setInterval(() => {
      progress.value += 100 / 18
      if (progress.value >= 100) {
        progress.value = 100
        clearInterval(intervalId!)
        setTimeout(() => {
          step.value = 2
        }, 200)
      }
    }, 60)
  } else {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})

const matched = computed(() => Math.floor(progress.value))
const counterparts = computed(() => Math.floor((progress.value / 100) * 3))

const orderId = 'ORD-' + Math.random().toString(36).slice(2, 9).toUpperCase()
const fillColor = computed(() => (isBuy.value ? 'var(--success)' : 'var(--danger)'))
</script>

<template>
  <div class="modal-scrim" @click.self="emit('close')">
    <div class="modal" style="width: 480px">
      <div class="modal-h">
        <h2>
          {{ step === 2 ? 'Orden ejecutada' : isBuy ? `Comprar ${base}` : `Vender ${base}` }}
        </h2>
        <p>
          {{
            step === 0
              ? 'Revisá los detalles antes de enviar al libro.'
              : step === 1
                ? 'Buscando contraparte en el libro de órdenes…'
                : 'Tu orden se ejecutó completa.'
          }}
        </p>
      </div>

      <div class="modal-b">
        <!-- Step 0: Review -->
        <template v-if="step === 0">
          <div class="flow-card" style="padding: 14px">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px">
              <div
                style="
                  display: flex;
                  align-items: center;
                  gap: 4px;
                  font-size: 13px;
                  font-weight: 600;
                "
              >
                {{ base }} → {{ quote }}
              </div>
              <div style="flex: 1; text-align: right">
                <span class="bdg" :class="isBuy ? 'bdg-active' : 'bdg-banned'">
                  {{ isBuy ? 'Compra' : 'Venta' }} · {{ data.orderType }}
                </span>
              </div>
            </div>
            <div
              v-for="([label, value, bold], i) in [
                ['Precio de mercado', `${data.price} ${quote}`, true],
                ['Cantidad', `${data.amount} ${base}`, true],
                ['Total estimado', `${data.total} ${quote}`, true],
                ['Comisión (0.1%)', `3.38 ${quote}`, false],
                ['Slippage máx.', '0.5%', false],
              ] as [string, string, boolean][]"
              :key="i"
              class="detail-row"
              :style="{
                borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
                fontSize: '12.5px',
              }"
            >
              <span class="muted">{{ label }}</span>
              <span class="mono" :style="{ fontWeight: bold ? 600 : 500 }">{{ value }}</span>
            </div>
          </div>

          <div class="dry-run">
            <span class="pi pi-info-circle" style="font-size: 13px" />
            <span>Recibirás:</span>
            <span class="mono" style="color: var(--text); font-weight: 600">
              {{
                isBuy
                  ? `${data.amount} ${base}`
                  : `${(parseFloat(data.total.replace(',', '')) - 3.38).toFixed(2)} ${quote}`
              }}
            </span>
          </div>
        </template>

        <!-- Step 1: Executing -->
        <template v-else-if="step === 1">
          <div style="text-align: center; padding: 24px 0 16px">
            <div class="spinner-wrap">
              <div class="spinner" style="width: 24px; height: 24px" />
            </div>
            <div style="font-size: 16px; font-weight: 600">Ejecutando orden</div>
            <div class="muted" style="font-size: 12.5px; margin-top: 4px">
              Matched {{ matched }}% · {{ counterparts }} contrapartes
            </div>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: progress + '%', background: fillColor }" />
          </div>
        </template>

        <!-- Step 2: Filled -->
        <template v-else>
          <div style="text-align: center; padding: 20px 0 8px">
            <div class="success-circle">
              <span class="pi pi-check" style="font-size: 32px" />
            </div>
            <div class="mono" style="font-size: 22px; font-weight: 600; letter-spacing: -0.015em">
              {{ isBuy ? '+' : '−' }}{{ data.amount }} {{ base }}
            </div>
            <div class="muted" style="font-size: 13px">≈ ${{ data.total }} {{ quote }}</div>
          </div>
          <div class="flow-card" style="padding: 14px; margin-top: 14px">
            <div
              v-for="([label, value], i) in [
                ['Tipo', `${data.orderType} · ${isBuy ? 'Compra' : 'Venta'}`],
                ['Precio promedio', `${data.price} ${quote}`],
                ['Total ejecutado', `${data.total} ${quote}`],
                ['Comisión', `3.38 ${quote}`],
                ['ID de orden', orderId],
                ['Tiempo', '0.42 s'],
              ]"
              :key="label"
              class="detail-row"
              :style="{
                borderBottom: i < 5 ? '1px solid var(--border)' : 'none',
                fontSize: '12px',
              }"
            >
              <span class="muted">{{ label }}</span>
              <span class="mono" style="font-weight: 500">{{ value }}</span>
            </div>
          </div>
        </template>
      </div>

      <div class="modal-f">
        <template v-if="step === 0">
          <BaseButton variant="ghost" @click="emit('close')">Cancelar</BaseButton>
          <BaseButton
            :style="{ background: fillColor, borderColor: 'transparent' }"
            variant="primary"
            @click="step = 1"
          >
            Confirmar {{ isBuy ? 'compra' : 'venta' }}
          </BaseButton>
        </template>
        <template v-else-if="step === 1">
          <BaseButton variant="ghost" @click="emit('close')">Cerrar (sigue corriendo)</BaseButton>
        </template>
        <template v-else>
          <BaseButton variant="ghost" @click="emit('close')">Cerrar</BaseButton>
          <BaseButton
            variant="primary"
            @click="
              emit('complete')
              emit('close')
            "
            >Ver en historial</BaseButton
          >
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 0;
}
.spinner-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  display: grid;
  place-items: center;
  margin: 0 auto 14px;
}
.success-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--success-soft);
  color: var(--success);
  display: grid;
  place-items: center;
  margin: 0 auto 14px;
}
</style>
