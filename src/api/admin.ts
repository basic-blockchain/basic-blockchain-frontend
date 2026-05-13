import client from './client'

export interface AdminUser {
  user_id: string
  username: string
  display_name: string
  email: string | null
  roles: string[]
  banned: boolean
  deleted_at: string | null
  created_at: string
}

export type WalletType = 'USER' | 'TREASURY' | 'FEE'

export interface CurrencyRecord {
  code: string
  name: string
  decimals: number
  active: boolean
}

export interface ExchangeRateRecord {
  rate_id: number
  from_currency: string
  to_currency: string
  rate: string
  fee_rate: string
  source: string
  updated_at: string
}

export interface UsersResponse {
  users: AdminUser[]
}

export async function listUsers(): Promise<UsersResponse> {
  const { data } = await client.get<UsersResponse>('/admin/users')
  return data
}

export async function grantRole(userId: string, role: string): Promise<void> {
  await client.post(`/admin/users/${userId}/roles`, { action: 'grant', role })
}

export async function revokeRole(userId: string, role: string): Promise<void> {
  await client.post(`/admin/users/${userId}/roles`, { action: 'revoke', role })
}

export async function banUser(userId: string): Promise<void> {
  await client.post(`/admin/users/${userId}/ban`)
}

export async function unbanUser(userId: string): Promise<void> {
  await client.post(`/admin/users/${userId}/unban`)
}

export async function grantPermission(userId: string, permission: string): Promise<void> {
  await client.post(`/admin/users/${userId}/permissions`, { action: 'grant', permission })
}

export async function revokePermission(userId: string, permission: string): Promise<void> {
  await client.post(`/admin/users/${userId}/permissions`, { action: 'revoke', permission })
}

// ── User management (enriched) ─────────────────────────────────────────────

export interface UserAdminRecord {
  user_id: string
  username: string
  display_name: string
  email: string | null
  banned: boolean
  deleted_at: string | null
  roles: string[]
}

export interface UpdateUserPayload {
  display_name?: string
  email?: string
}

export async function updateUser(
  userId: string,
  payload: UpdateUserPayload
): Promise<UserAdminRecord> {
  const { data } = await client.patch<UserAdminRecord>(`/admin/users/${userId}`, payload)
  return data
}

export async function softDeleteUser(
  userId: string
): Promise<{ user_id: string; deleted: boolean; frozen_wallets: string[] }> {
  const { data } = await client.delete(`/admin/users/${userId}`)
  return data
}

export async function restoreUser(
  userId: string,
  unfreezeWallets = true
): Promise<{ user_id: string; restored: boolean; unfrozen_wallets: string[] }> {
  const { data } = await client.post(`/admin/users/${userId}/restore`, {
    unfreeze_wallets: unfreezeWallets,
  })
  return data
}

// ── Wallet management ──────────────────────────────────────────────────────

export interface WalletAdminRecord {
  wallet_id: string
  user_id: string
  username: string
  display_name: string
  currency: string
  wallet_type: WalletType
  balance: string
  public_key: string
  frozen: boolean
}

export async function listAllWallets(): Promise<{ wallets: WalletAdminRecord[]; count: number }> {
  const { data } = await client.get('/admin/wallets')
  return data
}

export async function freezeWallet(
  walletId: string
): Promise<{ wallet_id: string; frozen: boolean }> {
  const { data } = await client.post(`/admin/wallets/${walletId}/freeze`)
  return data
}

export async function unfreezeWallet(
  walletId: string
): Promise<{ wallet_id: string; frozen: boolean }> {
  const { data } = await client.post(`/admin/wallets/${walletId}/unfreeze`)
  return data
}

// ── Currency catalog (MC-1) ───────────────────────────────────────────────

export async function listCurrencies(
  activeOnly = false
): Promise<{ currencies: CurrencyRecord[]; count: number }> {
  const { data } = await client.get('/admin/currencies', {
    params: activeOnly ? { active: 'true' } : undefined,
  })
  return data
}

export interface CreateCurrencyPayload {
  code: string
  name: string
  decimals?: number
  active?: boolean
}

export async function createCurrency(payload: CreateCurrencyPayload): Promise<CurrencyRecord> {
  const { data } = await client.post('/admin/currencies', payload)
  return data
}

// ── Treasury wallets (MC-2) ───────────────────────────────────────────────

export async function createTreasuryWallet(currency: string): Promise<{
  wallet_id: string
  public_key: string
  currency: string
  wallet_type: WalletType
}> {
  const { data } = await client.post('/admin/treasury', { currency })
  return data
}

// ── Exchange rates (MC-3) ─────────────────────────────────────────────────

export async function listExchangeRates(params?: {
  from?: string
  to?: string
  limit?: number
}): Promise<{ rates: ExchangeRateRecord[]; count: number }> {
  const { data } = await client.get('/admin/exchange-rates', { params })
  return data
}

export async function setExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  payload: { rate: number; fee_rate?: number }
): Promise<ExchangeRateRecord> {
  const { data } = await client.put(`/admin/exchange-rates/${fromCurrency}/${toCurrency}`, payload)
  return data
}

export async function syncExchangeRates(payload: {
  provider: string
  pairs: string[]
}): Promise<{ rates: ExchangeRateRecord[]; count: number; provider: string }> {
  const { data } = await client.post('/admin/exchange-rates/sync', payload)
  return data
}
