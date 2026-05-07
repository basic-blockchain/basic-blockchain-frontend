import axios, { type AxiosError } from 'axios'
import { BlockchainApiError, type ApiErrorCode } from './errors'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  config.headers['X-Request-ID'] = crypto.randomUUID()

  // Inject JWT if present — read directly from localStorage to avoid a
  // circular dependency with the auth store (which imports this client).
  const raw = localStorage.getItem('bb_auth')
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { token?: string }
      if (parsed.token) {
        config.headers['Authorization'] = `Bearer ${parsed.token}`
      }
    } catch {
      // malformed storage entry — ignore
    }
  }

  return config
})

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; code?: string; retry_after_seconds?: number }>) => {
    if (error.code === 'ECONNABORTED') {
      throw new BlockchainApiError({ code: 'TIMEOUT', message: 'Request timed out' })
    }

    if (!error.response) {
      throw new BlockchainApiError({ code: 'NETWORK_ERROR', message: 'Network unreachable' })
    }

    const { status, data } = error.response
    const serverCode = (data?.code ?? '') as ApiErrorCode

    if (status === 401) {
      localStorage.removeItem('bb_auth')
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      throw new BlockchainApiError(
        { code: 'UNAUTHORIZED', message: data?.error ?? 'Authentication required' },
        status,
      )
    }

    if (status === 403) {
      throw new BlockchainApiError(
        { code: 'FORBIDDEN', message: data?.error ?? 'Forbidden' },
        status,
      )
    }

    if (status === 429) {
      throw new BlockchainApiError(
        {
          code: 'RATE_LIMITED',
          message: data?.error ?? 'Too many requests',
          retryAfterSeconds: data?.retry_after_seconds,
        },
        status,
      )
    }

    const code: ApiErrorCode =
      status === 400 ? 'BAD_REQUEST'
      : status === 404 ? 'NOT_FOUND'
      : status === 405 ? 'METHOD_NOT_ALLOWED'
      : status >= 500 ? 'INTERNAL_ERROR'
      : serverCode || 'UNKNOWN'

    throw new BlockchainApiError(
      { code, message: data?.error ?? error.message },
      status,
    )
  },
)

export default client
