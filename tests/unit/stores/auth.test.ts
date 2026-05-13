import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

// Mock API modules
vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  me: vi.fn(),
}))

import { login as mockLogin, me as mockMe } from '@/api/auth'

const MOCK_PROFILE = {
  user_id: 'uid-1',
  username: 'alice',
  display_name: 'Alice',
  roles: ['OPERATOR'],
  banned: false,
  created_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.clearAllMocks()
})

describe('useAuthStore', () => {
  it('starts unauthenticated with no stored token', () => {
    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
  })

  it('login sets token and user, persists to localStorage', async () => {
    vi.mocked(mockLogin).mockResolvedValue({
      access_token: 'tok-abc',
      token_type: 'bearer',
      expires_in: 1800,
    })
    vi.mocked(mockMe).mockResolvedValue(MOCK_PROFILE)

    const auth = useAuthStore()
    await auth.login('alice', 'hunter12345')

    expect(auth.token).toBe('tok-abc')
    expect(auth.user?.username).toBe('alice')
    expect(auth.isAuthenticated).toBe(true)

    const stored = JSON.parse(localStorage.getItem('bb_auth')!)
    expect(stored.token).toBe('tok-abc')
    expect(stored.user.username).toBe('alice')
  })

  it('logout clears state and removes localStorage', async () => {
    vi.mocked(mockLogin).mockResolvedValue({
      access_token: 'tok-abc',
      token_type: 'bearer',
      expires_in: 1800,
    })
    vi.mocked(mockMe).mockResolvedValue(MOCK_PROFILE)

    const auth = useAuthStore()
    await auth.login('alice', 'hunter12345')
    auth.logout()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
    expect(localStorage.getItem('bb_auth')).toBeNull()
  })

  it('hasRole returns true for a role the user has', async () => {
    vi.mocked(mockLogin).mockResolvedValue({
      access_token: 'tok',
      token_type: 'bearer',
      expires_in: 1800,
    })
    vi.mocked(mockMe).mockResolvedValue(MOCK_PROFILE)

    const auth = useAuthStore()
    await auth.login('alice', 'pw')

    expect(auth.hasRole('OPERATOR')).toBe(true)
    expect(auth.hasRole('ADMIN')).toBe(false)
  })

  it('isAdmin is false for OPERATOR', async () => {
    vi.mocked(mockLogin).mockResolvedValue({
      access_token: 'tok',
      token_type: 'bearer',
      expires_in: 1800,
    })
    vi.mocked(mockMe).mockResolvedValue(MOCK_PROFILE)

    const auth = useAuthStore()
    await auth.login('alice', 'pw')

    expect(auth.isAdmin).toBe(false)
  })

  it('isAdmin is true for ADMIN role', async () => {
    vi.mocked(mockLogin).mockResolvedValue({
      access_token: 'tok',
      token_type: 'bearer',
      expires_in: 1800,
    })
    vi.mocked(mockMe).mockResolvedValue({ ...MOCK_PROFILE, roles: ['ADMIN'] })

    const auth = useAuthStore()
    await auth.login('admin', 'pw')

    expect(auth.isAdmin).toBe(true)
  })

  it('restores session from localStorage on store creation', () => {
    localStorage.setItem(
      'bb_auth',
      JSON.stringify({
        token: 'stored-tok',
        user: { user_id: 'uid-2', username: 'bob', display_name: 'Bob', roles: ['VIEWER'] },
      })
    )

    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.token).toBe('stored-tok')
    expect(auth.user?.username).toBe('bob')
  })

  it('ignores malformed localStorage and stays unauthenticated', () => {
    localStorage.setItem('bb_auth', 'not-json{{{')
    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(false)
  })
})
