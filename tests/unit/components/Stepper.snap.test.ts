import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Stepper from '@/components/atoms/Stepper.vue'

const fourSteps = [
  { key: 'a', label: 'Step A' },
  { key: 'b', label: 'Step B' },
  { key: 'c', label: 'Step C' },
  { key: 'd', label: 'Step D' },
]

const fiveSteps = [
  ...fourSteps,
  { key: 'e', label: 'Step E' },
]

describe('Stepper snapshots', () => {
  it('renders 4 steps · current=0 (initial state, nothing done)', () => {
    const wrapper = mount(Stepper, { props: { steps: fourSteps, current: 0 } })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders 4 steps · current=2 (two done, one current, one pending)', () => {
    const wrapper = mount(Stepper, { props: { steps: fourSteps, current: 2 } })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders 4 steps · current=3 (last step active)', () => {
    const wrapper = mount(Stepper, { props: { steps: fourSteps, current: 3 } })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders 5 steps · current=4 (terminal step active, all prior done)', () => {
    const wrapper = mount(Stepper, { props: { steps: fiveSteps, current: 4 } })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders 4 steps · current=2 with current overridden to error', () => {
    const steps = [
      { key: 'a', label: 'Step A' },
      { key: 'b', label: 'Step B' },
      { key: 'c', label: 'Step C', status: 'error' as const },
      { key: 'd', label: 'Step D' },
    ]
    const wrapper = mount(Stepper, { props: { steps, current: 2 } })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders 5 steps · current=1 with step 2 overridden to done (skip-ahead)', () => {
    const steps = [
      { key: 'a', label: 'Step A' },
      { key: 'b', label: 'Step B' },
      { key: 'c', label: 'Step C', status: 'done' as const },
      { key: 'd', label: 'Step D' },
      { key: 'e', label: 'Step E' },
    ]
    const wrapper = mount(Stepper, { props: { steps, current: 1 } })
    expect(wrapper.html()).toMatchSnapshot()
  })
})
