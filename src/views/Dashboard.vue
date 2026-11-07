<template>
  <div class="dashboard">

    <!-- ── En-tête ── -->
    <header class="dash-head">
      <h1 class="dash-title">
        {{ greeting }} {{ firstName }},{{ ' ' }}<br class="dash-break" />
        <span class="dash-title-soft">{{ currentDayFull }}</span>
      </h1>
      <div class="dash-actions">
        <router-link to="/nutrition" class="btn btn--dark dash-add">
          <Plus :size="18" stroke-width="2" />
          Ajouter un repas
        </router-link>
        <span class="dash-avatar" aria-hidden="true">{{ firstName.charAt(0) }}</span>
      </div>
    </header>

    <!-- ── Bandeau du jour ── -->
    <section
      class="banner"
      :class="{ 'banner--match': isMatchToday }"
      aria-label="Programme du jour"
    >
      <span class="orb orb--a" aria-hidden="true" />
      <span class="orb orb--b" aria-hidden="true" />
      <span class="orb orb--c" aria-hidden="true" />

      <template v-if="loading">
        <div class="skeleton skeleton--chip" />
        <div class="skeleton skeleton--title" />
        <div class="skeleton skeleton--body" />
        <div class="skeleton skeleton--cta" />
      </template>

      <template v-else-if="isRestToday">
        <div class="banner-text">
          <h2 class="banner-title">
            {{ isMatchToday ? 'Jour de match,' : 'Jour de repos,' }}<br />
            <span class="banner-title-soft">{{ isMatchToday ? 'pas de musculation' : 'place à la récupération' }}</span>
          </h2>
        </div>
        <router-link to="/plan" class="btn btn--light">Voir le plan</router-link>
      </template>

      <template v-else-if="todayPlan">
        <div class="banner-text">
          <span class="chip" :class="{ 'chip--done': todayWorkoutDone }">
            <Check v-if="todayWorkoutDone" :size="14" stroke-width="2.5" />
            {{ todayWorkoutDone ? 'Séance faite' : 'Séance du jour' }}
          </span>
          <h2 class="banner-title">
            {{ todayPlan.template.label }},<br />
            <span class="banner-title-soft">{{ sessionSubtitle }}</span>
          </h2>
          <p class="banner-meta">{{ sessionMeta }}</p>
          <p v-if="nextIncrease && !todayWorkoutDone" class="banner-progress">
            <TrendingUp :size="16" stroke-width="2" />
            {{ nextIncrease }}
          </p>
        </div>
        <router-link to="/musculation" class="btn" :class="todayWorkoutDone ? 'btn--light' : 'btn--dark'">
          <component :is="todayWorkoutDone ? ArrowRight : Play" :size="18" stroke-width="2" />
          {{ todayWorkoutDone ? 'Voir la séance' : 'Commencer la séance' }}
        </router-link>
      </template>
    </section>

    <!-- ── Sommeil ── -->
    <router-link to="/sommeil" class="card card--sleep">
      <p class="card-label">Sommeil<span class="card-label-wide">, {{ sleepSeries.length }} nuits</span></p>
      <div v-if="loading" class="skeleton skeleton--value" />
      <template v-else-if="lastSleepScore != null">
        <p class="card-value">{{ lastSleepScore }}</p>
        <svg
          v-if="sleepPath"
          class="spark"
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          role="img"
          :aria-label="`Score de sommeil sur ${sleepSeries.length} nuits`"
        >
          <defs>
            <linearGradient id="sleepArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="var(--module-sleep)" stop-opacity="0.24" />
              <stop offset="1" stop-color="var(--module-sleep)" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path :d="`${sleepPath} L 100 40 L 0 40 Z`" fill="url(#sleepArea)" />
          <path :d="sleepPath" class="spark-line" />
        </svg>
      </template>
      <p v-else class="card-empty">Pas encore de données pour cette nuit</p>
    </router-link>

    <!-- ── Calories ── -->
    <router-link to="/nutrition" class="card card--nutri">
      <div class="nutri-ring">
        <svg viewBox="0 0 36 36" role="img" :aria-label="`${caloriesToday} kilocalories aujourd'hui`">
          <circle cx="18" cy="18" r="15.9" class="ring-track" pathLength="100" />
          <circle
            v-for="seg in macroSegments"
            :key="seg.key"
            cx="18"
            cy="18"
            r="15.9"
            class="ring-seg"
            pathLength="100"
            :stroke="seg.color"
            :stroke-dasharray="`${seg.length} 100`"
            :stroke-dashoffset="-seg.offset"
          />
        </svg>
      </div>
      <div class="nutri-body">
        <p class="card-label">Calories</p>
        <div v-if="loadingNutrition" class="skeleton skeleton--value" />
        <template v-else-if="nutritionLoaded && caloriesToday > 0">
          <p class="card-value" :class="{ 'card-value--over': caloriesOver }">
            {{ caloriesToday.toLocaleString('fr-FR') }}
          </p>
          <p class="card-sub">{{ caloriesTarget ? 'sur ' + caloriesTarget.toLocaleString('fr-FR') + ' kcal' : 'kcal' }}</p>
          <ul class="macro-list">
            <li v-for="m in macros" :key="m.key">
              <span :style="{ color: m.color }">{{ m.label }}</span>
              <span>{{ m.value }} g</span>
            </li>
          </ul>
        </template>
        <p v-else class="card-empty">{{ nutritionLoaded ? 'Aucun repas' : 'Non disponible' }}</p>
      </div>
    </router-link>

    <!-- ── Forme de la semaine ── -->
    <section class="card card--form" aria-labelledby="form-title">
      <div class="form-head">
        <h2 id="form-title" class="form-title">Forme de la semaine</h2>
        <ul class="form-legend">
          <li class="legend--good">Tenu</li>
          <li class="legend--mid">Limite</li>
          <li class="legend--bad">Manqué</li>
        </ul>
      </div>

      <div class="form-grid" role="table" aria-labelledby="form-title">
        <div class="form-row form-row--days" role="row">
          <span class="form-corner" role="columnheader" />
          <span
            v-for="day in weekActivity"
            :key="day.dayIndex"
            class="form-day"
            :class="{ 'form-day--today': day.isToday }"
            role="columnheader"
            :aria-label="day.label"
          >
            <span class="form-day-long">{{ day.label.slice(0, 3) }}</span>
            <span class="form-day-short">{{ day.shortLabel }}</span>
          </span>
        </div>

        <div v-for="row in formRows" :key="row.label" class="form-row" role="row">
          <span class="form-name" role="rowheader">{{ row.label }}</span>
          <span
            v-for="cell in row.cells"
            :key="cell.key"
            class="form-cell"
            :class="`form-cell--${cell.state}`"
            role="cell"
            :aria-label="cell.title"
            :title="cell.title"
          >
            <span class="form-cell-text">{{ cell.text }}</span>
          </span>
        </div>
      </div>
    </section>

    <!-- ── Fenêtres ── -->
    <router-link to="/fenetres" class="card card--windows">
      <span class="windows-icon" aria-hidden="true">
        <Wind :size="20" stroke-width="1.75" />
      </span>
      <div class="windows-body">
        <p class="card-label">Fenêtres</p>
        <p class="windows-title">{{ windowsTitle }}</p>
        <p v-if="windowsDetail" class="card-sub">{{ windowsDetail }}</p>
      </div>
      <ChevronRight :size="18" stroke-width="2" class="windows-go" />
    </router-link>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'
