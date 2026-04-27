import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import client from '@/api/client'
import { BlockchainApiError } from '@/api/errors'

const mock = new MockAdapter(client)

beforeEach(() => mock.reset())

describe('Axios response interceptor', () => {
  it('passes through 2xx responses unchanged', async () => {
    mock.onGet('/chain').reply(200, { chain: [], length: 0 })
    const res = await client.get('/chain')
    expect(res.status).toBe(200)
    expect(res.data.length).toBe(0)
  })

  it('throws BlockchainApiError with RATE_LIMITED on 429', async () => {
    mock.onPost('/mine_block').reply(429, {
      error: 'Too many requests — mining rate limit exceeded',
      code: 'RATE_LIMITED',
      retry_after_seconds: 42,
    })

    await expect(client.post('/mine_block')).rejects.toSatisfy((e: unknown) => {
      const err = e as BlockchainApiError
      return (
        err instanceof BlockchainApiError &&
        err.isRateLimited &&
        err.code === 'RATE_LIMITED' &&
        err.retryAfterSeconds === 42 &&
        err.httpStatus === 429
      )
    })
  })

  it('throws BlockchainApiError with BAD_REQUEST on 400', async () => {
    mock.onPost('/transactions').reply(400, {
      error: "Missing required fields: receiver",
      code: 'VALIDATION_ERROR',
    })

    await expect(client.post('/transactions', {})).rejects.toSatisfy((e: unknown) => {
      const err = e as BlockchainApiError
      return err instanceof BlockchainApiError && err.code === 'BAD_REQUEST' && err.httpStatus === 400
    })
  })

  it('throws BlockchainApiError with INTERNAL_ERROR on 500', async () => {
    mock.onGet('/chain').reply(500, { error: 'Internal server error', code: 'INTERNAL_ERROR' })

    await expect(client.get('/chain')).rejects.toSatisfy((e: unknown) => {
      const err = e as BlockchainApiError
      return err instanceof BlockchainApiError && err.code === 'INTERNAL_ERROR' && err.httpStatus === 500
    })
  })

  it('throws BlockchainApiError with NOT_FOUND on 404', async () => {
    mock.onGet('/nope').reply(404, { error: 'Resource not found', code: 'NOT_FOUND' })

    await expect(client.get('/nope')).rejects.toSatisfy((e: unknown) => {
      const err = e as BlockchainApiError
      return err instanceof BlockchainApiError && err.code === 'NOT_FOUND' && err.httpStatus === 404
    })
  })

  it('throws BlockchainApiError with NETWORK_ERROR when no response', async () => {
    mock.onGet('/chain').networkError()

    await expect(client.get('/chain')).rejects.toSatisfy((e: unknown) => {
      const err = e as BlockchainApiError
      return err instanceof BlockchainApiError && err.isNetworkError && err.code === 'NETWORK_ERROR'
    })
  })

  it('throws BlockchainApiError with TIMEOUT on request timeout', async () => {
    mock.onGet('/chain').timeout()

    await expect(client.get('/chain')).rejects.toSatisfy((e: unknown) => {
      const err = e as BlockchainApiError
      return err instanceof BlockchainApiError && err.code === 'TIMEOUT' && err.isNetworkError
    })
  })

  it('attaches X-Request-ID header to every request', async () => {
    let capturedHeader: string | undefined

    mock.onGet('/chain').reply((config) => {
      capturedHeader = config.headers?.['X-Request-ID'] as string
      return [200, { chain: [], length: 0 }]
    })

    await client.get('/chain')
    expect(capturedHeader).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })
})
