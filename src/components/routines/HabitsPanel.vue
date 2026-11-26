<template>
  <div class="habits">
    <p class="intro rt-sub">
      La série compte les réussites à la suite, sans tenir compte des jours où rien n’est prévu.
      La régularité porte sur les 30 derniers jours terminés.
    </p>

    <ul class="grid rt-list">
      <li v-for="row in rows" :key="row.id" class="rt-card" :style="toneStyle(row.tone)">
        <div class="rt-head">
          <span class="rt-icon" aria-hidden="true"><component :is="row.icon" :size="16" stroke-width="1.75" /></span>
          <div class="name">
            <h2 class="name-title">{{ row.title }}</h2>
            <p class="rt-sub">{{ row.sub }}</p>
          </div>
          <label v-if="row.habit && row.state !== 'off'" class="today">
            <input
              type="checkbox"
              :checked="row.state === 'done'"
              @change="emit('toggle', row.habit, today, $event.target.checked)"
            >
            Fait aujourd’hui
          </label>
        </div>

        <dl class="figures">
          <div>
            <dt class="rt-sub">Série</dt>
            <dd>{{ row.streak }} {{ streakUnit(row) }}</dd>
          </div>
          <div>
            <dt class="rt-sub">Régularité</dt>
            <dd>{{ row.adherence === null ? 'à venir' : `${row.adherence} %` }}</dd>
          </div>
        </dl>

        <ol class="dots rt-list" :aria-label="`14 derniers jours : ${row.title}`">
          <li
            v-for="d in row.history"
            :key="d.day"
            class="dot"
            :class="[`dot--${d.state}`, { 'dot--today': d.day === today }]"
            :title="`${longDay(d.day)} : ${STATE_LABELS[d.state]}`"
          >
            <span class="sr">{{ longDay(d.day) }} : {{ STATE_LABELS[d.state] }}</span>
          </li>
        </ol>

        <div v-if="row.habit" class="actions">
          <button class="shop-btn" @click="emit('edit', row.habit)"><Pencil :size="16" stroke-width="1.75" /> Modifier</button>
          <button class="shop-btn" @click="emit('remove', row.habit)"><Trash2 :size="16" stroke-width="1.75" /> Retirer</button>
        </div>
      </li>
    </ul>

    <button class="shop-btn shop-btn--dark add" @click="emit('add')">
      <Plus :size="18" stroke-width="2" /> Ajouter une habitude
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { SECTION_LOOKS, toneStyle } from '@/components/routines/looks'
import {
  SECTIONS, adherence, frequencyLabel, groupState, history, longDay, streak,
} from '@/utils/routines/routines'

const STATE_LABELS = { done: 'réussi', partial: 'en partie', missed: 'manqué', todo: 'à faire', off: 'rien de prévu' }

const props = defineProps({
  items: { type: Array, required: true },
  done: { type: Set, required: true },
  washDays: { type: Array, required: true },
  uv: { type: Object, default: () => ({}) },
  today: { type: String, required: true },
})
const emit = defineEmits(['toggle', 'edit', 'remove', 'add'])

const measure = (group) => ({
  state: groupState(group, props.done, props.today, props.washDays, props.today, props.uv),
  streak: streak(group, props.done, props.today, props.washDays, props.uv),
  adherence: adherence(group, props.done, props.today, props.washDays, 30, props.uv),
  history: history(group, props.done, props.today, props.washDays, 14, props.uv),
})

// Une habitude qui ne revient pas tous les jours se compte en fois, pas en jours.
const streakUnit = (row) => {
  const days = row.habit?.days?.length
  if ((days && days < 7) || (row.habit && row.habit.condition !== 'toujours')) return 'fois'
  return row.streak > 1 ? 'jours' : 'jour'
}

const isActive = (item) => !item.archived_on || item.archived_on > props.today

// Une ligne par routine (toutes ses étapes ensemble), puis une par habitude.
const rows = computed(() => {
  const routines = SECTIONS
    .filter((s) => s.id !== 'habitude')
    .map((s) => ({ ...s, group: props.items.filter((i) => i.section === s.id) }))
    .filter((s) => s.group.some(isActive))
    .map((s) => ({
      id: s.id,
      title: s.title,
      sub: 'Réussie quand toutes les étapes du jour sont cochées',
      ...SECTION_LOOKS[s.id],
      ...measure(s.group),
    }))

  const habits = props.items
    .filter((i) => i.section === 'habitude' && isActive(i))
    .sort((a, b) => a.position - b.position)
    .map((habit) => {
      const single = { ...habit, optional: false }
      return { id: habit.id, habit, title: habit.title, sub: frequencyLabel(habit), ...SECTION_LOOKS.habitude, ...measure([single]) }
    })

  return [...routines, ...habits]
})
</script>

<style scoped>
.habits { display: flex; flex-direction: column; gap: var(--space-3); }
.grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-3); }

.name { flex: 1; min-width: 0; }
.name-title { font-size: var(--text-md); font-weight: 600; overflow-wrap: anywhere; }

.today { display: flex; flex-shrink: 0; align-items: center; gap: var(--space-2); min-height: 44px; font-size: var(--text-xs); font-weight: 600; cursor: pointer; }
.today input { width: 22px; height: 22px; accent-color: var(--tone); }

.figures { display: flex; gap: var(--space-6); margin: 0; }
.figures dd { margin: 0; font-size: var(--text-lg); font-weight: 600; font-variant-numeric: tabular-nums; }

.dots { display: grid; grid-template-columns: repeat(14, minmax(0, 1fr)); gap: 4px; }
.dot { position: relative; height: 22px; border-radius: 6px; background: var(--bg-muted); }
.dot--done { background: var(--tone); }
.dot--partial { background: linear-gradient(to top, var(--tone) 50%, var(--tone-dim) 50%); }
.dot--missed { background: var(--tone-dim); }
.dot--todo { background: none; border: 1.5px dashed var(--tone); }
.dot--off { height: 8px; align-self: center; }
.dot--today { outline: 2px solid var(--text-primary); outline-offset: 1px; }

.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

.actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.add { align-self: stretch; min-height: 48px; }

@media (min-width: 768px) {
  .add { align-self: flex-start; }
}
@media (min-width: 1100px) {
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
}
</style>
