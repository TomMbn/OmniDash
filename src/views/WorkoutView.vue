<template>
  <div class="workout-view">

    <!-- ── En-tête ── -->
    <header class="view-head" :class="{ 'view-head--focus': focusMode }">
      <h1 class="view-title">
        Musculation,{{ ' ' }}<br class="view-break" />
        <span class="view-title-soft">{{ headSubtitle }}</span>
      </h1>
      <div class="segmented" role="tablist" aria-label="Sections">
        <button
          role="tab"
          :aria-selected="activeTab === 'workout'"
          class="segmented-btn"
          :class="{ 'segmented-btn--active': activeTab === 'workout' }"
          @click="activeTab = 'workout'"
        >Séance</button>
        <button
          role="tab"
          :aria-selected="activeTab === 'exercises'"
          class="segmented-btn"
          :class="{ 'segmented-btn--active': activeTab === 'exercises' }"
          @click="activeTab = 'exercises'"
        >Bibliothèque</button>
      </div>
    </header>

    <!-- ═══ BIBLIOTHÈQUE ═══ -->
    <div v-if="activeTab === 'exercises'" class="library">
      <section class="card">
        <h2 class="card-title">Nouveau groupe musculaire</h2>
        <div class="field-row">
          <input
            v-model="newMuscleGroup"
            type="text"
            class="field-input"
            aria-label="Nom du groupe musculaire"
            placeholder="Pectoraux, dos…"
          />
          <button type="button" class="round-btn round-btn--dark" aria-label="Ajouter le groupe" @click="handleAddMuscleGroup">
            <Plus :size="20" stroke-width="2" />
          </button>
        </div>
      </section>

      <form class="card field-stack" @submit.prevent="addExercise">
        <h2 class="card-title">Nouvel exercice</h2>
        <div class="field-group">
          <label class="field-label" for="exercise-name">Nom de l'exercice</label>
          <input
            id="exercise-name"
            v-model="newExercise.name"
            required
            type="text"
            class="field-input"
            placeholder="Développé couché"
          />
        </div>

        <div class="field-group">
          <label class="field-label" for="exercise-group">Groupe musculaire</label>
          <select id="exercise-group" v-model="newExercise.muscle_group_id" required class="field-input">
            <option value="" disabled>Choisis un groupe</option>
            <option v-for="group in muscleGroups" :key="group.id" :value="group.id">{{ group.name }}</option>
          </select>
        </div>

        <button type="submit" :disabled="loading.exercises" class="btn btn--dark btn--wide">
          <span v-if="loading.exercises" class="btn-spinner" />
          {{ loading.exercises ? 'Enregistrement…' : "Ajouter l'exercice" }}
        </button>
      </form>
    </div>

    <!-- ═══ SÉANCE ═══ -->
    <template v-if="activeTab === 'workout'">

      <!-- Squelette -->
      <div v-if="loading.data" class="skeleton-block">
        <div class="skeleton skeleton--week" />
        <div class="skeleton skeleton--banner" />
        <div class="skeleton skeleton--card" />
      </div>

      <!-- ── Séance en cours : un exercice à la fois ── -->
      <div v-else-if="focusMode" class="live">

        <div class="live-bar">
          <p class="live-position">
            {{ selectedPlan?.template?.label || 'Séance libre' }}<template v-if="workoutBlocks.length">, exercice {{ activeBlockIndex + 1 }} sur {{ workoutBlocks.length }}</template>
          </p>
          <button class="link-btn" @click="showPlan = true">Programme</button>
        </div>

        <div v-if="workoutBlocks.length" class="live-progress">
          <button
            v-for="(block, index) in workoutBlocks"
            :key="index"
            class="live-segment"
            :class="{
              'live-segment--done': isBlockDone(block),
              'live-segment--active': index === activeBlockIndex
            }"
            :aria-label="`Exercice ${index + 1}, ${exerciseName(block.exercise_id) || 'à choisir'}`"
            @click="goToBlock(index)"
          />
        </div>

        <div class="live-layout">

          <!-- Liste desktop -->
          <aside class="live-list card" aria-label="Exercices de la séance">
            <h2 class="card-title">Séance</h2>
            <button
              v-for="(block, index) in workoutBlocks"
              :key="index"
              class="live-list-item"
              :class="{ 'live-list-item--active': index === activeBlockIndex }"
              @click="goToBlock(index)"
            >
              <span class="live-list-name">{{ exerciseName(block.exercise_id) || 'Exercice à choisir' }}</span>
              <span class="live-list-count">
                <Check v-if="isBlockDone(block)" :size="16" stroke-width="2.5" class="icon-done" />
                <template v-else>{{ doneSetCount(block) }}/{{ block.sets.length }}</template>
              </span>
            </button>
            <p class="live-volume">Volume {{ sessionTotalVolume.toLocaleString('fr-FR') }} kg</p>
          </aside>

          <div class="live-main">
            <div v-if="!activeBlock" class="card empty-state">
              <p class="empty-title">Aucun exercice pour l'instant</p>
              <button class="btn btn--dark" @click="addBlock">
                <Plus :size="18" stroke-width="2" />
                Ajouter un exercice
              </button>
            </div>

            <template v-else>
              <!-- Exercice -->
              <section class="banner banner--live" aria-label="Exercice en cours">
                <span class="orb orb--a" aria-hidden="true" />
                <span class="orb orb--b" aria-hidden="true" />

                <div class="banner-text">
                  <template v-if="activeBlock.exercise_id">
                    <h2 class="banner-title">{{ exerciseName(activeBlock.exercise_id) }}</h2>
                    <p v-if="activeTemplate" class="banner-meta">
                      {{ activeTemplate.sets }} × {{ activeTemplate.repsRange }}<template v-if="activeTemplate.restTime">, repos {{ activeTemplate.restTime }}</template>
                    </p>
                    <p v-if="lastPerfText" class="banner-meta">{{ lastPerfText }} la dernière fois</p>
                    <span v-if="activeOverloadText" class="chip" :class="{ 'chip--good': activeOverload?.status === 'INCREASE' }">
                      <TrendingUp :size="14" stroke-width="2" />
                      {{ activeOverloadText }}
                    </span>
                  </template>
                  <template v-else>
                    <label class="banner-title" for="block-exercise">Choisis un exercice</label>
                    <select
                      id="block-exercise"
                      v-model="activeBlock.exercise_id"
                      class="field-input"
                      @change="onExerciseSelect(activeBlock)"
                    >
                      <option value="" disabled>Exercice…</option>
                      <option v-for="ex in exercises" :key="ex.id" :value="ex.id">{{ ex.name }}</option>
                    </select>
                  </template>
                </div>
              </section>

              <template v-if="activeBlock.exercise_id">
                <!-- Saisie -->
                <div v-if="activeSet" class="steppers">
                  <div v-for="field in stepperFields" :key="field.key" class="stepper">
                    <label class="stepper-label" :for="`step-${field.key}`">{{ field.label }}</label>
                    <input
                      :id="`step-${field.key}`"
                      v-model.number="activeSet[field.key]"
                      type="number"
                      inputmode="decimal"
                      class="stepper-input"
                      placeholder="0"
                    />
                    <div class="stepper-actions">
                      <button class="stepper-btn" :aria-label="`Moins ${field.step} ${field.unit}`" @click="adjust(field.key, -field.step)">
                        <Minus :size="22" stroke-width="2" />
                      </button>
                      <button class="stepper-btn" :aria-label="`Plus ${field.step} ${field.unit}`" @click="adjust(field.key, field.step)">
                        <Plus :size="22" stroke-width="2" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Séries -->
                <section class="sets card" aria-label="Séries">
                  <div
                    v-for="(set, index) in activeBlock.sets"
                    :key="index"
                    class="set-row"
                    :class="{ 'set-row--active': index === activeSetIndex }"
                  >
                    <button class="set-select" @click="activeSetIndex = index">
                      <span class="set-name">Série {{ index + 1 }}</span>
                      <span class="set-value">{{ setSummary(set, index) }}</span>
                      <Check v-if="set.id" :size="18" stroke-width="2.5" class="icon-done" />
                    </button>
                    <label v-if="index === activeSetIndex" class="set-rpe">
                      <span>RPE</span>
                      <input v-model.number="set.rpe" type="number" inputmode="numeric" class="set-rpe-input" placeholder="0" />
                    </label>
                    <button class="set-remove" :aria-label="`Supprimer la série ${index + 1}`" @click="removeSet(activeBlock, index)">
                      <X :size="16" stroke-width="2" />
                    </button>
                  </div>

                  <button class="link-btn sets-add" @click="addSet(activeBlock)">
                    <Plus :size="16" stroke-width="2" />
                    Ajouter une série
                  </button>
                </section>

                <!-- Réglage machine -->
                <div class="setup-row">
                  <SlidersHorizontal :size="16" stroke-width="1.75" class="setup-icon" />
                  <input
                    v-if="editingSetupId === activeBlock.exercise_id"
                    :value="getSetup(activeBlock.exercise_id)"
                    type="text"
                    class="setup-input"
                    aria-label="Réglage de la machine"
                    placeholder="Siège 5, prise large…"
                    autofocus
                    @blur="e => { saveSetup(activeBlock.exercise_id, e.target.value); editingSetupId = null }"
                    @keydown.enter="e => { saveSetup(activeBlock.exercise_id, e.target.value); editingSetupId = null }"
                    @keydown.escape="editingSetupId = null"
                  />
                  <button v-else class="setup-display" @click="editingSetupId = activeBlock.exercise_id">
                    {{ getSetup(activeBlock.exercise_id) || 'Ajouter un réglage machine' }}
                  </button>
                </div>

                <p v-if="getLiveCompletion(activeBlock)" class="hint">
                  <Check :size="16" stroke-width="2.5" />
                  {{ getLiveCompletion(activeBlock).text }}
                </p>

                <p v-if="saveError" class="error" role="alert">{{ saveError }}</p>
              </template>

              <!-- Suite -->
              <div class="live-next">
                <button class="round-btn" :disabled="activeBlockIndex === 0" aria-label="Exercice précédent" @click="goToBlock(activeBlockIndex - 1)">
                  <ChevronLeft :size="20" stroke-width="2" />
                </button>
                <button
                  class="live-next-label"
                  :disabled="activeBlockIndex >= workoutBlocks.length - 1"
                  @click="goToBlock(activeBlockIndex + 1)"
                >
                  <span class="live-next-caption">Ensuite</span>
                  <span>{{ nextBlockName }}</span>
                </button>
                <button class="round-btn" :disabled="activeBlockIndex >= workoutBlocks.length - 1" aria-label="Exercice suivant" @click="goToBlock(activeBlockIndex + 1)">
                  <ChevronRight :size="20" stroke-width="2" />
                </button>
              </div>
              <!-- Action principale -->
              <div class="live-action">
                <button
                  v-if="activeBlock.exercise_id && activeSet && !activeSet.id"
                  class="btn btn--dark btn--wide btn--tall"
                  :disabled="validating || !canValidate"
                  @click="validateSet"
                >
                  <span v-if="validating" class="btn-spinner" />
                  <Check v-else :size="20" stroke-width="2" />
                  Valider la série {{ activeSetIndex + 1 }}
                </button>
                <button
                  v-else-if="activeBlock.exercise_id && activeSet"
                  class="btn btn--dark btn--wide btn--tall"
                  :disabled="validating"
                  @click="validateSet"
                >
                  Enregistrer la correction
                </button>
              </div>

            </template>

            <div class="live-tools">
              <button class="btn btn--soft" @click="addBlock">
                <Plus :size="18" stroke-width="2" />
                Exercice
              </button>
              <button v-if="activeBlock" class="btn btn--soft btn--danger" @click="removeBlock(activeBlockIndex)">
                <Trash2 :size="18" stroke-width="1.75" />
                Retirer
              </button>
              <button v-if="hasSavedSets" class="btn btn--light" @click="sessionFinished = true">
                Terminer la séance
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Programme ── -->
      <template v-else>
        <div class="week-strip" role="tablist" aria-label="Jours de la semaine">
          <button
            v-for="day in weekOverview"
            :key="day.dayIndex"
            role="tab"
            :aria-selected="day.dayIndex === selectedDayIndex"
            :aria-label="day.label"
            class="day-btn"
            :class="{
              'day-btn--active': day.dayIndex === selectedDayIndex,
              'day-btn--today': day.dayIndex === todayDayIndex
            }"
            @click="selectedDayIndex = day.dayIndex"
          >
            <span>{{ day.label.slice(0, 3) }}</span>
            <component :is="dayIcon(day.session)" :size="18" stroke-width="1.75" />
          </button>
        </div>

        <p v-if="lastSleepScore !== null && lastSleepScore < 60" class="notice notice--low">
          Récupération faible ({{ lastSleepScore }}/100), adapte ton intensité
        </p>
        <p v-else-if="lastSleepScore !== null && lastSleepScore >= 80" class="notice notice--good">
          Bonne récupération ({{ lastSleepScore }}/100)
        </p>

        <div v-if="selectedPlan" class="plan-layout">
          <section class="banner" :aria-label="selectedPlan.template.label">
            <span class="orb orb--a" aria-hidden="true" />
            <span class="orb orb--b" aria-hidden="true" />
            <span class="orb orb--c" aria-hidden="true" />

            <div class="banner-text">
              <div class="chip-row">
                <span class="chip">{{ isSelectedToday ? "Aujourd'hui" : selectedPlan.label }}</span>
                <span v-if="selectedPlan.note" class="chip">{{ selectedPlan.note }}</span>
              </div>
              <h2 class="banner-title">{{ selectedPlan.template.label }}</h2>
              <p class="banner-meta">{{ selectedPlan.template.description }}</p>
            </div>

            <template v-if="isSelectedToday && !isCardioSession && !isRestDay">
              <button v-if="!currentWorkout" class="btn btn--dark" :disabled="loading.workout" @click="startFromTemplate">
                <span v-if="loading.workout" class="btn-spinner" />
                <Play v-else :size="18" stroke-width="2" />
                Démarrer la séance
              </button>
              <button v-else class="btn btn--dark" @click="showPlan = false">
                <Play :size="18" stroke-width="2" />
                Reprendre la séance
              </button>
            </template>

            <button v-else-if="isSelectedToday && isCardioSession && !currentWorkout" class="btn btn--dark" :disabled="loading.workout" @click="startCardio">
              <span v-if="loading.workout" class="btn-spinner" />
              <Play v-else :size="18" stroke-width="2" />
              Démarrer le cardio
            </button>
          </section>

          <!-- Cardio -->
          <section v-if="isCardioSession" class="card plan-body">
            <h3 class="card-title">Au choix</h3>
            <ul class="cardio-list">
              <li v-for="option in selectedPlan.template.cardioOptions" :key="option.name" class="cardio-item">
                <span class="cardio-icon"><Heart :size="18" stroke-width="1.75" /></span>
                <div>
                  <p class="item-name">{{ option.name }}</p>
                  <p class="item-note">{{ option.duration }}<template v-if="option.note">, {{ option.note }}</template></p>
                </div>
              </li>
            </ul>

            <form v-if="isSelectedToday && currentWorkout && !cardioSaved" class="cardio-form" @submit.prevent="saveCardioLog">
              <div class="field-grid">
                <div class="field-group">
                  <label class="field-label" for="cardio-activity">Activité</label>
                  <input id="cardio-activity" v-model="cardioLog.activity" placeholder="Vélo, marche…" class="field-input" />
                </div>
                <div class="field-group">
                  <label class="field-label" for="cardio-duration">Durée (min)</label>
                  <input id="cardio-duration" v-model.number="cardioLog.duration" type="number" inputmode="numeric" placeholder="35" class="field-input" />
                </div>
                <div class="field-group">
                  <label class="field-label" for="cardio-hr">FC moyenne (bpm)</label>
                  <input id="cardio-hr" v-model.number="cardioLog.avgHR" type="number" inputmode="numeric" placeholder="130" class="field-input" />
                </div>
                <div class="field-group">
                  <label class="field-label" for="cardio-zone">Zone</label>
                  <select id="cardio-zone" v-model="cardioLog.zone" class="field-input">
                    <option value="2">Zone 2 (LISS)</option>
                    <option value="3">Zone 3</option>
                    <option value="4">Zone 4</option>
                  </select>
                </div>
              </div>
              <button type="submit" class="btn btn--dark btn--wide">
                <Check :size="18" stroke-width="2" />
                Valider le cardio
              </button>
            </form>

            <p v-else-if="isSelectedToday && currentWorkout && cardioSaved" class="hint">
              <Check :size="16" stroke-width="2.5" />
              Cardio enregistré<template v-if="cardioLog.duration">, {{ cardioLog.activity || 'séance' }}, {{ cardioLog.duration }} min<template v-if="cardioLog.avgHR">, {{ cardioLog.avgHR }} bpm</template></template>
            </p>
          </section>

          <!-- Exercices -->
          <section v-else-if="selectedPlan.template.exercises?.length" class="card plan-body">
            <div class="plan-body-head">
              <h3 class="card-title">{{ selectedPlan.template.exercises.length }} exercices</h3>
              <button class="link-btn" @click="editingTemplate = !editingTemplate">
                {{ editingTemplate ? 'Terminer' : 'Modifier' }}
              </button>
            </div>

            <template v-for="item in enrichedExercises" :key="item.isSep ? 'sep-' + item.label : item.name + item.num">
              <p v-if="item.isSep" class="section-sep">{{ item.label }}</p>
              <div v-else class="exercise-item">
                <div class="exercise-info">
                  <p class="item-name">{{ item.name }}</p>
                  <p v-if="item.note && !editingTemplate" class="item-note">{{ item.note }}</p>
                  <p v-if="!editingTemplate && getSetup(getExerciseDbId(item.name))" class="item-note item-note--setup">
                    <SlidersHorizontal :size="13" stroke-width="1.75" />
                    {{ getSetup(getExerciseDbId(item.name)) }}
                  </p>
                  <p v-if="!editingTemplate && overloadFor(item)?.lastPerf" class="item-note">{{ overloadFor(item).lastPerf }}</p>
                </div>

                <div v-if="editingTemplate" class="edit-fields">
                  <input type="number" :value="item.sets" class="edit-input" aria-label="Séries"
                    @change="updateTemplateField(selectedPlan.session, item.num - 1, 'sets', $event.target.value)" />
                  <span class="edit-sep">×</span>
                  <input type="text" :value="item.repsRange" class="edit-input" aria-label="Répétitions"
                    @change="updateTemplateField(selectedPlan.session, item.num - 1, 'repsRange', $event.target.value)" />
                  <input type="number" :value="item.targetWeight" class="edit-input" aria-label="Charge en kg" placeholder="kg"
                    @change="updateExerciseWeight(selectedPlan.session, item.num - 1, Number($event.target.value))" />
                </div>

                <div v-else class="exercise-side">
                  <span class="exercise-volume">{{ item.sets }} × {{ item.repsRange }}</span>
                  <span class="item-note">
                    {{ item.targetWeight > 0 ? `${item.targetWeight} kg` : 'PDC' }}<template v-if="item.restTime">, {{ item.restTime }}</template>
                  </span>
                  <span v-if="overloadFor(item) && overloadFor(item).status !== 'START'" class="status-tag" :class="`status-tag--${overloadFor(item).status.toLowerCase()}`">
                    {{ overloadText(overloadFor(item)) }}
                  </span>
                </div>
              </div>
            </template>
          </section>

          <!-- Repos -->
          <section v-else class="card empty-state">
            <p class="empty-title">Récupération</p>
            <p class="item-note">Aucune séance prévue ce jour-là.</p>
          </section>
        </div>

        <button v-if="!currentWorkout" class="link-btn free-start" :disabled="loading.workout" @click="startWorkout">
          Démarrer une séance libre
        </button>
      </template>
    </template>

    <!-- ── Bilan de séance ── -->
    <Transition name="summary">
      <div
        v-if="sessionFinished"
        class="summary"
        role="dialog"
        aria-label="Bilan de la séance"
        @touchstart.passive="onSummaryTouchStart"
        @touchend.passive="onSummaryTouchEnd"
      >
        <div class="summary-handle" />
        <h2 class="summary-title">Séance terminée</h2>

        <div class="summary-stats">
          <div>
            <p class="summary-value">{{ sessionTotalVolume.toLocaleString('fr-FR') }}<span class="summary-unit"> kg</span></p>
            <p class="item-note">Volume</p>
          </div>
          <div>
            <p class="summary-value">{{ completedExerciseCount }}</p>
            <p class="item-note">Exercices</p>
          </div>
          <div>
            <p class="summary-value">{{ savedSetCount }}</p>
            <p class="item-note">Séries</p>
          </div>
        </div>

        <div v-if="prsBeaten.length" class="summary-prs">
          <p class="card-title">À augmenter la prochaine fois</p>
          <p v-for="name in prsBeaten" :key="name" class="item-note">{{ name }}</p>
        </div>

        <button class="btn btn--dark btn--wide" @click="sessionFinished = false">Fermer</button>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'
