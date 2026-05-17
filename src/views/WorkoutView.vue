<template>
  <div class="workout-view">

    <!-- ── Header ── -->
    <header class="module-header">
      <div class="module-header-title">
        <div class="module-icon" style="--color: var(--module-muscu)">
          <Dumbbell :size="18" stroke-width="1.75" />
        </div>
        <div>
          <h2 class="module-name">Musculation</h2>
          <p class="module-sub">Performance & Progression</p>
        </div>
      </div>

      <div class="tab-switcher">
        <button
          @click="activeTab = 'workout'"
          class="tab-btn"
          :class="{ 'tab-btn--active': activeTab === 'workout' }"
        >
          <Target :size="13" stroke-width="1.75" />
          Séance
        </button>
        <button
          @click="activeTab = 'exercises'"
          class="tab-btn"
          :class="{ 'tab-btn--active': activeTab === 'exercises' }"
        >
          <LayoutIcon :size="13" stroke-width="1.75" />
          Bibliothèque
        </button>
      </div>
    </header>

    <!-- ═══ BIBLIOTHÈQUE ═══ -->
    <div v-if="activeTab === 'exercises'" class="tab-content animate-fade-in">
      <div class="form-card">
        <h3 class="form-card-title">Ajouter un exercice</h3>

        <!-- Muscle group -->
        <div class="field-group">
          <label class="field-label">Nouveau groupe musculaire</label>
          <div class="field-row">
            <input
              v-model="newMuscleGroup"
              type="text"
              class="field-input"
              placeholder="Ex: Pectoraux, Dos…"
            />
            <button type="button" @click="handleAddMuscleGroup" class="icon-btn" aria-label="Ajouter">
              <Plus :size="20" stroke-width="1.75" />
            </button>
          </div>
        </div>

        <div class="form-divider" />

        <form @submit.prevent="addExercise" class="field-stack">
          <div class="field-group">
            <label class="field-label">Nom de l'exercice</label>
            <input
              v-model="newExercise.name"
              required
              type="text"
              class="field-input"
              placeholder="Ex: Développé couché"
            />
          </div>

          <div class="field-group">
            <label class="field-label">Groupe musculaire</label>
            <div class="select-wrap">
              <select v-model="newExercise.muscle_group_id" required class="field-input field-select">
                <option value="" disabled>Sélectionnez un groupe</option>
                <option v-for="group in muscleGroups" :key="group.id" :value="group.id">{{ group.name }}</option>
              </select>
              <ChevronRight :size="15" stroke-width="1.75" class="select-chevron" />
            </div>
          </div>

          <button type="submit" :disabled="loading.exercises" class="btn-primary btn-primary--lg">
            <span v-if="loading.exercises" class="btn-spinner" />
            <Save v-else :size="16" stroke-width="1.75" />
            {{ loading.exercises ? 'Enregistrement…' : "Ajouter l'exercice" }}
          </button>
        </form>
      </div>
    </div>

    <!-- ═══ SÉANCE ═══ -->
    <div v-if="activeTab === 'workout'" class="tab-content">

      <!-- Skeleton -->
      <div v-if="loading.data" class="skeleton-block">
        <div class="week-skeleton">
          <div v-for="i in 7" :key="i" class="skeleton skeleton--day" />
        </div>
        <div class="skeleton skeleton--card" />
      </div>

      <template v-else>
        <!-- ── Week nav ── -->
        <div class="week-nav">
          <div class="week-nav-scroll">
            <button
              v-for="day in weekOverview"
              :key="day.dayIndex"
              @click="selectedDayIndex = day.dayIndex"
              class="day-btn"
              :class="{ 'day-btn--active': day.dayIndex === selectedDayIndex }"
            >
              <span class="day-btn-label">{{ day.label.slice(0, 2) }}</span>
              <div class="day-btn-icon-wrap">
                <component
                  :is="day.session === 'REPOS' ? Moon : day.session === 'MATCH' ? Trophy : day.session === 'CARDIO' ? Heart : Dumbbell"
                  :size="15"
                  stroke-width="1.75"
                />
              </div>
              <div v-if="day.dayIndex === todayDayIndex" class="today-pip" />
            </button>
          </div>
        </div>

        <!-- ── Sleep recovery banner ── -->
        <div v-if="lastSleepScore !== null && lastSleepScore < 60" class="sleep-banner sleep-banner--low">
          Récupération faible ({{ lastSleepScore }}/100) — adapte ton intensité
        </div>
        <div v-else-if="lastSleepScore !== null && lastSleepScore >= 80" class="sleep-banner sleep-banner--good" @click="lastSleepScore = null">
          Excellente récupération — tu es prêt
        </div>

        <!-- ── Session card ── -->
        <div v-if="selectedPlan" class="session-card">

          <!-- Header -->
          <div class="session-card-head">
            <div class="session-meta">
              <div class="session-badges">
                <span class="badge badge--dark">
                  {{ isSelectedToday ? "Aujourd'hui" : selectedPlan.label }}
                </span>
                <span v-if="selectedPlan.note" class="badge badge--accent">{{ selectedPlan.note }}</span>
              </div>
              <h3 class="session-title">{{ selectedPlan.template.label }}</h3>
              <p class="session-desc">{{ selectedPlan.template.description }}</p>
            </div>
            <button
              v-if="selectedPlan.template.exercises?.length"
              @click="editingTemplate = !editingTemplate"
              class="icon-btn"
              :class="{ 'icon-btn--active': editingTemplate }"
            >
              <component :is="editingTemplate ? CheckCircle2 : Pencil" :size="16" stroke-width="1.75" />
            </button>
          </div>

          <!-- CARDIO -->
          <div v-if="isCardioSession" class="session-card-body">
            <div class="cardio-options">
              <div v-for="option in selectedPlan.template.cardioOptions" :key="option.name" class="cardio-option">
                <div class="cardio-option-icon">
                  <Heart :size="14" stroke-width="1.75" style="color:var(--module-nutri)" />
                </div>
                <div>
                  <p class="cardio-option-name">{{ option.name }}</p>
                  <p class="cardio-option-dur">{{ option.duration }}</p>
                  <p v-if="option.note" class="cardio-option-note">{{ option.note }}</p>
                </div>
              </div>
            </div>

            <!-- Cardio form -->
            <div v-if="isSelectedToday && currentWorkout && !cardioSaved" class="cardio-form">
              <div class="field-grid-2">
                <div class="field-group">
                  <label class="field-label">Activité</label>
                  <input v-model="cardioLog.activity" placeholder="Vélo, marche…" class="field-input" />
                </div>
                <div class="field-group">
                  <label class="field-label">Durée (min)</label>
                  <input v-model.number="cardioLog.duration" type="number" placeholder="35" class="field-input" />
                </div>
                <div class="field-group">
                  <label class="field-label">FC moy. (bpm)</label>
                  <input v-model.number="cardioLog.avgHR" type="number" placeholder="130" class="field-input" />
                </div>
                <div class="field-group">
                  <label class="field-label">Zone</label>
                  <div class="select-wrap">
                    <select v-model="cardioLog.zone" class="field-input field-select">
                      <option value="2">Zone 2 (LISS)</option>
                      <option value="3">Zone 3</option>
                      <option value="4">Zone 4</option>
                    </select>
                    <ChevronRight :size="14" stroke-width="1.75" class="select-chevron" />
                  </div>
                </div>
              </div>
              <button @click="saveCardioLog" class="btn-primary">
                <CheckCircle2 :size="15" stroke-width="1.75" />
                Valider la séance cardio
              </button>
            </div>

            <div v-else-if="isSelectedToday && currentWorkout && cardioSaved" class="status-done">
              <CheckCircle2 :size="15" stroke-width="1.75" style="color:var(--status-success)" />
              <div>
                <p class="status-done-title">Cardio enregistré</p>
                <p v-if="cardioLog.duration" class="status-done-sub">{{ cardioLog.activity || 'Séance' }} · {{ cardioLog.duration }} min<span v-if="cardioLog.avgHR"> · {{ cardioLog.avgHR }} bpm</span></p>
              </div>
            </div>

            <button v-if="isSelectedToday && !currentWorkout" @click="startCardio" :disabled="loading.workout" class="btn-primary">
              <span v-if="loading.workout" class="btn-spinner" />
              <Play v-else :size="15" stroke-width="1.75" />
              Démarrer le cardio
            </button>
          </div>

          <!-- STRENGTH exercises preview -->
          <div v-else-if="selectedPlan.template.exercises?.length" class="session-card-body">
            <div class="exercise-preview-grid">
              <template v-for="item in enrichedExercises" :key="item.isSep ? 'sep-' + item.label : item.name + item.num">
                <div v-if="item.isSep" class="exercise-section-sep">{{ item.label }}</div>
                <div v-else class="exercise-item" :class="{ 'exercise-item--editing': editingTemplate, 'exercise-item--new': getOverloadStatus(getExerciseDbId(item.name), item.repsRange)?.status === 'start' }">
                  <div class="exercise-item-main">
                    <div class="exercise-item-info">
                      <p class="exercise-item-name">{{ item.name }}</p>
                      <p v-if="item.note && !editingTemplate" class="exercise-item-note">{{ item.note }}</p>
                      <p v-if="!editingTemplate && getSetup(getExerciseDbId(item.name))" class="exercise-item-setup">
                        <SlidersHorizontal :size="9" stroke-width="1.75" />
                        {{ getSetup(getExerciseDbId(item.name)) }}
                      </p>
                    </div>
                  </div>

                  <div class="exercise-item-right">
                    <template v-if="editingTemplate">
                      <div class="edit-fields">
                        <input type="number" :value="item.sets"
                          @change="updateTemplateField(selectedPlan.session, item.num-1, 'sets', $event.target.value)"
                          class="edit-input edit-input--sm" />
                        <span class="edit-sep">×</span>
                        <input type="text" :value="item.repsRange"
                          @change="updateTemplateField(selectedPlan.session, item.num-1, 'repsRange', $event.target.value)"
                          class="edit-input" />
                        <input type="number" :value="item.targetWeight"
                          @change="updateExerciseWeight(selectedPlan.session, item.num-1, Number($event.target.value))"
                          class="edit-input edit-input--accent" placeholder="kg" />
                      </div>
                    </template>
                    <template v-else>
                      <span class="sets-badge">{{ item.sets }} × {{ item.repsRange }}</span>
                      <span class="weight-badge">{{ item.targetWeight > 0 ? `${item.targetWeight}kg` : 'PDC' }}</span>
                      <span v-if="item.restTime" class="rest-badge">{{ item.restTime }}</span>
                    </template>
                  </div>

                  <!-- Overload row -->
                  <div v-if="!editingTemplate && getExerciseDbId(item.name)" class="overload-row">
                    <span class="overload-last">
                      {{ getOverloadStatus(getExerciseDbId(item.name), item.repsRange)?.lastPerf || '—' }}
                    </span>
                    <div v-if="getOverloadStatus(getExerciseDbId(item.name), item.repsRange) && getOverloadStatus(getExerciseDbId(item.name), item.repsRange).status !== 'start'" class="overload-badge"
                      :class="`overload-badge--${getOverloadStatus(getExerciseDbId(item.name), item.repsRange).status.toLowerCase()}`">
                      <span class="overload-dot" />
                      {{ getOverloadStatus(getExerciseDbId(item.name), item.repsRange).label }}
                      <span v-if="getOverloadStatus(getExerciseDbId(item.name), item.repsRange).detail" class="overload-detail">
                        · {{ getOverloadStatus(getExerciseDbId(item.name), item.repsRange).detail }}
                      </span>
                    </div>
                  </div>
                </div>
              </template>
            </div>

            <button v-if="isSelectedToday && !currentWorkout" @click="startFromTemplate" :disabled="loading.workout" class="btn-primary btn-primary--lg">
              <span v-if="loading.workout" class="btn-spinner" />
              <Play v-else :size="15" stroke-width="1.75" />
              Démarrer la séance
            </button>

            <div v-if="isSelectedToday && currentWorkout" class="status-active">
              <div class="status-active-dot" />
              <p>Séance active — saisissez vos performances ci-dessous</p>
            </div>
          </div>

          <!-- Rest day -->
          <div v-else class="rest-state">
            <div class="rest-state-icon"><Trophy :size="32" stroke-width="1.25" /></div>
            <p class="rest-state-title">Récupération</p>
            <p class="rest-state-sub">Votre corps se reconstruit. Hydratez-vous bien.</p>
          </div>
        </div>

        <!-- ── Volume stats ── -->
        <div v-if="hasStats" class="volume-row animate-fade-in">
          <div v-for="(vol, group) in volumeLoadByMuscleGroup" :key="group" class="volume-chip">
            <span class="volume-chip-label">{{ group }}</span>
            <span class="volume-chip-value">{{ vol }}<span class="volume-chip-unit">kg</span></span>
          </div>
        </div>

        <!-- ── Free-form start ── -->
        <div v-if="!currentWorkout && (!todayPlan || isRestDay)" class="free-start">
          <button @click="startWorkout" :disabled="loading.workout" class="free-start-btn">
            <div class="free-start-icon">
              <Flame :size="28" stroke-width="1.5" />
            </div>
            <p class="free-start-title">Séance libre</p>
            <p class="free-start-sub">Aucun programme prévu aujourd'hui</p>
          </button>
        </div>

        <!-- ── Active workout ── -->
        <div v-if="currentWorkout" class="active-workout">

          <!-- Sticky volume -->
          <div class="volume-sticky">
            <div class="volume-sticky-left">
              <div class="volume-sticky-icon"><Activity :size="16" stroke-width="1.75" /></div>
              <div>
                <p class="volume-sticky-eyebrow">Volume total</p>
                <p class="volume-sticky-value">{{ Object.values(volumeLoadByMuscleGroup).reduce((a, b) => a + b, 0) }}<span class="volume-sticky-unit">kg</span></p>
              </div>
            </div>
            <span class="session-live-badge">En cours</span>
          </div>

          <!-- Exercise blocks -->
          <div v-for="(block, bIndex) in workoutBlocks" :key="bIndex" class="exercise-block">

            <!-- Block header -->
            <div class="block-head">
              <div class="block-select-wrap">
                <select v-model="block.exercise_id" class="block-select" @change="onExerciseSelect(block)">
                  <option value="" disabled>Choisir un exercice…</option>
                  <option v-for="ex in exercises" :key="ex.id" :value="ex.id">{{ ex.name }}</option>
                </select>
                <ChevronRight :size="14" stroke-width="1.75" class="block-select-chevron" />
              </div>
              <button @click="removeBlock(bIndex)" class="icon-btn icon-btn--danger">
                <Trash2 :size="15" stroke-width="1.75" />
              </button>
            </div>

            <!-- Setup row -->
            <div v-if="block.exercise_id" class="setup-row">
              <SlidersHorizontal :size="11" stroke-width="1.75" class="setup-row-icon" />
              <template v-if="editingSetupId === block.exercise_id">
                <input
                  :value="getSetup(block.exercise_id)"
                  @blur="e => { saveSetup(block.exercise_id, e.target.value); editingSetupId = null }"
                  @keydown.enter="e => { saveSetup(block.exercise_id, e.target.value); editingSetupId = null }"
                  @keydown.escape="editingSetupId = null"
                  type="text"
                  placeholder="Siège 5 · Guide pos. 2 · Prise large…"
                  class="setup-input"
                  autofocus
                />
              </template>
              <template v-else>
                <button @click="editingSetupId = block.exercise_id" class="setup-display" :class="{ 'setup-display--set': getSetup(block.exercise_id) }">
                  {{ getSetup(block.exercise_id) || 'Ajouter un setup machine…' }}
                </button>
              </template>
            </div>

            <div v-if="block.exercise_id" class="block-body">

              <!-- Previous performance + overload -->
              <div v-if="getLastSession(block.exercise_id) || getTemplateExercise(block.exercise_id)"
                class="prev-perf"
                :class="`prev-perf--${(getOverloadStatus(block.exercise_id, getTemplateExercise(block.exercise_id)?.repsRange)?.status || 'start').toLowerCase()}`">
                <div class="prev-perf-left">
                  <p class="prev-perf-eyebrow">Séance précédente</p>
                  <p v-if="getLastSession(block.exercise_id)" class="prev-perf-sets">
                    {{ getLastSession(block.exercise_id).sets.map(s => `${s.weight > 0 ? s.weight + 'kg' : 'PDC'} × ${s.reps}`).join(' · ') }}
                  </p>
                  <p v-else class="prev-perf-empty">Première séance</p>
                </div>
                <div v-if="getOverloadStatus(block.exercise_id, getTemplateExercise(block.exercise_id)?.repsRange)" class="prev-perf-right">
                  <div class="overload-badge"
                    :class="`overload-badge--${getOverloadStatus(block.exercise_id, getTemplateExercise(block.exercise_id)?.repsRange).status.toLowerCase()}`">
                    <span class="overload-dot" />
                    {{ getOverloadStatus(block.exercise_id, getTemplateExercise(block.exercise_id)?.repsRange).label }}
                  </div>
                  <span v-if="getOverloadStatus(block.exercise_id, getTemplateExercise(block.exercise_id)?.repsRange).detail" class="overload-detail-sm">
                    {{ getOverloadStatus(block.exercise_id, getTemplateExercise(block.exercise_id)?.repsRange).detail }}
                  </span>
                </div>
              </div>

              <!-- Set headers -->
              <div class="sets-header">
                <div class="sets-header-cell">Set</div>
                <div class="sets-header-cell">Poids</div>
                <div class="sets-header-cell">Reps</div>
                <div class="sets-header-cell">RPE</div>
                <div />
              </div>

              <!-- Sets -->
              <transition-group name="set-list" tag="div" class="sets-list">
                <div v-for="(set, sIndex) in block.sets" :key="sIndex" class="set-row">
                  <div class="set-num">{{ sIndex + 1 }}</div>
                  <input v-model.number="set.weight" @blur="saveSet(set, block.exercise_id)"
                    type="number" class="set-input" placeholder="—" />
                  <input v-model.number="set.reps" @blur="saveSet(set, block.exercise_id)"
                    type="number" class="set-input" placeholder="—" />
                  <input v-model.number="set.rpe" @blur="saveSet(set, block.exercise_id)"
                    type="number" class="set-input set-input--rpe" placeholder="—" />
                  <button @click="removeSet(block, sIndex)" class="set-remove">
                    <X :size="14" stroke-width="1.75" />
                  </button>
                </div>
              </transition-group>

              <button @click="addSet(block)" class="add-set-btn">
                <Plus :size="14" stroke-width="1.75" /> Série
              </button>

              <div v-if="getLiveCompletion(block)" class="completion-hint">
                <CheckCircle2 :size="13" stroke-width="1.75" style="color:var(--status-success);flex-shrink:0" />
                <p>{{ getLiveCompletion(block).text }}</p>
              </div>
            </div>
          </div>

          <button @click="addBlock" class="add-block-btn">
            <Plus :size="18" stroke-width="1.75" />
            Exercice
          </button>

          <button v-if="hasSavedSets && !sessionFinished" @click="sessionFinished = true" class="btn-finish">
            <CheckCircle2 :size="16" stroke-width="1.75" />
            Terminer la séance
          </button>
        </div>
      </template>
    </div>

  <!-- ── Session summary sheet ── -->
  <Transition name="summary">
    <div
      v-if="sessionFinished"
      class="session-summary"
      @touchstart.passive="onSummaryTouchStart"
      @touchend.passive="onSummaryTouchEnd"
    >
      <div class="summary-handle" />
      <p class="summary-eyebrow">Séance terminée</p>

      <div class="summary-stats">
        <div class="summary-stat">
          <p class="summary-stat-val">{{ sessionTotalVolume.toLocaleString('fr-FR') }}<span class="summary-stat-unit">kg</span></p>
          <p class="summary-stat-label">Volume</p>
        </div>
        <div class="summary-stat">
          <p class="summary-stat-val">{{ completedExerciseCount }}</p>
          <p class="summary-stat-label">Exercices</p>
        </div>
        <div class="summary-stat">
          <p class="summary-stat-val">{{ savedSetCount }}</p>
          <p class="summary-stat-label">Séries</p>
        </div>
      </div>

      <div v-if="prsBeaten.length" class="summary-prs">
        <p class="summary-prs-label">
          <Trophy :size="12" stroke-width="1.75" />
          À augmenter la prochaine fois
        </p>
        <div v-for="name in prsBeaten" :key="name" class="summary-pr-item">
          {{ name }}
        </div>
      </div>

      <button @click="sessionFinished = false" class="btn-primary summary-ok">
        OK
      </button>
    </div>
  </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'
