<script setup lang="ts">
import { computed } from 'vue'

export type StepStatus = 'pending' | 'current' | 'done' | 'error'

export interface Step {
  key: string
  label: string
  status?: StepStatus
}

interface Props {
  steps: Step[]
  current: number
}

const props = defineProps<Props>()

if (import.meta.env.DEV && props.steps.length === 0) {
  // eslint-disable-next-line no-console
  console.warn('[Stepper] received an empty `steps` array — rendering will be empty.')
}

function resolveStatus(step: Step, index: number): StepStatus {
  if (step.status) return step.status
  if (index < props.current) return 'done'
  if (index === props.current) return 'current'
  return 'pending'
}

const resolvedSteps = computed(() =>
  props.steps.map((step, index) => ({
    step,
    index,
    status: resolveStatus(step, index),
  })),
)

function stepGlyph(status: StepStatus, index: number): string {
  if (status === 'done') return '✓'
  if (status === 'error') return '!'
  return String(index + 1)
}

function connectorClass(
  entering: StepStatus,
  previous: StepStatus,
): string {
  if (entering === 'done') return 'stepper__line--done'
  if (entering === 'error' && (previous === 'done' || previous === 'error')) {
    return 'stepper__line--error'
  }
  if (entering === 'current' && previous === 'done') return 'stepper__line--done'
  return 'stepper__line--pending'
}
</script>

<template>
  <ol
    class="stepper"
    role="list"
  >
    <template
      v-for="(item, i) in resolvedSteps"
      :key="item.step.key"
    >
      <li
        class="stepper__item"
        :class="`stepper__item--${item.status}`"
        :aria-current="item.status === 'current' ? 'step' : undefined"
      >
        <span
          class="stepper__circle"
          aria-hidden="true"
        >{{ stepGlyph(item.status, item.index) }}</span>
        <span class="stepper__label">{{ item.step.label }}</span>
      </li>
      <span
        v-if="i < resolvedSteps.length - 1"
        class="stepper__line"
        :class="connectorClass(resolvedSteps[i + 1].status, item.status)"
        aria-hidden="true"
      />
    </template>
  </ol>
</template>

<style scoped>
.stepper {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin: 0 0 18px;
  padding: 0;
  list-style: none;
}

.stepper__item {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}

.stepper__circle {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font: 600 11px/1 var(--font-sans);
  background: var(--surface-2);
  color: var(--text-3);
  border: 1px solid var(--border);
  transition:
    background var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out);
}

.stepper__label {
  font: 500 11.5px/1 var(--font-sans);
  color: var(--text-3);
  white-space: nowrap;
  transition: color var(--duration-fast) var(--ease-out);
}

/* done */
.stepper__item--done .stepper__circle {
  background: var(--success);
  color: var(--bg);
  border-color: transparent;
}
.stepper__item--done .stepper__label {
  color: var(--text);
}

/* current */
.stepper__item--current .stepper__circle {
  background: var(--text);
  color: var(--bg);
  border: 2px solid var(--text);
}
.stepper__item--current .stepper__label {
  color: var(--text);
  font-weight: 600;
}

/* error */
.stepper__item--error .stepper__circle {
  background: var(--danger);
  color: var(--bg);
  border-color: transparent;
}
.stepper__item--error .stepper__label {
  color: var(--danger);
  font-weight: 600;
}

/* pending: inherits the base .stepper__circle / .stepper__label tokens */

.stepper__line {
  flex: 1;
  height: 1px;
  min-width: 12px;
  background: var(--border);
  transition: background var(--duration-fast) var(--ease-out);
}
.stepper__line--done {
  background: var(--success);
}
.stepper__line--error {
  background: var(--danger);
}
.stepper__line--pending {
  background: var(--border);
}
</style>
