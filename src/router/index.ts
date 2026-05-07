import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/dashboard' },

    // ── Public auth routes ────────────────────────────────────────────────
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { public: true },
    },
    {
      path: '/activate',
      name: 'activate',
      component: () => import('@/views/ActivateView.vue'),
      meta: { public: true },
    },

    // ── Authenticated routes ──────────────────────────────────────────────
    { path: '/wallet', name: 'wallet', component: () => import('@/views/WalletView.vue') },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { requireRole: 'ADMIN' },
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('@/views/AdminUsersView.vue'),
      meta: { requireRole: 'ADMIN' },
    },
    {
      path: '/admin/wallets',
      name: 'admin-wallets',
      component: () => import('@/views/AdminWalletsView.vue'),
      meta: { requireRole: 'ADMIN' },
    },
    {
      path: '/admin/currencies',
      name: 'admin-currencies',
      component: () => import('@/views/AdminCurrenciesView.vue'),
      meta: { requireRole: 'ADMIN' },
    },
    {
      path: '/admin/treasury',
      name: 'admin-treasury',
      component: () => import('@/views/AdminTreasuryView.vue'),
      meta: { requireRole: 'ADMIN' },
    },
    {
      path: '/admin/exchange-rates',
      name: 'admin-exchange-rates',
      component: () => import('@/views/AdminExchangeRatesView.vue'),
      meta: { requireRole: 'ADMIN' },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
    },
    { path: '/chain', name: 'chain', component: () => import('@/views/ChainView.vue') },
    { path: '/mempool', name: 'mempool', component: () => import('@/views/MempoolView.vue') },
    { path: '/nodes', name: 'nodes', component: () => import('@/views/NodesView.vue') },
    {
      path: '/validation',
      name: 'validation',
      component: () => import('@/views/ValidationView.vue'),
    },
    { path: '/health', name: 'health', component: () => import('@/views/HealthView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  const isPublic = to.meta.public === true

  // Unauthenticated user hitting a protected route → /login.
  if (!isPublic && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  // Role check (e.g. /admin requires ADMIN).
  const requiredRole = to.meta.requireRole as string | undefined
  if (requiredRole && !auth.hasRole(requiredRole)) {
    return { name: 'wallet' }
  }

  // Authenticated user hitting /login or /register → /wallet.
  if (isPublic && auth.isAuthenticated && to.name !== 'activate') {
    return { name: 'wallet' }
  }
})

export default router