import { useWorkoutStats } from '@/composables/useWorkoutStats'
import { useWorkoutPrograms } from '@/composables/useWorkoutPrograms'
import { useProgressiveOverload } from '@/composables/useProgressiveOverload'
import { useExerciseSetup } from '@/composables/useExerciseSetup'
import {
  Dumbbell, Plus, Trash2, Play, Activity, ChevronRight,
  CheckCircle2, X, Pencil, Save, Trophy, Target, Flame,
  Moon, Heart, Layout as LayoutIcon, SlidersHorizontal
} from 'lucide-vue-next'

const showModals = ref(false)
watch(showModals, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

const { user } = useAuth()
const {
  planningMode,
  selectedDayIndex,
  todayDayIndex,
  weekOverview,
  selectedPlan,
  isSelectedToday,
  isRestDay,
  templates,
  updateExerciseWeight,
  generateBlocks
} = useWorkoutPrograms()

const editingTemplate = ref(false)

const { exerciseHistory, fetchHistoryForExercises, getLastSession, getOverloadStatus } = useProgressiveOverload()
const { getSetup, saveSetup } = useExerciseSetup()
const editingSetupId = ref(null)

const fetchHistoryForPlan = async (plan) => {
  if (!plan?.template?.exercises?.length || !exercises.value.length) return
  const uid = user.value?.id
  if (!uid) return
  const ids = plan.template.exercises
    .map(tplEx => exercises.value.find(e => e.name.toLowerCase() === tplEx.name.toLowerCase())?.id)
    .filter(Boolean)
  if (ids.length) await fetchHistoryForExercises(uid, ids)
}

const getExerciseDbId = (name) =>
  exercises.value.find(e => e.name.toLowerCase() === name.toLowerCase())?.id || null

const getTemplateExercise = (exerciseId) => {
  if (!exerciseId || !selectedPlan.value?.template?.exercises) return null
  const name = exercises.value.find(e => e.id === exerciseId)?.name
  if (!name) return null
  return selectedPlan.value.template.exercises.find(
    ex => ex.name.toLowerCase() === name.toLowerCase()
  ) || null
}

const getLiveCompletion = (block) => {
  const tplEx = getTemplateExercise(block.exercise_id)
  if (!tplEx) return null
  const done = block.sets.filter(s => s.reps > 0)
  if (!done.length) return null
  const nums = tplEx.repsRange.replace(/[^0-9-]/g, '').split('-').map(Number).filter(Boolean)
  const maxReps = nums[nums.length - 1]
  if (!maxReps) return null
  if (done.length >= tplEx.sets && done.every(s => s.reps >= maxReps)) {
    return { ready: true, text: `${done.length}×${maxReps} ✓ — Augmente de 2.5kg la prochaine fois` }
  }
  return null
}

const enrichedExercises = computed(() => {
  const exs = selectedPlan.value?.template?.exercises
  if (!exs?.length) return []
  const result = []
  let lastSection = null
  let num = 0
  exs.forEach(ex => {
    if (ex.section && ex.section !== lastSection) {
      result.push({ isSep: true, label: ex.section })
      lastSection = ex.section
    }
    num++
    result.push({ ...ex, isSep: false, num })
  })
  return result
})

const isCardioSession = computed(() => !!selectedPlan.value?.template?.isCardio)

const CARDIO_LOG_KEY = 'omnidash_cardio_log'
const cardioLog = ref({ activity: '', duration: null, avgHR: null, zone: '2' })
const cardioSaved = ref(false)

const loadCardioLog = () => {
  const todayStr = new Date().toISOString().split('T')[0]
  try {
    const raw = localStorage.getItem(CARDIO_LOG_KEY)
    if (raw) {
      const log = JSON.parse(raw)
      if (log.date === todayStr) {
        cardioLog.value = { activity: log.activity, duration: log.duration, avgHR: log.avgHR, zone: log.zone || '2' }
        cardioSaved.value = true
      }
    }
  } catch (e) {}
}

const startCardio = async () => {
  loading.value.workout = true
  const { data } = await supabase.from('workouts').insert({
    date: new Date().toISOString(),
    user_id: user.value.id
  }).select()
  if (data) currentWorkout.value = data[0]
  loading.value.workout = false
}

const saveCardioLog = async () => {
  const todayStr = new Date().toISOString().split('T')[0]
  const localPayload = JSON.stringify({ ...cardioLog.value, date: todayStr })

  cardioSaved.value = true // optimistic — UI responds immediately

  try {
    const { error } = await supabase.from('cardio_sessions').insert({
      user_id: user.value.id,
      date: todayStr,
      activity: cardioLog.value.activity,
      duration_minutes: cardioLog.value.duration ?? null,
      avg_hr: cardioLog.value.avgHR ?? null,
      zone: cardioLog.value.zone ?? null
    })
    if (error) throw error
    // Keep localStorage in sync so loadCardioLog can restore state after refresh
    localStorage.setItem(CARDIO_LOG_KEY, localPayload)
  } catch (e) {
    console.error('[cardio] Supabase insert failed, falling back to localStorage:', e)
    localStorage.setItem(CARDIO_LOG_KEY, localPayload)
  }
}

const updateTemplateField = (sessionKey, exerciseIndex, field, value) => {
  if (templates.value[sessionKey]?.exercises[exerciseIndex]) {
    if (field === 'sets') templates.value[sessionKey].exercises[exerciseIndex].sets = Number(value) || 1
    else if (field === 'repsRange') templates.value[sessionKey].exercises[exerciseIndex].repsRange = value
  }
}

const activeTab = ref('workout')
const loading = ref({ data: true, workout: false, exercises: false })
const muscleGroups = ref([])
const exercises = ref([])
const currentWorkout = ref(null)
const workoutBlocks = ref([])

const newMuscleGroup = ref('')
const newExercise = ref({ name: '', muscle_group_id: '' })

const flatSets = computed(() => {
  const result = []
  workoutBlocks.value.forEach(b => {
    if (!b.exercise_id) return
    b.sets.forEach(s => {
      if (s.weight > 0 && s.reps > 0) result.push({ exercise_id: b.exercise_id, weight: s.weight, reps: s.reps })
    })
  })
  return result
})

const { volumeLoadByMuscleGroup } = useWorkoutStats(flatSets, exercises, muscleGroups)
const hasStats = computed(() => Object.keys(volumeLoadByMuscleGroup.value).length > 0)

const sessionFinished = ref(false)

const hasSavedSets = computed(() =>
  workoutBlocks.value.some(b => b.exercise_id && b.sets.some(s => s.weight != null && s.reps != null))
)

const sessionTotalVolume = computed(() =>
  workoutBlocks.value.reduce((total, b) => {
    if (!b.exercise_id) return total
    return total + b.sets.reduce((s, set) => (set.weight > 0 && set.reps > 0 ? s + set.weight * set.reps : s), 0)
  }, 0)
)

const completedExerciseCount = computed(() =>
  workoutBlocks.value.filter(b => b.exercise_id && b.sets.some(s => s.weight != null && s.reps != null)).length
)

const savedSetCount = computed(() =>
  workoutBlocks.value.flatMap(b => b.sets.filter(s => s.weight != null && s.reps != null)).length
)

const prsBeaten = computed(() =>
  workoutBlocks.value
    .filter(b => b.exercise_id && b.sets.some(s => s.weight != null && s.reps != null))
    .map(b => {
      const tplEx = getTemplateExercise(b.exercise_id)
      const status = getOverloadStatus(b.exercise_id, tplEx?.repsRange)
      if (status?.status !== 'INCREASE') return null
      return exercises.value.find(e => e.id === b.exercise_id)?.name ?? null
    })
    .filter(Boolean)
)

let _touchStartY = 0
const onSummaryTouchStart = (e) => { _touchStartY = e.touches[0].clientY }
const onSummaryTouchEnd = (e) => {
  if (e.changedTouches[0].clientY - _touchStartY > 60) sessionFinished.value = false
}

const lastSleepScore = ref(null)

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id || user.value?.id
  if (userId) await loadData(userId)
  if (isCardioSession.value) loadCardioLog()

  if (userId) {
    const { data: sleepData } = await supabase
      .from('sleep_records')
      .select('score')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .single()
    if (sleepData) lastSleepScore.value = sleepData.score
  }
})