import { useWorkoutStats } from '@/composables/useWorkoutStats'
import { useWorkoutPrograms } from '@/composables/useWorkoutPrograms'
import { useProgressiveOverload } from '@/composables/useProgressiveOverload'
import { useExerciseSetup } from '@/composables/useExerciseSetup'
import { useFocusMode } from '@/composables/useFocusMode'
import {
  Dumbbell, Plus, Minus, Trash2, Play, ChevronLeft, ChevronRight,
  Check, X, Trophy, Moon, Heart, SlidersHorizontal, TrendingUp
} from 'lucide-vue-next'

const showModals = ref(false)
watch(showModals, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

const { user } = useAuth()
const {
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
    return { ready: true, text: `${done.length} × ${maxReps} atteint, augmente de 2,5 kg la prochaine fois` }
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

// Seules les séries validées (avec un id en base) comptent : les autres sont préremplies.
const hasSavedSets = computed(() =>
  workoutBlocks.value.some(b => b.exercise_id && b.sets.some(s => s.id))
)

const sessionTotalVolume = computed(() =>
  workoutBlocks.value.reduce((total, b) => {
    if (!b.exercise_id) return total
    return total + b.sets.reduce((s, set) => (set.id && set.weight > 0 && set.reps > 0 ? s + set.weight * set.reps : s), 0)
  }, 0)
)

const completedExerciseCount = computed(() =>
  workoutBlocks.value.filter(b => b.exercise_id && b.sets.some(s => s.id)).length
)

const savedSetCount = computed(() =>
  workoutBlocks.value.flatMap(b => b.sets.filter(s => s.id)).length
)

const prsBeaten = computed(() =>
  workoutBlocks.value
    .filter(b => b.exercise_id && b.sets.some(s => s.id))
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

// ── Séance en cours : un exercice et une série à la fois ──
const WEIGHT_STEP = 2.5
const REPS_STEP = 1

const stepperFields = [
  { key: 'weight', label: 'Charge, kg', unit: 'kg', step: WEIGHT_STEP },
  { key: 'reps', label: 'Répétitions', unit: 'reps', step: REPS_STEP }
]

const showPlan = ref(false)
const activeBlockIndex = ref(0)
const activeSetIndex = ref(0)
const validating = ref(false)
const saveError = ref('')

const focusMode = computed(() =>
  !!currentWorkout.value && isSelectedToday.value && !isCardioSession.value && !showPlan.value
)

const { focusModeActive } = useFocusMode()
watch(focusMode, (active) => { focusModeActive.value = active }, { immediate: true })
onBeforeUnmount(() => { focusModeActive.value = false })

const activeBlock = computed(() => workoutBlocks.value[activeBlockIndex.value] ?? null)
const activeSet = computed(() => activeBlock.value?.sets[activeSetIndex.value] ?? null)
const activeTemplate = computed(() => getTemplateExercise(activeBlock.value?.exercise_id))

const activeOverload = computed(() =>
  activeBlock.value?.exercise_id
    ? getOverloadStatus(activeBlock.value.exercise_id, activeTemplate.value?.repsRange)
    : null
)

const canValidate = computed(() => activeSet.value?.weight != null && activeSet.value?.reps > 0)

const formatKg = (value) => `${Number(value).toLocaleString('fr-FR')} kg`

const exerciseName = (id) => exercises.value.find(e => e.id === id)?.name ?? ''

const nextBlockName = computed(() => {
  const next = workoutBlocks.value[activeBlockIndex.value + 1]
  if (!next) return 'Dernier exercice'
  return exerciseName(next.exercise_id) || 'Exercice à choisir'
})

const lastPerfText = computed(() => {
  const sets = getLastSession(activeBlock.value?.exercise_id)?.sets
  if (!sets?.length) return ''
  const reps = sets.map(s => s.reps).join(', ')
  const sameWeight = sets.every(s => s.weight === sets[0].weight)
  if (sameWeight) return `${sets[0].weight > 0 ? formatKg(sets[0].weight) : 'PDC'} × ${reps}`
  return sets.map(s => `${s.weight > 0 ? formatKg(s.weight) : 'PDC'} × ${s.reps}`).join(', ')
})

const overloadText = (status) => {
  if (!status) return ''
  if (status.suggestedWeight) return `Prêt à monter à ${formatKg(status.suggestedWeight)}`
  const detail = status.detail?.replace('→ ', '')
  return detail || status.label
}

const activeOverloadText = computed(() =>
  activeOverload.value?.status === 'START' ? '' : overloadText(activeOverload.value)
)

const overloadFor = (item) => getOverloadStatus(getExerciseDbId(item.name), item.repsRange)

const doneSetCount = (block) => block.sets.filter(s => s.id).length
const isBlockDone = (block) => !!block.exercise_id && block.sets.every(s => s.id)

const firstOpenSet = (block) => {
  const index = block.sets.findIndex(s => !s.id)
  return index === -1 ? 0 : index
}

const goToBlock = (index) => {
  const block = workoutBlocks.value[index]
  if (!block) return
  activeBlockIndex.value = index
  activeSetIndex.value = firstOpenSet(block)
  saveError.value = ''
}

const resumeAtFirstOpenSet = () => {
  const index = workoutBlocks.value.findIndex(b => !isBlockDone(b))
  goToBlock(index === -1 ? 0 : index)
}

const adjust = (field, delta) => {
  const set = activeSet.value
  if (set) set[field] = Math.max(0, (set[field] ?? 0) + delta)
}

const setSummary = (set, index) => {
  if (set.id) return `${formatKg(set.weight)} × ${set.reps}`
  if (index === activeSetIndex.value) return 'En cours'
  const target = activeTemplate.value?.repsRange
  return target ? `Objectif ${target}` : ''
}

const validateSet = async () => {
  const block = activeBlock.value
  const set = activeSet.value
  if (!block || !set || !canValidate.value || validating.value) return
  validating.value = true
  saveError.value = ''
  await saveSet(set, block.exercise_id)
  validating.value = false

  if (!set.id) {
    saveError.value = "Série non enregistrée, vérifie ta connexion et réessaie."
    return
  }

  // La charge choisie vaut pour les séries restantes de l'exercice.
  block.sets.filter(s => !s.id).forEach(s => { s.weight = set.weight })

  const nextSet = block.sets.findIndex(s => !s.id)
  if (nextSet !== -1) {
    activeSetIndex.value = nextSet
    return
  }
  const nextBlock = workoutBlocks.value.findIndex((b, i) => i > activeBlockIndex.value && !isBlockDone(b))
  if (nextBlock !== -1) goToBlock(nextBlock)
}

const headSubtitle = computed(() => {
  if (focusMode.value) return 'séance en cours'
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
})

const dayIcon = (session) => {
  if (session === 'REPOS') return Moon
  if (session === 'MATCH') return Trophy
  return session === 'CARDIO' ? Heart : Dumbbell
}

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
        resumeAtFirstOpenSet()
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
    showPlan.value = false
    resumeAtFirstOpenSet()
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

const addBlock = () => {
  workoutBlocks.value.push({ exercise_id: '', sets: [{ weight: null, reps: null, rpe: null }] })
  goToBlock(workoutBlocks.value.length - 1)
}

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
  goToBlock(Math.min(bIndex, workoutBlocks.value.length - 1))
}

const removeSet = async (block, sIndex) => {
  const set = block.sets[sIndex]
  if (set.id) await supabase.from('workout_sets').delete().eq('id', set.id)
  block.sets.splice(sIndex, 1)
  if (block.sets.length === 0) block.sets.push({ weight: null, reps: null, rpe: null })
  activeSetIndex.value = Math.min(activeSetIndex.value, block.sets.length - 1)
}
</script>

<style scoped>
.workout-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 1480px;
  margin: 0 auto;
}

/* ── En-tête ── */
.view-head {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.view-title {
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.22;
}

.view-title-soft { color: var(--text-secondary); }

.segmented {
  display: flex;
  gap: 2px;
  padding: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
}

.segmented-btn {
  flex: 1;
  min-height: 44px;
  padding: 0 var(--space-5);
  border: none;
  border-radius: var(--radius-pill);
  background: none;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}

.segmented-btn--active {
  background: var(--action);
  color: var(--on-action);
}

/* ── Boutons ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 48px;
  padding: 0 var(--space-5);
  border: none;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    transform var(--dur-fast) var(--ease-out),
    opacity var(--dur-fast) var(--ease-out);
}

.btn:hover { opacity: 0.88; }
.btn:active { transform: scale(0.97); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn--dark  { background: var(--action); color: var(--on-action); }
.btn--light { background: var(--bg-raised); color: var(--text-primary); }
.btn--soft  { background: var(--bg-raised); color: var(--text-primary); }
.btn--danger { color: var(--status-error); }
.btn--wide  { width: 100%; }
.btn--tall  { min-height: 60px; font-size: var(--text-sm); }

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid color-mix(in srgb, currentColor 30%, transparent);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.round-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
  color: var(--text-primary);
  cursor: pointer;
}

.round-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.round-btn--dark { background: var(--action); color: var(--on-action); }

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 44px;
  padding: 0 var(--space-1);
  border: none;
  background: none;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

/* ── Cartes ── */
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--bg-raised);
}

