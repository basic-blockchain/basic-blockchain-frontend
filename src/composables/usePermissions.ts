/**
 * usePermissions — permission catalog mirroring domain/permissions.py ROLE_PERMISSIONS.
 *
 * Keys are UPPER_SNAKE_CASE strings matching the backend Permission enum values.
 * Categories are a frontend UX grouping only — the backend has no concept of them.
 */

export type PermKey = string
export type StaffRole = 'ADMIN' | 'OPERATOR' | 'VIEWER'

export interface PermCategory {
  id: string
  label: string
  desc: string
  color: string
  perms: [PermKey, string, string][] // [key, label, description]
}

export interface StaffUser {
  user_id: string
  display_name: string
  email: string | null
  country: string | null
  /** All roles assigned to this user. */
  roles: string[]
  /** Primary staff role — highest privilege role. */
  primaryRole: StaffRole
  /** Effective permissions computed from role baseline + user overrides. */
  effectivePerms: string[]
  /** User-specific grants that deviate from the role preset. */
  overrides: string[]
  /** True when effectivePerms differs from the role baseline. */
  isCustom: boolean
  lastActive: string | null
}

// ── Permission categories (UX grouping) ───────────────────────────────────────

export const PERM_CATEGORIES: PermCategory[] = [
  {
    id: 'tokens',
    label: 'Tokens',
    desc: 'Acuñar, transferir y consultar historial de tokens.',
    color: '#7c3aed',
    perms: [
      ['MINT',           'Mint',              'Acuñar nuevos tokens nativos (modifica supply)'],
      ['TRANSFER',       'Transferir',        'Enviar tokens entre wallets'],
      ['VIEW_TRANSFERS', 'Ver transferencias', 'Consultar historial financiero completo'],
    ],
  },
  {
    id: 'wallets',
    label: 'Wallets',
    desc: 'Crear, consultar y gestionar wallets de usuarios.',
    color: '#1f7a3a',
    perms: [
      ['CREATE_WALLET',   'Crear wallet',          'Generar par de llaves para una cuenta'],
      ['VIEW_WALLETS',    'Ver todas las wallets',  'Listado cross-user de wallets (admin)'],
      ['VIEW_OWN_WALLET', 'Ver wallet propia',      'Solo accede a las wallets del propio usuario'],
      ['FREEZE_WALLET',   'Congelar wallet',        'Pausar operativa de cualquier wallet'],
      ['UNFREEZE_WALLET', 'Descongelar wallet',     'Reactivar wallets congeladas'],
    ],
  },
  {
    id: 'users',
    label: 'Usuarios',
    desc: 'Gestión completa de cuentas de usuarios finales.',
    color: '#c2410c',
    perms: [
      ['CREATE_USER',  'Crear usuarios',   'Onboarding manual de nuevas cuentas'],
      ['VIEW_USERS',   'Ver usuarios',     'Listar y consultar datos de cualquier usuario'],
      ['UPDATE_USER',  'Editar datos',     'Cambiar display name, email, KYC'],
      ['BAN_USER',     'Banear',           'Bloquear acceso a la plataforma'],
      ['UNBAN_USER',   'Desbanear',        'Restaurar acceso de un usuario baneado'],
      ['DELETE_USER',  'Eliminar (soft)',  'Inactivar cuenta + congelar wallets asociadas'],
      ['RESTORE_USER', 'Restaurar',        'Reactivar cuenta eliminada por soft-delete'],
    ],
  },
  {
    id: 'roles',
    label: 'Roles y Permisos',
    desc: 'Asignar roles y gestionar permisos de staff.',
    color: '#5b21b6',
    perms: [
      ['ASSIGN_ROLE',        'Asignar roles',      'Otorgar o revocar roles ADMIN/OPERATOR/VIEWER'],
      ['MANAGE_PERMISSIONS', 'Gestionar permisos', 'Conceder o revocar permisos directos por usuario'],
    ],
  },
  {
    id: 'treasury',
    label: 'Tesorería',
    desc: 'Movimiento de fondos corporativos con firma dual.',
    color: '#ad2820',
    perms: [
      ['CREATE_TREASURY_WALLET',        'Crear wallet treasury',      'Inicializar wallet Cold/Hot/Fee corporativa'],
      ['INITIATE_TREASURY_DISTRIBUTION','Iniciar distribución',       'Crear operación de distribución masiva'],
      ['APPROVE_TREASURY_DISTRIBUTION', 'Aprobar distribución',       '2ª firma en operación de distribución'],
      ['VIEW_TREASURY_DISTRIBUTIONS',   'Ver distribuciones',         'Consultar historial de distribuciones'],
      ['APPROVE_TREASURY_MINT_OP',      'Aprobar mint (firma dual)', '2ª firma que habilita acuñación (supply-mutating)'],
      ['VIEW_TREASURY_MINT_OPS',        'Ver operaciones de mint',    'Consultar historial de operaciones de mint'],
    ],
  },
  {
    id: 'market',
    label: 'Mercado',
    desc: 'Monedas y tasas de cambio de la plataforma.',
    color: '#0891b2',
    perms: [
      ['CREATE_CURRENCY',       'Crear moneda',     'Registrar nueva moneda en la plataforma'],
      ['MANAGE_EXCHANGE_RATES', 'Gestionar tasas',  'Configurar y sincronizar tasas de cambio'],
    ],
  },
  {
    id: 'platform',
    label: 'Plataforma',
    desc: 'Auditoría, KYC y configuración global.',
    color: '#0e7490',
    perms: [
      ['VIEW_AUDIT_LOG', 'Ver auditoría', 'Acceder al log completo de acciones auditadas'],
      ['REVIEW_KYC',     'Revisar KYC',  'Aprobar o rechazar solicitudes de verificación KYC'],
    ],
  },
]