const loadData = async (userId) => {
  loading.value.data = true
  try {
    const [mgResponse, exResponse] = await Promise.all([
      supabase.from('muscle_groups').select('*'),
      supabase.from('exercises').select('*')
    ])
    if (mgResponse.data) muscleGroups.value = mgResponse.data
    if (exResponse.data) exercises.value = exResponse.data

    const todayStr = new Date().toISOString().split('T')[0]
    const { data: w } = await supabase.from('workouts')
      .select('*').eq('user_id', userId)
      .gte('date', todayStr + 'T00:00:00.000Z')
      .lte('date', todayStr + 'T23:59:59.999Z')
      .limit(1).single()

    if (w) {
      currentWorkout.value = w
      const { data: sets } = await supabase.from('workout_sets')
        .select('*').eq('workout_id', w.id).order('id', { ascending: true })

      if (sets && sets.length > 0) {
        const blocksMap = new Map()
        sets.forEach(set => {
          if (!blocksMap.has(set.exercise_id))
            blocksMap.set(set.exercise_id, { exercise_id: set.exercise_id, sets: [] })
          blocksMap.get(set.exercise_id).sets.push({ id: set.id, weight: set.weight, reps: set.reps, rpe: set.rpe })
        })
        workoutBlocks.value = Array.from(blocksMap.values())
      } else if (selectedPlan.value?.template?.exercises?.length) {
        workoutBlocks.value = selectedPlan.value.template.exercises.map(tplEx => {
          const dbEx = exercises.value.find(e => e.name.trim().toLowerCase() === tplEx.name.trim().toLowerCase())
          if (!dbEx) return null
          const defaultReps = parseInt(tplEx.repsRange.split('-')[0]) || 10
          const lastSession = getLastSession(dbEx.id)
          const lastWeight = lastSession?.sets?.[0]?.weight ?? tplEx.targetWeight
          return { exercise_id: dbEx.id, sets: Array.from({ length: tplEx.sets }, () => ({ weight: lastWeight, reps: defaultReps, rpe: null })) }
        }).filter(Boolean)
      }
    }
  } catch (err) {
    console.error('Error loading workout data:', err)
  } finally {
    loading.value.data = false
  }
  await fetchHistoryForPlan(selectedPlan.value)
}

