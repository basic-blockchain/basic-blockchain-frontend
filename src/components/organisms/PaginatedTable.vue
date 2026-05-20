<script setup lang="ts" generic="Row extends object">
import { computed, ref, useSlots, watch } from 'vue'
import BaseTable from '@/components/atoms/BaseTable.vue'

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
  defaultPageSize?: number
  pageSizeOptions?: number[]
  pagerLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  rowKey: undefined,
  rowClass: undefined,
  sortKey: undefined,
  sortDirection: undefined,
  showHead: true,
  defaultPageSize: 10,
  pageSizeOptions: () => [5, 10, 25],
  pagerLabel: 'Filas por página',
})

const emit = defineEmits<{
  sort: [payload: { key: string; direction: SortDirection }]
  'row-click': [payload: { row: Row; index: number; event: MouseEvent }]
}>()

const slots = useSlots()
const currentPage = ref(1)
const pageSize = ref(props.defaultPageSize)
const baseTableProps = computed(() => ({
  rowKey: props.rowKey as any,
  rowClass: props.rowClass,
  sortKey: props.sortKey,
  sortDirection: props.sortDirection,
  showHead: props.showHead,
}))

const totalPages = computed(() => Math.max(1, Math.ceil(props.rows.length / pageSize.value)))
const startIndex = computed(() => (currentPage.value - 1) * pageSize.value)
const endIndex = computed(() => Math.min(currentPage.value * pageSize.value, props.rows.length))
const pagedRows = computed(() => props.rows.slice(startIndex.value, endIndex.value))

watch(
  () => props.rows.length,
  () => {
    if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
    if (currentPage.value < 1) currentPage.value = 1
  }
)

watch(pageSize, () => {
  currentPage.value = 1
})

function setPage(page: number) {
  currentPage.value = Math.max(1, Math.min(page, totalPages.value))
}

function onSort(payload: { key: string; direction: SortDirection }) {
  emit('sort', payload)
}

function onRowClick(payload: { row: Row; index: number; event: MouseEvent }) {
  emit('row-click', payload)
}
</script>

<template>
  <div class="paged-table">
    <BaseTable
      v-bind="baseTableProps"
      :columns="columns"
      :rows="pagedRows"
      @sort="onSort"
      @row-click="onRowClick"
    >
      <template v-for="(_, name) in slots" #[name]="slotProps" :key="name">
        <slot :name="name" v-bind="slotProps" />
      </template>
    </BaseTable>

    <div v-if="rows.length > 0" class="paged-table__footer">
      <span class="paged-table__info">
        Mostrando {{ rows.length === 0 ? 0 : startIndex + 1 }}–{{ endIndex }} de {{ rows.length }}
      </span>
      <div class="paged-table__controls">
        <label class="paged-table__label">
          {{ pagerLabel }}
          <select v-model="pageSize" class="paged-table__select">
            <option v-for="size in pageSizeOptions" :key="size" :value="size">
              {{ size }}
            </option>
          </select>
        </label>
        <button
          class="paged-table__btn"
          :disabled="currentPage <= 1"
          @click="setPage(currentPage - 1)"
        >
          <span class="pi pi-chevron-left" />
        </button>
        <span class="paged-table__page">Página {{ currentPage }} de {{ totalPages }}</span>
        <button
          class="paged-table__btn"
          :disabled="currentPage >= totalPages"
          @click="setPage(currentPage + 1)"
        >
          <span class="pi pi-chevron-right" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.paged-table {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.paged-table__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 0 16px;
}

.paged-table__info,
.paged-table__page {
  font-size: 12px;
  color: var(--text-2);
}

.paged-table__controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.paged-table__label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-2);
}

.paged-table__select {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  padding: 6px 8px;
  font: inherit;
}

.paged-table__btn {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
}

.paged-table__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
