import client from './client'
import { listUsers, grantPermission, revokePermission } from './admin'
import { primaryRole, computeEffectivePerms, isCustomSet } from '@/composables/usePermissions'
import type { StaffUser } from '@/composables/usePermissions'

export { grantPermission, revokePermission }

export interface UserPermissionsResponse {
  user_id: string
  roles: string[]
  role_permissions: Record<string, string[]>
  user_overrides: string[]
  effective: string[]
}

/** Fetch the full permission picture for a single staff user. */
export async function getUserPermissions(userId: string): Promise<UserPermissionsResponse> {
  const { data } = await client.get<UserPermissionsResponse>(`/admin/users/${userId}/permissions`)
  return data
}

/**
 * Load all users from the API, filter to ADMIN/OPERATOR staff, and map to
 * StaffUser. Permissions are computed from role presets only (no per-user
 * overrides) — call getUserPermissions() in the detail drawer for the full picture.
 */
export async function loadStaffUsers(): Promise<StaffUser[]> {
  const response = await listUsers()
  return response.users
    .filter((u) => u.roles.some((r) => r === 'ADMIN' || r === 'OPERATOR'))
    .map((u) => {
      const role = primaryRole(u.roles)
      const effectivePerms = computeEffectivePerms(u.roles, [])
      return {
        user_id: u.user_id,
        display_name: u.display_name,
        email: u.email,
        country: u.country,
        roles: u.roles,
        primaryRole: role,
        effectivePerms,
        overrides: [],
        isCustom: isCustomSet(u.roles, effectivePerms),
        lastActive: u.last_active,
      } satisfies StaffUser
    })
}
