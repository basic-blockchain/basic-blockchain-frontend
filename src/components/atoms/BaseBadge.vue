<script setup lang="ts">
defineProps<{
  status: 'active' | 'pending_kyc' | 'frozen' | 'banned' | 'deleted' | 'staff' | 'ok' | 'degraded' | 'error'
}>()
</script>

<template>
  <span class="bdg" :class="`bdg-${status}`" role="status" :aria-label="status">
    <slot>{{ status }}</slot>
  </span>
</template>

<style scoped>
.bdg {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 7px 2px 6px;
  border-radius: 999px;
  line-height: 1.5;
  white-space: nowrap;
}
.bdg::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.bdg-active        { background: var(--success-soft); color: var(--success); }
.bdg-active::before { background: var(--success); }

.bdg-pending_kyc        { background: var(--warning-soft); color: var(--warning); }
.bdg-pending_kyc::before { background: var(--warning); }

.bdg-frozen        { background: var(--info-soft); color: var(--info); }
.bdg-frozen::before { background: var(--info); }

.bdg-banned        { background: var(--danger-soft); color: var(--danger); }
.bdg-banned::before { background: var(--danger); }

.bdg-deleted        { background: var(--muted-soft); color: var(--muted); }
.bdg-deleted::before { background: var(--muted); }

/* No dot for these variants */
.bdg-staff {
  background: #ede9fe;
  color: #5b21b6;
  padding: 2px 7px;
}
.bdg-staff::before { display: none; }

.bdg-ok        { background: var(--success-soft); color: var(--success); }
.bdg-ok::before { background: var(--success); }

.bdg-degraded        { background: var(--warning-soft); color: var(--warning); }
.bdg-degraded::before { background: var(--warning); }

.bdg-error        { background: var(--danger-soft); color: var(--danger); }
.bdg-error::before { background: var(--danger); }
</style>