import { useWorkoutPrograms } from '@/composables/useWorkoutPrograms'
import { localDay, localDayRange, mondayOf } from '@/utils/date'
import { useProgressiveOverload } from '@/composables/useProgressiveOverload'
import { smoothPath } from '@/composables/useChartPath'
import { calorieState } from '@/composables/useCalorieStatus'
import {
  ArrowRight, Check, ChevronRight, Play, Plus, TrendingUp, Wind
} from 'lucide-vue-next'

const SLEEP_NIGHTS = 14
const SLEEP_GOOD = 80
const SLEEP_LIMIT = 60

const { user } = useAuth()
const { weekOverview, selectedPlan: todayPlan, isRestDay: isRestToday, templates } = useWorkoutPrograms()
const { fetchHistoryForExercises, getOverloadStatus } = useProgressiveOverload()

const sleepRecords = ref([])
const lastSleepScore = ref(null)
const workoutDatesAll = ref(new Set())
const cardioSessionDates = ref(new Set())
const exercises = ref([])
const loading = ref(true)

const nutritionLogs = ref([])
const caloriesTarget = ref(null)
const loadingNutrition = ref(true)
const nutritionLoaded = ref(false)

const windowForecast = ref(null)

// ── Dates ──
const dayStr = localDay
const mondayOfWeek = () => mondayOf()

