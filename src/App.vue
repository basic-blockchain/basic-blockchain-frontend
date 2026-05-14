<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router'
import Toast from 'primevue/toast'
import { useBlockchainWs } from '@/composables/useBlockchainWs'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/useTheme'
import ProfileDrawer from '@/components/drawers/ProfileDrawer.vue'

const route = useRoute()
const router = useRouter()
const { wsStatus } = useBlockchainWs()
const auth = useAuthStore()
const { theme, toggle: toggleTheme } = useTheme()
const navOpen = ref(false)
const showProfile = ref(false)

watch(route, () => { navOpen.value = false })

interface NavItem {
  to: string
  label: string
  icon: string
  requireAuth?: true
  requireRole?: string
}

interface NavGroup {
  label: string
  requireRole?: string
  items: NavItem[]
}

const allGroups: NavGroup[] = [
  {
    label: 'Operaciones',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: 'pi pi-home' },
      { to: '/wallet',    label: 'Wallet',    icon: 'pi pi-wallet',   requireAuth: true },
      { to: '/p2p',       label: 'P2P',       icon: 'pi pi-arrow-right-arrow-left', requireAuth: true },
      { to: '/exchange',  label: 'Exchange',  icon: 'pi pi-chart-line', requireAuth: true },
    ],
  },
  {
    label: 'Blockchain',
    items: [
      { to: '/chain',      label: 'Chain',      icon: 'pi pi-link' },
      { to: '/mempool',    label: 'Mempool',    icon: 'pi pi-inbox' },
      { to: '/nodes',      label: 'Nodos',      icon: 'pi pi-sitemap' },
      { to: '/validation', label: 'Validación', icon: 'pi pi-verified' },
      { to: '/health',     label: 'Health',     icon: 'pi pi-heart' },
    ],
  },
  {
    label: 'Plataforma',
    requireRole: 'ADMIN',
    items: [
      { to: '/admin',                label: 'Resumen',      icon: 'pi pi-chart-bar',  requireRole: 'ADMIN' },
      { to: '/admin/users',          label: 'Usuarios',     icon: 'pi pi-users',      requireRole: 'ADMIN' },
      { to: '/admin/wallets',        label: 'Wallets',      icon: 'pi pi-wallet',     requireRole: 'ADMIN' },
      { to: '/admin/currencies',     label: 'Monedas',      icon: 'pi pi-globe',      requireRole: 'ADMIN' },
      { to: '/admin/treasury',       label: 'Tesorería',    icon: 'pi pi-building',   requireRole: 'ADMIN' },
      { to: '/admin/exchange-rates', label: 'Tasas',        icon: 'pi pi-sort-alt',   requireRole: 'ADMIN' },
      { to: '/admin/audit',          label: 'Auditoría',    icon: 'pi pi-list',       requireRole: 'ADMIN' },
      { to: '/admin/compliance',     label: 'Compliance',   icon: 'pi pi-shield',     requireRole: 'ADMIN' },
      { to: '/admin/movements',      label: 'Movimientos',  icon: 'pi pi-arrows-h',   requireRole: 'ADMIN' },
      { to: '/admin/sends',          label: 'Envíos',       icon: 'pi pi-send',       requireRole: 'ADMIN' },
      { to: '/admin/settings',       label: 'Ajustes',      icon: 'pi pi-cog',        requireRole: 'ADMIN' },
    ],
  },
]

const navGroups = computed(() =>
  allGroups
    .filter(g => !g.requireRole || auth.hasRole(g.requireRole))
    .map(g => ({
      ...g,
      items: g.items.filter(item => {
        if (item.requireRole) return auth.hasRole(item.requireRole)
        if (item.requireAuth) return auth.isAuthenticated
        return true
      }),
    }))
    .filter(g => g.items.length > 0)
)

function isActive(to: string): boolean {
  if (to === '/admin') return route.path === '/admin'
  return route.path.startsWith(to)
}

const routeLabels: Record<string, string> = {
  dashboard:       'Dashboard',
  chain:           'Chain',
  mempool:         'Mempool',
  nodes:           'Nodos',
  validation:      'Validación',
  health:          'Health',
  wallet:          'Wallet',
  admin:           'Plataforma',
  users:           'Usuarios',
  wallets:         'Wallets',
  currencies:      'Monedas',
  treasury:        'Tesorería',
  'exchange-rates':'Tasas',
  audit:           'Auditoría',
  compliance:      'Compliance',
  p2p:             'P2P',
  exchange:        'Exchange',
  movements:       'Movimientos',
  sends:           'Envíos',
  settings:        'Ajustes',
}

