import client from './client'
import type { KycLevel } from '@/stores/auth'

/**
 * KYC user-flow API client (Phase 6g).
 *
 * Endpoints below describe the planned contract with the simulator
 * backend. None of them are wired server-side yet — callers should
 * handle the AxiosError they will throw (typically a 404) and fall
 * back to local persistence (`useKyc` composable does this).
 *
 * Once the backend lands these routes the call sites need no change
 * beyond removing the local fallback.
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
