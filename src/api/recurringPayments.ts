import client from './client'

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly'
export type RecurringStatus = 'active' | 'paused' | 'cancelled' | 'completed'

export interface RecurringPayment {
  rec_id: string
  status: RecurringStatus
  owner_username: string
  recipient_username: string
  payee_wallet_id: string
  amount: string
  currency: string
  frequency: RecurringFrequency
  starts_at: string
  next_run_at: string
  day_of_month: number | null
  ends_at: string | null
  max_executions: number | null
  executions_done: number
  last_executed_at: string | null
  concept: string | null
  created_at: string
}

export interface CreateRecurringBody {
  recipient_username: string
  amount: number
  currency: string
  frequency: RecurringFrequency
  starts_at?: string
  day_of_month?: number
  ends_at?: string
  max_executions?: number
  concept?: string
}

export async function createRecurringPayment(body: CreateRecurringBody): Promise<RecurringPayment> {
  const { data } = await client.post<{ recurring_payment: RecurringPayment }>(
    '/recurring-payments', body,
  )
  return data.recurring_payment
}

export async function listRecurringPayments(): Promise<RecurringPayment[]> {
  const { data } = await client.get<{ recurring_payments: RecurringPayment[] }>(
    '/recurring-payments',
  )
  return data.recurring_payments
}

export async function updateRecurringStatus(
  recId: string,
  status: 'active' | 'paused' | 'cancelled',
): Promise<RecurringPayment> {
  const { data } = await client.patch<{ recurring_payment: RecurringPayment }>(
    `/recurring-payments/${recId}/status`,
    { status },
  )
  return data.recurring_payment
}

export async function executeRecurringPayment(recId: string): Promise<RecurringPayment> {
  const { data } = await client.post<{ recurring_payment: RecurringPayment }>(
    `/recurring-payments/${recId}/execute`,
  )
  return data.recurring_payment
}

/** Human-readable frequency label */
export function freqLabel(f: RecurringFrequency): string {
  return { daily: 'cada día', weekly: 'cada semana', monthly: 'cada mes' }[f]
}

/** True if the payment is due (next_run_at is in the past) */
export function isDue(r: RecurringPayment): boolean {
  return r.status === 'active' && new Date(r.next_run_at) <= new Date()
}

/** Estimate annual cost */
export function annualEstimate(r: RecurringPayment): number {
  const amt = parseFloat(r.amount)
  const mult = { daily: 365, weekly: 52, monthly: 12 }[r.frequency] ?? 0
  return amt * mult
}
