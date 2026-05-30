<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import QRCode from 'qrcode'

const props = withDefaults(
  defineProps<{
    value: string
    size?: number
  }>(),
  { size: 160 },
)

const canvas = ref<HTMLCanvasElement | null>(null)

async function render() {
  if (!canvas.value || !props.value) return
  await QRCode.toCanvas(canvas.value, props.value, {
    width: props.size,
    margin: 1,
    color: { dark: '#1a1917', light: '#ffffff' },
  })
}

onMounted(render)
watch(() => [props.value, props.size], render)
</script>

<template>
  <canvas ref="canvas" :width="size" :height="size" />
</template>
