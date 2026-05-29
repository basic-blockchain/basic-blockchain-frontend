<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { defaultLandingFor } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { BlockchainApiError } from '@/api/errors'
import AuthLayout from '@/components/molecules/AuthLayout.vue'
import BaseButton from '@/components/atoms/BaseButton.vue'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const username = ref('')
const password = ref('')
const loading = ref(false)

async function submit() {
  if (!username.value.trim() || !password.value) return
  loading.value = true
  try {
    await auth.login(username.value.trim(), password.value)
    // Role-aware landing: ADMIN / OPERATOR → /admin, VIEWER → /wallet,
    // anything else → /dashboard. Hard-coded `/wallet` here used to
    // strand staff accounts on the customer surface (and now, with
    // BR-WL-11, would bounce them right back out).
    await router.push(defaultLandingFor(auth.user?.roles ?? []))
  } catch (e) {
    const msg =
      e instanceof BlockchainApiError && e.httpStatus === 401
        ? 'Usuario o contraseña incorrectos'
        : e instanceof Error
          ? e.message
          : 'Error al ingresar'
    toast.add({ severity: 'error', summary: 'Error al ingresar', detail: msg, life: 4000 })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <form class="auth-form" @submit.prevent="submit">
      <h1>Ingresar</h1>
      <p class="auth-sub">Accedé a tu panel de la plataforma.</p>

      <div class="fld">
        <label for="username">Email o usuario</label>
        <input
          id="username"
          v-model="username"
          type="text"
          autocomplete="username"
          placeholder="usuario o email"
          required
        />
      </div>
      <div class="fld">
        <label for="password">Contraseña</label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
          required
        />
      </div>

      <BaseButton variant="primary" size="lg" block type="submit" :loading="loading">
        Continuar
      </BaseButton>

      <div class="auth-divider">
        <span class="auth-divider-line" />
        <span>o</span>
        <span class="auth-divider-line" />
      </div>

      <RouterLink v-slot="{ navigate }" to="/register" custom>
        <BaseButton variant="ghost" size="lg" block @click="navigate">
          Crear una cuenta
        </BaseButton>
      </RouterLink>

      <div class="auth-switch">
        ¿No tenés cuenta? <RouterLink to="/register"> Crear una </RouterLink>
      </div>
    </form>

    <template #foot>
      <span>© 2026 Cadena</span>
      <span>·</span>
      <a href="#">Términos</a>
      <a href="#">Privacidad</a>
    </template>

    <template #right-panel>
      <div class="auth-right-content">
        <div class="auth-right-label">Plataforma</div>
        <p class="auth-quote">
          "Operaciones, cumplimiento y tesorería sobre la misma capa de datos blockchain — sin
          reconciliaciones manuales."
        </p>
      </div>

      <div class="role-card">
        <h4>Roles de la plataforma</h4>
        <div class="role-list">
          <div class="role-item">
            <span class="role-dot" style="background: #a78bfa" />
            <div>
              <b>ADMIN</b>
              <span>Gobierno total · tesorería, configuración, eliminación de usuarios</span>
            </div>
          </div>
          <div class="role-item">
            <span class="role-dot" style="background: #67e8f9" />
            <div>
              <b>OPERATOR</b>
              <span>Operativa diaria · KYC, congelar/desbanear, mover fondos según política</span>
            </div>
          </div>
          <div class="role-item">
            <span class="role-dot" style="background: #86efac" />
            <div>
              <b>USER</b>
              <span>Cliente final · wallets, P2P, exchange, envíos y recepción</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </AuthLayout>
</template>

<style scoped>
/* View-specific styles: the role-list pattern unique to Login's
 * right-panel. Shared chrome (.auth-wrap, .fld, .role-card, etc.)
 * lives in AuthLayout. */
.role-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.role-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.role-item b {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  color: #fff;
}

.role-item span {
  display: block;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.55);
  margin-top: 1px;
}
</style>
