<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router'
import Toast from 'primevue/toast'
import { useBlockchainWs } from '@/composables/useBlockchainWs'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const { wsStatus } = useBlockchainWs()
const auth = useAuthStore()
const navOpen = ref(false)

watch(route, () => {
  navOpen.value = false
})

const allNavItems = [
  { to: '/wallet', label: 'Wallet', icon: 'pi pi-wallet', requireAuth: true },
  { to: '/dashboard', label: 'Dashboard', icon: 'pi pi-home' },
  { to: '/chain', label: 'Chain', icon: 'pi pi-link' },
  { to: '/mempool', label: 'Mempool', icon: 'pi pi-inbox' },
  { to: '/nodes', label: 'Nodes', icon: 'pi pi-sitemap' },
  { to: '/validation', label: 'Validation', icon: 'pi pi-verified' },
  { to: '/health', label: 'Health', icon: 'pi pi-heart' },
  { to: '/admin', label: 'Admin', icon: 'pi pi-shield', requireRole: 'ADMIN' },
  { to: '/admin/users', label: 'Users', icon: 'pi pi-users', requireRole: 'ADMIN' },
  { to: '/admin/wallets', label: 'Wallets', icon: 'pi pi-wallet', requireRole: 'ADMIN' },
  { to: '/admin/currencies', label: 'Currencies', icon: 'pi pi-globe', requireRole: 'ADMIN' },
  { to: '/admin/treasury', label: 'Treasury', icon: 'pi pi-building', requireRole: 'ADMIN' },
  {
    to: '/admin/exchange-rates',
    label: 'Exchange Rates',
    icon: 'pi pi-sort-alt',
    requireRole: 'ADMIN',
  },
]

const navItems = computed(() =>
  allNavItems.filter((item) => {
    if (item.requireRole) return auth.hasRole(item.requireRole)
    if (item.requireAuth) return auth.isAuthenticated
    return true
  })
)

// Auth views render full-screen without the sidebar layout.
const isAuthRoute = computed(() => ['/login', '/register', '/activate'].includes(route.path))

async function logout() {
  auth.logout()
  await router.push('/login')
}
</script>

<template>
  <!-- Auth views render full-screen without the sidebar. -->
  <div v-if="isAuthRoute">
    <RouterView />
    <Toast position="bottom-right" />
  </div>

  <div v-else class="layout">
    <a href="#main-content" class="skip-link">Skip to main content</a>

    <!-- Mobile top bar -->
    <header class="mobile-bar">
      <span class="pi pi-bitcoin mobile-logo" aria-hidden="true" />
      <span class="mobile-title">Blockchain</span>
      <button
        class="hamburger"
        :aria-expanded="navOpen"
        aria-controls="sidebar-nav"
        aria-label="Toggle navigation"
        @click="navOpen = !navOpen"
      >
        <span class="pi" :class="navOpen ? 'pi-times' : 'pi-bars'" aria-hidden="true" />
      </button>
    </header>

    <!-- Overlay -->
    <div v-if="navOpen" class="nav-overlay" aria-hidden="true" @click="navOpen = false" />

    <aside id="sidebar-nav" class="sidebar" :class="{ open: navOpen }" aria-label="Main navigation">
      <div class="sidebar-header">
        <span class="pi pi-bitcoin" aria-hidden="true" style="font-size: 1.5rem" />
        <span class="sidebar-title">Blockchain</span>
      </div>
      <nav aria-label="Site sections">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{
            active: item.to === '/admin' ? route.path === '/admin' : route.path.startsWith(item.to),
          }"
          :aria-current="
            (item.to === '/admin' ? route.path === '/admin' : route.path.startsWith(item.to))
              ? 'page'
              : undefined
          "
        >
          <span :class="item.icon" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <!-- User chip -->
      <div v-if="auth.isAuthenticated && auth.user" class="user-chip">
        <div class="user-chip-info">
          <span class="user-avatar">{{ auth.user.display_name.charAt(0).toUpperCase() }}</span>
          <div class="user-chip-text">
            <span class="user-display">{{ auth.user.display_name }}</span>
            <span class="user-role">{{ auth.user.roles[0] ?? 'VIEWER' }}</span>
          </div>
        </div>
        <button class="logout-btn" aria-label="Sign out" title="Sign out" @click="logout">
          <span class="pi pi-sign-out" aria-hidden="true" />
        </button>
      </div>

      <div
        class="ws-status"
        :class="wsStatus"
        role="status"
        aria-live="polite"
        :aria-label="`WebSocket: ${wsStatus === 'OPEN' ? 'connected' : 'connecting'}`"
      >
        <span class="dot" aria-hidden="true" />
        <span>{{ wsStatus === 'OPEN' ? 'Live' : 'Connecting…' }}</span>
      </div>
    </aside>

    <main id="main-content" class="main-content" tabindex="-1">
      <RouterView />
    </main>
    <Toast position="bottom-right" />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background: var(--bg-base);
}

