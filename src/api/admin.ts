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
  payload: UpdateUserPayload,
): Promise<UserAdminRecord> {
  const { data } = await client.patch<UserAdminRecord>(`/admin/users/${userId}`, payload)
  return data
}

export async function softDeleteUser(
  userId: string,
): Promise<{ user_id: string; deleted: boolean; frozen_wallets: string[] }> {
  const { data } = await client.delete(`/admin/users/${userId}`)
  return data
}

export async function restoreUser(
  userId: string,
  unfreezeWallets = true,
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
  balance: string
  public_key: string
  frozen: boolean
}

export async function listAllWallets(): Promise<{ wallets: WalletAdminRecord[]; count: number }> {
  const { data } = await client.get('/admin/wallets')
  return data
}

export async function freezeWallet(
  walletId: string,
): Promise<{ wallet_id: string; frozen: boolean }> {
  const { data } = await client.post(`/admin/wallets/${walletId}/freeze`)
  return data
}

export async function unfreezeWallet(
  walletId: string,
): Promise<{ wallet_id: string; frozen: boolean }> {
  const { data } = await client.post(`/admin/wallets/${walletId}/unfreeze`)
  return data
}
