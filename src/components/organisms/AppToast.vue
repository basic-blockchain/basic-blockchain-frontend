<script setup lang="ts">
import { useAppToast } from '@/composables/useAppToast'

const { toasts, remove } = useAppToast()
</script>

<template>
  <teleport to="body">
    <div class="app-toast" role="status" aria-live="polite">
      <transition-group name="toast" tag="div">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="app-toast__item"
          :data-severity="t.severity"
        >
          <div class="app-toast__content">
            <div class="app-toast__icon" aria-hidden="true">
              <span v-if="t.severity === 'success'" class="pi pi-check"></span>
              <span v-else-if="t.severity === 'error'" class="pi pi-times"></span>
              <span v-else-if="t.severity === 'warn'" class="pi pi-exclamation-triangle"></span>
              <span v-else class="pi pi-info-circle"></span>
            </div>
            <div class="app-toast__body">
              <div class="app-toast__summary">{{ t.summary }}</div>
              <div v-if="t.detail" class="app-toast__detail">{{ t.detail }}</div>
            </div>
          </div>
          <button class="app-toast__close" aria-label="Cerrar" @click="remove(t.id)">✕</button>
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<style>
.app-toast {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.app-toast__item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 260px;
  max-width: 420px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
}
.app-toast__content {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  flex: 1;
}
.app-toast__icon {
  width: 28px;
  text-align: center;
  color: var(--text-2);
}
.app-toast__summary {
  font-weight: 600;
  color: var(--text);
}
.app-toast__detail {
  font-size: 12px;
  color: var(--text-2);
}
.app-toast__close {
  background: transparent;
  border: 0;
  color: var(--text-3);
  cursor: pointer;
}
.app-toast__item[data-severity='success'] {
  border-left: 4px solid var(--success);
}
.app-toast__item[data-severity='error'] {
  border-left: 4px solid var(--danger);
}
.app-toast__item[data-severity='warn'] {
  border-left: 4px solid #f59e0b;
}
.app-toast__item[data-severity='info'] {
  border-left: 4px solid var(--accent);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.toast-enter-active,
.toast-leave-active {
  transition: all 160ms ease;
}
</style>
