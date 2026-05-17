<template>
  <div
    class="nutrition-view"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <!-- ── Header ── -->
    <header class="module-header">
      <div class="module-header-left">
        <div class="module-icon">
          <Utensils :size="18" stroke-width="1.75" />
        </div>
        <div>
          <h2 class="module-name">Nutrition</h2>
          <p class="module-sub">Carburant & Énergie</p>
        </div>
      </div>
      <div class="header-actions">
        <button @click="showLibrary = true" class="action-btn" title="Meal Prep">
          <Archive :size="17" stroke-width="1.75" />
        </button>
        <button @click="showHabits = true" class="action-btn" title="Habitudes">
          <Repeat :size="17" stroke-width="1.75" />
        </button>
        <button @click="showSettings = true" class="action-btn" title="Paramètres">
          <Settings :size="17" stroke-width="1.75" />
        </button>
      </div>
    </header>

    <!-- ── Date navigator ── -->
    <div class="date-nav">
      <button @click="changeDate(-1)" class="date-nav-btn" aria-label="Jour précédent">
        <ChevronLeft :size="18" stroke-width="1.75" />
      </button>
      <div class="date-nav-label">
        <Calendar :size="11" stroke-width="1.75" />
        <span>{{ formattedCurrentDate }}</span>
      </div>
      <button @click="changeDate(1)" class="date-nav-btn" aria-label="Jour suivant">
        <ChevronRight :size="18" stroke-width="1.75" />
      </button>
    </div>

    <!-- ── Loading ── -->
    <div v-if="loading" class="skeleton-stack">
      <div class="skeleton skeleton--summary" />
      <div class="skeleton skeleton--hydration" />
      <div class="skeleton skeleton--ai" />
    </div>

    <template v-else>
      <!-- ── Macro summary ── -->
      <section class="summary-card">
        <div class="summary-top">
          <div>
            <p class="summary-eyebrow">Calories totales</p>
            <div class="summary-calories">
              <span class="cal-value">{{ dailyTotals.calories }}</span>
              <span class="cal-goal">/ {{ calculatedGoals.calories }} kcal</span>
            </div>
          </div>
          <div class="summary-flame">
            <Flame :size="20" stroke-width="1.75" />
          </div>
        </div>

        <div class="macro-bars">
          <div v-for="macro in macros" :key="macro.label" class="macro-row">
            <div class="macro-meta">
              <div class="macro-label">
                <component :is="macro.icon" :size="10" stroke-width="2" :style="{ color: macro.color }" />
                <span>{{ macro.label }}</span>
              </div>
              <div class="macro-values">
                <span class="macro-current" :style="{ color: macro.color }">{{ Math.round(macro.current) }}g</span>
                <span class="macro-goal">/ {{ macro.goal }}g</span>
              </div>
            </div>
            <div class="macro-track">
              <div
                class="macro-fill"
                :style="{
                  width: Math.min(100, (macro.current / macro.goal) * 100) + '%',
                  background: macro.color
                }"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- ── Hydration ── -->
      <HydrationWidget v-model:weight="userProfile.weight" />

      <!-- ── AI Assistant ── -->
      <div class="ai-card">
        <div class="ai-sparkle-bg">
          <Sparkles :size="72" stroke-width="1" />
        </div>

        <div class="ai-content">
          <h3 class="ai-title">Enregistrement magique</h3>
          <p class="ai-sub">Décrivez votre repas, l'IA s'occupe des chiffres.</p>

          <!-- Input state -->
          <div v-if="!analyzedMeal" class="ai-form">
            <textarea
              v-model="mealText"
              rows="3"
              class="ai-textarea"
              placeholder="Ex: Un bol de riz avec du poulet grillé…"
              :disabled="analyzing"
            />
            <button
              @click="analyzeWithAI"
              :disabled="analyzing || !mealText.trim()"
              class="ai-submit-btn"
            >
              <span v-if="analyzing" class="btn-spinner btn-spinner--dark" />
              <Sparkles v-else :size="14" stroke-width="1.75" />
              {{ analyzing ? 'Analyse…' : 'Analyser le repas' }}
            </button>
          </div>

          <!-- Analyzed result -->
          <div v-else class="ai-result animate-fade-in">
            <div class="ai-result-card">
              <div class="ai-result-head">
                <div>
                  <h4 class="ai-result-name">{{ analyzedMeal.meal_name }}</h4>
                  <div v-if="analyzedMeal.is_exceptional_meal" class="ai-pleasure-badge">
                    <AlertCircle :size="9" /> Repas plaisir
                  </div>
                </div>
                <button @click="analyzedMeal = null" class="ai-result-edit">
                  <Pencil :size="14" stroke-width="1.75" />
                </button>
              </div>
              <div class="ai-result-macros">
                <div v-for="(val, key) in { Cal: analyzedMeal.calories, Prot: analyzedMeal.protein+'g', Gluc: analyzedMeal.carbs+'g', Lip: analyzedMeal.fats+'g' }" :key="key" class="ai-macro-chip">
                  <span class="ai-macro-key">{{ key }}</span>
                  <span class="ai-macro-val">{{ val }}</span>
                </div>
              </div>
            </div>
            <button @click="saveAnalyzedMeal" :disabled="savingMeal" class="btn-primary">
              <span v-if="savingMeal" class="btn-spinner btn-spinner--dark" />
              <Save v-else :size="14" stroke-width="1.75" />
              {{ savingMeal ? 'Enregistrement…' : 'Confirmer ce repas' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Journal ── -->
      <section>
        <p class="section-eyebrow">Journal nutritionnel</p>

        <!-- Empty meals -->
        <div v-if="todaysMeals.length === 0" class="meals-empty">
          <div class="meals-empty-icon"><Utensils :size="22" stroke-width="1.25" /></div>
          <p class="meals-empty-title">Aucun repas</p>
          <p class="meals-empty-sub">Utilisez l'enregistreur magique ci-dessus.</p>
        </div>

        <div v-else class="meals-list">
          <div
            v-for="meal in todaysMeals"
            :key="meal.id"
            class="meal-card"
            :class="{ 'meal-card--skipped': meal.is_skipped }"
          >
            <div class="meal-card-top">
              <div class="meal-card-info">
                <h4 class="meal-name" :class="{ 'meal-name--skipped': meal.is_skipped }">
                  {{ meal.meal_name }}
                </h4>
                <p class="meal-cal">{{ meal.calories }} kcal</p>
              </div>
              <div class="meal-actions">
                <button @click="toggleSkipMeal(meal)" class="meal-action-btn" :class="{ 'meal-action-btn--active': meal.is_skipped }" :title="meal.is_skipped ? 'Manger' : 'Passer'">
                  <CheckCircle2 v-if="meal.is_skipped" :size="15" stroke-width="1.75" />
                  <Circle v-else :size="15" stroke-width="1.75" />
                </button>
                <button @click="saveToLibrary(meal)" class="meal-action-btn" title="Bibliothèque">
                  <Save :size="15" stroke-width="1.75" />
                </button>
                <button @click="openEditModal(meal)" class="meal-action-btn" title="Modifier">
                  <Pencil :size="15" stroke-width="1.75" />
                </button>
                <button @click="deleteMeal(meal.id)" class="meal-action-btn meal-action-btn--danger" title="Supprimer">
                  <Trash2 :size="15" stroke-width="1.75" />
                </button>
              </div>
            </div>

            <div class="meal-macros-row">
              <div class="meal-macro">
                <div class="meal-macro-bar">
                  <div class="meal-macro-fill" style="background: var(--macro-protein)"
                    :style="{ width: Math.min(100, (meal.protein / (meal.calories/10 || 1) * 100)) + '%', background: 'var(--macro-protein)' }" />
                </div>
                <span class="meal-macro-label">{{ meal.protein }}g Prot</span>
              </div>
              <div class="meal-macro">
                <div class="meal-macro-bar">
                  <div class="meal-macro-fill"
                    :style="{ width: Math.min(100, (meal.carbs / (meal.calories/10 || 1) * 100)) + '%', background: 'var(--macro-carbs)' }" />
                </div>
                <span class="meal-macro-label">{{ meal.carbs }}g Gluc</span>
              </div>
              <div class="meal-macro">
                <div class="meal-macro-bar">
                  <div class="meal-macro-fill"
                    :style="{ width: Math.min(100, (meal.fats / (meal.calories/20 || 1) * 100)) + '%', background: 'var(--macro-fats)' }" />
                </div>
                <span class="meal-macro-label">{{ meal.fats }}g Lipi</span>
              </div>
            </div>

            <div v-if="meal.is_exceptional_meal" class="meal-exceptional-pip" />
          </div>
        </div>
      </section>
    </template>

    <!-- ════ MODALS ════ -->

    <!-- Library -->
    <Teleport to="body">
      <div v-if="showLibrary" class="modal-backdrop" @click.self="showLibrary = false">
        <div class="modal-sheet animate-slide-up">
          <div class="modal-head">
            <div class="modal-head-left">
              <div class="modal-icon"><Archive :size="16" stroke-width="1.75" /></div>
              <h3 class="modal-title">Mon Meal Prep</h3>
            </div>
            <button @click="showLibrary = false" class="modal-close"><X :size="18" stroke-width="1.75" /></button>
          </div>

          <div class="modal-body">
            <div v-if="loadingLibrary" class="modal-loading">
              <div class="skeleton skeleton--line" />
              <div class="skeleton skeleton--line" />
            </div>

            <div v-else-if="savedMeals.length === 0" class="modal-empty">
              <div class="modal-empty-icon"><Utensils :size="20" stroke-width="1.25" /></div>
              <p class="modal-empty-title">Bibliothèque vide</p>
              <p class="modal-empty-sub">Enregistrez vos créations depuis le journal pour les retrouver ici.</p>
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
                    <button @click="deleteSavedMeal(meal.id)" class="meal-action-btn meal-action-btn--danger">
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
            <button @click="showPlanningModal = false" class="modal-close"><X :size="18" stroke-width="1.75" /></button>
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
            <button @click="showSettings = false" class="modal-close"><X :size="18" stroke-width="1.75" /></button>
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
              <h3 class="modal-title">Mes Habitudes</h3>
            </div>
            <button @click="showHabits = false" class="modal-close"><X :size="18" stroke-width="1.75" /></button>
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
                  <button @click="deleteHabit(habit.id)" class="meal-action-btn meal-action-btn--danger">
                    <Trash2 :size="14" stroke-width="1.75" />
                  </button>
                </div>
              </div>

              <div class="habit-form">
                <p class="settings-section-title">Ajouter un modèle</p>
                <div class="field-group" style="margin-bottom:12px">
                  <input v-model="newHabit.meal_name" type="text" class="field-input" placeholder="Ex: Shaker Whey" />
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
            <button @click="showEditModal = false" class="modal-close"><X :size="18" stroke-width="1.75" /></button>
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
import {
  Activity, Flame, Beef, Wheat, Droplet,
  ChevronLeft, ChevronRight, Settings, Repeat, Archive,
  Plus, Sparkles, Save, Pencil, Trash2, X, Calendar,
  Utensils, CheckCircle2, AlertCircle, Circle
} from 'lucide-vue-next'
import HydrationWidget from '@/components/HydrationWidget.vue'

const { user } = useAuth()

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

const getLocalISOString = (date) => {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0]
}

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
  { label: 'Protéines', current: dailyTotals.value.protein, goal: calculatedGoals.value.protein, color: 'var(--macro-protein)', icon: Beef },
  { label: 'Glucides',  current: dailyTotals.value.carbs,   goal: calculatedGoals.value.carbs,   color: 'var(--macro-carbs)',   icon: Wheat },
  { label: 'Lipides',   current: dailyTotals.value.fats,    goal: calculatedGoals.value.fats,    color: 'var(--macro-fats)',    icon: Droplet },
])

