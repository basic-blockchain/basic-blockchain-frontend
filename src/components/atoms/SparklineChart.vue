<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    values: number[]
    color?: string
    width?: number
    height?: number
  }>(),
  {
    color: 'var(--accent)',
    width: 120,
    height: 32,
  }
)

const points = computed<string>(() => {
  const v = props.values
  if (v.length < 2) {
    const y = props.height / 2
    return `0,${y} ${props.width},${y}`
  }
  const min = Math.min(...v)
  const max = Math.max(...v)
  const range = max - min || 1
  const pad = 2
  const usableH = props.height - pad * 2
  const stepX = props.width / (v.length - 1)
  return v
    .map((val, i) => {
      const x = i * stepX
      const y = pad + usableH - ((val - min) / range) * usableH
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})
</script>

<template>
  <svg
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    fill="none"
    aria-hidden="true"
  >
    <polyline :points="points" :stroke="color" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
