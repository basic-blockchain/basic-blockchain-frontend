import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, me as apiMe, type MeResponse } from '@/api/auth'

const STORAGE_KEY = 'bb_auth'

interface StoredAuth {
  token: string
  user: AuthUser
}

export interface AuthUser {
  user_id: string
  username: string
  display_name: string
  roles: string[]
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const user = ref<AuthUser | null>(null)

  // ── Persistence ────────────────────────────────────────────────────────────

  function _persist() {
    if (token.value && user.value) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: token.value, user: user.value }))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  function _restore() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as StoredAuth
      token.value = parsed.token
      user.value = parsed.user
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  const isAuthenticated = computed(() => token.value !== null && user.value !== null)

  function hasRole(role: string): boolean {
    return user.value?.roles.includes(role) ?? false
  }

  const isAdmin = computed(() => hasRole('ADMIN'))

  // ── Actions ────────────────────────────────────────────────────────────────

  async function login(username: string, password: string): Promise<void> {
    const resp = await apiLogin(username, password)
    token.value = resp.access_token
    // Persist token before fetching profile so HTTP client has it available.
    _persist()
    const profile = await apiMe()
    _setUser(profile)
    _persist()
  }

  function logout() {
    token.value = null
    user.value = null
    _persist()
  }

  /** Refresh profile from the server (call on app boot if a token is already stored). */
  async function refreshUser(): Promise<void> {
    if (!token.value) return
    try {
      const profile = await apiMe()
      _setUser(profile)
      _persist()
    } catch {
      logout()
    }
  }

  function _setUser(profile: MeResponse) {
    user.value = {
      user_id: profile.user_id,
      username: profile.username,
      display_name: profile.display_name,
      roles: profile.roles,
    }
  }

  // Restore on store creation.
  _restore()

  return { token, user, isAuthenticated, isAdmin, hasRole, login, logout, refreshUser }
})