watch(currentDateStr, async (v) => { if (user.value?.id) await fetchTodaysMeals(user.value.id, v) })

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id || user.value?.id
  if (userId) {
    await fetchTodaysMeals(userId, currentDateStr.value)
    await loadUserSettings(userId)
    await fetchHabits(userId)
    await fetchLibrary(userId)
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
    await supabase.from('user_settings').upsert({
      user_id: user.value.id, ...userProfile.value,
      calories_target: calculatedGoals.value.calories,
      protein_target: calculatedGoals.value.protein,
      carbs_target: calculatedGoals.value.carbs,
      fats_target: calculatedGoals.value.fats,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    showSettings.value = false
  } catch(e) { console.error(e) } finally { savingSettings.value = false }
}

const fetchTodaysMeals = async (userId, focusDateStr) => {
  loading.value = true
  try {
    const { data: logs } = await supabase.from('nutrition_logs').select('*').eq('user_id', userId).eq('date', focusDateStr).order('id', { ascending: false })
    if (logs && logs.length > 0) { todaysMeals.value = logs }
    else { todaysMeals.value = []; await checkAndInjectHabits(userId, focusDateStr) }
  } catch(e) { console.error(e) } finally { loading.value = false }
}

const checkAndInjectHabits = async (userId, dateStr) => {
  try {
    const { data: habits } = await supabase.from('recurring_meals').select('*').eq('user_id', userId)
    if (habits?.length > 0) {
      const payloads = habits.map(h => ({ user_id: userId, date: dateStr, meal_name: h.meal_name, calories: h.calories, protein: h.protein, carbs: h.carbs, fats: h.fats, is_exceptional_meal: h.is_exceptional_meal, is_skipped: false }))
      const { data: insertedLogs } = await supabase.from('nutrition_logs').insert(payloads).select()
      if (insertedLogs) todaysMeals.value = insertedLogs.sort((a,b) => b.id - a.id)
    }
  } catch(e) { console.error(e) }
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
  const { data } = await supabase.from('recurring_meals').insert({ user_id: user.value.id, ...newHabit.value }).select()
  if (data?.[0]) { recurringMeals.value.push(data[0]); newHabit.value = { meal_name: '', calories: 0, protein: 0, carbs: 0, fats: 0, is_exceptional_meal: false } }
}

const deleteHabit = async (id) => {
  if (!confirm('Supprimer cette habitude ?')) return
  const { error } = await supabase.from('recurring_meals').delete().eq('id', id)
  if (!error) recurringMeals.value = recurringMeals.value.filter(h => h.id !== id)
}

const openEditModal = (meal) => { editingMeal.value = { ...meal }; showEditModal.value = true }

const updateMeal = async () => {
  if (!editingMeal.value) return
  const { data } = await supabase.from('nutrition_logs').update({ meal_name: editingMeal.value.meal_name, calories: editingMeal.value.calories, protein: editingMeal.value.protein, carbs: editingMeal.value.carbs, fats: editingMeal.value.fats }).eq('id', editingMeal.value.id).select()
  if (data?.[0]) { const idx = todaysMeals.value.findIndex(m => m.id === editingMeal.value.id); if (idx !== -1) todaysMeals.value[idx] = data[0]; showEditModal.value = false }
}

const analyzeWithAI = async () => {
  if (!mealText.value.trim()) return
  analyzing.value = true; analyzedMeal.value = null
  try {
    const { data: { session } } = await supabase.auth.refreshSession()
    if (!session) throw new Error("Non authentifié.")
    const response = await supabase.functions.invoke('analyze-nutrition', {
      body: { text: `Objectif: ${calculatedGoals.value.calories}kcal, ${calculatedGoals.value.protein}g prot, ${calculatedGoals.value.carbs}g gluc, ${calculatedGoals.value.fats}g lip.\n\n${mealText.value}` }
    })
    if (response.error) throw new Error(response.error.context?.error || response.error.message)
    if (!response.data) throw new Error("Aucune donnée.")
    analyzedMeal.value = response.data
  } catch (e) { console.error(e); alert(`Échec. ${e.message}`) } finally { analyzing.value = false }
}

const saveAnalyzedMeal = async () => {
  if (!user.value || !analyzedMeal.value) return
  savingMeal.value = true
  try {
    const { data } = await supabase.from('nutrition_logs').insert({
      user_id: user.value.id, date: currentDateStr.value,
      meal_name: analyzedMeal.value.meal_name, calories: analyzedMeal.value.calories || 0,
      protein: analyzedMeal.value.protein || 0, carbs: analyzedMeal.value.carbs || 0,
      fats: analyzedMeal.value.fats || 0, is_exceptional_meal: analyzedMeal.value.is_exceptional_meal || false
    }).select()
    if (data?.[0]) { todaysMeals.value.unshift(data[0]); mealText.value = ''; analyzedMeal.value = null }
  } catch(e) { console.error(e) } finally { savingMeal.value = false }
}

const deleteMeal = async (id) => {
  if (!confirm('Supprimer ce repas ?')) return
  const { error } = await supabase.from('nutrition_logs').delete().eq('id', id)
  if (!error) todaysMeals.value = todaysMeals.value.filter(m => m.id !== id)
}

const toggleSkipMeal = async (meal) => {
  const { data } = await supabase.from('nutrition_logs').update({ is_skipped: !meal.is_skipped }).eq('id', meal.id).select()
  if (data?.[0]) { const idx = todaysMeals.value.findIndex(m => m.id === meal.id); if (idx !== -1) todaysMeals.value[idx].is_skipped = data[0].is_skipped }
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
  const payload = { ...meal, user_id: user.value.id, id: undefined, date: undefined, created_at: undefined }
  const { data } = await supabase.from('saved_meals').insert(payload).select()
  if (data?.[0]) { savedMeals.value.unshift(data[0]); alert("Meal ajouté à votre Prep Library !") }
}

const planningMealPayload = ref(null)
const planningDatesSelection = ref([])
const showPlanningModal = ref(false)

const openPlanModal = (meal) => { planningMealPayload.value = meal; planningDatesSelection.value = []; showPlanningModal.value = true }

const dispatchPlannedMeals = async () => {
  if (!planningMealPayload.value || !planningDatesSelection.value.length) return
  const payloads = planningDatesSelection.value.map(dateStr => ({ user_id: user.value.id, date: dateStr, meal_name: planningMealPayload.value.meal_name, calories: planningMealPayload.value.calories, protein: planningMealPayload.value.protein, carbs: planningMealPayload.value.carbs, fats: planningMealPayload.value.fats, is_exceptional_meal: planningMealPayload.value.is_exceptional_meal }))
  const { error } = await supabase.from('nutrition_logs').insert(payloads)
  if (error) { console.error(error); return }
  alert("Repas planifié !")
  showPlanningModal.value = false
  if (planningDatesSelection.value.includes(currentDateStr.value)) await fetchTodaysMeals(user.value.id, currentDateStr.value)
}

const deleteSavedMeal = async (id) => {
  if (!confirm('Supprimer ?')) return
  const { error } = await supabase.from('saved_meals').delete().eq('id', id)
  if (!error) savedMeals.value = savedMeals.value.filter(m => m.id !== id)
}

const buildNextDays = () => {
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i)
    const dLocal = new Date(d.getTime() - (d.getTimezoneOffset()*60*1000))
    dates.push({ dateStr: dLocal.toISOString().split('T')[0], label: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' }) })
  }
  return dates
}
const planningDaysOptions = buildNextDays()

const isAnyModalOpen = computed(() => showSettings.value || showHabits.value || showLibrary.value || showPlanningModal.value || showEditModal.value)
watch(isAnyModalOpen, (open) => { document.body.style.overflow = open ? 'hidden' : '' })
</script>

<style scoped>
/* ── Macro color tokens (local) ── */
.nutrition-view {
  --macro-protein: #8EA0C8;
  --macro-carbs:   #C9A04C;
  --macro-fats:    #7DAD8A;

  max-width: 540px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  user-select: none;
}

/* ── Module header ── */
.module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.module-header-left { display: flex; align-items: center; gap: 12px; }

.module-icon {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  background: var(--module-nutri-dim);
  border: 1px solid var(--module-nutri-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--module-nutri);
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

.header-actions { display: flex; gap: 4px; }

.action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}

.action-btn:hover { color: var(--text-secondary); border-color: var(--border-default); }

/* ── Date navigator ── */
.date-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 4px;
}

