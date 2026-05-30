<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import Stepper from '@/components/atoms/Stepper.vue'
import type { Step } from '@/components/atoms/Stepper.vue'
import { createStaffUser, type CreateStaffResult } from '@/api/permissions'
import {
  PERM_CATEGORIES, ROLE_PRESETS,
  type StaffUser, type StaffRole,
} from '@/composables/usePermissions'

const emit = defineEmits<{
  close: []
  created: [user: StaffUser]
}>()

// ── Stepper ───────────────────────────────────────────────────────────────────

const step = ref(0)

const STEPS: Step[] = [
  { key: 'identity', label: 'Identidad' },
  { key: 'perms',    label: 'Permisos'  },
  { key: 'access',   label: 'Acceso'    },
  { key: 'done',     label: 'Listo'     },
]

// ── Form state ────────────────────────────────────────────────────────────────

type NotifyMethod = 'email-link' | 'temp-password'

const form = ref({
  name:     '',
  email:    '',
  country:  'AR',
  role:     'OPERATOR' as StaffRole,
  perms:    new Set<string>(ROLE_PRESETS.OPERATOR),
  notify:   'email-link' as NotifyMethod,
  force2fa: true,
})

function changeRole(role: StaffRole) {
  form.value.role = role
  form.value.perms = new Set(ROLE_PRESETS[role])
}

function togglePerm(key: string) {
  const next = new Set(form.value.perms)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  form.value.perms = next
}

function categoryEnabled(cat: typeof PERM_CATEGORIES[number]): number {
  return cat.perms.filter(([k]) => form.value.perms.has(k)).length
}

const step0Valid = computed(() => form.value.name.trim() !== '' && form.value.email.trim() !== '')

// ── API call ──────────────────────────────────────────────────────────────────

const creating = ref(false)
const createError = ref('')
const result = ref<CreateStaffResult | null>(null)
const copied = ref(false)

async function submitCreate() {
  creating.value = true
  createError.value = ''
  try {
    const r = await createStaffUser({
      name:    form.value.name,
      email:   form.value.email,
      country: form.value.country,
      role:    form.value.role,
      perms:   form.value.perms,
      notify:  form.value.notify,
    })
    result.value = r
    emit('created', r.staffUser)
    step.value = 3
  } catch (e: unknown) {
    createError.value = e instanceof Error ? e.message : 'Error al crear el usuario'
  } finally {
    creating.value = false
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  })
}

function startOver() {
  step.value = 0
  result.value = null
  createError.value = ''
  form.value = {
    name: '', email: '', country: 'AR',
    role: 'OPERATOR', perms: new Set(ROLE_PRESETS.OPERATOR),
    notify: 'email-link', force2fa: true,
  }
}

// ── Display helpers ───────────────────────────────────────────────────────────

const ACCESS_OPTIONS: [NotifyMethod, string, string][] = [
  ['email-link',     'Link de activación por email',    'El usuario establece su propia contraseña · expira en 24h'],
  ['temp-password',  'Contraseña temporal generada',    'Se debe cambiar al primer login · se muestra una sola vez'],
]

const roleDescriptions: Record<StaffRole, string> = {
  ADMIN:    'Acceso total · puede crear admins, mover tesorería, eliminar usuarios',
  OPERATOR: 'Operativa diaria · wallets, transferencias, KYC, tesorería (lectura)',
  VIEWER:   'Cliente final · solo su propia wallet y operaciones personales',
}

