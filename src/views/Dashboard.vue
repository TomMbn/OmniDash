<template>
  <div class="animate-fade-in max-w-2xl mx-auto pb-24 select-none">

    <!-- ── Greeting Hero ── -->
    <div class="relative overflow-hidden rounded-[2.5rem] bg-slate-900 text-white p-7 mb-5 shadow-2xl shadow-slate-900/20">
      <div class="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-transparent to-purple-600/20 pointer-events-none" />
      <div class="relative">
        <p class="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">{{ currentDayFull }}</p>
        <h2 class="text-[1.75rem] font-black tracking-tight leading-tight mb-1">{{ greeting }}, {{ firstName }}</h2>
        <p class="text-white/50 font-bold text-sm leading-snug">{{ motivationalLine }}</p>
        <div v-if="streak > 1" class="mt-5 inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-2xl px-4 py-2">
          <Flame :size="13" class="text-orange-400" />
          <span class="text-xs font-black">{{ streak }} jours consécutifs</span>
        </div>
      </div>
    </div>

    <!-- ── KPI Pills ── -->
    <div class="grid grid-cols-3 gap-3 mb-5">
      <!-- Sommeil -->
      <div class="bg-white rounded-[1.5rem] border border-slate-100 p-4 shadow-sm flex flex-col gap-1">
        <div class="flex items-center gap-1.5 mb-0.5">
          <Moon :size="12" class="text-violet-500" stroke-width="2.5" />
          <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sommeil</span>
        </div>
        <p class="text-2xl font-black tracking-tighter leading-none" :class="lastSleepScore != null ? 'text-slate-900' : 'text-slate-200'">
          {{ lastSleepScore ?? '—' }}
        </p>
        <p class="text-[10px] font-bold text-slate-400">{{ lastSleepScore != null ? '/100 · hier' : 'Non renseigné' }}</p>
      </div>

      <!-- Aujourd'hui -->
      <div class="bg-white rounded-[1.5rem] border border-slate-100 p-4 shadow-sm flex flex-col gap-1">
        <div class="flex items-center gap-1.5 mb-0.5">
          <Target :size="12" class="text-indigo-600" stroke-width="2.5" />
          <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Séance</span>
        </div>
        <p class="text-sm font-black text-slate-900 tracking-tight leading-tight">{{ todayPlan?.template?.label ?? '—' }}</p>
        <p class="text-[10px] font-bold" :class="todayWorkoutDone ? 'text-emerald-500' : isRestToday ? 'text-slate-300' : 'text-amber-500'">
          {{ todayWorkoutDone ? '✓ Complète' : isRestToday ? 'Repos' : 'À faire' }}
        </p>
      </div>

      <!-- Semaine -->
      <div class="bg-white rounded-[1.5rem] border border-slate-100 p-4 shadow-sm flex flex-col gap-1">
        <div class="flex items-center gap-1.5 mb-0.5">
          <Activity :size="12" class="text-emerald-500" stroke-width="2.5" />
          <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Semaine</span>
        </div>
        <p class="text-2xl font-black text-slate-900 tracking-tighter leading-none">{{ weekSessionCount }}</p>
        <p class="text-[10px] font-bold text-slate-400">séance{{ weekSessionCount > 1 ? 's' : '' }}</p>
      </div>
    </div>

    <!-- ── Today's session card ── -->
    <div v-if="!isRestToday && todayPlan" class="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/30 overflow-hidden mb-5">
      <div class="p-7">
        <div class="flex items-start justify-between gap-4 mb-5">
          <div class="min-w-0">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Programme du jour</p>
            <h3 class="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {{ todayPlan.template.label }}
              <span v-if="todayWorkoutDone" class="text-lg text-emerald-500">✓</span>
            </h3>
            <p class="text-slate-400 font-bold text-sm mt-0.5 leading-snug">{{ todayPlan.template.description }}</p>
          </div>
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 bg-slate-50 border border-slate-100">
            {{ todayPlan.template.emoji || '🏋️' }}
          </div>
        </div>

        <!-- Exercise list preview -->
        <div v-if="todayPlan.template.exercises?.length" class="space-y-0 mb-6">
          <div
            v-for="(ex, i) in todayPlan.template.exercises.slice(0, 4)"
            :key="i"
            class="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0"
          >
            <span class="text-sm font-bold text-slate-700 truncate pr-2">{{ ex.name }}</span>
            <span class="text-xs text-slate-400 font-black flex-shrink-0">{{ ex.sets }}×{{ ex.repsRange }}</span>
          </div>
          <p v-if="todayPlan.template.exercises.length > 4" class="text-[10px] text-slate-400 font-bold pt-2.5">
            +{{ todayPlan.template.exercises.length - 4 }} exercices
          </p>
        </div>

        <!-- Cardio options preview -->
        <div v-else-if="todayPlan.template.cardioOptions?.length" class="space-y-2 mb-6">
          <div v-for="opt in todayPlan.template.cardioOptions" :key="opt.name"
            class="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
            <Heart :size="13" class="text-teal-500 flex-shrink-0" />
            <span class="text-sm font-bold text-slate-700 truncate">{{ opt.name }}</span>
            <span class="text-xs text-teal-600 font-black ml-auto flex-shrink-0">{{ opt.duration }}</span>
          </div>
        </div>

        <router-link
          to="/musculation"
          class="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-sm transition-all active:scale-[0.98]"
          :class="todayWorkoutDone
            ? 'bg-slate-50 text-slate-500 border border-slate-100'
            : 'bg-slate-900 text-white shadow-lg hover:bg-black'"
        >
          <component :is="todayWorkoutDone ? CheckCircle2 : Play" :size="17" />
          {{ todayWorkoutDone ? 'Voir la séance' : 'Commencer la séance' }}
        </router-link>
      </div>
    </div>

    <!-- ── Rest day ── -->
    <div v-else-if="isRestToday" class="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-10 mb-5 text-center">
      <p class="text-5xl mb-3">😴</p>
      <p class="font-black text-slate-700 text-xl tracking-tight">Jour de repos</p>
      <p class="text-slate-400 font-medium text-sm mt-2 leading-relaxed max-w-xs mx-auto">La récupération fait partie de la performance.</p>
    </div>

    <!-- ── Weekly activity strip ── -->
    <div class="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm mb-5">
      <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5">Activité de la semaine</p>
      <div class="grid grid-cols-7 gap-1">
        <div
          v-for="day in weekActivity"
          :key="day.dayIndex"
          class="flex flex-col items-center gap-2 transition-opacity"
          :class="day.isFuture ? 'opacity-30' : 'opacity-100'"
        >
          <span
            class="text-[9px] font-black uppercase tracking-wider"
            :class="day.isToday ? 'text-indigo-600' : 'text-slate-300'"
          >{{ day.shortLabel }}</span>

          <div
            class="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            :class="[
              day.done ? 'bg-indigo-600 shadow-md shadow-indigo-200/60' :
              day.isToday ? 'bg-indigo-50 ring-2 ring-indigo-200' :
              'bg-slate-50 border border-slate-100'
            ]"
          >
            <component
              :is="day.session === 'CARDIO' ? Heart : (day.session === 'REPOS' || day.session === 'MATCH') ? Moon : Dumbbell"
              :size="14"
              :class="[
                day.done ? 'text-white' :
                day.isToday ? 'text-indigo-400' :
                'text-slate-300'
              ]"
            />
          </div>

          <!-- Today dot -->
          <div class="w-1 h-1 rounded-full" :class="day.isToday ? 'bg-indigo-600' : 'bg-transparent'" />
        </div>
      </div>
    </div>

    <!-- ── Progressive overload ready ── -->
    <div v-if="increaseReadyExercises.length > 0" class="bg-white rounded-[2.5rem] border border-emerald-100 p-6 shadow-sm">
      <div class="flex items-center gap-2 mb-4">
        <div class="p-1.5 bg-emerald-100 rounded-xl">
          <TrendingUp :size="14" class="text-emerald-600" />
        </div>
        <p class="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em]">Prêt à augmenter la charge</p>
      </div>
      <div class="space-y-2">
        <div
          v-for="ex in increaseReadyExercises"
          :key="ex.name"
          class="flex items-center justify-between py-2.5 px-4 bg-emerald-50/70 rounded-2xl"
        >
          <span class="text-sm font-black text-slate-800 truncate pr-2">{{ ex.name }}</span>
          <span class="text-xs font-black text-emerald-700 flex-shrink-0">{{ ex.detail }}</span>
        </div>
      </div>
      <router-link to="/musculation" class="mt-4 flex items-center gap-1.5 text-xs font-black text-emerald-600 hover:text-emerald-700 transition-colors">
        Aller à la séance <ArrowRight :size="13" />
      </router-link>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'
