import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import BaseCard from '@/components/atoms/BaseCard.vue'

describe('BaseCard', () => {
  it('renders the default slot as the body', () => {
    const wrapper = mount(BaseCard, { slots: { default: 'Card body' } })
    expect(wrapper.find('.base-card__body').text()).toContain('Card body')
  })

  it("defaults to variant='default' and padding='default'", () => {
    const wrapper = mount(BaseCard)
    expect(wrapper.classes()).toContain('base-card--default')
    expect(wrapper.classes()).toContain('base-card--pad-default')
  })

  it("applies variant='bigstat' class", () => {
    const wrapper = mount(BaseCard, { props: { variant: 'bigstat' } })
    expect(wrapper.classes()).toContain('base-card--bigstat')
  })

  it.each(['default', 'none', 'sm'] as const)(
    "applies padding='%s' class",
    (padding) => {
      const wrapper = mount(BaseCard, { props: { padding } })
      expect(wrapper.classes()).toContain(`base-card--pad-${padding}`)
    },
  )

  it('renders the header slot when provided', () => {
    const wrapper = mount(BaseCard, {
      slots: { header: () => h('span', { class: 'hdr' }, 'Header text') },
    })
    expect(wrapper.find('.base-card__header').exists()).toBe(true)
    expect(wrapper.find('.hdr').text()).toBe('Header text')
  })

  it('omits the header wrapper when no header slot is provided', () => {
    const wrapper = mount(BaseCard, { slots: { default: 'Body' } })
    expect(wrapper.find('.base-card__header').exists()).toBe(false)
  })

  it('renders the footer slot when provided', () => {
    const wrapper = mount(BaseCard, {
      slots: { footer: () => h('button', { class: 'foot-btn' }, 'OK') },
    })
    expect(wrapper.find('.base-card__footer').exists()).toBe(true)
    expect(wrapper.find('.foot-btn').exists()).toBe(true)
  })

  it('omits the footer wrapper when no footer slot is provided', () => {
    const wrapper = mount(BaseCard, { slots: { default: 'Body' } })
    expect(wrapper.find('.base-card__footer').exists()).toBe(false)
  })

  it("logs a dev warning when variant='bigstat' is combined with non-default padding", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(BaseCard, { props: { variant: 'bigstat', padding: 'sm' } })
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("variant='bigstat' ignores padding='sm'"),
    )
    warn.mockRestore()
  })

  it("does not warn when variant='bigstat' is paired with the default padding", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(BaseCard, { props: { variant: 'bigstat' } })
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('forwards fallthrough attributes (role, aria-labelledby, data-testid)', () => {
    const wrapper = mount(BaseCard, {
      attrs: {
        role: 'region',
        'aria-labelledby': 'card-title',
        'data-testid': 'dashboard-card',
      },
    })
    expect(wrapper.attributes('role')).toBe('region')
    expect(wrapper.attributes('aria-labelledby')).toBe('card-title')
    expect(wrapper.attributes('data-testid')).toBe('dashboard-card')
  })
})
