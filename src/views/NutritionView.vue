<template>
  <div
    class="nutrition-view"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <!-- ── En-tête ── -->
    <header class="view-head">
      <h1 class="view-title">
        Nutrition,{{ ' ' }}<br class="view-break" />
        <span class="view-title-soft">{{ fullDateLabel }}</span>
      </h1>
      <div class="head-actions">
        <button class="pill-btn" aria-label="Meal prep" @click="showLibrary = true">
          <Archive :size="18" stroke-width="1.75" />
          <span class="pill-text">Meal prep</span>
        </button>
        <button class="pill-btn" aria-label="Habitudes" @click="showHabits = true">
          <Repeat :size="18" stroke-width="1.75" />
          <span class="pill-text">Habitudes</span>
        </button>
        <button class="pill-btn" aria-label="Réglages" @click="showSettings = true">
          <Settings :size="18" stroke-width="1.75" />
          <span class="pill-text">Réglages</span>
        </button>
      </div>
    </header>

    <!-- ── Choix du jour ── -->
    <nav class="date-nav" aria-label="Choisir un jour">
      <button class="date-nav-btn" aria-label="Jour précédent" @click="changeDate(-1)">
        <ChevronLeft :size="20" stroke-width="2" />
      </button>
      <span class="date-nav-label">{{ formattedCurrentDate }}</span>
      <button class="date-nav-btn" aria-label="Jour suivant" @click="changeDate(1)">
        <ChevronRight :size="20" stroke-width="2" />
      </button>
    </nav>

    <p v-if="pendingMeals" class="sync-status" :class="{ 'sync-status--offline': !syncOnline }" role="status">
      <span class="sync-dot" aria-hidden="true" />
      {{ syncOnline ? 'Envoi' : 'Hors ligne' }}, {{ pendingMeals }} repas en attente
    </p>

    <p v-if="notice" class="notice notice--toast" :class="`notice--${notice.type}`" :role="notice.type === 'error' ? 'alert' : 'status'">{{ notice.text }}</p>

    <!-- ── Chargement ── -->
    <div v-if="loading" class="layout">
      <div class="skeleton skeleton--banner" />
      <div class="skeleton skeleton--summary" />
      <div class="skeleton skeleton--journal" />
    </div>

    <div v-else class="layout">

      <!-- ── Saisie IA ── -->
      <section class="banner" aria-label="Ajouter un repas">
        <span class="orb orb--a" aria-hidden="true" />
        <span class="orb orb--b" aria-hidden="true" />

        <template v-if="!analyzedMeal">
          <h2 class="banner-title">
            Qu'as-tu mangé ?<br />
            <span class="banner-title-soft">L'IA fait les calculs</span>
          </h2>
          <form class="ai-form" @submit.prevent="analyzeWithAI">
            <textarea
              v-model="mealText"
              rows="2"
              class="ai-input"
              aria-label="Décris ton repas"
              placeholder="Un bol de riz avec du poulet grillé"
              :disabled="analyzing"
              @keydown.enter.exact.prevent="analyzeWithAI"
            />
            <button type="submit" class="round-btn round-btn--dark" :disabled="analyzing || !mealText.trim()" aria-label="Analyser le repas">
              <span v-if="analyzing" class="btn-spinner" />
              <ArrowUp v-else :size="20" stroke-width="2" />
            </button>
          </form>
        </template>

        <div v-else class="ai-result">
          <div class="ai-result-head">
            <h2 class="banner-title">{{ analyzedMeal.meal_name }}</h2>
            <span v-if="analyzedMeal.is_exceptional_meal" class="tag">Repas plaisir</span>
          </div>
          <ul class="ai-macros">
            <li><span>Calories</span><strong>{{ analyzedMeal.calories }}</strong></li>
            <li><span>Protéines</span><strong>{{ analyzedMeal.protein }} g</strong></li>
            <li><span>Glucides</span><strong>{{ analyzedMeal.carbs }} g</strong></li>
            <li><span>Lipides</span><strong>{{ analyzedMeal.fats }} g</strong></li>
          </ul>
          <div class="ai-actions">
            <button class="btn btn--dark" :disabled="savingMeal" @click="saveAnalyzedMeal">
              <span v-if="savingMeal" class="btn-spinner" />
              <Check v-else :size="18" stroke-width="2" />
              {{ savingMeal ? 'Enregistrement…' : 'Confirmer ce repas' }}
            </button>
            <button class="btn btn--light" @click="analyzedMeal = null">Modifier</button>
          </div>
        </div>
      </section>

      <!-- ── Bilan ── -->
      <section class="card summary" aria-label="Bilan du jour">
        <svg class="summary-ring" viewBox="0 0 36 36" role="img" :aria-label="`${dailyTotals.calories} kilocalories sur ${calculatedGoals.calories}`">
          <circle cx="18" cy="18" r="15.9" class="ring-track" pathLength="100" />
          <circle
            v-for="seg in macroSegments"
            :key="seg.label"
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
        <div class="summary-body">
          <p class="summary-total">
            <span class="summary-value" :class="{ 'summary-value--over': dailyTotals.calories > calculatedGoals.calories }">{{ dailyTotals.calories.toLocaleString('fr-FR') }}</span>
            <span class="card-sub">sur {{ calculatedGoals.calories.toLocaleString('fr-FR') }} kcal</span>
          </p>
          <ul class="macro-list">
            <li v-for="macro in macros" :key="macro.label">
              <span :style="{ color: macro.color }">{{ macro.label }}</span>
              <span>{{ Math.round(macro.current) }} / {{ macro.goal }} g</span>
            </li>
          </ul>
        </div>
      </section>

      <!-- ── Hydratation ── -->
      <HydrationWidget v-model:weight="userProfile.weight" class="hydration" />

      <!-- ── Journal ── -->
      <section class="card journal" aria-labelledby="journal-title">
        <div class="journal-head">
          <h2 id="journal-title" class="card-title">Journal</h2>
          <p v-if="todaysMeals.length" class="card-sub">
            {{ todaysMeals.length }} repas, {{ dailyTotals.calories.toLocaleString('fr-FR') }} kcal
          </p>
        </div>

        <div v-if="todaysMeals.length === 0" class="journal-empty">
          <p class="item-name">Aucun repas ce jour-là</p>
          <p class="card-sub">Décris ton repas ci-dessus pour l'ajouter.</p>
          <button
            v-if="recurringMeals.length"
            class="btn btn--dark journal-habits"
            :disabled="addingHabits"
            @click="addHabitsToDay"
          >
            <span v-if="addingHabits" class="btn-spinner" />
            <Repeat v-else :size="16" stroke-width="2" />
            Ajouter mes habitudes ({{ recurringMeals.map(h => h.meal_name).join(', ') }})
          </button>
        </div>

        <ul v-else class="meal-list">
          <li
            v-for="meal in todaysMeals"
            :key="meal.id"
            class="meal"
            :class="{ 'meal--skipped': meal.is_skipped }"
          >
            <div class="meal-info">
              <p class="item-name meal-name">{{ meal.meal_name }}</p>
              <p class="card-sub">
                {{ meal.protein }} g P, {{ meal.carbs }} g G, {{ meal.fats }} g L
                <span v-if="meal.is_exceptional_meal" class="tag tag--inline">Plaisir</span>
              </p>
            </div>
            <p class="meal-kcal">{{ meal.calories }} kcal</p>
            <div class="meal-actions">
              <button
                class="icon-btn"
                :class="{ 'icon-btn--active': meal.is_skipped }"
                :aria-label="meal.is_skipped ? 'Remettre ce repas' : 'Passer ce repas'"
                :title="meal.is_skipped ? 'Remettre ce repas' : 'Passer ce repas'"
                @click="toggleSkipMeal(meal)"
              >
                <CheckCircle2 v-if="meal.is_skipped" :size="18" stroke-width="1.75" />
                <Circle v-else :size="18" stroke-width="1.75" />
              </button>
              <button class="icon-btn" aria-label="Ajouter au meal prep" title="Ajouter au meal prep" @click="saveToLibrary(meal)">
                <Save :size="18" stroke-width="1.75" />
              </button>
              <button class="icon-btn" aria-label="Modifier" title="Modifier" @click="openEditModal(meal)">
                <Pencil :size="18" stroke-width="1.75" />
              </button>
              <button class="icon-btn icon-btn--danger" aria-label="Supprimer" title="Supprimer" @click="deleteMeal(meal.id)">
                <Trash2 :size="18" stroke-width="1.75" />
              </button>
            </div>
          </li>
        </ul>
      </section>

      <!-- ── Semaine ── -->
      <section class="card week" aria-labelledby="week-title">
        <h2 id="week-title" class="card-title">Calories sur 7 jours</h2>
        <div class="week-bars">
          <div v-for="day in weekBars" :key="day.date" class="week-col" :title="`${day.label}, ${day.calories.toLocaleString('fr-FR')} kcal`">
            <span class="week-track">
              <span class="week-bar" :class="`week-bar--${day.state}`" :style="{ height: day.height + '%' }" />
            </span>
            <span class="week-day" :class="{ 'week-day--current': day.isCurrent }">{{ day.letter }}</span>
          </div>
        </div>
      </section>
    </div>

    <!-- ════ MODALS ════ -->

    <!-- Library -->
    <Teleport to="body">
      <div v-if="showLibrary" class="modal-backdrop" @click.self="showLibrary = false">
        <div class="modal-sheet animate-slide-up">
          <div class="modal-head">
            <div class="modal-head-left">
              <div class="modal-icon"><Archive :size="16" stroke-width="1.75" /></div>
              <h3 class="modal-title">Mon meal prep</h3>
            </div>
            <button @click="showLibrary = false" class="modal-close" aria-label="Fermer"><X :size="18" stroke-width="1.75" /></button>
          </div>

          <div class="modal-body">
            <div v-if="loadingLibrary" class="modal-loading">
              <div class="skeleton skeleton--line" />
              <div class="skeleton skeleton--line" />
            </div>

            <div v-else-if="savedMeals.length === 0" class="modal-empty">
              <div class="modal-empty-icon"><Utensils :size="20" stroke-width="1.25" /></div>
              <p class="modal-empty-title">Bibliothèque vide</p>
              <p class="modal-empty-sub">Ajoute des repas depuis le journal pour les retrouver ici.</p>
            </div>

            <div v-else class="saved-meals-list">
              <div v-for="meal in savedMeals" :key="meal.id" class="saved-meal-card">
                <div class="saved-meal-head">
                  <div>
                    <h4 class="saved-meal-name">{{ meal.meal_name }}</h4>
                    <p class="saved-meal-cal">{{ meal.calories }} kcal</p>
                  </div>
                  <div class="saved-meal-actions">
                    <button @click="openPlanModal(meal)" class="btn-sm-accent">Planifier</button>
                    <button @click="deleteSavedMeal(meal.id)" class="meal-action-btn meal-action-btn--danger" aria-label="Supprimer ce repas enregistré">
                      <Trash2 :size="14" stroke-width="1.75" />
                    </button>
                  </div>
                </div>
                <div class="saved-meal-macros">
                  <div class="saved-macro" v-for="m in [['Prot', meal.protein], ['Gluc', meal.carbs], ['Lip', meal.fats]]" :key="m[0]">
                    <span class="saved-macro-label">{{ m[0] }}</span>
                    <span class="saved-macro-val">{{ m[1] }}g</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Planning -->
    <Teleport to="body">
      <div v-if="showPlanningModal && planningMealPayload" class="modal-backdrop" @click.self="showPlanningModal = false">
        <div class="modal-compact animate-scale-in">
          <div class="modal-head">
            <div class="modal-head-left">
              <div class="modal-icon"><Calendar :size="16" stroke-width="1.75" /></div>
              <h3 class="modal-title">Planification</h3>
            </div>
            <button @click="showPlanningModal = false" class="modal-close" aria-label="Fermer"><X :size="18" stroke-width="1.75" /></button>
          </div>

          <div class="modal-body">
            <div class="plan-meal-preview">
              <p class="field-label">Plat sélectionné</p>
              <p class="plan-meal-name">{{ planningMealPayload.meal_name }}</p>
            </div>

            <div class="plan-days-list">
              <label
                v-for="day in planningDaysOptions"
                :key="day.dateStr"
                class="plan-day"
                :class="{ 'plan-day--selected': planningDatesSelection.includes(day.dateStr) }"
              >
                <span class="plan-day-label">{{ day.label }}</span>
                <div class="plan-day-check" :class="{ 'plan-day-check--on': planningDatesSelection.includes(day.dateStr) }">
                  <input type="checkbox" :value="day.dateStr" v-model="planningDatesSelection" class="sr-only" />
                  <CheckCircle2 v-if="planningDatesSelection.includes(day.dateStr)" :size="14" stroke-width="1.75" />
                </div>
              </label>
            </div>
          </div>

          <div class="modal-footer">
            <button @click="showPlanningModal = false" class="btn-ghost">Annuler</button>
            <button @click="dispatchPlannedMeals" class="btn-primary btn-primary--sm">
              Valider {{ planningDatesSelection.length > 0 ? `(${planningDatesSelection.length})` : '' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Settings -->
    <Teleport to="body">
      <div v-if="showSettings" class="modal-backdrop" @click.self="showSettings = false">
        <div class="modal-sheet animate-slide-up">
          <div class="modal-head">
            <div class="modal-head-left">
              <div class="modal-icon"><Settings :size="16" stroke-width="1.75" /></div>
              <h3 class="modal-title">Configuration</h3>
            </div>
            <button @click="showSettings = false" class="modal-close" aria-label="Fermer"><X :size="18" stroke-width="1.75" /></button>
          </div>

          <div class="modal-body">
            <div class="settings-section">
              <p class="settings-section-title">Données biométriques</p>
              <div class="field-grid-2">
                <div class="field-group">
                  <label class="field-label">Genre</label>
                  <div class="select-wrap">
                    <select v-model="userProfile.gender" class="field-input field-select">
                      <option value="male">Homme</option>
                      <option value="female">Femme</option>
                    </select>
                    <ChevronRight :size="13" stroke-width="1.75" class="select-chevron" />
                  </div>
                </div>
                <div class="field-group">
                  <label class="field-label">Âge</label>
                  <input type="number" v-model.number="userProfile.age" class="field-input" />
                </div>
                <div class="field-group">
                  <label class="field-label">Poids (kg)</label>
                  <input type="number" v-model.number="userProfile.weight" step="0.1" class="field-input" />
                </div>
                <div class="field-group">
                  <label class="field-label">Taille (cm)</label>
                  <input type="number" v-model.number="userProfile.height" class="field-input" />
                </div>
              </div>
            </div>

            <div class="settings-section">
              <p class="settings-section-title">Mode de vie</p>
              <div class="field-group" style="margin-bottom:16px">
                <label class="field-label">Niveau d'activité</label>
                <div class="select-wrap">
                  <select v-model.number="userProfile.activity_level" class="field-input field-select">
                    <option :value="1.2">Sédentaire</option>
                    <option :value="1.375">Légèrement actif (1-3 j/sem)</option>
                    <option :value="1.55">Modérément actif (3-5 j/sem)</option>
                    <option :value="1.725">Très actif (6-7 j/sem)</option>
                    <option :value="1.9">Extrêmement actif</option>
                  </select>
                  <ChevronRight :size="13" stroke-width="1.75" class="select-chevron" />
                </div>
              </div>
              <div class="field-group">
                <label class="field-label">Objectif</label>
                <div class="goal-picker">
                  <button
                    v-for="t in [{ id:'loss', l:'Sèche' }, { id:'maintenance', l:'Maintien' }, { id:'muscle', l:'Masse' }]"
                    :key="t.id"
                    @click="userProfile.goal_type = t.id"
                    class="goal-option"
                    :class="{ 'goal-option--active': userProfile.goal_type === t.id }"
                  >{{ t.l }}</button>
                </div>
              </div>
            </div>

            <!-- Goals preview -->
            <div class="goals-preview">
              <p class="field-label" style="margin-bottom:14px">Cibles automatiques</p>
              <div class="goals-grid">
                <div class="goal-chip">
                  <span class="goal-chip-label">Calories</span>
                  <span class="goal-chip-value" style="color:var(--module-nutri)">{{ calculatedGoals.calories }}</span>
                </div>
                <div class="goal-chip">
                  <span class="goal-chip-label">Prot.</span>
                  <span class="goal-chip-value" style="color:var(--macro-protein)">{{ calculatedGoals.protein }}g</span>
                </div>
                <div class="goal-chip">
                  <span class="goal-chip-label">Gluc.</span>
                  <span class="goal-chip-value" style="color:var(--macro-carbs)">{{ calculatedGoals.carbs }}g</span>
                </div>
                <div class="goal-chip">
                  <span class="goal-chip-label">Lip.</span>
                  <span class="goal-chip-value" style="color:var(--macro-fats)">{{ calculatedGoals.fats }}g</span>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button @click="showSettings = false" class="btn-ghost">Annuler</button>
            <button @click="saveUserSettings" :disabled="savingSettings" class="btn-primary btn-primary--sm">
              <span v-if="savingSettings" class="btn-spinner btn-spinner--dark" />
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Habits -->
    <Teleport to="body">
      <div v-if="showHabits" class="modal-backdrop" @click.self="showHabits = false">
        <div class="modal-sheet animate-slide-up">
          <div class="modal-head">
            <div class="modal-head-left">
              <div class="modal-icon"><Repeat :size="16" stroke-width="1.75" /></div>
              <h3 class="modal-title">Mes habitudes</h3>
            </div>
            <button @click="showHabits = false" class="modal-close" aria-label="Fermer"><X :size="18" stroke-width="1.75" /></button>
          </div>

          <div class="modal-body">
            <div v-if="loadingHabits" class="modal-loading">
              <div class="skeleton skeleton--line" />
            </div>
            <div v-else>
              <div v-if="recurringMeals.length === 0" class="modal-empty" style="padding:24px 0">
                <p class="modal-empty-title">Aucune habitude</p>
              </div>
              <div v-else class="habits-list">
                <div v-for="habit in recurringMeals" :key="habit.id" class="habit-row">
                  <div>
                    <p class="habit-name">{{ habit.meal_name }}</p>
                    <div class="habit-meta">
                      <span>{{ habit.calories }} kcal</span>
                      <span>P {{ habit.protein }}g</span>
                      <span>G {{ habit.carbs }}g</span>
                      <span>L {{ habit.fats }}g</span>
                    </div>
                  </div>
                  <button @click="deleteHabit(habit.id)" class="meal-action-btn meal-action-btn--danger" aria-label="Supprimer cette habitude">
                    <Trash2 :size="14" stroke-width="1.75" />
                  </button>
                </div>
              </div>

              <div class="habit-form">
                <p class="settings-section-title">Ajouter un modèle</p>
                <div class="field-group" style="margin-bottom:12px">
                  <input v-model="newHabit.meal_name" type="text" class="field-input" placeholder="Shaker whey" />
                </div>
                <div class="field-grid-4">
                  <div class="field-group">
                    <label class="field-label">Cal</label>
                    <input v-model.number="newHabit.calories" type="number" class="field-input field-input--center" />
                  </div>
                  <div class="field-group">
                    <label class="field-label">Prot</label>
                    <input v-model.number="newHabit.protein" type="number" class="field-input field-input--center" />
                  </div>
                  <div class="field-group">
                    <label class="field-label">Gluc</label>
                    <input v-model.number="newHabit.carbs" type="number" class="field-input field-input--center" />
                  </div>
                  <div class="field-group">
                    <label class="field-label">Lip</label>
                    <input v-model.number="newHabit.fats" type="number" class="field-input field-input--center" />
                  </div>
                </div>
                <button @click="addHabit" :disabled="!newHabit.meal_name" class="btn-primary" style="margin-top:12px">
                  <Plus :size="14" stroke-width="1.75" /> Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit meal -->
    <Teleport to="body">
      <div v-if="showEditModal && editingMeal" class="modal-backdrop" @click.self="showEditModal = false">
        <div class="modal-compact animate-scale-in">
          <div class="modal-head">
            <div class="modal-head-left">
              <div class="modal-icon"><Pencil :size="16" stroke-width="1.75" /></div>
              <h3 class="modal-title">Modifier</h3>
            </div>
            <button @click="showEditModal = false" class="modal-close" aria-label="Fermer"><X :size="18" stroke-width="1.75" /></button>
          </div>
          <div class="modal-body">
            <div class="field-group" style="margin-bottom:16px">
              <label class="field-label">Désignation</label>
              <input v-model="editingMeal.meal_name" type="text" class="field-input" />
            </div>
            <div class="field-grid-2">
              <div class="field-group">
                <label class="field-label">Calories</label>
                <input v-model.number="editingMeal.calories" type="number" class="field-input" />
              </div>
              <div class="field-group">
                <label class="field-label">Protéines (g)</label>
                <input v-model.number="editingMeal.protein" type="number" class="field-input" />
              </div>
              <div class="field-group">
                <label class="field-label">Glucides (g)</label>
                <input v-model.number="editingMeal.carbs" type="number" class="field-input" />
              </div>
              <div class="field-group">
                <label class="field-label">Lipides (g)</label>
                <input v-model.number="editingMeal.fats" type="number" class="field-input" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="showEditModal = false" class="btn-ghost">Annuler</button>
            <button @click="updateMeal" class="btn-primary btn-primary--sm">Mettre à jour</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'
import { useConfirm } from '@/composables/useConfirm'
import { localDay } from '@/utils/date'
import { calorieState } from '@/composables/useCalorieStatus'
import { useSyncQueue, newId } from '@/composables/useSyncQueue'
import {
  ArrowUp, Calendar, Check, CheckCircle2, ChevronLeft, ChevronRight, Circle,
  Archive, Pencil, Plus, Repeat, Save, Settings, Trash2, Utensils, X
} from 'lucide-vue-next'
import HydrationWidget from '@/components/HydrationWidget.vue'

const { user } = useAuth()
const { askConfirm } = useConfirm()
const sync = useSyncQueue()
const { online: syncOnline } = sync
const pendingMeals = sync.pendingFor('nutrition_logs')

const touchStart = ref(0)
const handleTouchStart = (e) => { touchStart.value = e.touches[0].clientX }
const handleTouchEnd = (e) => {
  const delta = e.changedTouches[0].clientX - touchStart.value
  if (Math.abs(delta) > 50) changeDate(delta > 0 ? -1 : 1)
}

const loading = ref(true)
const todaysMeals = ref([])
const showSettings = ref(false)
const savingSettings = ref(false)
const currentDate = ref(new Date())

const formattedCurrentDate = computed(() => {
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (currentDate.value.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (currentDate.value.toDateString() === yesterday.toDateString()) return "Hier"
  if (currentDate.value.toDateString() === tomorrow.toDateString()) return "Demain"
  return currentDate.value.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
})

const fullDateLabel = computed(() =>
  currentDate.value.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
)

const getLocalISOString = localDay

const currentDateStr = computed(() => getLocalISOString(currentDate.value))
const changeDate = (days) => { const d = new Date(currentDate.value); d.setDate(d.getDate() + days); currentDate.value = d }

const userProfile = ref({ gender: 'male', age: 25, weight: 75, height: 180, activity_level: 1.55, goal_type: 'maintenance' })
const GOALS = ref({ calories: 2500, protein: 160, carbs: 300, fats: 80 })
const showHabits = ref(false)
const recurringMeals = ref([])
const loadingHabits = ref(false)
const newHabit = ref({ meal_name: '', calories: 0, protein: 0, carbs: 0, fats: 0, is_exceptional_meal: false })
const showEditModal = ref(false)
const editingMeal = ref(null)
const showLibrary = ref(false)
const savedMeals = ref([])
const loadingLibrary = ref(false)
const mealText = ref('')
const analyzing = ref(false)
const analyzedMeal = ref(null)
const savingMeal = ref(false)

const dailyTotals = computed(() =>
  todaysMeals.value
    .filter(m => !m.is_skipped)
    .reduce((acc, m) => ({
      calories: acc.calories + (Number(m.calories) || 0),
      protein:  acc.protein  + (Number(m.protein)  || 0),
      carbs:    acc.carbs    + (Number(m.carbs)    || 0),
      fats:     acc.fats     + (Number(m.fats)     || 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 })
)

const calculatedGoals = computed(() => {
  const p = userProfile.value
  let bmr = (10 * p.weight) + (6.25 * p.height) - (5 * p.age)
  bmr = p.gender === 'male' ? bmr + 5 : bmr - 161
  const tdee = bmr * p.activity_level
  let cal = tdee
  if (p.goal_type === 'loss') cal -= 500
  if (p.goal_type === 'muscle') cal += 300
  cal = Math.round(cal)
  const protein = Math.round(p.weight * 2.2)
  const fats = Math.round(p.weight * 1.0)
  const carbs = Math.max(0, Math.round((cal - protein * 4 - fats * 9) / 4))
  return { calories: cal, protein, carbs, fats }
})

const macros = computed(() => [
  { label: 'Protéines', current: dailyTotals.value.protein, goal: calculatedGoals.value.protein, kcal: 4, color: 'var(--macro-protein)' },
  { label: 'Glucides',  current: dailyTotals.value.carbs,   goal: calculatedGoals.value.carbs,   kcal: 4, color: 'var(--macro-carbs)' },
  { label: 'Lipides',   current: dailyTotals.value.fats,    goal: calculatedGoals.value.fats,    kcal: 9, color: 'var(--macro-fats)' },
])

const macroSegments = computed(() => {
  const total = calculatedGoals.value.calories || 1
  let offset = 0
  return macros.value.map(macro => {
    const length = Math.max(0, Math.min(100 - offset, (macro.current * macro.kcal / total) * 100))
    const segment = { label: macro.label, color: macro.color, length, offset }
    offset += length
    return segment
  })
})

// ── Semaine ──
const weekLogs = ref([])

const weekDates = computed(() =>
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date(currentDate.value)
    date.setDate(date.getDate() - 6 + index)
    return date
  })
)

const fetchWeek = async (userId) => {
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('date, calories')
    .eq('user_id', userId)
    .gte('date', getLocalISOString(weekDates.value[0]))
    .lte('date', currentDateStr.value)
    .eq('is_skipped', false)
  if (!error) weekLogs.value = data ?? []
}

const weekBars = computed(() => {
  const totals = new Map()
  for (const log of weekLogs.value) {
    totals.set(log.date, (totals.get(log.date) ?? 0) + (Number(log.calories) || 0))
  }
  totals.set(currentDateStr.value, dailyTotals.value.calories)

  const goal = calculatedGoals.value.calories
  const highest = Math.max(goal, ...totals.values()) || 1

  return weekDates.value.map(date => {
    const dateStr = getLocalISOString(date)
    const calories = totals.get(dateStr) ?? 0
    const isCurrent = dateStr === currentDateStr.value
    return {
      date: dateStr,
      calories,
      isCurrent,
      label: date.toLocaleDateString('fr-FR', { weekday: 'long' }),
      letter: date.toLocaleDateString('fr-FR', { weekday: 'narrow' }).toUpperCase(),
      height: (calories / highest) * 100,
      state: !calories ? 'empty' : isCurrent ? 'today' : calorieState(calories, goal)
    }
  })
})

// ── Messages ──
const notice = ref(null)
let noticeTimer = null

// Colonnes entières côté base (calories partout, macros des habitudes et du meal prep)
const toInt = (v) => Math.round(Number(v) || 0)
const mealFields = (m, { integerMacros = false } = {}) => ({
  meal_name: m.meal_name,
  calories: toInt(m.calories),
  protein: integerMacros ? toInt(m.protein) : Number(m.protein) || 0,
  carbs: integerMacros ? toInt(m.carbs) : Number(m.carbs) || 0,
  fats: integerMacros ? toInt(m.fats) : Number(m.fats) || 0,
  is_exceptional_meal: !!m.is_exceptional_meal
})

const showNotice = (text, type = 'good') => {
  notice.value = { text, type }
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { notice.value = null }, 4000)
}

// ── Copie locale du journal, pour réafficher un jour sans réseau ──
const SNAPSHOT_KEY = 'omnidash_nutrition_snapshot'
const SNAPSHOT_DAYS = 30
const readSnapshots = () => {
  try { return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '{}') || {} } catch (e) { return {} }
}
const readSnapshot = (dateStr) => readSnapshots()[dateStr] ?? null
const writeSnapshot = (dateStr, meals) => {
  try {
    const all = readSnapshots()
    all[dateStr] = meals
    // On ne garde que les jours les plus récents
    const kept = Object.keys(all).sort().slice(-SNAPSHOT_DAYS)
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(Object.fromEntries(kept.map(d => [d, all[d]]))))
  } catch (e) {}
}