import { useWorkoutPrograms } from '@/composables/useWorkoutPrograms'
import { useProgressiveOverload } from '@/composables/useProgressiveOverload'
import {
  Moon, Flame, Target, Activity, Dumbbell, Heart,
  TrendingUp, Play, CheckCircle2, ArrowRight
} from 'lucide-vue-next'

const { user } = useAuth()
const { weekOverview, selectedPlan: todayPlan, isRestDay: isRestToday, templates } = useWorkoutPrograms()
const { fetchHistoryForExercises, getOverloadStatus } = useProgressiveOverload()

const lastSleepScore = ref(null)
const workoutDatesAll = ref(new Set())
const weekWorkoutDates = ref(new Set())
const exercises = ref([])

// ── Identity ──
const firstName = computed(() => {
  const email = user.value?.email || ''
  const raw = email.split('@')[0].split('.')[0]
  return raw.charAt(0).toUpperCase() + raw.slice(1)
})

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
})

const currentDayFull = computed(() =>
  new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
)

const motivationalLine = computed(() => {
  if (isRestToday.value) return "Aujourd'hui c'est repos — récupère bien."
  const s = todayPlan.value?.session
  const lines = {
    PUSH:  'Push day — pecs, épaules & triceps.',
    PULL:  'Pull day — dos & biceps.',
    LEGS:  'Leg day — tout le monde déteste, tout le monde progresse.',
    UPPER: 'Upper body — le V-taper se construit ici.',
    LOWER: 'Lower body — chaîne postérieure.',
    CARDIO: 'Zone 2 aujourd\'hui — base aérobie.'
  }
  return lines[s] || 'Bonne journée.'
})

