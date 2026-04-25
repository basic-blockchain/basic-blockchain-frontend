<script setup lang="ts">
import { RouterView, RouterLink, useRoute } from 'vue-router'
import Toast from 'primevue/toast'
import { useBlockchainWs } from '@/composables/useBlockchainWs'

const route = useRoute()
const { wsStatus } = useBlockchainWs()

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: 'pi pi-home' },
  { to: '/chain', label: 'Chain', icon: 'pi pi-link' },
  { to: '/mempool', label: 'Mempool', icon: 'pi pi-inbox' },
  { to: '/nodes', label: 'Nodes', icon: 'pi pi-sitemap' },
  { to: '/validation', label: 'Validation', icon: 'pi pi-verified' },
  { to: '/health', label: 'Health', icon: 'pi pi-heart' },
]
</script>

<template>
  <div class="layout">
    <a
      href="#main-content"
      class="skip-link"
    >Skip to main content</a>
    <aside
      class="sidebar"
      aria-label="Main navigation"
    >
      <div class="sidebar-header">
        <span
          class="pi pi-bitcoin"
          aria-hidden="true"
          style="font-size: 1.5rem"
        />
        <span class="sidebar-title">Blockchain</span>
      </div>
      <nav aria-label="Site sections">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: route.path.startsWith(item.to) }"
          :aria-current="route.path.startsWith(item.to) ? 'page' : undefined"
        >
          <span
            :class="item.icon"
            aria-hidden="true"
          />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div
        class="ws-status"
        :class="wsStatus"
        role="status"
        aria-live="polite"
        :aria-label="`WebSocket: ${wsStatus === 'OPEN' ? 'connected' : 'connecting'}`"
      >
        <span
          class="dot"
          aria-hidden="true"
        />
        <span>{{ wsStatus === 'OPEN' ? 'Live' : 'Connecting…' }}</span>
      </div>
    </aside>
    <main
      id="main-content"
      class="main-content"
      tabindex="-1"
    >
      <RouterView />
    </main>
    <Toast position="bottom-right" />
  </div>
</template>

<style scoped>
.layout { display: flex; min-height: 100vh; background: var(--bg-base); }
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
.ws-status {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  padding: 0.6rem 0.5rem;
  color: var(--sidebar-link);
}
.ws-status .dot { width: 8px; height: 8px; border-radius: 50%; background: #95a4c2; }
.ws-status.OPEN .dot { background: #34d399; box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.12); }
.main-content {
  margin-left: 240px;
  flex: 1;
  padding: 1.6rem;
  background:
    radial-gradient(circle at 92% 8%, rgba(61, 118, 221, 0.08), transparent 24%),
    radial-gradient(circle at 15% 94%, rgba(38, 180, 136, 0.08), transparent 20%),
    var(--bg-base);
  min-height: 100vh;
}

@media (max-width: 960px) {
  .sidebar { width: 100%; height: auto; position: static; border-right: none; }
  .main-content { margin-left: 0; padding: 1rem; }
  .layout { flex-direction: column; }
}
</style>