.date-nav-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
}

.date-nav-btn:hover { color: var(--text-secondary); background: var(--bg-subtle); }
.date-nav-btn:active { transform: scale(0.9); }

.date-nav-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-secondary);
}

/* ── Skeletons ── */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

.skeleton-stack { display: flex; flex-direction: column; gap: 10px; }

.skeleton {
  border-radius: var(--radius-xl);
  background: linear-gradient(90deg, var(--bg-overlay) 25%, var(--bg-muted) 50%, var(--bg-overlay) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}

.skeleton--summary    { height: 200px; }
.skeleton--hydration  { height: 140px; }
.skeleton--ai         { height: 160px; }
.skeleton--line       { height: 56px; border-radius: var(--radius-md); }

/* ── Summary card ── */
.summary-card {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-top-color: var(--module-nutri-border);
  border-radius: var(--radius-xl);
  padding: 24px;
}

.summary-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
}

.summary-eyebrow {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.summary-calories {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.cal-value {
  font-family: var(--font-serif);
  font-size: 2.4rem;
  font-weight: 400;
  color: var(--text-primary);
  line-height: 1;
  letter-spacing: -0.02em;
}

.cal-goal {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.summary-flame {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background: rgba(125, 173, 138, 0.10);
  border: 1px solid rgba(125, 173, 138, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--module-nutri);
}

.macro-bars { display: flex; flex-direction: column; gap: 14px; }

.macro-row { display: flex; flex-direction: column; gap: 6px; }

.macro-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.macro-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.macro-values { display: flex; align-items: baseline; gap: 4px; }
.macro-current { font-size: var(--text-sm); font-weight: 500; }
.macro-goal    { font-size: 11px; color: var(--text-disabled); }

.macro-track {
  height: 3px;
  background: var(--bg-overlay);
  border-radius: 999px;
  overflow: hidden;
}

.macro-fill {
  height: 100%;
  border-radius: 999px;
  transition: width var(--dur-slow) var(--ease-out);
  opacity: 0.8;
}

/* ── AI card ── */
.ai-card {
  position: relative;
  overflow: hidden;
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-top-color: var(--module-nutri-border);
  border-radius: var(--radius-xl);
  padding: 26px 24px;
}

.ai-sparkle-bg {
  position: absolute;
  top: -20px;
  right: -20px;
  color: var(--module-nutri);
  opacity: 0.04;
  pointer-events: none;
}

.ai-content { position: relative; }

.ai-title {
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  font-weight: 400;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.ai-sub {
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-bottom: 18px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.ai-form { display: flex; flex-direction: column; gap: 10px; }

.ai-textarea {
  width: 100%;
  padding: 14px 16px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-primary);
  outline: none;
  resize: none;
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
  line-height: 1.5;
}

.ai-textarea::placeholder { color: var(--text-disabled); }

.ai-textarea:focus {
  border-color: var(--module-nutri-border);
  box-shadow: 0 0 0 3px var(--module-nutri-dim);
}

.ai-submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 13px;
  background: var(--text-primary);
  color: var(--bg-base);
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}

.ai-submit-btn:hover  { background: #fff; }
.ai-submit-btn:active { transform: scale(0.98); }
.ai-submit-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

.ai-result { display: flex; flex-direction: column; gap: 10px; }

.ai-result-card {
  background: var(--bg-overlay);
  border: 1px solid var(--module-nutri-border);
  border-radius: var(--radius-lg);
  padding: 18px;
}

.ai-result-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.ai-result-name {
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  font-weight: 400;
  color: var(--text-primary);
}

.ai-pleasure-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--status-warning);
}

.ai-result-edit {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  transition: color var(--dur-fast) var(--ease-out);
}

.ai-result-edit:hover { color: var(--text-secondary); }

.ai-result-macros { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }

.ai-macro-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 6px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}

.ai-macro-key { font-size: 9px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); }
.ai-macro-val { font-size: var(--text-sm); color: var(--text-primary); font-weight: 300; }

