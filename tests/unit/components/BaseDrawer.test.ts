import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import BaseDrawer from '@/components/atoms/BaseDrawer.vue'

describe('BaseDrawer', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.body.style.overflow = ''
  })

  it("defaults to anchor='right' and renders the drawer-right variant", async () => {
    mount(BaseDrawer, { attachTo: document.body, props: { open: true } })
    await nextTick()
    const panel = document.querySelector('.base-modal') as HTMLElement
    expect(panel.classList.contains('base-modal--drawer-right')).toBe(true)
  })

  it("renders the drawer-left variant when anchor='left'", async () => {
    mount(BaseDrawer, {
      attachTo: document.body,
      props: { open: true, anchor: 'left' },
    })
    await nextTick()
    const panel = document.querySelector('.base-modal') as HTMLElement
    expect(panel.classList.contains('base-modal--drawer-left')).toBe(true)
  })

  it('defaults width to 720px and accepts numeric overrides', async () => {
    const defaultWrapper = mount(BaseDrawer, {
      attachTo: document.body,
      props: { open: true },
    })
    await nextTick()
    expect((document.querySelector('.base-modal') as HTMLElement).style.width).toBe('720px')
    defaultWrapper.unmount()

    mount(BaseDrawer, {
      attachTo: document.body,
      props: { open: true, width: 480 },
    })
    await nextTick()
    expect((document.querySelector('.base-modal') as HTMLElement).style.width).toBe('480px')
  })

  it('inherits BaseModal dismissal — ESC keydown emits update:open + close', async () => {
    const wrapper = mount(BaseDrawer, {
      attachTo: document.body,
      props: { open: true },
    })
    await flushPromises()
    const panel = document.querySelector('.base-modal') as HTMLElement
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(wrapper.emitted('update:open')).toEqual([[false]])
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
