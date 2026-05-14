<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  listUsers, banUser, unbanUser, softDeleteUser, restoreUser, updateUser,
  type AdminUser,
} from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import UserDrawer, { type DrawerUser, type DrawerAction } from '@/components/drawers/UserDrawer.vue'

const auth = useAuthStore()
const users = ref<AdminUser[]>([])
const loading = ref(false)
const error = ref('')

const editTarget = ref<AdminUser | null>(null)
const editForm = ref({ display_name: '', email: '' })


async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await listUsers()
    users.value = res.users
  } catch (e: unknown) {
    error.value = String(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

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

const isSelf = (u: AdminUser) => u.user_id === auth.user?.user_id

type FilterTab = 'all' | 'active' | 'banned' | 'deleted'
const activeTab = ref<FilterTab>('all')

const filteredUsers = computed(() => {
  switch (activeTab.value) {
    case 'active':  return users.value.filter((u) => !u.banned && !u.deleted_at)
    case 'banned':  return users.value.filter((u) => u.banned && !u.deleted_at)
    case 'deleted': return users.value.filter((u) => !!u.deleted_at)
    default:        return users.value
  }
})

function avatarColor(name: string): string {
  const palette = ['#7c3aed','#0284c7','#16a34a','#d97706','#db2777','#dc2626']
  return palette[name.charCodeAt(0) % palette.length]
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return iso }
}

const totalCount   = computed(() => users.value.length)
const activeCount  = computed(() => users.value.filter((u) => !u.banned && !u.deleted_at).length)
const bannedCount  = computed(() => users.value.filter((u) => u.banned && !u.deleted_at).length)
const deletedCount = computed(() => users.value.filter((u) => !!u.deleted_at).length)

const drawerUser = ref<DrawerUser | null>(null)
const drawerOpen = ref(false)

function toDrawerUser(u: AdminUser): DrawerUser {
  const status = u.deleted_at ? 'deleted' : u.banned ? 'banned' : 'active'
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
    totalUsd: 0,
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

async function handleDrawerAction(action: DrawerAction, user: DrawerUser) {
  const u = users.value.find((x) => x.user_id === user.id)
  if (!u) return
  if (action === 'edit') {
    openEdit(u)
    drawerOpen.value = false
    return
  }
  if (isSelf(u) && (action === 'ban' || action === 'delete')) return
  if (action === 'ban') await banUser(u.user_id)
  else if (action === 'unban') await unbanUser(u.user_id)
  else if (action === 'delete') await softDeleteUser(u.user_id)
  else if (action === 'restore') await restoreUser(u.user_id, true)
  drawerOpen.value = false
  await load()
  drawerUser.value = null
}
</script>

<template>
  <div class="users-view">
    <div class="page-h">
      <div>
        <h1>Usuarios</h1>
        <p>Gestión de usuarios, roles y estado de cuentas</p>
      </div>
      <button class="btn btn-ghost" :disabled="loading" @click="load">
        <span class="pi pi-refresh" :class="{ 'pi-spin': loading }" aria-hidden="true" />
        Actualizar
      </button>
    </div>

    <div class="bigstat-row">
      <div class="bigstat">
        <div class="lb">Usuarios</div>
        <div class="vl">{{ totalCount }}</div>
        <div class="ds">registrados en total</div>
      </div>
      <div class="bigstat">
        <div class="lb">Activos</div>
        <div class="vl vl-ok">{{ activeCount }}</div>
        <div class="ds">cuentas operativas</div>
      </div>
      <div class="bigstat">
        <div class="lb">Baneados</div>
        <div class="vl" :class="{ 'vl-warn': bannedCount > 0 }">{{ bannedCount }}</div>
        <div class="ds">acceso restringido</div>
      </div>
      <div class="bigstat">
        <div class="lb">Eliminados</div>
        <div class="vl" :class="{ 'vl-danger': deletedCount > 0 }">{{ deletedCount }}</div>
        <div class="ds">soft-delete activo</div>
      </div>
    </div>

    <div v-if="error" class="inline-alert danger">{{ error }}</div>
    <div v-if="loading" class="loading-row">
      <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
    </div>

    <div class="panel">
      <div class="panel-h">
        <nav class="filter-tabs" aria-label="Filtrar usuarios">
          <button class="filter-tab" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">
            Todos <span class="tab-count">{{ totalCount }}</span>
          </button>
          <button class="filter-tab" :class="{ active: activeTab === 'active' }" @click="activeTab = 'active'">
            Activos <span class="tab-count">{{ activeCount }}</span>
          </button>
          <button class="filter-tab" :class="{ active: activeTab === 'banned' }" @click="activeTab = 'banned'">
            Baneados <span class="tab-count">{{ bannedCount }}</span>
          </button>
          <button class="filter-tab" :class="{ active: activeTab === 'deleted' }" @click="activeTab = 'deleted'">
            Eliminados <span class="tab-count">{{ deletedCount }}</span>
          </button>
        </nav>
        <span class="panel-h-spacer" />
        <button class="btn btn-sm" disabled title="Próximamente">
          <span class="pi pi-user-plus" aria-hidden="true" /> Crear usuario
        </button>
      </div>

      <div v-if="loading" class="loading-row" style="padding: 24px 16px;">
        <span class="pi pi-spin pi-spinner" aria-hidden="true" /> Cargando…
      </div>
      <div v-else-if="filteredUsers.length === 0" class="empty-row">
        Sin usuarios en esta categoría.
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Estado</th>
            <th>Roles</th>
            <th>Registro</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="u in filteredUsers"
            :key="u.user_id"
            class="row-click"
            :class="{ 'row-deleted': !!u.deleted_at }"
            @click="openDrawer(u)"
          >
            <td class="user-cell">
              <div
                class="u-avatar"
                :style="{ background: avatarColor(u.display_name) }"
                aria-hidden="true"
              >{{ u.display_name.charAt(0).toUpperCase() }}</div>
              <div class="u-info">
                <span class="u-name">{{ u.display_name }}</span>
                <span class="u-handle">@{{ u.username }}</span>
                <span v-if="u.email" class="u-email">{{ u.email }}</span>
              </div>
            </td>
            <td>
              <span class="bdg" :class="
                u.deleted_at ? 'bdg-deleted' :
                u.banned     ? 'bdg-banned'  : 'bdg-active'
              ">
                {{ u.deleted_at ? 'Eliminado' : u.banned ? 'Baneado' : 'Activo' }}
              </span>
            </td>
            <td class="roles-cell">
              <span
                v-for="role in u.roles"
                :key="role"
                class="bdg bdg-info sm"
              >{{ role }}</span>
            </td>
            <td class="muted xs mono">{{ formatDate(u.created_at) }}</td>
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
          <button class="btn btn-ghost" @click="closeEdit">Cancelar</button>
          <button class="btn btn-primary" @click="submitEdit">Guardar</button>
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

/* Panel + filter tabs */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.panel-h {
  display: flex;
  align-items: center;
  gap: 0;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
  padding-right: 12px;
}
.panel-h-spacer { flex: 1; }

.filter-tabs { display: flex; }
.filter-tab {
  padding: 10px 14px;
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
  font-family: var(--font-sans);
  transition: color 0.12s;
}
.filter-tab:hover { color: var(--text); }
.filter-tab.active { color: var(--text); border-bottom-color: var(--accent); font-weight: 600; }
.tab-count {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-3);
  font-size: 10.5px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 8px;
}
.filter-tab.active .tab-count { background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--accent); border-color: transparent; }