// ── En-tête ──
const firstName = computed(() => {
  const email = user.value?.email || ''
  const raw = email.split('@')[0].split('.')[0]
  return raw.charAt(0).toUpperCase() + raw.slice(1)
})

const greeting = computed(() => (new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir'))

const currentDayFull = computed(() =>
  new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
)

// ── Séance du jour ──
const isMatchToday = computed(() => todayPlan.value?.session === 'MATCH')

const todayWorkoutDone = computed(() => {
  const today = dayStr(new Date())
  return workoutDatesAll.value.has(today) || cardioSessionDates.value.has(today)
})

const sessionSubtitle = computed(() => {
  const description = todayPlan.value?.template?.description || ''
  return description.split(' — ')[0].split(' · ')[0].toLowerCase()
})

const sessionMeta = computed(() => {
  const template = todayPlan.value?.template
  const count = template?.exercises?.length
  if (count) return `${count} exercice${count > 1 ? 's' : ''}`
  return template?.cardioOptions?.map(o => o.name).join(', ') || ''
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
      if (st?.status === 'INCREASE') {
        result.push({ name: tplEx.name, weight: st.suggestedWeight, today: tpl === todayPlan.value?.template })
      }
    }
  }
  return result
})

const nextIncrease = computed(() => {
  const today = increaseReadyExercises.value.filter(e => e.today)
  const first = today[0]
  if (!first) return ''
  const label = first.weight
    ? `${first.name} prêt à monter à ${first.weight.toLocaleString('fr-FR')} kg`
    : `${first.name} prêt à monter`
  return today.length > 1 ? `${label}, et ${today.length - 1} de plus` : label
})

// ── Semaine ──
const weekActivity = computed(() => {
  const today = dayStr(new Date())
  const monday = mondayOfWeek()

  return weekOverview.value.map(day => {
    const dayDate = new Date(monday)
    dayDate.setDate(monday.getDate() + (day.dayIndex === 0 ? 6 : day.dayIndex - 1))
    const dateStr = dayStr(dayDate)
    return {
      ...day,
      dateStr,
      isToday: dateStr === today,
      isFuture: dateStr > today,
      done: workoutDatesAll.value.has(dateStr) || cardioSessionDates.value.has(dateStr),
      shortLabel: day.label.slice(0, 1)
    }
  })
})

const caloriesByDate = computed(() => {
  const map = new Map()
  for (const log of nutritionLogs.value) {
    map.set(log.date, (map.get(log.date) ?? 0) + (log.calories ?? 0))
  }
  return map
})

const sessionState = (day) => {
  const rest = day.session === 'REPOS' || day.session === 'MATCH'
  if (day.done) return 'good'
  if (day.isFuture || rest) return 'empty'
  return day.isToday ? 'today' : 'bad'
}

