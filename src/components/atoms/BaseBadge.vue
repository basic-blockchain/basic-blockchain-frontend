<script setup lang="ts">
import { computed } from 'vue'

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent'
type Variant = 'soft' | 'outline'

interface Props {
  tone?: Tone
  variant?: Variant
  dot?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  tone: 'neutral',
  variant: 'soft',
  dot: undefined,
})

const dotEnabled = computed(() =>
  props.dot === undefined ? props.variant === 'soft' : props.dot,
)

const rootClasses = computed(() => [
  'base-bdg',
  `base-bdg--${props.tone}`,
  `base-bdg--${props.variant}`,
  { 'base-bdg--dot': dotEnabled.value },
])
</script>

<template>
  <span :class="rootClasses">
    <slot />
  </span>
</template>

<style scoped>
.base-bdg {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px 2px 6px;
  border-radius: var(--radius-pill);
  font: 500 11px/1.5 var(--font-sans);
  white-space: nowrap;
}

.base-bdg:not(.base-bdg--dot) {
  padding: 2px 7px;
}

.base-bdg--dot::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: currentColor;
}

/* Soft variant — filled-soft pill */
.base-bdg--soft.base-bdg--success {
  background: var(--success-soft);
  color: var(--success);
}
.base-bdg--soft.base-bdg--warning {
  background: var(--warning-soft);
  color: var(--warning);
}
.base-bdg--soft.base-bdg--danger {
  background: var(--danger-soft);
  color: var(--danger);
}
.base-bdg--soft.base-bdg--info {
  background: var(--info-soft);
  color: var(--info);
}
.base-bdg--soft.base-bdg--neutral {
  background: var(--muted-soft);
  color: var(--muted);
}
.base-bdg--soft.base-bdg--accent {
  background: var(--accent-soft);
  color: var(--accent-text);
}

/* Accent dot diverges from text color (text-2 token, dot is the brand
 * accent). Other tones share text + dot colors via `currentColor`. */
.base-bdg--soft.base-bdg--accent.base-bdg--dot::before {
  background: var(--accent);
}

/* Outline variant — surface-2 + border, tone tweaks text only */
.base-bdg--outline {
  background: var(--surface-2);
  color: var(--text-2);
  border: 1px solid var(--border);
}
.base-bdg--outline.base-bdg--success {
  color: var(--success);
}
.base-bdg--outline.base-bdg--warning {
  color: var(--warning);
}
.base-bdg--outline.base-bdg--danger {
  color: var(--danger);
}
.base-bdg--outline.base-bdg--info {
  color: var(--info);
}
.base-bdg--outline.base-bdg--neutral {
  color: var(--text-2);
}
.base-bdg--outline.base-bdg--accent {
  color: var(--accent-text);
}

/* Outline dot uses the tone's "strong" colour (matches soft variant). */
.base-bdg--outline.base-bdg--accent.base-bdg--dot::before {
  background: var(--accent);
}
</style>