/* Table */
.data-table { width: 100%; border-collapse: collapse; }
.data-table th {
  text-align: left;
  padding: 8px 14px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.data-table td {
  padding: 11px 14px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
  font-size: 13px;
}
.data-table tr:last-child td { border-bottom: none; }
.row-click { cursor: pointer; }
.row-click:hover td { background: var(--surface-2); }
.row-deleted td { opacity: 0.55; }

/* User cell */
.user-cell { display: flex; align-items: center; gap: 10px; }
.u-avatar {
  width: 34px; height: 34px;
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.u-info { display: flex; flex-direction: column; gap: 1px; }
.u-name   { font-weight: 600; font-size: 13px; color: var(--text); }
.u-handle { font-size: 11.5px; color: var(--text-2); }
.u-email  { font-size: 11px; color: var(--text-3); }

.roles-cell { display: flex; gap: 4px; flex-wrap: wrap; }
.mono  { font-family: var(--font-mono); }
.xs    { font-size: 11.5px; }
.muted { color: var(--text-3); }
.empty-row { padding: 32px; text-align: center; color: var(--text-3); font-size: 13px; }

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

/* Bigstat KPI row */
.bigstat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.bigstat {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
}
.lb  { font-size: 11.5px; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.04em; }
.vl  { font-size: 26px; font-weight: 600; letter-spacing: -0.02em; margin: 4px 0; color: var(--text); font-variant-numeric: tabular-nums; }
.ds  { font-size: 11.5px; color: var(--text-3); }
.vl-ok     { color: var(--success); }
.vl-warn   { color: var(--warning); }
.vl-danger { color: var(--danger); }

@media (max-width: 900px) {
  .bigstat-row { grid-template-columns: repeat(2, 1fr); }
  .data-table th:nth-child(2),
  .data-table td:nth-child(2) { display: none; }
}
@media (max-width: 640px) {
  .page-h { flex-direction: column; align-items: flex-start; }
}
</style>
