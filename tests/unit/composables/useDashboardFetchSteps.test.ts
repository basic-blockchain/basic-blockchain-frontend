import { describe, it, expect } from 'vitest'
import { useDashboardFetchSteps } from '@/composables/useDashboardFetchSteps'

const defs = [
  { key: 'a' as const, label: 'A' },
  { key: 'b' as const, label: 'B' },
  { key: 'c' as const, label: 'C' },
]

describe('useDashboardFetchSteps', () => {
  it("initialises every key to 'pending'", () => {
    const { status, steps, refreshComplete, hasStarted, currentIndex } =
      useDashboardFetchSteps(defs)
    expect(status.a).toBe('pending')
    expect(status.b).toBe('pending')
    expect(status.c).toBe('pending')
    expect(steps.value.map((s) => s.status)).toEqual(['pending', 'pending', 'pending'])
    expect(refreshComplete.value).toBe(false)
    expect(hasStarted.value).toBe(false)
    expect(currentIndex.value).toBe(-1)
  })

  it("flips status to 'current' while in-flight and 'done' on resolve", async () => {
    const { status, run } = useDashboardFetchSteps(defs)
    let resolveFetch!: (v: number) => void
    const fetchPromise = new Promise<number>((resolve) => {
      resolveFetch = resolve
    })
    const runPromise = run('a', () => fetchPromise)
    expect(status.a).toBe('current')
    resolveFetch(42)
    const result = await runPromise
    expect(status.a).toBe('done')
    expect(result).toBe(42)
  })

  it("flips status to 'error' on reject without re-throwing past the wrapper", async () => {
    const { status, run } = useDashboardFetchSteps(defs)
    const result = await run('a', () => Promise.reject(new Error('boom')))
    expect(status.a).toBe('error')
    expect(result).toBeUndefined()
  })

  it('refreshComplete is true only when every key is terminal', async () => {
    const { run, refreshComplete } = useDashboardFetchSteps(defs)
    await run('a', () => Promise.resolve(1))
    expect(refreshComplete.value).toBe(false)
    await run('b', () => Promise.reject(new Error('x')))
    expect(refreshComplete.value).toBe(false)
    await run('c', () => Promise.resolve(3))
    expect(refreshComplete.value).toBe(true)
  })

  it('currentIndex returns the position of the in-flight step', async () => {
    const { run, currentIndex } = useDashboardFetchSteps(defs)
    let resolveFetch!: () => void
    const fetchPromise = new Promise<void>((resolve) => {
      resolveFetch = resolve
    })
    const runPromise = run('b', () => fetchPromise)
    expect(currentIndex.value).toBe(1)
    resolveFetch()
    await runPromise
    expect(currentIndex.value).toBe(-1)
  })

  it('hasStarted flips true on the first run() call', async () => {
    const { run, hasStarted } = useDashboardFetchSteps(defs)
    expect(hasStarted.value).toBe(false)
    await run('a', () => Promise.resolve(1))
    expect(hasStarted.value).toBe(true)
  })

  it("reset() flips every key back to 'pending' and clears hasStarted", async () => {
    const { run, reset, status, hasStarted, refreshComplete } =
      useDashboardFetchSteps(defs)
    await Promise.all([
      run('a', () => Promise.resolve(1)),
      run('b', () => Promise.resolve(2)),
      run('c', () => Promise.resolve(3)),
    ])
    expect(refreshComplete.value).toBe(true)
    expect(hasStarted.value).toBe(true)
    reset()
    expect(status.a).toBe('pending')
    expect(status.b).toBe('pending')
    expect(status.c).toBe('pending')
    expect(hasStarted.value).toBe(false)
    expect(refreshComplete.value).toBe(false)
  })

  it('supports Promise.allSettled orchestration with mixed outcomes', async () => {
    const { run, status, refreshComplete } = useDashboardFetchSteps(defs)
    await Promise.allSettled([
      run('a', () => Promise.resolve('ok')),
      run('b', () => Promise.reject(new Error('fail'))),
      run('c', () => Promise.resolve('ok')),
    ])
    expect(status.a).toBe('done')
    expect(status.b).toBe('error')
    expect(status.c).toBe('done')
    expect(refreshComplete.value).toBe(true)
  })
})