// Jour réellement affiché : todaysMeals lui appartient, même pendant un changement de date
const loadedDate = ref(null)
watch(todaysMeals, (meals) => { if (loadedDate.value) writeSnapshot(loadedDate.value, meals) }, { deep: true })

const isOffline = () => typeof navigator !== 'undefined' && !navigator.onLine

watch(currentDateStr, async (v) => {
  if (!user.value?.id) return
  await fetchTodaysMeals(user.value.id, v)
  await fetchWeek(user.value.id)
})

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id || user.value?.id
  if (userId) {
    await fetchTodaysMeals(userId, currentDateStr.value)
    await loadUserSettings(userId)
    await fetchHabits(userId)
    await fetchLibrary(userId)
    await fetchWeek(userId)
  }
})

const loadUserSettings = async (userId) => {
  try {
    const { data } = await supabase.from('user_settings').select('*').eq('user_id', userId).single()
    if (data) userProfile.value = { ...userProfile.value, ...data }
  } catch(e) {}
}

const saveUserSettings = async () => {
  if (!user.value) return
  savingSettings.value = true
  try {
    // Seulement les champs de ce formulaire : la ligne porte aussi Musculation et Fenêtres
    const { gender, age, weight, height, activity_level, goal_type } = userProfile.value
    const { error } = await supabase.from('user_settings').upsert({
      user_id: user.value.id, gender, age, weight, height, activity_level, goal_type,
      calories_target: toInt(calculatedGoals.value.calories),
      protein_target: toInt(calculatedGoals.value.protein),
      carbs_target: toInt(calculatedGoals.value.carbs),
      fats_target: toInt(calculatedGoals.value.fats),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    if (error) throw error
    showSettings.value = false
  } catch(e) {
    console.error(e)
    showNotice('Réglages non enregistrés, réessaie.', 'error')
  } finally { savingSettings.value = false }
}

const fetchTodaysMeals = async (userId, focusDateStr) => {
  loading.value = true
  // Ce qui attend sur l'appareil part d'abord, pour que la base soit à jour
  await sync.flush()
  const snapshot = readSnapshot(focusDateStr)
  const show = (meals) => {
    if (focusDateStr !== currentDateStr.value) return
    loadedDate.value = focusDateStr
    todaysMeals.value = meals
  }
  try {
    // Hors ligne ou envois en attente : la copie locale est la plus récente
    if (snapshot && (pendingMeals.value > 0 || isOffline())) return show(snapshot)
    const { data: logs, error } = await supabase.from('nutrition_logs').select('*').eq('user_id', userId).eq('date', focusDateStr).order('id', { ascending: false })
    if (error) throw error
    show(logs || [])
  } catch(e) {
    console.error(e)
    show(snapshot || [])
  } finally { loading.value = false }
}

// Ajoute un repas au journal d'un jour : affiché tout de suite, envoyé par la file
const queueMeal = (dateStr, fields) => {
  const row = { id: newId(), user_id: user.value.id, date: dateStr, is_skipped: false, ...fields }
  sync.insert('nutrition_logs', row)
  if (dateStr === loadedDate.value) {
    todaysMeals.value.unshift({ ...row })
  } else {
    const snapshot = readSnapshot(dateStr)
    if (snapshot) writeSnapshot(dateStr, [{ ...row }, ...snapshot])
  }
  return row
}

// Écriture refusée par la base (pas le réseau) : on le dit et on recharge le jour
watch(() => sync.lastFailure.value, (failure) => {
  if (!failure || failure.table !== 'nutrition_logs') return
  const messages = {
    insert: 'Repas non enregistré, réessaie.',
    update: 'Modification non enregistrée, réessaie.',
    delete: 'Suppression impossible, réessaie.'
  }
  showNotice(messages[failure.type] || 'Modification non enregistrée, réessaie.', 'error')
  if (user.value?.id) fetchTodaysMeals(user.value.id, currentDateStr.value)
})

// Ajoute les habitudes au jour affiché, seulement à la demande
const addingHabits = ref(false)
const addHabitsToDay = async () => {
  if (!user.value || !recurringMeals.value.length) return
  addingHabits.value = true
  const dateStr = currentDateStr.value
  try {
    recurringMeals.value.forEach(h => queueMeal(dateStr, mealFields(h)))
  } catch (e) {
    console.error(e)
    showNotice('Habitudes non ajoutées, réessaie.', 'error')
  } finally {
    addingHabits.value = false
  }
}

const fetchHabits = async (userId) => {
  loadingHabits.value = true
  try {
    const { data } = await supabase.from('recurring_meals').select('*').eq('user_id', userId).order('created_at', { ascending: true })
    if (data) recurringMeals.value = data
  } catch(e) {} finally { loadingHabits.value = false }
}

const addHabit = async () => {
  if (!user.value || !newHabit.value.meal_name) return
  const { data, error } = await supabase.from('recurring_meals').insert({ user_id: user.value.id, ...mealFields(newHabit.value, { integerMacros: true }) }).select()
  if (error) { console.error(error); showNotice('Habitude non enregistrée, réessaie.', 'error'); return }
  if (data?.[0]) { recurringMeals.value.push(data[0]); newHabit.value = { meal_name: '', calories: 0, protein: 0, carbs: 0, fats: 0, is_exceptional_meal: false } }
}

const deleteHabit = async (id) => {
  if (!await askConfirm({ title: 'Supprimer cette habitude ?', detail: 'Cette action est définitive.' })) return
  const { error } = await supabase.from('recurring_meals').delete().eq('id', id)
  if (error) { console.error(error); showNotice('Suppression impossible, réessaie.', 'error'); return }
  recurringMeals.value = recurringMeals.value.filter(h => h.id !== id)
}

const openEditModal = (meal) => { editingMeal.value = { ...meal }; showEditModal.value = true }

const updateMeal = async () => {
  if (!editingMeal.value) return
  const { is_exceptional_meal, ...fields } = mealFields(editingMeal.value)
  const id = editingMeal.value.id
  sync.update('nutrition_logs', id, fields)
  const meal = todaysMeals.value.find(m => m.id === id)
  if (meal) Object.assign(meal, fields)
  showEditModal.value = false
}

const analyzeWithAI = async () => {
  if (!mealText.value.trim()) return
  // L'analyse passe par le serveur : sans réseau, on le dit simplement
  const offlineMessage = 'Analyse indisponible hors ligne. Ton texte est gardé, relance une fois connecté.'
  if (isOffline()) { showNotice(offlineMessage, 'error'); return }
  analyzing.value = true; analyzedMeal.value = null
  try {
    const { data: { session }, error: authError } = await supabase.auth.refreshSession()
    if (authError?.name === 'AuthRetryableFetchError') throw Object.assign(new Error(authError.message), { offline: true })
    if (!session) throw new Error("Non authentifié.")
    const response = await supabase.functions.invoke('analyze-nutrition', {
      body: { text: `Objectif: ${calculatedGoals.value.calories}kcal, ${calculatedGoals.value.protein}g prot, ${calculatedGoals.value.carbs}g gluc, ${calculatedGoals.value.fats}g lip.\n\n${mealText.value}` }
    })
    if (response.error?.name === 'FunctionsFetchError') throw Object.assign(new Error(response.error.message), { offline: true })
    if (response.error) throw new Error(response.error.context?.error || response.error.message)
    if (!response.data) throw new Error("Aucune donnée.")
    analyzedMeal.value = response.data
  } catch (e) {
    console.error(e)
    if (e.offline || isOffline()) showNotice(offlineMessage, 'error')
    else showNotice(`Analyse impossible : ${e.message}`, 'error')
  } finally {
    analyzing.value = false
  }
}

const saveAnalyzedMeal = async () => {
  if (!user.value || !analyzedMeal.value) return
  savingMeal.value = true
  try {
    queueMeal(currentDateStr.value, mealFields(analyzedMeal.value))
    mealText.value = ''; analyzedMeal.value = null
  } catch(e) {
    console.error(e)
    showNotice('Repas non enregistré, réessaie.', 'error')
  } finally { savingMeal.value = false }
}

const deleteMeal = async (id) => {
  if (!await askConfirm({ title: 'Supprimer ce repas ?', detail: 'Cette action est définitive.' })) return
  sync.remove('nutrition_logs', id)
  todaysMeals.value = todaysMeals.value.filter(m => m.id !== id)
}

const toggleSkipMeal = async (meal) => {
  const is_skipped = !meal.is_skipped
  sync.update('nutrition_logs', meal.id, { is_skipped })
  meal.is_skipped = is_skipped
}

const fetchLibrary = async (userId) => {
  loadingLibrary.value = true
  try {
    const { data } = await supabase.from('saved_meals').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (data) savedMeals.value = data
  } catch(e) {} finally { loadingLibrary.value = false }
}

const saveToLibrary = async (meal) => {
  if (!user.value) return
  // La ligne du journal porte des colonnes absentes du meal prep (is_skipped, date) : on ne garde que le repas
  const { data, error } = await supabase.from('saved_meals').insert({ user_id: user.value.id, ...mealFields(meal, { integerMacros: true }) }).select()
  if (error) { console.error(error); showNotice('Repas non ajouté au meal prep, réessaie.', 'error'); return }
  if (data?.[0]) {
    savedMeals.value.unshift(data[0])
    showNotice('Repas ajouté au meal prep.')
  }
}

const planningMealPayload = ref(null)
const planningDatesSelection = ref([])
const showPlanningModal = ref(false)

const openPlanModal = (meal) => { planningMealPayload.value = meal; planningDatesSelection.value = []; showPlanningModal.value = true }

const dispatchPlannedMeals = async () => {
  if (!planningMealPayload.value || !planningDatesSelection.value.length) return
  try {
    const fields = mealFields(planningMealPayload.value)
    planningDatesSelection.value.forEach(dateStr => queueMeal(dateStr, fields))
  } catch (e) {
    console.error(e)
    showNotice('Planification impossible, réessaie.', 'error')
    return
  }
  showNotice('Repas planifié.')
  showPlanningModal.value = false
}

const deleteSavedMeal = async (id) => {
  if (!await askConfirm({ title: 'Supprimer ce repas enregistré ?', detail: 'Cette action est définitive.' })) return
  const { error } = await supabase.from('saved_meals').delete().eq('id', id)
  if (error) { console.error(error); showNotice('Suppression impossible, réessaie.', 'error'); return }
  savedMeals.value = savedMeals.value.filter(m => m.id !== id)
}

const buildNextDays = () => {
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i)
    dates.push({ dateStr: localDay(d), label: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' }) })
  }
  return dates
}
const planningDaysOptions = buildNextDays()

const isAnyModalOpen = computed(() => showSettings.value || showHabits.value || showLibrary.value || showPlanningModal.value || showEditModal.value)
watch(isAnyModalOpen, (open) => { document.body.style.overflow = open ? 'hidden' : '' })
</script>

<style scoped>
/* ── Couleurs des macros ── */
.nutrition-view,
.modal-backdrop {
  --macro-protein: var(--accent);
  --macro-carbs:   var(--module-sleep);
  --macro-fats:    var(--module-windows);
}

.nutrition-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 1480px;
  margin: 0 auto;
}

/* ── En-tête ── */
.view-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.view-title {
  min-width: 0;
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.22;
}

.view-title-soft {
  font-size: var(--text-lg);
  color: var(--text-secondary);
}

.head-actions {
  display: flex;
  gap: var(--space-1);
  flex-shrink: 0;
}

.pill-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-width: 44px;
  min-height: 44px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
}

