<template>
  <div class="animate-fade-in max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8 select-none">
    <!-- Header -->
    <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 md:mb-12 pt-4 md:pt-6">
      <div>
        <h2 class="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div class="p-2 md:p-2.5 bg-indigo-600 rounded-xl md:rounded-2xl text-white shadow-lg shadow-indigo-100/50">
            <LayoutDashboard :size="20" md:size="24" stroke-width="2.5" />
          </div>
          Tableau de bord
        </h2>
        <p class="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 ml-1">Analyse de Performance Hebdomadaire</p>
      </div>
      
      <div class="hidden sm:flex items-center gap-4 bg-white p-2 pr-6 rounded-3xl border border-slate-100 shadow-sm transition-all hover:border-slate-200">
        <div class="h-12 w-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-xl font-black text-indigo-600">
          {{ userInitials }}
        </div>
        <div>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Compte Actif</p>
          <p class="text-sm font-black text-slate-900 truncate max-w-[150px]">{{ user?.email?.split('@')[0] }}</p>
        </div>
      </div>
    </header>

    <!-- ═══ SKELETON LOADERS ═══ Piet Piet -->
    <template v-if="loading">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div v-for="i in 3" :key="i" class="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm" :class="{ 'lg:col-span-1': i < 3, 'lg:col-span-3': i === 3 }">
          <div class="animate-pulse space-y-6">
            <div class="h-3 bg-slate-100 rounded-full w-1/4"></div>
            <div class="h-64 bg-slate-50/50 rounded-[2rem]"></div>
            <div class="flex gap-3 pt-4 border-t border-slate-50">
              <div class="h-2 bg-slate-100 rounded-full w-1/5"></div>
              <div class="h-2 bg-slate-100 rounded-full w-1/5"></div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ═══ CHARTS GRID ═══ -->
    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">

        <!-- 1. Volume Distribution Card (Radar) -->
        <div class="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 p-6 md:p-8 flex flex-col shadow-2xl shadow-slate-100/30 transition-all hover:border-slate-200 group">
          <div class="flex justify-between items-start mb-6 md:mb-8">
            <div>
              <p class="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Impact Musculaire</p>
              <h3 class="text-base md:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Target :size="16" md:size="18" class="text-indigo-600" stroke-width="2.5" />
                Volume Load
              </h3>
            </div>
          </div>

          <div v-if="hasRadarData" class="flex-1 flex items-center justify-center min-h-[250px] md:min-h-[300px]">
            <div class="w-full h-full transform transition-transform group-hover:scale-[1.02]">
              <Radar :data="radarChartData" :options="radarOptions" />
            </div>
          </div>
          <div v-else class="flex-1 flex flex-col items-center justify-center min-h-[250px] md:min-h-[300px] text-center px-6 bg-slate-50/50 rounded-[1.5rem] md:rounded-[2rem] border border-dashed border-slate-200">
            <div class="p-3 md:p-4 bg-white rounded-2xl shadow-sm mb-4">
              <Dumbbell :size="28" md:size="32" class="text-slate-200" />
            </div>
            <p class="text-slate-400 font-bold text-xs md:text-sm leading-relaxed">Entraînez-vous pour voir votre symétrie ici.</p>
          </div>
        </div>

        <!-- 2. Nutrition Analytics Card (Bar) -->
        <div class="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 p-6 md:p-8 flex flex-col shadow-2xl shadow-slate-100/30 transition-all hover:border-slate-200 group">
          <div class="flex justify-between items-start mb-6 md:mb-8">
            <div>
              <p class="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Carburant Hebdomadaire</p>
              <h3 class="text-base md:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <BarChart3 :size="16" md:size="18" class="text-emerald-500" stroke-width="2.5" />
                Macros (7 Jours)
              </h3>
            </div>
          </div>

          <div v-if="hasNutritionData" class="flex-1 min-h-[250px] md:min-h-[300px]">
            <Bar :data="barChartData" :options="barOptions" />
          </div>
          <div v-else class="flex-1 flex flex-col items-center justify-center min-h-[250px] md:min-h-[300px] text-center px-6 bg-slate-50/50 rounded-[1.5rem] md:rounded-[2rem] border border-dashed border-slate-200">
            <div class="p-3 md:p-4 bg-white rounded-2xl shadow-sm mb-4">
              <Utensils :size="28" md:size="32" class="text-slate-200" />
            </div>
            <p class="text-slate-400 font-bold text-xs md:text-sm leading-relaxed">Vos apports nutritionnels s'afficheront ici.</p>
          </div>
        </div>

        <!-- 3. Performance Correlation Card (Line) -->
        <div class="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 p-6 md:p-8 lg:col-span-full xl:col-span-1 flex flex-col shadow-2xl shadow-slate-100/30 transition-all hover:border-slate-200 group">
          <div class="flex justify-between items-start mb-6 md:mb-8">
            <div>
              <p class="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Physiologie & Output</p>
              <h3 class="text-base md:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Activity :size="16" md:size="18" class="text-indigo-600" stroke-width="2.5" />
                Sommeil vs Force
              </h3>
            </div>
            <div class="p-2 bg-indigo-50 rounded-xl">
              <TrendingUp :size="14" md:size="16" class="text-indigo-600" />
            </div>
          </div>

          <div v-if="hasCorrelationData" class="flex-1 min-h-[250px] md:min-h-[300px]">
            <Line :data="lineChartData" :options="lineOptions" />
          </div>
          <div v-else class="flex-1 flex flex-col items-center justify-center min-h-[250px] md:min-h-[300px] text-center px-6 bg-slate-50/50 rounded-[1.5rem] md:rounded-[2rem] border border-dashed border-slate-200">
            <div class="p-3 md:p-4 bg-white rounded-2xl shadow-sm mb-4">
              <TrendingUp :size="28" md:size="32" class="text-slate-200" />
            </div>
            <p class="text-slate-400 font-bold text-xs md:text-sm leading-relaxed">Reliez vos données de sommeil et de musculation.</p>
          </div>
        </div>

      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'
