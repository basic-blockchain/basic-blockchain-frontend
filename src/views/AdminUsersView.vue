<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  listUsers,
  banUser,
  unbanUser,
  softDeleteUser,
  restoreUser,
  updateUser,
  grantRole,
  revokeRole,
  type AdminUser,
} from '@/api/admin'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const users = ref<AdminUser[]>([])
const loading = ref(false)
const error = ref('')

// Edit modal state
const editTarget = ref<AdminUser | null>(null)
const editForm = ref({ display_name: '', email: '' })

// Confirm delete state
const deleteTarget = ref<AdminUser | null>(null)

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

function userStatus(u: AdminUser): 'deleted' | 'banned' | 'active' {
  if (u.deleted_at) return 'deleted'
  if (u.banned) return 'banned'
  return 'active'
}

function statusLabel(u: AdminUser) {
  const s = userStatus(u)
  return s === 'deleted' ? 'Deleted' : s === 'banned' ? 'Banned' : 'Active'
}

function statusClass(u: AdminUser) {
  const s = userStatus(u)
  return s === 'deleted' ? 'status-deleted' : s === 'banned' ? 'status-banned' : 'status-active'
}

function openEdit(u: AdminUser) {
  editTarget.value = u
  editForm.value = { display_name: u.display_name, email: u.email ?? '' }
}

function closeEdit() {
  editTarget.value = null
}

async function submitEdit() {
  if (!editTarget.value) return
  await updateUser(editTarget.value.user_id, {
    display_name: editForm.value.display_name || undefined,
    email: editForm.value.email || undefined,
  })
  closeEdit()
  await load()
}

async function toggleBan(u: AdminUser) {
  if (u.banned) await unbanUser(u.user_id)
  else await banUser(u.user_id)
  await load()
}

function confirmDelete(u: AdminUser) {
  deleteTarget.value = u
}

async function executeDelete() {
  if (!deleteTarget.value) return
  await softDeleteUser(deleteTarget.value.user_id)
  deleteTarget.value = null
  await load()
}

async function restore(u: AdminUser) {
  await restoreUser(u.user_id, true)
  await load()
}

// Role management
const ROLES = ['ADMIN', 'OPERATOR', 'VIEWER']
async function toggleRole(u: AdminUser, role: string) {
  if (u.roles.includes(role)) await revokeRole(u.user_id, role)
  else await grantRole(u.user_id, role)
  await load()
}

const isSelf = (u: AdminUser) => u.user_id === auth.user?.user_id
</script>

<template>
  <div class="admin-users">
    <div class="page-header">
      <h1>Users</h1>
      <button
        class="btn-secondary"
        :disabled="loading"
        @click="load"
      >
        Refresh
      </button>
    </div>

    <div
      v-if="error"
      class="error-banner"
    >
      {{ error }}
    </div>

    <div
      v-if="loading"
      class="loading"
    >
      Loading…
    </div>

    <table
      v-else
      class="users-table"
    >
      <thead>
        <tr>
          <th>User</th>
          <th>Roles</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="u in users"
          :key="u.user_id"
          :class="{ 'row-deleted': !!u.deleted_at }"
        >
          <td class="user-cell">
            <span class="display-name">{{ u.display_name }}</span>
            <span class="username">@{{ u.username }}</span>
            <span
              v-if="u.email"
              class="email"
            >{{ u.email }}</span>
          </td>
          <td class="roles-cell">
            <button
              v-for="role in ROLES"
              :key="role"
              class="role-chip"
              :class="{ 'role-active': u.roles.includes(role) }"
              :disabled="isSelf(u) && role === 'ADMIN'"
              :title="u.roles.includes(role) ? `Revoke ${role}` : `Grant ${role}`"
              @click="toggleRole(u, role)"
            >
              {{ role }}
            </button>
          </td>
          <td>
            <span
              :class="statusClass(u)"
              class="status-badge"
            >{{ statusLabel(u) }}</span>
          </td>
          <td class="actions-cell">
            <template v-if="!u.deleted_at">
              <button
                class="btn-sm btn-edit"
                @click="openEdit(u)"
              >
                Edit
              </button>
              <button
                class="btn-sm"
                :class="u.banned ? 'btn-unban' : 'btn-ban'"
                :disabled="isSelf(u)"
                @click="toggleBan(u)"
              >
                {{ u.banned ? 'Unban' : 'Ban' }}
              </button>
              <button
                class="btn-sm btn-delete"
                :disabled="isSelf(u)"
                @click="confirmDelete(u)"
              >
                Delete
              </button>
            </template>
            <template v-else>
              <button
                class="btn-sm btn-restore"
                @click="restore(u)"
              >
                Restore
              </button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Edit modal -->
    <div
      v-if="editTarget"
      class="modal-overlay"
      @click.self="closeEdit"
    >
      <div class="modal">
        <h2>Edit {{ editTarget.username }}</h2>
        <label>Display name
          <input
            v-model="editForm.display_name"
            type="text"
            maxlength="255"
          >
        </label>
        <label>Email
          <input
            v-model="editForm.email"
            type="email"
            maxlength="255"
          >
        </label>
        <div class="modal-actions">
          <button
            class="btn-secondary"
            @click="closeEdit"
          >
            Cancel
          </button>
          <button
            class="btn-primary"
            @click="submitEdit"
          >
            Save
          </button>
        </div>
      </div>
    </div>

    <!-- Delete confirm modal -->
    <div
      v-if="deleteTarget"
      class="modal-overlay"
      @click.self="deleteTarget = null"
    >
      <div class="modal modal-danger">
        <h2>Delete {{ deleteTarget.username }}?</h2>
        <p>This is a soft-delete. All wallets will be frozen. The user can be restored later.</p>
        <div class="modal-actions">
          <button
            class="btn-secondary"
            @click="deleteTarget = null"
          >
            Cancel
          </button>
          <button
            class="btn-danger"
            @click="executeDelete"
          >
            Confirm delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-users { padding: 1.5rem; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 600; }
