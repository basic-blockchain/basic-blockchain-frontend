import client from './client'

export interface AdminUser {
  user_id: string
  username: string
  display_name: string
  roles: string[]
  banned: boolean
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
