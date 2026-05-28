import client from './client'
import type { ConfirmedTransaction, Transaction } from '@/domain/transaction'

interface TransactionPayload {
  sender: string
  receiver: string
  amount: number
  sender_wallet_id?: string
  receiver_wallet_id?: string
  receiver_amount?: number | null
  /** Platform fee charged to the sender (BR-TX-10/11). Backed by
   * `transactions.fee` / `mempool.fee` (V024) on the simulator. */
  fee?: number
}

interface ConfirmedTransactionPayload extends TransactionPayload {
  block_index: number
  block_timestamp: string
}

function fromPayload(tx: TransactionPayload): Transaction {
  return {
    sender: tx.sender,
    receiver: tx.receiver,
    amount: tx.amount,
    senderWalletId: tx.sender_wallet_id || undefined,
    receiverWalletId: tx.receiver_wallet_id || undefined,
    receiverAmount: tx.receiver_amount ?? null,
    fee: tx.fee ?? 0,
  }
}

export async function getPending(): Promise<{ transactions: Transaction[]; count: number }> {
  const { data } = await client.get<{ transactions: TransactionPayload[]; count: number }>(
    '/transactions/pending'
  )
  return {
    count: data.count,
    transactions: data.transactions.map(fromPayload),
  }
}

export async function addTransaction(tx: Transaction): Promise<Transaction> {
  const { data } = await client.post<{ transaction: Transaction }>('/transactions', tx)
  return data.transaction
}

export async function getConfirmed(): Promise<{
  transactions: ConfirmedTransaction[]
  count: number
}> {
  const { data } = await client.get<{ transactions: ConfirmedTransactionPayload[]; count: number }>(
    '/transactions'
  )
  return {
    count: data.count,
    transactions: data.transactions.map((tx) => ({
      ...fromPayload(tx),
      blockIndex: tx.block_index,
      blockTimestamp: tx.block_timestamp,
    })),
  }
}
