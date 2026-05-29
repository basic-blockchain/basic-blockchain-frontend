<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'
import UserChip from '@/components/atoms/UserChip.vue'
import PermissionAssignDrawer from '@/components/drawers/PermissionAssignDrawer.vue'
import CreateAdminUserFlow from '@/components/flows/CreateAdminUserFlow.vue'
import {
  STAFF_USERS, PERM_CATEGORIES, ROLE_PRESETS, TOTAL_PERMS,
  type StaffUser, type StaffRole,
} from '@/composables/usePermissions'

type FilterTab = 'all' | 'admin' | 'operator' | 'viewer'

const filterTab = ref<FilterTab>('all')
const search = ref('')

const users = ref<StaffUser[]>(STAFF_USERS.map((u) => ({ ...u, perms: [...u.perms] })))

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return users.value.filter((u) => {
    if (filterTab.value !== 'all' && u.role.toLowerCase() !== filterTab.value) return false
    if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
    return true
  })
})

const counts = computed(() => ({
  all: users.value.length,
  admin: users.value.filter((u) => u.role === 'ADMIN').length,
  operator: users.value.filter((u) => u.role === 'OPERATOR').length,
  viewer: users.value.filter((u) => u.role === 'VIEWER').length,
  custom: users.value.filter((u) => u.custom).length,
}))

const tabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'admin', label: 'Admins' },
  { key: 'operator', label: 'Operators' },
  { key: 'viewer', label: 'Viewers' },
]

// Drawer
const drawerOpen = ref(false)
const selectedUser = ref<StaffUser | null>(null)

function openAssign(user: StaffUser) {
  selectedUser.value = user
  drawerOpen.value = true
}

function onSaved(payload: { userId: string; perms: string[] }) {
  const u = users.value.find((u) => u.id === payload.userId)
  if (!u) return
  u.perms = payload.perms
  const preset = new Set(ROLE_PRESETS[u.role])
  u.custom = payload.perms.length !== preset.size || payload.perms.some((p) => !preset.has(p))
  u.last = 'hace un momento'
}

// Create user flow
const createOpen = ref(false)

function onUserCreated(user: StaffUser) {
  users.value.unshift(user)
}

// Role badge styling
function roleBg(role: StaffRole): string {
  if (role === 'ADMIN') return '#ede9fe'
  if (role === 'OPERATOR') return '#cffafe'
  return 'var(--surface-2)'
}
function roleColor(role: StaffRole): string {
  if (role === 'ADMIN') return '#5b21b6'
  if (role === 'OPERATOR') return '#155e75'
  return 'var(--text-2)'
}
</script>

<template>
  <div class="perm-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Permisos</h1>
        <p class="page-sub">
          Quién puede hacer qué en la plataforma ·
          {{ TOTAL_PERMS }} permisos en {{ PERM_CATEGORIES.length }} categorías.
        </p>
      </div>
      <div class="header-actions">
        <BaseButton size="sm">
          <template #leading><i class="pi pi-download" /></template>
          Exportar
        </BaseButton>
        <BaseButton size="sm" variant="primary" @click="createOpen = true">
          <template #leading><i class="pi pi-plus" /></template>
          Crear usuario admin
        </BaseButton>
      </div>
    </div>

    <!-- Stat cards -->
    <div class="stat-row">
      <div class="stat-card">
        <div class="stat-label">Usuarios con permisos</div>
        <div class="stat-value">{{ counts.all }}</div>
        <div class="stat-desc">{{ counts.custom }} con set personalizado</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Admins</div>
        <div class="stat-value" style="color: #7c3aed">{{ counts.admin }}</div>
        <div class="stat-desc">acceso total</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Operators</div>
        <div class="stat-value" style="color: #0891b2">{{ counts.operator }}</div>
        <div class="stat-desc">operativa diaria</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Cambios 7d</div>
        <div class="stat-value">12</div>
        <div class="stat-desc">todos auditados</div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="tab-strip">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab"
          :class="{ 'tab--active': filterTab === tab.key }"
          @click="filterTab = tab.key"
        >
          {{ tab.label }}
          <span class="tab-count">{{ counts[tab.key] }}</span>
        </button>
      </div>
      <div class="search-wrap">
        <i class="pi pi-search search-icon" />
        <input
          v-model="search"
          class="search-input"
          placeholder="Buscar por nombre o email…"
        />
      </div>
      <span class="chip-filter">
        Con personalización · {{ counts.custom }}
        <i class="pi pi-chevron-down" style="font-size: 10px; margin-left: 4px" />
      </span>
    </div>

    <!-- Table -->
    <div class="table-wrap">
      <table class="perm-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Permisos activos</th>
            <th>Set</th>
            <th>Último cambio</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="u in filtered"
            :key="u.id"
            class="perm-row"
            @click="openAssign(u)"
          >
            <td>
              <UserChip :name="u.name" :role="u.email" size="md" />
            </td>
            <td>
              <span
                class="role-badge"
                :style="{ background: roleBg(u.role), color: roleColor(u.role) }"
              >{{ u.role }}</span>
            </td>
            <td>
              <div class="perms-cell">
                <span class="perm-count">{{ u.perms.length }} permisos</span>
                <span
                  v-for="p in u.perms.slice(0, 2)"
                  :key="p"
                  class="perm-pill"
                >{{ p }}</span>
                <span v-if="u.perms.length > 2" class="perm-more">+{{ u.perms.length - 2 }}</span>
              </div>
            </td>
            <td>
              <span v-if="u.custom" class="set-badge set-badge--custom">Personalizado</span>
              <span v-else class="set-badge set-badge--preset">Preset {{ u.role }}</span>
            </td>
            <td class="cell-muted">{{ u.last }}</td>
            <td class="cell-action" @click.stop>
              <BaseButton
                size="sm"
                variant="ghost"
                :icon-only="true"
                aria-label="Editar permisos"
                @click="openAssign(u)"
              >
                <i class="pi pi-pencil" />
              </BaseButton>
            </td>
          </tr>
          <tr v-if="filtered.length === 0">
            <td colspan="6" class="empty-row">Sin resultados</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Drawers and flows -->
    <PermissionAssignDrawer
      v-if="selectedUser"
      :open="drawerOpen"
      :user="selectedUser"
      @update:open="drawerOpen = $event"
      @saved="onSaved"
    />

    <CreateAdminUserFlow
      v-if="createOpen"
      @close="createOpen = false"
      @created="onUserCreated"
    />
  </div>