const breadcrumbs = computed(() =>
  route.path
    .split('/')
    .filter(Boolean)
    .map(seg => ({ label: routeLabels[seg] ?? seg }))
)

const isAuthRoute = computed(() =>
  ['/login', '/register', '/activate'].includes(route.path)
)

async function logout() {
  auth.logout()
  await router.push('/login')
}

function avatarInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}
</script>

<template>
  <!-- Auth views render full-screen without the shell -->
  <div v-if="isAuthRoute">
    <RouterView />
    <Toast position="bottom-right" />
  </div>

  <div v-else class="app">
    <a href="#main-content" class="skip-link">Saltar al contenido</a>

    <!-- Mobile top bar -->
    <header class="mobile-bar">
      <span class="sb-brand-mark" aria-hidden="true">C</span>
      <span class="mobile-title">Cadena</span>
      <button
        class="hamburger"
        :aria-expanded="navOpen"
        aria-controls="sidebar-nav"
        aria-label="Abrir navegación"
        @click="navOpen = !navOpen"
      >
        <span class="pi" :class="navOpen ? 'pi-times' : 'pi-bars'" aria-hidden="true" />
      </button>
    </header>

    <div v-if="navOpen" class="nav-overlay" aria-hidden="true" @click="navOpen = false" />

    <!-- Sidebar -->
    <aside id="sidebar-nav" class="sidebar" :class="{ open: navOpen }" aria-label="Navegación principal">
      <div class="sb-brand">
        <span class="sb-brand-mark" aria-hidden="true">C</span>
        <span>Cadena</span>
      </div>

      <nav aria-label="Secciones">
        <template v-for="group in navGroups" :key="group.label">
          <span class="sb-section">{{ group.label }}</span>
          <RouterLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="sb-link"
            :class="{ active: isActive(item.to) }"
            :aria-current="isActive(item.to) ? 'page' : undefined"
          >
            <span :class="item.icon" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </template>
      </nav>

      <div v-if="auth.isAuthenticated && auth.user" class="sb-foot">
        <button class="sb-profile-btn" aria-label="Abrir perfil" @click="showProfile = true">
          <span class="sb-avatar" aria-hidden="true">{{ avatarInitial(auth.user.display_name) }}</span>
          <div class="sb-foot-text">
            <span class="sb-foot-name">{{ auth.user.display_name }}</span>
            <span class="sb-foot-role">{{ auth.user.roles[0] ?? 'VIEWER' }}</span>
          </div>
        </button>
        <button class="sb-logout" aria-label="Cerrar sesión" title="Cerrar sesión" @click="logout">
          <span class="pi pi-sign-out" aria-hidden="true" />
        </button>
      </div>

      <div
        class="ws-status"
        :class="wsStatus"
        role="status"
        aria-live="polite"
        :aria-label="`WebSocket: ${wsStatus === 'OPEN' ? 'conectado' : 'conectando'}`"
      >
        <span class="ws-dot" aria-hidden="true" />
        <span>{{ wsStatus === 'OPEN' ? 'Live' : 'Conectando…' }}</span>
      </div>
    </aside>

    <!-- Main area -->
    <div class="main">
      <!-- Topbar with breadcrumbs -->
      <header class="topbar">
        <nav class="crumbs" aria-label="Breadcrumb">
          <template v-for="(crumb, i) in breadcrumbs" :key="crumb.label">
            <span v-if="i > 0" class="crumb-sep" aria-hidden="true">·</span>
            <strong v-if="i === breadcrumbs.length - 1">{{ crumb.label }}</strong>
            <span v-else>{{ crumb.label }}</span>
          </template>
        </nav>
        <button
          class="theme-toggle"
          :aria-label="theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
          :title="theme === 'dark' ? 'Modo claro' : 'Modo oscuro'"
          @click="toggleTheme"
        >
          <span class="pi" :class="theme === 'dark' ? 'pi-sun' : 'pi-moon'" aria-hidden="true" />
        </button>
        <div class="topbar-search" role="search">
          <span class="pi pi-search" aria-hidden="true" />
          <input placeholder="Buscar…" aria-label="Buscar en la plataforma" />
          <kbd class="topbar-kbd">⌘K</kbd>
        </div>
      </header>

      <main id="main-content" class="page-content" tabindex="-1">
        <RouterView />
      </main>
    </div>

    <Toast position="bottom-right" />

    <ProfileDrawer
      :user="auth.user"
      :open="showProfile"
      @close="showProfile = false"
    />
  </div>