watch(selectedDayIndex, () => fetchHistoryForPlan(selectedPlan.value))

const startFromTemplate = async () => {
  if (!selectedPlan.value || isRestDay.value || !isSelectedToday.value) return
  loading.value.workout = true
  try {
    const { data, error } = await supabase.from('workouts').insert({ date: new Date().toISOString(), user_id: user.value.id }).select()
    if (error) throw error
    if (!data?.length) return
    currentWorkout.value = data[0]
    const template = selectedPlan.value.template
    workoutBlocks.value = template.exercises.map(tplEx => {
      const dbEx = exercises.value.find(e => e.name.trim().toLowerCase() === tplEx.name.trim().toLowerCase())
      if (!dbEx) return null
      const lastSession = getLastSession(dbEx.id)
      const lastWeight = lastSession?.sets?.[0]?.weight ?? tplEx.targetWeight
      const defaultReps = parseInt(tplEx.repsRange.split('-')[0]) || 10
      return { exercise_id: dbEx.id, sets: Array.from({ length: tplEx.sets }, () => ({ weight: lastWeight, reps: defaultReps, rpe: null })) }
    }).filter(Boolean)
  } catch (e) {
    console.error('Error starting template workout:', e)
  } finally {
    loading.value.workout = false
  }
}

const handleAddMuscleGroup = async () => {
  if (!newMuscleGroup.value.trim()) return
  const { data } = await supabase.from('muscle_groups').insert({ name: newMuscleGroup.value.trim(), category: 'Custom' }).select()
  if (data) { muscleGroups.value.push(data[0]); newMuscleGroup.value = '' }
}

