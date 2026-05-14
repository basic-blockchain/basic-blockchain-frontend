import client from './client'

export interface PlatformStats {
  users: {
    total: number
    active: number
    banned: number
    deleted: number
  }
  wallets: {
    total: number
    user_wallets: number
    frozen: number
    frozen_user_wallets: number
  }
  balances: Record<string, string>
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const { data } = await client.get<PlatformStats>('/admin/stats')
  return data
}
