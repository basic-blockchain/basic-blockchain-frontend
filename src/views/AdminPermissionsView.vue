<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import UserChip from '@/components/atoms/UserChip.vue'
import PermissionAssignDrawer from '@/components/drawers/PermissionAssignDrawer.vue'
import CreateAdminUserFlow from '@/components/flows/CreateAdminUserFlow.vue'
import { loadStaffUsers } from '@/api/permissions'
import {
  PERM_CATEGORIES, TOTAL_PERMS,
  primaryRole, computeEffectivePerms, isCustomSet,
  type StaffUser,
} from '@/composables/usePermissions'

type FilterTab = 'all' | 'admin' | 'operator' | 'viewer'

const filterTab = ref<FilterTab>('all')
const search = ref('')
const users = ref<StaffUser[]>([])
const loading = ref(false)
const error = ref('')

async function fetchUsers() {
  loading.value = true
  error.value = ''
  try {
    users.value = await loadStaffUsers()
  } catch (e) {
    error.value = 'No se pudieron cargar los usuarios. Verifica la conexión al servidor.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchUsers)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return users.value.filter((u) => {
    if (filterTab.value !== 'all' && u.primaryRole.toLowerCase() !== filterTab.value) return false
    if (q) {
      const name = u.display_name.toLowerCase()
      const email = (u.email ?? '').toLowerCase()
      if (!name.includes(q) && !email.includes(q)) return false
    }
    return true
  })
})

const counts = computed(() => ({
  all: users.value.length,
  admin: users.value.filter((u) => u.primaryRole === 'ADMIN').length,
  operator: users.value.filter((u) => u.primaryRole === 'OPERATOR').length,
  viewer: users.value.filter((u) => u.primaryRole === 'VIEWER').length,
  custom: users.value.filter((u) => u.isCustom).length,
}))

const tabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'admin', label: 'Admins' },
  { key: 'operator', label: 'Operators' },
  { key: 'viewer', label: 'Viewers' },
]

// ── Drawer ────────────────────────────────────────────────────────────────────
const drawerOpen = ref(false)
const selectedUser = ref<StaffUser | null>(null)

function openAssign(user: StaffUser) {
  selectedUser.value = user
  drawerOpen.value = true
}

function onSaved(payload: { userId: string; effectivePerms: string[]; overrides: string[] }) {
  const u = users.value.find((u) => u.user_id === payload.userId)
  if (!u) return
  u.effectivePerms = payload.effectivePerms
  u.overrides = payload.overrides
  u.isCustom = isCustomSet(u.roles, payload.effectivePerms)
  u.lastActive = new Date().toISOString()
}

// ── Create user flow ──────────────────────────────────────────────────────────
const createOpen = ref(false)

function onUserCreated(user: StaffUser) {
  users.value.unshift(user)
}

// ── Role badge styling ────────────────────────────────────────────────────────
function roleBg(role: string): string {
  if (role === 'ADMIN') return '#ede9fe'
  if (role === 'OPERATOR') return '#cffafe'
  return 'var(--surface-2)'
}
function roleColor(role: string): string {
  if (role === 'ADMIN') return '#5b21b6'
  if (role === 'OPERATOR') return '#155e75'
  return 'var(--text-2)'
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora mismo'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs} h`
  const days = Math.floor(hrs / 24)
  return `hace ${days} d`
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
        <div class="stat-label">Viewers</div>
        <div class="stat-value" style="color: var(--text-3)">{{ counts.viewer }}</div>
        <div class="stat-desc">solo wallet propia</div>
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
      <span v-if="counts.custom > 0" class="chip-filter">
        {{ counts.custom }} con personalización
        <i class="pi pi-chevron-down" style="font-size: 10px; margin-left: 4px" />
      </span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="state-block">
      <i class="pi pi-spin pi-spinner state-icon" />
      <span>Cargando usuarios…</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="state-block state-block--error">
      <i class="pi pi-exclamation-triangle state-icon" />
      <span>{{ error }}</span>
      <BaseButton size="sm" @click="fetchUsers">Reintentar</BaseButton>
    </div>

    <!-- Table -->
    <div v-else class="table-wrap">
      <table class="perm-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Permisos activos</th>
            <th>Set</th>
            <th>Última actividad</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="u in filtered"
            :key="u.user_id"
            class="perm-row"
            @click="openAssign(u)"
          >
            <td>
              <UserChip :name="u.display_name" :role="u.email ?? undefined" size="md" />
            </td>
            <td>
              <span
                class="role-badge"
                :style="{ background: roleBg(u.primaryRole), color: roleColor(u.primaryRole) }"
              >{{ u.primaryRole }}</span>
            </td>
            <td>
              <div class="perms-cell">
                <span class="perm-count">{{ u.effectivePerms.length }} permisos</span>
                <span
                  v-for="p in u.effectivePerms.slice(0, 2)"
                  :key="p"
                  class="perm-pill"
                >{{ p }}</span>
                <span v-if="u.effectivePerms.length > 2" class="perm-more">
                  +{{ u.effectivePerms.length - 2 }}
                </span>
              </div>
            </td>
            <td>
              <span v-if="u.isCustom" class="set-badge set-badge--custom">Personalizado</span>
              <span v-else class="set-badge set-badge--preset">Preset {{ u.primaryRole }}</span>
            </td>
            <td class="cell-muted">{{ relativeTime(u.lastActive) }}</td>
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
          <tr v-if="filtered.length === 0 && !loading">
            <td colspan="6" class="empty-row">Sin resultados</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Drawer -->
    <PermissionAssignDrawer
      v-if="selectedUser"
      :open="drawerOpen"
      :user="selectedUser"
      @update:open="drawerOpen = $event"
      @saved="onSaved"
    />

    <!-- Create user flow -->
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
.tab:hover { background: var(--hover); color: var(--text); }
.tab--active { background: var(--surface); color: var(--text); box-shadow: var(--shadow-sm); }
.tab-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
  background: var(--surface-2);
  border-radius: 10px;
  padding: 1px 5px;
}
.tab--active .tab-count { background: var(--hover); }

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
.search-icon { font-size: 12px; color: var(--text-3); flex-shrink: 0; }
.search-input {
  border: 0;
  background: transparent;
  font: 12.5px/1 var(--font-sans);
  color: var(--text);
  flex: 1;
  outline: none;
}
.search-input::placeholder { color: var(--text-3); }

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
  white-space: nowrap;
}

/* State blocks */
.state-block {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 13px;
  color: var(--text-2);
}
.state-block--error { color: var(--danger); }
.state-icon { font-size: 16px; }

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
.perm-row:hover { background: var(--hover); }
.perm-row td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
.perm-row:last-child td { border-bottom: 0; }

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
.perm-more { font-size: 11px; color: var(--text-3); }

.set-badge {
  display: inline-block;
  padding: 2px 7px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 500;
  border: 0;
}
.set-badge--custom { background: var(--warning-soft); color: var(--warning); }
.set-badge--preset { background: var(--surface-2); color: var(--text-2); }

.cell-muted { color: var(--text-3); font-size: 12px; white-space: nowrap; }
.cell-action { width: 40px; text-align: right; }
.empty-row {
  padding: 32px 14px;
  text-align: center;
  color: var(--text-3);
  font-size: 13px;
}
</style>
