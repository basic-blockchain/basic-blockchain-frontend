<script setup lang="ts">
import { useMiningStore } from '@/stores/mining'

const miningStore = useMiningStore()
</script>

<template>
  <Teleport to="body">
    <Transition name="mining-slide">
      <div v-if="miningStore.isVisible" class="mining-notification">
        <div class="mining-header">
          <div class="mining-title">
            <span class="icon">⛏</span>
            <span>Minando bloque #{{ miningStore.currentBlock }}</span>
          </div>
          <span v-if="miningStore.error" class="error-badge">Error</span>
          <span v-else class="time-badge">{{ miningStore.elapsedSeconds }}s</span>
        </div>

        <div class="mining-progress-container">
          <div class="mining-progress-bar">
            <div
              class="mining-progress-fill"
              :style="{ width: `${miningStore.progress}%` }"
              :class="{ error: miningStore.error, complete: miningStore.progress === 100 }"
            ></div>
          </div>
          <span class="mining-percent">{{ miningStore.progress }}%</span>
        </div>

        <div v-if="miningStore.error" class="error-message">
          {{ miningStore.error }}
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.mining-notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  box-shadow: var(--shadow-lg);
  max-width: 320px;
  z-index: 100;
  animation: slideIn 0.3s ease-out;
}

.mining-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.mining-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 13px;
  color: var(--text);
}

.icon {
  font-size: 18px;
  animation: swing 1s ease-in-out infinite;
}

.time-badge,
.error-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--surface-2);
  color: var(--text-2);
  font-weight: 500;
}

.error-badge {
  background: var(--danger-soft);
  color: var(--danger);
}

.mining-progress-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mining-progress-bar {
  flex: 1;
  height: 4px;
  background: var(--surface-2);
  border-radius: 2px;
  overflow: hidden;
}

.mining-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  transition: width 0.2s ease-out;
  border-radius: 2px;
}

.mining-progress-fill.complete {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.mining-progress-fill.error {
  background: linear-gradient(90deg, #ef4444, #f87171);
}

.mining-percent {
  font-size: 11px;
  color: var(--text-2);
  font-weight: 600;
  min-width: 28px;
  text-align: right;
}

.error-message {
  margin-top: 8px;
  font-size: 11px;
  color: var(--danger);
  padding: 6px;
  background: var(--danger-soft);
  border-radius: 4px;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes swing {
  0%,
  100% {
    transform: rotate(-10deg);
  }
  50% {
    transform: rotate(10deg);
  }
}

.mining-slide-enter-active,
.mining-slide-leave-active {
  transition: all 0.3s ease-out;
}

.mining-slide-enter-from {
  transform: translateX(400px);
  opacity: 0;
}

.mining-slide-leave-to {
  transform: translateX(400px);
  opacity: 0;
}
</style>
