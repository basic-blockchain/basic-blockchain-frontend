import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseBadge from '@/components/atoms/BaseBadge.vue'

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent'
type Variant = 'soft' | 'outline'

const tones: Tone[] = ['success', 'warning', 'danger', 'info', 'neutral', 'accent']
const variants: Variant[] = ['soft', 'outline']

describe('BaseBadge snapshots', () => {
  for (const tone of tones) {
    for (const variant of variants) {
      it(`renders ${tone} / ${variant}`, () => {
        const wrapper = mount(BaseBadge, {
          props: { tone, variant },
          slots: { default: 'Label' },
        })
        expect(wrapper.html()).toMatchSnapshot()
      })
    }
  }
})
