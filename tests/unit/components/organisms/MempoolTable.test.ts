import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MempoolTable from '@/components/organisms/MempoolTable.vue'
import type { Transaction } from '@/domain/transaction'

const txs: Transaction[] = [
  { sender: 'Alice', receiver: 'Bob', amount: 1.5 },
  { sender: 'Carol', receiver: 'Dave', amount: 0.00012345 },
]

describe('MempoolTable', () => {
  it('renders a row for each transaction', () => {
    const wrapper = mount(MempoolTable, { props: { transactions: txs } })
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
  })

  it('formats amount to 4 decimal places', () => {
    const wrapper = mount(MempoolTable, { props: { transactions: txs } })
    const text = wrapper.text()
    expect(text).toContain('1.5000')
    expect(text).toContain('0.0001')
  })

  it('shows sender and receiver names', () => {
    const wrapper = mount(MempoolTable, { props: { transactions: txs } })
    const text = wrapper.text()
    expect(text).toContain('Alice')
    expect(text).toContain('Bob')
  })

  it('shows empty message when no transactions', () => {
    const wrapper = mount(MempoolTable, { props: { transactions: [] } })
    expect(wrapper.text()).toContain('Mempool is empty')
  })
})