/* ── Desktop sidebar ─────────────────────────────────────────────────── */
.sidebar {
  width: 240px;
  background: linear-gradient(180deg, var(--sidebar-start) 0%, var(--sidebar-end) 100%);
  color: var(--sidebar-text);
  display: flex;
  flex-direction: column;
  padding: 1rem 0.85rem;
  gap: 0.4rem;
  position: fixed;
  height: 100vh;
  border-right: 1px solid var(--sidebar-border);
  box-shadow: var(--shadow-soft);
  z-index: 200;
}
.sidebar-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: var(--sidebar-title);
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.62rem 0.78rem;
  border-radius: 10px;
  text-decoration: none;
  color: var(--sidebar-link);
  transition: all 0.18s ease;
  border: 1px solid transparent;
}
.nav-item:hover,
.nav-item.active {
  background: var(--sidebar-link-active-bg);
  color: var(--sidebar-link-active-text);
  border-color: var(--sidebar-link-active-border);
}

/* User chip */
.user-chip {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.6rem 0.5rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--sidebar-border);
}
.user-chip-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}
.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--primary-color);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  flex-shrink: 0;
}
.user-chip-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.user-display {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--sidebar-link-active-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user-role {
  font-size: 0.68rem;
  color: var(--sidebar-link);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.logout-btn {
  background: none;
  border: none;
  color: var(--sidebar-link);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 6px;
  transition:
    color 0.15s,
    background 0.15s;
  flex-shrink: 0;
}
.logout-btn:hover {
  color: var(--sidebar-link-active-text);
  background: rgba(255, 255, 255, 0.08);
}

.ws-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  padding: 0.6rem 0.5rem;
  color: var(--sidebar-link);
}
.ws-status .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #95a4c2;
}
.ws-status.OPEN .dot {
  background: #34d399;
  box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.12);
}

.main-content {
  margin-left: 240px;
  flex: 1;
  padding: 1.6rem;
  background:
    radial-gradient(circle at 92% 8%, rgba(61, 118, 221, 0.08), transparent 24%),
    radial-gradient(circle at 15% 94%, rgba(38, 180, 136, 0.08), transparent 20%), var(--bg-base);
  min-height: 100vh;
}

/* ── Mobile top bar (hidden on desktop) ─────────────────────────────── */
.mobile-bar {
  display: none;
}

/* ── Mobile overlay ──────────────────────────────────────────────────── */
.nav-overlay {
  display: none;
}

/* ── Mobile breakpoint ───────────────────────────────────────────────── */
@media (max-width: 960px) {
  .mobile-bar {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 52px;
    padding: 0 1rem;
    background: var(--sidebar-start);
    border-bottom: 1px solid var(--sidebar-border);
    z-index: 300;
  }
  .mobile-logo {
    font-size: 1.3rem;
    color: var(--sidebar-title);
  }
  .mobile-title {
    font-weight: 700;
    font-size: 1rem;
    color: var(--sidebar-title);
    flex: 1;
  }
  .hamburger {
    background: none;
    border: 1px solid var(--surface-border);
    border-radius: 8px;
    color: var(--text-body);
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s;
  }
  .hamburger:hover {
    background: var(--surface-soft);
  }

  .nav-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    z-index: 190;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: -260px;
    width: 240px;
    height: 100vh;
    padding-top: 1rem;
    transition: left 0.22s ease;
    border-right: 1px solid var(--sidebar-border);
  }
  .sidebar.open {
    left: 0;
  }

  .main-content {
    margin-left: 0;
    padding: 1rem;
    padding-top: calc(52px + 1rem);
  }

  .layout {
    flex-direction: column;
  }
}
</style>