const addExercise = async () => {
  loading.value.exercises = true
  const { data } = await supabase.from('exercises').insert({ name: newExercise.value.name, muscle_group_id: newExercise.value.muscle_group_id, type: 'custom' }).select()
  if (data) { exercises.value.push(data[0]); newExercise.value = { name: '', muscle_group_id: '' }; activeTab.value = 'workout' }
  loading.value.exercises = false
}

const startWorkout = async () => {
  loading.value.workout = true
  const { data } = await supabase.from('workouts').insert({ date: new Date().toISOString(), user_id: user.value.id }).select()
  if (data) currentWorkout.value = data[0]
  loading.value.workout = false
}

const addBlock = () => workoutBlocks.value.push({ exercise_id: '', sets: [{ weight: null, reps: null, rpe: null }] })

const onExerciseSelect = async (block) => {
  if (!block.exercise_id) return
  await fetchHistoryForExercises(user.value.id, [block.exercise_id])
  const lastSession = getLastSession(block.exercise_id)
  if (!lastSession?.sets?.length) return
  const lastSet = lastSession.sets.at(-1)
  const firstSet = block.sets[0]
  if (firstSet && firstSet.weight == null && firstSet.reps == null) {
    firstSet.weight = lastSet.weight ?? null
    firstSet.reps = lastSet.reps ?? null
    firstSet.rpe = lastSet.rpe ?? null
  }
}

