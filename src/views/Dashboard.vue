<template>
  <div class="dashboard">

    <!-- ── Hero ── -->
    <section class="hero">
      <p class="hero-date">{{ currentDayFull }}</p>
      <h2 class="hero-greeting">{{ greeting }},<br>{{ firstName }}.</h2>
      <p class="hero-line">{{ motivationalLine }}</p>
      <div v-if="streak > 1" class="streak-badge">
        <Flame :size="12" />
        <span>{{ streak }} jours</span>
      </div>
    </section>

    <!-- ── KPI row ── -->
    <div class="kpi-row">

      <!-- Sommeil -->
      <router-link to="/sommeil" class="kpi-card">
        <div class="kpi-label">
          <Moon :size="10" stroke-width="2" style="color: var(--module-sleep)" />
          <span>Sommeil</span>
        </div>
        <template v-if="loading">
          <div class="skeleton skeleton--value" />
          <div class="skeleton skeleton--sub" />
        </template>
        <template v-else>
          <p class="kpi-value" :style="lastSleepScore != null ? 'color: var(--module-sleep)' : ''">
            {{ lastSleepScore ?? '—' }}
          </p>
          <p class="kpi-sub">{{ lastSleepScore != null ? '/100 hier' : 'Non renseigné' }}</p>
        </template>
      </router-link>

      <!-- Séance -->
      <router-link to="/musculation" class="kpi-card">
        <div class="kpi-label">
          <Dumbbell :size="10" stroke-width="2" style="color: var(--module-muscu)" />
          <span>Séance</span>
        </div>
        <template v-if="loading">
          <div class="skeleton skeleton--value skeleton--short" />
          <div class="skeleton skeleton--sub" />
        </template>
        <template v-else>
          <p class="kpi-value kpi-value--sm">{{ todayPlan?.template?.label ?? '—' }}</p>
          <p class="kpi-sub" :style="todayWorkoutDone
            ? 'color:var(--status-success)'
            : isRestToday
              ? 'color:var(--text-disabled)'
              : 'color:var(--status-warning)'">
            {{ todayWorkoutDone ? 'Complète' : isRestToday ? 'Repos' : 'À faire' }}
          </p>
        </template>
      </router-link>

      <!-- Semaine -->
      <div class="kpi-card kpi-card--plain">
        <div class="kpi-label">
          <Activity :size="10" stroke-width="2" style="color: var(--status-success)" />
          <span>Semaine</span>
        </div>
        <template v-if="loading">
          <div class="skeleton skeleton--value" />
          <div class="skeleton skeleton--sub" />
        </template>
        <template v-else>
          <p class="kpi-value" style="color: var(--status-success)">{{ weekSessionCount }}</p>
          <p class="kpi-sub">séance{{ weekSessionCount > 1 ? 's' : '' }}</p>
        </template>
      </div>
    </div>

    <!-- ── Session du jour ── -->
    <div v-if="!loading && !isRestToday && todayPlan" class="session-card">
      <div class="session-header">
        <div class="session-meta">
          <p class="section-eyebrow">Programme du jour</p>
          <h3 class="session-title">
            {{ todayPlan.template.label }}
            <span v-if="todayWorkoutDone" class="session-done-mark">✓</span>
          </h3>
          <p class="session-desc">{{ todayPlan.template.description }}</p>
        </div>
        <div class="session-icon">
          <Dumbbell :size="20" stroke-width="1.5" />
        </div>
      </div>

      <!-- Exercises -->
      <div v-if="todayPlan.template.exercises?.length" class="exercise-list">
        <div
          v-for="(ex, i) in todayPlan.template.exercises.slice(0, 3)"
          :key="i"
          class="exercise-row"
        >
          <span class="exercise-name">{{ ex.name }}</span>
          <span class="exercise-sets">{{ ex.sets }}×{{ ex.repsRange }}</span>
        </div>
        <p v-if="todayPlan.template.exercises.length > 3" class="exercise-more">
          +{{ todayPlan.template.exercises.length - 3 }} exercices
        </p>
      </div>

      <!-- Cardio -->
      <div v-else-if="todayPlan.template.cardioOptions?.length" class="exercise-list">
        <div v-for="opt in todayPlan.template.cardioOptions" :key="opt.name" class="exercise-row">
          <Heart :size="11" stroke-width="1.75" style="color:var(--module-nutri);flex-shrink:0" />
          <span class="exercise-name">{{ opt.name }}</span>
          <span class="exercise-sets">{{ opt.duration }}</span>
        </div>
      </div>

      <router-link
        to="/musculation"
        class="session-cta"
        :class="todayWorkoutDone ? 'session-cta--done' : 'session-cta--primary'"
      >
        <component :is="todayWorkoutDone ? CheckCircle2 : Play" :size="14" stroke-width="1.75" />
        {{ todayWorkoutDone ? 'Voir la séance' : 'Commencer la séance' }}
      </router-link>
    </div>

    <!-- Skeleton session card -->
    <div v-else-if="loading" class="session-card">
      <div class="skeleton skeleton--title" />
      <div class="skeleton skeleton--body" style="margin-top:8px" />
      <div class="skeleton skeleton--body" style="width:70%;margin-top:6px" />
      <div class="skeleton skeleton--cta" style="margin-top:24px" />
    </div>

    <!-- ── Repos ── -->
    <div v-else-if="!loading && isRestToday" class="rest-card">
      <div class="rest-icon">
        <Moon :size="32" stroke-width="1.25" />
      </div>
      <p class="rest-title">Jour de repos</p>
      <p class="rest-sub">La récupération fait partie de la performance.</p>
    </div>

    <!-- ── Activité semaine ── -->
    <div class="week-card">
      <p class="section-eyebrow">Cette semaine</p>
      <div class="week-grid">
        <div
          v-for="day in weekActivity"
          :key="day.dayIndex"
          class="day-col"
          :class="{ 'day-col--future': day.isFuture }"
        >
          <span class="day-label" :class="{ 'day-label--today': day.isToday }">
            {{ day.shortLabel }}
          </span>
          <div
            class="day-cell"
            :class="[
              day.done    ? 'day-cell--done' :
              day.isToday ? 'day-cell--today' :
                            'day-cell--empty'
            ]"
          >
            <component
              :is="day.session === 'CARDIO' ? Heart : (day.session === 'REPOS' || day.session === 'MATCH') ? Moon : Dumbbell"
              :size="12"
              stroke-width="1.75"
              class="day-icon"
              :class="[
                day.done    ? 'day-icon--done' :
                day.isToday ? 'day-icon--today' :
                              'day-icon--empty'
              ]"
            />
          </div>
          <div class="day-dot" :class="{ 'day-dot--today': day.isToday }" />
        </div>
      </div>
    </div>

    <!-- ── Progressive overload ── -->
    <div v-if="!loading && increaseReadyExercises.length > 0" class="overload-card">
      <div class="overload-header">
        <TrendingUp :size="13" stroke-width="1.75" style="color:var(--status-success)" />
        <p class="section-eyebrow" style="color:var(--status-success)">Prêt à progresser</p>
      </div>
      <div class="overload-list">
        <div
          v-for="ex in increaseReadyExercises"
          :key="ex.name"
          class="overload-row"
        >
          <span class="overload-name">{{ ex.name }}</span>
          <span class="overload-detail">{{ ex.detail }}</span>
        </div>
      </div>
      <router-link to="/musculation" class="overload-link">
        Voir la séance <ArrowRight :size="11" />
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
const loading = ref(true)

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
  if (isRestToday.value) return "Repos actif — récupère bien."
  const s = todayPlan.value?.session
  const lines = {
    PUSH:   'Push — pecs, épaules & triceps.',
    PULL:   'Pull — dos & biceps.',
    LEGS:   'Legs — la base de tout.',
    UPPER:  'Upper body — construire le V.',
    LOWER:  'Lower body — chaîne postérieure.',
    CARDIO: 'Zone 2 — base aérobie.'
  }
  return lines[s] || 'Bonne journée.'
})

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
      shortLabel: day.label.slice(0, 1)
    }
  })
})

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

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id || user.value?.id
  if (!userId) { loading.value = false; return }
  await fetchData(userId)
  loading.value = false
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

