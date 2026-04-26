import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PrimeVue from 'primevue/config'

vi.mock('@/stores/nodes', () => ({ useNodesStore: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: vi.fn() }))

import { useNodesStore } from '@/stores/nodes'
import { useToast } from '@/composables/useToast'
import NodePanel from '@/components/organisms/NodePanel.vue'

const globalConfig = { plugins: [PrimeVue] }

function buildMocks(peers: string[] = []) {
  const store = {
    peers,
    total: peers.length,
    register: vi.fn().mockResolvedValue(undefined),
    resolve: vi.fn().mockResolvedValue({ replaced: false, message: 'Chain is authoritative' }),
  }
  const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }
  ;(useNodesStore as ReturnType<typeof vi.fn>).mockReturnValue(store)
  ;(useToast as ReturnType<typeof vi.fn>).mockReturnValue(toast)
  return { store, toast }
}

describe('NodePanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('shows empty message when no peers are registered', () => {
    buildMocks([])
    const wrapper = mount(NodePanel, { global: globalConfig })
    expect(wrapper.text()).toContain('No peers registered')
  })

  it('renders a badge for each peer', () => {
    buildMocks(['http://localhost:5001', 'http://localhost:5002'])
    const wrapper = mount(NodePanel, { global: globalConfig })
    expect(wrapper.findAllComponents({ name: 'NodeBadge' })).toHaveLength(2)
  })

  it('shows error toast when URL is invalid on register', async () => {
    const { toast } = buildMocks()
    const wrapper = mount(NodePanel, { global: globalConfig })
    await wrapper.find('input').setValue('not-a-url')
    await wrapper.find('form').trigger('submit')
    await new Promise((r) => setTimeout(r, 0))
    expect(toast.error).toHaveBeenCalledWith('Invalid peer URL', expect.any(String))
  })

  it('calls store.register with trimmed URL on valid submit', async () => {
    const { store } = buildMocks()
    const wrapper = mount(NodePanel, { global: globalConfig })
    await wrapper.find('input').setValue('  http://localhost:5001  ')
    await wrapper.find('form').trigger('submit')
    await new Promise((r) => setTimeout(r, 0))
    expect(store.register).toHaveBeenCalledWith(['http://localhost:5001'])
  })

  it('shows success toast after successful register', async () => {
    const { toast } = buildMocks()
    const wrapper = mount(NodePanel, { global: globalConfig })
    await wrapper.find('input').setValue('http://localhost:5001')
    await wrapper.find('form').trigger('submit')
    await new Promise((r) => setTimeout(r, 0))
    expect(toast.success).toHaveBeenCalledWith('Node registered', 'http://localhost:5001')
  })

  it('calls store.resolve and shows info toast when chain not replaced', async () => {
    const { store, toast } = buildMocks(['http://localhost:5001'])
    const wrapper = mount(NodePanel, { global: globalConfig })
    const resolveBtn = wrapper.findAll('button').find((b) => b.text().includes('Resolve'))!
    await resolveBtn.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(store.resolve).toHaveBeenCalledOnce()
    expect(toast.info).toHaveBeenCalledWith('Consensus resolved', 'Chain is authoritative')
  })

  it('shows success toast when consensus replaces chain', async () => {
    const { store, toast } = buildMocks(['http://localhost:5001'])
    store.resolve.mockResolvedValue({ replaced: true, message: 'Chain was replaced' })
    const wrapper = mount(NodePanel, { global: globalConfig })
    const resolveBtn = wrapper.findAll('button').find((b) => b.text().includes('Resolve'))!
    await resolveBtn.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(toast.success).toHaveBeenCalledWith('Consensus resolved', 'Chain was replaced')
  })

  it('shows error toast with timeout hint on network error during resolve', async () => {
    const { store, toast } = buildMocks(['http://localhost:5001'])
    store.resolve.mockRejectedValue(new Error('timeout'))
    const wrapper = mount(NodePanel, { global: globalConfig })
    const resolveBtn = wrapper.findAll('button').find((b) => b.text().includes('Resolve'))!
    await resolveBtn.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(toast.error).toHaveBeenCalledWith('Consensus failed', expect.stringContaining('unreachable'))
  })
})
