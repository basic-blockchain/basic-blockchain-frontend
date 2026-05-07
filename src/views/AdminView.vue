<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listUsers, grantRole, revokeRole, banUser, unbanUser, type AdminUser } from '@/api/admin'
import { mint as mintApi } from '@/api/wallets'
import { useToast } from 'primevue/usetoast'

const toast = useToast()

const users = ref<AdminUser[]>([])
const loading = ref(false)

const mintForm = ref({ walletId: '', amount: '' })
const minting = ref(false)

const AVAILABLE_ROLES = ['ADMIN', 'OPERATOR', 'VIEWER']

async function fetchUsers() {
  loading.value = true
  try {
    const resp = await listUsers()
    users.value = resp.users
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Failed to load users', detail: e instanceof Error ? e.message : 'Error', life: 4000 })
  } finally {
    loading.value = false
  }
}

async function toggleRole(user: AdminUser, role: string) {
  try {
    if (user.roles.includes(role)) {
      await revokeRole(user.user_id, role)
    } else {
      await grantRole(user.user_id, role)
    }
    await fetchUsers()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Role change failed', detail: e instanceof Error ? e.message : 'Error', life: 4000 })
  }
}

async function toggleBan(user: AdminUser) {
  try {
    if (user.banned) {
      await unbanUser(user.user_id)
    } else {
      await banUser(user.user_id)
    }
    await fetchUsers()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Ban action failed', detail: e instanceof Error ? e.message : 'Error', life: 4000 })
  }
}

async function submitMint() {
  const amount = Number(mintForm.value.amount)
  if (!mintForm.value.walletId || !amount || amount <= 0) return
  minting.value = true
  try {
    await mintApi({ wallet_id: mintForm.value.walletId, amount })
    toast.add({ severity: 'success', summary: 'Mint submitted', detail: 'Transaction is in the mempool — mine a block to confirm', life: 5000 })
    mintForm.value = { walletId: '', amount: '' }
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Mint failed', detail: e instanceof Error ? e.message : 'Error', life: 4000 })
  } finally {
    minting.value = false
  }
}

onMounted(fetchUsers)
</script>

<template>
  <div class="admin-page">
    <h1 class="page-title">
      <span
        class="pi pi-shield"
        aria-hidden="true"
      />
      Admin
    </h1>

    <!-- Mint section -->
    <section class="admin-section">
      <h2 class="section-title">
        <span
          class="pi pi-plus-circle"
          aria-hidden="true"
        />
        Mint tokens
      </h2>
      <form
        class="mint-form"
        @submit.prevent="submitMint"
      >
        <div class="form-row">
          <div class="form-field">
            <label
              class="field-label"
              for="wallet-id"
            >Wallet ID</label>
            <input
              id="wallet-id"
              v-model="mintForm.walletId"
              class="field-input"
              type="text"
              placeholder="recipient wallet ID"
              required
            >
          </div>
          <div class="form-field">
            <label
              class="field-label"
              for="mint-amount"
            >Amount</label>
            <input
              id="mint-amount"
              v-model="mintForm.amount"
              class="field-input"
              type="number"
              min="0.00000001"
              step="any"
              placeholder="100"
              required
            >
          </div>
        </div>
        <button
          class="btn-primary"
          type="submit"
          :disabled="minting"
        >
          <span
            v-if="minting"
            class="pi pi-spin pi-spinner"
            aria-hidden="true"
          />
          <span
            v-else
            class="pi pi-plus"
            aria-hidden="true"
          />
          {{ minting ? 'Minting…' : 'Mint' }}
        </button>
      </form>
    </section>

    <!-- Users section -->
    <section class="admin-section">
      <div class="section-header">
        <h2 class="section-title">
          <span
            class="pi pi-users"
            aria-hidden="true"
          />
          Users
        </h2>
        <button
          class="btn-refresh"
          @click="fetchUsers"
        >
          <span
            class="pi pi-refresh"
            aria-hidden="true"
          />
          Refresh
        </button>
      </div>

      <div
        v-if="loading"
        class="loading-state"
      >
        <span
          class="pi pi-spin pi-spinner"
          aria-hidden="true"
        />
        Loading users…
      </div>
      <div
        v-else
        class="user-table"
      >
        <div class="user-row header-row">
          <span>User</span>
          <span>Roles</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        <div
          v-for="u in users"
          :key="u.user_id"
          class="user-row"
          :class="{ banned: u.banned }"
        >
          <div class="user-info">
            <span class="user-name">{{ u.display_name }}</span>
            <span class="user-handle">@{{ u.username }}</span>
          </div>
          <div class="role-chips">
            <button
              v-for="role in AVAILABLE_ROLES"
              :key="role"
              class="role-chip"
              :class="{ active: u.roles.includes(role) }"
              type="button"
              @click="toggleRole(u, role)"
            >
              {{ role }}
            </button>
          </div>
          <div>
            <span
              v-if="u.banned"
              class="status-badge banned"
            >Banned</span>
            <span
              v-else
              class="status-badge active"
            >Active</span>
          </div>
          <div class="action-btns">
            <button
              class="btn-action"
              :class="u.banned ? 'btn-unban' : 'btn-ban'"
              type="button"
              @click="toggleBan(u)"
            >
              {{ u.banned ? 'Unban' : 'Ban' }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin-page { max-width: 960px; }
.page-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-heading);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1.5rem;
}
.admin-section {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-soft);
  margin-bottom: 1.5rem;
}
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
.section-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-heading);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1.25rem;
}
.section-header .section-title { margin: 0; }
.btn-refresh {
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
  color: var(--text-body);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  transition: background 0.15s;
}
.btn-refresh:hover { background: var(--surface-soft); }

