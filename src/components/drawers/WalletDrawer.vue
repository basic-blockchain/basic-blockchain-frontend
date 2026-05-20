<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { WalletAdminRecord } from '@/api/admin'
import BaseDrawer from '@/components/atoms/BaseDrawer.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'

export interface DrawerWalletMovement {
  id: string
  direction: 'in' | 'out'
  counterparty: string
  amount: string
  amountUsd: number
  status: 'completed' | 'pending' | 'failed'
  createdAt: string
}

export interface DrawerWalletAuditEvent {
  id: string
  action: string
  meta: string
  actor: string
  at: string
}

export interface DrawerWallet {
  wallet: WalletAdminRecord
  movements: DrawerWalletMovement[]
  audit: DrawerWalletAuditEvent[]
}

export type WalletDrawerAction = 'freeze' | 'unfreeze'

const props = defineProps<{ data: DrawerWallet | null; open: boolean; loading?: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'action', payload: [WalletDrawerAction, WalletAdminRecord]): void
}>()

type TabKey = 'overview' | 'movements' | 'audit'
const tab = ref<TabKey>('overview')

watch(
  () => props.data?.wallet.wallet_id,
  () => {
    tab.value = 'overview'
  }
)

function copy(value: string) {
  navigator.clipboard?.writeText(value).catch(() => {})
}

function shortHash(h: string, head = 14, tail = 8): string {
  if (h.length <= head + tail + 3) return h
  return `${h.slice(0, head)}…${h.slice(-tail)}`
}

function balanceNumber(v: string): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function emitAction(a: WalletDrawerAction) {
  if (props.data) emit('action', [a, props.data.wallet])
}

const totalIn = computed(() => {
  if (!props.data) return 0
  return props.data.movements
    .filter((m) => m.direction === 'in')
    .reduce((s, m) => s + m.amountUsd, 0)
})
const totalOut = computed(() => {
  if (!props.data) return 0
  return props.data.movements
    .filter((m) => m.direction === 'out')
    .reduce((s, m) => s + m.amountUsd, 0)
})

function fmt(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 8 })
}

function onOpenChange(value: boolean) {
  if (!value) emit('close')
}
</script>

