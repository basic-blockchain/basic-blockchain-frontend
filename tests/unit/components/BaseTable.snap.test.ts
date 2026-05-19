import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import BaseTable from '@/components/atoms/BaseTable.vue'

interface Row {
  id: number
  name: string
  amount: number
}

const rows: Row[] = [
  { id: 1, name: 'Alice', amount: 100 },
  { id: 2, name: 'Bob', amount: 250 },
  { id: 3, name: 'Carol', amount: 42 },
]

const baseColumns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'amount', label: 'Amount' },
]

describe('BaseTable snapshots', () => {
  it('renders a plain table with 3 columns × 3 rows', () => {
    const wrapper = mount(BaseTable, {
      props: { columns: baseColumns, rows },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders the trailing actions column when row-actions slot is provided', () => {
    const wrapper = mount(BaseTable, {
      props: { columns: baseColumns, rows },
      slots: { 'row-actions': () => h('button', { class: 'menu-btn' }, '⋯') },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('uses the cell-<key> slot when provided', () => {
    const wrapper = mount(BaseTable, {
      props: { columns: baseColumns, rows },
      slots: {
        'cell-amount': (scope: Record<string, unknown>) =>
          h('span', { class: 'amt' }, `$${scope.value as number}.00`),
      },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders num + width columns via colgroup', () => {
    const wrapper = mount(BaseTable, {
      props: {
        columns: [
          { key: 'id', label: 'ID', width: 60 },
          { key: 'name', label: 'Name', width: '180px' },
          { key: 'amount', label: 'Amount', num: true, width: 100 },
        ],
        rows,
      },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('omits thead when showHead=false', () => {
    const wrapper = mount(BaseTable, {
      props: { columns: baseColumns, rows, showHead: false },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders the empty state with default text when rows is empty', () => {
    const wrapper = mount(BaseTable, {
      props: { columns: baseColumns, rows: [] },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })
})
