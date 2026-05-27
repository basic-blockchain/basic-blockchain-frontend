export interface Transaction {
  sender: string
  receiver: string
  amount: number
  /** Wallet IDs are the only identifiers that reliably resolve back to
   * `/admin/wallets`. The pubkey fields are kept for display only. */
  senderWalletId?: string
  receiverWalletId?: string
  /** Amount credited to the receiver — differs from `amount` when the
   * transfer crosses currencies (the receiving wallet is in a different
   * asset). `null` when the simulator has no separate receiver amount. */
  receiverAmount?: number | null
}

export interface ConfirmedTransaction extends Transaction {
  blockIndex: number
  blockTimestamp: string
}

export interface TransactionValidationError {
  field: 'sender' | 'receiver' | 'amount'
  message: string
}

const MAX_FIELD_LEN = 255

// Mirrors backend BR-TX-01 to BR-TX-05
export function validateTransaction(tx: Partial<Transaction>): TransactionValidationError[] {
  const errors: TransactionValidationError[] = []
  if (!tx.sender?.trim()) errors.push({ field: 'sender', message: 'Sender is required' })
  else if (tx.sender.length > MAX_FIELD_LEN)
    errors.push({ field: 'sender', message: `Sender must not exceed ${MAX_FIELD_LEN} characters` })
  if (!tx.receiver?.trim()) errors.push({ field: 'receiver', message: 'Receiver is required' })
  else if (tx.receiver.length > MAX_FIELD_LEN)
    errors.push({ field: 'receiver', message: `Receiver must not exceed ${MAX_FIELD_LEN} characters` })
  if (tx.amount === undefined || tx.amount <= 0)
    errors.push({ field: 'amount', message: 'Amount must be positive' })
  if (tx.sender?.trim() && tx.receiver?.trim() && tx.sender.trim() === tx.receiver.trim())
    errors.push({ field: 'receiver', message: 'Sender and receiver must differ' })
  return errors
}
