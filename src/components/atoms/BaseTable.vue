<script setup lang="ts" generic="Row extends object">
import { computed, useSlots } from 'vue'

type Align = 'left' | 'center' | 'right'
type SortDirection = 'asc' | 'desc'

interface Column<R extends object> {
  key: (keyof R & string) | string
  label: string
  width?: string | number
  align?: Align
  sortable?: boolean
  num?: boolean
}

interface Props {
  columns: Column<Row>[]
  rows: Row[]
  rowKey?: (keyof Row & string) | ((row: Row) => string | number)
  rowClass?: (row: Row, index: number) => string | string[] | undefined
  sortKey?: string
  sortDirection?: SortDirection
  showHead?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  rowKey: undefined,
  rowClass: undefined,
  sortKey: undefined,
  sortDirection: undefined,
  showHead: true,
})

const emit = defineEmits<{
  sort: [payload: { key: string; direction: SortDirection }]
  'row-click': [payload: { row: Row; index: number; event: MouseEvent }]
}>()

const slots = useSlots()
const hasRowActions = computed(() => !!slots['row-actions'])
const hasWidths = computed(() => props.columns.some((c) => c.width !== undefined))
const totalCols = computed(() => props.columns.length + (hasRowActions.value ? 1 : 0))

function colStyle(col: Column<Row>): Record<string, string> | undefined {
  if (col.width === undefined) return undefined
  const w = typeof col.width === 'number' ? `${col.width}px` : col.width
  return { width: w }
}

function resolveAlign(col: Column<Row>): Align {
  if (col.align) return col.align
  return col.num ? 'right' : 'left'
}

function headClasses(col: Column<Row>): string[] {
  return [
    'base-tbl__head-cell',
    `base-tbl__cell--align-${resolveAlign(col)}`,
    col.num ? 'base-tbl__cell--num' : '',
  ].filter(Boolean)
}

function cellClasses(col: Column<Row>): string[] {
  return [
    `base-tbl__cell--align-${resolveAlign(col)}`,
    col.num ? 'base-tbl__cell--num' : '',
  ].filter(Boolean)
}

function ariaSort(key: string): 'ascending' | 'descending' | 'none' {
  if (props.sortKey !== key) return 'none'
  return props.sortDirection === 'asc' ? 'ascending' : 'descending'
}

function sortIcon(key: string): string {
  if (props.sortKey !== key) return '↕'
  return props.sortDirection === 'asc' ? '↑' : '↓'
}

function handleSort(key: string) {
  if (props.sortKey === key && props.sortDirection === 'asc') {
    emit('sort', { key, direction: 'desc' })
  } else {
    emit('sort', { key, direction: 'asc' })
  }
}

function handleRowClick(row: Row, index: number, event: MouseEvent) {
  emit('row-click', { row, index, event })
}

function resolveKey(row: Row, index: number): string | number {
  if (props.rowKey === undefined) return index
  if (typeof props.rowKey === 'function') return props.rowKey(row)
  return row[props.rowKey] as unknown as string | number
}

function resolveRowClass(row: Row, index: number): string | string[] | undefined {
  return props.rowClass?.(row, index)
}

function getCellValue(row: Row, key: string): unknown {
  return (row as Record<string, unknown>)[key]
}

function formatDefault(row: Row, key: string): string {
  const v = getCellValue(row, key)
  if (v === undefined || v === null) return ''
  return String(v)
}
</script>

<template>
  <table class="base-tbl">
    <colgroup v-if="hasWidths">
      <col
        v-for="(col, i) in columns"
        :key="`col-${i}`"
        :style="colStyle(col)"
      >
      <col
        v-if="hasRowActions"
        style="width: 32px"
      >
    </colgroup>
    <thead
      v-if="showHead"
      class="base-tbl__head"
    >
      <tr>
        <th
          v-for="col in columns"
          :key="col.key"
          :class="headClasses(col)"
          :aria-sort="col.sortable ? ariaSort(col.key) : undefined"
        >
          <button
            v-if="col.sortable"
            type="button"
            class="base-tbl__sort-btn"
            @click="handleSort(col.key)"
          >
            <span>{{ col.label }}</span>
            <span
              class="base-tbl__sort-icon"
              aria-hidden="true"
            >{{ sortIcon(col.key) }}</span>
          </button>
          <template v-else>
            {{ col.label }}
          </template>
        </th>
        <th
          v-if="hasRowActions"
          class="base-tbl__cell--actions"
        />
      </tr>
    </thead>
    <tbody class="base-tbl__body">
      <template v-if="rows.length > 0">
        <tr
          v-for="(row, index) in rows"
          :key="resolveKey(row, index)"
          :class="resolveRowClass(row, index)"
          @click="handleRowClick(row, index, $event)"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            :class="cellClasses(col)"
          >
            <slot
              :name="`cell-${col.key}`"
              :row="row"
              :index="index"
              :column="col"
              :value="getCellValue(row, col.key)"
            >
              {{ formatDefault(row, col.key) }}
            </slot>
          </td>
          <td
            v-if="hasRowActions"
            class="base-tbl__cell--actions"
          >
            <slot
              name="row-actions"
              :row="row"
              :index="index"
            />
          </td>
        </tr>
      </template>
      <tr v-else>
        <td
          :colspan="totalCols"
          class="base-tbl__empty"
        >
          <slot name="empty">
            No data
          </slot>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.base-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.base-tbl__head th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  padding: 8px var(--space-md);
  font: 500 11.5px/1 var(--font-sans);
  color: var(--text-2);
  white-space: nowrap;
  user-select: none;
}

.base-tbl__head th[aria-sort='ascending'],
.base-tbl__head th[aria-sort='descending'] {
  color: var(--text);
}

.base-tbl__sort-btn {
  appearance: none;
  background: transparent;
  border: 0;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color var(--duration-fast) var(--ease-out);
}

.base-tbl__sort-btn:hover {
  color: var(--text);
}

.base-tbl__sort-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

.base-tbl__sort-icon {
  font-size: 9px;
  opacity: 0.6;
}

.base-tbl__body td {
  padding: 0 var(--space-md);
  height: var(--row-h);
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.base-tbl__body tr:last-child td {
  border-bottom: 0;
}

.base-tbl__body tr {
  transition: background var(--duration-fast) var(--ease-out);
}

.base-tbl__body tr:hover {
  background: var(--hover);
}

.base-tbl__cell--align-left {
  text-align: left;
}
.base-tbl__cell--align-center {
  text-align: center;
}
.base-tbl__cell--align-right {
  text-align: right;
}

.base-tbl__cell--num {
  font-variant-numeric: tabular-nums;
  font-family: var(--font-mono);
}

.base-tbl__cell--actions {
  width: 32px;
  text-align: right;
}

.base-tbl__empty {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-3);
  font-size: 13px;
}
</style>
