<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

export interface DrawerWallet {
  id: string
  asset: string
  network: string
  address: string
  balance: string
  balanceUsd: number
  status: 'active' | 'frozen'
  createdAt: string
}

export interface DrawerMovement {
  id: string
  type: 'p2p_buy' | 'p2p_sell' | 'exchange_buy' | 'exchange_sell' | 'deposit' | 'withdraw'
  asset: string
  amount: string
  amountUsd: number
  status: 'completed' | 'pending' | 'failed'
  createdAt: string
  txHash?: string
}

export interface DrawerAuditEvent {
  id: string
  action: string
  meta: string
  actor: string
  at: string
}

export interface DrawerUser {
  id: string
  fullName: string
  email: string
  phone: string
  country: { name: string; code: string; flag: string }
  role: 'user' | 'staff' | 'admin'
  twoFA: boolean
  kyc: 'L0' | 'L1' | 'L2' | 'L3'
  status: 'active' | 'banned' | 'frozen' | 'pending_kyc' | 'deleted'
  createdAt: string
  lastActive: string
  totalUsd: number
  wallets: DrawerWallet[]
  movements: DrawerMovement[]
  audit: DrawerAuditEvent[]
  flags: { banReason?: string; freezeReason?: string; deletedAt?: string }
}

export type DrawerAction = 'ban' | 'unban' | 'freeze' | 'unfreeze' | 'delete' | 'restore' | 'edit'

const props = defineProps<{ user: DrawerUser | null; open: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'action', payload: [DrawerAction, DrawerUser]): void
}>()

type TabKey = 'overview' | 'wallets' | 'movements' | 'kyc' | 'audit'
type FilterKey = 'all' | 'p2p' | 'exchange' | 'onchain'

const tab = ref<TabKey>('overview')
const filter = ref<FilterKey>('all')

watch(
  () => props.user?.id,
  () => {
    tab.value = 'overview'
    filter.value = 'all'
  },
)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

const allFrozen = computed(() => {
  const u = props.user
  if (!u) return false
  return u.wallets.length > 0 && u.wallets.every((w) => w.status === 'frozen')
})

function statusBadge(s: DrawerUser['status']) {
  const map: Record<string, string> = {
    active: 'bdg-active',
    banned: 'bdg-banned',
    frozen: 'bdg-info',
    pending_kyc: 'bdg-pending_kyc',
    deleted: 'bdg-deleted',
  }
  const label: Record<string, string> = {
    active: 'Activo',
    banned: 'Baneado',
    frozen: 'Congelado',
    pending_kyc: 'KYC pendiente',
    deleted: 'Eliminado',
  }
  return { cls: map[s] ?? 'bdg-deleted', label: label[s] ?? s }
}

function emitAction(a: DrawerAction) {
  if (props.user) emit('action', [a, props.user])
}

function copyId() {
  if (props.user) navigator.clipboard?.writeText(props.user.id).catch(() => {})
}

function shortAddr(a: string): string {
  if (a.length <= 22) return a
  return `${a.slice(0, 14)}...${a.slice(-8)}`
}

function timeAgo(_iso: string): string {
  return _iso
}

const typeLabel: Record<DrawerMovement['type'], string> = {
  p2p_buy: 'Compra P2P',
  p2p_sell: 'Venta P2P',
  exchange_buy: 'Compra Exchange',
  exchange_sell: 'Venta Exchange',
  deposit: 'Depósito',
  withdraw: 'Retiro',
}

function typeColor(t: DrawerMovement['type']): string {
  if (t === 'p2p_buy' || t === 'exchange_buy' || t === 'deposit') return 'var(--success)'
  return 'var(--danger)'
}

function statusMovBadge(s: DrawerMovement['status']) {
  if (s === 'completed') return { cls: 'bdg-active', label: 'Completado' }
  if (s === 'pending') return { cls: 'bdg-pending_kyc', label: 'Pendiente' }
  return { cls: 'bdg-banned', label: 'Fallido' }
}

const filteredMovements = computed<DrawerMovement[]>(() => {
  const u = props.user
  if (!u) return []
  if (filter.value === 'all') return u.movements
  if (filter.value === 'p2p') return u.movements.filter((m) => m.type.startsWith('p2p'))
  if (filter.value === 'exchange') return u.movements.filter((m) => m.type.startsWith('exchange'))
  return u.movements.filter((m) => m.type === 'deposit' || m.type === 'withdraw')
})