/* ── Section eyebrow ── */
.section-eyebrow {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
  margin-bottom: 10px;
}

/* ── Meals ── */
.meals-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 36px 24px;
  background: var(--bg-raised);
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-xl);
  gap: 8px;
}

.meals-empty-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-disabled);
  margin-bottom: 4px;
}

.meals-empty-title { font-family: var(--font-serif); font-size: var(--text-md); color: var(--text-primary); }
.meals-empty-sub   { font-size: var(--text-xs); color: var(--text-muted); }

.meals-list { display: flex; flex-direction: column; gap: 8px; }

.meal-card {
  position: relative;
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color var(--dur-fast) var(--ease-out);
}

.meal-card:hover { border-color: var(--border-default); }
.meal-card--skipped { opacity: 0.45; }

.meal-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.meal-card-info { flex: 1; min-width: 0; }

.meal-name {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meal-name--skipped { text-decoration: line-through; }

.meal-cal {
  font-size: 10px;
  color: var(--module-nutri);
  margin-top: 3px;
  font-weight: 500;
}

.meal-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.meal-action-btn {
  width: 32px;
  height: 32px;
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

.meal-action-btn:hover { color: var(--text-muted); }
.meal-action-btn--active { color: var(--module-nutri); }
.meal-action-btn--danger:hover { color: var(--status-error); }

.meal-macros-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.meal-macro { display: flex; flex-direction: column; gap: 4px; }

.meal-macro-bar {
  height: 2px;
  background: var(--bg-overlay);
  border-radius: 999px;
  overflow: hidden;
}

.meal-macro-fill {
  height: 100%;
  border-radius: 999px;
  opacity: 0.7;
}

.meal-macro-label { font-size: 9px; font-weight: 500; color: var(--text-muted); }

.meal-exceptional-pip {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--status-warning);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

/* ── Shared form atoms ── */
.field-group   { display: flex; flex-direction: column; gap: 6px; }
.field-grid-2  { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.field-grid-4  { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }

.field-label {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
}

.field-input {
  width: 100%;
  padding: 11px 14px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-primary);
  outline: none;
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}

.field-input::placeholder { color: var(--text-disabled); }

.field-input:focus {
  border-color: var(--module-nutri-border);
  box-shadow: 0 0 0 3px var(--module-nutri-dim);
}

.field-input--center { text-align: center; }

.field-select { appearance: none; cursor: pointer; }

.select-wrap { position: relative; }

.select-chevron {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%) rotate(90deg);
  color: var(--text-muted);
  pointer-events: none;
}

/* ── Buttons ── */
.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: var(--text-primary);
  color: var(--bg-base);
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}