<template>
  <BaseDrawer :open="open" :width="640" @update:open="onOpenChange">
    <template v-if="data">
      <div class="drawer-head">
        <div class="head-row">
          <span class="mono id">{{ shortHash(data.wallet.wallet_id, 16, 8) }}</span>
          <button class="copy-btn" aria-label="Copy wallet id" @click="copy(data.wallet.wallet_id)">
            <i class="pi pi-copy" />
          </button>
          <span class="bdg" :class="data.wallet.frozen ? 'bdg-info' : 'bdg-active'">
            {{ data.wallet.frozen ? 'Congelada' : 'Activa' }}
          </span>
          <span class="bdg bdg-pending_kyc">{{ data.wallet.wallet_type }}</span>
          <div class="spacer" />
          <BaseButton class="btn-icon" variant="ghost" aria-label="Close" @click="emit('close')">
            <i class="pi pi-times" />
          </BaseButton>
        </div>

        <div class="head-main">
          <div class="asset-circle">
            {{ data.wallet.currency.slice(0, 2) }}
          </div>
          <div class="head-meta">
            <div class="title">
              {{ data.wallet.currency }}
            </div>
            <div class="sub">
              <span>{{ data.wallet.display_name }}</span>
              <span class="muted">@{{ data.wallet.username }}</span>
            </div>
          </div>
          <div class="head-balance mono">
            {{ fmt(balanceNumber(data.wallet.balance)) }}
          </div>
        </div>

        <div class="actions">
          <BaseButton
            v-if="!data.wallet.frozen"
            variant="ghost"
            size="sm"
            :disabled="loading"
            @click="emitAction('freeze')"
          >
            <i class="pi pi-lock" /> Congelar
          </BaseButton>
          <BaseButton
            v-else
            variant="ghost"
            size="sm"
            :disabled="loading"
            @click="emitAction('unfreeze')"
          >
            <i class="pi pi-lock-open" /> Descongelar
          </BaseButton>
        </div>

        <div class="tabs">
          <button class="tab" :class="{ active: tab === 'overview' }" @click="tab = 'overview'">
            Resumen
          </button>
          <button class="tab" :class="{ active: tab === 'movements' }" @click="tab = 'movements'">
            Movimientos
            <span class="count-badge sm">{{ data.movements.length }}</span>
          </button>
          <button class="tab" :class="{ active: tab === 'audit' }" @click="tab = 'audit'">
            Auditoría
            <span class="count-badge sm">{{ data.audit.length }}</span>
          </button>
        </div>
      </div>

      <div class="drawer-body">
        <div v-if="loading" class="loading-row">
          <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
        </div>

        <!-- Overview -->
        <template v-if="tab === 'overview'">
          <div class="field-stack">
            <div class="field-readout">
              <span class="field-label">Wallet ID</span>
              <span class="mono value">{{ data.wallet.wallet_id }}</span>
            </div>
            <div class="field-readout">
              <span class="field-label">Public key</span>
              <span class="mono value">{{ shortHash(data.wallet.public_key, 20, 10) }}</span>
              <button
                class="copy-btn"
                aria-label="Copy public key"
                @click="copy(data.wallet.public_key)"
              >
                <i class="pi pi-copy" />
              </button>
            </div>
            <div class="field-readout">
              <span class="field-label">Owner</span>
              <span class="value"
                >{{ data.wallet.display_name }} · @{{ data.wallet.username }}</span
              >
            </div>
            <div class="field-readout">
              <span class="field-label">Currency</span>
              <span class="value">{{ data.wallet.currency }}</span>
            </div>
            <div class="field-readout">
              <span class="field-label">Type</span>
              <span class="value">{{ data.wallet.wallet_type }}</span>
            </div>
          </div>

          <div class="bigstat-row two">
            <div class="bigstat">
              <div class="lb">Entradas</div>
              <div class="vl">
                {{ fmt(totalIn) }}
              </div>
              <div class="ds">recibidas</div>
            </div>
            <div class="bigstat">
              <div class="lb">Salidas</div>
              <div class="vl">
                {{ fmt(totalOut) }}
              </div>
              <div class="ds">enviadas</div>
            </div>
          </div>
        </template>

        <!-- Movements -->
        <template v-if="tab === 'movements'">
          <div v-if="data.movements.length === 0 && !loading" class="empty">
            Sin movimientos para esta wallet.
          </div>
          <table v-else class="tbl">
            <thead>
              <tr>
                <th>Dir</th>
                <th>Contraparte</th>
                <th class="right">Monto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in data.movements" :key="m.id">
                <td>
                  <span class="dir-pill" :class="m.direction">
                    {{ m.direction === 'in' ? 'IN' : 'OUT' }}
                  </span>
                </td>
                <td class="mono text-dim">
                  {{ shortHash(m.counterparty, 10, 6) }}
                </td>
                <td class="right mono">
                  {{ m.amount }}
                </td>
                <td>
                  <span
                    class="bdg"
                    :class="m.status === 'completed' ? 'bdg-active' : 'bdg-pending_kyc'"
                  >
                    {{ m.status === 'completed' ? 'Completado' : 'Pendiente' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </template>

        <!-- Audit -->
        <template v-if="tab === 'audit'">
          <div v-if="data.audit.length === 0 && !loading" class="empty">
            Sin entradas de auditoría asociadas a esta wallet.
          </div>
          <ul v-else class="audit-list">
            <li v-for="e in data.audit" :key="e.id" class="audit-item">
              <div class="audit-head">
                <span class="audit-action">{{ e.action }}</span>
                <span class="audit-time muted">{{ e.at }}</span>
              </div>
              <div class="audit-actor mono">por {{ e.actor }}</div>
              <div v-if="e.meta" class="audit-meta mono">
                {{ e.meta }}
              </div>
            </li>
          </ul>
        </template>
      </div>
    </template>
  </BaseDrawer>
</template>

<style scoped>
/* BaseDrawer body owns the outer scroll + padding; override to 0 so
 * the drawer's internal drawer-head + drawer-body layout retains
 * the v1 padding contract. */
:deep(.base-modal__body) {
  padding: 0;
}

.drawer-head {
  padding: 14px 16px 0;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.head-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.head-row .id {
  font-size: 11px;
  color: var(--text-3);
}
.head-row .spacer {
  flex: 1;
}

.copy-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-3);
  padding: 2px 4px;
  border-radius: var(--radius-sm);
}
.copy-btn:hover {
  background: var(--hover);
  color: var(--text);
}

.head-main {
  display: flex;
  align-items: center;
  gap: 12px;
}
.asset-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent-text);
  font-weight: 700;
  font-size: 12px;
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
}
.head-meta {
  flex: 1;
  min-width: 0;
}
.head-meta .title {
  font-weight: 600;
  font-size: 15px;
  color: var(--text);
}
.head-meta .sub {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 11.5px;
  color: var(--text-2);
  margin-top: 2px;
}
.head-meta .muted {
  color: var(--text-3);
}
.head-balance {
  font-size: 18px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.actions {
  display: flex;
  gap: 6px;
  margin: 12px 0;
  flex-wrap: wrap;
}

.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border);
  margin: 0 -16px;
  padding: 0 12px;
}
.tab {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px 10px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-2);
  border-bottom: 2px solid transparent;
  font-family: var(--font-sans);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.tab:hover {
  color: var(--text);
}
.tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  font-weight: 600;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.loading-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
  font-size: 13px;
}

