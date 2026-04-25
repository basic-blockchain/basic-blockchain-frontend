import client from './client'
import type { Health, Metrics } from '@/domain/metrics'

export async function getHealth(): Promise<Health> {
  const { data } = await client.get<{
    status: 'ok' | 'degraded'
    db: 'ok' | 'error' | 'n/a'
    chain_height: number
  }>('/health')
  return { status: data.status, db: data.db, chainHeight: data.chain_height }
}

export async function getMetrics(): Promise<Metrics> {
  const { data } = await client.get<{
    chain_height: number
    pending_transactions: number
    avg_mine_time_seconds: number | null
  }>('/metrics')
  return {
    chainHeight: data.chain_height,
    pendingTransactions: data.pending_transactions,
    avgMineTimeSeconds: data.avg_mine_time_seconds,
  }
}