const sleepState = (score) => {
  if (score >= SLEEP_GOOD) return 'good'
  return score >= SLEEP_LIMIT ? 'mid' : 'bad'
}

const formRows = computed(() => {
  const sleepByDate = new Map(sleepRecords.value.map(r => [r.date, r.score]))

  return [
    {
      label: 'Séances',
      cells: weekActivity.value.map(day => {
        const name = templates.value[day.session]?.label ?? day.session
        const short = day.session === 'MATCH' ? 'Match' : day.session === 'REPOS' ? 'Repos' : name
        const state = sessionState(day)
        return { key: day.dateStr, state, text: short, title: `${day.label}, ${short}` }
      })
    },
    {
      label: 'Sommeil',
      cells: weekActivity.value.map(day => {
        const score = sleepByDate.get(day.dateStr)
        return score == null
          ? { key: day.dateStr, state: 'empty', text: '', title: `${day.label}, pas de données` }
          : { key: day.dateStr, state: sleepState(score), text: String(score), title: `${day.label}, score ${score}` }
      })
    },
    {
      label: 'Calories',
      cells: weekActivity.value.map(day => {
        const calories = caloriesByDate.value.get(day.dateStr)
        if (!calories) return { key: day.dateStr, state: 'empty', text: '', title: `${day.label}, aucun repas` }
        const text = calories.toLocaleString('fr-FR')
        return {
          key: day.dateStr,
          state: day.isToday ? 'today' : calorieState(calories, caloriesTarget.value),
          text,
          title: `${day.label}, ${text} kcal`
        }
      })
    }
  ]
})

// ── Sommeil ──
const sleepSeries = computed(() =>
  sleepRecords.value.filter(r => r.score != null).map(r => r.score).slice(-SLEEP_NIGHTS)
)

const sleepPath = computed(() => smoothPath(sleepSeries.value))

// ── Calories ──
const todayLogs = computed(() => {
  const today = dayStr(new Date())
  return nutritionLogs.value.filter(l => l.date === today)
})

const caloriesToday = computed(() => todayLogs.value.reduce((sum, l) => sum + (l.calories ?? 0), 0))
const caloriesOver = computed(() => !!caloriesTarget.value && caloriesToday.value > caloriesTarget.value)

const sumOf = (field) => todayLogs.value.reduce((sum, l) => sum + (l[field] ?? 0), 0)

const macros = computed(() => [
  { key: 'protein', label: 'Protéines', value: Math.round(sumOf('protein')), kcal: 4, color: 'var(--accent)' },
  { key: 'carbs',   label: 'Glucides',  value: Math.round(sumOf('carbs')),   kcal: 4, color: 'var(--module-sleep)' },
  { key: 'fats',    label: 'Lipides',   value: Math.round(sumOf('fats')),    kcal: 9, color: 'var(--module-windows)' }
])

const macroSegments = computed(() => {
  const total = caloriesTarget.value || caloriesToday.value || 1
  let offset = 0
  return macros.value.map(m => {
    const length = Math.min(100 - offset, (m.value * m.kcal / total) * 100)
    const segment = { key: m.key, color: m.color, length: Math.max(0, length), offset }
    offset += segment.length
    return segment
  })
})

// ── Fenêtres ──
const formatTime = (iso) =>
  new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

const windowsState = computed(() => {
  const openAt = windowForecast.value?.predicted_open_at
  if (!openAt) return 'none'
  const closeAt = windowForecast.value?.predicted_close_at
  const now = Date.now()
  if (closeAt && now > new Date(closeAt).getTime()) return 'none'
  return now >= new Date(openAt).getTime() ? 'open' : 'upcoming'
})

const windowsTitle = computed(() => {
  if (windowsState.value === 'upcoming') return `Ouvre à ${formatTime(windowForecast.value.predicted_open_at)}`
  if (windowsState.value === 'open') return 'Tu peux ouvrir'
  return 'Aucun créneau favorable'
})