.card-title {
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* ── Bibliothèque ── */
.library {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
  max-width: 560px;
}

.field-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.field-stack { gap: var(--space-3); }

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field-label {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.field-input {
  width: 100%;
  min-height: 48px;
  padding: 0 var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-overlay);
  font-family: var(--font-sans);
  font-size: var(--text-md);
  color: var(--text-primary);
  outline: none;
  transition: border-color var(--dur-fast) var(--ease-out);
}

.field-input:focus { border-color: var(--accent); }
.field-input::placeholder { color: var(--text-secondary); }

/* ── Semaine ── */
.week-strip {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--space-1);
}

.day-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  min-height: 64px;
  padding: var(--space-2) 0;
  border: none;
  border-radius: var(--radius-md);
  background: var(--bg-raised);
  font-family: var(--font-sans);
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}

.day-btn--today { color: var(--accent); font-weight: 600; }

.day-btn--active {
  background: var(--action);
  color: var(--on-action);
}

/* ── Messages ── */
.notice {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: 500;
}

.notice--low  { background: var(--status-warning-dim); color: var(--status-warning); }
.notice--good { background: var(--status-success-dim); color: var(--status-success); }

.hint {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--status-success-dim);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--status-success);
}

.error {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--status-error-dim);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--status-error);
}

