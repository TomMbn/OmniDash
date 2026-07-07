<template>
  <div class="chart-wrap">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip
} from 'chart.js'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

const props = defineProps({
  hours: { type: Array, required: true }, // [{ time, indoorTemp, outdoorTemp }]
  openAt: { type: String, default: null },
  closeAt: { type: String, default: null }
})

const chartData = computed(() => {
  const labels = props.hours.map(h =>
    new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(h.time))
  )
  const outdoor = props.hours.map(h => h.outdoorTemp)
  const indoor = props.hours.map(h => h.indoorTemp)

  const allValues = [...outdoor, ...indoor]
  const minY = Math.min(...allValues) - 1
  const maxY = Math.max(...allValues) + 1

  const openTime = props.openAt ? new Date(props.openAt).getTime() : null
  const closeTime = props.closeAt ? new Date(props.closeAt).getTime() : null

  const inWindow = (h) => {
    const t = new Date(h.time).getTime()
    if (openTime == null) return false
    if (t < openTime) return false
    if (closeTime != null && t > closeTime) return false
    return true
  }

  const bandTop = props.hours.map(h => (inWindow(h) ? maxY : null))
  const bandBottom = props.hours.map(h => (inWindow(h) ? minY : null))

  return {
    labels,
    datasets: [
      {
        label: 'Extérieur',
        data: outdoor,
        borderColor: '#7A91B8',
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 0
      },
      {
        label: 'Intérieur',
        data: indoor,
        borderColor: '#D4976A',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [4, 4],
        tension: 0.35,
        pointRadius: 0
      },
      {
        label: 'Créneau favorable',
        data: bandTop,
        borderWidth: 0,
        pointRadius: 0,
        backgroundColor: 'rgba(106, 170, 126, 0.15)',
        fill: '+1'
      },
      {
        label: '',
        data: bandBottom,
        borderWidth: 0,
        pointRadius: 0,
        backgroundColor: 'transparent',
        fill: false
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(26, 26, 26, 0.95)',
      titleColor: '#F0EBE3',
      bodyColor: '#F0EBE3',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      filter: (item) => item.datasetIndex < 2
    }
  },
  scales: {
    y: {
      ticks: { color: 'rgba(240, 235, 227, 0.52)', callback: (v) => `${v}°` },
      grid: { color: 'rgba(255, 255, 255, 0.05)' }
    },
    x: {
      ticks: { color: 'rgba(240, 235, 227, 0.28)', maxTicksLimit: 8 },
      grid: { display: false }
    }
  }
}
</script>

<style scoped>
.chart-wrap {
  position: relative;
  height: 220px;
  width: 100%;
}
</style>
