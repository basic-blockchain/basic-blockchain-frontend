<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  listUsers, listAllWallets, banUser, unbanUser, softDeleteUser, restoreUser,
  updateUser, grantRole, revokeRole,
  type AdminUser, type WalletAdminRecord,
} from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import UserDrawer, { type DrawerUser, type DrawerAction } from '@/components/drawers/UserDrawer.vue'
import ConfirmUserModal from '@/components/modals/ConfirmUserModal.vue'
import type { UserAction, ConfirmUserTarget } from '@/components/modals/ConfirmUserModal.vue'

const auth = useAuthStore()
const users = ref<AdminUser[]>([])
const wallets = ref<WalletAdminRecord[]>([])
const loading = ref(false)
const error = ref('')

const editTarget = ref<AdminUser | null>(null)
const editForm = ref({ display_name: '', email: '' })

const confirmModal = ref<{ action: UserAction; target: ConfirmUserTarget; userId: string } | null>(null)

function userTotals(userId: string): { walletCount: number; totalUsd: number } {
  let walletCount = 0
  let totalUsd = 0
  for (const w of wallets.value) {
    if (w.user_id !== userId) continue
    walletCount += 1
    const n = Number(w.balance)
    if (Number.isFinite(n)) totalUsd += n
  }
  return { walletCount, totalUsd }
}

function openConfirm(u: AdminUser, action: UserAction) {
  const totals = userTotals(u.user_id)
  confirmModal.value = {
    action,
    userId: u.user_id,
    target: {
      fullName: u.display_name,
      email: u.email ?? u.username,
      walletCount: totals.walletCount,
      totalUsd: totals.totalUsd,
    },
  }
}

