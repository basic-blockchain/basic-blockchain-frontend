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
  if (!username.value) {
    router.push('/register')
  }
})

async function submit() {
  if (password.value.length < 8) {
    toast.add({ severity: 'warn', summary: 'Too short', detail: 'Password must be at least 8 characters', life: 3000 })
    return
  }
  if (password.value !== confirmPassword.value) {
    toast.add({ severity: 'warn', summary: 'Mismatch', detail: 'Passwords do not match', life: 3000 })
    return
  }
  loading.value = true
  try {
    await activate(username.value, activationCode.value, password.value)
    toast.add({ severity: 'success', summary: 'Account activated', detail: 'You can now sign in', life: 3000 })
    await router.push('/login')
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Activation failed',
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
        Set your password
      </h1>
      <p class="auth-subtitle">
        Welcome, <strong>{{ username }}</strong>! Choose a password to complete account activation.
      </p>
      <form
        class="auth-form"
        @submit.prevent="submit"
      >
        <label
          class="field-label"
          for="password"
        >Password</label>
        <input
          id="password"
          v-model="password"
          class="field-input"
          type="password"
          autocomplete="new-password"
          placeholder="at least 8 characters"
          required
          minlength="8"
        >

        <label
          class="field-label"
          for="confirm"
        >Confirm password</label>
        <input
          id="confirm"
          v-model="confirmPassword"
          class="field-input"
          type="password"
          autocomplete="new-password"
          placeholder="repeat password"
          required
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
          <span>{{ loading ? 'Activating…' : 'Activate account' }}</span>
        </button>
      </form>
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
  margin: 0 0 0.5rem;
  color: var(--text-heading);
}
.auth-subtitle { font-size: 0.9rem; color: var(--text-muted); margin: 0 0 1.5rem; }
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
</style>