/* ── Bandeau ── */
.banner {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  min-height: 190px;
  padding: 18px;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--aurore-dashboard);
}

.banner--live { min-height: 0; }

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
  max-width: 72%;
}

.banner-title {
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.22;
}

.banner-meta {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
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

.chip--good { color: var(--status-success); }

.orb {
  position: absolute;
  border-radius: 50%;
  opacity: var(--orb-opacity);
  pointer-events: none;
}

.orb--a { top: -34px; right: -34px; width: 130px; height: 130px; background: var(--orb-lilas); }
.orb--b { top: 66px; right: -38px; width: 76px; height: 76px; background: var(--orb-ciel); }
.orb--c { right: 12px; bottom: 12px; width: 40px; height: 40px; background: var(--orb-rose); }

/* ── Programme ── */
.plan-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
}

.plan-body { gap: 0; }

.plan-body-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-sep {
  padding: var(--space-3) 0 var(--space-1);
  font-size: var(--text-2xs);
  font-weight: 600;
  color: var(--text-secondary);
}

.exercise-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-top: 1px solid var(--border-subtle);
}

.exercise-info { min-width: 0; }

.item-name {
  font-size: var(--text-sm);
  font-weight: 500;
}

.item-note {
  font-size: var(--text-2xs);
  line-height: 1.4;
  color: var(--text-secondary);
}

