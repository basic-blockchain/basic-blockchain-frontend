import client from './client'
import type { KycLevel } from '@/stores/auth'

/**
 * KYC API client.
 *
 * Phase 6g — user-flow endpoints (/me/kyc/*).
 * Phase 6g-admin — operator endpoints (/admin/kyc/*) gated by the
 * REVIEW_KYC permission (ADMIN baseline).
 */

export type KycDocumentKey = 'dni' | 'selfie' | 'address' | 'funds'
export type KycDocumentStatus = 'missing' | 'uploaded' | 'pending_review' | 'verified' | 'rejected'

export interface KycDocumentRecord {
  key: KycDocumentKey
  status: KycDocumentStatus
  uploaded_at?: string
  reviewed_at?: string
  reject_reason?: string
}

export interface KycStatusResponse {
  level: KycLevel
  documents: KycDocumentRecord[]
  pending_review?: KycLevel
  submitted_at?: string
}

export interface UploadKycDocumentPayload {
  key: KycDocumentKey
  filename: string
  content_type: string
  /** Base64-encoded payload. Backend will move this to object storage. */
  data: string
}

/** `GET /me/kyc/status` — returns the caller's current KYC state. */
export async function getKycStatus(): Promise<KycStatusResponse> {
  const { data } = await client.get<KycStatusResponse>('/me/kyc/status')
  return data
}

/** `POST /me/kyc/documents` — upload a single document. */
export async function uploadKycDocument(
  payload: UploadKycDocumentPayload,
): Promise<KycDocumentRecord> {
  const { data } = await client.post<KycDocumentRecord>('/me/kyc/documents', payload)
  return data
}

/** `POST /me/kyc/review` — submit the requested level for review. */
export async function submitKycReview(target: KycLevel): Promise<KycStatusResponse> {
  const { data } = await client.post<KycStatusResponse>('/me/kyc/review', { target })
  return data
}

// ── Admin review (Phase 6g-admin) ─────────────────────────────────────────

/** One row in the pending-review queue. */
export interface PendingKycReview {
  user_id: string
  username: string
  display_name: string
  kyc_level: KycLevel
  pending_review: KycLevel
  submitted_at: string
  documents: KycDocumentRecord[]
}

export interface PendingKycReviewsResponse {
  users: PendingKycReview[]
  count: number
}

export interface PromoteKycResponse {
  user_id: string
  from_level: KycLevel
  to_level: KycLevel
}

/**
 * `GET /admin/kyc/pending` — list every user with `kyc_pending_review`
 * set, oldest submission first. Requires the REVIEW_KYC permission
 * (ADMIN baseline).
 */
export async function getPendingKycReviews(): Promise<PendingKycReviewsResponse> {
  const { data } = await client.get<PendingKycReviewsResponse>('/admin/kyc/pending')
  return data
}

/**
 * `POST /admin/kyc/users/<user_id>/documents/<doc_key>/approve` —
 * flip a single document to `verified`. Does not clear pending review;
 * call `promoteKycLevel` after all required docs are approved.
 */
export async function approveKycDocument(
  userId: string,
  docKey: KycDocumentKey,
): Promise<KycDocumentRecord> {
  const { data } = await client.post<KycDocumentRecord>(
    `/admin/kyc/users/${userId}/documents/${docKey}/approve`,
  )
  return data
}

/**
 * `POST /admin/kyc/users/<user_id>/documents/<doc_key>/reject` — flip
 * the document to `rejected` with the operator-supplied reason. Aborts
 * the whole review: `kyc_pending_review` and `kyc_submitted_at` are
 * cleared so the user can re-upload and resubmit.
 */
export async function rejectKycDocument(
  userId: string,
  docKey: KycDocumentKey,
  reason: string,
): Promise<KycDocumentRecord> {
  const { data } = await client.post<KycDocumentRecord>(
    `/admin/kyc/users/${userId}/documents/${docKey}/reject`,
    { reason },
  )
  return data
}

/**
 * `POST /admin/kyc/users/<user_id>/promote` — promote the user to their
 * current `pending_review` target. Requires every required document for
 * that target to be in `status: 'verified'`; otherwise the backend
 * responds with `KYC_NOT_ALL_DOCUMENTS_VERIFIED`.
 */
export async function promoteKycLevel(userId: string): Promise<PromoteKycResponse> {
  const { data } = await client.post<PromoteKycResponse>(
    `/admin/kyc/users/${userId}/promote`,
  )
  return data
}