const p2pCount = computed(() => {
  const u = props.user
  if (!u) return 0
  return u.movements.filter((m) => m.type.startsWith('p2p')).length
})

const totalVolume = computed(() => {
  const u = props.user
  if (!u) return 0
  return u.movements.reduce((s, m) => s + m.amountUsd, 0)
})

const kycInfo = computed(() => {
  const u = props.user
  if (!u) return { name: '', desc: '' }
  const m: Record<string, { name: string; desc: string }> = {
    L0: { name: 'Nivel L0 · sin verificar', desc: 'Solo email verificado. Límites de operación restringidos.' },
    L1: { name: 'Nivel L1 · básica', desc: 'DNI/Pasaporte verificado. Límite USD 1.000 mensuales.' },
    L2: {
      name: 'Nivel L2 · intermedia',
      desc: 'Selfie + comprobante de domicilio. Límite USD 50.000 mensuales.',
    },
    L3: { name: 'Nivel L3 · completa', desc: 'Verificación completa con fuente de fondos. Sin límites.' },
  }
  return m[u.kyc]
})

type DocStatus = 'verified' | 'pending' | 'missing'

function docStatus(level: DrawerUser['kyc'], doc: 'dni' | 'selfie' | 'address' | 'funds'): DocStatus {
  if (doc === 'dni') return level === 'L0' ? 'missing' : 'verified'
  if (doc === 'selfie') {
    if (level === 'L0') return 'missing'
    if (level === 'L1') return 'pending'
    return 'verified'
  }
  if (doc === 'address') {
    if (level === 'L0' || level === 'L1') return 'missing'
    return 'verified'
  }
  return level === 'L3' ? 'verified' : 'missing'
}

function docBadge(s: DocStatus) {
  if (s === 'verified') return { cls: 'bdg-active', label: 'Verificado' }
  if (s === 'pending') return { cls: 'bdg-pending_kyc', label: 'En revisión' }
  return { cls: 'bdg-deleted', label: 'Sin enviar' }
}

const documents: { key: 'dni' | 'selfie' | 'address' | 'funds'; label: string }[] = [
  { key: 'dni', label: 'DNI / Pasaporte' },
  { key: 'selfie', label: 'Selfie con documento' },
  { key: 'address', label: 'Comprobante de domicilio' },
  { key: 'funds', label: 'Fuente de fondos' },
]
</script>

