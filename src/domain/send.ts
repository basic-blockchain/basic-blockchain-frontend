/**
 * Phase 7.10 — domain types for the /admin/sends view.
 *
 * Mirror of the backend contract pinned in
 * docs/specs/7.10-admin-sends-redesign.md (backend impl: Phase 7.10.a).
 */

export type SendKind = 'internal' | 'onchain' | 'treasury'

export type SendStatus = 'completed' | 'pending' | 'failed'

export type SendWindow = '24h' | '7d' | '30d' | 'all'

export interface SendParticipant {
  user_id: string | null
  username: string | null
  address: string
}

export interface SendAsset {
  code: string
  symbol: string
}

export interface SendRow {
  tx_id: string
  ref_short: string
  kind: SendKind
  status: SendStatus
  confirmations: number | null
  from: SendParticipant
  to: SendParticipant
  asset: SendAsset
  /** Decimal string — the backend never floats financial values. */
  amount: string
  amount_usd: string | null
  fee: string
  fee_usd: string | null
  note: string | null
  confirmed_at: string | null
  created_at: string | null
}

export interface SendsAggregates {
  count_24h: number
  count_24h_by_kind: Record<SendKind, number>
  volume_usd_24h: string
  pending_onchain: number
  fees_collected_usd_7d: string
}

export interface SendsResponse {
  window: SendWindow
  rows: SendRow[]
  count: number
  aggregates: SendsAggregates
}

export interface SendsQuery {
  window?: SendWindow
  kind?: SendKind
  status?: SendStatus
  q?: string
  limit?: number
}
