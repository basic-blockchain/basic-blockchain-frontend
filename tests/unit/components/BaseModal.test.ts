import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import BaseModal from '@/components/atoms/BaseModal.vue'

interface ModalTestProps {
  open: boolean
  title?: string
  width?: string | number
  dismissable?: boolean
}

function makeMount(
  props: ModalTestProps,
  slots: Record<string, () => unknown> = {},
) {
  return mount(BaseModal, {
    attachTo: document.body,
    props,
    slots: slots as never,
  })
}

describe('BaseModal', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.body.style.overflow = ''
  })

  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('mounts nothing when open=false', () => {
    makeMount({ open: false })
    expect(document.querySelector('.base-modal')).toBeNull()
  })

  it('mounts the Teleport tree when open=true', async () => {
    makeMount({ open: true }, { default: () => 'Body content' })
    await nextTick()
    expect(document.querySelector('.base-modal')).not.toBeNull()
    expect(document.querySelector('.base-modal__scrim')).not.toBeNull()
  })

  it('renders the default slot as the body', async () => {
    makeMount({ open: true }, { default: () => 'Hello body' })
    await nextTick()
    expect(document.querySelector('.base-modal__body')?.textContent).toContain('Hello body')
  })

  it('renders the header slot when provided', async () => {
    makeMount(
      { open: true },
      { header: () => h('div', { class: 'custom-header' }, 'Custom header') },
    )
    await nextTick()
    expect(document.querySelector('.custom-header')?.textContent).toContain('Custom header')
  })

  it('falls back to the built-in header (title + close) when header slot is omitted', async () => {
    makeMount({ open: true, title: 'Greetings' })
    await nextTick()
    expect(document.querySelector('.base-modal__title')?.textContent).toBe('Greetings')
    expect(document.querySelector('.base-modal__close')).not.toBeNull()
  })

  it('omits the built-in header when no title and no header slot', async () => {
    makeMount({ open: true })
    await nextTick()
    expect(document.querySelector('.base-modal__header')).toBeNull()
  })

  it('renders the footer slot when provided', async () => {
    makeMount(
      { open: true },
      { footer: () => h('button', { class: 'foot-btn' }, 'OK') },
    )
    await nextTick()
    expect(document.querySelector('.foot-btn')).not.toBeNull()
  })

  it('emits update:open=false and close on ESC keydown when dismissable', async () => {
    const wrapper = makeMount({ open: true })
    await nextTick()
    const panel = document.querySelector('.base-modal') as HTMLElement
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(wrapper.emitted('update:open')).toEqual([[false]])
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits update:open=false and close on scrim mousedown when dismissable', async () => {
    const wrapper = makeMount({ open: true })
    await nextTick()
    const scrim = document.querySelector('.base-modal__scrim') as HTMLElement
    const evt = new MouseEvent('mousedown', { bubbles: true })
    Object.defineProperty(evt, 'target', { value: scrim, writable: false })
    scrim.dispatchEvent(evt)
    await nextTick()
    expect(wrapper.emitted('update:open')).toEqual([[false]])
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('does NOT emit on scrim mousedown when target is the panel (bubbled click)', async () => {
    const wrapper = makeMount({ open: true })
    await nextTick()
    const scrim = document.querySelector('.base-modal__scrim') as HTMLElement
    const panel = document.querySelector('.base-modal') as HTMLElement
    const evt = new MouseEvent('mousedown', { bubbles: true })
    Object.defineProperty(evt, 'target', { value: panel, writable: false })
    scrim.dispatchEvent(evt)
    await nextTick()
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('does NOT emit on ESC when dismissable=false', async () => {
    const wrapper = makeMount({ open: true, dismissable: false })
    await nextTick()
    const panel = document.querySelector('.base-modal') as HTMLElement
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('does NOT emit on scrim click when dismissable=false', async () => {
    const wrapper = makeMount({ open: true, dismissable: false })
    await nextTick()
    const scrim = document.querySelector('.base-modal__scrim') as HTMLElement
    const evt = new MouseEvent('mousedown', { bubbles: true })
    Object.defineProperty(evt, 'target', { value: scrim, writable: false })
    scrim.dispatchEvent(evt)
    await nextTick()
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('applies body overflow:hidden while open and restores on close', async () => {
    const wrapper = makeMount({ open: false })
    expect(document.body.style.overflow).toBe('')
    await wrapper.setProps({ open: true })
    await flushPromises()
    expect(document.body.style.overflow).toBe('hidden')
    await wrapper.setProps({ open: false })
    await flushPromises()
    expect(document.body.style.overflow).toBe('')
  })

  it('handles sequential open/close pairs without leaking the body scroll lock', async () => {
    const wrapper = makeMount({ open: false })
    for (let i = 0; i < 3; i += 1) {
      await wrapper.setProps({ open: true })
      await flushPromises()
      expect(document.body.style.overflow).toBe('hidden')
      await wrapper.setProps({ open: false })
      await flushPromises()
      expect(document.body.style.overflow).toBe('')
    }
  })

  it('restores focus to the previously-focused element on close', async () => {
    const trigger = document.createElement('button')
    trigger.textContent = 'opener'
    document.body.appendChild(trigger)
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    const wrapper = makeMount({ open: false }, { default: () => h('button', 'inside') })
    await wrapper.setProps({ open: true })
    await flushPromises()
    expect(document.activeElement).not.toBe(trigger)

    await wrapper.setProps({ open: false })
    await flushPromises()
    expect(document.activeElement).toBe(trigger)
  })

  it('emits opened after the open transition fires', async () => {
    const wrapper = makeMount({ open: false })
    await wrapper.setProps({ open: true })
    await flushPromises()
    expect(wrapper.emitted('opened')).toHaveLength(1)
  })

  it('traps Tab focus: Tab at the last focusable wraps to the first', async () => {
    makeMount(
      { open: true },
      {
        default: () =>
          h('div', [
            h('button', { class: 'btn-a' }, 'A'),
            h('button', { class: 'btn-b' }, 'B'),
          ]),
      },
    )
    await flushPromises()
    const a = document.querySelector('.btn-a') as HTMLButtonElement
    const b = document.querySelector('.btn-b') as HTMLButtonElement
    const panel = document.querySelector('.base-modal') as HTMLElement
    b.focus()
    expect(document.activeElement).toBe(b)
    const evt = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    panel.dispatchEvent(evt)
    await nextTick()
    expect(document.activeElement).toBe(a)
  })

  it('traps Tab focus: Shift+Tab at the first focusable wraps to the last', async () => {
    makeMount(
      { open: true },
      {
        default: () =>
          h('div', [
            h('button', { class: 'btn-a' }, 'A'),
            h('button', { class: 'btn-b' }, 'B'),
          ]),
      },
    )
    await flushPromises()
    const a = document.querySelector('.btn-a') as HTMLButtonElement
    const b = document.querySelector('.btn-b') as HTMLButtonElement
    const panel = document.querySelector('.base-modal') as HTMLElement
    a.focus()
    const evt = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })
    panel.dispatchEvent(evt)
    await nextTick()
    expect(document.activeElement).toBe(b)
  })
})
