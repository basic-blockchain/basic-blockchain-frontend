<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  mnemonic: string
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'close'): void
}>()

const confirmed = ref(false)

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      confirmed.value = false
    }
  }
)

function onConfirm() {
  if (!confirmed.value) return
  emit('confirm')
}

function onClose() {
  confirmed.value = false
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.visible"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seed-modal-title"
      @click.self="onClose"
    >
      <div class="modal-card">
        <button
          class="modal-close"
          type="button"
          aria-label="Close recovery phrase dialog"
          @click="onClose"
        >
          <span class="pi pi-times" aria-hidden="true" />
        </button>
        <div class="modal-icon">
          <span class="pi pi-exclamation-triangle" aria-hidden="true" />
        </div>
        <h2 id="seed-modal-title" class="modal-title">Save your recovery phrase</h2>
        <p class="modal-desc">
          This is the <strong>only time</strong> your 12-word recovery phrase will be shown. Write
          it down and store it securely. Without it you cannot sign transfers from this wallet.
        </p>
        <div class="seed-grid" aria-label="Recovery phrase words">
          <div v-for="(word, i) in props.mnemonic.split(' ')" :key="i" class="seed-word">
            <span class="word-index">{{ i + 1 }}</span>
            <span class="word-text">{{ word }}</span>
          </div>
        </div>
        <label class="confirm-label">
          <input v-model="confirmed" type="checkbox" class="confirm-checkbox" />
          I have written down my recovery phrase and stored it safely
        </label>
        <button class="btn-confirm" :disabled="!confirmed" @click="onConfirm">Continue</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}
.modal-card {
  position: relative;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 16px;
  padding: 2rem;
  max-width: 520px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}
.modal-icon {
  font-size: 2rem;
  color: #f59e0b;
  margin-bottom: 0.75rem;
}
.modal-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--surface-border);
  border-radius: 999px;
  background: var(--surface-ground);
  color: var(--text-muted);
  cursor: pointer;
}
.modal-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-heading);
  margin: 0 0 0.75rem;
}
.modal-desc {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0 0 1.25rem;
  line-height: 1.5;
}
.seed-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 10px;
  padding: 1rem;
}
.seed-word {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.88rem;
}
.word-index {
  font-size: 0.7rem;
  color: var(--text-muted);
  min-width: 1rem;
  text-align: right;
}
.word-text {
  font-weight: 600;
  color: var(--text-body);
  font-family: monospace;
}
.confirm-label {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  font-size: 0.88rem;
  color: var(--text-body);
  cursor: pointer;
  margin-bottom: 1.25rem;
  line-height: 1.5;
}
.confirm-checkbox {
  margin-top: 2px;
  flex-shrink: 0;
}
.btn-confirm {
  width: 100%;
  padding: 0.7rem;
  background: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
