<template>
  <section class="rt-card" aria-labelledby="calendar-title">
    <div class="nav">
      <button class="nav-btn" :disabled="!canPrev" aria-label="Mois précédent" @click="emit('shift', -1)">
        <ChevronLeft :size="20" stroke-width="2" />
      </button>
      <h2 id="calendar-title" class="rt-title" aria-live="polite">{{ title }}</h2>
      <button class="nav-btn" aria-label="Mois suivant" @click="emit('shift', 1)">
        <ChevronRight :size="20" stroke-width="2" />
      </button>
    </div>

    <div class="week week--head" aria-hidden="true">
      <span v-for="d in WEEKDAYS" :key="d.id">{{ d.label.slice(0, 3) }}</span>
    </div>

    <div v-for="week in weeks" :key="week[0].day" class="week">
      <button
        v-for="cell in week"
        :key="cell.day"
        class="cell"
        :class="[`cell--${cell.state}`, {
          'cell--outside': !cell.inMonth,
          'cell--today': cell.day === today,
          'cell--selected': cell.day === selected,
        }]"
        :style="{ '--ratio': `${cell.ratio * 100}%` }"
        :aria-pressed="cell.day === selected"
        :aria-label="cell.label"
        @click="emit('select', cell.day)"
      >
        <span class="cell-number">{{ cell.number }}</span>
        <span class="cell-marks" aria-hidden="true">
          <Droplet v-if="cell.wash" :size="11" stroke-width="2.25" />
          <Dumbbell v-if="cell.workout" :size="11" stroke-width="2.25" />
        </span>
        <span class="cell-bar" aria-hidden="true"><span v-if="cell.showBar" /></span>
      </button>
    </div>

    <ul class="legend rt-list">
      <li><Droplet :size="12" stroke-width="2.25" aria-hidden="true" /> Shampooing</li>
      <li><Dumbbell :size="12" stroke-width="2.25" aria-hidden="true" /> Séance enregistrée</li>
      <li><span class="legend-bar" aria-hidden="true" /> Avancement du jour</li>
    </ul>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, Droplet, Dumbbell } from 'lucide-vue-next'
import { WEEKDAYS, dayStats, isWashDay, longDay, monthGrid } from '@/utils/routines/routines'

const props = defineProps({
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  today: { type: String, required: true },
  selected: { type: String, required: true },
  items: { type: Array, required: true },
  done: { type: Set, required: true },
  washDays: { type: Array, required: true },
  workoutDays: { type: Set, required: true },
  canPrev: { type: Boolean, default: false },
})
const emit = defineEmits(['select', 'shift'])

const title = computed(() => {
  const text = new Date(props.year, props.month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return text.charAt(0).toUpperCase() + text.slice(1)
})

const weeks = computed(() => monthGrid(props.year, props.month).map((week) => week.map((cell) => {
  const stats = dayStats(props.items, props.done, cell.day, props.washDays)
  const wash = isWashDay(cell.day, props.washDays)
  const workout = props.workoutDays.has(cell.day)
  const showBar = stats.total > 0 && cell.day <= props.today
  const label = [
    longDay(cell.day),
    showBar ? `${stats.done} étapes sur ${stats.total}` : null,
    wash ? 'shampooing' : null,
    workout ? 'séance enregistrée' : null,
  ].filter(Boolean).join(', ')
  return { ...cell, wash, workout, showBar, label, ratio: stats.ratio, state: showBar && stats.complete ? 'done' : 'open' }
})))
</script>

<style scoped>
.nav { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--bg-overlay);
  color: var(--text-primary);
  cursor: pointer;
}
.nav-btn:disabled { opacity: 0.35; cursor: default; }

.week { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.week--head span { text-align: center; font-size: var(--text-2xs); font-weight: 600; color: var(--text-secondary); }

.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 3px;
  min-width: 0;
  min-height: 58px;
  padding: 6px 4px;
  border: 1.5px solid transparent;
  border-radius: var(--radius-sm);
  background: var(--bg-overlay);
  font-family: var(--font-sans);
  color: var(--text-primary);
  cursor: pointer;
}
.cell--done { background: var(--module-routine-dim); }
.cell--outside { opacity: 0.4; }
.cell--today .cell-number { font-weight: 700; color: var(--module-routine); text-decoration: underline; text-underline-offset: 3px; }
.cell--selected { border-color: var(--text-primary); }

.cell-number { font-size: var(--text-xs); font-weight: 500; font-variant-numeric: tabular-nums; }
.cell-marks { display: flex; gap: 2px; height: 11px; color: var(--text-secondary); }
.cell-bar { display: block; width: 100%; height: 4px; }
.cell-bar span {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(to right, var(--module-routine) var(--ratio), var(--bg-muted) var(--ratio));
}

.legend { display: flex; flex-wrap: wrap; gap: var(--space-4); padding-top: var(--space-1); }
.legend li { display: inline-flex; align-items: center; gap: 6px; font-size: var(--text-2xs); color: var(--text-secondary); }
.legend-bar { width: 14px; height: 4px; border-radius: 2px; background: var(--module-routine); }
</style>
