import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import BaseTable from '@/components/atoms/BaseTable.vue'

interface User {
  id: number
  name: string
  balance: number
}

const users: User[] = [
  { id: 1, name: 'Alice', balance: 100 },
  { id: 2, name: 'Bob', balance: 250 },
  { id: 3, name: 'Carol', balance: 42 },
]

const baseColumns = [
  { key: 'name', label: 'Name' },
  { key: 'balance', label: 'Balance' },
]

describe('BaseTable', () => {
  it('renders one <tr> per row in tbody', () => {
    const wrapper = mount(BaseTable, {
      props: { columns: baseColumns, rows: users },
    })
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
  })

  it('renders columns in the declared order', () => {
    const wrapper = mount(BaseTable, {
      props: { columns: baseColumns, rows: users },
    })
    const headers = wrapper.findAll('thead th').map((th) => th.text())
    expect(headers).toEqual(['Name', 'Balance'])
  })

  it('defaults to String(row[key]) when no cell-<key> slot is provided', () => {
    const wrapper = mount(BaseTable, {
      props: { columns: baseColumns, rows: users },
    })
    const firstRowCells = wrapper.findAll('tbody tr:first-child td').map((td) => td.text())
    expect(firstRowCells).toEqual(['Alice', '100'])
  })

  it('uses the cell-<key> slot when provided, with row/value/index/column scope', () => {
    const seen: Array<Record<string, unknown>> = []
    mount(BaseTable, {
      props: { columns: baseColumns, rows: users },
      slots: {
        'cell-name': (scope: Record<string, unknown>) => {
          seen.push(scope)
          return h('span', { class: 'custom-cell' }, `~${(scope.value as string).toUpperCase()}~`)
        },
      },
    })
    expect(seen).toHaveLength(3)
    expect(seen[0].value).toBe('Alice')
    expect(seen[0].index).toBe(0)
    expect((seen[0].row as User).id).toBe(1)
    expect((seen[0].column as { key: string }).key).toBe('name')
  })

  it('applies .base-tbl__cell--num when column.num=true', () => {
    const wrapper = mount(BaseTable, {
      props: {
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'balance', label: 'Balance', num: true },
        ],
        rows: users,
      },
    })
    const balanceCell = wrapper.find('tbody tr:first-child td:nth-child(2)')
    expect(balanceCell.classes()).toContain('base-tbl__cell--num')
    expect(balanceCell.classes()).toContain('base-tbl__cell--align-right')
  })

  it('applies column.align to the cell class', () => {
    const wrapper = mount(BaseTable, {
      props: {
        columns: [
          { key: 'name', label: 'Name', align: 'center' as const },
          { key: 'balance', label: 'Balance' },
        ],
        rows: users,
      },
    })
    const nameCell = wrapper.find('tbody tr:first-child td:first-child')
    expect(nameCell.classes()).toContain('base-tbl__cell--align-center')
  })

  it('renders <colgroup> widths when column.width is provided', () => {
    const wrapper = mount(BaseTable, {
      props: {
        columns: [
          { key: 'name', label: 'Name', width: '120px' },
          { key: 'balance', label: 'Balance', width: 80 },
        ],
        rows: users,
      },
    })
    const cols = wrapper.findAll('colgroup col')
    expect(cols).toHaveLength(2)
    expect(cols[0].attributes('style')).toContain('width: 120px')
    expect(cols[1].attributes('style')).toContain('width: 80px')
  })

  it('omits <thead> when showHead=false', () => {
    const wrapper = mount(BaseTable, {
      props: { columns: baseColumns, rows: users, showHead: false },
    })
    expect(wrapper.find('thead').exists()).toBe(false)
  })

  it('renders the row-actions trailing column ONLY when the slot is provided', () => {
    const without = mount(BaseTable, {
      props: { columns: baseColumns, rows: users },
    })
    expect(without.findAll('tbody tr:first-child td')).toHaveLength(2)

    const withActions = mount(BaseTable, {
      props: { columns: baseColumns, rows: users },
      slots: {
        'row-actions': () => h('button', { class: 'menu-btn' }, '⋯'),
      },
    })
    expect(withActions.findAll('tbody tr:first-child td')).toHaveLength(3)
    expect(withActions.find('tbody tr:first-child .menu-btn').exists()).toBe(true)
  })

  it('renders the empty slot when rows.length === 0; default text when slot is omitted', () => {
    const defaultEmpty = mount(BaseTable, {
      props: { columns: baseColumns, rows: [] },
    })
    expect(defaultEmpty.find('.base-tbl__empty').text()).toContain('No data')

    const customEmpty = mount(BaseTable, {
      props: { columns: baseColumns, rows: [] },
      slots: { empty: () => h('span', 'Nada por acá') },
    })
    expect(customEmpty.find('.base-tbl__empty').text()).toContain('Nada por acá')
  })

  it("emits 'sort' with 'asc' on first click of a sortable header", async () => {
    const wrapper = mount(BaseTable, {
      props: {
        columns: [
          { key: 'name', label: 'Name', sortable: true },
          { key: 'balance', label: 'Balance' },
        ],
        rows: users,
      },
    })
    await wrapper.find('thead th:first-child button').trigger('click')
    expect(wrapper.emitted('sort')).toEqual([[{ key: 'name', direction: 'asc' }]])
  })

  it("emits 'sort' with 'desc' when clicking the currently-asc-sorted header", async () => {
    const wrapper = mount(BaseTable, {
      props: {
        columns: [{ key: 'name', label: 'Name', sortable: true }],
        rows: users,
        sortKey: 'name',
        sortDirection: 'asc' as const,
      },
    })
    await wrapper.find('thead th:first-child button').trigger('click')
    expect(wrapper.emitted('sort')).toEqual([[{ key: 'name', direction: 'desc' }]])
  })

  it("emits 'sort' with 'asc' when clicking the currently-desc-sorted header", async () => {
    const wrapper = mount(BaseTable, {
      props: {
        columns: [{ key: 'name', label: 'Name', sortable: true }],
        rows: users,
        sortKey: 'name',
        sortDirection: 'desc' as const,
      },
    })
    await wrapper.find('thead th:first-child button').trigger('click')
    expect(wrapper.emitted('sort')).toEqual([[{ key: 'name', direction: 'asc' }]])
  })

  it('does NOT emit sort for non-sortable headers', async () => {
    const wrapper = mount(BaseTable, {
      props: { columns: baseColumns, rows: users },
    })
    await wrapper.find('thead th:first-child').trigger('click')
    expect(wrapper.emitted('sort')).toBeUndefined()
  })

  it('sets aria-sort on the sortable header per controlled state', () => {
    const wrapper = mount(BaseTable, {
      props: {
        columns: [
          { key: 'name', label: 'Name', sortable: true },
          { key: 'balance', label: 'Balance', sortable: true },
          { key: 'id', label: 'ID' },
        ],
        rows: users,
        sortKey: 'name',
        sortDirection: 'asc' as const,
      },
    })
    const ths = wrapper.findAll('thead th')
    expect(ths[0].attributes('aria-sort')).toBe('ascending')
    expect(ths[1].attributes('aria-sort')).toBe('none')
    expect(ths[2].attributes('aria-sort')).toBeUndefined()
  })

  it('emits row-click with { row, index, event } on <tr> click', async () => {
    const wrapper = mount(BaseTable, {
      props: { columns: baseColumns, rows: users },
    })
    await wrapper.find('tbody tr:nth-child(2)').trigger('click')
    const emitted = wrapper.emitted('row-click')
    expect(emitted).toHaveLength(1)
    const payload = emitted![0][0] as { row: User; index: number; event: MouseEvent }
    expect(payload.row.name).toBe('Bob')
    expect(payload.index).toBe(1)
    expect(payload.event).toBeInstanceOf(MouseEvent)
  })

  it('applies rowClass output to the <tr> class list', () => {
    const wrapper = mount(BaseTable, {
      props: {
        columns: baseColumns,
        rows: users,
        rowClass: ((row: User) => (row.balance > 100 ? 'is-rich' : 'is-poor')) as unknown as (
          row: object,
        ) => string,
      },
    })
    const trs = wrapper.findAll('tbody tr')
    expect(trs[0].classes()).toContain('is-poor')
    expect(trs[1].classes()).toContain('is-rich')
    expect(trs[2].classes()).toContain('is-poor')
  })

  it('uses rowKey accessor for stable :key when provided as a string', () => {
    const wrapper = mount(BaseTable, {
      props: {
        columns: baseColumns,
        rows: users,
        // VTU widens `Row` to `object` at the call site so the generic
        // `keyof Row & string` resolves to `never`. Runtime behaviour is
        // what the test asserts.
        rowKey: 'id' as unknown as never,
      },
    })
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
  })

  it('uses rowKey accessor for stable :key when provided as a function', () => {
    const wrapper = mount(BaseTable, {
      props: {
        columns: baseColumns,
        rows: users,
        rowKey: ((row: User) => `user-${row.id}`) as unknown as (row: object) => string,
      },
    })
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
  })
})
