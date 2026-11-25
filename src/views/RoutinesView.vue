<template>
  <div class="routine-view">

    <!-- ── En-tête ── -->
    <header class="view-head">
      <h1 class="view-title">
        Routines,{{ ' ' }}<br class="view-break" />
        <span class="view-title-soft">{{ headline }}</span>
      </h1>
      <div class="segmented" role="tablist" aria-label="Sections">
        <button
          v-for="tab in sectionTabs"
          :key="tab.id"
          role="tab"
          :aria-selected="activeTab === tab.id"
          class="segmented-btn"
          :class="{ 'segmented-btn--active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >{{ tab.label }}</button>
      </div>
    </header>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <section v-if="!ready" class="rt-card rt-empty">
      <p>Module en cours d’installation</p>
      <p class="rt-sub">Exécute supabase/schema/routines.sql dans le SQL Editor Supabase, puis recharge la page.</p>
    </section>

    <div v-else-if="loading && !items.length" class="skeleton" />

    <HabitsPanel
      v-else-if="activeTab === 'habits'"
      :items="items"
      :done="done"
      :wash-days="washDays"
      :today="today"
      @toggle="setDone"
      @edit="editing = $event"
      @remove="remove"
      @add="openNew('habitude')"
    />

    <div v-else-if="activeTab === 'calendar'" class="board board--calendar">
      <MonthCalendar
        :year="cursor.year"
        :month="cursor.month"
        :today="today"
        :selected="selected"
        :items="items"
        :done="done"
        :wash-days="washDays"
        :workout-days="workoutDays"
        :can-prev="canPrev"
        @select="select"
        @shift="shiftMonth"
      />

      <div class="column" aria-live="polite">
        <section class="rt-card">
          <h2 class="rt-title day-title">{{ longDay(selected) }}</h2>
          <p class="rt-sub">{{ selectedSummary }}</p>
        </section>
        <DayChecklist
          :day="selected"
          :items="items"
          :done="done"
          :wash-days="washDays"
          :readonly="selected > today"
          @toggle="setDone"
          @edit="editing = $event"
          @move="move"
          @remove="remove"
        />
      </div>
    </div>

    <div v-else class="board">
      <!-- ═══ Colonne de gauche ═══ -->
      <div class="column">
        <section class="banner" aria-label="Programme du jour">
          <span class="orb orb--a" aria-hidden="true" />
          <span class="orb orb--b" aria-hidden="true" />

          <h2 class="banner-title">
            {{ washTonight ? 'Shampooing ce soir.' : 'Cheveux au sec ce soir.' }}<br />
            <span class="banner-title-soft">{{ washHint }}</span>
          </h2>

          <fieldset class="choice">
            <legend class="field-label">Mes jours de shampooing</legend>
            <div class="choice-row">
              <button
                v-for="d in WEEKDAYS"
                :key="d.id"
                class="choice-btn"
                :class="{ 'choice-btn--active': washDays.includes(d.id) }"
                :aria-pressed="washDays.includes(d.id)"
                :aria-label="d.label"
                @click="toggleWashDay(d.id)"
              >{{ d.short }}</button>
            </div>
          </fieldset>

          <button class="shop-btn shop-btn--dark banner-action" @click="openNew(defaultSection)">
            <Plus :size="18" stroke-width="2" /> Ajouter une étape
          </button>
        </section>
      </div>

      <!-- ═══ Étapes du jour ═══ -->
      <div class="column">
        <DayChecklist
          :day="today"
          :items="items"
          :done="done"
          :wash-days="washDays"
          @toggle="setDone"
          @edit="editing = $event"
          @move="move"
          @remove="remove"
        />
        <section v-if="!todayStats.total" class="rt-card rt-empty">
          <p>Rien de prévu aujourd’hui</p>
          <p class="rt-sub">
            {{ items.length
              ? 'Ajoute une étape avec le bouton « Ajouter une étape ».'
              : 'Ajoute une première étape, ou importe la routine de départ dans Supabase.' }}
          </p>
        </section>
      </div>
    </div>

    <StepDialog :item="editing" :saving="saving" @save="save" @close="editing = null" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import DayChecklist from '@/components/routines/DayChecklist.vue'
