import client from './client'

export interface PlatformStats {
  users: {
    total: number
    active: number
    banned: number
    deleted: number
  }
  wallets: {
    total: number
    user_wallets: number
    frozen: number
    frozen_user_wallets: number
  }
  balances: Record<string, string>
  /** Present only when `getPlatformStats({ compare })` is called. */
  compare?: PlatformStatsCompare
}

/** Phase 6e — `{current, previous, delta_abs, delta_pct}` envelope.
 * `delta_pct` is `null` when the previous-period value is zero (BR-AD-09). */
export interface DeltaInt {
  current: number
  previous: number
  delta_abs: number
  delta_pct: number | null
}

/** Same shape for USD-encoded metrics: every number arrives as a string
 * so JSON does not lose Decimal precision. */
export interface DeltaUsd {
  current: string
  previous: string
  delta_abs: string
  delta_pct: number | null
}

export interface PlatformStatsCompare {
  range: '7d' | '30d'
  previous_period_end: string
  users: {
    total: DeltaInt
    active: DeltaInt
  }
  transactions: {
    count: DeltaInt
    volume_usd?: DeltaUsd
  }
}

export interface GetPlatformStatsParams {
  /** Phase 6e — append a `compare` block with deltas vs the prior window. */
  compare?: '7d' | '30d'
}

export async function getPlatformStats(
  params: GetPlatformStatsParams = {},
): Promise<PlatformStats> {
  const { data } = await client.get<PlatformStats>('/admin/stats', { params })
  return data
}