.pill-text { display: none; }

/* ── Jour ── */
.date-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
}

.date-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: var(--radius-pill);
  background: none;
  color: var(--text-primary);
  cursor: pointer;
}

.date-nav-btn:hover { background: var(--bg-overlay); }

.date-nav-label {
  font-size: var(--text-xs);
  font-weight: 600;
}

/* ── Envois en attente ── */
.sync-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.sync-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--accent);
}

.sync-status--offline .sync-dot { background: var(--status-warning); }

/* ── Messages ── */
.notice {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: 500;
}

/* Message flottant : visible même depuis une fenêtre ou en bas de page */
.notice--toast {
  position: fixed;
  left: 50%;
  bottom: calc(100px + env(safe-area-inset-bottom, 0px));
  z-index: calc(var(--z-modal) + 1);
  width: max-content;
  max-width: calc(100% - 32px);
  transform: translateX(-50%);
  box-shadow: var(--shadow-lg);
}

@media (min-width: 768px) {
  .notice--toast { bottom: var(--space-6); }
}

.notice--good  { background: var(--status-success-dim); color: var(--status-success); }
.notice--error { background: var(--status-error-dim);   color: var(--status-error); }

/* ── Grille ── */
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
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
  transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}

.btn:hover { opacity: 0.88; }
.btn:active { transform: scale(0.97); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn--dark  { background: var(--action); color: var(--on-action); }
.btn--light { background: var(--bg-raised); color: var(--text-primary); }

.round-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border: none;
  border-radius: var(--radius-pill);
  cursor: pointer;
}

