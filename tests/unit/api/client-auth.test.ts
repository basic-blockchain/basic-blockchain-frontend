import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import client from '@/api/client'
import { BlockchainApiError } from '@/api/errors'

const mock = new MockAdapter(client)

beforeEach(() => {
  mock.reset()
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('client.ts — auth interceptors', () => {
  it('injects Authorization header when bb_auth token exists', async () => {
    localStorage.setItem('bb_auth', JSON.stringify({ token: 'test-jwt' }))
    mock.onGet('/auth/me').reply((config) => {
      if (config.headers?.['Authorization'] === 'Bearer test-jwt') {
        return [200, { user_id: 'u1' }]
      }
      return [401, {}]
    })

    const resp = await client.get('/auth/me')
    expect(resp.status).toBe(200)
  })

  it('does not inject Authorization when no token stored', async () => {
    mock.onGet('/chain').reply((config) => {
      return [200, { noAuth: config.headers?.['Authorization'] === undefined }]
    })
    const resp = await client.get('/chain')
    expect(resp.data.noAuth).toBe(true)
  })

  it('throws UNAUTHORIZED on 401 and removes bb_auth from localStorage', async () => {
    localStorage.setItem('bb_auth', JSON.stringify({ token: 'expired-jwt' }))
    mock.onGet('/auth/me').reply(401, { error: 'Token expired', code: 'TOKEN_EXPIRED' })

    await expect(client.get('/auth/me')).rejects.toSatisfy((e: unknown) => {
      const err = e as BlockchainApiError
      return err instanceof BlockchainApiError && err.code === 'UNAUTHORIZED' && err.httpStatus === 401
    })

    expect(localStorage.getItem('bb_auth')).toBeNull()
  })

  it('throws FORBIDDEN on 403 without clearing localStorage', async () => {
    localStorage.setItem('bb_auth', JSON.stringify({ token: 'valid-jwt' }))
    mock.onPost('/admin/mint').reply(403, { error: 'Forbidden', code: 'FORBIDDEN' })

    await expect(client.post('/admin/mint', {})).rejects.toSatisfy((e: unknown) => {
      const err = e as BlockchainApiError
      return err instanceof BlockchainApiError && err.code === 'FORBIDDEN' && err.httpStatus === 403
    })

    // Token should still be there — 403 means authenticated but unauthorised.
    expect(localStorage.getItem('bb_auth')).not.toBeNull()
  })
})
