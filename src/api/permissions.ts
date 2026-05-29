import client from './client'
import { listUsers, grantRole, grantPermission, revokePermission, issueTempPassword } from './admin'
import { register } from './auth'
import { primaryRole, computeEffectivePerms, isCustomSet, ROLE_PRESETS } from '@/composables/usePermissions'
import type { StaffUser, StaffRole } from '@/composables/usePermissions'

export { grantPermission, revokePermission }

// ── GET user permissions ──────────────────────────────────────────────────────

export interface UserPermissionsResponse {
  user_id: string
  roles: string[]
  role_permissions: Record<string, string[]>
  user_overrides: string[]
  effective: string[]
}

/** Fetch roles + overrides + effective permissions for a single staff user. */
export async function getUserPermissions(userId: string): Promise<UserPermissionsResponse> {
  const { data } = await client.get<UserPermissionsResponse>(`/admin/users/${userId}/permissions`)
  return data
}

// ── Load staff list ───────────────────────────────────────────────────────────

/**
 * Load all users, filter to ADMIN/OPERATOR, and map to StaffUser.
 * Effective permissions are computed from role presets — no per-user overrides
 * at this stage (use getUserPermissions in the drawer for the full picture).
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

// ── Create staff user ─────────────────────────────────────────────────────────

export interface CreateStaffParams {
  name: string
  email: string
  country: string
  role: StaffRole
  /** Full permission set chosen in the wizard (role preset + any extras). */
  perms: Set<string>
  notify: 'email-link' | 'temp-password'
}

export interface CreateStaffResult {
  user_id: string
  username: string
  /** Activation code — needed if notify=email-link so admin can share it. */
  activation_code: string
  /** Only populated when notify=temp-password. */
  temp_password: string | null
  staffUser: StaffUser
}

/**
 * Orchestrate admin staff-user creation:
 *   1. register (VIEWER by default)
 *   2. grantRole → promote to ADMIN/OPERATOR
 *   3. grantPermission for each extra beyond the role preset
 *   4. issueTempPassword if notify=temp-password
 */
export async function createStaffUser(params: CreateStaffParams): Promise<CreateStaffResult> {
  // Derive a username from the email (sanitise to ≤64 alphanumeric/underscore chars).
  const username = params.email
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 60)
    + '_' + Date.now().toString(36).slice(-4)

  // 1. Register → creates VIEWER account
  const reg = await register(username, params.name, params.country || undefined, params.email)
  const userId = reg.user_id

  // 2. Grant desired role (skip if VIEWER — that's the default)
  if (params.role !== 'VIEWER') {
    await grantRole(userId, params.role)
  }

  // 3. Grant permissions that exceed the role preset
  const preset = new Set(ROLE_PRESETS[params.role])
  const extras = [...params.perms].filter((p) => !preset.has(p))
  for (const perm of extras) {
    await grantPermission(userId, perm)
  }

  // 4. Access method
  let tempPassword: string | null = null
  if (params.notify === 'temp-password') {
    const tp = await issueTempPassword(userId)
    tempPassword = tp.temp_password
  }

  const effectivePerms = [...params.perms].sort()
  const staffUser: StaffUser = {
    user_id: userId,
    display_name: params.name,
    email: params.email,
    country: params.country || null,
    roles: [params.role],
    primaryRole: params.role,
    effectivePerms,
    overrides: extras,
    isCustom: extras.length > 0,
    lastActive: null,
  }

  return {
    user_id: userId,
    username,
    activation_code: reg.activation_code,
    temp_password: tempPassword,
    staffUser,
  }
}
