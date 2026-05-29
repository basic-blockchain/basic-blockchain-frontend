export interface Metrics {
  chainHeight: number
  pendingTransactions: number
  avgMineTimeSeconds: number | null
}

export interface ComponentStatus {
  id: string
  label: string
  meta?: string | null
  status: 'ok' | 'degraded' | 'error' | 'n/a'
}

export interface Health {
  status: 'ok' | 'degraded'
  db: 'ok' | 'error' | 'n/a'
  chainHeight: number
  /** Optional — present once backend ships components[]. */
  components?: ComponentStatus[]
}
