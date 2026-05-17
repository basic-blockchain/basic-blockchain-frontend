<script setup lang="ts">
import { computed, onMounted, useAttrs, useSlots } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  loading?: boolean
  disabled?: boolean
  iconOnly?: boolean
  block?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'md',
  loading: false,
  disabled: false,
  iconOnly: false,
  block: false,
  type: 'button',
})

const attrs = useAttrs()
const slots = useSlots()

const isInert = computed(() => props.loading || props.disabled)

const rootClasses = computed(() => [
  'base-btn',
  `base-btn--${props.variant}`,
  `base-btn--${props.size}`,
  {
    'base-btn--block': props.block,
    'base-btn--icon-only': props.iconOnly,
    'base-btn--loading': props.loading,
  },
])

onMounted(() => {
  if (
    import.meta.env.DEV &&
    props.iconOnly &&
    !attrs['aria-label'] &&
    !attrs['aria-labelledby'] &&
    !slots.default
  ) {
     
    console.warn(
      '[BaseButton] iconOnly=true requires an `aria-label` attribute or default slot content for an accessible name.',
    )
  }
})
</script>

<template>
  <button
    :class="rootClasses"
    :type="type"
    :disabled="isInert"
    :aria-busy="loading ? 'true' : undefined"
  >
    <span
      v-if="loading || slots.leading"
      class="base-btn__leading"
    >
      <span
        v-if="loading"
        class="base-btn__spinner"
        aria-hidden="true"
      />
      <slot
        v-else
        name="leading"
      />
    </span>
    <span :class="iconOnly ? 'base-btn__sr-only' : 'base-btn__label'">
      <slot />
    </span>
    <span
      v-if="slots.trailing"
      class="base-btn__trailing"
    >
      <slot name="trailing" />
    </span>
  </button>
</template>

<style scoped>
.base-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  height: 30px;
  padding: 0 var(--space-md);
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font: 500 12.5px/1 var(--font-sans);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  white-space: nowrap;
  text-decoration: none;
  transition:
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.base-btn:hover:not(:disabled) {
  background: var(--surface-2);
  border-color: var(--border-strong);
}

.base-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.base-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.base-btn:active:not(:disabled) {
  transform: translateY(0.5px);
}

/* Variants */
.base-btn--primary {
  background: var(--text);
  color: var(--bg);
  border-color: var(--text);
}
.base-btn--primary:hover:not(:disabled) {
  background: #2c2a26;
  border-color: #2c2a26;
}

.base-btn--danger {
  color: var(--danger);
}
.base-btn--danger:hover:not(:disabled) {
  background: var(--danger-soft);
  border-color: #f5c8c4;
}

.base-btn--ghost {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}
.base-btn--ghost:hover:not(:disabled) {
  background: var(--hover);
}

/* Sizes */
.base-btn--sm {
  height: 26px;
  padding: 0 9px;
  font-size: 12px;
}

/* Modifiers */
.base-btn--icon-only {
  width: 28px;
  padding: 0;
  justify-content: center;
}
.base-btn--sm.base-btn--icon-only {
  width: 26px;
}

.base-btn--block {
  width: 100%;
  justify-content: center;
}

/* Icons inside button */
.base-btn :deep(svg) {
  width: 14px;
  height: 14px;
}
.base-btn--sm :deep(svg) {
  width: 12px;
  height: 12px;
}

/* Spinner — mirrors prototype `.spinner` from propuesta_refactorizacion/styles.css */
.base-btn__spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: base-btn-spin 0.7s linear infinite;
}

@keyframes base-btn-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Visually-hidden label for iconOnly buttons (slot still contributes
 * accessible name via screen-reader text). */
.base-btn__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.base-btn__leading,
.base-btn__trailing {
  display: inline-flex;
  align-items: center;
}
</style>
