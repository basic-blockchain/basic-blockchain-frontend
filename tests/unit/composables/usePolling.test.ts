import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withSetup } from '../test-utils'

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts inactive and calls fn immediately on start()', async () => {
    const { usePolling } = await import('@/composables/usePolling')
    const fn = vi.fn().mockResolvedValue(undefined)

    const [result] = withSetup(() => usePolling(fn, 1000))

    expect(result.active.value).toBe(false)
    result.start()
    expect(result.active.value).toBe(true)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('calls fn on each interval tick', async () => {
    const { usePolling } = await import('@/composables/usePolling')
    const fn = vi.fn().mockResolvedValue(undefined)

    const [result] = withSetup(() => usePolling(fn, 1000))
    result.start()

    vi.advanceTimersByTime(3000)
    expect(fn).toHaveBeenCalledTimes(4) // 1 immediate + 3 ticks
  })

  it('stop() clears interval and sets active to false', async () => {
    const { usePolling } = await import('@/composables/usePolling')
    const fn = vi.fn().mockResolvedValue(undefined)

    const [result] = withSetup(() => usePolling(fn, 1000))
    result.start()
    result.stop()

    expect(result.active.value).toBe(false)
    fn.mockClear()
    vi.advanceTimersByTime(3000)
    expect(fn).not.toHaveBeenCalled()
  })

  it('start() is idempotent when already active', async () => {
    const { usePolling } = await import('@/composables/usePolling')
    const fn = vi.fn().mockResolvedValue(undefined)

    const [result] = withSetup(() => usePolling(fn, 1000))
    result.start()
    fn.mockClear()
    result.start() // second call must be a no-op
    expect(fn).not.toHaveBeenCalled()
  })

  it('calls stop() on component unmount via onUnmounted', async () => {
    const { usePolling } = await import('@/composables/usePolling')
    const fn = vi.fn().mockResolvedValue(undefined)

    const [result, app] = withSetup(() => usePolling(fn, 1000))
    result.start()
    app.unmount()

    expect(result.active.value).toBe(false)
    fn.mockClear()
    vi.advanceTimersByTime(2000)
    expect(fn).not.toHaveBeenCalled()
  })
})
