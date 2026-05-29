<script setup lang="ts">
/**
 * Phase 7.11.a — minimal-viable user creation wizard.
 *
 * Three steps: Identidad → Rol y KYC → ¡Listo!
 * The third step surfaces the `activation_code` returned by
 * `/auth/register` so the admin can share it with the new user
 * (the user activates with their own password via /auth/activate).
 *
 * Ports the layout from
 * docs/propuesta_rediseno_blockchain_2/flows-onboarding.jsx:425-540
 * but trims to a single PR's worth of scope: no permission overrides,
 * no email invitation. See spec 7.11.a §1 for the deferred items.
 */
import { computed, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { grantRole } from '@/api/admin'
import { register } from '@/api/auth'
import { BlockchainApiError } from '@/api/errors'
import BaseModal from '@/components/atoms/BaseModal.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import Stepper from '@/components/atoms/Stepper.vue'

interface Props {
  open: boolean
}
const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  close: []
  /** Fired after a user is created so the parent can refresh its list. */
  created: [payload: { user_id: string; username: string; role: Role }]
}>()

const toast = useToast()

type Role = 'VIEWER' | 'OPERATOR' | 'ADMIN'

const step = ref<0 | 1 | 2>(0)
const submitting = ref(false)

// Form state (steps 0 + 1)
const firstName = ref('')
const lastName = ref('')
const usernameOverride = ref<string | null>(null) // null = auto from names
const email = ref('')
const country = ref<string>('AR')
const role = ref<Role>('ADMIN') // pragmatic default — see spec
// KYC select is read-only L0 for this phase; the field is here so the
// UI can show it but it's never sent to the backend.

// Result (step 2)
const createdUserId = ref<string>('')
const createdUsername = ref<string>('')
const activationCode = ref<string>('')

const displayName = computed(() => `${firstName.value} ${lastName.value}`.trim())

const autoUsername = computed(() => {
  const f = firstName.value.toLowerCase().replace(/[^a-z]/g, '')
  const l = lastName.value.toLowerCase().replace(/[^a-z]/g, '')
  if (!f && !l) return ''
  return `${f || 'usuario'}.${l || 'apellido'}`
})

const username = computed({
  get: () => usernameOverride.value ?? autoUsername.value,
  set: (value: string) => {
    usernameOverride.value = value
  },
})

const step0Valid = computed(() => {
  return (
    firstName.value.trim().length > 0 &&
    lastName.value.trim().length > 0 &&
    username.value.trim().length > 0 &&
    (email.value === '' || email.value.includes('@'))
  )
})

const ROLE_DESCRIPTIONS: Record<Role, { label: string; copy: string; dot: string }> = {
  VIEWER: {
    label: 'VIEWER',
    copy: 'Cliente final · sus wallets, P2P y exchange',
    dot: '#1f7a3a',
  },
  OPERATOR: {
    label: 'OPERATOR',
    copy: 'Operativa diaria · KYC, congelar, resolver disputas',
    dot: '#0891b2',
  },
  ADMIN: {
    label: 'ADMIN',
    copy: 'Acceso total · puede crear otros admins y operar tesorería',
    dot: '#7c3aed',
  },
}

async function submit() {
  submitting.value = true
  try {
    const reg = await register(username.value, displayName.value, country.value || undefined)
    createdUserId.value = reg.user_id
    createdUsername.value = reg.username
    activationCode.value = reg.activation_code
    // Auto-grant the chosen role if it's not the VIEWER baseline.
    if (role.value !== 'VIEWER') {
      try {
        await grantRole(reg.user_id, role.value)
      } catch (e: unknown) {
        // Don't block — the user was created. Surface the role
        // failure so the admin can retry from the users list.
        toast.add({
          severity: 'warn',
          summary: 'Usuario creado, rol no asignado',
          detail:
            e instanceof BlockchainApiError
              ? e.message
              : 'Concedé el rol manualmente desde la lista.',
          life: 6000,
        })
      }
    }
    step.value = 2
  } catch (e: unknown) {
    toast.add({
      severity: 'error',
      summary: 'No se pudo crear el usuario',
      detail: e instanceof BlockchainApiError ? e.message : String(e),
      life: 5000,
    })
  } finally {
    submitting.value = false
  }
}

