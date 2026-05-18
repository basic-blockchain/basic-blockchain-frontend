import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import AuthLayout from '@/components/molecules/AuthLayout.vue'

describe('AuthLayout snapshots', () => {
  it('renders defaults (built-in brand + simple foot, no right-panel)', () => {
    const wrapper = mount(AuthLayout, {
      slots: { default: () => h('form', { class: 'auth-form' }, 'Body') },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders with custom right-panel + custom foot slots', () => {
    const wrapper = mount(AuthLayout, {
      slots: {
        default: () => h('form', { class: 'auth-form' }, 'Body'),
        'right-panel': () =>
          h('div', { class: 'auth-right-content' }, [
            h('div', { class: 'auth-right-label' }, 'Plataforma'),
            h('p', { class: 'auth-quote' }, 'Sample quote'),
          ]),
        foot: () => [
          h('span', '© 2026 Cadena'),
          h('a', { href: '#' }, 'Términos'),
        ],
      },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })
})
