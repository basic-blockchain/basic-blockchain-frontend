<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'default' | 'sm' | 'icon'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}>()
</script>

<template>
  <button
    class="btn"
    :class="[
      variant  ? `btn-${variant}`  : 'btn-secondary',
      size && size !== 'default' ? `btn-${size}` : '',
    ]"
    :disabled="disabled"
    :type="type ?? 'button'"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 11px;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font: 500 12.5px/1 var(--font-sans);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  white-space: nowrap;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  text-decoration: none;
}
.btn:hover {
  background: var(--surface-2);
  border-color: var(--border-strong);
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Variants */
.btn-primary {
  background: var(--text);
  color: var(--bg);
  border-color: var(--text);
}
.btn-primary:hover:not(:disabled) {
  background: #2c2a26;
  border-color: #2c2a26;
}

.btn-secondary {
  background: var(--surface);
  color: var(--text);
  border-color: var(--border);
}

.btn-danger {
  color: var(--danger);
  border-color: var(--border);
}
.btn-danger:hover:not(:disabled) {
  background: var(--danger-soft);
  border-color: #f5c8c4;
}

.btn-ghost {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}
.btn-ghost:hover:not(:disabled) {
  background: var(--hover);
}

/* Sizes */
.btn-sm {
  height: 26px;
  padding: 0 9px;
  font-size: 12px;
}
.btn-icon {
  width: 28px;
  height: 28px;
  padding: 0;
  justify-content: center;
}
.btn-sm.btn-icon {
  width: 26px;
  height: 26px;
}
</style>