const addSet = (block) => {
  const last = block.sets[block.sets.length - 1]
  block.sets.push({ weight: last?.weight ?? null, reps: last?.reps ?? null, rpe: last?.rpe ?? null })
}

const saveSet = async (set, exercise_id) => {
  if (!exercise_id || set.weight == null || !set.reps) return
  try {
    if (set.id) {
      await supabase.from('workout_sets').update({ weight: set.weight, reps: set.reps, rpe: set.rpe || null }).eq('id', set.id)
    } else {
      const { data } = await supabase.from('workout_sets').insert({ workout_id: currentWorkout.value.id, exercise_id, weight: set.weight, reps: set.reps, rpe: set.rpe || null, user_id: user.value.id }).select()
      if (data?.length > 0) set.id = data[0].id
    }
  } catch(e) { console.error('Save set error:', e) }
}

const removeBlock = async (bIndex) => {
  const block = workoutBlocks.value[bIndex]
  const setIds = block.sets.filter(s => s.id).map(s => s.id)
  if (setIds.length > 0) await supabase.from('workout_sets').delete().in('id', setIds)
  workoutBlocks.value.splice(bIndex, 1)
}

const removeSet = async (block, sIndex) => {
  const set = block.sets[sIndex]
  if (set.id) await supabase.from('workout_sets').delete().eq('id', set.id)
  block.sets.splice(sIndex, 1)
  if (block.sets.length === 0) block.sets.push({ weight: null, reps: null, rpe: null })
}
</script>

<style scoped>
/* ── Layout ── */
.workout-view {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Module header ── */
.module-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 4px;
}

@media (min-width: 480px) {
  .module-header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.module-header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.module-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color) 20%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color);
  flex-shrink: 0;
}

.module-name {
  font-family: var(--font-serif);
  font-size: var(--text-xl);
  font-weight: 400;
  color: var(--text-primary);
  margin: 0;
}

.module-sub {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  margin-top: 2px;
}

/* ── Tab switcher ── */
.tab-switcher {
  display: flex;
  height: 44px;
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 3px;
  gap: 2px;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 100%;
  padding: 0 16px;
  border-radius: calc(var(--radius-md) - 4px);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 250ms ease-out, background 250ms ease-out;
  white-space: nowrap;
  user-select: none;
}

.tab-btn:hover { color: var(--text-secondary); }

.tab-btn--active {
  background: var(--bg-overlay);
  color: var(--text-primary);
  font-weight: 600;
}

/* ── Tab content ── */
.tab-content { display: flex; flex-direction: column; gap: 12px; }

/* ── Form card ── */
.form-card {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: 28px 24px;
}

.form-card-title {
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  font-weight: 400;
  color: var(--text-primary);
  margin-bottom: 24px;
}

.field-stack { display: flex; flex-direction: column; gap: 20px; }
.field-group { display: flex; flex-direction: column; gap: 8px; }
.field-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.field-label {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
}

.field-row { display: flex; gap: 8px; }

.field-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-primary);
  outline: none;
  transition:
    border-color var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out);
}

.field-input::placeholder { color: var(--text-disabled); }

.field-input:focus {
  border-color: var(--accent-border);
  box-shadow: 0 0 0 3px var(--accent-dim);
}

.field-select { appearance: none; cursor: pointer; }

.select-wrap { position: relative; }

.select-chevron {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%) rotate(90deg);
  color: var(--text-muted);
  pointer-events: none;
}

.form-divider {
  height: 1px;
  background: var(--border-subtle);
  margin: 8px 0;
}

/* ── Buttons ── */
.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 48px;
  padding: 0 20px;
  background: var(--accent);
  color: var(--bg-base);
  border: none;
  border-radius: 14px;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: opacity 150ms ease, transform 150ms ease;
}

.btn-primary:hover:not(:disabled) { opacity: 0.9; }
.btn-primary:active:not(:disabled) { transform: scale(0.98); opacity: 0.85; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-primary--lg {
  width: calc(100% - 32px);
  height: 52px;
  margin: 4px auto 0;
  display: flex;
  font-size: var(--text-md);
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0,0,0,0.15);
  border-top-color: var(--bg-base);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin { to { transform: rotate(360deg); } }

.icon-btn {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-subtle);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition:
    color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}

.icon-btn:hover { color: var(--text-secondary); }
.icon-btn--active { color: var(--status-success); border-color: var(--status-success-dim); }
.icon-btn--danger:hover { color: var(--status-error); border-color: var(--status-error-dim); }

/* ── Skeletons ── */
.skeleton-block { display: flex; flex-direction: column; gap: 12px; }

.week-skeleton { display: flex; gap: 6px; }

@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

.skeleton {
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, var(--bg-overlay) 25%, var(--bg-muted) 50%, var(--bg-overlay) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}

.skeleton--day { flex: 1; height: 80px; border-radius: var(--radius-md); }
.skeleton--card { height: 280px; border-radius: var(--radius-xl); }

/* ── Week nav ── */
.week-nav {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: 6px;
}

.week-nav-scroll {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}

.day-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 2px;
  min-height: 44px;
  border-radius: var(--radius-md);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  transition: background 250ms ease-out, color 250ms ease-out;
}

.day-btn:hover { background: var(--bg-subtle); color: var(--text-secondary); }