import {
  Chart as ChartJS,
  RadialLinearScale,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineController,
  BarController,
  RadarController
} from 'chart.js'
import { Radar, Bar, Line } from 'vue-chartjs'
import { 
  LayoutDashboard, 
  Target, 
  BarChart3, 
  Activity, 
  TrendingUp, 
  Apple, 
  Moon,
  Dumbbell,
  Utensils
} from 'lucide-vue-next'

// Register Chart.js components
ChartJS.register(
  RadialLinearScale,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineController,
  BarController,
  RadarController
)

const { user } = useAuth()

const loading = ref(true)

// Raw data
const workoutsRaw = ref([])
const nutritionRaw = ref([])
const sleepRaw = ref([])
const muscleGroupsMap = ref({}) // id -> name

const userInitials = computed(() => {
  if (!user.value || !user.value.email) return 'U'
  return user.value.email.charAt(0).toUpperCase()
})

// ── Helpers ──
const getLast7Days = () => {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

const formatDayLabel = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
}

const last7Days = getLast7Days()
const dayLabels = last7Days.map(formatDayLabel)

// ── Data Fetching ──
onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id || user.value?.id
  if (userId) {
    await fetchDashboardData(userId)
  }
})

const fetchDashboardData = async (userId) => {
  loading.value = true
  const startDate = last7Days[0]

  try {
    const [workoutsRes, nutritionRes, sleepRes, muscleGroupsRes, exercisesRes] = await Promise.all([
      supabase
        .from('workouts')
        .select('id, date, workout_sets(weight, reps, exercise_id)')
        .eq('user_id', userId)
        .gte('date', startDate + 'T00:00:00.000Z'),
      supabase
        .from('nutrition_logs')
        .select('date, protein, carbs, fats, is_exceptional_meal')
        .eq('user_id', userId)
        .gte('date', startDate),
      supabase
        .from('sleep_records')
        .select('date, score')
        .eq('user_id', userId)
        .gte('date', startDate)
        .order('date', { ascending: true }),
      supabase.from('muscle_groups').select('id, name'),
      supabase.from('exercises').select('id, muscle_group_id')
    ])

    // Build muscle groups lookup
    const mgMap = {}
    if (muscleGroupsRes.data) {
      muscleGroupsRes.data.forEach(mg => { mgMap[mg.id] = mg.name })
    }
    muscleGroupsMap.value = mgMap

    // Build exercises lookup  exercise_id -> muscle_group_id
    const exMap = {}
    if (exercisesRes.data) {
      exercisesRes.data.forEach(ex => { exMap[ex.id] = ex.muscle_group_id })
    }

    // Enrich workouts with muscle group info
    if (workoutsRes.data) {
      workoutsRaw.value = workoutsRes.data.map(w => ({
        ...w,
        dateStr: w.date.split('T')[0],
        workout_sets: (w.workout_sets || []).map(s => ({
          ...s,
          muscle_group_id: exMap[s.exercise_id] || null,
          muscle_group_name: mgMap[exMap[s.exercise_id]] || 'Autre'
        }))
      }))
    }

    if (nutritionRes.data) nutritionRaw.value = nutritionRes.data
    if (sleepRes.data) sleepRaw.value = sleepRes.data

  } catch (e) {
    console.error('Dashboard fetch error:', e)
  } finally {
    loading.value = false
  }
}