function close() {
  if (step.value === 2 && createdUserId.value) {
    emit('created', {
      user_id: createdUserId.value,
      username: createdUsername.value,
      role: role.value,
    })
  }
  // Reset
  step.value = 0
  firstName.value = ''
  lastName.value = ''
  usernameOverride.value = null
  email.value = ''
  country.value = 'AR'
  role.value = 'ADMIN'
  createdUserId.value = ''
  createdUsername.value = ''
  activationCode.value = ''
  emit('update:open', false)
  emit('close')
}

async function copyActivation() {
  try {
    await navigator.clipboard.writeText(activationCode.value)
    toast.add({ severity: 'success', summary: 'Código copiado', life: 2500 })
  } catch {
    /* clipboard blocked — code is still visible on-screen */
  }
}

const TITLES: Record<0 | 1 | 2, string> = {
  0: 'Crear nuevo usuario',
  1: 'Crear nuevo usuario',
  2: '¡Usuario creado!',
}

// Reset when the modal closes externally (e.g. open=false).
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      step.value = 0
    }
  },
)
</script>

<template>
  <BaseModal :open="open" :title="TITLES[step]" :width="560" @close="close">
    <Stepper
      v-if="step < 2"
      :steps="[
        { key: 'id', label: 'Identidad' },
        { key: 'role', label: 'Rol y KYC' },
        { key: 'done', label: 'Listo' },
      ]"
      :current="step"
      class="wizard__stepper"
    />

    <!-- ──────────── Step 0 — Identidad ──────────── -->
    <template v-if="step === 0">
      <div class="form-grid">
        <div class="row">
          <label class="field">
            <span class="field__label">Nombre</span>
            <input v-model="firstName" class="field__input" autofocus />
          </label>
          <label class="field">
            <span class="field__label">Apellido</span>
            <input v-model="lastName" class="field__input" />
          </label>
        </div>
        <label class="field">
          <span class="field__label">Username</span>
          <input v-model="username" class="field__input mono" />
          <span class="field__hint">
            Sugerencia automática: <span class="mono">{{ autoUsername || '—' }}</span>
          </span>
        </label>
        <label class="field">
          <span class="field__label">Email (opcional)</span>
          <input
            v-model="email"
            class="field__input"
            type="email"
            placeholder="usuario@dominio.com"
          />
        </label>
        <label class="field">
          <span class="field__label">País</span>
          <select v-model="country" class="field__input">
            <option value="AR">🇦🇷 Argentina</option>
            <option value="CO">🇨🇴 Colombia</option>
            <option value="MX">🇲🇽 México</option>
            <option value="CL">🇨🇱 Chile</option>
            <option value="ES">🇪🇸 España</option>
          </select>
        </label>
      </div>
    </template>

    <!-- ──────────── Step 1 — Rol y KYC ──────────── -->
    <template v-else-if="step === 1">
      <div class="role-list">
        <label
          v-for="(r, key) in ROLE_DESCRIPTIONS"
          :key="key"
          class="role-card"
          :class="{ 'role-card--active': role === key }"
        >
          <input
            v-model="role"
            type="radio"
            name="role"
            :value="key"
            class="role-card__radio"
          />
          <span class="role-card__dot" :style="{ background: r.dot }" />
          <span class="role-card__text">
            <span class="role-card__label mono">{{ r.label }}</span>
            <span class="role-card__copy muted">{{ r.copy }}</span>
          </span>
        </label>
      </div>

      <label class="field">
        <span class="field__label">Nivel KYC inicial</span>
        <select disabled class="field__input">
          <option>L0 · sin verificar</option>
        </select>
        <span class="field__hint">
          Todos los usuarios nuevos arrancan en L0. La elevación KYC se
          gestiona desde su propio módulo (próximo).
        </span>
      </label>
    </template>

    <!-- ──────────── Step 2 — ¡Listo! ──────────── -->
    <template v-else>
      <div class="done">
        <div class="done__circle" aria-hidden="true">
          <span class="pi pi-check" />
        </div>
        <h3 class="done__title">{{ displayName }} fue creado</h3>
        <p class="done__sub muted">
          Username: <span class="mono">@{{ createdUsername }}</span>
          · Rol: <span class="mono">{{ role }}</span>
        </p>

        <p class="done__hint">
          Compartí este <b>código de activación</b> con el usuario. Lo va a
          necesitar para fijar su password en <span class="mono">/auth/activate</span>.
        </p>

        <div class="activation">
          <code class="activation__code mono">{{ activationCode }}</code>
          <BaseButton variant="ghost" size="sm" @click="copyActivation">
            <template #leading>
              <span class="pi pi-copy" aria-hidden="true" />
            </template>
            Copiar
          </BaseButton>
        </div>

        <p
          v-if="role !== 'VIEWER'"
          class="done__hint muted"
          style="margin-top: 14px"
        >
          El rol <b>{{ role }}</b> ya fue concedido. Si necesitás permisos
          adicionales (p. ej. <span class="mono">VIEW_TRANSFERS</span>,
          <span class="mono">APPROVE_TREASURY_DISTRIBUTION</span>), otorgalos
          desde la lista de usuarios.
        </p>
      </div>
    </template>

    <template #footer>
      <template v-if="step === 0">
        <BaseButton variant="ghost" @click="close">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="!step0Valid" @click="step = 1">
          Continuar
        </BaseButton>
      </template>
      <template v-else-if="step === 1">
        <BaseButton variant="ghost" :disabled="submitting" @click="step = 0">
          Volver
        </BaseButton>
        <BaseButton variant="primary" :loading="submitting" @click="submit">
          Crear usuario
        </BaseButton>
      </template>
      <template v-else>
        <BaseButton variant="primary" @click="close">Listo</BaseButton>
      </template>
    </template>
  </BaseModal>