<style scoped>
.dashboard {
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  user-select: none;
}

/* ── Hero ── */
.hero {
  padding: 8px 4px 20px;
}

.hero-date {
  font-size: var(--text-2xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
  margin-bottom: 14px;
}

.hero-greeting {
  font-family: var(--font-serif);
  font-size: clamp(2.2rem, 8vw, 2.8rem);
  font-weight: 400;
  color: var(--text-primary);
  line-height: 1.1;
  margin-bottom: 10px;
  letter-spacing: -0.02em;
}

.hero-line {
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: 1.5;
  max-width: 280px;
}

.streak-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  padding: 6px 12px;
  background: var(--accent-dim);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  color: var(--accent);
}

/* ── KPI Row ── */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.kpi-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px 16px;
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: border-color var(--dur-fast) var(--ease-out);
}

.kpi-card:hover {
  border-color: var(--border-default);
}

.kpi-card--plain {
  cursor: default;
}

.kpi-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
}

.kpi-value {
  font-size: 1.7rem;
  font-weight: 300;
  line-height: 1;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.kpi-value--sm {
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.3;
  color: var(--text-primary);
  letter-spacing: 0;
}

.kpi-sub {
  font-size: 10px;
  color: var(--text-muted);
}

/* ── Session card ── */
.session-card {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.session-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.section-eyebrow {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.session-title {
  font-family: var(--font-serif);
  font-size: var(--text-xl);
  font-weight: 400;
  color: var(--text-primary);
  line-height: 1.2;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.session-done-mark {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--status-success);
}

.session-desc {
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: 1.4;
}

.session-icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--module-muscu) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--module-muscu) 25%, transparent);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--module-muscu);
}

