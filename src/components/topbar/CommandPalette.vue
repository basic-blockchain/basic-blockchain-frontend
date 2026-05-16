<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { listUsers, listAllWallets, type AdminUser, type WalletAdminRecord } from '@/api/admin'
import { useChainStore } from '@/stores/chain'
import { useAuthStore } from '@/stores/auth'

type ResultGroup = 'navigation' | 'block' | 'user' | 'wallet'

interface PaletteResult {
  id: string
  group: ResultGroup
  label: string
  hint?: string
  to?: string
  action?: () => void
}

interface NavEntry {
  to: string
  label: string
  requireAuth?: true
  requireRole?: string
}

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const auth = useAuthStore()
const chain = useChainStore()
const router = useRouter()

const query = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const activeIdx = ref(0)
const users = ref<AdminUser[]>([])
const wallets = ref<WalletAdminRecord[]>([])
const adminDataLoaded = ref(false)
const loadingAdmin = ref(false)

const NAV: NavEntry[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/wallet', label: 'Wallet', requireAuth: true },
  { to: '/p2p', label: 'P2P', requireAuth: true },
  { to: '/exchange', label: 'Exchange', requireAuth: true },
  { to: '/chain', label: 'Chain' },
  { to: '/mempool', label: 'Mempool' },
  { to: '/nodes', label: 'Nodos' },
  { to: '/validation', label: 'Validación' },
  { to: '/health', label: 'Health' },
  { to: '/admin', label: 'Admin · Resumen', requireRole: 'ADMIN' },
  { to: '/admin/users', label: 'Admin · Usuarios', requireRole: 'ADMIN' },
  { to: '/admin/wallets', label: 'Admin · Wallets', requireRole: 'ADMIN' },
  { to: '/admin/currencies', label: 'Admin · Monedas', requireRole: 'ADMIN' },
  { to: '/admin/treasury', label: 'Admin · Tesorería', requireRole: 'ADMIN' },
  { to: '/admin/exchange-rates', label: 'Admin · Tasas', requireRole: 'ADMIN' },
  { to: '/admin/audit', label: 'Admin · Auditoría', requireRole: 'ADMIN' },
  { to: '/admin/compliance', label: 'Admin · Compliance', requireRole: 'ADMIN' },
  { to: '/admin/movements', label: 'Admin · Movimientos', requireRole: 'ADMIN' },
  { to: '/admin/sends', label: 'Admin · Envíos', requireRole: 'ADMIN' },
  { to: '/admin/settings', label: 'Admin · Ajustes', requireRole: 'ADMIN' },
]

const visibleNav = computed(() =>
  NAV.filter((n) => {
    if (n.requireRole) return auth.hasRole(n.requireRole)
    if (n.requireAuth) return auth.isAuthenticated
    return true
  }),
)

async function loadAdminData() {
  if (!auth.isAdmin || adminDataLoaded.value) return
  loadingAdmin.value = true
  try {
    const [u, w] = await Promise.all([listUsers(), listAllWallets()])
    users.value = u.users
    wallets.value = w.wallets
    adminDataLoaded.value = true
  } catch {
    /* leave empty; nav results still work */
  } finally {
    loadingAdmin.value = false
  }
}

const results = computed<PaletteResult[]>(() => {
  const q = query.value.trim().toLowerCase()
  const out: PaletteResult[] = []

  // Navigation always shown (filtered by query if any)
  for (const n of visibleNav.value) {
    if (!q || n.label.toLowerCase().includes(q)) {
      out.push({ id: `nav-${n.to}`, group: 'navigation', label: n.label, hint: n.to, to: n.to })
    }
  }

  if (q.length >= 2) {
    // Blocks: match by index or hash prefix
    for (const b of chain.recentBlocks) {
      const idxStr = String(b.index)
      if (idxStr === q || b.merkleRoot.toLowerCase().startsWith(q)) {
        out.push({
          id: `block-${b.index}`,
          group: 'block',
          label: `Bloque #${b.index}`,
          hint: `${b.transactions.length} tx · ${b.merkleRoot.slice(0, 14)}…`,
          to: '/chain',
        })
      }
    }

    // Users
    for (const u of users.value) {
      const hit =
        u.display_name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        u.user_id.toLowerCase().includes(q)
      if (hit) {
        out.push({
          id: `user-${u.user_id}`,
          group: 'user',
          label: u.display_name,
          hint: `@${u.username}${u.email ? ` · ${u.email}` : ''}`,
          to: '/admin/users',
        })
      }
    }

    // Wallets
    for (const w of wallets.value) {
      const hit =
        w.public_key.toLowerCase().includes(q) ||
        w.username.toLowerCase().includes(q) ||
        w.currency.toLowerCase() === q
      if (hit) {
        out.push({
          id: `wallet-${w.wallet_id}`,
          group: 'wallet',
          label: `${w.currency} · ${w.public_key.slice(0, 16)}…`,
          hint: `@${w.username} · ${w.balance} ${w.currency}`,
          to: '/admin/wallets',
        })
      }
    }
  }

  return out.slice(0, 30)
})