.item-note--setup {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.exercise-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
  text-align: right;
}

.exercise-volume {
  font-size: var(--text-xs);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.status-tag {
  margin-top: 2px;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-size: var(--text-2xs);
  font-weight: 500;
}

.status-tag--increase    { background: var(--status-success-dim); color: var(--status-success); }
.status-tag--progress    { background: var(--accent-dim);         color: var(--accent); }
.status-tag--consolidate { background: var(--status-warning-dim); color: var(--status-warning); }

.edit-fields {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex-shrink: 0;
}

.edit-input {
  width: 56px;
  min-height: 40px;
  padding: 0 var(--space-1);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--bg-overlay);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  color: var(--text-primary);
  text-align: center;
}

.edit-sep { font-size: var(--text-xs); color: var(--text-secondary); }

.free-start { align-self: center; color: var(--text-secondary); }

/* ── Cardio ── */
.cardio-list {
  display: flex;
  flex-direction: column;
  margin-top: var(--space-2);
  padding: 0;
  list-style: none;
}

.cardio-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-top: 1px solid var(--border-subtle);
}

.cardio-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: var(--module-sleep-dim);
  color: var(--module-sleep);
}

.cardio-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-3);
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

/* ── Séance en cours ── */
.live {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.live-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.live-position {
  font-size: var(--text-sm);
  font-weight: 500;
}

.live-progress {
  display: flex;
  gap: var(--space-1);
}

/* Segment fin à l'œil, cible de 24 px au doigt. */
.live-segment {
  position: relative;
  flex: 1;
  height: 24px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.live-segment::before {
  content: '';
  position: absolute;
  inset: 9px 0;
  border-radius: 3px;
  background: var(--bg-muted);
  transition: background var(--dur-fast) var(--ease-out);
}

.live-segment--done::before   { background: var(--text-primary); }
.live-segment--active::before { background: var(--accent); }

.live-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
}

.live-list { display: none; }

.live-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 52px;
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-md);
  background: none;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
}

