<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { listAuditLog, type AuditEntry } from '@/api/admin'
import { useChainStore } from '@/stores/chain'
import { useAuthStore } from '@/stores/auth'

type Severity = 'info' | 'success' | 'warning' | 'danger'

interface Notification {
  id: string
  severity: Severity
  title: string
  meta: string
  at: string
  href?: string
}

const auth = useAuthStore()
const chain = useChainStore()
const router = useRouter()

const open = ref(false)
const auditEntries = ref<AuditEntry[]>([])
const lastSeenAt = ref<number>(Number(localStorage.getItem('notif:lastSeenAt') ?? '0'))
const pollTimer = ref<number | null>(null)

const SEEN_BLOCK_KEY = 'notif:lastSeenBlock'
const lastSeenBlock = ref<number>(Number(localStorage.getItem(SEEN_BLOCK_KEY) ?? '0'))

function severityFromAction(action: string): Severity {
  const a = action.toLowerCase()
  if (a.includes('delete') || a.includes('ban') || a.includes('reject')) return 'danger'
  if (a.includes('freeze') || a.includes('revoke')) return 'warning'
  if (a.includes('grant') || a.includes('approve') || a.includes('create')) return 'success'
  return 'info'
}

function titleFromAction(action: string): string {
  const map: Record<string, string> = {
    'user.ban': 'Usuario baneado',
    'user.unban': 'Usuario desbaneado',
    'user.soft_delete': 'Usuario eliminado',
    'user.restore': 'Usuario restaurado',
    'user.role.grant': 'Rol otorgado',
    'user.role.revoke': 'Rol revocado',
    'wallet.freeze': 'Wallet congelada',
    'wallet.unfreeze': 'Wallet descongelada',
    'wallet.create': 'Wallet creada',
    'block.mined': 'Bloque minado',
    'tx.submit': 'Transacción enviada',
  }
  return map[action] ?? action.replace(/[._]/g, ' ')
}

function timeAgo(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}

const items = computed<Notification[]>(() => {
  const list: Notification[] = []

  // Chain events visible to everyone
  const recent = chain.recentBlocks.slice(0, 5)
  for (const b of recent) {
    list.push({
      id: `block-${b.index}`,
      severity: 'info',
      title: `Bloque #${b.index} minado`,
      meta: `${b.transactions.length} tx · merkle ${b.merkleRoot.slice(0, 10)}…`,
      at: b.timestamp,
      href: '/chain',
    })
  }

  // Audit entries — admin only
  if (auth.isAdmin) {
    for (const e of auditEntries.value) {
      list.push({
        id: `audit-${e.id}`,
        severity: severityFromAction(e.action),
        title: titleFromAction(e.action),
        meta: `por ${e.actor_id.slice(0, 12)}${e.actor_id.length > 12 ? '…' : ''}`,
        at: e.created_at,
        href: '/admin/audit',
      })
    }
  }

  list.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return list.slice(0, 12)
})

const unreadCount = computed(() => {
  return items.value.filter((n) => {
    const t = new Date(n.at).getTime()
    if (n.id.startsWith('block-')) {
      const idx = Number(n.id.slice(6))
      return idx > lastSeenBlock.value
    }
    return t > lastSeenAt.value
  }).length
})

async function loadAudit() {
  if (!auth.isAdmin) {
    auditEntries.value = []
    return
  }
  try {
    const res = await listAuditLog({ limit: 20 })
    auditEntries.value = res.entries
  } catch {
    /* keep previous on error */
  }
}

function markAllRead() {
  lastSeenAt.value = Date.now()
  localStorage.setItem('notif:lastSeenAt', String(lastSeenAt.value))
  const latest = chain.latestBlock
  if (latest) {
    lastSeenBlock.value = latest.index
    localStorage.setItem(SEEN_BLOCK_KEY, String(latest.index))
  }
}

function toggle() {
  open.value = !open.value
  if (open.value) markAllRead()
}

function close() { open.value = false }