.field-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.field-readout {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
}
.field-readout .field-label {
  min-width: 88px;
  font-size: 11.5px;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 500;
}
.field-readout .value {
  color: var(--text);
  font-size: 13px;
  word-break: break-all;
}

.bigstat-row.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.bigstat {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
}
.lb {
  font-size: 11.5px;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.vl {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 4px 0;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.ds {
  font-size: 11.5px;
  color: var(--text-3);
}

.tbl {
  width: 100%;
  border-collapse: collapse;
}
.tbl th {
  text-align: left;
  padding: 8px 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.tbl th.right {
  text-align: right;
}
.tbl td {
  padding: 9px 6px;
  border-bottom: 1px solid var(--border);
  font-size: 12.5px;
}
.tbl td.right {
  text-align: right;
}
.tbl tr:last-child td {
  border-bottom: none;
}

.dir-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
  font-family: var(--font-mono);
  letter-spacing: 0.04em;
}
.dir-pill.in {
  background: var(--success-soft);
  color: var(--success);
}
.dir-pill.out {
  background: var(--danger-soft);
  color: var(--danger);
}

.audit-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.audit-item {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
}
.audit-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.audit-action {
  font-weight: 600;
  font-size: 12.5px;
  color: var(--text);
}
.audit-time {
  font-size: 11px;
}
.audit-actor {
  font-size: 11.5px;
  color: var(--text-2);
  margin-top: 2px;
}
.audit-meta {
  font-size: 11px;
  color: var(--text-3);
  margin-top: 4px;
  padding: 6px 8px;
  background: var(--surface);
  border-radius: var(--radius-sm);
  word-break: break-all;
  white-space: pre-wrap;
}

.text-dim {
  color: var(--text-3);
}
.muted {
  color: var(--text-3);
}
.mono {
  font-family: var(--font-mono);
}
.empty {
  color: var(--text-3);
  font-size: 13px;
  padding: 20px;
  text-align: center;
}
</style>