.live-list-item:hover { background: var(--bg-overlay); }
.live-list-item--active { background: var(--accent-dim); color: var(--accent); }

.live-list-count {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
}

.live-volume {
  margin-top: auto;
  padding: var(--space-3) var(--space-3) 0;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.icon-done { color: var(--status-success); flex-shrink: 0; }

.live-main {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

.setup-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  background: var(--bg-raised);
}

.setup-icon { flex-shrink: 0; color: var(--text-secondary); }

.setup-input,
.setup-display {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  border: none;
  background: none;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  color: var(--text-primary);
  text-align: left;
  outline: none;
  cursor: pointer;
}

.setup-input { cursor: text; }

/* ── Chiffres géants ── */
.steppers {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.stepper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  min-width: 0;
  padding: 14px;
  border-radius: var(--radius-lg);
  background: var(--bg-raised);
}

.stepper-label {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.stepper-input {
  width: 100%;
  min-width: 0;
  padding: 0;
  border: none;
  background: none;
  font-family: var(--font-sans);
  font-size: clamp(2.75rem, 13vw, var(--text-geant));
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  text-align: center;
  outline: none;
  appearance: textfield;
  -moz-appearance: textfield;
}

.stepper-input::-webkit-outer-spin-button,
.stepper-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.stepper-input:focus { color: var(--accent); }

.stepper-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
  width: 100%;
  margin-top: var(--space-1);
}

.stepper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 52px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--bg-overlay);
  color: var(--text-primary);
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out);
}

