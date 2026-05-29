<script setup lang="ts">
import { computed } from 'vue'

type Status = 'running' | 'success' | 'info' | 'error'
type Position = 'pill' | 'top'

interface Props {
  open: boolean
  title: string
  subtitle?: string
  status?: Status
  progress?: number
  elapsed?: number | string
  position?: Position
  actionLabel?: string
  showAction?: boolean
  dismissible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: undefined,
  status: 'running',
  progress: 0,
  elapsed: undefined,
  position: 'pill',
  actionLabel: 'Detalles',
  showAction: false,
  dismissible: false,
})

const emit = defineEmits<{
  action: []
  close: []
}>()

const progressValue = computed(() => {
  if (props.progress === undefined || props.progress === null) return null
  const value = Number(props.progress)
  if (!Number.isFinite(value)) return null
  return Math.max(0, Math.min(100, Math.round(value)))
})

const statusIcon = computed(() => {
  switch (props.status) {
    case 'success':
      return 'pi pi-check'
    case 'info':
      return 'pi pi-info-circle'
    case 'error':
      return 'pi pi-exclamation-triangle'
    default:
      return 'pi pi-spinner pi-spin'
  }
})

const statusClass = computed(() => `is-${props.status}`)
const positionClass = computed(() => `task-indicator--${props.position}`)

function onAction() {
  emit('action')
}

function onClose() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="task-indicator">
      <div
        v-if="open"
        class="task-indicator"
        :class="[positionClass, statusClass]"
        role="status"
        aria-live="polite"
      >
        <div class="task-indicator__content">
          <div class="task-indicator__icon">
            <span :class="statusIcon" aria-hidden="true" />
          </div>
          <div class="task-indicator__text">
            <div class="task-indicator__title">{{ title }}</div>
            <div v-if="subtitle" class="task-indicator__subtitle">{{ subtitle }}</div>
          </div>
          <div class="task-indicator__meta">
            <span v-if="elapsed !== undefined" class="task-indicator__badge">{{ elapsed }}s</span>
            <button
              v-if="dismissible"
              class="task-indicator__close"
              type="button"
              aria-label="Cerrar"
              @click="onClose"
            >
              <span class="pi pi-times" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div v-if="progressValue !== null" class="task-indicator__progress" aria-hidden="true">
          <div class="task-indicator__track">
            <div class="task-indicator__progress-bar" :style="{ width: `${progressValue}%` }" />
          </div>
          <span class="task-indicator__percent">{{ progressValue }}%</span>
        </div>

        <button v-if="showAction" class="task-indicator__action" type="button" @click="onAction">
          {{ actionLabel }}
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.task-indicator {
  position: fixed;
  z-index: 220;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 360px;
  color: var(--text);
}

.task-indicator--pill {
  right: 18px;
  bottom: 18px;
}

.task-indicator--top {
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  width: min(900px, calc(100vw - 24px));
  border-radius: 999px;
  padding: 10px 16px;
}

.task-indicator__content {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
}

.task-indicator__icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--surface-2);
  display: grid;
  place-items: center;
  color: var(--text-2);
}

.task-indicator__title {
  font-size: 13px;
  font-weight: 600;
}

.task-indicator__subtitle {
  font-size: 11.5px;
  color: var(--text-3);
  margin-top: 2px;
}

.task-indicator__meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-indicator__badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--surface-2);
  color: var(--text-2);
  font-weight: 600;
}

.task-indicator__close {
  border: 0;
  background: transparent;
  color: var(--text-3);
  width: 24px;
  height: 24px;
  border-radius: 6px;
  cursor: pointer;
}

.task-indicator__close:hover {
  background: var(--hover);
  color: var(--text);
}

.task-indicator__progress {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
}

.task-indicator__track {
  height: 4px;
  border-radius: 999px;
  background: var(--surface-2);
  overflow: hidden;
}

.task-indicator__progress-bar {
  height: 100%;
  background: var(--accent);
  transition: width 0.2s ease;
}

.task-indicator__percent {
  font-size: 11px;
  color: var(--text-3);
  font-weight: 600;
}

.task-indicator__action {
  align-self: flex-start;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  padding: 4px 10px;
  font-size: 11.5px;
  border-radius: 999px;
  cursor: pointer;
}

.task-indicator__action:hover {
  background: var(--hover);
}

.task-indicator.is-success .task-indicator__icon {
  background: var(--success-soft);
  color: var(--success);
}

.task-indicator.is-error .task-indicator__icon {
  background: var(--danger-soft, rgba(185, 28, 28, 0.12));
  color: var(--danger, #b91c1c);
}

.task-indicator.is-info .task-indicator__icon {
  background: var(--surface-2);
  color: var(--text-2);
}

.task-indicator.is-success .task-indicator__progress-bar {
  background: var(--success);
}

.task-indicator.is-error .task-indicator__progress-bar {
  background: var(--danger, #b91c1c);
}

.task-indicator-enter-active,
.task-indicator-leave-active {
  transition: all 0.25s ease;
}

.task-indicator-enter-from,
.task-indicator-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (max-width: 720px) {
  .task-indicator--pill {
    right: 12px;
    left: 12px;
    max-width: none;
  }
}
</style>