<template>
  <div class="scrim" :class="{ open }" @click="emit('close')"></div>
  <aside class="drawer" :class="{ open }" role="dialog" aria-modal="true">
    <template v-if="user">
      <div class="drawer-head">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          <span class="mono" style="font-size:11px; color:var(--text-3);">{{ user.id }}</span>
          <button class="copy-btn" @click="copyId" aria-label="Copy ID"><i class="pi pi-copy"></i></button>
          <span v-if="user.role === 'staff' || user.role === 'admin'" class="bdg bdg-info">Staff</span>
          <div style="flex:1;"></div>
          <button class="btn btn-ghost btn-icon" @click="emit('close')" aria-label="Close">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <div
            style="width:40px; height:40px; border-radius:50%; background:var(--accent-soft); color:var(--accent-text); font-weight:600; display:grid; place-items:center;"
          >
            {{ user.fullName.charAt(0) }}
          </div>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:600; font-size:15px;">{{ user.fullName }}</div>
            <div
              style="font-size:11.5px; color:var(--text-2); display:flex; flex-wrap:wrap; gap:8px; margin-top:2px;"
            >
              <span>{{ user.email }}</span>
              <span>{{ user.country.flag }} {{ user.country.name }}</span>
              <span class="bdg bdg-pending_kyc">{{ user.kyc }}</span>
              <span class="bdg" :class="statusBadge(user.status).cls">{{ statusBadge(user.status).label }}</span>
            </div>
          </div>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:12px;">
          <button v-if="user.status !== 'deleted'" class="btn btn-sm" @click="emitAction('edit')">
            <i class="pi pi-pencil"></i> Editar
          </button>
          <button
            v-if="user.status !== 'banned' && user.status !== 'deleted'"
            class="btn btn-sm"
            @click="emitAction('ban')"
          >
            <i class="pi pi-ban"></i> Banear
          </button>
          <button v-if="user.status === 'banned'" class="btn btn-sm" @click="emitAction('unban')">
            <i class="pi pi-check"></i> Desbanear
          </button>
          <button
            v-if="!allFrozen && user.status !== 'deleted'"
            class="btn btn-sm"
            @click="emitAction('freeze')"
          >
            <i class="pi pi-lock"></i> Congelar
          </button>
          <button
            v-if="allFrozen && user.status !== 'deleted'"
            class="btn btn-sm"
            @click="emitAction('unfreeze')"
          >
            <i class="pi pi-lock-open"></i> Descongelar
          </button>
          <button
            v-if="user.status !== 'deleted'"
            class="btn btn-sm btn-danger"
            @click="emitAction('delete')"
          >
            <i class="pi pi-trash"></i> Eliminar
          </button>
          <button v-if="user.status === 'deleted'" class="btn btn-sm" @click="emitAction('restore')">
            <i class="pi pi-refresh"></i> Restaurar
          </button>
        </div>
      </div>

      <nav class="drawer-tabs">
        <button class="drawer-tab" :class="{ active: tab === 'overview' }" @click="tab = 'overview'">
          Resumen
        </button>
        <button class="drawer-tab" :class="{ active: tab === 'wallets' }" @click="tab = 'wallets'">
          Wallets <span class="count">{{ user.wallets.length }}</span>
        </button>
        <button class="drawer-tab" :class="{ active: tab === 'movements' }" @click="tab = 'movements'">
          Movimientos <span class="count">{{ user.movements.length }}</span>
        </button>
        <button class="drawer-tab" :class="{ active: tab === 'kyc' }" @click="tab = 'kyc'">KYC</button>
        <button class="drawer-tab" :class="{ active: tab === 'audit' }" @click="tab = 'audit'">
          Auditoría <span class="count">{{ user.audit.length }}</span>
        </button>
      </nav>

      <div
        v-if="user.status === 'deleted'"
        style="display:flex; gap:10px; padding:10px 14px; font-size:12.5px; border-bottom:1px solid var(--border); background:var(--danger-soft, #fef2f2); color:var(--danger);"
      >
        Usuario eliminado
      </div>
      <div
        v-else-if="user.status === 'banned'"
        style="display:flex; gap:10px; padding:10px 14px; font-size:12.5px; border-bottom:1px solid var(--border); background:var(--danger-soft, #fef2f2); color:var(--danger);"
      >
        Cuenta baneada · Motivo: {{ user.flags.banReason }}
      </div>
      <div
        v-else-if="user.status === 'frozen'"
        style="display:flex; gap:10px; padding:10px 14px; font-size:12.5px; border-bottom:1px solid var(--border); background:var(--info-soft, #eff6ff); color:var(--info, #1d4ed8);"
      >
        Cuenta congelada · Motivo: {{ user.flags.freezeReason }}
      </div>
      <div
        v-else-if="user.status === 'pending_kyc'"
        style="display:flex; gap:10px; padding:10px 14px; font-size:12.5px; border-bottom:1px solid var(--border); background:var(--warning-soft); color:var(--warning);"
      >
        KYC pendiente.
      </div>

      <div class="drawer-body">
        <template v-if="tab === 'overview'">
          <div class="section-h">Identidad</div>
          <div
            style="background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:4px 14px; margin-bottom:16px;"
          >
            <div class="kvs">
              <div>ID</div>
              <div class="mono" style="font-size:11px;">{{ user.id }}</div>
              <div>Nombre completo</div>
              <div>{{ user.fullName }}</div>
              <div>Email</div>
              <div>{{ user.email }}</div>
              <div>Teléfono</div>
              <div class="mono">{{ user.phone }}</div>
              <div>País</div>
              <div>{{ user.country.flag }} {{ user.country.name }} ({{ user.country.code }})</div>
              <div>Rol</div>
              <div>
                <span v-if="user.role !== 'user'" class="bdg bdg-info">Staff</span>
                <span v-else>Usuario</span>
              </div>
              <div>2FA</div>
              <div>
                <span v-if="user.twoFA" style="color:var(--success);">Activado</span>
                <span v-else class="muted">Desactivado</span>
              </div>
              <div>Registro</div>
              <div>{{ user.createdAt }} <span class="muted">{{ timeAgo(user.createdAt) }}</span></div>
              <div>Última actividad</div>
              <div>{{ user.lastActive }} <span class="muted">{{ timeAgo(user.lastActive) }}</span></div>
            </div>
          </div>

          <div class="section-h">Resumen on-chain</div>
          <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:16px;">
            <div style="border:1px solid var(--border); border-radius:var(--radius); padding:12px;">
              <div style="font-size:11px; color:var(--text-2);">Saldo total</div>
              <div style="font-size:20px; font-weight:600; letter-spacing:-0.02em;">
                ${{ user.totalUsd.toLocaleString() }}
              </div>
              <div style="font-size:11px; color:var(--text-3); margin-top:2px;">
                {{ user.wallets.length }} wallets
              </div>
            </div>
            <div style="border:1px solid var(--border); border-radius:var(--radius); padding:12px;">
              <div style="font-size:11px; color:var(--text-2);">Operaciones P2P</div>
              <div style="font-size:20px; font-weight:600; letter-spacing:-0.02em;">{{ p2pCount }}</div>
              <div style="font-size:11px; color:var(--text-3); margin-top:2px;">últimos 90 días</div>
            </div>
            <div style="border:1px solid var(--border); border-radius:var(--radius); padding:12px;">
              <div style="font-size:11px; color:var(--text-2);">Volumen total</div>
              <div style="font-size:20px; font-weight:600; letter-spacing:-0.02em;">
                ${{ totalVolume.toFixed(0) }}
              </div>
              <div style="font-size:11px; color:var(--text-3); margin-top:2px;">P2P + Exchange</div>
            </div>
          </div>
        </template>

        <template v-else-if="tab === 'wallets'">
          <div class="section-h">Wallets ({{ user.wallets.length }})</div>
          <div>
            <div
              v-for="(w, i) in user.wallets"
              :key="w.id"
              :style="{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderBottom: i === user.wallets.length - 1 ? 'none' : '1px solid var(--border)',
              }"
            >
              <div
                style="width:28px; height:28px; border-radius:6px; background:var(--accent-soft); color:var(--accent-text); font-size:11px; font-weight:700; display:grid; place-items:center;"
              >
                {{ w.asset }}
              </div>
              <div style="flex:1; min-width:0;">
                <div style="display:flex; gap:6px; align-items:center;">
                  <span style="font-size:12.5px;">{{ w.network }}</span>
                  <span
                    class="bdg"
                    :class="w.status === 'active' ? 'bdg-active' : 'bdg-info'"
                  >{{ w.status === 'active' ? 'Activa' : 'Congelada' }}</span>
                  <span class="muted" style="font-size:11px;">{{ w.createdAt }}</span>
                </div>
                <div class="mono" style="font-size:11px; color:var(--text-2);">{{ shortAddr(w.address) }}</div>
              </div>
              <div style="text-align:right;">
                <div class="mono" style="font-weight:500;">{{ w.balance }} {{ w.asset }}</div>
                <div style="color:var(--text-3); font-size:11px;">≈ ${{ w.balanceUsd.toLocaleString() }}</div>
              </div>
              <button class="btn btn-sm btn-icon btn-ghost" aria-label="More">
                <i class="pi pi-ellipsis-h"></i>
              </button>
            </div>
          </div>
        </template>

        <template v-else-if="tab === 'movements'">
          <div class="filter-tabs">
            <button
              class="btn btn-sm"
              :style="filter === 'all' ? { background: 'var(--text)', color: 'var(--bg)' } : {}"
              @click="filter = 'all'"
            >
              Todos
            </button>
            <button
              class="btn btn-sm"
              :style="filter === 'p2p' ? { background: 'var(--text)', color: 'var(--bg)' } : {}"
              @click="filter = 'p2p'"
            >
              P2P
            </button>
            <button
              class="btn btn-sm"
              :style="filter === 'exchange' ? { background: 'var(--text)', color: 'var(--bg)' } : {}"
              @click="filter = 'exchange'"
            >
              Exchange
            </button>
            <button
              class="btn btn-sm"
              :style="filter === 'onchain' ? { background: 'var(--text)', color: 'var(--bg)' } : {}"
              @click="filter = 'onchain'"
            >
              On-chain
            </button>
          </div>
          <table class="tbl" style="font-size:12px; width:100%;">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Activo</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Cuando</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in filteredMovements" :key="m.id">
                <td>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span
                      :style="{
                        display: 'inline-block',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: typeColor(m.type),
                      }"
                    ></span>
                    {{ typeLabel[m.type] }}
                  </div>
                </td>
                <td>{{ m.asset }}</td>
                <td>
                  <div class="mono">{{ m.amount }} {{ m.asset }}</div>
                  <div style="color:var(--text-3); font-size:11px;">≈ ${{ m.amountUsd }}</div>
                </td>
                <td>
                  <span class="bdg" :class="statusMovBadge(m.status).cls">{{ statusMovBadge(m.status).label }}</span>
                </td>
                <td>{{ m.createdAt }}</td>
              </tr>
            </tbody>
          </table>
        </template>

        <template v-else-if="tab === 'kyc'">
          <div
            style="display:flex; gap:14px; align-items:center; padding:14px; border:1px solid var(--border); border-radius:var(--radius-lg); margin-bottom:16px;"
          >
            <div
              style="width:56px; height:56px; border-radius:14px; background:var(--accent-soft); color:var(--accent-text); font-family:var(--font-mono); font-size:18px; font-weight:700; display:grid; place-items:center;"
            >
              {{ user.kyc }}
            </div>
            <div style="flex:1;">
              <div style="font-weight:600; font-size:14px;">{{ kycInfo.name }}</div>
              <div style="color:var(--text-2); font-size:12.5px; margin-top:2px;">{{ kycInfo.desc }}</div>
            </div>
          </div>

          <div class="section-h">Documentos</div>
          <div
            style="border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden;"
          >
            <div
              v-for="(d, i) in documents"
              :key="d.key"
              :style="{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderBottom: i === documents.length - 1 ? 'none' : '1px solid var(--border)',
              }"
            >
              <div style="flex:1; font-size:12.5px;">{{ d.label }}</div>
              <span class="bdg" :class="docBadge(docStatus(user.kyc, d.key)).cls">
                {{ docBadge(docStatus(user.kyc, d.key)).label }}
              </span>
              <button
                v-if="docStatus(user.kyc, d.key) === 'verified'"
                class="btn btn-ghost btn-sm btn-icon"
                aria-label="View"
              >
                <i class="pi pi-eye"></i>
              </button>
            </div>
          </div>
        </template>

        <template v-else-if="tab === 'audit'">
          <div class="section-h">Auditoría ({{ user.audit.length }} eventos)</div>
          <div>
            <div
              v-for="(ev, i) in user.audit"
              :key="ev.id"
              :style="{
                display: 'flex',
                gap: '10px',
                padding: '8px 0',
                borderBottom: i === user.audit.length - 1 ? 'none' : '1px solid var(--border)',
              }"
            >
              <span
                style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--accent); margin-top:6px; flex-shrink:0;"
              ></span>
              <div style="flex:1; min-width:0;">
                <div style="font-size:13px; font-weight:500;">{{ ev.action }}</div>
                <div style="font-size:11.5px; color:var(--text-2);">
                  {{ ev.meta }} · por <span class="mono" style="color:var(--text-2);">{{ ev.actor }}</span>
                </div>
              </div>
              <div style="font-size:11px; color:var(--text-3); white-space:nowrap;">{{ ev.at }}</div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </aside>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 199;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.22s;
}
.scrim.open {
  opacity: 1;
  pointer-events: all;
}
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 480px;
  background: var(--surface);
  border-left: 1px solid var(--border);
  z-index: 200;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.drawer.open {
  transform: translateX(0);
}
.drawer-head {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.drawer-tabs {
  display: flex;
  padding: 0 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 0;
}
.drawer-tab {
  padding: 10px 12px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-2);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.drawer-tab.active {
  color: var(--text);
  border-bottom-color: var(--accent-text);
}
.drawer-tab:hover {
  color: var(--text);
}
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}
.section-h {
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-2);
  margin: 0 0 8px;
}
.kvs {
  display: grid;
  grid-template-columns: 140px 1fr;
  font-size: 12.5px;
}
.kvs > div {
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
}
.kvs > div:nth-child(odd) {
  color: var(--text-2);
}
.kvs > div:nth-child(even) {
  color: var(--text);
}
.kvs > div:last-child,
.kvs > div:nth-last-child(2) {
  border-bottom: none;
}
.count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 10.5px;
  font-weight: 600;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  padding: 0 5px;
}
.filter-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}
</style>