/* Mint form */
.mint-form { display: flex; flex-direction: column; gap: 0.75rem; }
.form-row { display: grid; grid-template-columns: 2fr 1fr; gap: 0.75rem; }
@media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } }
.form-field { display: flex; flex-direction: column; gap: 0.3rem; }
.field-label { font-size: 0.82rem; font-weight: 600; color: var(--text-muted); }
.field-input {
  padding: 0.55rem 0.8rem;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-ground);
  color: var(--text-body);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
}
.field-input:focus { border-color: var(--primary-color); }
.btn-primary {
  align-self: flex-start;
  padding: 0.55rem 1rem;
  background: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: opacity 0.15s;
}
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

/* User table */
.user-table { display: flex; flex-direction: column; gap: 0.5rem; }
.user-row {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr 1fr;
  gap: 0.75rem;
  align-items: center;
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
}
@media (max-width: 700px) { .user-row { grid-template-columns: 1fr; } }
.header-row {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: var(--surface-ground);
}
.user-row:not(.header-row) { background: var(--surface-ground); }
.user-row.banned { opacity: 0.6; }
.user-info { display: flex; flex-direction: column; }
.user-name { font-weight: 600; font-size: 0.9rem; color: var(--text-body); }
.user-handle { font-size: 0.78rem; color: var(--text-muted); }
.role-chips { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.role-chip {
  padding: 0.2rem 0.5rem;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  border: 1px solid var(--surface-border);
  background: var(--surface-card);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}
.role-chip.active {
  background: var(--primary-color);
  color: #fff;
  border-color: var(--primary-color);
}
.status-badge {
  padding: 0.15rem 0.5rem;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
}
.status-badge.active { background: rgba(52, 211, 153, 0.12); color: #059669; }
.status-badge.banned { background: rgba(239, 68, 68, 0.12); color: #dc2626; }
.action-btns { display: flex; gap: 0.4rem; }
.btn-action {
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-ban { background: rgba(239, 68, 68, 0.1); color: #dc2626; }
.btn-unban { background: rgba(52, 211, 153, 0.1); color: #059669; }
.loading-state { display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); padding: 1rem 0; }
</style>
