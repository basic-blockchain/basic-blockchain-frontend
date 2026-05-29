import client from './client'
import type { Health, Metrics, ComponentStatus } from '@/domain/metrics'

export async function getHealth(): Promise<Health> {
  const { data } = await client.get<{
    status: 'ok' | 'degraded'
    db: 'ok' | 'error' | 'n/a'
    chain_height: number
    components?: Array<{
      id: string
      label: string
      meta?: string | null
      status: 'ok' | 'degraded' | 'error' | 'n/a'
    }>
  }>('/health')
  const result: Health = { status: data.status, db: data.db, chainHeight: data.chain_height }
  if (data.components) {
    result.components = data.components.map<ComponentStatus>((c) => ({
      id: c.id,
      label: c.label,
      meta: c.meta ?? null,
      status: c.status,
    }))
  }
  return result
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
