<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { activate } from '@/api/auth'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const route = useRoute()
const toast = useToast()

const username = ref((route.query.username as string) ?? '')
const activationCode = ref((route.query.code as string) ?? '')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)

onMounted(() => {
  if (!username.value) router.push('/register')
})

async function submit() {
  if (password.value.length < 8) {
    toast.add({ severity: 'warn', summary: 'Contraseña corta', detail: 'Mínimo 8 caracteres', life: 3000 })
    return
  }
  if (password.value !== confirmPassword.value) {
    toast.add({ severity: 'warn', summary: 'No coinciden', detail: 'Las contraseñas no coinciden', life: 3000 })
    return
  }
  loading.value = true
  try {
    await activate(username.value, activationCode.value, password.value)
    toast.add({ severity: 'success', summary: 'Cuenta activada', detail: 'Ya podés ingresar', life: 3000 })
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
  <div class="auth-wrap">
    <div class="auth-left">
      <div class="auth-brand">
        <div class="auth-mark">◆</div>
        <span>Cadena</span>
      </div>

      <form class="auth-form" @submit.prevent="submit">
        <div class="progress-bar">
          <div v-for="n in 3" :key="n" class="progress-step" :class="{ done: n <= 2 }" />
        </div>
        <div class="progress-label">Paso 2 de 3 · Establecer contraseña</div>

        <h1>Activar cuenta</h1>
        <p class="auth-sub">Bienvenido/a, <strong>{{ username }}</strong>. Elegí una contraseña para completar la activación.</p>

        <div class="fld">
          <label for="password">Contraseña</label>
          <input id="password" v-model="password" type="password" autocomplete="new-password" placeholder="mínimo 8 caracteres" required minlength="8" />
        </div>
        <div class="fld">
          <label for="confirm">Confirmar contraseña</label>
          <input id="confirm" v-model="confirmPassword" type="password" autocomplete="new-password" placeholder="repetir contraseña" required />
        </div>

        <div v-if="activationCode" class="code-hint">
          Código de activación: <span class="mono">{{ activationCode }}</span>
        </div>

        <button class="btn-primary auth-btn" type="submit" :disabled="loading">
          <span v-if="loading" class="pi pi-spin pi-spinner" aria-hidden="true" />
          {{ loading ? 'Activando…' : 'Activar cuenta' }}
        </button>

        <div class="auth-switch">
          ¿Ya activaste tu cuenta? <RouterLink to="/login">Ingresar</RouterLink>
        </div>
      </form>

      <footer class="auth-foot">
        <span>© 2026 Cadena</span>
      </footer>
    </div>

    <div class="auth-right">
      <div class="auth-right-content">
        <div class="auth-right-label">Seguridad</div>
        <p class="auth-quote">"Tu contraseña se almacena con hashing seguro. Nunca la enviamos por email ni la conocemos."</p>
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
    </div>
  </div>
</template>

<style scoped>
.auth-wrap {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 420px 1fr;
  font-family: var(--font-sans);
}

.auth-left {
  display: flex;
  flex-direction: column;
  padding: 32px 40px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  min-height: 100vh;
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 15px;
  color: var(--text);
  margin-bottom: 36px;
}

.auth-mark {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: linear-gradient(135deg, #1a1917 0%, #3a3833 100%);
  display: grid;
  place-items: center;
  color: #faf9f6;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.auth-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 340px;
  width: 100%;
}

.progress-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

.progress-step {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: var(--border);
}

.progress-step.done {
  background: var(--text);
}

.progress-label {
  font-size: 11px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 500;
  margin-bottom: 14px;
}

.auth-form h1 {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--text);
  margin: 0 0 6px;
}

.auth-sub {
  font-size: 13.5px;
  color: var(--text-2);
  margin: 0 0 24px;
  line-height: 1.5;
}

.fld {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.fld label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-2);
}

.fld input {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  font-size: 13px;
  font-family: var(--font-sans);
  outline: none;
  transition: border-color 0.12s;
}

.fld input:focus {
  border-color: var(--accent);
}

.code-hint {
  font-size: 12px;
  color: var(--text-3);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 10px;
  margin-bottom: 12px;
}

.code-hint .mono {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--text);
}

.auth-btn {
  width: 100%;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: opacity 0.12s;
  text-decoration: none;
  margin-top: 8px;
}

.btn-primary {
  background: var(--accent);
  color: #fff;
  border: none;
}

.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-primary:not(:disabled):hover { opacity: 0.88; }

.auth-switch {
  margin-top: 18px;
  font-size: 12.5px;
  color: var(--text-2);
  text-align: center;
}

.auth-switch a {
  color: var(--accent-text);
  font-weight: 500;
  text-decoration: none;
}

.auth-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: var(--text-3);
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.auth-right {
  background: linear-gradient(160deg, #1a1917 0%, #2c2a25 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 48px 40px;
  color: #fff;
  min-height: 100vh;
}

.auth-right-label {
  font-size: 11.5px;
  font-weight: 500;
  color: rgba(255,255,255,0.5);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 12px;
}

.auth-quote {
  font-size: 18px;
  font-weight: 400;
  line-height: 1.6;
  color: rgba(255,255,255,0.88);
  max-width: 480px;
  margin: 0;
}

.role-card {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius-lg);
  padding: 18px 20px;
}

.role-card h4 {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.5);
  margin: 0 0 14px;
}

.tip-list { display: flex; flex-direction: column; gap: 10px; }

.tip-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12.5px;
  color: rgba(255,255,255,0.7);
}

.tip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

@media (max-width: 760px) {
  .auth-wrap { grid-template-columns: 1fr; }
  .auth-right { display: none; }
  .auth-left { padding: 24px 20px; }
  .auth-form { max-width: 100%; }
}
</style>
