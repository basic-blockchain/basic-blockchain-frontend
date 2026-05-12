import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SeedPhraseModal from '@/components/molecules/SeedPhraseModal.vue'

const mnemonic = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu'

describe('SeedPhraseModal', () => {
  it('resets confirmation state when the modal is closed and reopened', async () => {
    const wrapper = mount(SeedPhraseModal, {
      props: {
        mnemonic,
        visible: true,
      },
      global: {
        stubs: {
          teleport: true,
        },
      },
    })

    const checkbox = wrapper.get('input[type="checkbox"]')
    await checkbox.setValue(true)
    expect((wrapper.get('button.btn-confirm').element as HTMLButtonElement).disabled).toBe(false)

    await wrapper.get('button.modal-close').trigger('click')
    await wrapper.setProps({ visible: false })
    await wrapper.setProps({ visible: true })

    expect((wrapper.get('button.btn-confirm').element as HTMLButtonElement).disabled).toBe(true)
  })
})