function roleBg(role: StaffRole): string {
  if (role === 'ADMIN') return '#ede9fe'
  if (role === 'OPERATOR') return '#cffafe'
  return 'var(--surface-2)'
}
function roleColor(role: StaffRole): string {
  if (role === 'ADMIN') return '#5b21b6'
  if (role === 'OPERATOR') return '#155e75'
  return 'var(--text-2)'
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-scrim" @mousedown.self="emit('close')">
      <div class="modal" role="dialog" aria-modal="true" aria-label="Crear usuario administrativo">

        <!-- Header -->
        <div class="modal-header">
          <div class="modal-header-top">
            <h2 class="modal-title">Crear usuario administrativo</h2>
            <button class="modal-close" aria-label="Cerrar" @click="emit('close')">
              <i class="pi pi-times" />
            </button>
          </div>
          <Stepper :steps="STEPS" :current="step" />
        </div>

        <!-- Body -->
        <div class="modal-body">

          <!-- Step 0: Identidad -->
          <template v-if="step === 0">
            <div class="fld-row">
              <div class="fld">
                <label class="fld-label">Nombre completo</label>
                <input v-model="form.name" class="fld-input" placeholder="Sergio Romero" autofocus />
              </div>
              <div class="fld">
                <label class="fld-label">Email</label>
                <input v-model="form.email" class="fld-input" type="email" placeholder="sergio@dropi.co" />
              </div>
            </div>
            <div class="fld">
              <label class="fld-label">País</label>
              <select v-model="form.country" class="fld-select">
                <option value="AR">🇦🇷 Argentina</option>
                <option value="MX">🇲🇽 México</option>
                <option value="CO">🇨🇴 Colombia</option>
                <option value="CL">🇨🇱 Chile</option>
                <option value="UY">🇺🇾 Uruguay</option>
              </select>
            </div>
            <div class="fld">
              <label class="fld-label">Rol</label>
              <div class="role-strip">
                <button
                  v-for="r in (['ADMIN', 'OPERATOR', 'VIEWER'] as StaffRole[])"
                  :key="r"
                  type="button"
                  class="role-btn"
                  :class="{ 'role-btn--active': form.role === r }"
                  :style="form.role === r
                    ? { background: roleBg(r), color: roleColor(r), borderColor: roleColor(r) }
                    : {}"
                  @click="changeRole(r)"
                >{{ r }}</button>
              </div>
              <p class="fld-hint">{{ roleDescriptions[form.role] }}</p>
            </div>
          </template>

          <!-- Step 1: Permisos -->
          <template v-if="step === 1">
            <div class="preset-info">
              <span class="preset-role" :style="{ background: roleBg(form.role), color: roleColor(form.role) }">
                {{ form.role }}
              </span>
              viene con <strong>{{ ROLE_PRESETS[form.role].length }} permisos preset</strong>. Podés ajustarlos.
            </div>
            <div v-for="cat in PERM_CATEGORIES" :key="cat.id" class="cat-block">
              <div class="cat-header">
                <span class="cat-dot" :style="{ background: cat.color }" />
                <span class="cat-label">{{ cat.label }}</span>
                <span class="cat-count" :class="{ 'cat-count--on': categoryEnabled(cat) > 0 }">
                  {{ categoryEnabled(cat) }}/{{ cat.perms.length }}
                </span>
              </div>
              <div class="perm-grid">
                <label
                  v-for="([key, label]) in cat.perms"
                  :key="key"
                  class="perm-check"
                  :class="{ 'perm-check--on': form.perms.has(key) }"
                >
                  <input type="checkbox" :checked="form.perms.has(key)" @change="togglePerm(key)" />
                  <span>{{ label }}</span>
                </label>
              </div>
            </div>
          </template>

          <!-- Step 2: Acceso -->
          <template v-if="step === 2">
            <div class="fld">
              <label class="fld-label">Cómo recibe acceso</label>
              <div class="access-options">
                <label
                  v-for="[k, l, d] in ACCESS_OPTIONS"
                  :key="k"
                  class="access-opt"
                  :class="{ 'access-opt--active': form.notify === k }"
                >
                  <input
                    type="radio"
                    :value="k"
                    :checked="form.notify === k"
                    @change="form.notify = k as NotifyMethod"
                  />
                  <div>
                    <div class="access-opt-label">{{ l }}</div>
                    <div class="access-opt-desc">{{ d }}</div>
                  </div>
                </label>
              </div>
            </div>

            <div class="summary-card">
              <div class="summary-title">Resumen</div>
              <div class="summary-row"><span class="summary-key">Usuario</span><span class="summary-val">{{ form.name || '—' }}</span></div>
              <div class="summary-row"><span class="summary-key">Email</span><span class="summary-val summary-val--mono">{{ form.email || '—' }}</span></div>
              <div class="summary-row">
                <span class="summary-key">Rol</span>
                <span class="summary-val summary-val--mono" :style="{ color: roleColor(form.role) }">{{ form.role }}</span>
              </div>
              <div class="summary-row"><span class="summary-key">Permisos</span><span class="summary-val">{{ form.perms.size }}</span></div>
              <div class="summary-row">
                <span class="summary-key">Extras sobre preset</span>
                <span class="summary-val">
                  {{ [...form.perms].filter(p => !ROLE_PRESETS[form.role].includes(p)).length }}
                </span>
              </div>
            </div>

            <div v-if="createError" class="error-box">
              <i class="pi pi-exclamation-triangle" />
              <span>{{ createError }}</span>
            </div>
          </template>

          <!-- Step 3: Listo -->
          <template v-if="step === 3 && result">
            <div class="success-block">
              <div class="success-icon"><i class="pi pi-check" style="font-size: 28px" /></div>
              <div class="success-title">Usuario creado</div>
              <div class="success-sub">
                <strong>{{ form.name }}</strong> fue registrado como <strong>{{ form.role }}</strong>
              </div>
            </div>

            <!-- email-link: email enviado -->
            <template v-if="form.notify === 'email-link' && result.email_sent">
              <div class="email-sent-banner">
                <i class="pi pi-envelope" />
                <div>
                  <div class="email-sent-title">Email de activación enviado</div>
                  <div class="email-sent-sub">
                    Se envió un link de activación a <strong>{{ form.email }}</strong>.
                    El usuario puede establecer su contraseña desde el link en el email.
                  </div>
                </div>
              </div>
              <div class="summary-card">
                <div class="summary-title">Fallback — si el email no llega</div>
                <div class="summary-row">
                  <span class="summary-key">Username</span>
                  <div class="copy-row">
                    <span class="summary-val summary-val--mono">{{ result.username }}</span>
                    <button class="copy-btn" @click="copyToClipboard(result!.username)">
                      <i :class="copied ? 'pi pi-check' : 'pi pi-copy'" />
                    </button>
                  </div>
                </div>
                <div class="summary-row">
                  <span class="summary-key">Código de activación</span>
                  <div class="copy-row">
                    <span class="summary-val summary-val--mono">{{ result.activation_code }}</span>
                    <button class="copy-btn" @click="copyToClipboard(result!.activation_code)">
                      <i :class="copied ? 'pi pi-check' : 'pi pi-copy'" />
                    </button>
                  </div>
                </div>
                <div class="info-note" style="margin-top: 8px">
                  <i class="pi pi-info-circle" />
                  Podés compartir el username y código manualmente para activar en
                  <span class="mono">/activate</span>.
                </div>
              </div>
            </template>

            <!-- temp-password: contraseña temporal -->
            <template v-else-if="form.notify === 'temp-password' && result.temp_password">
              <div class="summary-card">
                <div class="summary-title">Compartir con el usuario</div>
                <div class="summary-row">
                  <span class="summary-key">Username</span>
                  <div class="copy-row">
                    <span class="summary-val summary-val--mono">{{ result.username }}</span>
                    <button class="copy-btn" @click="copyToClipboard(result!.username)">
                      <i :class="copied ? 'pi pi-check' : 'pi pi-copy'" />
                    </button>
                  </div>
                </div>
                <div class="summary-row">
                  <span class="summary-key">Contraseña temporal</span>
                  <div class="copy-row">
                    <span class="summary-val summary-val--mono">{{ result.temp_password }}</span>
                    <button class="copy-btn" @click="copyToClipboard(result!.temp_password!)">
                      <i :class="copied ? 'pi pi-check' : 'pi pi-copy'" />
                    </button>
                  </div>
                </div>
                <div class="warn-note" style="margin-top: 8px">
                  <i class="pi pi-exclamation-triangle" />
                  Esta contraseña se muestra una sola vez. El usuario deberá cambiarla al primer login.
                </div>
              </div>
            </template>

            <div class="summary-card">
              <div class="summary-title">Cuenta creada</div>
              <div class="summary-row">
                <span class="summary-key">Rol</span>
                <span class="summary-val summary-val--mono" :style="{ color: roleColor(form.role) }">{{ form.role }}</span>
              </div>
              <div class="summary-row">
                <span class="summary-key">Permisos asignados</span>
                <span class="summary-val">{{ form.perms.size }}</span>
              </div>
              <div class="summary-row">
                <span class="summary-key">Permisos extra</span>
                <span class="summary-val">{{ result.staffUser.overrides.length }}</span>
              </div>
            </div>
          </template>

        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <template v-if="step === 0">
            <BaseButton @click="emit('close')">Cancelar</BaseButton>
            <BaseButton variant="primary" :disabled="!step0Valid" @click="step = 1">Continuar</BaseButton>
          </template>
          <template v-else-if="step === 1">
            <BaseButton @click="step = 0">Atrás</BaseButton>
            <BaseButton variant="primary" @click="step = 2">Continuar</BaseButton>
          </template>
          <template v-else-if="step === 2">
            <BaseButton :disabled="creating" @click="step = 1">Atrás</BaseButton>
            <BaseButton variant="primary" :disabled="creating" :loading="creating" @click="submitCreate">
              {{ creating ? 'Creando…' : 'Crear usuario' }}
            </BaseButton>
          </template>
          <template v-else>
            <BaseButton @click="emit('close')">Cerrar</BaseButton>
            <BaseButton variant="primary" @click="startOver">Crear otro usuario</BaseButton>
          </template>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-scrim {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(20, 18, 12, 0.42);
  display: grid; place-items: center;
  padding: var(--space-lg);
}
.modal {
  background: var(--surface); border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg); width: 640px;
  max-width: 92vw; max-height: 88vh;
  display: flex; flex-direction: column; outline: none;
}