.day-btn--active {
  background: var(--accent-dim);
  color: var(--accent);
  border: 1px solid var(--accent-border);
}

.day-btn-label {
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.day-btn-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}

.today-pip { display: none; }

/* ── Session card ── */
.session-card {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.session-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  border-bottom: 1px solid var(--border-subtle);
}

.session-meta { flex: 1; min-width: 0; }

.session-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }

.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.badge--dark {
  background: var(--bg-muted);
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
}

.badge--accent {
  background: var(--accent-dim);
  color: var(--accent);
  border: 1px solid var(--accent-border);
}

.session-title {
  font-family: var(--font-serif);
  font-size: var(--text-2xl);
  font-weight: 400;
  color: var(--text-primary);
  margin-bottom: 6px;
  line-height: 1.1;
}

.session-desc {
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: 1.4;
}

.session-card-body { padding: 20px 24px 24px; }

/* ── Cardio options ── */
.cardio-options { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }

.cardio-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

.cardio-option-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  background: var(--module-nutri-dim);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cardio-option-name { font-size: var(--text-sm); color: var(--text-secondary); font-weight: 500; }
.cardio-option-dur  { font-size: var(--text-xs); color: var(--module-nutri); margin-top: 2px; }
.cardio-option-note { font-size: 10px; color: var(--text-muted); margin-top: 2px; }

.cardio-form { display: flex; flex-direction: column; gap: 16px; margin-top: 16px; }

/* ── Status states ── */
.status-done {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: var(--status-success-dim);
  border: 1px solid rgba(106, 170, 126, 0.15);
  border-radius: var(--radius-md);
}

.status-done-title { font-size: var(--text-sm); color: var(--status-success); font-weight: 500; }
.status-done-sub   { font-size: 11px; color: var(--text-muted); margin-top: 1px; }

.status-active {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--accent-dim);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--accent);
}

.status-active-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 2s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

/* ── Exercise preview ── */
.exercise-preview-grid { display: flex; flex-direction: column; margin-bottom: 20px; }

.exercise-section-sep {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  padding: 14px 0 6px;
}

.exercise-item {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  padding: 14px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.exercise-item:last-child { border-bottom: none; }

.exercise-item--editing {
  background: var(--accent-dim);
  border-color: var(--accent-border);
  border-radius: var(--radius-sm);
  padding: 12px;
  margin-bottom: 4px;
}

.exercise-item-main {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}


.exercise-item-info { flex: 1; min-width: 0; }

.exercise-item-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.4;
}

.exercise-item-note {
  font-size: 13px;
  color: var(--text-muted);
  font-style: italic;
  opacity: 0.45;
  margin-top: 2px;
  line-height: 1.4;
}

.exercise-item--new .exercise-item-name {
  opacity: 0.55;
  font-style: italic;
}

.exercise-item-setup {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--accent);
  margin-top: 4px;
  opacity: 0.7;
}

.exercise-item-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.sets-badge, .weight-badge, .rest-badge {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.sets-badge {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: var(--text-secondary);
}

.weight-badge {
  background: rgba(212, 151, 106, 0.15);
  border: 1px solid rgba(212, 151, 106, 0.40);
  color: var(--accent);
}

.rest-badge {
  color: var(--text-muted);
  opacity: 0.4;
  border: none;
}

.edit-fields { display: flex; align-items: center; gap: 4px; }

.edit-input {
  width: 44px;
  padding: 6px 8px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  text-align: center;
  font-size: var(--text-xs);
  color: var(--text-primary);
  outline: none;
  font-family: var(--font-sans);
}

.edit-input:focus { border-color: var(--accent-border); }
.edit-input--sm   { width: 36px; }
.edit-input--accent { background: var(--accent); color: var(--bg-base); border-color: transparent; width: 52px; }

.edit-sep { font-size: 10px; color: var(--text-muted); }

/* ── Overload badges ── */
.overload-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-subtle);
}

.overload-last { font-size: 11px; color: var(--text-muted); }

.overload-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: var(--radius-pill);
  font-size: 10px;
  font-weight: 500;
}

.overload-badge--increase   { background: rgba(106,170,126,0.12); color: #6AAA7E; }
.overload-badge--progress   { background: rgba(201,160,76,0.12);  color: #C9A04C; }
.overload-badge--consolidate{ background: rgba(176,90,90,0.12);   color: #B05A5A; }
.overload-badge--start      { background: var(--bg-muted);        color: var(--text-muted); }

.overload-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

.overload-detail    { font-size: 10px; opacity: 0.7; }
.overload-detail-sm { font-size: 10px; color: var(--text-muted); margin-top: 4px; display: block; text-align: right; }

/* ── Rest state ── */
.rest-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
  gap: 10px;
}

.rest-state-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-disabled);
  margin-bottom: 8px;
}

.rest-state-title {
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  color: var(--text-primary);
}

.rest-state-sub { font-size: var(--text-sm); color: var(--text-muted); max-width: 240px; line-height: 1.5; }

/* ── Volume row ── */
.volume-row { display: flex; flex-wrap: wrap; gap: 6px; }

.volume-chip {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 14px;
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  min-width: 80px;
}

.volume-chip-label { font-size: 9px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); }
.volume-chip-value { font-size: var(--text-lg); font-weight: 300; color: var(--text-primary); line-height: 1; }
.volume-chip-unit  { font-size: 11px; color: var(--text-muted); margin-left: 2px; }

/* ── Free start ── */
.free-start { padding: 4px 0; }

.free-start-btn {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 24px;
  background: var(--bg-raised);
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-xl);
  cursor: pointer;
  text-align: center;
  transition:
    border-color var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out);
}

.free-start-btn:hover {
  border-color: var(--accent-border);
  background: var(--accent-dim);
}

.free-start-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: color var(--dur-fast) var(--ease-out);
}

.free-start-btn:hover .free-start-icon { color: var(--accent); }

.free-start-title { font-family: var(--font-serif); font-size: var(--text-lg); color: var(--text-primary); }
.free-start-sub   { font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; }

/* ── Active workout ── */
.active-workout { display: flex; flex-direction: column; gap: 12px; }