const grouped = computed(() => {
  const groups: Record<ResultGroup, PaletteResult[]> = {
    navigation: [], block: [], user: [], wallet: [],
  }
  for (const r of results.value) groups[r.group].push(r)
  const labels: Record<ResultGroup, string> = {
    navigation: 'Navegación',
    block: 'Bloques',
    user: 'Usuarios',
    wallet: 'Wallets',
  }
  return (['navigation', 'block', 'user', 'wallet'] as ResultGroup[])
    .filter((g) => groups[g].length > 0)
    .map((g) => ({ key: g, label: labels[g], items: groups[g] }))
})

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    query.value = ''
    activeIdx.value = 0
    await nextTick()
    inputRef.value?.focus()
    loadAdminData()
  }
})

watch(query, () => { activeIdx.value = 0 })

function pick(r: PaletteResult) {
  if (r.to) router.push(r.to)
  else if (r.action) r.action()
  emit('close')
}

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') { emit('close'); return }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIdx.value = Math.min(activeIdx.value + 1, results.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIdx.value = Math.max(activeIdx.value - 1, 0)
  } else if (e.key === 'Enter') {
    const r = results.value[activeIdx.value]
    if (r) { e.preventDefault(); pick(r) }
  }
}

function indexOf(r: PaletteResult): number {
  return results.value.findIndex((x) => x.id === r.id)
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="palette-scrim" @click="emit('close')">
      <div class="palette" role="dialog" aria-modal="true" aria-label="Búsqueda global" @click.stop>
        <div class="palette-input-row">
          <span class="pi pi-search" aria-hidden="true" />
          <input
            ref="inputRef"
            v-model="query"
            class="palette-input"
            type="text"
            placeholder="Buscar páginas, usuarios, wallets, bloques…"
            autocomplete="off"
          />
          <kbd class="palette-kbd">Esc</kbd>
        </div>

        <div class="palette-body">
          <div v-if="loadingAdmin && !adminDataLoaded" class="palette-hint">Cargando índice…</div>
          <div v-if="grouped.length === 0" class="palette-empty">
            <template v-if="query.trim().length < 2 && !visibleNav.length">
              Sin resultados.
            </template>
            <template v-else>
              Sin resultados para "{{ query }}".
            </template>
          </div>
          <template v-else>
            <div v-for="g in grouped" :key="g.key" class="palette-group">
              <div class="palette-group-label">{{ g.label }}</div>
              <ul class="palette-list">
                <li
                  v-for="r in g.items"
                  :key="r.id"
                  class="palette-item"
                  :class="{ active: indexOf(r) === activeIdx }"
                  @mouseenter="activeIdx = indexOf(r)"
                  @click="pick(r)"
                >
                  <span class="palette-label">{{ r.label }}</span>
                  <span v-if="r.hint" class="palette-hint-text">{{ r.hint }}</span>
                </li>
              </ul>
            </div>
          </template>
        </div>

        <div class="palette-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> Navegar</span>
          <span><kbd>↵</kbd> Seleccionar</span>
          <span><kbd>Esc</kbd> Cerrar</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.palette-scrim {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 300;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
}
.palette {
  width: min(640px, 92vw);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.palette-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}
.palette-input-row .pi-search { color: var(--text-2); }
.palette-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--text);
}
.palette-input::placeholder { color: var(--text-3); }
.palette-kbd {
  font-family: var(--font-mono);
  font-size: 10.5px;
  padding: 2px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-2);
  background: var(--surface-2);
}
.palette-body { max-height: 50vh; overflow-y: auto; padding: 6px 0; }
.palette-group { padding: 4px 0; }
.palette-group-label {
  padding: 6px 14px;
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-3);
}
.palette-list { list-style: none; padding: 0; margin: 0; }
.palette-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
  border-left: 2px solid transparent;
}
.palette-item.active {
  background: var(--surface-2);
  border-left-color: var(--accent-text);
}
.palette-label { color: var(--text); }
.palette-hint-text {
  color: var(--text-3);
  font-size: 11.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60%;
}
.palette-empty,
.palette-hint {
  padding: 22px 14px;
  text-align: center;
  font-size: 12.5px;
  color: var(--text-2);
}
.palette-foot {
  display: flex;
  gap: 14px;
  padding: 8px 14px;
  border-top: 1px solid var(--border);
  font-size: 10.5px;
  color: var(--text-3);
}
.palette-foot kbd {
  font-family: var(--font-mono);
  padding: 1px 5px;
  border: 1px solid var(--border);
  border-radius: 3px;
  margin-right: 4px;
  background: var(--surface-2);
}
</style>