.modal-header {
  padding: 18px 20px 14px; border-bottom: 1px solid var(--border);
}
.modal-header-top {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;
}
.modal-title { margin: 0; font-size: 16px; font-weight: 600; letter-spacing: -0.01em; color: var(--text); }
.modal-close {
  width: 28px; height: 28px; display: grid; place-items: center;
  border: 0; background: transparent; border-radius: var(--radius);
  color: var(--text-3); cursor: pointer; font-size: 16px;
  transition: background var(--duration-fast) var(--ease-out);
}
.modal-close:hover { background: var(--hover); color: var(--text); }

.modal-body {
  flex: 1 1 auto; overflow-y: auto;
  padding: 16px 20px; display: flex; flex-direction: column; gap: 12px;
}
.modal-footer {
  padding: 12px 20px; border-top: 1px solid var(--border);
  background: var(--surface-2); display: flex; gap: 8px; justify-content: flex-end;
}

/* Form */
.fld-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.fld { display: flex; flex-direction: column; gap: 5px; }
.fld-label { font-size: 12px; font-weight: 500; color: var(--text-2); }
.fld-input, .fld-select {
  height: 32px; padding: 0 9px;
  border: 1px solid var(--border); border-radius: var(--radius);
  font: 12.5px/1 var(--font-sans); color: var(--text); background: var(--surface);
  outline: none; transition: border-color var(--duration-fast) var(--ease-out);
}
.fld-input:focus, .fld-select:focus { border-color: var(--accent); }
.fld-hint { margin: 0; font-size: 11.5px; color: var(--text-3); }

