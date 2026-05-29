<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SendRow, SendKind, SendStatus } from '@/domain/send'
import { approveTreasuryDistribution, cancelTreasuryDistribution } from '@/api/admin'
import { BlockchainApiError } from '@/api/errors'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import BaseModal from '@/components/atoms/BaseModal.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'

interface Props {
  open: boolean
  row: SendRow | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  close: []
  /** Fired after a successful approve/cancel so the parent view can
   *  refresh the table. Carries the op_id for optional optimistic
   *  removal in the future. */
  'distribution-updated': [op_id: string]
}>()

const auth = useAuthStore()
const toast = useToast()
const approving = ref(false)
const cancelling = ref(false)

function close() {
  emit('update:open', false)
  emit('close')
}

const distribution = computed(() => props.row?.distribution ?? null)
const isInitiator = computed(() => {
  if (!distribution.value) return false
  return distribution.value.initiated_by === auth.user?.user_id
})
const canApprove = computed(() => {
  if (!distribution.value || !distribution.value.is_pending_approval) return false
  // Backend enforces approver != initiator (SameSignerForbidden); mirror
  // that gate on the client so the button never shows where the action
  // will always fail. Permission check itself is optimistic — if the
  // user lacks APPROVE_TREASURY_DISTRIBUTION the 403 surfaces as a toast.
  return !isInitiator.value
})
const canCancel = computed(() => {
  if (!distribution.value || !distribution.value.is_pending_approval) return false
  return isInitiator.value
})

async function onApprove() {
  if (!distribution.value) return
  approving.value = true
  try {
    await approveTreasuryDistribution(distribution.value.op_id)
    toast.add({
      severity: 'success',
      summary: 'Envío aprobado',
      detail: 'Las transacciones se agregaron al mempool. Minan en el próximo bloque.',
      life: 5000,
    })
    emit('distribution-updated', distribution.value.op_id)
    close()
  } catch (e: unknown) {
    if (e instanceof BlockchainApiError && e.code === 'FORBIDDEN') {
      toast.add({
        severity: 'error',
        summary: 'Permiso insuficiente',
        detail: 'Necesitás APPROVE_TREASURY_DISTRIBUTION para aprobar envíos de tesorería.',
        life: 6000,
      })
    } else {
      toast.add({
        severity: 'error',
        summary: 'No se pudo aprobar',
        detail: String(e),
        life: 5000,
      })
    }
  } finally {
    approving.value = false
  }
}

async function onCancel() {
  if (!distribution.value) return
  cancelling.value = true
  try {
    await cancelTreasuryDistribution(distribution.value.op_id)
    toast.add({
      severity: 'success',
      summary: 'Envío cancelado',
      detail: 'La distribución pendiente fue revertida.',
      life: 4000,
    })
    emit('distribution-updated', distribution.value.op_id)
    close()
  } catch (e: unknown) {
    toast.add({
      severity: 'error',
      summary: 'No se pudo cancelar',
      detail: String(e),
      life: 5000,
    })
  } finally {
    cancelling.value = false
  }
}

const KIND_LABEL: Record<SendKind, string> = {
  internal: 'Interno',
  onchain: 'On-chain',
  treasury: 'Tesorería',
}
const KIND_HEADLINE: Record<SendKind, string> = {
  internal: 'Envío interno',
  onchain: 'Envío on-chain',
  treasury: 'Envío de tesorería',
}
const STATUS_LABEL: Record<SendStatus, string> = {
  completed: 'Completado',
  pending: 'Pendiente',
  failed: 'Fallido',
}

const kindTone = computed<'neutral' | 'info' | 'warning'>(() => {
  if (!props.row) return 'neutral'
  if (props.row.kind === 'onchain') return 'info'
  if (props.row.kind === 'treasury') return 'warning'
  return 'neutral'
})

const statusTone = computed<'success' | 'warning' | 'danger'>(() => {
  if (!props.row) return 'warning'
  if (props.row.status === 'completed') return 'success'
  if (props.row.status === 'failed') return 'danger'
  return 'warning'
})

const title = computed(() => (props.row ? KIND_HEADLINE[props.row.kind] : 'Envío'))

function formatAmount(value: string): string {
  const n = Number(value)
  if (Number.isNaN(n)) return value
  return n.toLocaleString('es-AR', { maximumFractionDigits: 8 })
}

