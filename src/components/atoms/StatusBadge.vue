<script setup lang="ts">
// Deprecated in favour of BaseBadge (`tone × variant × dot`). Consolidation
// lands in Phase 7.7 alongside the HealthView migration; keep using this
// component until then for parity with the v1 health chrome.
defineProps<{ status: 'ok' | 'degraded' | 'error' | 'n/a' }>()
</script>

<template>
  <span
    class="badge"
    :class="status"
    role="status"
    :aria-label="`Status: ${status}`"
  >
    <span
      class="dot"
      aria-hidden="true"
    />
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
.ok { background: rgba(34, 197, 94, 0.16); color: #86efac; }
.ok .dot { background: #22c55e; }
.degraded { background: rgba(234, 179, 8, 0.16); color: #fcd34d; }
.degraded .dot { background: #eab308; }
.error { background: rgba(239, 68, 68, 0.18); color: #fca5a5; }
.error .dot { background: #ef4444; }
.n\/a { background: rgba(160, 168, 192, 0.16); color: #a0a8c0; }
.n\/a .dot { background: #6d7382; }
</style>
