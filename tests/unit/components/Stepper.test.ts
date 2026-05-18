import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Stepper from '@/components/atoms/Stepper.vue'

const fourSteps = [
  { key: 'a', label: 'Step A' },
  { key: 'b', label: 'Step B' },
  { key: 'c', label: 'Step C' },
  { key: 'd', label: 'Step D' },
]

describe('Stepper', () => {
  it('renders one <li> per step', () => {
    const wrapper = mount(Stepper, { props: { steps: fourSteps, current: 0 } })
    expect(wrapper.findAll('li.stepper__item')).toHaveLength(4)
  })

  it('assigns stepper__item--done to steps before current', () => {
    const wrapper = mount(Stepper, { props: { steps: fourSteps, current: 2 } })
    const items = wrapper.findAll('li.stepper__item')
    expect(items[0].classes()).toContain('stepper__item--done')
    expect(items[1].classes()).toContain('stepper__item--done')
  })

  it('assigns stepper__item--current to the step at current', () => {
    const wrapper = mount(Stepper, { props: { steps: fourSteps, current: 2 } })
    const items = wrapper.findAll('li.stepper__item')
    expect(items[2].classes()).toContain('stepper__item--current')
  })

  it('assigns stepper__item--pending to steps after current', () => {
    const wrapper = mount(Stepper, { props: { steps: fourSteps, current: 2 } })
    const items = wrapper.findAll('li.stepper__item')
    expect(items[3].classes()).toContain('stepper__item--pending')
  })

  it('per-step status override wins over cursor derivation', () => {
    const steps = [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B', status: 'error' as const },
      { key: 'c', label: 'C' },
      { key: 'd', label: 'D' },
    ]
    const wrapper = mount(Stepper, { props: { steps, current: 3 } })
    const items = wrapper.findAll('li.stepper__item')
    // index 1 would derive to "done" (1 < 3), but explicit override wins
    expect(items[1].classes()).toContain('stepper__item--error')
    expect(items[1].classes()).not.toContain('stepper__item--done')
  })

  it('renders ✓ glyph for done, ! for error, index+1 for current and pending', () => {
    const steps = [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
      { key: 'c', label: 'C', status: 'error' as const },
      { key: 'd', label: 'D' },
    ]
    const wrapper = mount(Stepper, { props: { steps, current: 1 } })
    const circles = wrapper.findAll('.stepper__circle').map((c) => c.text())
    expect(circles).toEqual(['✓', '2', '!', '4'])
  })

  it('sets aria-current="step" on the current step only', () => {
    const wrapper = mount(Stepper, { props: { steps: fourSteps, current: 2 } })
    const items = wrapper.findAll('li.stepper__item')
    expect(items[0].attributes('aria-current')).toBeUndefined()
    expect(items[1].attributes('aria-current')).toBeUndefined()
    expect(items[2].attributes('aria-current')).toBe('step')
    expect(items[3].attributes('aria-current')).toBeUndefined()
  })

  it('emits no events (passive indicator)', () => {
    const wrapper = mount(Stepper, { props: { steps: fourSteps, current: 0 } })
    expect(wrapper.emitted()).toEqual({})
  })

  it('renders N-1 connectors for N steps', () => {
    const wrapper = mount(Stepper, { props: { steps: fourSteps, current: 0 } })
    expect(wrapper.findAll('.stepper__line')).toHaveLength(3)
  })

  it('applies stepper__line--done to a connector entering a done step', () => {
    const wrapper = mount(Stepper, { props: { steps: fourSteps, current: 2 } })
    const lines = wrapper.findAll('.stepper__line')
    // line[0] enters index 1 which is "done" (1 < 2)
    expect(lines[0].classes()).toContain('stepper__line--done')
  })

  it('applies stepper__line--pending to a connector entering a pending step', () => {
    const wrapper = mount(Stepper, { props: { steps: fourSteps, current: 1 } })
    const lines = wrapper.findAll('.stepper__line')
    // line[1] enters index 2 which is "pending" (2 > 1)
    expect(lines[1].classes()).toContain('stepper__line--pending')
  })

  it('applies stepper__line--error when entering an error step from done', () => {
    const steps = [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B', status: 'error' as const },
      { key: 'c', label: 'C' },
    ]
    const wrapper = mount(Stepper, { props: { steps, current: 2 } })
    const lines = wrapper.findAll('.stepper__line')
    // line[0] enters index 1 which is error; previous (index 0) is done
    expect(lines[0].classes()).toContain('stepper__line--error')
  })

  it('logs a dev warning when steps array is empty', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(Stepper, { props: { steps: [], current: 0 } })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('empty `steps` array'))
    warn.mockRestore()
  })
})
