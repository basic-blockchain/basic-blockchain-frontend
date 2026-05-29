import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AdminUsersView from '@/views/AdminUsersView.vue'

vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))
vi.mock('@/api/admin', () => ({
  listUsers: vi.fn().mockResolvedValue({ users: [] }),
  listAllWallets: vi.fn().mockResolvedValue({ wallets: [] }),
  listAuditLog: vi.fn().mockResolvedValue({ entries: [] }),
  banUser: vi.fn(),
  unbanUser: vi.fn(),
  softDeleteUser: vi.fn(),
  restoreUser: vi.fn(),
  updateUser: vi.fn(),
  grantRole: vi.fn(),
  revokeRole: vi.fn(),
}))

describe('AdminUsersView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('opens CreateUserFlow modal when clicking + Nuevo usuario', async () => {
    const wrapper = mount(AdminUsersView, { attachTo: document.body })
    await flushPromises()

    const buttons = wrapper.findAll('button')
    const createBtn = buttons.find((b) => b.text().includes('+ Nuevo usuario'))
    expect(createBtn).toBeTruthy()
    if (createBtn) await createBtn.trigger('click')

    await flushPromises()

    // The CreateUserFlow modal teleports to body — check for title
    expect(document.body.textContent).toContain('Crear nuevo usuario')
  })
})