</template>

<style scoped>
.perm-page {
  padding: var(--space-lg);
  max-width: 1100px;
}

/* Header */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}
.page-title {
  margin: 0 0 2px;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
}
.page-sub {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-2);
}
.header-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* Stat cards */
.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
}
.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
}
.stat-label {
  font-size: 11.5px;
  color: var(--text-2);
  margin-bottom: 4px;
}
.stat-value {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  margin-bottom: 4px;
}
.stat-desc {
  font-size: 11px;
  color: var(--text-3);
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.tab-strip {
  display: flex;
  gap: 2px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2px;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  font: 500 12px/1 var(--font-sans);
  color: var(--text-2);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out);
}
.tab:hover {
  background: var(--hover);
  color: var(--text);
}
.tab--active {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}
.tab-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
  background: var(--surface-2);
  border-radius: 10px;
  padding: 1px 5px;
}
.tab--active .tab-count {
  background: var(--surface-3, var(--hover));
}
.search-wrap {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1;
  min-width: 180px;
  max-width: 280px;
  height: 30px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0 10px;
}
.search-icon {
  font-size: 12px;
  color: var(--text-3);
  flex-shrink: 0;
}
.search-input {
  border: 0;
  background: transparent;
  font: 12.5px/1 var(--font-sans);
  color: var(--text);
  flex: 1;
  outline: none;
}
.search-input::placeholder {
  color: var(--text-3);
}
.chip-filter {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  font-size: 12px;
  color: var(--text-2);
  background: var(--surface);
  cursor: default;
  white-space: nowrap;
}

/* Table */
.table-wrap {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.perm-table {
  width: 100%;
  border-collapse: collapse;
}
.perm-table thead th {
  padding: 9px 14px;
  text-align: left;
  font: 600 11px/1 var(--font-sans);
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.perm-row {
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
}
.perm-row:hover {
  background: var(--hover);
}
.perm-row td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
.perm-row:last-child td {
  border-bottom: 0;
}
.role-badge {
  display: inline-block;
  padding: 2px 7px;
  border-radius: var(--radius-pill);
  font: 600 10.5px/1 var(--font-mono);
  letter-spacing: 0.02em;
}
.perms-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.perm-count {
  font: 500 11.5px/1 var(--font-sans);
  color: var(--text);
  background: var(--surface-2);
  border-radius: var(--radius-pill);
  padding: 2px 7px;
}
.perm-pill {
  font: 10px/1 var(--font-mono);
  color: var(--text-2);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  padding: 2px 6px;
}
.perm-more {
  font-size: 11px;
  color: var(--text-3);
}
.set-badge {
  display: inline-block;
  padding: 2px 7px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 500;
  border: 0;
}
.set-badge--custom {
  background: var(--warning-soft);
  color: var(--warning);
}
.set-badge--preset {
  background: var(--surface-2);
  color: var(--text-2);
}
.cell-muted {
  color: var(--text-3);
  font-size: 12px;
  white-space: nowrap;
}
.cell-action {
  width: 40px;
  text-align: right;
}
.empty-row {
  padding: 32px 14px;
  text-align: center;
  color: var(--text-3);
  font-size: 13px;
}
</style>