.role-strip { display: flex; gap: 6px; }
.role-btn {
  flex: 1; height: 32px; border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface); font: 600 11.5px/1 var(--font-mono); color: var(--text-2); cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}
.role-btn:hover:not(.role-btn--active) { background: var(--hover); color: var(--text); }

/* Permissions step */
.preset-info {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 12px; background: var(--surface-2);
  border-radius: var(--radius); font-size: 12px; color: var(--text-2);
}
.preset-role {
  display: inline-block; padding: 2px 7px;
  border-radius: var(--radius-pill); font: 600 10.5px/1 var(--font-mono);
}
.cat-block { display: flex; flex-direction: column; gap: 6px; }
.cat-header { display: flex; align-items: center; gap: 6px; }
.cat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.cat-label { font-size: 12.5px; font-weight: 600; color: var(--text); flex: 1; }
.cat-count {
  font-size: 10.5px; font-weight: 600; padding: 2px 6px;
  border-radius: var(--radius-pill); background: var(--surface-2); color: var(--text-3);
}
.cat-count--on { background: var(--success-soft); color: var(--success); }
.perm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.perm-check {
  display: flex; align-items: center; gap: 7px; padding: 6px 8px;
  border-radius: var(--radius); background: var(--surface-2); cursor: pointer;
  font-size: 11.5px; color: var(--text-2); transition: background var(--duration-fast) var(--ease-out);
}
.perm-check--on { background: var(--success-soft); color: var(--success); }
.perm-check input { width: 13px; height: 13px; accent-color: var(--success); flex-shrink: 0; }