.round-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.round-btn--dark { background: var(--action); color: var(--on-action); }

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid color-mix(in srgb, currentColor 30%, transparent);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── Bandeau ── */
.banner {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-3);
  padding: 18px;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--aurore-nutri);
}

.banner > :not(.orb) {
  position: relative;
  z-index: var(--z-raised);
}

.banner-title {
  max-width: 80%;
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.22;
}

.banner-title-soft { color: var(--text-secondary); }

.orb {
  position: absolute;
  border-radius: 50%;
  opacity: var(--orb-opacity);
  pointer-events: none;
}

.orb--a { top: -40px; right: -30px; width: 120px; height: 120px; background: var(--orb-ciel); }
.orb--b { top: 36px; right: -30px; width: 66px; height: 66px; background: var(--orb-rose); }

.ai-form {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px 6px 6px var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--bg-raised);
}

.ai-input {
  flex: 1;
  min-width: 0;
  padding: 6px 0;
  border: none;
  background: none;
  font-family: var(--font-sans);
  font-size: var(--text-md);
  line-height: 1.4;
  color: var(--text-primary);
  outline: none;
  resize: none;
}

.ai-input::placeholder { color: var(--text-secondary); }

.ai-result {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.ai-result-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.ai-macros {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--bg-raised);
  list-style: none;
}