const windowsDetail = computed(() => {
  const closeAt = windowForecast.value?.predicted_close_at
  if (windowsState.value === 'none' || !closeAt) return ''
  return `Jusqu'à ${formatTime(closeAt)}`
})

// ── Chargement ──
const fetchNutrition = async (userId) => {
  try {
    const [logsRes, settingsRes] = await Promise.all([
      supabase
        .from('nutrition_logs')
        .select('date, calories, protein, carbs, fats')
        .eq('user_id', userId)
        .gte('date', dayStr(mondayOfWeek()))
        .eq('is_skipped', false),
      supabase.from('user_settings').select('calories_target').eq('user_id', userId).single()
    ])
    nutritionLogs.value = logsRes.data ?? []
    caloriesTarget.value = settingsRes.data?.calories_target ?? null
    nutritionLoaded.value = !logsRes.error
  } catch (e) {
    console.error('Dashboard nutrition error:', e)
  } finally {
    loadingNutrition.value = false
  }
}

const fetchWindows = async (userId) => {
  const { data, error } = await supabase
    .from('window_forecast')
    .select('predicted_open_at, predicted_close_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (!error) windowForecast.value = data
}

const fetchData = async (userId) => {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const monday = mondayOfWeek()
  const weekStart = dayStr(monday)
  const weekEndDate = new Date(monday)
  weekEndDate.setDate(monday.getDate() + 6)
  const sixtyDaysAgo = new Date(today)
  sixtyDaysAgo.setDate(today.getDate() - 60)
  const sleepStart = new Date(today)
  sleepStart.setDate(today.getDate() - Math.max(SLEEP_NIGHTS, today.getDay() === 0 ? 7 : today.getDay()) - 1)

  try {
    const [sleepRes, workoutsRes, exRes, cardioRes] = await Promise.all([
      supabase
        .from('sleep_records')
        .select('date, score')
        .eq('user_id', userId)
        .gte('date', dayStr(sleepStart))
        .order('date', { ascending: true }),
      supabase.from('workouts').select('date').eq('user_id', userId).gte('date', localDayRange(sixtyDaysAgo).start),
      supabase.from('exercises').select('id, name'),
      supabase.from('cardio_sessions').select('date').eq('user_id', userId).gte('date', weekStart).lte('date', dayStr(weekEndDate))
    ])

    if (sleepRes.data) {
      sleepRecords.value = sleepRes.data
      lastSleepScore.value = sleepRes.data.find(r => r.date === dayStr(yesterday))?.score ?? null
    }

    if (workoutsRes.data) {
      workoutDatesAll.value = new Set(workoutsRes.data.map(w => localDay(new Date(w.date))))
    }

    if (cardioRes.data?.length) {
      cardioSessionDates.value = new Set(cardioRes.data.map(s => s.date))
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

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id || user.value?.id
  if (!userId) {
    loading.value = false
    loadingNutrition.value = false
    return
  }
  fetchNutrition(userId) // ne bloque pas le reste du tableau de bord
  fetchWindows(userId)
  await fetchData(userId)
  loading.value = false
})
</script>

<style scoped>
.dashboard {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-areas:
    "head    head"
    "banner  banner"
    "sleep   nutri"
    "form    form"
    "windows windows";
  gap: var(--space-3);
  max-width: 1480px;
  margin: 0 auto;
}

/* ── En-tête ── */
.dash-head {
  grid-area: head;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.dash-title {
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.22;
}

.dash-title-soft { color: var(--text-secondary); }

.dash-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.dash-head .dash-add { display: none; }

.dash-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--avatar);
  color: var(--on-rail-active-text);
  font-size: var(--text-sm);
  font-weight: 500;
}

/* ── Boutons ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 48px;
  padding: 0 var(--space-5);
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition:
    transform var(--dur-fast) var(--ease-out),
    opacity var(--dur-fast) var(--ease-out);
}

.btn:hover { opacity: 0.88; }
.btn:active { transform: scale(0.97); }

.btn--dark {
  background: var(--action);
  color: var(--on-action);
}

.btn--light {
  background: var(--bg-raised);
  color: var(--text-primary);
}

/* ── Bandeau ── */
.banner {
  grid-area: banner;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  min-height: 206px;
  padding: 18px;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--aurore-dashboard);
}

