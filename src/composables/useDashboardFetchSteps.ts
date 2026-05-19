import { computed, reactive, ref, type ComputedRef } from 'vue'

export type FetchStatus = 'pending' | 'current' | 'done' | 'error'

export interface DashboardFetchStep<Key extends string = string> {
  key: Key
  label: string
  status: FetchStatus
}

interface UseDashboardFetchStepsResult<Key extends string> {
  /** Per-key reactive status map. */
  status: Record<Key, FetchStatus>
  /** `Step[]` shape consumable by `<Stepper>`. */
  steps: ComputedRef<DashboardFetchStep<Key>[]>
  /** Index of the step currently flagged `current`; `-1` when none. */
  currentIndex: ComputedRef<number>
  /** `true` when every key is terminal (`done` or `error`). */
  refreshComplete: ComputedRef<boolean>
  /** Whether ANY refresh has been started this session. */
  hasStarted: ComputedRef<boolean>
  /** Run a fetch, tracking its status. Errors are swallowed at the wrapper boundary so `Promise.allSettled` works upstream. */
  run: <T>(key: Key, fetcher: () => Promise<T>) => Promise<T | undefined>
  /** Flip every key back to `'pending'`. */
  reset: () => void
}

interface StepDefinition<Key extends string> {
  key: Key
  label: string
}

export function useDashboardFetchSteps<Key extends string>(
  definitions: StepDefinition<Key>[],
): UseDashboardFetchStepsResult<Key> {
  const initial = Object.fromEntries(
    definitions.map((d) => [d.key, 'pending'] as const),
  ) as Record<Key, FetchStatus>

  const status = reactive(initial) as Record<Key, FetchStatus>
  const started = ref(false)

  const steps = computed<DashboardFetchStep<Key>[]>(() =>
    definitions.map((d) => ({
      key: d.key,
      label: d.label,
      status: status[d.key],
    })),
  )

  const currentIndex = computed(() =>
    steps.value.findIndex((s) => s.status === 'current'),
  )

  const refreshComplete = computed(() =>
    steps.value.every((s) => s.status === 'done' || s.status === 'error'),
  )

  const hasStarted = computed(() => started.value)

  async function run<T>(key: Key, fetcher: () => Promise<T>): Promise<T | undefined> {
    started.value = true
    status[key] = 'current'
    try {
      const result = await fetcher()
      status[key] = 'done'
      return result
    } catch {
      status[key] = 'error'
      return undefined
    }
  }

  function reset() {
    for (const d of definitions) {
      status[d.key] = 'pending'
    }
    started.value = false
  }

  return {
    status,
    steps,
    currentIndex,
    refreshComplete,
    hasStarted,
    run,
    reset,
  }
}