// ── Workout state ──
const todayWorkoutDone = computed(() => {
  const todayStr = new Date().toISOString().split('T')[0]
  return workoutDatesAll.value.has(todayStr)
})

const weekSessionCount = computed(() => weekWorkoutDates.value.size)

const streak = computed(() => {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const startFromYesterday = !workoutDatesAll.value.has(todayStr)
  let count = 0
  for (let i = startFromYesterday ? 1 : 0; i < 60; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const str = d.toISOString().split('T')[0]
    if (workoutDatesAll.value.has(str)) count++
    else break
  }
  return count
})

// ── Weekly activity strip (Mon → Sun) ──
const weekActivity = computed(() => {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const mondayOffset = today.getDay() === 0 ? 6 : today.getDay() - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - mondayOffset)

  return weekOverview.value.map(day => {
    const dayDate = new Date(monday)
    const offset = day.dayIndex === 0 ? 6 : day.dayIndex - 1
    dayDate.setDate(monday.getDate() + offset)
    const dateStr = dayDate.toISOString().split('T')[0]
    return {
      ...day,
      dateStr,
      isToday: dateStr === todayStr,
      isFuture: dateStr > todayStr,
      done: workoutDatesAll.value.has(dateStr),
      shortLabel: day.label.slice(0, 3)
    }
  })
})

// ── Progressive overload — INCREASE only ──
const increaseReadyExercises = computed(() => {
  if (!exercises.value.length) return []
  const result = []
  const seen = new Set()
  for (const tpl of Object.values(templates.value)) {
    for (const tplEx of (tpl.exercises || [])) {
      if (seen.has(tplEx.name)) continue
      seen.add(tplEx.name)
      const dbEx = exercises.value.find(e => e.name.toLowerCase() === tplEx.name.toLowerCase())
      if (!dbEx) continue
      const st = getOverloadStatus(dbEx.id, tplEx.repsRange)
      if (st?.status === 'INCREASE') result.push({ name: tplEx.name, detail: st.detail })
    }
  }
  return result.slice(0, 5)
})

// ── Data fetching ──
onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id || user.value?.id
  if (!userId) return
  await fetchData(userId)
})

const fetchData = async (userId) => {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const monday = new Date(today)
  const mondayOffset = today.getDay() === 0 ? 6 : today.getDay() - 1
  monday.setDate(today.getDate() - mondayOffset)
  const weekStart = monday.toISOString().split('T')[0]

  const sixtyDaysAgo = new Date(today)
  sixtyDaysAgo.setDate(today.getDate() - 60)
  const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0]

  try {
    const [sleepRes, workoutsRes, exRes] = await Promise.all([
      supabase.from('sleep_records').select('score').eq('user_id', userId).eq('date', yesterdayStr).maybeSingle(),
      supabase.from('workouts').select('date').eq('user_id', userId).gte('date', sixtyDaysAgoStr + 'T00:00:00.000Z'),
      supabase.from('exercises').select('id, name')
    ])

    if (sleepRes.data) lastSleepScore.value = sleepRes.data.score

    if (workoutsRes.data) {
      const allDates = new Set(workoutsRes.data.map(w => w.date.split('T')[0]))
      workoutDatesAll.value = allDates
      weekWorkoutDates.value = new Set([...allDates].filter(d => d >= weekStart && d <= todayStr))
    }

    if (exRes.data) {
      exercises.value = exRes.data
      const ids = []
      for (const tpl of Object.values(templates.value)) {
        for (const tplEx of (tpl.exercises || [])) {
          const dbEx = exRes.data.find(e => e.name.toLowerCase() === tplEx.name.toLowerCase())
          if (dbEx) ids.push(dbEx.id)
        }
      }
      if (ids.length) await fetchHistoryForExercises(userId, [...new Set(ids)])
    }
  } catch (e) {
    console.error('Dashboard fetch error:', e)
  }
}
</script>
