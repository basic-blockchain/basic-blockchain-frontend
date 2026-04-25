import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusBadge from '@/components/atoms/StatusBadge.vue'

describe('StatusBadge', () => {
  it('renders ok status with correct class', () => {
    const wrapper = mount(StatusBadge, { props: { status: 'ok' } })
    expect(wrapper.classes()).toContain('ok')
    expect(wrapper.text()).toContain('ok')
  })

  it('renders degraded status', () => {
    const wrapper = mount(StatusBadge, { props: { status: 'degraded' } })
    expect(wrapper.classes()).toContain('degraded')
  })

  it('renders error status', () => {
    const wrapper = mount(StatusBadge, { props: { status: 'error' } })
    expect(wrapper.classes()).toContain('error')
  })

  it('renders n/a status', () => {
    const wrapper = mount(StatusBadge, { props: { status: 'n/a' } })
    expect(wrapper.classes()).toContain('n/a')
  })
})