.stepper-btn:active { transform: scale(0.94); }

/* ── Séries ── */
.sets { gap: var(--space-1); padding: var(--space-2); }

.set-row {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 48px;
  padding-right: var(--space-1);
  border-radius: var(--radius-md);
  transition: background var(--dur-fast) var(--ease-out);
}

.set-row--active { background: var(--accent-dim); }

.set-select {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  min-height: 48px;
  padding: 0 var(--space-3);
  border: none;
  background: none;
  font-family: var(--font-sans);
  color: var(--text-primary);
  cursor: pointer;
}

.set-name {
  font-size: var(--text-sm);
  font-weight: 500;
  white-space: nowrap;
}

.set-row--active .set-name,
.set-row--active .set-value { color: var(--accent); }

.set-value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.set-rpe {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--accent);
}

.set-rpe-input {
  width: 44px;
  height: 36px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--bg-raised);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  color: var(--text-primary);
  text-align: center;
}

.set-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 44px;
  flex-shrink: 0;
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
}

.sets-add { align-self: center; }

/* ── Actions de séance ── */
.live-action {
  position: sticky;
  bottom: calc(var(--space-3) + env(safe-area-inset-bottom, 0px));
  z-index: var(--z-raised);
}

.live-next {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.live-next-label {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 48px;
  border: none;
  background: none;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-primary);
  text-align: center;
  cursor: pointer;
}