async function handleConfirm(payload: { action: UserAction }) {
  if (!confirmModal.value) return
  const u = users.value.find((x) => x.user_id === confirmModal.value!.userId)
  if (!u) { confirmModal.value = null; return }
  try {
    if (payload.action === 'ban') await banUser(u.user_id)
    else if (payload.action === 'unban') await unbanUser(u.user_id)
    else if (payload.action === 'delete') await softDeleteUser(u.user_id)
    else if (payload.action === 'restore') await restoreUser(u.user_id)
    drawerOpen.value = false
    await load()
  } catch { /* handled by existing error display */ }
  confirmModal.value = null
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [usersRes, walletsRes] = await Promise.all([listUsers(), listAllWallets()])
    users.value = usersRes.users
    wallets.value = walletsRes.wallets
  } catch (e: unknown) {
    error.value = String(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

function userStatus(u: AdminUser): 'deleted' | 'banned' | 'active' {
  if (u.deleted_at) return 'deleted'
  if (u.banned) return 'banned'
  return 'active'
}

function openEdit(u: AdminUser) {
  editTarget.value = u
  editForm.value = { display_name: u.display_name, email: u.email ?? '' }
}

function closeEdit() { editTarget.value = null }

async function submitEdit() {
  if (!editTarget.value) return
  await updateUser(editTarget.value.user_id, {
    display_name: editForm.value.display_name || undefined,
    email: editForm.value.email || undefined,
  })
  closeEdit()
  await load()
}

const ROLES = ['ADMIN', 'OPERATOR', 'VIEWER']
async function toggleRole(u: AdminUser, role: string) {
  if (u.roles.includes(role)) await revokeRole(u.user_id, role)
  else await grantRole(u.user_id, role)
  await load()
}

const isSelf = (u: AdminUser) => u.user_id === auth.user?.user_id

const drawerUser = ref<DrawerUser | null>(null)
const drawerOpen = ref(false)

function toDrawerUser(u: AdminUser): DrawerUser {
  const status = u.deleted_at ? 'deleted' : u.banned ? 'banned' : 'active'
  const totals = userTotals(u.user_id)
  return {
    id: u.user_id,
    fullName: u.display_name,
    email: u.email ?? u.username,
    phone: '—',
    country: { name: '—', code: '—', flag: '🌐' },
    role: u.roles?.includes('ADMIN') ? 'admin' : u.roles?.includes('OPERATOR') ? 'staff' : 'user',
    twoFA: false,
    kyc: 'L1',
    status,
    createdAt: u.created_at ?? new Date().toISOString(),
    lastActive: u.created_at ?? new Date().toISOString(),
    totalUsd: totals.totalUsd,
    wallets: [],
    movements: [],
    audit: [],
    flags: {},
  }
}

function openDrawer(u: AdminUser) {
  drawerUser.value = toDrawerUser(u)
  drawerOpen.value = true
}

const DRAWER_TO_CONFIRM: Partial<Record<DrawerAction, UserAction>> = {
  ban: 'ban',
  unban: 'unban',
  delete: 'delete',
  restore: 'restore',
  freeze: 'freeze',
  unfreeze: 'unfreeze',
}

function handleDrawerAction(action: DrawerAction, user: DrawerUser) {
  if (action === 'edit') {
    const u = users.value.find((x) => x.user_id === user.id)
    if (u) openEdit(u)
    return
  }
  const mapped = DRAWER_TO_CONFIRM[action]
  if (!mapped) return
  const u = users.value.find((x) => x.user_id === user.id)
  if (!u) return
  openConfirm(u, mapped)
}
</script>

<template>
  <div class="users-view">
    <div class="page-h">
      <div>
        <h1>Usuarios</h1>
        <p>Gestión de usuarios, roles y estado de cuentas</p>
      </div>
      <button class="btn-ghost" :disabled="loading" @click="load">
        <span class="pi pi-refresh" :class="{ 'pi-spin': loading }" aria-hidden="true" />
        Actualizar
      </button>
    </div>

    <div v-if="error" class="inline-alert danger">{{ error }}</div>
    <div v-if="loading" class="loading-row">
      <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
    </div>

    <div v-else class="panel">
      <div class="panel-h">
        <span>Todos los usuarios</span>
        <span class="count-badge sm">{{ users.length }}</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Roles</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.user_id" :class="{ 'row-muted': !!u.deleted_at }" style="cursor:pointer" @click="openDrawer(u)">
            <td class="user-cell">
              <span class="display-name">{{ u.display_name }}</span>
              <span class="username">@{{ u.username }}</span>
              <span v-if="u.email" class="email">{{ u.email }}</span>
            </td>
            <td class="roles-cell">
              <button
                v-for="role in ROLES"
                :key="role"
                class="role-chip"
                :class="{ active: u.roles.includes(role) }"
                :disabled="isSelf(u) && role === 'ADMIN'"
                :title="u.roles.includes(role) ? `Revocar ${role}` : `Otorgar ${role}`"
                @click="toggleRole(u, role)"
              >{{ role }}</button>
            </td>
            <td>
              <span class="status-dot" :class="userStatus(u)">
                {{ userStatus(u) === 'active' ? 'Activo' : userStatus(u) === 'banned' ? 'Baneado' : 'Eliminado' }}
              </span>
            </td>
            <td class="actions-cell" @click.stop>
              <template v-if="!u.deleted_at">
                <button class="btn-sm btn-edit" @click="openEdit(u)">Editar</button>
                <button class="btn-sm" :class="u.banned ? 'btn-success' : 'btn-danger'" :disabled="isSelf(u)" @click="openConfirm(u, u.banned ? 'unban' : 'ban')">
                  {{ u.banned ? 'Desbanear' : 'Banear' }}
                </button>
                <button class="btn-sm btn-danger" :disabled="isSelf(u)" @click="openConfirm(u, 'delete')">Eliminar</button>
              </template>
              <template v-else>
                <button class="btn-sm btn-success" @click="openConfirm(u, 'restore')">Restaurar</button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Edit modal -->
    <div v-if="editTarget" class="modal-overlay" @click.self="closeEdit">
      <div class="modal">
        <div class="modal-h">Editar @{{ editTarget.username }}</div>
        <div class="modal-body">
          <div class="field">
            <label class="field-label" for="edit-name">Nombre</label>
            <input id="edit-name" v-model="editForm.display_name" class="field-input" type="text" maxlength="255" />
          </div>
          <div class="field">
            <label class="field-label" for="edit-email">Email</label>
            <input id="edit-email" v-model="editForm.email" class="field-input" type="email" maxlength="255" />
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="closeEdit">Cancelar</button>
          <button class="btn-primary" @click="submitEdit">Guardar</button>
        </div>
      </div>
    </div>

    <UserDrawer
      :user="drawerUser"
      :open="drawerOpen"
      @close="drawerOpen = false"
      @action="([action, user]) => handleDrawerAction(action, user)"
    />
  </div>

  <Teleport to="body">
    <ConfirmUserModal
      v-if="confirmModal"
      :action="confirmModal.action"
      :user="confirmModal.target"
      @close="confirmModal = null"
      @confirm="handleConfirm"
    />
  </Teleport>
</template>

<style scoped>
.users-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-h {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}
.page-h h1 {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.015em;
  margin: 0 0 2px;
  color: var(--text);
}
.page-h p { margin: 0; font-size: 13px; color: var(--text-2); }

.btn-ghost {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  font-family: var(--font-sans);
}
.btn-ghost:hover:not(:disabled) { background: var(--hover); color: var(--text); }
.btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

.inline-alert { padding: 10px 14px; border-radius: var(--radius); border: 1px solid var(--border); font-size: 13px; }
.inline-alert.danger { background: var(--danger-soft); border-color: var(--danger); color: var(--danger); }
.loading-row { display: flex; align-items: center; gap: 8px; color: var(--text-2); font-size: 13px; }

/* Panel + table */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.panel-h {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.data-table { width: 100%; border-collapse: collapse; }
.data-table th {
  text-align: left;
  padding: 8px 14px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.data-table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
  font-size: 13px;
}
.data-table tr:last-child td { border-bottom: none; }
.row-muted td { opacity: 0.5; }

.user-cell { display: flex; flex-direction: column; gap: 2px; }
.display-name { font-weight: 600; color: var(--text); }
.username { color: var(--text-2); font-size: 12px; }
.email { color: var(--text-3); font-size: 11.5px; }

.roles-cell { display: flex; gap: 4px; flex-wrap: wrap; }
.role-chip {
  padding: 2px 8px;
  border-radius: 20px;
  border: 1px solid var(--border-strong);
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s;
}
.role-chip.active { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); font-weight: 600; }
.role-chip:disabled { opacity: 0.4; cursor: not-allowed; }

.status-dot {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 20px;
}
.status-dot.active   { background: var(--success-soft); color: var(--success); }
.status-dot.banned   { background: var(--danger-soft);  color: var(--danger); }
.status-dot.deleted  { background: var(--muted-soft);   color: var(--muted); }

.actions-cell { display: flex; gap: 4px; flex-wrap: wrap; align-items: flex-start; }
.btn-sm {
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  font-family: var(--font-sans);
}
.btn-edit    { background: var(--surface-2); border: 1px solid var(--border); color: var(--text-2); }
.btn-success { background: var(--success-soft); color: var(--success); }
.btn-danger  { background: var(--danger-soft);  color: var(--danger); }
.btn-sm:disabled { opacity: 0.4; cursor: not-allowed; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 420px;
  max-width: 92vw;
  overflow: hidden;
}
.modal-h {
  padding: 14px 18px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.modal-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
.modal.modal-danger .modal-h { background: var(--danger-soft); color: var(--danger); border-color: var(--danger); }
.modal-text { font-size: 13px; color: var(--text-2); margin: 0; }
.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 12px 18px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}

.field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 12px; font-weight: 500; color: var(--text-2); }
.field-input {
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  font-size: 13px;
  outline: none;
  font-family: var(--font-sans);
}
.field-input:focus { border-color: var(--accent); }

.btn-primary {
  padding: 7px 14px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--font-sans);
}
.btn-danger-solid {
  padding: 7px 14px;
  background: var(--danger);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.count-badge.sm { font-size: 11px; padding: 1px 7px; }

@media (max-width: 900px) {
  .data-table th:nth-child(2),
  .data-table td:nth-child(2) { display: none; }
}
@media (max-width: 640px) {
  .page-h { flex-direction: column; align-items: flex-start; }
}
</style>