// ══════════════════════════════════════
// 1. RADAR CHART — Volume Load par Muscle
// ══════════════════════════════════════
const volumeByMuscle = computed(() => {
  const result = {}
  workoutsRaw.value.forEach(w => {
    w.workout_sets.forEach(s => {
      if (s.weight && s.reps && s.muscle_group_name) {
        const name = s.muscle_group_name
        result[name] = (result[name] || 0) + s.weight * s.reps
      }
    })
  })
  return result
})

const hasRadarData = computed(() => Object.keys(volumeByMuscle.value).length > 0)

const radarChartData = computed(() => {
  const labels = Object.keys(volumeByMuscle.value)
  const data = Object.values(volumeByMuscle.value)
  return {
    labels,
    datasets: [{
      label: 'Volume Load (kg×reps)',
      data,
      backgroundColor: 'rgba(99, 102, 241, 0.15)',
      borderColor: 'rgba(99, 102, 241, 0.8)',
      borderWidth: 2,
      pointBackgroundColor: 'rgba(99, 102, 241, 1)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 5
    }]
  }
})

const radarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(17, 24, 39, 0.9)',
      titleFont: { size: 13, weight: 'bold' },
      bodyFont: { size: 12 },
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) => ` ${ctx.parsed.r.toLocaleString('fr-FR')} kg×reps`
      }
    }
  },
  scales: {
    r: {
      beginAtZero: true,
      angleLines: { color: 'rgba(0,0,0,0.05)' },
      grid: { color: 'rgba(0,0,0,0.05)' },
      pointLabels: {
        font: { size: 12, weight: '600' },
        color: '#374151'
      },
      ticks: {
        display: false
      }
    }
  }
}

// ══════════════════════════════════════
// 2. STACKED BAR CHART — Macros / Jour
// ══════════════════════════════════════
const macrosByDay = computed(() => {
  // For each day, separate routine vs exceptional
  return last7Days.map(day => {
    const logs = nutritionRaw.value.filter(l => l.date === day)
    const routine = logs.filter(l => !l.is_exceptional_meal)
    const exceptional = logs.filter(l => l.is_exceptional_meal)

    const sum = (arr, key) => arr.reduce((acc, l) => acc + (Number(l[key]) || 0), 0)

    return {
      day,
      routineProtein: sum(routine, 'protein'),
      routineCarbs: sum(routine, 'carbs'),
      routineFats: sum(routine, 'fats'),
      exceptionalProtein: sum(exceptional, 'protein'),
      exceptionalCarbs: sum(exceptional, 'carbs'),
      exceptionalFats: sum(exceptional, 'fats'),
    }
  })
})

const hasNutritionData = computed(() => nutritionRaw.value.length > 0)

