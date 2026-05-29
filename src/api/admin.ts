import client from './client'
import type { SendsQuery, SendsResponse } from '@/domain/send'

export interface AdminUser {
  user_id: string
  username: string
  display_name: string
  email: string | null
  roles: string[]
  banned: boolean
  deleted_at: string | null
  created_at: string
  country: string | null
  kyc_level: 'L0' | 'L1' | 'L2' | 'L3'
  last_active: string | null
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

export interface TempPasswordResponse {
  user_id: string
  temp_password: string
  must_change_password: boolean
}

export async function issueTempPassword(userId: string): Promise<TempPasswordResponse> {
  const { data } = await client.post<TempPasswordResponse>(`/admin/users/${userId}/temp-password`)
  return data
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
  /** Phase 6i — USD using `get_rate_at(currency, USD, now)`. `null`
   * when the currency has no FX rate today (BR-AD-07: never silently
   * zeroed). */
  balance_usd: string | null
  public_key: string
  frozen: boolean
}

export interface ListAllWalletsResponse {
  wallets: WalletAdminRecord[]
  count: number
  /** Sum of every wallet's `balance_usd` (skips unpriced rows). */
  total_balance_usd: string
  /** Currency codes that had no rate at fetch time. */
  unpriced_currencies: string[]
}

export async function listAllWallets(): Promise<ListAllWalletsResponse> {
  const { data } = await client.get<ListAllWalletsResponse>('/admin/wallets')
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

export interface TreasuryDistributionRecord {
  op_id: string
  status: 'pending_approval' | 'executed' | 'cancelled'
  currency: string
  source_wallet_id: string
  amount_per_wallet: string
  recipient_user_ids: string[]
  recipient_count: number
  total_amount: string
  initiated_by: string
  initiated_at: string
  memo: string | null
  approved_by?: string
  approved_at?: string
  executed_at?: string
  tx_ids?: string[]
  cancelled_at?: string
}

export interface InitiateTreasuryDistributionPayload {
  source_wallet_id: string
  currency: string
  amount_per_wallet: string
  recipient_user_ids: string[]
  memo?: string | null
}

export async function initiateTreasuryDistribution(
  payload: InitiateTreasuryDistributionPayload
): Promise<TreasuryDistributionRecord> {
  const { data } = await client.post<TreasuryDistributionRecord>(
    '/admin/treasury/distribute',
    payload
  )
  return data
}

export async function approveTreasuryDistribution(
  opId: string
): Promise<TreasuryDistributionRecord> {
  const { data } = await client.post<TreasuryDistributionRecord>(
    `/admin/treasury/distribute/${opId}/approve`
  )
  return data
}

export async function cancelTreasuryDistribution(
  opId: string
): Promise<TreasuryDistributionRecord> {
  const { data } = await client.post<TreasuryDistributionRecord>(
    `/admin/treasury/distribute/${opId}/cancel`
  )
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

/** Phase 6e — canonical severity classification (BR-AD-10). Derived
 * server-side; clients must not reclassify. */
export type AuditSeverity = 'critical' | 'warning' | 'info'

export type AuditSinceWindow = '1h' | '24h' | '7d' | '30d'

export interface AuditEntry {
  id: string
  actor_id: string
  action: string
  target_id: string | null
  details: Record<string, unknown>
  created_at: string
  /** Phase 6e — present on every entry returned by the simulator. */
  severity?: AuditSeverity
}

export interface AuditParams {
  limit?: number
  offset?: number
  /** Full-text search across action, actor_id and details (server best-effort; client falls back). */
  q?: string
  action?: string
  actor_id?: string
  target_id?: string
  /** Phase 6e — filter to a severity level (BR-AD-11). */
  severity?: AuditSeverity
  /** Phase 6e — drop entries older than the window (BR-AD-11). */
  since?: AuditSinceWindow
}

export async function listAuditLog(
  params?: AuditParams
): Promise<{ entries: AuditEntry[]; count: number }> {
  const { data } = await client.get('/admin/audit', { params })
  return data
}

/** Phase 7.10 — fetch classified sends + aggregates for /admin/sends. */
export async function getAdminSends(params?: SendsQuery): Promise<SendsResponse> {
  const { data } = await client.get<SendsResponse>('/admin/sends', { params })
  return data
}
