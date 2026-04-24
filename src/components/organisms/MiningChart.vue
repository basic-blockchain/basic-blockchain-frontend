<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
} from 'chart.js'
import type { Block } from '@/domain/block'

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement)

const props = defineProps<{ blocks: Block[] }>()

const chartData = computed(() => {
  const recent = props.blocks.slice(-20)
  const labels = recent.map((b) => `#${b.index}`)
  const mineTimes: number[] = []
  for (let i = 1; i < recent.length; i++) {
    const prev = new Date(recent[i - 1].timestamp).getTime()
    const cur = new Date(recent[i].timestamp).getTime()
    mineTimes.push((cur - prev) / 1000)
  }
  return {
    labels: labels.slice(1),
    datasets: [
      {
        label: 'Mine time (s)',
        data: mineTimes,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.2)',
        tension: 0.3,
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: { y: { beginAtZero: true } },
}
</script>

<template>
  <div class="chart-wrapper">
    <Line
      :data="chartData"
      :options="chartOptions"
    />
  </div>
</template>

<style scoped>
.chart-wrapper { height: 280px; }
</style>