const barChartData = computed(() => {
  const m = macrosByDay.value
  const hasExceptional = m.some(d => d.exceptionalProtein > 0 || d.exceptionalCarbs > 0 || d.exceptionalFats > 0)

  const datasets = [
    {
      label: 'Protéines',
      data: m.map(d => d.routineProtein),
      backgroundColor: 'rgba(59, 130, 246, 0.75)',
      borderRadius: 4,
      stack: 'routine'
    },
    {
      label: 'Glucides',
      data: m.map(d => d.routineCarbs),
      backgroundColor: 'rgba(34, 197, 94, 0.75)',
      borderRadius: 4,
      stack: 'routine'
    },
    {
      label: 'Lipides',
      data: m.map(d => d.routineFats),
      backgroundColor: 'rgba(234, 179, 8, 0.75)',
      borderRadius: 4,
      stack: 'routine'
    }
  ]

  if (hasExceptional) {
    datasets.push(
      {
        label: 'Prot. (exceptionnel)',
        data: m.map(d => d.exceptionalProtein),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderRadius: 4,
        stack: 'exceptional'
      },
      {
        label: 'Gluc. (exceptionnel)',
        data: m.map(d => d.exceptionalCarbs),
        backgroundColor: 'rgba(249, 115, 22, 0.8)',
        borderRadius: 4,
        stack: 'exceptional'
      },
      {
        label: 'Lip. (exceptionnel)',
        data: m.map(d => d.exceptionalFats),
        backgroundColor: 'rgba(245, 158, 11, 0.85)',
        borderRadius: 4,
        stack: 'exceptional'
      }
    )
  }

  return { labels: dayLabels, datasets }
})

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        pointStyle: 'rectRounded',
        padding: 14,
        font: { size: 11, weight: '600' }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(17, 24, 39, 0.9)',
      titleFont: { size: 13, weight: 'bold' },
      bodyFont: { size: 12 },
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}g`
      }
    }
  },
  scales: {
    x: {
      stacked: true,
      grid: { display: false },
      ticks: { font: { size: 11, weight: '600' }, color: '#6B7280' }
    },
    y: {
      stacked: true,
      beginAtZero: true,
      grid: { color: 'rgba(0,0,0,0.04)' },
      ticks: {
        font: { size: 11 },
        color: '#9CA3AF',
        callback: (v) => v + 'g'
      }
    }
  }
}

// ══════════════════════════════════════
// 3. LINE CHART — Sleep Score vs Volume Load
// ══════════════════════════════════════

// Sleep score indexed by date  (night of that date)
const sleepByDate = computed(() => {
  const map = {}
  sleepRaw.value.forEach(s => { map[s.date] = s.score })
  return map
})

// Volume load indexed by date
const volumeByDate = computed(() => {
  const map = {}
  workoutsRaw.value.forEach(w => {
    const vol = w.workout_sets.reduce((acc, s) => acc + ((s.weight || 0) * (s.reps || 0)), 0)
    map[w.dateStr] = (map[w.dateStr] || 0) + vol
  })
  return map
})

const hasCorrelationData = computed(() => {
  return sleepRaw.value.length > 0 || workoutsRaw.value.length > 0
})

const lineChartData = computed(() => {
  // For each of the 7 days we show the sleep score from the PREVIOUS night
  // and the volume load of that day
  const sleepScores = last7Days.map(day => {
    // The sleep of the night before: we look at day - 1
    const prev = new Date(day + 'T12:00:00')
    prev.setDate(prev.getDate() - 1)
    const prevStr = prev.toISOString().split('T')[0]
    return sleepByDate.value[prevStr] ?? null
  })

  const volumes = last7Days.map(day => volumeByDate.value[day] ?? null)

  return {
    labels: dayLabels,
    datasets: [
      {
        label: 'Sleep Score (nuit précédente)',
        data: sleepScores,
        borderColor: 'rgba(139, 92, 246, 0.9)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: 'rgba(139, 92, 246, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        yAxisID: 'y',
        spanGaps: true
      },
      {
        label: 'Volume Load du jour',
        data: volumes,
        borderColor: 'rgba(99, 102, 241, 0.9)',
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: 'rgba(99, 102, 241, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        yAxisID: 'y1',
        spanGaps: true
      }
    ]
  }
})

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false
  },
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 14,
        font: { size: 11, weight: '600' }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(17, 24, 39, 0.9)',
      titleFont: { size: 13, weight: 'bold' },
      bodyFont: { size: 12 },
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) => {
          if (ctx.datasetIndex === 0) return ` Score: ${ctx.parsed.y ?? '—'}/100`
          return ` Volume: ${ctx.parsed.y?.toLocaleString('fr-FR') ?? '—'} kg×reps`
        }
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 11, weight: '600' }, color: '#6B7280' }
    },
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      beginAtZero: true,
      max: 100,
      title: {
        display: true,
        text: 'Sleep Score',
        font: { size: 11, weight: '600' },
        color: 'rgba(139, 92, 246, 0.8)'
      },
      grid: { color: 'rgba(0,0,0,0.04)' },
      ticks: { font: { size: 10 }, color: '#9CA3AF' }
    },
    y1: {
      type: 'linear',
      display: true,
      position: 'right',
      beginAtZero: true,
      title: {
        display: true,
        text: 'Volume Load',
        font: { size: 11, weight: '600' },
        color: 'rgba(99, 102, 241, 0.8)'
      },
      grid: { drawOnChartArea: false },
      ticks: {
        font: { size: 10 },
        color: '#9CA3AF',
        callback: (v) => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v
      }
    }
  }
}
</script>
