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
  { to: '/health', label: 'Health', icon: 'pi pi-heart' },
]
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="pi pi-bitcoin" style="font-size: 1.5rem" />
        <span class="sidebar-title">Blockchain</span>
      </div>
      <nav>
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: route.path.startsWith(item.to) }"
        >
          <span :class="item.icon" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div class="ws-status" :class="wsStatus">
        <span class="dot" />
        <span>{{ wsStatus === 'OPEN' ? 'Live' : 'Connecting…' }}</span>
      </div>
    </aside>
    <main class="main-content">
      <RouterView />
    </main>
    <Toast position="bottom-right" />
  </div>
</template>

<style scoped>
.layout { display: flex; min-height: 100vh; }
.sidebar {
  width: 220px;
  background: #1a1a2e;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 0.5rem;
  position: fixed;
  height: 100vh;
}
.sidebar-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #fff;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-radius: 6px;
  text-decoration: none;
  color: #b0b0c0;
  transition: all 0.15s;
}
.nav-item:hover,
.nav-item.active {
  background: #2d2d5e;
  color: #fff;
}
.ws-status {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  padding: 0.5rem;
}
.ws-status .dot { width: 8px; height: 8px; border-radius: 50%; background: #888; }
.ws-status.OPEN .dot { background: #4ade80; }
.main-content {
  margin-left: 220px;
  flex: 1;
  padding: 1.5rem;
  background: #f8f9fa;
}
</style>
