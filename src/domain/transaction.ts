export interface Transaction {
  sender: string
  receiver: string
  amount: number
}

export interface ConfirmedTransaction extends Transaction {
  blockIndex: number
  blockTimestamp: string
}

export interface TransactionValidationError {
  field: 'sender' | 'receiver' | 'amount'
  message: string
}

// Mirrors backend BR-TX-01 to BR-TX-04
export function validateTransaction(tx: Partial<Transaction>): TransactionValidationError[] {
  const errors: TransactionValidationError[] = []
  if (!tx.sender?.trim()) errors.push({ field: 'sender', message: 'Sender is required' })
  if (!tx.receiver?.trim()) errors.push({ field: 'receiver', message: 'Receiver is required' })
  if (tx.amount === undefined || tx.amount <= 0)
    errors.push({ field: 'amount', message: 'Amount must be positive' })
  if (tx.sender?.trim() && tx.receiver?.trim() && tx.sender.trim() === tx.receiver.trim())
    errors.push({ field: 'receiver', message: 'Sender and receiver must differ' })
  return errors
}