.banner--match { background: var(--aurore-match); }

.banner-text,
.banner > .btn {
  position: relative;
  z-index: var(--z-raised);
}

.banner-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  max-width: 76%;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
  font-size: var(--text-2xs);
  font-weight: 500;
}

.chip--done { color: var(--status-success); }

.banner-title {
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.22;
}

.banner-title-soft { color: var(--text-secondary); }

.banner-meta {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.banner-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--status-success);
}

.orb {
  position: absolute;
  border-radius: 50%;
  opacity: var(--orb-opacity);
  pointer-events: none;
}

.orb--a { top: -36px; right: -32px; width: 150px; height: 150px; background: var(--orb-lilas); }
.orb--b { top: 70px; right: -46px; width: 92px; height: 92px; background: var(--orb-rose); }
.orb--c { right: 8px; bottom: 8px; width: 46px; height: 46px; background: var(--orb-ciel); }

.banner--match .orb--a { background: var(--orb-peche); }
.banner--match .orb--c { background: var(--orb-lilas); }

/* ── Cartes ── */
.card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--bg-raised);
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

a.card:active { transform: scale(0.985); }

.card-label {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.card-label-wide { display: none; }

.card-value {
  font-size: var(--text-2xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.12;
  font-variant-numeric: tabular-nums;
}

.card-value--over { color: var(--status-error); }

.card-sub {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.card-empty {
  margin-top: var(--space-1);
  font-size: var(--text-sm);
  line-height: 1.45;
  color: var(--text-secondary);
}

/* ── Sommeil ── */
.card--sleep { grid-area: sleep; }

.spark {
  display: block;
  flex: 1;
  width: 100%;
  min-height: 44px;
  margin-top: var(--space-1);
  overflow: visible;
}

.spark-line {
  fill: none;
  stroke: var(--module-sleep);
  stroke-width: 2.5;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}

/* ── Calories ── */
.card--nutri {
  grid-area: nutri;
  flex-direction: row-reverse;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.nutri-ring {
  width: 50px;
  height: 50px;
  flex-shrink: 0;
}

.card--nutri .card-value { font-size: var(--text-xl); }

.nutri-ring svg {
  display: block;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-track,
.ring-seg {
  fill: none;
  stroke-width: 3.4;
}

.ring-track { stroke: var(--bg-overlay); }

.macro-list {
  display: none;
  flex-direction: column;
  gap: 2px;
  margin-top: var(--space-2);
  padding: 0;
  list-style: none;
  font-size: var(--text-2xs);
  font-weight: 500;
}

.macro-list li {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  font-variant-numeric: tabular-nums;
}

/* ── Forme ── */
.card--form { grid-area: form; gap: var(--space-2); }

.form-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.form-title {
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.form-legend {
  display: none;
  gap: var(--space-3);
  padding: 0;
  list-style: none;
  font-size: var(--text-2xs);
  font-weight: 500;
}

.legend--good { color: var(--status-success); }
.legend--mid  { color: var(--status-warning); }
.legend--bad  { color: var(--status-error); }

.form-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.form-row {
  display: grid;
  grid-template-columns: 76px repeat(7, minmax(0, 1fr));
  align-items: center;
  gap: var(--space-1);
}

.form-day {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
  text-align: center;
}

.form-day--today { color: var(--text-primary); font-weight: 600; }
.form-day-long { display: none; }

.form-name {
  font-size: var(--text-sm);
  font-weight: 500;
}

.form-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.form-cell-text { display: none; }

.form-cell--good  { background: var(--status-success-dim); color: var(--status-success); }
.form-cell--mid   { background: var(--status-warning-dim); color: var(--status-warning); }
.form-cell--bad   { background: var(--status-error-dim);   color: var(--status-error); }
.form-cell--empty { background: var(--bg-overlay);         color: var(--text-secondary); }
.form-cell--plain { background: var(--bg-overlay);         color: var(--text-primary); }
.form-cell--today {
  background: var(--bg-raised);
  box-shadow: inset 0 0 0 1.5px var(--text-primary);
  color: var(--text-primary);
}

/* ── Fenêtres ── */
.card--windows {
  grid-area: windows;
  flex-direction: row;
  align-items: center;
  gap: var(--space-3);
}

.windows-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: var(--module-windows-dim);
  color: var(--module-windows);
}

.windows-body { flex: 1; min-width: 0; }

.windows-title {
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.windows-go { flex-shrink: 0; color: var(--text-secondary); }

/* ── Squelettes ── */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

.skeleton {
  position: relative;
  z-index: var(--z-raised);
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, var(--bg-overlay) 25%, var(--bg-muted) 50%, var(--bg-overlay) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}

.skeleton--chip  { width: 120px; height: 26px; border-radius: var(--radius-pill); }
.skeleton--title { width: 60%; height: 32px; }
.skeleton--body  { width: 45%; height: 18px; }
.skeleton--cta   { width: 210px; height: 48px; border-radius: var(--radius-pill); }
.skeleton--value { width: 72px; height: 34px; margin-top: var(--space-1); }

/* ── Tablette ── */
@media (min-width: 768px) {
  .card { padding: 20px; }
  .dash-break { display: none; }
  .dash-head .dash-add { display: inline-flex; }
  .dash-avatar { display: none; }

  .dash-title {
    font-size: var(--text-3xl);
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }

  .form-legend { display: flex; }
  .form-cell { height: 48px; }
  .form-cell-text { display: inline; }
  .form-day-long { display: inline; }
  .form-day-short { display: none; }
  .form-row { grid-template-columns: 92px repeat(7, minmax(0, 1fr)); gap: 6px; }
}

/* ── Desktop ── */
@media (min-width: 1100px) {
  .dashboard {
    grid-template-columns: minmax(0, 1fr) 84px 300px;
    grid-template-rows: auto auto 1fr 1fr;
    grid-template-areas:
      "head   head  head"
      "banner nutri nutri"
      "form   form  sleep"
      "form   form  windows";
    gap: var(--space-4);
    min-height: calc(100dvh - 40px);
  }

  .banner {
    min-height: 300px;
    padding: var(--space-6) 28px;
  }

  .banner-text { max-width: 54%; }
  .orb--a { top: -50px; right: 110px; width: 290px; height: 290px; }
  .orb--b { top: 96px; right: 24px; width: 180px; height: 180px; }
  .orb--c { top: 176px; right: 346px; bottom: auto; width: 84px; height: 84px; }


  .card--nutri {
    flex-direction: row;
    justify-content: flex-start;
    gap: var(--space-5);
    padding: var(--space-6);
  }

  .macro-list { display: flex; }
  .card--nutri .card-value { font-size: var(--text-2xl); }

  .nutri-ring {
    width: 170px;
    height: 170px;
    flex-shrink: 0;
  }

  .nutri-body { flex: 1; min-width: 0; }
  .card-label-wide { display: inline; }
  .card--form { padding: var(--space-6); gap: var(--space-3); }
  .form-title { font-size: var(--text-xl); }
  .form-grid { flex: 1; gap: 6px; justify-content: space-evenly; }
  .form-cell { height: clamp(58px, 10dvh, 88px); }

  .card--windows {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }

  .windows-go { display: none; }
  .windows-title { font-size: var(--text-xl); }
}
</style>