import HabitsPanel from '@/components/routines/HabitsPanel.vue'
import MonthCalendar from '@/components/routines/MonthCalendar.vue'
import StepDialog from '@/components/routines/StepDialog.vue'
import '@/components/shopping/shopping.css'
import '@/components/routines/routines.css'
import { useRoutines } from '@/composables/useRoutines'
import { useConfirm } from '@/composables/useConfirm'
import { localDay } from '@/utils/date'
import { WEEKDAYS, addDays, dayStats, isWashDay, longDay, weekdayOf } from '@/utils/routines/routines'

const {
  items, done, washDays, workoutDays, loading, error, ready,
  load, setDone, saveItem, archiveItem, swapPositions, saveWashDays,
} = useRoutines()
const { askConfirm } = useConfirm()

const sectionTabs = [
  { id: 'today', label: 'Aujourd’hui' },
  { id: 'habits', label: 'Habitudes' },
  { id: 'calendar', label: 'Calendrier' },
]

const monthOf = (day) => ({ year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) - 1 })

const today = ref(localDay())
const activeTab = ref('today')
const selected = ref(today.value)
const cursor = ref(monthOf(today.value))
const editing = ref(null)
const saving = ref(false)

const todayStats = computed(() => dayStats(items.value, done.value, today.value, washDays.value))

const headline = computed(() => {
  const { total, done: count } = todayStats.value
  if (!ready.value || !total) return 'ta journée'
  const left = total - count
  return left ? `${left} étape${left > 1 ? 's' : ''} aujourd’hui` : 'journée terminée'
})

const washTonight = computed(() => isWashDay(today.value, washDays.value))

const washHint = computed(() => {
  if (!washDays.value.length) return 'Aucun jour de shampooing choisi.'
  for (let i = 1; i <= 7; i += 1) {
    const day = addDays(today.value, i)
    if (!isWashDay(day, washDays.value)) continue
    if (i === 1) return 'Le prochain : demain.'
    return `Le prochain : ${WEEKDAYS[weekdayOf(day) - 1].label.toLowerCase()}.`
  }
  return ''
})

const defaultSection = computed(() => (new Date().getHours() < 14 ? 'matin' : 'soir'))

// On ne remonte pas avant la première étape enregistrée.
const canPrev = computed(() => {
  const first = items.value.map((i) => i.start_day).filter(Boolean).sort()[0]
  if (!first) return false
  const { year, month } = monthOf(first)
  return cursor.value.year * 12 + cursor.value.month > year * 12 + month
})

const selectedSummary = computed(() => {
  const stats = dayStats(items.value, done.value, selected.value, washDays.value)
  const parts = []
  if (!stats.total) parts.push('Aucune étape suivie ce jour-là')
  else if (selected.value > today.value) parts.push(`${stats.total} étapes prévues`)
  else parts.push(`${stats.done} étapes sur ${stats.total}`)
  if (isWashDay(selected.value, washDays.value)) parts.push('shampooing')
  if (workoutDays.value.has(selected.value)) parts.push('séance enregistrée')
  return parts.join(', ')
})

const select = (day) => {
  selected.value = day
  cursor.value = monthOf(day)
}

const shiftMonth = (n) => {
  const date = new Date(cursor.value.year, cursor.value.month + n, 1)
  cursor.value = { year: date.getFullYear(), month: date.getMonth() }
}

const toggleWashDay = (id) => {
  saveWashDays(washDays.value.includes(id)
    ? washDays.value.filter((d) => d !== id)
    : [...washDays.value, id])
}

const openNew = (section) => {
  editing.value = { section, days: [] }
}

const save = async (draft) => {
  saving.value = true
  if (await saveItem(draft)) editing.value = null
  else editing.value = { ...draft }
  saving.value = false
}

