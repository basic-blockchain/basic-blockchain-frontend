import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import BaseButton from '@/components/atoms/BaseButton.vue'

describe('BaseButton', () => {
  it('renders the default slot as the label', () => {
    const wrapper = mount(BaseButton, { slots: { default: 'Save' } })
    expect(wrapper.text()).toContain('Save')
  })

  it.each(['primary', 'secondary', 'danger', 'ghost'] as const)(
    'applies the %s variant class',
    (variant) => {
      const wrapper = mount(BaseButton, { props: { variant } })
      expect(wrapper.classes()).toContain(`base-btn--${variant}`)
    },
  )

  it.each(['sm', 'md', 'lg'] as const)('applies the %s size class', (size) => {
    const wrapper = mount(BaseButton, { props: { size } })
    expect(wrapper.classes()).toContain(`base-btn--${size}`)
  })

  it('applies block class when block=true', () => {
    const wrapper = mount(BaseButton, { props: { block: true } })
    expect(wrapper.classes()).toContain('base-btn--block')
  })

  it('applies iconOnly class when iconOnly=true', () => {
    const wrapper = mount(BaseButton, {
      props: { iconOnly: true },
      attrs: { 'aria-label': 'menu' },
    })
    expect(wrapper.classes()).toContain('base-btn--icon-only')
  })

  it('emits native click when clicked', async () => {
    const wrapper = mount(BaseButton)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('does not invoke click handler when disabled=true', async () => {
    const onClick = vi.fn()
    const wrapper = mount(BaseButton, {
      props: { disabled: true },
      attrs: { onClick },
    })
    await wrapper.trigger('click')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('does not invoke click handler when loading=true', async () => {
    const onClick = vi.fn()
    const wrapper = mount(BaseButton, {
      props: { loading: true },
      attrs: { onClick },
    })
    await wrapper.trigger('click')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('sets aria-busy="true" when loading=true', () => {
    const wrapper = mount(BaseButton, { props: { loading: true } })
    expect(wrapper.attributes('aria-busy')).toBe('true')
  })

  it('omits aria-busy when not loading', () => {
    const wrapper = mount(BaseButton)
    expect(wrapper.attributes('aria-busy')).toBeUndefined()
  })

  it('renders the leading slot in idle state', () => {
    const wrapper = mount(BaseButton, {
      slots: { default: 'Save', leading: () => h('i', { class: 'lead-icon' }) },
    })
    expect(wrapper.find('.lead-icon').exists()).toBe(true)
    expect(wrapper.find('.base-btn__spinner').exists()).toBe(false)
  })

  it('replaces the leading slot with a spinner when loading=true', () => {
    const wrapper = mount(BaseButton, {
      props: { loading: true },
      slots: { default: 'Save', leading: () => h('i', { class: 'lead-icon' }) },
    })
    expect(wrapper.find('.lead-icon').exists()).toBe(false)
    expect(wrapper.find('.base-btn__spinner').exists()).toBe(true)
  })

  it('keeps the trailing slot visible when loading=true', () => {
    const wrapper = mount(BaseButton, {
      props: { loading: true },
      slots: { default: 'Save', trailing: () => h('i', { class: 'trail-icon' }) },
    })
    expect(wrapper.find('.trail-icon').exists()).toBe(true)
  })

  it.each(['button', 'submit', 'reset'] as const)('forwards type="%s"', (type) => {
    const wrapper = mount(BaseButton, { props: { type } })
    expect(wrapper.attributes('type')).toBe(type)
  })

  it('forwards arbitrary aria-* attributes via fallthrough', () => {
    const wrapper = mount(BaseButton, {
      attrs: { 'aria-label': 'Close dialog', 'aria-describedby': 'help-text' },
    })
    expect(wrapper.attributes('aria-label')).toBe('Close dialog')
    expect(wrapper.attributes('aria-describedby')).toBe('help-text')
  })

  it('warns in dev when iconOnly=true and no accessible name is provided', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(BaseButton, { props: { iconOnly: true } })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('iconOnly=true requires'))
    warn.mockRestore()
  })

  it('does not warn when iconOnly=true and aria-label is provided', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(BaseButton, { props: { iconOnly: true }, attrs: { 'aria-label': 'menu' } })
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