.ai-macros li {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ai-macros span {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.ai-macros strong {
  font-size: var(--text-lg);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.ai-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tag {
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  background: var(--status-warning-dim);
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--status-warning);
}

.tag--inline { margin-left: var(--space-1); padding: 1px 8px; }

/* ── Cartes ── */
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--bg-raised);
}

.card-title {
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.card-sub {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.item-name {
  font-size: var(--text-sm);
  font-weight: 500;
}

/* ── Bilan ── */
.summary {
  flex-direction: row;
  align-items: center;
  gap: var(--space-4);
}

.summary-ring {
  display: block;
  width: 96px;
  height: 96px;
  flex-shrink: 0;
  transform: rotate(-90deg);
}

.ring-track,
.ring-seg {
  fill: none;
  stroke-width: 3.2;
}

.ring-track { stroke: var(--bg-overlay); }

.summary-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.summary-total {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-2);
}

.summary-value {
  font-size: var(--text-2xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}

.summary-value--over { color: var(--status-error); }

.macro-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
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

/* ── Journal ── */
.journal { gap: 0; }

.journal-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding-bottom: var(--space-2);
}

.journal-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: var(--space-5) 0;
}

.journal-habits {
  max-width: 100%;
  white-space: normal;
  margin-top: var(--space-3);
  text-align: left;
}

