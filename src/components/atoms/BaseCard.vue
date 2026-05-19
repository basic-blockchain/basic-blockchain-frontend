<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'default' | 'bigstat'
type Padding = 'default' | 'none' | 'sm'

interface Props {
  variant?: Variant
  padding?: Padding
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  padding: 'default',
})

if (
  import.meta.env.DEV &&
  props.variant === 'bigstat' &&
  props.padding !== 'default'
) {
   
  console.warn(
    `[BaseCard] variant='bigstat' ignores padding='${props.padding}'; the bigstat variant enforces its own padding scale.`,
  )
}

const rootClasses = computed(() => [
  'base-card',
  `base-card--${props.variant}`,
  `base-card--pad-${props.padding}`,
])
</script>

<template>
  <div :class="rootClasses">
    <div
      v-if="$slots.header"
      class="base-card__header"
    >
      <slot name="header" />
    </div>
    <div class="base-card__body">
      <slot />
    </div>
    <div
      v-if="$slots.footer"
      class="base-card__footer"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.base-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

/* Default variant padding (applies to wrapper) */
.base-card--default.base-card--pad-default {
  padding: 14px 16px;
}
.base-card--default.base-card--pad-sm {
  padding: 8px 12px;
}
.base-card--default.base-card--pad-none {
  padding: 0;
  overflow: hidden;
}

/* Bigstat variant — fixed padding, typography deltas on slot wrappers */
.base-card--bigstat {
  padding: 14px 16px 16px;
}

.base-card--bigstat .base-card__header {
  font: 500 11.5px/1.2 var(--font-sans);
  color: var(--text-2);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.base-card--bigstat .base-card__body {
  font: 600 24px/1 var(--font-sans);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  margin-top: 4px;
  color: var(--text);
}

.base-card--bigstat .base-card__footer {
  font: 500 11.5px/1.4 var(--font-sans);
  color: var(--text-3);
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
</style>
