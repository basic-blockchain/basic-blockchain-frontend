export type ApiErrorCode =
  | 'RATE_LIMITED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'BAD_REQUEST'
  | 'UNKNOWN'

export interface ApiError {
  code: ApiErrorCode
  message: string
  retryAfterSeconds?: number
}

export class BlockchainApiError extends Error {
  readonly code: ApiErrorCode
  readonly retryAfterSeconds?: number
  readonly httpStatus?: number

  constructor(error: ApiError, httpStatus?: number) {
    super(error.message)
    this.name = 'BlockchainApiError'
    this.code = error.code
    this.retryAfterSeconds = error.retryAfterSeconds
    this.httpStatus = httpStatus
  }

  get isRateLimited(): boolean {
    return this.code === 'RATE_LIMITED'
  }

  get isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT'
  }
}