.meal-list {
  display: flex;
  flex-direction: column;
  padding: 0;
  list-style: none;
}

.meal {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 2px var(--space-3);
  padding: var(--space-3) 0 var(--space-1);
  border-top: 1px solid var(--border-subtle);
}

.meal--skipped .meal-info,
.meal--skipped .meal-kcal { opacity: 0.55; }
.meal--skipped .meal-name { text-decoration: line-through; }

.meal-info { min-width: 0; }

.meal-kcal {
  font-size: var(--text-xs);
  font-weight: 600;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.meal-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 2px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}

.icon-btn:hover { background: var(--bg-overlay); color: var(--text-primary); }
.icon-btn--active { color: var(--status-success); }
.icon-btn--danger:hover { background: var(--status-error-dim); color: var(--status-error); }

/* ── Semaine ── */
.week { gap: var(--space-3); }

.week-bars {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--space-2);
  min-height: 150px;
}

.week-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  min-width: 0;
}

.week-track {
  flex: 1;
  display: flex;
  align-items: flex-end;
  width: 100%;
}

.week-bar {
  display: block;
  width: 100%;
  min-height: 6px;
  border-radius: var(--radius-sm);
  background: var(--bg-overlay);
  transition: height var(--dur-base) var(--ease-out);
}

.week-bar--good  { background: var(--status-success-dim); }
.week-bar--mid   { background: var(--status-warning-dim); }
.week-bar--bad   { background: var(--status-error-dim); }
.week-bar--today { background: var(--accent-dim); }