function formatUsd(value: string | null): string {
  if (!value) return '—'
  const n = Number(value)
  if (Number.isNaN(n)) return value
  return `$${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })} USD`
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'En mempool'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return iso
  const diff = Math.max(0, Date.now() - then)
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'hace segundos'
  if (min < 60) return `hace ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `hace ${hr} h`
  const days = Math.floor(hr / 24)
  return `hace ${days} d`
}

function displayParticipant(side: 'from' | 'to'): string {
  if (!props.row) return ''
  const p = props.row[side]
  if (p.username) return p.username
  return p.address.length > 14 ? `${p.address.slice(0, 6)}…${p.address.slice(-4)}` : p.address
}

async function copyRef() {
  if (!props.row) return
  try {
    await navigator.clipboard.writeText(props.row.tx_id)
  } catch {
    /* clipboard blocked — no toast on purpose, user can still read it */
  }
}
</script>

<template>
  <BaseModal :open="open" :title="title" @update:open="close" @close="close">
    <template v-if="row" #header>
      <div class="hdr">
        <div>
          <h2 class="hdr__title">{{ title }}</h2>
          <p class="hdr__sub">{{ row.ref_short }} · {{ relativeTime(row.confirmed_at) }}</p>
        </div>
        <button class="hdr__close" type="button" aria-label="Cerrar" @click="close">×</button>
      </div>
    </template>

    <template v-if="row">
      <div class="amount-block">
        <div class="amount-block__big">{{ formatAmount(row.amount) }} {{ row.asset.code }}</div>
        <div class="amount-block__sub">≈ {{ formatUsd(row.amount_usd) }}</div>
      </div>

      <dl class="kv">
        <div class="kv__row">
          <dt>Tipo</dt>
          <dd>
            <BaseBadge :tone="kindTone">{{ KIND_LABEL[row.kind] }}</BaseBadge>
          </dd>
        </div>
        <div class="kv__row">
          <dt>De</dt>
          <dd>{{ displayParticipant('from') }}</dd>
        </div>
        <div class="kv__row">
          <dt>Para</dt>
          <dd>{{ displayParticipant('to') }}</dd>
        </div>
        <div class="kv__row">
          <dt>Activo</dt>
          <dd>{{ row.asset.code }}</dd>
        </div>
        <div class="kv__row">
          <dt>Hash / Ref</dt>
          <dd class="kv__ref">
            <span class="mono">{{ row.ref_short }}</span>
            <button type="button" class="kv__copy" aria-label="Copiar referencia" @click="copyRef">
              <span class="pi pi-copy" aria-hidden="true" />
            </button>
          </dd>
        </div>
        <div class="kv__row">
          <dt>Estado</dt>
          <dd>
            <BaseBadge :tone="statusTone">{{ STATUS_LABEL[row.status] }}</BaseBadge>
          </dd>
        </div>
      </dl>
    </template>

    <template v-if="row" #footer>
      <BaseButton variant="ghost" @click="close">Cerrar</BaseButton>
      <BaseButton
        v-if="canCancel"
        variant="danger"
        :loading="cancelling"
        :disabled="approving"
        @click="onCancel"
      >
        <template #leading>
          <span class="pi pi-times" aria-hidden="true" />
        </template>
        Cancelar envío
      </BaseButton>
      <BaseButton
        v-if="canApprove"
        variant="primary"
        :loading="approving"
        :disabled="cancelling"
        @click="onApprove"
      >
        <template #leading>
          <span class="pi pi-check" aria-hidden="true" />
        </template>
        Aprobar
      </BaseButton>
      <BaseButton v-if="!canApprove && !canCancel" variant="primary" disabled title="Próximamente">
        <template #leading>
          <span class="pi pi-external-link" aria-hidden="true" />
        </template>
        Ver en explorer
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.hdr {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}
.hdr__title {
  margin: 0 0 2px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}
.hdr__sub {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
  font-family: var(--font-mono);
}
.hdr__close {
  background: transparent;
  border: 0;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  color: var(--text-2);
  padding: 0 4px;
}

.amount-block {
  text-align: center;
  padding: 18px 0 22px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
}
.amount-block__big {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text);
}
.amount-block__sub {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--text-2);
}

.kv {
  margin: 0;
  display: flex;
  flex-direction: column;
}
.kv__row {
  display: grid;
  grid-template-columns: 120px 1fr;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.kv__row:last-child {
  border-bottom: 0;
}
.kv__row dt {
  color: var(--text-2);
  font-size: 12.5px;
  margin: 0;
}
.kv__row dd {
  margin: 0;
  color: var(--text);
}

.kv__ref {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.kv__copy {
  background: transparent;
  border: 0;
  cursor: pointer;
  color: var(--text-3);
  padding: 2px 4px;
  display: inline-flex;
}
.kv__copy:hover {
  color: var(--text);
}
.kv__copy .pi {
  font-size: 12px;
}
.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
</style>