.btn-primary:hover  { background: #fff; }
.btn-primary:active { transform: scale(0.98); }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.btn-primary--sm { padding: 11px 20px; width: auto; }

.btn-ghost {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 11px 16px;
  background: none;
  border: none;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: color var(--dur-fast) var(--ease-out);
}

.btn-ghost:hover { color: var(--text-secondary); }

.btn-sm-accent {
  padding: 7px 14px;
  background: var(--module-nutri-dim);
  border: 1px solid var(--module-nutri-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--module-nutri);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--dur-fast) var(--ease-out);
}

.btn-sm-accent:hover { background: color-mix(in srgb, var(--module-nutri) 16%, transparent); }

@keyframes spin { to { transform: rotate(360deg); } }

.btn-spinner {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

.btn-spinner--dark {
  border-color: rgba(0,0,0,0.15);
  border-top-color: var(--bg-base);
}

/* ── Modals ── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

@media (min-width: 480px) {
  .modal-backdrop { align-items: center; }
}

.modal-sheet {
  position: relative;
  width: 100%;
  max-width: 540px;
  background: var(--bg-overlay);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (min-width: 480px) {
  .modal-sheet { border-radius: var(--radius-xl); margin: 16px; }
}

.modal-compact {
  position: relative;
  width: 100%;
  max-width: 400px;
  margin: 16px;
  background: var(--bg-overlay);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 22px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.modal-head-left { display: flex; align-items: center; gap: 10px; }

.modal-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--module-nutri-dim);
  border: 1px solid var(--module-nutri-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--module-nutri);
  flex-shrink: 0;
}

.modal-title {
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  font-weight: 400;
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: var(--radius-sm);
  transition: color var(--dur-fast) var(--ease-out);
}

.modal-close:hover { color: var(--text-secondary); }

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 22px;
  border-top: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.modal-loading { display: flex; flex-direction: column; gap: 8px; }

.modal-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 0;
  gap: 8px;
}

.modal-empty-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--bg-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-disabled);
  margin-bottom: 4px;
}

.modal-empty-title { font-family: var(--font-serif); font-size: var(--text-md); color: var(--text-primary); }
.modal-empty-sub   { font-size: var(--text-sm); color: var(--text-muted); max-width: 240px; line-height: 1.5; }

/* ── Saved meals ── */
.saved-meals-list { display: flex; flex-direction: column; gap: 8px; }

.saved-meal-card {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.saved-meal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.saved-meal-name { font-size: var(--text-sm); color: var(--text-secondary); }
.saved-meal-cal  { font-size: 10px; color: var(--module-nutri); margin-top: 3px; }
.saved-meal-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

.saved-meal-macros { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }

.saved-macro {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}

.saved-macro-label { font-size: 9px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
.saved-macro-val   { font-size: var(--text-xs); color: var(--text-secondary); }

/* ── Planning ── */
.plan-meal-preview {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 14px;
  margin-bottom: 4px;
}

.plan-meal-name { font-size: var(--text-sm); color: var(--text-secondary); margin-top: 6px; }

.plan-days-list { display: flex; flex-direction: column; gap: 4px; max-height: 36vh; overflow-y: auto; }

.plan-day {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
  text-transform: capitalize;
}

.plan-day:hover { border-color: var(--border-default); }

.plan-day--selected {
  background: var(--accent-dim);
  border-color: var(--accent-border);
}

.plan-day-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.plan-day--selected .plan-day-label { color: var(--accent); }

.plan-day-check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid var(--border-default);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  transition: border-color var(--dur-fast) var(--ease-out);
}

.plan-day-check--on { border-color: var(--accent-border); }

/* ── Settings ── */
.settings-section { display: flex; flex-direction: column; gap: 14px; }

.settings-section-title {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
  padding-top: 4px;
}

.goal-picker {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.goal-option {
  padding: 11px 8px;
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  transition: all var(--dur-fast) var(--ease-out);
}

.goal-option:hover { color: var(--text-secondary); border-color: var(--border-default); }

.goal-option--active {
  background: var(--bg-muted);
  border-color: var(--border-strong);
  color: var(--text-primary);
}

.goals-preview {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 18px;
}

.goals-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }

.goal-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}

.goal-chip-label { font-size: 9px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
.goal-chip-value { font-size: var(--text-sm); font-weight: 300; }

/* ── Habits ── */
.habits-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px; }

.habit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

.habit-name { font-size: var(--text-sm); color: var(--text-secondary); }

.habit-meta {
  display: flex;
  gap: 10px;
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 3px;
}

.habit-form {
  padding-top: 20px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