.week-day {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.week-day--current { color: var(--text-primary); font-weight: 600; }

/* ── Squelettes ── */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

.skeleton {
  border-radius: var(--radius-lg);
  background: linear-gradient(90deg, var(--bg-raised) 25%, var(--bg-muted) 50%, var(--bg-raised) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}

.skeleton--banner  { height: 170px; }
.skeleton--summary { height: 130px; }
.skeleton--journal { height: 240px; }
.skeleton--line    { height: 56px; margin-bottom: var(--space-2); border-radius: var(--radius-md); }

/* ── Tablette ── */
@media (min-width: 768px) {
  .view-break { display: none; }
  .view-title-soft { font-size: inherit; }

  .view-title {
    font-size: var(--text-3xl);
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }

  .card { padding: 20px; }
  .date-nav { align-self: flex-start; gap: var(--space-3); }
  .banner { padding: var(--space-6) 28px; }

  .meal {
    grid-template-columns: minmax(0, 1fr) auto auto;
    padding: var(--space-2) 0;
  }

  .meal-actions { grid-column: auto; }
}

/* ── Desktop ── */
@media (min-width: 1100px) {
  .nutrition-view { gap: var(--space-4); }

  .pill-btn { padding: 0 18px; }
  .pill-text { display: inline; }

  .layout {
    grid-template-columns: minmax(0, 1fr) 400px;
    grid-template-rows: auto auto auto 1fr;
    grid-template-areas:
      "banner  summary"
      "journal hydration"
      "journal week"
      "journal week";
    gap: var(--space-4);
  }

  .banner { grid-area: banner; min-height: 216px; }
  .summary { grid-area: summary; padding: var(--space-6); }
  .hydration { grid-area: hydration; }
  .journal { grid-area: journal; padding: 20px var(--space-6); }
  .week { grid-area: week; padding: 20px; }

  .banner-title { max-width: 60%; }
  .ai-form { max-width: 620px; }
  .orb--a { top: -70px; right: 60px; width: 240px; height: 240px; }
  .orb--b { top: 70px; right: -20px; width: 120px; height: 120px; }

  .summary-ring { width: 150px; height: 150px; }
  .card-title { font-size: var(--text-xl); }
  .week .card-title { font-size: var(--text-lg); }
  .week-bars { min-height: 180px; }
}

/* ════ Fenêtres de dialogue ════ */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: var(--scrim);
}

.modal-sheet,
.modal-compact {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 560px;
  max-height: 88dvh;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  background: var(--bg-base);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-4) var(--space-3);
}

