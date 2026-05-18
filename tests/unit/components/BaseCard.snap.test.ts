import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import BaseCard from '@/components/atoms/BaseCard.vue'

describe('BaseCard snapshots', () => {
  it('renders the default variant with body slot only', () => {
    const wrapper = mount(BaseCard, { slots: { default: 'Card body' } })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders the default variant with header + body + footer', () => {
    const wrapper = mount(BaseCard, {
      slots: {
        header: () => h('span', 'Header'),
        default: 'Card body',
        footer: () => h('button', 'OK'),
      },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it("renders the default variant with padding='sm'", () => {
    const wrapper = mount(BaseCard, {
      props: { padding: 'sm' },
      slots: { default: 'Compact body' },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it("renders the default variant with padding='none'", () => {
    const wrapper = mount(BaseCard, {
      props: { padding: 'none' },
      slots: { default: 'Flush body' },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders the bigstat variant with all three slots (label / value / sub)', () => {
    const wrapper = mount(BaseCard, {
      props: { variant: 'bigstat' },
      slots: {
        header: () => h('span', 'En cola'),
        default: '23',
        footer: () => h('span', '4 prioritarias'),
      },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders the bigstat variant with value only (no label, no sub)', () => {
    const wrapper = mount(BaseCard, {
      props: { variant: 'bigstat' },
      slots: { default: '42' },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })
})