</template>

<style scoped>
.wizard__stepper {
  margin-bottom: 16px;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.field__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
}
.field__input {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: var(--radius);
  padding: 8px 10px;
  font-size: 13px;
  font-family: var(--font-sans);
  color: var(--text);
  outline: none;
}
.field__input.mono {
  font-family: var(--font-mono);
}
.field__input:focus {
  border-color: var(--accent, var(--text));
}
.field__input:disabled {
  background: var(--surface-2);
  color: var(--text-2);
  cursor: not-allowed;
}
.field__hint {
  font-size: 11.5px;
  color: var(--text-3);
}

.role-list {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  margin-bottom: 16px;
}
.role-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.12s;
}
.role-card:last-child {
  border-bottom: 0;
}
.role-card:hover {
  background: var(--muted-soft);
}
.role-card--active {
  background: var(--accent-soft);
}
.role-card__radio {
  accent-color: var(--accent, var(--text));
}
.role-card__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.role-card__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.role-card__label {
  font-weight: 600;
  font-size: 13px;
  color: var(--text);
}
.role-card__copy {
  font-size: 11.5px;
}

.done {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 6px 0 0;
}
.done__circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--success-soft, rgba(34, 197, 94, 0.15));
  color: var(--success, rgb(22, 101, 52));
  display: grid;
  place-items: center;
  font-size: 28px;
  margin-bottom: 12px;
}
.done__title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
}
.done__sub {
  font-size: 12.5px;
  margin: 0;
}
.done__hint {
  margin: 18px 0 10px;
  font-size: 12.5px;
  color: var(--text-2);
  line-height: 1.55;
  max-width: 420px;
}

.activation {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--surface-2);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
}
.activation__code {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text);
  text-align: left;
}

.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
.muted {
  color: var(--text-2);
}
</style>
