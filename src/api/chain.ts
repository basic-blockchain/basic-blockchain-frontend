import client from './client'
import { blockFromApi } from '@/domain/block'
import type { Block, ApiBlock } from '@/domain/block'

export async function getChain(): Promise<{ chain: Block[]; length: number }> {
  const { data } = await client.get<{ chain: ApiBlock[]; length: number }>('/chain')
  return { chain: data.chain.map(blockFromApi), length: data.length }
}

export async function validateChain(): Promise<{ valid: boolean; message: string }> {
  const { data } = await client.get<{ valid: boolean; message: string }>('/valid')
  return data
}
