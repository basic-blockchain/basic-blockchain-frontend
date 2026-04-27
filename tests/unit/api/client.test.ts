import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('axios', () => {
  const use = vi.fn()
  const interceptors = { request: { use }, response: { use: vi.fn() } }
  return { default: { create: vi.fn(() => ({ interceptors })) } }
})

describe('API client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('creates axios instance with baseURL /api/v1', async () => {
    const axios = (await import('axios')).default
    await import('@/api/client')
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: expect.stringMatching(/\/api\/v1/) }),
    )
  })

  it('creates axios instance with timeout 10_000', async () => {
    const axios = (await import('axios')).default
    await import('@/api/client')
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 10_000 }),
    )
  })

  it('registers exactly one request interceptor', async () => {
    const axios = (await import('axios')).default
    await import('@/api/client')
    const instance = (axios.create as ReturnType<typeof vi.fn>).mock.results[0].value as {
      interceptors: { request: { use: ReturnType<typeof vi.fn> } }
    }
    expect(instance.interceptors.request.use).toHaveBeenCalledOnce()
  })

  it('interceptor injects X-Request-ID as a valid UUID v4', async () => {
    const axios = (await import('axios')).default
    await import('@/api/client')
    const instance = (axios.create as ReturnType<typeof vi.fn>).mock.results[0].value as {
      interceptors: { request: { use: ReturnType<typeof vi.fn> } }
    }
    const interceptorFn = instance.interceptors.request.use.mock.calls[0][0] as (
      config: { headers: Record<string, string> },
    ) => { headers: Record<string, string> }

    const config = { headers: {} as Record<string, string> }
    const result = interceptorFn(config)
    expect(result.headers['X-Request-ID']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })
})
