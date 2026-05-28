<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { activate } from '@/api/auth'
import { useToast } from '@/composables/useToast'
import AuthLayout from '@/components/molecules/AuthLayout.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import Stepper from '@/components/atoms/Stepper.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()

const username = ref((route.query.username as string) ?? '')
const activationCode = ref((route.query.code as string) ?? '')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)

const signupSteps = [
  { key: 'data', label: 'Datos de acceso' },
  { key: 'password', label: 'Contraseña' },
  { key: 'verify', label: 'Verificación' },
]
const currentStepIndex = 1

onMounted(() => {
  if (!username.value) router.push('/register')
})

async function submit() {
  if (password.value.length < 8) {
    toast.add({
      severity: 'warn',
      summary: 'Contraseña corta',
      detail: 'Mínimo 8 caracteres',
      life: 3000,
    })
    return
  }
  if (password.value !== confirmPassword.value) {
    toast.add({
      severity: 'warn',
      summary: 'No coinciden',
      detail: 'Las contraseñas no coinciden',
      life: 3000,
    })
    return
  }
  loading.value = true
  try {
    await activate(username.value, activationCode.value, password.value)
    toast.add({
      severity: 'success',
      summary: 'Cuenta activada',
      detail: 'Ya podés ingresar',
      life: 3000,
    })
    await router.push('/login')
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error al activar',
      detail: e instanceof Error ? e.message : 'Error inesperado',
      life: 4000,
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <form class="auth-form" @submit.prevent="submit">
      <Stepper :steps="signupSteps" :current="currentStepIndex" />
      <BaseBadge variant="outline" tone="neutral">
        Paso {{ currentStepIndex + 1 }} de {{ signupSteps.length }} ·
        {{ signupSteps[currentStepIndex].label }}
      </BaseBadge>

      <h1>Activar cuenta</h1>
      <p class="auth-sub">
        Bienvenido/a, <strong>{{ username }}</strong
        >. Elegí una contraseña para completar la activación.
      </p>

      <div class="fld">
        <label for="password">Contraseña</label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="new-password"
          placeholder="mínimo 8 caracteres"
          required
          minlength="8"
        />
      </div>
      <div class="fld">
        <label for="confirm">Confirmar contraseña</label>
        <input
          id="confirm"
          v-model="confirmPassword"
          type="password"
          autocomplete="new-password"
          placeholder="repetir contraseña"
          required
        />
      </div>

      <div v-if="activationCode" class="code-hint">
        Código de activación: <span class="mono">{{ activationCode }}</span>
      </div>

      <BaseButton variant="primary" size="lg" block type="submit" :loading="loading">
        Activar cuenta
      </BaseButton>

      <div class="auth-switch">
        ¿Ya activaste tu cuenta? <RouterLink to="/login"> Ingresar </RouterLink>
      </div>
    </form>

    <template #right-panel>
      <div class="auth-right-content">
        <div class="auth-right-label">Seguridad</div>
        <p class="auth-quote">
          "Tu contraseña se almacena con hashing seguro. Nunca la enviamos por email ni la
          conocemos."
        </p>
      </div>

      <div class="role-card">
        <h4>Recomendaciones</h4>
        <div class="tip-list">
          <div class="tip-item">
            <span class="tip-dot" style="background: var(--success)" />
            <span>Mínimo 8 caracteres con letras y números</span>
          </div>
          <div class="tip-item">
            <span class="tip-dot" style="background: var(--warning)" />
            <span>Evitá contraseñas fáciles de adivinar</span>
          </div>
          <div class="tip-item">
            <span class="tip-dot" style="background: var(--info)" />
            <span>Usá un gestor de contraseñas</span>
          </div>
        </div>
      </div>
    </template>
  </AuthLayout>
</template>

<style scoped>
/* View-specific styles: the tip-list pattern unique to Activate's
 * right-panel, plus the activation code hint shown on the form.
 * Shared chrome lives in AuthLayout. */
.code-hint {
  font-size: 11.5px;
  color: var(--text-2);
  background: var(--surface-2);
  padding: 8px 10px;
  border-radius: var(--radius);
  margin-bottom: 12px;
}

.code-hint .mono {
  font-family: var(--font-mono);
  color: var(--text);
  font-weight: 600;
}

.tip-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.4;
}

.tip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 5px;
}
</style>
