<script setup lang="ts">
import { computed } from 'vue'
import BackgroundTaskIndicator from '@/components/organisms/BackgroundTaskIndicator.vue'
import { useMiningStore } from '@/stores/mining'

const miningStore = useMiningStore()

const status = computed(() => {
  if (miningStore.error) return 'error'
  if (miningStore.progress >= 100) return 'success'
  return 'running'
})

const subtitle = computed(() => {
  if (miningStore.error) return miningStore.error
  return 'Minado en curso'
})
</script>

<template>
  <BackgroundTaskIndicator
    :open="miningStore.isVisible"
    position="pill"
    :title="`Minando bloque #${miningStore.currentBlock}`"
    :subtitle="subtitle"
    :status="status"
    :progress="miningStore.progress"
    :elapsed="miningStore.elapsedSeconds"
  />
</template>
