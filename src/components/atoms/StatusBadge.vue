<script setup lang="ts">
defineProps<{ status: 'ok' | 'degraded' | 'error' | 'n/a' }>()
</script>

<template>
  <span class="badge" :class="status">
    <span class="dot" />
    {{ status }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  text-transform: uppercase;
}
.dot { width: 7px; height: 7px; border-radius: 50%; }
.ok { background: #dcfce7; color: #166534; }
.ok .dot { background: #22c55e; }
.degraded { background: #fef9c3; color: #854d0e; }
.degraded .dot { background: #eab308; }
.error { background: #fee2e2; color: #991b1b; }
.error .dot { background: #ef4444; }
.n\/a { background: #f1f5f9; color: #64748b; }
.n\/a .dot { background: #94a3b8; }
</style>
