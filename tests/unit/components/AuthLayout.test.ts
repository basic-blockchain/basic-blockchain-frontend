import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import AuthLayout from '@/components/molecules/AuthLayout.vue'

describe('AuthLayout', () => {
  it('renders the default slot inside .auth-left', () => {
    const wrapper = mount(AuthLayout, {
      slots: { default: () => h('form', { class: 'my-form' }, 'Body') },
    })
    expect(wrapper.find('.auth-left .my-form').exists()).toBe(true)
  })

  it('renders the right-panel slot inside .auth-right', () => {
    const wrapper = mount(AuthLayout, {
      slots: { 'right-panel': () => h('div', { class: 'panel-tag' }, 'Panel') },
    })
    expect(wrapper.find('.auth-right .panel-tag').exists()).toBe(true)
  })

  it('renders an empty right-panel when no slot is provided', () => {
    const wrapper = mount(AuthLayout)
    expect(wrapper.find('.auth-right').exists()).toBe(true)
    expect(wrapper.find('.auth-right').text()).toBe('')
  })

  it('renders the default brand (Cadena mark) when no brand slot is provided', () => {
    const wrapper = mount(AuthLayout)
    expect(wrapper.find('.auth-brand').exists()).toBe(true)
    expect(wrapper.find('.auth-brand').text()).toContain('Cadena')
    expect(wrapper.find('.auth-mark').exists()).toBe(true)
  })

  it('renders a custom brand when the brand slot is provided', () => {
    const wrapper = mount(AuthLayout, {
      slots: { brand: () => h('div', { class: 'custom-brand' }, 'BrandX') },
    })
    expect(wrapper.find('.custom-brand').exists()).toBe(true)
    expect(wrapper.find('.auth-brand').exists()).toBe(false)
  })

  it('renders the default foot ("© 2026 Cadena") when no foot slot is provided', () => {
    const wrapper = mount(AuthLayout)
    expect(wrapper.find('.auth-foot').text()).toContain('© 2026 Cadena')
  })

  it('renders a custom foot when the foot slot is provided', () => {
    const wrapper = mount(AuthLayout, {
      slots: {
        foot: () => [
          h('span', '© 2026 Cadena'),
          h('span', '·'),
          h('a', { href: '#', class: 'foot-link' }, 'Términos'),
        ],
      },
    })
    expect(wrapper.find('.auth-foot .foot-link').exists()).toBe(true)
  })
})
