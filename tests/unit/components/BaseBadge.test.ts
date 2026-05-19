import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseBadge from '@/components/atoms/BaseBadge.vue'

describe('BaseBadge', () => {
  it('renders the default slot as the label', () => {
    const wrapper = mount(BaseBadge, { slots: { default: 'Active' } })
    expect(wrapper.text()).toContain('Active')
  })

  it('defaults to tone=neutral and variant=soft when no props are passed', () => {
    const wrapper = mount(BaseBadge)
    expect(wrapper.classes()).toContain('base-bdg--neutral')
    expect(wrapper.classes()).toContain('base-bdg--soft')
  })

  it.each(['success', 'warning', 'danger', 'info', 'neutral', 'accent'] as const)(
    'applies the %s tone class',
    (tone) => {
      const wrapper = mount(BaseBadge, { props: { tone } })
      expect(wrapper.classes()).toContain(`base-bdg--${tone}`)
    },
  )

  it.each(['soft', 'outline'] as const)('applies the %s variant class', (variant) => {
    const wrapper = mount(BaseBadge, { props: { variant } })
    expect(wrapper.classes()).toContain(`base-bdg--${variant}`)
  })

  it('enables the dot by default for variant=soft', () => {
    const wrapper = mount(BaseBadge, { props: { variant: 'soft' } })
    expect(wrapper.classes()).toContain('base-bdg--dot')
  })

  it('disables the dot by default for variant=outline', () => {
    const wrapper = mount(BaseBadge, { props: { variant: 'outline' } })
    expect(wrapper.classes()).not.toContain('base-bdg--dot')
  })

  it('hides the dot when dot=false overrides soft default', () => {
    const wrapper = mount(BaseBadge, { props: { variant: 'soft', dot: false } })
    expect(wrapper.classes()).not.toContain('base-bdg--dot')
  })

  it('shows the dot when dot=true overrides outline default', () => {
    const wrapper = mount(BaseBadge, { props: { variant: 'outline', dot: true } })
    expect(wrapper.classes()).toContain('base-bdg--dot')
  })

  it('forwards fallthrough attributes (role, aria-label, data-testid)', () => {
    const wrapper = mount(BaseBadge, {
      attrs: {
        role: 'status',
        'aria-label': 'KYC pending',
        'data-testid': 'user-status',
      },
    })
    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.attributes('aria-label')).toBe('KYC pending')
    expect(wrapper.attributes('data-testid')).toBe('user-status')
  })
})