/* Access step */
.access-options { display: flex; flex-direction: column; gap: 8px; }
.access-opt {
  display: flex; align-items: flex-start; gap: 10px; padding: 12px;
  border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer;
  background: var(--surface); transition: all var(--duration-fast) var(--ease-out);
}
.access-opt--active { background: var(--accent-soft, #f0f0ff); border-color: var(--accent); }
.access-opt input[type="radio"] { margin-top: 2px; flex-shrink: 0; accent-color: var(--accent); }
.access-opt-label { font-size: 13px; font-weight: 500; color: var(--text); }
.access-opt-desc { font-size: 11.5px; color: var(--text-3); margin-top: 2px; }

/* Summary card */
.summary-card {
  background: var(--surface-2); border-radius: var(--radius); padding: 12px 14px;
  display: flex; flex-direction: column;
}
.summary-title {
  font-size: 10px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--text-3); margin-bottom: 8px;
}
.summary-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 5px 0; border-bottom: 1px solid var(--border); font-size: 12px;
}
.summary-row:last-child { border-bottom: 0; }
.summary-key { color: var(--text-3); }
.summary-val { font-weight: 500; color: var(--text); }
.summary-val--mono { font-family: var(--font-mono); }

/* Copy row */
.copy-row { display: flex; align-items: center; gap: 6px; }
.copy-btn {
  width: 22px; height: 22px; display: grid; place-items: center;
  border: 0; background: transparent; border-radius: var(--radius);
  color: var(--text-3); cursor: pointer; font-size: 12px;
  transition: color var(--duration-fast) var(--ease-out);
}
.copy-btn:hover { color: var(--text); }

/* Notes */
.info-note, .warn-note {
  display: flex; align-items: flex-start; gap: 7px; margin-top: 8px;
  padding: 8px 10px; border-radius: var(--radius); font-size: 11.5px; line-height: 1.5;
}
.info-note { background: var(--info-soft); color: var(--info); }
.warn-note { background: var(--warning-soft); color: var(--warning); }
.info-note i, .warn-note i { flex-shrink: 0; margin-top: 1px; }
.mono { font-family: var(--font-mono); }

/* Success step */
.success-block {
  display: flex; flex-direction: column; align-items: center;
  padding: 20px 0 12px; text-align: center;
}
.success-icon {
  width: 60px; height: 60px; border-radius: 50%;
  background: var(--success-soft); color: var(--success);
  display: grid; place-items: center; margin-bottom: 14px;
}
.success-title { font-size: 20px; font-weight: 700; letter-spacing: -0.01em; color: var(--text); margin-bottom: 4px; }
.success-sub { font-size: 13px; color: var(--text-2); }

/* Email sent banner */
.email-sent-banner {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 14px 16px; background: var(--success-soft);
  border-radius: var(--radius); color: var(--success);
}
.email-sent-banner .pi-envelope { font-size: 20px; flex-shrink: 0; margin-top: 2px; }
.email-sent-title { font-size: 13px; font-weight: 600; margin-bottom: 3px; }
.email-sent-sub { font-size: 12px; line-height: 1.5; opacity: 0.9; }

/* Error */
.error-box {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 12px; background: var(--danger-soft);
  border-radius: var(--radius); font-size: 12px; color: var(--danger); line-height: 1.5;
}
.error-box i { flex-shrink: 0; margin-top: 1px; font-size: 13px; }
</style>