function go(n: Notification) {
  if (!n.href) return
  router.push(n.href)
  close()
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) close()
}

function onClickOutside(e: MouseEvent) {
  if (!open.value) return
  const target = e.target as HTMLElement
  if (!target.closest('.notif-center')) close()
}

watch(() => auth.isAdmin, (admin) => {
  if (admin) loadAudit()
})

onMounted(() => {
  loadAudit()
  pollTimer.value = window.setInterval(loadAudit, 30_000)
  window.addEventListener('keydown', onKey)
  window.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
  if (pollTimer.value !== null) window.clearInterval(pollTimer.value)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <div class="notif-center">
    <button
      class="notif-btn"
      :aria-label="`Notificaciones${unreadCount ? ` (${unreadCount} sin leer)` : ''}`"
      :aria-expanded="open"
      @click="toggle"
    >
      <span class="pi pi-bell" aria-hidden="true" />
      <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
    </button>

    <div v-if="open" class="notif-panel" role="dialog" aria-label="Notificaciones recientes">
      <div class="notif-head">
        <span class="notif-title">Notificaciones</span>
        <button v-if="items.length" class="notif-action" @click="markAllRead">Marcar leídas</button>
      </div>
      <ul v-if="items.length" class="notif-list">
        <li
          v-for="n in items"
          :key="n.id"
          class="notif-item"
          :class="{ clickable: !!n.href }"
          tabindex="0"
          @click="go(n)"
          @keydown.enter="go(n)"
        >
          <span class="notif-dot" :class="`sev-${n.severity}`" aria-hidden="true" />
          <div class="notif-body">
            <div class="notif-row">
              <span class="notif-name">{{ n.title }}</span>
              <span class="notif-time">{{ timeAgo(n.at) }}</span>
            </div>
            <div class="notif-meta">{{ n.meta }}</div>
          </div>
        </li>
      </ul>
      <div v-else class="notif-empty">Sin notificaciones recientes.</div>
      <div v-if="auth.isAdmin" class="notif-foot">
        <RouterLink to="/admin/audit" class="notif-action" @click="close">Ver auditoría completa</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notif-center { position: relative; }
.notif-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text-2);
  cursor: pointer;
  position: relative;
  transition: background-color 0.12s, color 0.12s;
}
.notif-btn:hover { background: var(--surface-2); color: var(--text); }
.notif-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--danger);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.notif-panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 360px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 32px rgba(0,0,0,0.12);
  z-index: 250;
  overflow: hidden;
}
.notif-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}
.notif-title { font-size: 13px; font-weight: 600; }
.notif-action {
  background: none;
  border: none;
  color: var(--accent-text);
  font-size: 11.5px;
  cursor: pointer;
  padding: 0;
  text-decoration: none;
}
.notif-action:hover { text-decoration: underline; }
.notif-list { list-style: none; padding: 0; margin: 0; max-height: 420px; overflow-y: auto; }
.notif-item {
  display: flex;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  outline: none;
}
.notif-item:last-child { border-bottom: none; }
.notif-item.clickable { cursor: pointer; }
.notif-item.clickable:hover,
.notif-item:focus-visible { background: var(--surface-2); }
.notif-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
}
.sev-info    { background: var(--info, #1d4ed8); }
.sev-success { background: var(--success, #15803d); }
.sev-warning { background: var(--warning, #b45309); }
.sev-danger  { background: var(--danger, #b91c1c); }
.notif-body { flex: 1; min-width: 0; }
.notif-row { display: flex; justify-content: space-between; gap: 10px; }
.notif-name { font-size: 12.5px; font-weight: 500; color: var(--text); }
.notif-time { font-size: 10.5px; color: var(--text-3); white-space: nowrap; }
.notif-meta { font-size: 11.5px; color: var(--text-2); margin-top: 2px; }
.notif-empty { padding: 24px 14px; text-align: center; font-size: 12.5px; color: var(--text-2); }
.notif-foot { padding: 8px 14px; border-top: 1px solid var(--border); text-align: center; }
</style>
