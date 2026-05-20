<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseButton from '@/components/atoms/BaseButton.vue'

export interface ConvertData {
  from?: string
  to?: string
}

const props = defineProps<{ data: ConvertData }>()
const emit = defineEmits<{ close: []; complete: [] }>()

const ASSETS = ['USDT', 'BTC', 'ETH', 'SOL', 'USDC', 'cUSD']
const RATES: Record<string, number> = {
  'USDT-BTC': 1 / 67500.2,
  'BTC-USDT': 67500.2,
  'USDT-ETH': 1 / 3450,
  'ETH-USDT': 3450,
  'USDT-USDC': 1,
  'USDC-USDT': 1,
  'BTC-ETH': 67500.2 / 3450,
  'ETH-BTC': 3450 / 67500.2,
  'USDT-SOL': 1 / 165,
  'SOL-USDT': 165,
  'USDT-cUSD': 1,
  'cUSD-USDT': 1,
}

const from = ref(props.data.from ?? 'USDT')
const to = ref(props.data.to ?? 'BTC')
const amount = ref('500')
const executed = ref(false)

const rate = computed(() => RATES[`${from.value}-${to.value}`] ?? 1)
const outAmount = computed(() => {
  const v = parseFloat(amount.value || '0') * rate.value
  return v > 1 ? v.toFixed(4) : v.toFixed(8)
})
const rateLabel = computed(() => (rate.value > 1 ? rate.value.toFixed(4) : rate.value.toFixed(8)))
const toAssets = computed(() => ASSETS.filter((a) => a !== from.value))

function swap() {
  const f = from.value
  from.value = to.value
  to.value = f
}
</script>

<template>
  <!-- Success screen -->
  <div v-if="executed" class="modal-scrim" @click.self="emit('close')">
    <div class="modal" style="width: 420px">
      <div class="modal-b">
        <div style="text-align: center; padding: 24px 0 8px">
          <div class="success-circle">
            <span class="pi pi-arrows-h" style="font-size: 28px" />
          </div>
          <div class="mono" style="font-size: 22px; font-weight: 600; letter-spacing: -0.01em">
            +{{ outAmount }} {{ to }}
          </div>
          <div class="muted" style="font-size: 13px">
            Conversión instantánea desde {{ amount }} {{ from }}
          </div>
        </div>
        <div class="flow-card" style="padding: 14px; margin-top: 14px">
          <div
            v-for="([label, value], i) in [
              ['Tipo de cambio', `1 ${from} = ${rateLabel} ${to}`],
              ['Comisión', '0%'],
              ['Tiempo', 'Instantáneo'],
            ]"
            :key="label"
            class="detail-row"
            :style="{ borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }"
          >
            <span class="muted" style="font-size: 12px">{{ label }}</span>
            <span class="mono" style="font-size: 12px; font-weight: 500">{{ value }}</span>
          </div>
        </div>
      </div>
      <div class="modal-f">
        <BaseButton variant="ghost" @click="emit('close')">Cerrar</BaseButton>
        <BaseButton
          variant="primary"
          @click="
            emit('complete')
            emit('close')
          "
          >Ir a {{ to }}</BaseButton
        >
      </div>
    </div>
  </div>

  <!-- Convert screen -->
  <div v-else class="modal-scrim" @click.self="emit('close')">
    <div class="modal" style="width: 440px">
      <div class="modal-h">
        <h2>Convertir activos</h2>
        <p>Conversión instantánea sin comisión, dentro de la plataforma.</p>
      </div>
      <div class="modal-b">
        <!-- From card -->
        <div class="convert-card">
          <div
            class="muted"
            style="
              font-size: 10.5px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              margin-bottom: 6px;
            "
          >
            Desde
          </div>
          <div style="display: flex; align-items: center; gap: 10px">
            <select v-model="from" class="asset-select">
              <option v-for="a in ASSETS" :key="a" :value="a">{{ a }}</option>
            </select>
            <input v-model="amount" class="mono amount-input" type="number" min="0" />
          </div>
          <div class="muted" style="font-size: 11px; margin-top: 4px">
            Disponible: 24,420.50 {{ from }} ·
            <a href="#" style="color: var(--accent-text)" @click.prevent="amount = '24420.50'"
              >Usar máx</a
            >
          </div>
        </div>

        <!-- Swap button -->
        <div
          style="
            display: flex;
            justify-content: center;
            margin: -12px 0;
            position: relative;
            z-index: 1;
          "
        >
          <button class="swap-btn" @click="swap">
            <span class="pi pi-arrows-v" style="font-size: 14px" />
          </button>
        </div>

        <!-- To card -->
        <div class="convert-card">
          <div
            class="muted"
            style="
              font-size: 10.5px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              margin-bottom: 6px;
            "
          >
            A
          </div>
          <div style="display: flex; align-items: center; gap: 10px">
            <select v-model="to" class="asset-select">
              <option v-for="a in toAssets" :key="a" :value="a">{{ a }}</option>
            </select>
            <div class="mono amount-input" style="color: var(--text); background: transparent">
              {{ outAmount }}
            </div>
          </div>
          <div class="muted" style="font-size: 11px; margin-top: 4px">
            ≈ ${{ parseFloat(amount || '0').toFixed(2) }} USD
          </div>
        </div>

        <div class="dry-run">
          <span class="pi pi-info-circle" style="font-size: 13px" />
          <span>Tipo de cambio:</span>
          <span class="mono" style="color: var(--text); font-weight: 600"
            >1 {{ from }} = {{ rateLabel }} {{ to }}</span
          >
        </div>
      </div>
      <div class="modal-f">
        <BaseButton variant="ghost" @click="emit('close')">Cancelar</BaseButton>
        <BaseButton variant="primary" @click="executed = true"
          >Convertir {{ amount }} {{ from }}</BaseButton
        >
      </div>
    </div>
  </div>
</template>

<style scoped>
.convert-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
}
.asset-select {
  background: transparent;
  border: none;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  padding: 0;
  outline: none;
  flex-shrink: 0;
}
.amount-input {
  flex: 1;
  text-align: right;
  font-size: 22px;
  font-weight: 500;
  border: none;
  background: transparent;
  color: var(--text);
  padding: 0;
  outline: none;
  letter-spacing: -0.01em;
  width: 0;
}
.swap-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--surface);
  border: 1px solid var(--border);
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: var(--shadow-md);
  color: var(--text-2);
  transition: background 0.12s;
}
.swap-btn:hover {
  background: var(--hover);
  color: var(--text);
}
.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
}
.success-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--success-soft);
  color: var(--success);
  display: grid;
  place-items: center;
  margin: 0 auto 16px;
}
</style>
