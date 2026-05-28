<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '@/api/auth'
import { useToast } from '@/composables/useToast'
import AuthLayout from '@/components/molecules/AuthLayout.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import Stepper from '@/components/atoms/Stepper.vue'

const router = useRouter()
const toast = useToast()

const username = ref('')
const displayName = ref('')
const country = ref('')
const loading = ref(false)

const signupSteps = [
  { key: 'data', label: 'Datos de acceso' },
  { key: 'password', label: 'Contraseña' },
  { key: 'verify', label: 'Verificación' },
]
const currentStepIndex = 0

const COUNTRY_OPTIONS: { code: string; label: string }[] = [
  { code: 'AR', label: '🇦🇷 Argentina' },
  { code: 'BR', label: '🇧🇷 Brasil' },
  { code: 'CL', label: '🇨🇱 Chile' },
  { code: 'CO', label: '🇨🇴 Colombia' },
  { code: 'ES', label: '🇪🇸 España' },
  { code: 'MX', label: '🇲🇽 México' },
  { code: 'PE', label: '🇵🇪 Perú' },
  { code: 'US', label: '🇺🇸 Estados Unidos' },
  { code: 'UY', label: '🇺🇾 Uruguay' },
  { code: 'VE', label: '🇻🇪 Venezuela' },
]

async function submit() {
  if (!username.value.trim()) return
  loading.value = true
  try {
    const resp = await register(
      username.value.trim(),
      displayName.value.trim() || username.value.trim(),
      country.value || undefined
    )
    await router.push({
      path: '/activate',
      query: { username: resp.username, code: resp.activation_code },
    })
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error al registrarse',
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

      <h1>Crear cuenta</h1>
      <p class="auth-sub">Elegí un nombre de usuario para acceder a la plataforma.</p>

      <div class="fld">
        <label for="username">Usuario</label>
        <input
          id="username"
          v-model="username"
          type="text"
          autocomplete="username"
          placeholder="alice"
          required
        />
      </div>
      <div class="fld">
        <label for="display-name">Nombre para mostrar <span class="opt">(opcional)</span></label>
        <input
          id="display-name"
          v-model="displayName"
          type="text"
          autocomplete="name"
          placeholder="Alice Smith"
        />
      </div>
      <div class="fld">
        <label for="country">País <span class="opt">(opcional)</span></label>
        <select id="country" v-model="country" autocomplete="country">
          <option value="">Seleccioná un país…</option>
          <option v-for="opt in COUNTRY_OPTIONS" :key="opt.code" :value="opt.code">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <BaseButton variant="primary" size="lg" block type="submit" :loading="loading">
        Continuar
      </BaseButton>

      <div class="auth-switch">
        ¿Ya tenés cuenta? <RouterLink to="/login"> Ingresar </RouterLink>
      </div>
    </form>

    <template #right-panel>
      <div class="auth-right-content">
        <div class="auth-right-label">Onboarding</div>
        <p class="auth-quote">
          "Verificación progresiva. Empezás operando en minutos, subís de nivel cuando te conviene."
        </p>
      </div>

      <div class="role-card">
        <h4>Lo que sigue</h4>
        <div class="next-list">
          <div class="next-item">
            <span class="step-num">2</span>
            <div>
              <b>Activar cuenta</b>
              <span>Establecé tu contraseña con el código de activación</span>
            </div>
          </div>
          <div class="next-item">
            <span class="step-num">3</span>
            <div>
              <b>Primera wallet</b>
              <span>Tu wallet NATIVE se crea automáticamente</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </AuthLayout>
</template>

<style scoped>
/* View-specific styles: the "Lo que sigue" numbered list unique to
 * Register's right-panel. Shared chrome lives in AuthLayout. */
.next-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.next-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.step-num {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
  margin-top: 2px;
}

.next-item b {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  color: #fff;
}

.next-item span {
  display: block;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.55);
  margin-top: 1px;
}
</style>