.modal-head-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.modal-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: var(--module-nutri-dim);
  color: var(--module-nutri);
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
  color: var(--text-primary);
  cursor: pointer;
}

.modal-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: 0 var(--space-4) var(--space-4);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom, 0px));
  background: var(--bg-raised);
}

.modal-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-8) 0;
  text-align: center;
}

.modal-empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-bottom: var(--space-2);
  border-radius: var(--radius-md);
  background: var(--module-nutri-dim);
  color: var(--module-nutri);
}

.modal-empty-title { font-size: var(--text-sm); font-weight: 600; }

.modal-empty-sub {
  max-width: 300px;
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.btn-primary,
.btn-ghost {
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
  cursor: pointer;
}

.btn-primary { background: var(--action); color: var(--on-action); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost { background: none; color: var(--text-primary); }

.btn-sm-accent {
  min-height: 40px;
  padding: 0 var(--space-4);
  border: none;
  border-radius: var(--radius-pill);
  background: var(--action);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--on-action);
  cursor: pointer;
}

.meal-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
}

.meal-action-btn--danger:hover { background: var(--status-error-dim); color: var(--status-error); }

/* ── Meal prep ── */
.saved-meals-list,
.habits-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.saved-meal-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--bg-raised);
}

.saved-meal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.saved-meal-name,
.habit-name {
  font-size: var(--text-sm);
  font-weight: 500;
}

.saved-meal-cal {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.saved-meal-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex-shrink: 0;
}

.saved-meal-macros {
  display: flex;
  gap: var(--space-4);
}

.saved-macro {
  display: flex;
  gap: var(--space-1);
  font-size: var(--text-2xs);
  font-weight: 500;
}

.saved-macro-label { color: var(--text-secondary); }

/* ── Planification ── */
.plan-meal-preview {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--bg-raised);
}

.plan-meal-name { font-size: var(--text-sm); font-weight: 600; }

.plan-days-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.plan-day {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  background: var(--bg-raised);
  cursor: pointer;
}

.plan-day--selected { background: var(--module-nutri-dim); }

.plan-day-label {
  font-size: var(--text-sm);
  font-weight: 500;
  text-transform: capitalize;
}

.plan-day-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1.5px solid var(--border-strong);
  border-radius: var(--radius-pill);
  color: var(--module-nutri);
}

.plan-day-check--on { border-color: transparent; }

/* ── Formulaires ── */
.settings-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.settings-section-title {
  font-size: var(--text-sm);
  font-weight: 600;
}

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

.field-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.field-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
}

.field-input {
  width: 100%;
  min-height: 48px;
  padding: 0 var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-raised);
  font-family: var(--font-sans);
  font-size: var(--text-md);
  color: var(--text-primary);
  outline: none;
}

.field-input:focus { border-color: var(--accent); }
.field-input--center { padding: 0 var(--space-1); text-align: center; }

.select-wrap { position: relative; }
.field-select { padding-right: 36px; appearance: none; }

.select-chevron {
  position: absolute;
  top: 50%;
  right: var(--space-3);
  color: var(--text-secondary);
  pointer-events: none;
  transform: translateY(-50%) rotate(90deg);
}

.goal-picker {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 2px;
  padding: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
}

.goal-option {
  min-height: 40px;
  border: none;
  border-radius: var(--radius-pill);
  background: none;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}

.goal-option--active {
  background: var(--action);
  color: var(--on-action);
}

.goals-preview {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--bg-raised);
}

.goals-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
}

.goal-chip {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.goal-chip-label {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.goal-chip-value {
  font-size: var(--text-lg);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.habit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--bg-raised);
}

.habit-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.habit-form {
  display: flex;
  flex-direction: column;
  margin-top: var(--space-3);
}

.habit-form .settings-section-title { margin-bottom: var(--space-2); }

@media (min-width: 768px) {
  .modal-backdrop { align-items: center; padding: var(--space-5); }
  .modal-sheet,
  .modal-compact { border-radius: var(--radius-lg); }
  .modal-compact { max-width: 440px; }
}
</style>