.live-next-label:disabled { cursor: default; }

.live-next-caption {
  font-size: var(--text-2xs);
  color: var(--text-secondary);
}

.live-tools {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.live-tools .btn { flex: 1; }

/* ── États ── */
.empty-state {
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-8) var(--space-4);
  text-align: center;
}

.empty-title {
  font-size: var(--text-lg);
  font-weight: 600;
}

@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

.skeleton-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.skeleton {
  border-radius: var(--radius-lg);
  background: linear-gradient(90deg, var(--bg-raised) 25%, var(--bg-muted) 50%, var(--bg-raised) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}

.skeleton--week   { height: 64px; }
.skeleton--banner { height: 190px; }
.skeleton--card   { height: 320px; }

/* ── Bilan ── */
.summary {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-modal);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: 560px;
  margin: 0 auto;
  padding: var(--space-3) var(--space-5) calc(var(--space-5) + env(safe-area-inset-bottom, 0px));
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  background: var(--bg-raised);
  box-shadow: var(--shadow-lg);
}

.summary-handle {
  align-self: center;
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--bg-muted);
}

.summary-title {
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}

.summary-value {
  font-size: var(--text-2xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.summary-unit {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.summary-prs {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--status-success-dim);
}

.summary-enter-active,
.summary-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}

.summary-enter-from,
.summary-leave-to {
  opacity: 0;
  transform: translateY(24px);
}

/* ── Tablette ── */
.view-head--focus { display: none; }

@media (min-width: 768px) {
  .card { padding: 20px; }

  .view-head,
  .view-head--focus {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .view-break { display: none; }

  .view-title {
    font-size: var(--text-3xl);
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }

  .segmented { flex-shrink: 0; }

  .library { grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: none; align-items: start; }
  .banner { padding: var(--space-6) 28px; }
}

/* ── Desktop ── */
@media (min-width: 1100px) {
  .workout-view { gap: var(--space-4); }

  .plan-layout {
    grid-template-columns: 420px minmax(0, 1fr);
    gap: var(--space-4);
    align-items: start;
  }

  .plan-layout > .banner {
    position: sticky;
    top: 0;
    min-height: 420px;
  }

  .sets { padding: var(--space-3); }

  .live-layout {
    grid-template-columns: 320px minmax(0, 1fr);
    gap: var(--space-4);
    align-items: start;
  }

  .live-list {
    display: flex;
    gap: 2px;
    padding: var(--space-4);
  }

  .live-list .card-title { padding: var(--space-1) var(--space-3) var(--space-2); }

  .orb--a { top: auto; right: -50px; bottom: -50px; width: 240px; height: 240px; }
  .orb--b { top: auto; right: 20px; bottom: 200px; width: 90px; height: 90px; }
  .orb--c { right: 240px; bottom: 150px; }
  .banner-text { max-width: 60%; }
  .stepper-input { font-size: var(--text-geant); }
}
</style>
