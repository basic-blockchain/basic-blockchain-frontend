import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import BaseModal from '@/components/atoms/BaseModal.vue'

function makeWrapper(props: Record<string, unknown>, slots: Record<string, unknown> = {}) {
  return mount(BaseModal, {
    props,
    slots,
    global: { stubs: { teleport: true } },
  })
}

describe('BaseModal snapshots', () => {
  it('renders the default centered modal with body only', () => {
    const wrapper = makeWrapper({ open: true }, { default: () => 'Body content' })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders the built-in header when title is provided', () => {
    const wrapper = makeWrapper(
      { open: true, title: 'Are you sure?' },
      { default: () => 'Confirmation body' },
    )
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders with header + footer slots', () => {
    const wrapper = makeWrapper(
      { open: true },
      {
        header: () => h('div', { class: 'custom-header' }, 'Custom header'),
        default: () => 'Body content',
        footer: () => [
          h('button', { class: 'btn-cancel' }, 'Cancel'),
          h('button', { class: 'btn-ok' }, 'OK'),
        ],
      },
    )
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders with custom width (number → px)', () => {
    const wrapper = makeWrapper(
      { open: true, width: 640, title: 'Wide modal' },
      { default: () => 'Body' },
    )
    expect(wrapper.html()).toMatchSnapshot()
  })
})
