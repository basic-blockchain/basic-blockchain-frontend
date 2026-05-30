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
    {
      path: '/wallet',
      name: 'wallet',
      component: () => import('@/views/WalletView.vue'),
      // BR-WL-11 (simulator side): the personal-wallet view is for
      // end users only. ADMIN and OPERATOR must reach platform data
      // through `/admin/*`, not by impersonating a customer.
      meta: { requireRole: 'VIEWER' },
    },
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
      path: '/admin/audit',
      name: 'admin-audit',
      component: () => import('@/views/AdminAuditView.vue'),
      meta: { requireRole: 'ADMIN' },
    },
    {
      path: '/admin/kyc',
      name: 'admin-kyc',
      component: () => import('@/views/AdminKycView.vue'),
      meta: { requireRole: 'ADMIN' },
    },
    {
      path: '/admin/compliance',
      name: 'admin-compliance',
      component: () => import('@/views/AdminComplianceView.vue'),
      meta: { requireRole: 'ADMIN' },
    },
    {
      path: '/admin/movements',
      name: 'admin-movements',
      component: () => import('@/views/AdminMovementsView.vue'),
      meta: { requireRole: 'ADMIN' },
    },
    {
      path: '/admin/sends',
      name: 'admin-sends',
      component: () => import('@/views/AdminSendsView.vue'),
      meta: { requireRole: 'ADMIN' },
    },
    {
      path: '/admin/permissions',
      name: 'admin-permissions',
      component: () => import('@/views/AdminPermissionsView.vue'),
      meta: { requireRole: 'ADMIN' },
    },
    {
      path: '/admin/settings',
      name: 'admin-settings',
      component: () => import('@/views/AdminSettingsView.vue'),
      meta: { requireRole: 'ADMIN' },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
    },
    { path: '/p2p',      name: 'p2p',      component: () => import('@/views/P2PView.vue'),      meta: { requireAuth: true } },
    { path: '/exchange', name: 'exchange', component: () => import('@/views/ExchangeView.vue'),  meta: { requireAuth: true } },
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

/**
 * Pick the landing route for an authenticated user based on their role.
 * Staff roles go to the admin overview; end users go to their wallet;
 * unknown / role-less accounts fall back to the public dashboard.
 *
 * Single source of truth so the post-login redirect, the
 * public-route bounce, and the requireRole-failure redirect cannot
 * drift apart and accidentally drop a staff account on `/wallet`
 * (which is now VIEWER-only — see BR-WL-11 in the simulator).
 */
export function defaultLandingFor(roles: readonly string[]): string {
  if (roles.includes('ADMIN')) return '/admin'
  if (roles.includes('OPERATOR')) return '/admin'
  if (roles.includes('VIEWER')) return '/wallet'
  return '/dashboard'
}

router.beforeEach((to) => {
  const auth = useAuthStore()
  const isPublic = to.meta.public === true

  // Unauthenticated user hitting a protected route → /login.
  if (!isPublic && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  // Role check (e.g. /admin requires ADMIN, /wallet requires VIEWER).
  // Redirecting to the role-appropriate landing keeps the user out of
  // the bounce loop that the old "always go to /wallet" guard caused
  // for ADMIN now that /wallet is no longer reachable by them.
  const requiredRole = to.meta.requireRole as string | undefined
  if (requiredRole && !auth.hasRole(requiredRole)) {
    return defaultLandingFor(auth.user?.roles ?? [])
  }

  // Authenticated user hitting /login or /register → role landing.
  if (isPublic && auth.isAuthenticated && to.name !== 'activate') {
    return defaultLandingFor(auth.user?.roles ?? [])
  }
})

export default router