.users-table { width: 100%; border-collapse: collapse; }
.users-table th { text-align: left; padding: 0.5rem 1rem; color: var(--text-muted, #888); font-size: 0.75rem; text-transform: uppercase; border-bottom: 1px solid var(--border, #333); }
.users-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border, #222); vertical-align: top; }
.row-deleted td { opacity: 0.55; }
.user-cell { display: flex; flex-direction: column; gap: 0.2rem; }
.display-name { font-weight: 600; }
.username { color: var(--text-muted, #888); font-size: 0.85rem; }
.email { color: var(--text-muted, #888); font-size: 0.8rem; }
.roles-cell { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.role-chip { padding: 0.2rem 0.6rem; border-radius: 9999px; border: 1px solid var(--border, #555); background: transparent; color: var(--text-muted, #aaa); cursor: pointer; font-size: 0.75rem; transition: all 0.15s; }
.role-chip.role-active { border-color: var(--accent, #7c5cfc); color: var(--accent, #7c5cfc); font-weight: 600; }
.role-chip:disabled { opacity: 0.4; cursor: not-allowed; }
.status-badge { padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
.status-active { background: rgba(34,197,94,0.15); color: #22c55e; }
.status-banned { background: rgba(239,68,68,0.15); color: #ef4444; }
.status-deleted { background: rgba(156,163,175,0.15); color: #9ca3af; }
.actions-cell { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: flex-start; }
.btn-sm { padding: 0.25rem 0.6rem; border-radius: 0.375rem; border: none; cursor: pointer; font-size: 0.8rem; font-weight: 500; }
.btn-edit { background: var(--surface2, #2a2a3a); color: var(--text, #eee); }
.btn-ban { background: rgba(239,68,68,0.15); color: #ef4444; }
.btn-unban { background: rgba(34,197,94,0.15); color: #22c55e; }
.btn-delete { background: rgba(239,68,68,0.2); color: #ef4444; }
.btn-restore { background: rgba(34,197,94,0.2); color: #22c55e; }
.btn-sm:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary { padding: 0.5rem 1.25rem; background: var(--accent, #7c5cfc); color: white; border: none; border-radius: 0.375rem; cursor: pointer; }
.btn-secondary { padding: 0.5rem 1.25rem; background: var(--surface2, #2a2a3a); color: var(--text, #eee); border: 1px solid var(--border, #444); border-radius: 0.375rem; cursor: pointer; }
.btn-danger { padding: 0.5rem 1.25rem; background: #ef4444; color: white; border: none; border-radius: 0.375rem; cursor: pointer; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: var(--surface, #1a1a2e); border: 1px solid var(--border, #333); border-radius: 0.75rem; padding: 2rem; width: 28rem; max-width: 90vw; }
.modal h2 { margin-bottom: 1.25rem; font-size: 1.1rem; font-weight: 600; }
.modal label { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; font-size: 0.9rem; color: var(--text-muted, #aaa); }
.modal input { background: var(--surface2, #2a2a3a); border: 1px solid var(--border, #444); border-radius: 0.375rem; color: var(--text, #eee); padding: 0.5rem 0.75rem; font-size: 0.9rem; }
.modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem; }
.modal-danger p { color: var(--text-muted, #aaa); font-size: 0.9rem; margin-bottom: 0; }
.loading { padding: 2rem; text-align: center; color: var(--text-muted, #888); }
.error-banner { background: rgba(239,68,68,0.1); border: 1px solid #ef4444; border-radius: 0.375rem; padding: 0.75rem 1rem; color: #ef4444; margin-bottom: 1rem; }
</style>
