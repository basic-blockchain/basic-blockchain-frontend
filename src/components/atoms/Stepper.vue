<script setup lang="ts">
defineProps<{ steps: string[]; current: number }>()
</script>

<template>
  <div class="stepper">
    <template v-for="(s, i) in steps" :key="i">
      <div class="step-item">
        <div class="step-circle" :class="{ done: i < current, active: i === current }">
          {{ i < current ? '✓' : i + 1 }}
        </div>
        <span class="step-label" :class="{ active: i <= current }">{{ s }}</span>
      </div>
      <div v-if="i < steps.length - 1" class="step-line" :class="{ done: i < current }" />
    </template>
  </div>
</template>

<style scoped>
.stepper {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
}
.step-item {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}
.step-circle {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 600;
  background: var(--surface-2);
  color: var(--text-3);
  border: 1px solid var(--border);
  transition: background 0.15s, color 0.15s;
}
.step-circle.done  { background: var(--success); color: #fff; border-color: transparent; }
.step-circle.active { background: var(--text); color: #faf9f6; border-color: var(--text); }
.step-label {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-3);
  white-space: nowrap;
}
.step-label.active { color: var(--text); font-weight: 600; }
.step-line {
  flex: 1;
  height: 1px;
  background: var(--border);
  min-width: 12px;
}
.step-line.done { background: var(--success); }
</style>
