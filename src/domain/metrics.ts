export interface Metrics {
  chainHeight: number
  pendingTransactions: number
  avgMineTimeSeconds: number | null
}

export interface Health {
  status: 'ok' | 'degraded'
  db: 'ok' | 'error' | 'n/a'
  chainHeight: number
}