</template>

<style scoped>
/* ── App shell grid ─────────────────────────────────────────────────────── */
.app {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 220px 1fr;
  background: var(--bg);
}

/* ── Sidebar ────────────────────────────────────────────────────────────── */
.sidebar {
  border-right: 1px solid var(--border);
  background: var(--surface-2);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 200;
}

.sb-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px 14px;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: -0.01em;
  color: var(--text);
}

.sb-brand-mark {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: linear-gradient(135deg, #1a1917 0%, #3a3833 100%);
  display: grid;
  place-items: center;
  color: #faf9f6;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.sb-section {
  display: block;
  font-size: 10.5px;
  font-weight: 500;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 14px 8px 6px;
}

.sb-link {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 8px;
  border-radius: var(--radius);
  color: var(--text-2);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.12s, color 0.12s;
}
.sb-link:hover {
  background: var(--hover);
  color: var(--text);
}
.sb-link.active {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}
.sb-link .pi {
  font-size: 14px;
  opacity: 0.7;
  flex-shrink: 0;
}
.sb-link.active .pi {
  opacity: 1;
  color: var(--accent);
}

/* User chip at sidebar bottom */
.sb-foot {
  margin-top: auto;
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-2);
  border-top: 1px solid var(--border);
}

.sb-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c9a87a, #8a6a3e);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

.sb-foot-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.sb-foot-name {
  font-weight: 500;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text);
}
.sb-foot-role {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-3);
}

.sb-profile-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius);
  text-align: left;
  transition: background 0.12s;
}
.sb-profile-btn:hover { background: var(--hover); }

.sb-logout {
  background: none;
  border: none;
  color: var(--text-3);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  transition: color 0.12s, background 0.12s;
  flex-shrink: 0;
}
.sb-logout:hover {
  color: var(--text);
  background: var(--hover);
}

/* WebSocket indicator */
.ws-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  padding: 6px 8px;
  color: var(--text-3);
}
.ws-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--border-strong);
  flex-shrink: 0;
}
.ws-status.OPEN .ws-dot {
  background: var(--success);
  box-shadow: 0 0 0 3px var(--success-soft);
}

/* ── Main column ────────────────────────────────────────────────────────── */
.main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* ── Topbar ─────────────────────────────────────────────────────────────── */
.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 5;
}

.crumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--text-3);
}
.crumbs strong {
  color: var(--text);
  font-weight: 500;
}
.crumb-sep {
  opacity: 0.4;
}

.topbar-search {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 5px 10px;
  width: 280px;
  color: var(--text-3);
  font-size: 12.5px;
}
.topbar-search input {
  border: 0;
  outline: 0;
  background: transparent;
  flex: 1;
  font: inherit;
  color: var(--text);
}
.topbar-search input::placeholder {
  color: var(--text-3);
}
.theme-toggle {
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-3);
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: color 0.12s, background 0.12s, border-color 0.12s;
  flex-shrink: 0;
}
.theme-toggle:hover {
  color: var(--text);
  background: var(--hover);
  border-color: var(--border-strong);
}
.theme-toggle .pi {
  font-size: 13px;
}

.topbar-kbd {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--text-3);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 1px 5px;
}

/* ── Page content ───────────────────────────────────────────────────────── */
.page-content {
  flex: 1;
  padding: 20px 24px 80px;
}

/* ── Mobile top bar (hidden on desktop) ─────────────────────────────────── */
.mobile-bar {
  display: none;
}

.nav-overlay {
  display: none;
}

/* ── Mobile breakpoint ──────────────────────────────────────────────────── */
@media (max-width: 960px) {
  .app {
    grid-template-columns: 1fr;
  }

  .mobile-bar {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 50px;
    padding: 0 1rem;
    background: var(--surface-2);
    border-bottom: 1px solid var(--border);
    z-index: 300;
  }
  .mobile-title {
    font-weight: 600;
    font-size: 14px;
    color: var(--text);
    flex: 1;
  }
  .hamburger {
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-2);
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: background 0.12s;
  }
  .hamburger:hover {
    background: var(--hover);
  }

  .nav-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(20, 18, 12, 0.42);
    z-index: 190;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: -240px;
    width: 220px;
    height: 100vh;
    transition: left 0.22s ease;
  }
  .sidebar.open {
    left: 0;
  }

  .main {
    padding-top: 50px;
  }

  .topbar {
    top: 50px;
  }

  .topbar-search {
    display: none;
  }
}
</style>
