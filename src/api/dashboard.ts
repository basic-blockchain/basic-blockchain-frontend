/**
 * Admin dashboard API (Phase 6e — contracts in
 * `basic-blockchain-simulator/docs/api-reference.md` §
 * "Admin dashboard endpoints").
 *
 * `getPlatformStats` and `listAuditLog` live in their existing modules
 * (`@/api/stats`, `@/api/admin`) and were extended in place for Phase
 * 6e. This module owns the two genuinely new endpoints — `/admin/volume`
 * and `/admin/movements/top` — plus their shared types.
 */

import client from './client'

// ── /admin/volume ────────────────────────────────────────────────────

export type VolumeRange = '30d' | '90d' | '1y'
export type VolumeBucket = 'day' | 'week'

export interface VolumeBucketRow {
  /** ISO date (`YYYY-MM-DD`). For `bucket=week` this is the Monday of
   * the ISO week. */
  ts: string
  /** Sum of confirmed transfers in USD, encoded as a Decimal string so
   * JSON does not lose precision. `"0"` when the bucket is empty. */
  volume_usd: string
  tx_count: number
  /** Transfers whose pair has no FX rate at `confirmed_at`. BR-AD-07:
   * these are counted but never folded into `volume_usd`. */
  unpriced_count: number
}

export interface VolumeResponse {
  range: VolumeRange
  bucket: VolumeBucket
  currency: 'USD'
  series: VolumeBucketRow[]
  totals: {
    volume_usd: string
    tx_count: number
    unpriced_count: number
  }
}

export interface GetVolumeParams {
  range: VolumeRange
  /** Defaults server-side: `day` for `30d`, `week` otherwise. */
  bucket?: VolumeBucket
}

export async function getVolume(params: GetVolumeParams): Promise<VolumeResponse> {
  const { data } = await client.get<VolumeResponse>('/admin/volume', { params })
  return data
}

// ── /admin/movements/top ─────────────────────────────────────────────

export type MovementsRange = '24h' | '7d' | '30d'

export interface TopMovement {
  tx_id: string
  block_height: number
  currency: string
  /** Native amount, Decimal-string-encoded. */
  amount: string
  /** USD equivalent at `confirmed_at` (never at the current rate). */
  amount_usd: string
  from_user_id: string | null
  from_username: string | null
  to_user_id: string | null
  to_username: string | null
  confirmed_at: string
}

export interface TopMovementsResponse {
  range: MovementsRange
  movements: TopMovement[]
  count: number
  limit: number
  total_volume_usd: string
}

export interface GetTopMovementsParams {
  range?: MovementsRange
  /** Clamped server-side to [1, 50]. Defaults to 10. */
  limit?: number
}

export async function getTopMovements(
  params: GetTopMovementsParams = {},
): Promise<TopMovementsResponse> {
  const { data } = await client.get<TopMovementsResponse>(
    '/admin/movements/top',
    { params },
  )
  return data
}
