<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'
import { BlockchainApiError } from '@/api/errors'

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
    await router.push('/wallet')
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
  <div class="auth-wrap">
    <div class="auth-left">
      <div class="auth-brand">
        <div class="auth-mark">◆</div>
        <span>Cadena</span>
      </div>

      <form class="auth-form" @submit.prevent="submit">
        <h1>Ingresar</h1>
        <p class="auth-sub">Accedé a tu panel de la plataforma.</p>

        <div class="fld">
          <label for="username">Email o usuario</label>
          <input id="username" v-model="username" type="text" autocomplete="username" placeholder="usuario o email" required />
        </div>
        <div class="fld">
          <label for="password">Contraseña</label>
          <input id="password" v-model="password" type="password" autocomplete="current-password" placeholder="••••••••" required />
        </div>

        <button class="btn-primary auth-btn" type="submit" :disabled="loading">
          <span v-if="loading" class="pi pi-spin pi-spinner" aria-hidden="true" />
          {{ loading ? 'Ingresando…' : 'Continuar' }}
        </button>

        <div class="auth-divider">
          <span class="auth-divider-line" /><span>o</span><span class="auth-divider-line" />
        </div>

        <RouterLink to="/register" class="btn-ghost auth-btn auth-btn-outline">
          Crear una cuenta
        </RouterLink>

        <div class="auth-switch">
          ¿No tenés cuenta? <RouterLink to="/register">Crear una</RouterLink>
        </div>
      </form>

      <footer class="auth-foot">
        <span>© 2026 Cadena</span>
        <span>·</span>
        <a href="#">Términos</a>
        <a href="#">Privacidad</a>
      </footer>
    </div>

    <div class="auth-right">
      <div class="auth-right-content">
        <div class="auth-right-label">Plataforma</div>
        <p class="auth-quote">"Operaciones, cumplimiento y tesorería sobre la misma capa de datos blockchain — sin reconciliaciones manuales."</p>
      </div>

      <div class="role-card">
        <h4>Roles de la plataforma</h4>
        <div class="role-list">
          <div class="role-item">
            <span class="role-dot" style="background:#a78bfa" />
            <div>
              <b>ADMIN</b>
              <span>Gobierno total · tesorería, configuración, eliminación de usuarios</span>
            </div>
          </div>
          <div class="role-item">
            <span class="role-dot" style="background:#67e8f9" />
            <div>
              <b>OPERATOR</b>
              <span>Operativa diaria · KYC, congelar/desbanear, mover fondos según política</span>
            </div>
          </div>
          <div class="role-item">
            <span class="role-dot" style="background:#86efac" />
            <div>
              <b>USER</b>
              <span>Cliente final · wallets, P2P, exchange, envíos y recepción</span>
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

/* ── Left panel ─────────────────────────────────────────────────────────── */
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

/* ── Field ──────────────────────────────────────────────────────────────── */
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

.fld input,
.fld select {
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

.fld input:focus,
.fld select:focus {
  border-color: var(--accent);
}

/* ── Buttons ────────────────────────────────────────────────────────────── */
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
}

.btn-primary {
  background: var(--accent);
  color: #fff;
  border: none;
  margin-top: 8px;
}

.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-primary:not(:disabled):hover { opacity: 0.88; }

.auth-btn-outline {
  background: transparent;
  color: var(--text-2);
  border: 1px solid var(--border);
}
.auth-btn-outline:hover {
  background: var(--hover);
  color: var(--text);
}

/* ── Divider ────────────────────────────────────────────────────────────── */
.auth-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-3);
  font-size: 11.5px;
  margin: 16px 0;
}
.auth-divider-line {
  flex: 1;
  height: 1px;
  background: var(--border);
  display: block;
}

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
.auth-foot a { color: inherit; text-decoration: none; }
.auth-foot a:hover { color: var(--text-2); }

/* ── Right panel ────────────────────────────────────────────────────────── */
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
  color: rgba(255,255,255,0.55);
  margin-top: 1px;
}

/* ── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 760px) {
  .auth-wrap { grid-template-columns: 1fr; }
  .auth-right { display: none; }
  .auth-left { padding: 24px 20px; }
  .auth-form { max-width: 100%; }
}
</style>
