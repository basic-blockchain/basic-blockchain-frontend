import client from './client'
import type { Block, ApiBlock } from '@/domain/block'
import { blockFromApi } from '@/domain/block'

export async function getNodes(): Promise<{ nodes: string[]; total: number }> {
  const { data } = await client.get<{ nodes: string[]; total: number }>('/nodes')
  return data
}

export async function registerNodes(urls: string[]): Promise<{ nodes: string[]; total: number }> {
  const { data } = await client.post<{ nodes: string[]; total: number }>('/nodes/register', {
    nodes: urls,
  })
  return data
}

export async function resolveConsensus(): Promise<{
  replaced: boolean
  chain: Block[]
  message: string
}> {
  const { data } = await client.get<{ replaced: boolean; chain: ApiBlock[]; message: string }>(
    '/nodes/resolve'
  )
  return { replaced: data.replaced, chain: data.chain.map(blockFromApi), message: data.message }
}
