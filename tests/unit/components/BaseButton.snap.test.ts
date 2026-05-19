import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseButton from '@/components/atoms/BaseButton.vue'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'
type State = 'idle' | 'loading' | 'disabled'

const variants: Variant[] = ['primary', 'secondary', 'danger', 'ghost']
const sizes: Size[] = ['sm', 'md', 'lg']
const states: State[] = ['idle', 'loading', 'disabled']

describe('BaseButton snapshots', () => {
  for (const variant of variants) {
    for (const size of sizes) {
      for (const state of states) {
        it(`renders ${variant} / ${size} / ${state}`, () => {
          const wrapper = mount(BaseButton, {
            props: {
              variant,
              size,
              loading: state === 'loading',
              disabled: state === 'disabled',
            },
            slots: { default: 'Label' },
          })
          expect(wrapper.html()).toMatchSnapshot()
        })
      }
    }
  }
})
