import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CreateUserFlow from '@/components/flows/CreateUserFlow.vue'

vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))
vi.mock('@/api/auth', () => ({
  register: vi.fn(),
}))
vi.mock('@/api/admin', () => ({
  grantRole: vi.fn(),
}))

import { register } from '@/api/auth'
import { grantRole } from '@/api/admin'

describe('CreateUserFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('calls register and shows activation code after creation', async () => {
    ;(register as unknown as vi.Mock).mockResolvedValueOnce({
      user_id: 'usr_123',
      username: 'ana.perez',
      activation_code: 'ACT-1234',
    })
    ;(grantRole as unknown as vi.Mock).mockResolvedValueOnce(undefined)

    const wrapper = mount(CreateUserFlow, {
      attachTo: document.body,
      props: { open: true },
      global: {
        stubs: {
          BaseModal: { template: '<div><slot /></div>' },
          BaseButton: { template: '<button><slot /></button>' },
          Stepper: true,
        },
      },
    })

    // Fill step 0
    const inputs = wrapper.findAll('input')
    expect(inputs.length).toBeGreaterThan(1)
    await inputs[0].setValue('Ana')
    // second input is last name
    await inputs[1].setValue('Perez')

    // Continue to step 1 (find by text)
    const btns = wrapper.findAll('button')
    const cont = btns.find((b) => b.text().includes('Continuar'))
    if (cont) await cont.trigger('click')

    await flushPromises()

    // Trigger submit programmatically (stubbed buttons may interfere)
    await (wrapper.vm as any).submit()
    await flushPromises()

    expect(register).toHaveBeenCalled()
    // After successful create, step 2 should render activation code
    expect(document.body.textContent).toContain('ACT-1234')
  })
})
