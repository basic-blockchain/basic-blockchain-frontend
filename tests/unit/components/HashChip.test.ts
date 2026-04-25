import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import HashChip from '@/components/atoms/HashChip.vue'

describe('HashChip', () => {
  it('truncates long hashes', () => {
    const wrapper = mount(HashChip, { props: { hash: '00000abcdefghij1234567890' } })
    expect(wrapper.text()).toMatch(/…/)
  })

  it('shows Genesis for "0"', () => {
    const wrapper = mount(HashChip, { props: { hash: '0' } })
    expect(wrapper.text()).toContain('Genesis')
  })

  it('shows full hash when full=true', () => {
    const hash = '00000abcdefghij1234567890'
    const wrapper = mount(HashChip, { props: { hash, full: true } })
    expect(wrapper.text()).toContain(hash)
  })

  it('copies hash to clipboard on click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    const wrapper = mount(HashChip, { props: { hash: 'abcdef' } })
    await wrapper.trigger('click')
    expect(writeText).toHaveBeenCalledWith('abcdef')
  })
})