// ── Role baselines — mirror of ROLE_PERMISSIONS in domain/permissions.py ──────
// Keep in sync with the backend. Deliberate omissions from ADMIN baseline:
//   MINT, VIEW_TRANSFERS, APPROVE_TREASURY_MINT_OP (require explicit per-admin grant).

export const ROLE_PRESETS: Record<StaffRole, string[]> = {
  ADMIN: [
    'CREATE_USER', 'VIEW_USERS', 'UPDATE_USER', 'BAN_USER', 'UNBAN_USER',
    'DELETE_USER', 'RESTORE_USER', 'ASSIGN_ROLE', 'MANAGE_PERMISSIONS', 'VIEW_AUDIT_LOG',
    'VIEW_WALLETS', 'FREEZE_WALLET', 'UNFREEZE_WALLET', 'CREATE_WALLET', 'TRANSFER',
    'CREATE_CURRENCY', 'CREATE_TREASURY_WALLET', 'MANAGE_EXCHANGE_RATES',
    'REVIEW_KYC',
    'INITIATE_TREASURY_DISTRIBUTION', 'APPROVE_TREASURY_DISTRIBUTION',
    'VIEW_TREASURY_DISTRIBUTIONS', 'VIEW_TREASURY_MINT_OPS',
  ],
  OPERATOR: [
    'CREATE_WALLET', 'TRANSFER', 'VIEW_WALLETS', 'VIEW_TRANSFERS',
    'VIEW_TREASURY_DISTRIBUTIONS', 'VIEW_TREASURY_MINT_OPS',
  ],
  VIEWER: [
    'CREATE_WALLET', 'TRANSFER', 'VIEW_OWN_WALLET',
  ],
}

export const ALL_PERM_KEYS: string[] = PERM_CATEGORIES.flatMap((c) => c.perms.map(([k]) => k))
export const TOTAL_PERMS = ALL_PERM_KEYS.length

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve the highest-privilege staff role from a user's roles array. */
export function primaryRole(roles: string[]): StaffRole {
  if (roles.includes('ADMIN')) return 'ADMIN'
  if (roles.includes('OPERATOR')) return 'OPERATOR'
  return 'VIEWER'
}

/**
 * Compute effective permissions: role baseline + user-specific overrides.
 * Overrides are additive — they extend the preset, not replace it.
 */
export function computeEffectivePerms(roles: string[], overrides: string[]): string[] {
  const set = new Set<string>()
  for (const r of roles) {
    for (const p of ROLE_PRESETS[r as StaffRole] ?? []) set.add(p)
  }
  for (const p of overrides) set.add(p)
  return [...set].sort()
}

/** True when the effective permission set differs from the role's baseline. */
export function isCustomSet(roles: string[], effectivePerms: string[]): boolean {
  const role = primaryRole(roles)
  const baseline = new Set(ROLE_PRESETS[role])
  if (effectivePerms.length !== baseline.size) return true
  return effectivePerms.some((p) => !baseline.has(p))
}
