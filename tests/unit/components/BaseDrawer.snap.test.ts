import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseDrawer from '@/components/atoms/BaseDrawer.vue'

interface DrawerTestProps {
  open: boolean
  title?: string
  width?: string | number
  dismissable?: boolean
  anchor?: 'right' | 'left'
}

function makeWrapper(props: DrawerTestProps) {
  return mount(BaseDrawer, {
    props,
    slots: { default: () => 'Drawer body' },
    global: { stubs: { teleport: true } },
  })
}

describe('BaseDrawer snapshots', () => {
  it("renders the default right-anchored drawer at 720px", () => {
    const wrapper = makeWrapper({ open: true })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it("renders the left-anchored drawer", () => {
    const wrapper = makeWrapper({ open: true, anchor: 'left' })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders with a custom width', () => {
    const wrapper = makeWrapper({ open: true, width: '480px' })
    expect(wrapper.html()).toMatchSnapshot()
  })
})
