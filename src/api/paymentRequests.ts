import client from './client'

export type PaymentRequestStatus = 'pending' | 'paid' | 'cancelled' | 'expired'

export interface PaymentRequest {
  req_id: string
  status: PaymentRequestStatus
  owner_username: string
  payee_wallet_id: string
  amount: string        // decimal string
  currency: string
  from_username: string | null
  concept: string | null
  expires_at: string | null
  created_at: string
  paid_by: string | null
  paid_at: string | null
  cancelled_at: string | null
}

export interface CreatePaymentRequestBody {
  amount: number
  currency: string
  from_username?: string
  concept?: string
  expires_at?: string
}

export async function createPaymentRequest(
  body: CreatePaymentRequestBody,
): Promise<PaymentRequest> {
  const { data } = await client.post<{ payment_request: PaymentRequest }>(
    '/payment-requests',
    body,
  )
  return data.payment_request
}

export async function getPaymentRequest(reqId: string): Promise<PaymentRequest> {
  const { data } = await client.get<{ payment_request: PaymentRequest }>(
    `/payment-requests/${reqId}`,
  )
  return data.payment_request
}

export async function listPaymentRequests(): Promise<PaymentRequest[]> {
  const { data } = await client.get<{ payment_requests: PaymentRequest[] }>(
    '/payment-requests',
  )
  return data.payment_requests
}

export async function cancelPaymentRequest(reqId: string): Promise<PaymentRequest> {
  const { data } = await client.delete<{ payment_request: PaymentRequest }>(
    `/payment-requests/${reqId}`,
  )
  return data.payment_request
}

export async function fulfillPaymentRequest(
  reqId: string,
  paidBy: string,
): Promise<PaymentRequest> {
  const { data } = await client.post<{ payment_request: PaymentRequest }>(
    `/payment-requests/${reqId}/fulfill`,
    { paid_by: paidBy },
  )
  return data.payment_request
}

/** Derives the shareable URL for a payment request */
export function paymentRequestUrl(reqId: string): string {
  return `${window.location.origin}/pay/${reqId}`
}
