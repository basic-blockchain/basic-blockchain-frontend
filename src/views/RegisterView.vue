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
      summary: 'Registration failed',
      detail: e instanceof Error ? e.message : 'Unexpected error',
      life: 4000,
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-logo">
        <span
          class="pi pi-bitcoin"
          aria-hidden="true"
        />
        <span>Blockchain</span>
      </div>
      <h1 class="auth-title">
        Create account
      </h1>
      <form
        class="auth-form"
        @submit.prevent="submit"
      >
        <label
          class="field-label"
          for="username"
        >Username</label>
        <input
          id="username"
          v-model="username"
          class="field-input"
          type="text"
          autocomplete="username"
          placeholder="alice"
          required
        >

        <label
          class="field-label"
          for="display-name"
        >Display name (optional)</label>
        <input
          id="display-name"
          v-model="displayName"
          class="field-input"
          type="text"
          autocomplete="name"
          placeholder="Alice Smith"
        >

        <button
          class="btn-primary"
          type="submit"
          :disabled="loading"
        >
          <span
            v-if="loading"
            class="pi pi-spin pi-spinner"
            aria-hidden="true"
          />
          <span>{{ loading ? 'Registering…' : 'Register' }}</span>
        </button>
      </form>
      <p class="auth-footer">
        Already have an account?
        <RouterLink to="/login">
          Sign in
        </RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
}
.auth-card {
  width: 100%;
  max-width: 380px;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: var(--shadow-soft);
}
.auth-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 1.5rem;
  color: var(--text-heading);
}
.auth-logo .pi { font-size: 1.4rem; color: var(--primary-color); }
.auth-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 1.5rem;
  color: var(--text-heading);
}
.auth-form { display: flex; flex-direction: column; gap: 0.5rem; }
.field-label { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
.field-input {
  padding: 0.6rem 0.85rem;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-ground);
  color: var(--text-body);
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
  outline: none;
  transition: border-color 0.15s;
}
.field-input:focus { border-color: var(--primary-color); }
.btn-primary {
  margin-top: 0.5rem;
  padding: 0.7rem;
  background: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: opacity 0.15s;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.auth-footer { margin-top: 1.2rem; font-size: 0.88rem; color: var(--text-muted); text-align: center; }
.auth-footer a { color: var(--primary-color); text-decoration: none; font-weight: 600; }
</style>
