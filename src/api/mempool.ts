import client from './client'
import type { ConfirmedTransaction, Transaction } from '@/domain/transaction'

interface ConfirmedTransactionPayload {
  sender: string
  receiver: string
  amount: number
  block_index: number
  block_timestamp: string
}

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

export async function getConfirmed(): Promise<{ transactions: ConfirmedTransaction[]; count: number }> {
  const { data } = await client.get<{ transactions: ConfirmedTransactionPayload[]; count: number }>(
    '/transactions'
  )
  return {
    count: data.count,
    transactions: data.transactions.map((tx) => ({
      sender: tx.sender,
      receiver: tx.receiver,
      amount: tx.amount,
      blockIndex: tx.block_index,
      blockTimestamp: tx.block_timestamp,
    })),
  }
}
