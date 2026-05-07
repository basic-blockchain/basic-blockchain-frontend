import client from './client'
import type { Block, ApiBlock } from '@/domain/block'
import { blockFromApi } from '@/domain/block'
import type { Transaction } from '@/domain/transaction'

// The mining endpoint returns an ApiBlock-shaped object plus a `message`
// field. The block's transactions arrive on the same `transactions` key
// already declared by ApiBlock — kept as a top-level sibling for v0.9.0
// back-compat AND nested in every block returned by /chain since v0.10.0.
interface MineResponse extends ApiBlock {
  message: string
}

export async function mineBlock(): Promise<{ block: Block; transactions: Transaction[] }> {
  const { data } = await client.post<MineResponse>('/mine_block', {}, { timeout: 120_000 })
  return {
    block: blockFromApi(data),
    transactions: data.transactions,
  }
}
