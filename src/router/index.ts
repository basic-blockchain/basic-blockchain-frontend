import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/dashboard' },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
    },
    { path: '/chain', name: 'chain', component: () => import('@/views/ChainView.vue') },
    { path: '/mempool', name: 'mempool', component: () => import('@/views/MempoolView.vue') },
    { path: '/nodes', name: 'nodes', component: () => import('@/views/NodesView.vue') },
    { path: '/health', name: 'health', component: () => import('@/views/HealthView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})

export default router
