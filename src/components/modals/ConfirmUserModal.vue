<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseModal from '@/components/atoms/BaseModal.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'

export type UserAction = 'ban' | 'unban' | 'freeze' | 'unfreeze' | 'delete' | 'restore' | 'activate'

export interface ConfirmUserTarget {
  fullName: string
  email: string
  walletCount: number
  totalUsd: number
}

const props = defineProps<{
  action: UserAction
  user: ConfirmUserTarget
}>()

const emit = defineEmits<{
  close: []
  confirm: [{ action: UserAction; reason: string; scope: string }]
}>()

type Scope = 'all' | 'active' | 'select'
const reason = ref('')
const scope = ref<Scope>('all')
const confirmText = ref('')

interface ActionConfig {
  title: string
  desc: string
  cta: string
  danger: boolean
  info?: boolean
  requireReason?: boolean
  reasonOpts?: string[]
  hasScope?: boolean
  requireType?: boolean
}

const configs: Record<UserAction, ActionConfig> = {
  ban: {
    title: `¿Banear a ${props.user.fullName}?`,
    desc: 'El usuario no podrá iniciar sesión ni operar. Sus wallets se congelarán automáticamente.',
    cta: 'Banear usuario',
    danger: true,
    requireReason: true,
    reasonOpts: ['Sospecha de fraude', 'Múltiples cuentas', 'AML alert', 'Solicitud regulatoria', 'Violación de TOS', 'Otro'],
  },
  unban: {
    title: `¿Desbanear a ${props.user.fullName}?`,
    desc: 'El usuario podrá volver a operar. Las wallets quedarán activas según su estado anterior.',
    cta: 'Desbanear',
    danger: false,
  },
  freeze: {
    title: `¿Congelar wallets de ${props.user.fullName}?`,
    desc: 'Las wallets pasan a modo solo-lectura. El usuario no podrá retirar ni operar P2P/exchange.',
    cta: 'Congelar wallets',
    danger: false,
    info: true,
    requireReason: true,
    reasonOpts: ['Revisión KYC', 'AML hold', 'Solicitud del usuario', 'Investigación interna', 'Otro'],
    hasScope: true,
  },
  unfreeze: {
    title: '¿Descongelar wallets?',
    desc: 'Las wallets volverán a operar normalmente.',
    cta: 'Descongelar',
    danger: false,
  },
  delete: {
    title: `¿Eliminar a ${props.user.fullName}?`,
    desc: 'Soft-delete. Los registros de auditoría se mantienen. La cuenta puede restaurarse.',
    cta: 'Eliminar usuario',
    danger: true,
    requireReason: true,
    reasonOpts: ['Solicitud del usuario (GDPR)', 'Cuenta duplicada', 'Inactividad prolongada', 'Solicitud regulatoria', 'Otro'],
    requireType: true,
  },
  restore: {
    title: `¿Restaurar a ${props.user.fullName}?`,
    desc: 'La cuenta volverá a estar activa. Las wallets seguirán congeladas hasta una revisión manual.',
    cta: 'Restaurar',
    danger: false,
  },
  activate: {
    title: '¿Activar cuenta?',
    desc: 'La cuenta pasará al estado activo.',
    cta: 'Activar',
    danger: false,
  },
}

const config = computed(() => configs[props.action])

const isOther = computed(() => reason.value === '_other')
const selectedOpt = computed(() =>
  config.value.reasonOpts?.includes(reason.value) ? reason.value : (reason.value ? 'Otro' : ''),
)

function onSelectReason(v: string) {
  reason.value = v === 'Otro' ? '_other' : v
}

const canConfirm = computed(() => {
  const reasonOk = !config.value.requireReason || (reason.value.length >= 3 && reason.value !== '_other')
  const typeOk = !config.value.requireType || confirmText.value === props.user.email
  return reasonOk && typeOk
})

function submit() {
  if (!canConfirm.value) return
  emit('confirm', { action: props.action, reason: reason.value, scope: scope.value })
}

function fmtUsd(n: number) {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function onOpenChange(value: boolean) {
  if (!value) emit('close')
}
</script>

<template>
  <BaseModal
    :open="true"
    :width="480"
    @update:open="onOpenChange"
  >
    <template #header>
      <div class="confirm-header">
        <h2>{{ config.title }}</h2>
        <p>{{ config.desc }}</p>
      </div>
      <BaseButton
        variant="ghost"
        size="sm"
        icon-only
        aria-label="Cerrar"
        @click="emit('close')"
      >
        ×
      </BaseButton>
    </template>

    <div
      v-if="config.danger"
      class="warn-box"
    >
      <span
        class="pi pi-exclamation-triangle"
        style="font-size:14px;flex-shrink:0;margin-top:1px"
      />
      <div>
        <div style="font-weight:600;margin-bottom:2px">
          Acción de alto impacto
        </div>
        <div>Esta acción quedará registrada en el log de auditoría. Saldo afectado: <b>{{ fmtUsd(user.totalUsd) }}</b> en {{ user.walletCount }} wallet{{ user.walletCount === 1 ? '' : 's' }}.</div>
      </div>
    </div>

    <div
      v-if="config.requireReason"
      class="fld"
    >
      <label>Motivo (requerido)</label>
      <select
        :value="selectedOpt"
        @change="onSelectReason(($event.target as HTMLSelectElement).value)"
      >
        <option
          value=""
          disabled
        >
          Seleccionar motivo…
        </option>
        <option
          v-for="opt in config.reasonOpts"
          :key="opt"
          :value="opt"
        >
          {{ opt }}
        </option>
      </select>
      <textarea
        v-if="isOther"
        v-model="reason"
        placeholder="Describir el motivo…"
        autofocus
        style="margin-top:6px;padding:8px 10px;border:1px solid var(--border-strong);border-radius:var(--radius);background:var(--surface-2);color:var(--text);font-size:13px;font-family:var(--font-sans);resize:vertical;min-height:56px;outline:none"
      />
    </div>

    <div
      v-if="config.hasScope"
      class="fld"
    >
      <label>Alcance</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button
          v-for="[k, l] in [['all','Todas las wallets'],['active','Solo wallets activas'],['select','Seleccionar manualmente']]"
          :key="k"
          class="chip"
          :class="{ active: scope === k }"
          @click="scope = k as Scope"
        >
          {{ l }}
        </button>
      </div>
    </div>

    <div
      v-if="config.requireType"
      class="fld"
    >
      <label>Para confirmar, escribí el email del usuario: <span
        class="mono"
        style="color:var(--text)"
      >{{ user.email }}</span></label>
      <input
        v-model="confirmText"
        :placeholder="user.email"
        autocomplete="off"
        autofocus
      >
    </div>

    <div class="dry-run">
      <span
        class="pi pi-info-circle"
        style="font-size:13px"
      />
      <span>Vista previa:</span>
      <span style="color:var(--text);font-weight:500">1 usuario · {{ user.walletCount }} wallet{{ user.walletCount === 1 ? '' : 's' }} · {{ fmtUsd(user.totalUsd) }}</span>
    </div>

    <template #footer>
      <BaseButton
        variant="secondary"
        @click="emit('close')"
      >
        Cancelar
      </BaseButton>
      <BaseButton
        :variant="config.danger ? 'danger' : 'primary'"
        :disabled="!canConfirm"
        @click="submit"
      >
        {{ config.cta }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.confirm-header {
  flex: 1;
  min-width: 0;
}
.confirm-header h2 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text);
}
.confirm-header p {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.45;
}
</style>
