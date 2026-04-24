import client from './client'
import type { Transaction } from '@/domain/transaction'

export async function getPending(): Promise<{ transactions: Transaction[]; count: number }> {
  const { data } = await client.get<{ transactions: Transaction[]; count: number }>(
    '/transactions/pending'
  )
  return data
}

export async function addTransaction(tx: Transaction): Promise<Transaction> {
  const { data } = await client.post<{ transaction: Transaction }>('/transactions', tx)
  return data.transaction
}