/* ── Exercise list ── */
.exercise-list {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
}

.exercise-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 0;
  border-bottom: 1px solid var(--border-subtle);
}

.exercise-row:last-of-type {
  border-bottom: none;
}

.exercise-name {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.exercise-sets {
  flex-shrink: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.exercise-more {
  font-size: 11px;
  color: var(--text-disabled);
  padding-top: 10px;
}

/* ── Session CTA ── */
.session-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  text-decoration: none;
  transition:
    background var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.session-cta:active {
  transform: scale(0.98);
}

.session-cta--primary {
  background: var(--accent);
  color: #fff;
  border-radius: 14px;
  height: 52px;
  transition: opacity 150ms ease, transform 150ms ease;
}

.session-cta--primary:hover {
  opacity: 0.9;
}

.session-cta--done {
  background: var(--bg-subtle);
  color: var(--text-muted);
  border: 1px solid var(--border-subtle);
}

/* ── Rest card ── */
.rest-card {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
}

.rest-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--module-sleep) 12%, transparent);
  border-radius: 50%;
  color: var(--module-sleep);
}

.rest-title {
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  color: var(--text-primary);
  margin-top: 4px;
}

.rest-sub {
  font-size: var(--text-sm);
  color: var(--text-muted);
  max-width: 220px;
  line-height: 1.5;
}

/* ── Week card ── */
.week-card {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: 22px 20px;
}

.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-top: 14px;
}

.day-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: opacity var(--dur-base) var(--ease-out);
}

.day-col--future { opacity: 0.22; }

.day-label {
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.day-label--today { color: var(--accent); }

.day-cell {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background var(--dur-base) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out);
}

.day-cell--done {
  background: var(--accent);
  box-shadow: 0 4px 12px rgba(212, 151, 106, 0.3);
}

.day-cell--today {
  background: var(--accent-dim);
  border: 1px solid var(--accent-border);
}

.day-cell--empty {
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
}

.day-icon { flex-shrink: 0; }
.day-icon--done  { color: var(--bg-base); }
.day-icon--today { color: var(--accent); }
.day-icon--empty { color: var(--text-disabled); }

.day-dot {
  width: 3px;
  height: 3px;
  border-radius: 999px;
  background: var(--accent);
  opacity: 0;
  transition: opacity var(--dur-base) var(--ease-out);
}

.day-dot--today { opacity: 1; }

/* ── Overload card ── */
.overload-card {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-top-color: rgba(106, 170, 126, 0.2);
  border-radius: var(--radius-xl);
  padding: 22px 24px;
}

.overload-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.overload-list {
  display: flex;
  flex-direction: column;
}

.overload-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-subtle);
}

.overload-row:last-child { border-bottom: none; }

.overload-name {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  truncate: true;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  padding-right: 12px;
}

.overload-detail {
  font-size: var(--text-xs);
  color: var(--status-success);
  flex-shrink: 0;
}

.overload-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 14px;
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-decoration: none;
  transition: color var(--dur-fast) var(--ease-out);
}

.overload-link:hover { color: var(--text-secondary); }

/* ── Skeletons ── */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

.skeleton {
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    var(--bg-overlay) 25%,
    var(--bg-muted)   50%,
    var(--bg-overlay) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}

.skeleton--value  { height: 28px; width: 48px; }
.skeleton--short  { height: 16px; width: 64px; }
.skeleton--sub    { height: 10px; width: 52px; }
.skeleton--title  { height: 22px; width: 60%; }
.skeleton--body   { height: 14px; width: 100%; }
.skeleton--cta    { height: 48px; width: 100%; border-radius: var(--radius-md); }
</style>