const move = (item, neighbour) => {
  if (neighbour) swapPositions(item, neighbour)
}

const remove = async (item) => {
  if (await askConfirm({
    title: `Retirer « ${item.title} » ?`,
    detail: 'Les jours déjà passés restent dans le calendrier.',
    confirmLabel: 'Retirer',
  })) {
    await archiveItem(item)
  }
}

// L'application peut rester ouverte d'un jour à l'autre : on recale la date au retour.
const refreshDay = () => {
  if (document.visibilityState !== 'visible') return
  const now = localDay()
  if (now === today.value) return
  today.value = now
  select(now)
  load()
}

onMounted(() => {
  load()
  document.addEventListener('visibilitychange', refreshDay)
})
onBeforeUnmount(() => document.removeEventListener('visibilitychange', refreshDay))
</script>

<style scoped>
/* Mêmes proportions que le Dressing */
.routine-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 1480px;
  margin: 0 auto;
}

/* ── En-tête ── */
.view-head { display: flex; flex-direction: column; gap: var(--space-3); }
.view-title { font-size: var(--text-xl); font-weight: 600; letter-spacing: -0.02em; line-height: 1.22; }
.view-title-soft { color: var(--text-secondary); }

.segmented { display: flex; gap: 2px; padding: var(--space-1); border-radius: var(--radius-pill); background: var(--bg-raised); }
.segmented-btn {
  flex: 1;
  min-height: 44px;
  padding: 0 var(--space-3);
  border: none;
  border-radius: var(--radius-pill);
  background: none;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}
.segmented-btn--active { background: var(--action); color: var(--on-action); }

.error {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--status-error-dim);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--status-error);
}

.board { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-3); align-items: start; }
.column { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
.day-title::first-letter { text-transform: uppercase; }

/* ── Bandeau ── */
.banner {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: 18px;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--aurore-routine);
}
.banner > :not(.orb) { position: relative; z-index: var(--z-raised); }
.banner-title { max-width: 80%; font-size: var(--text-xl); font-weight: 600; letter-spacing: -0.02em; line-height: 1.22; }
.banner-title-soft { color: var(--text-secondary); }
.banner-action { width: 100%; min-height: 48px; }

.choice { display: flex; flex-direction: column; min-width: 0; margin: 0; padding: 0; border: none; }
.field-label { padding: 0 0 6px; font-size: var(--text-2xs); font-weight: 500; color: var(--text-secondary); }
.choice-row { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.choice-btn {
  min-width: 0;
  min-height: 44px;
  padding: 0;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.choice-btn--active { background: var(--action); color: var(--on-action); }

.orb { position: absolute; border-radius: 50%; opacity: var(--orb-opacity); pointer-events: none; }
.orb--a { top: -44px; right: -30px; width: 118px; height: 118px; background: var(--orb-peche); }
.orb--b { top: 24px; right: -26px; width: 56px; height: 56px; background: var(--orb-rose); }

@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
.skeleton {
  height: 320px;
  border-radius: var(--radius-lg);
  background: linear-gradient(90deg, var(--bg-overlay) 25%, var(--bg-muted) 50%, var(--bg-overlay) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}

/* ── Tablette ── */
@media (min-width: 768px) {
  .view-head { flex-direction: row; align-items: center; justify-content: space-between; }
  .view-break { display: none; }
  .view-title { font-size: var(--text-3xl); font-weight: 700; letter-spacing: -0.03em; line-height: 1.1; }
  .segmented { flex-shrink: 0; width: 360px; }
  .banner { padding: var(--space-6); }
}

/* ── Desktop ── */
@media (min-width: 1100px) {
  .routine-view { gap: var(--space-4); }
  .board { grid-template-columns: 340px minmax(0, 1fr); gap: var(--space-4); }
  .board--calendar { grid-template-columns: minmax(0, 1fr) 440px; }
  .column { gap: var(--space-4); }
}
</style>
