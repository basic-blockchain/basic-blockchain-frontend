import client from './client'
import type { Block, ApiBlock } from '@/domain/block'
import { blockFromApi } from '@/domain/block'
import type { Transaction } from '@/domain/transaction'

interface MineResponse extends ApiBlock {
  message: string
  transactions: Transaction[]
}

export async function mineBlock(): Promise<{ block: Block; transactions: Transaction[] }> {
  const { data } = await client.post<MineResponse>('/mine_block', {}, { timeout: 120_000 })
  return {
    block: blockFromApi(data),
    transactions: data.transactions,
  }
}
