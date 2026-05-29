// usePermissions.ts — permission catalog, role presets, and shared types

export type PermKey = string

export interface PermCategoryEntry {
  key: PermKey
  label: string
  desc: string
}

export interface PermCategory {
  id: string
  label: string
  desc: string
  color: string
  perms: [PermKey, string, string][]
}

export type StaffRole = 'ADMIN' | 'OPERATOR' | 'VIEWER'

export interface StaffUser {
  id: string
  name: string
  email: string
  role: StaffRole
  country: string
  perms: PermKey[]
  custom: boolean
  last: string
}

export const PERM_CATEGORIES: PermCategory[] = [
  {
    id: 'mint',
    label: 'Acuñación · Mint',
    desc: 'Crear y destruir tokens nativos.',
    color: '#7c3aed',
    perms: [
      ['mint.tokens', 'Mint', 'Crear tokens nativos en una wallet'],
      ['mint.burn', 'Burn', 'Destruir tokens existentes'],
      ['mint.cusd', 'Mint stablecoin (cUSD)', 'Acuñar la moneda estable nativa'],
    ],
  },
  {
    id: 'tx',
    label: 'Transacciones',
    desc: 'Aprobar, rechazar o cancelar operaciones en curso.',
    color: '#0891b2',
    perms: [
      ['tx.approve', 'Aprobar transacciones', 'Liberar TX retenidas por reglas AML'],
      ['tx.reject', 'Rechazar transacciones', 'Bloquear TX antes de incluirse en bloque'],
      ['tx.cancel', 'Cancelar pendientes', 'Sacar TX del mempool antes de minar'],
    ],
  },
  {
    id: 'wallet',
    label: 'Wallets',
    desc: 'Acciones sobre wallets de usuarios.',
    color: '#1f7a3a',
    perms: [
      ['wallet.freeze', 'Congelar wallets', 'Pausar operativa de cualquier wallet'],
      ['wallet.unfreeze', 'Descongelar wallets', 'Reactivar wallets congeladas'],
      ['wallet.create_for_user', 'Crear wallet para usuario', 'Generar par de llaves a nombre de otro'],
    ],
  },
  {
    id: 'user',
    label: 'Usuarios',
    desc: 'Gestión de cuentas de usuarios finales.',
    color: '#c2410c',
    perms: [
      ['user.create', 'Crear usuarios', 'Onboarding manual desde admin'],
      ['user.edit', 'Editar datos', 'Cambiar email, nombre, KYC'],
      ['user.delete', 'Soft-delete', 'Inactivar cuenta + congelar wallets'],
      ['user.ban', 'Banear / desbanear', 'Bloquear acceso a la plataforma'],
      ['user.assign_perm', 'Asignar permisos', 'Modificar permisos de otros usuarios'],
    ],
  },
  {
    id: 'treasury',
    label: 'Tesorería',
    desc: 'Movimiento de fondos corporativos.',
    color: '#ad2820',
    perms: [
      ['treasury.move', 'Mover entre wallets', 'Cold ↔ Hot ↔ Fee'],
      ['treasury.distribute', 'Emitir a usuarios', 'Crear distribución masiva'],
      ['treasury.approve_dual', 'Firmar 2ª aprobación', 'Segunda firma en aprobación dual'],
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance',
    desc: 'Revisión KYC, AML y disputas.',
    color: '#0e7490',
    perms: [
      ['compliance.review', 'Revisar casos', 'Aprobar/rechazar KYC y AML'],
      ['compliance.dispute', 'Resolver disputas P2P', 'Decidir en disputas escaladas'],
      ['compliance.export', 'Exportar reportes', 'Generar SAR/STR firmados'],
    ],
  },
  {
    id: 'platform',
    label: 'Plataforma',
    desc: 'Configuración global y auditoría.',
    color: '#5b21b6',
    perms: [
      ['platform.settings', 'Editar ajustes', 'Cambios de configuración global'],
      ['platform.audit_view', 'Ver auditoría', 'Acceder al log de auditoría'],
      ['platform.audit_export', 'Exportar firmado', 'Descargar log con firma HMAC'],
      ['platform.mine', 'Minar bloques', 'Disparar PoW manualmente'],
    ],
  },
]

export const ROLE_PRESETS: Record<StaffRole, PermKey[]> = {
  ADMIN: [
    'mint.tokens', 'mint.burn', 'mint.cusd',
    'tx.approve', 'tx.reject', 'tx.cancel',
    'wallet.freeze', 'wallet.unfreeze', 'wallet.create_for_user',
    'user.create', 'user.edit', 'user.delete', 'user.ban', 'user.assign_perm',
    'treasury.move', 'treasury.distribute', 'treasury.approve_dual',
    'compliance.review', 'compliance.dispute', 'compliance.export',
    'platform.settings', 'platform.audit_view', 'platform.audit_export', 'platform.mine',
  ],
  OPERATOR: [
    'tx.approve', 'tx.reject',
    'wallet.freeze', 'wallet.unfreeze',
    'user.edit', 'user.ban',
    'compliance.review', 'compliance.dispute',
    'platform.audit_view',
  ],
  VIEWER: [],
}

export function isCustomSet(user: StaffUser): boolean {
  const preset = new Set(ROLE_PRESETS[user.role])
  if (user.perms.length !== preset.size) return true
  return user.perms.some((p) => !preset.has(p))
}

export const STAFF_USERS: StaffUser[] = [
  {
    id: 'usr_admin_01',
    name: 'María Acosta',
    email: 'admin@dropi.co',
    role: 'ADMIN',
    country: '🇦🇷',
    perms: [...ROLE_PRESETS.ADMIN],
    custom: false,
    last: 'hace 2 d',
  },
  {
    id: 'usr_admin_02',
    name: 'Sergio Romero',
    email: 'sergio@dropi.co',
    role: 'ADMIN',
    country: '🇦🇷',
    perms: [...ROLE_PRESETS.ADMIN],
    custom: false,
    last: 'hace 1 sem',
  },
  {
    id: 'usr_admin_03',
    name: 'Daniela Kim',
    email: 'daniela@dropi.co',
    role: 'ADMIN',
    country: '🇲🇽',
    perms: ROLE_PRESETS.ADMIN.filter((p) => p !== 'user.delete'),
    custom: true,
    last: 'hace 3 d',
  },
  {
    id: 'usr_op_01',
    name: 'Pablo Iturri',
    email: 'pablo@dropi.co',
    role: 'OPERATOR',
    country: '🇦🇷',
    perms: [...ROLE_PRESETS.OPERATOR],
    custom: false,
    last: 'hace 4 h',
  },
  {
    id: 'usr_op_02',
    name: 'Renata Vega',
    email: 'renata@dropi.co',
    role: 'OPERATOR',
    country: '🇨🇴',
    perms: [...ROLE_PRESETS.OPERATOR, 'compliance.export'],
    custom: true,
    last: 'hace 1 d',
  },
  {
    id: 'usr_op_03',
    name: 'Tomás Acosta',
    email: 'tomas@dropi.co',
    role: 'OPERATOR',
    country: '🇨🇴',
    perms: [...ROLE_PRESETS.OPERATOR],
    custom: false,
    last: 'hace 12 h',
  },
  {
    id: 'usr_view_01',
    name: 'Lucía González',
    email: 'lucia@gmail.com',
    role: 'VIEWER',
    country: '🇨🇱',
    perms: [],
    custom: false,
    last: '—',
  },
]

export const TOTAL_PERMS = PERM_CATEGORIES.reduce((s, c) => s + c.perms.length, 0)