.volume-sticky {
  position: sticky;
  top: 8px;
  z-index: var(--z-raised);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: color-mix(in srgb, var(--bg-overlay) 92%, transparent);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.volume-sticky-left { display: flex; align-items: center; gap: 12px; }

.volume-sticky-icon {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  background: var(--accent-dim);
  border: 1px solid var(--accent-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}

.volume-sticky-eyebrow { font-size: 9px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); }
.volume-sticky-value   { font-size: var(--text-lg); color: var(--text-primary); font-weight: 300; line-height: 1; margin-top: 2px; }
.volume-sticky-unit    { font-size: 11px; color: var(--text-muted); }

.session-live-badge {
  padding: 5px 12px;
  background: var(--accent-dim);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-pill);
  font-size: 10px;
  font-weight: 500;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* ── Exercise block ── */
.exercise-block {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.block-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: var(--bg-overlay);
  border-bottom: 1px solid var(--border-subtle);
}

.block-select-wrap { flex: 1; position: relative; }

.block-select {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  font-weight: 400;
  color: var(--text-primary);
  cursor: pointer;
  appearance: none;
  padding-right: 20px;
}

.block-select-chevron {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%) rotate(90deg);
  color: var(--text-muted);
  pointer-events: none;
}

.setup-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border-subtle);
  min-height: 40px;
}

.setup-row-icon { color: var(--text-disabled); flex-shrink: 0; }

.setup-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.setup-input::placeholder { color: var(--text-disabled); }

.setup-display {
  flex: 1;
  text-align: left;
  background: none;
  border: none;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  color: var(--text-disabled);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease-out);
}

.setup-display--set { color: var(--text-muted); }
.setup-display:hover { color: var(--text-secondary); }

.block-body { padding: 20px; }

/* ── Prev performance ── */
.prev-perf {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  border: 1px solid;
}

.prev-perf--increase    { background: rgba(106,170,126,0.06); border-color: rgba(106,170,126,0.15); }
.prev-perf--progress    { background: rgba(201,160,76,0.06);  border-color: rgba(201,160,76,0.15);  }
.prev-perf--consolidate { background: rgba(176,90,90,0.06);   border-color: rgba(176,90,90,0.15);   }
.prev-perf--start       { background: var(--bg-overlay);      border-color: var(--border-subtle);   }

.prev-perf-eyebrow { font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); margin-bottom: 5px; }
.prev-perf-sets    { font-size: var(--text-sm); color: var(--text-secondary); }
.prev-perf-empty   { font-size: var(--text-sm); color: var(--text-disabled); font-style: italic; }

.prev-perf-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }

/* ── Sets ── */
.sets-header {
  display: grid;
  grid-template-columns: 2.5rem 1fr 1fr 1fr 2rem;
  gap: 8px;
  margin-bottom: 8px;
  padding: 0 2px;
}

.sets-header-cell {
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  text-align: center;
}

.sets-list { display: flex; flex-direction: column; gap: 6px; }

.set-row {
  display: grid;
  grid-template-columns: 2.5rem 1fr 1fr 1fr 2rem;
  gap: 8px;
  align-items: center;
}

.set-num {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.set-input {
  height: 44px;
  width: 100%;
  text-align: center;
  background: var(--bg-subtle);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: var(--text-md);
  font-weight: 300;
  color: var(--text-primary);
  outline: none;
  transition:
    border-color var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out);
}

.set-input::placeholder { color: var(--text-disabled); }

.set-input:focus {
  border-color: var(--accent-border);
  box-shadow: 0 0 0 3px var(--accent-dim);
}

.set-input--rpe { color: var(--text-muted); }

.set-remove {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--text-disabled);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: color var(--dur-fast) var(--ease-out);
}

.set-remove:hover { color: var(--status-error); }

.add-set-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  margin-top: 12px;
  padding: 12px;
  background: none;
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  cursor: pointer;
  transition:
    border-color var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}

.add-set-btn:hover { border-color: var(--accent-border); color: var(--accent); }

.completion-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 11px 14px;
  background: var(--status-success-dim);
  border: 1px solid rgba(106,170,126,0.15);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  color: var(--status-success);
}

/* ── Add block button ── */
.add-block-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: calc(100% - 32px);
  height: 52px;
  margin: 0 auto 32px;
  padding: 0 20px;
  background: var(--accent);
  color: var(--bg-base);
  border: none;
  border-radius: 14px;
  font-family: var(--font-sans);
  font-size: var(--text-md);
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: opacity 150ms ease, transform 150ms ease;
}

.add-block-btn:hover  { opacity: 0.9; }
.add-block-btn:active { transform: scale(0.98); opacity: 0.85; }

/* ── Set list transition ── */
.set-list-enter-active {
  transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
}
.set-list-leave-active {
  transition: opacity var(--dur-fast) var(--ease-in), transform var(--dur-fast) var(--ease-in);
}
.set-list-enter-from { opacity: 0; transform: translateX(-10px); }
.set-list-leave-to   { opacity: 0; transform: translateX(-10px); }

/* ── Sleep recovery banner ── */
.sleep-banner {
  font-size: 13px;
  font-style: italic;
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  text-align: center;
  line-height: 1.4;
}

.sleep-banner--low {
  color: color-mix(in srgb, var(--accent) 70%, transparent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.sleep-banner--good {
  color: var(--status-success);
  background: color-mix(in srgb, var(--status-success) 10%, transparent);
  cursor: pointer;
}

/* ── Terminer button ── */
.btn-finish {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: calc(100% - 32px);
  margin: 0 auto 32px;
  height: 52px;
  border-radius: 14px;
  border: 1px solid var(--border-default);
  background: var(--bg-overlay);
  color: var(--text-muted);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
}
.btn-finish:hover {
  background: var(--bg-subtle);
  color: var(--text-primary);
  border-color: var(--border-default);
}

/* ── Session summary sheet ── */
.session-summary {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 300;
  background: var(--bg-raised);
  border-top: 1px solid var(--border-default);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: 12px 24px max(32px, calc(16px + env(safe-area-inset-bottom, 0px)));
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.summary-handle {
  width: 36px;
  height: 4px;
  background: var(--border-subtle);
  border-radius: 2px;
  margin: 0 auto;
}

.summary-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-disabled);
  text-align: center;
}

.summary-stats {
  display: flex;
  justify-content: space-around;
}

.summary-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.summary-stat-val {
  font-family: var(--font-serif);
  font-size: 28px;
  color: var(--text-primary);
  line-height: 1;
}

.summary-stat-unit {
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--text-muted);
  margin-left: 2px;
}

.summary-stat-label {
  font-size: 11px;
  color: var(--text-disabled);
}

.summary-prs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  border-radius: var(--radius-md);
}

.summary-prs-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
}

.summary-pr-item {
  font-size: 14px;
  color: var(--accent);
  font-weight: 500;
  padding-left: 18px;
}

.summary-ok {
  width: 100%;
}

/* ── Summary transition ── */
.summary-enter-active {
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
.summary-leave-active {
  transition: transform 200ms ease-in;
}
.summary-enter-from,
.summary-leave-to {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .summary-enter-active,
  .summary-leave-active {
    transition: none;
  }
}
</style>
