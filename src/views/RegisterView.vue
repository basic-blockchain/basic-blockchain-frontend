<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '@/api/auth'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const toast = useToast()

const username = ref('')
const displayName = ref('')
const loading = ref(false)

async function submit() {
  if (!username.value.trim()) return
  loading.value = true
  try {
    const resp = await register(username.value.trim(), displayName.value.trim() || username.value.trim())
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
  <div class="auth-wrap">
    <div class="auth-left">
      <div class="auth-brand">
        <div class="auth-mark">◆</div>
        <span>Cadena</span>
      </div>

      <form class="auth-form" @submit.prevent="submit">
        <div class="progress-bar">
          <div v-for="n in 3" :key="n" class="progress-step" :class="{ done: n <= 1 }" />
        </div>
        <div class="progress-label">Paso 1 de 3 · Datos de acceso</div>

        <h1>Crear cuenta</h1>
        <p class="auth-sub">Elegí un nombre de usuario para acceder a la plataforma.</p>

        <div class="fld">
          <label for="username">Usuario</label>
          <input id="username" v-model="username" type="text" autocomplete="username" placeholder="alice" required />
        </div>
        <div class="fld">
          <label for="display-name">Nombre para mostrar <span class="opt">(opcional)</span></label>
          <input id="display-name" v-model="displayName" type="text" autocomplete="name" placeholder="Alice Smith" />
        </div>

        <button class="btn-primary auth-btn" type="submit" :disabled="loading">
          <span v-if="loading" class="pi pi-spin pi-spinner" aria-hidden="true" />
          {{ loading ? 'Registrando…' : 'Continuar' }}
        </button>

        <div class="auth-switch">
          ¿Ya tenés cuenta? <RouterLink to="/login">Ingresar</RouterLink>
        </div>
      </form>

      <footer class="auth-foot">
        <span>© 2026 Cadena</span>
      </footer>
    </div>

    <div class="auth-right">
      <div class="auth-right-content">
        <div class="auth-right-label">Onboarding</div>
        <p class="auth-quote">"Verificación progresiva. Empezás operando en minutos, subís de nivel cuando te conviene."</p>
      </div>

      <div class="role-card">
        <h4>Lo que sigue</h4>
        <div class="role-list">
          <div class="role-item">
            <span class="step-num">2</span>
            <div>
              <b>Activar cuenta</b>
              <span>Establecé tu contraseña con el código de activación</span>
            </div>
          </div>
          <div class="role-item">
            <span class="step-num">3</span>
            <div>
              <b>Primera wallet</b>
              <span>Tu wallet NATIVE se crea automáticamente</span>
            </div>
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

.opt {
  font-weight: 400;
  color: var(--text-3);
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

.role-list { display: flex; flex-direction: column; gap: 12px; }

.role-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.step-num {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255,255,255,0.12);
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
  margin-top: 2px;
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
  color: rgba(255,255,255,0.55);
  margin-top: 1px;
}

@media (max-width: 760px) {
  .auth-wrap { grid-template-columns: 1fr; }
  .auth-right { display: none; }
  .auth-left { padding: 24px 20px; }
  .auth-form { max-width: 100%; }
}
</style>
