<template>
  <div class="travel-view">

    <!-- ── En-tête ── -->
    <header class="view-head">
      <h1 class="view-title">
        Travel,{{ ' ' }}<br class="view-break" />
        <span class="view-title-soft">{{ headSubtitle }}</span>
      </h1>
      <button v-if="currentStep !== 'form'" class="btn btn--light" @click="goBack">
        <ArrowLeft :size="16" stroke-width="2" />
        Retour
      </button>
    </header>

    <!-- ── Erreur ── -->
    <div v-if="errorMessage" class="error error--close" role="alert">
      <p>{{ errorMessage }}</p>
      <button class="error-close" aria-label="Fermer" @click="errorMessage = null">
        <X :size="16" stroke-width="2" />
      </button>
    </div>

    <!-- ══ Formulaire ══ -->
    <div v-if="currentStep === 'form'" class="form-layout">
      <section class="banner" aria-label="Nouveau voyage">
        <span class="orb orb--a" aria-hidden="true" />
        <span class="orb orb--b" aria-hidden="true" />
        <span class="orb orb--c" aria-hidden="true" />
        <h2 class="banner-title">
          Où veux-tu partir ?<br />
          <span class="banner-title-soft">L'IA prépare le voyage</span>
        </h2>
      </section>

      <form class="card form" @submit.prevent="handleGenerate">
        <div class="field-group">
          <label for="destination" class="field-label">Destination (optionnel)</label>
          <input
            id="destination"
            v-model="form.destination"
            type="text"
            class="field-input"
            placeholder="Japon, road-trip en Californie"
          />
        </div>

        <div class="dates">
          <div class="field-group">
            <label for="dateDepart" class="field-label">Départ</label>
            <input id="dateDepart" v-model="form.dateDepart" type="date" class="field-input" />
            <select v-model="departureTime" class="field-input" aria-label="Moment du départ">
              <option v-for="moment in MOMENTS" :key="moment.value" :value="moment.value">{{ moment.label }}</option>
            </select>
          </div>
          <div class="field-group">
            <label for="dateRetour" class="field-label">Retour</label>
            <input id="dateRetour" v-model="form.dateRetour" type="date" class="field-input" />
            <select v-model="returnTime" class="field-input" aria-label="Moment du retour">
              <option v-for="moment in MOMENTS" :key="moment.value" :value="moment.value">{{ moment.label }}</option>
            </select>
          </div>
        </div>

        <div class="field-group">
          <label for="budget" class="field-label">Budget total (€)</label>
          <input
            id="budget"
            v-model.number="form.budget"
            type="number"
            inputmode="numeric"
            min="0"
            step="50"
            class="field-input"
            placeholder="1500"
          />
        </div>

        <div class="abroad">
          <div>
            <p class="abroad-title">{{ isAbroad ? "Voyager à l'étranger" : 'Voyager en France' }}</p>
            <p class="card-sub">{{ isAbroad ? 'Destinations hors de France' : 'Métropole et outre-mer' }}</p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="isAbroad"
            aria-label="Voyager à l'étranger"
            class="switch"
            :class="{ 'switch--on': isAbroad }"
            @click="isAbroad = !isAbroad"
          >
            <span class="switch-thumb" />
          </button>
        </div>

        <button type="submit" class="btn btn--dark btn--wide btn--tall" :disabled="!isFormValid || isLoading">
          <Loader2 v-if="isLoading" class="spin" :size="18" />
          {{ isLoading ? 'Génération en cours…' : 'Générer mon voyage' }}
        </button>
      </form>
    </div>

    <!-- ══ Suggestions ══ -->
    <section v-else-if="currentStep === 'suggestions'" class="suggestions" aria-label="Destinations proposées">
      <div class="suggestions-grid">
        <button
          v-for="suggestion in suggestions"
          :key="suggestion.name"
          class="card suggestion"
          :disabled="isLoading"
          @click="selectSuggestion(suggestion)"
        >
          <span class="suggestion-name">{{ suggestion.name }}</span>
          <span class="suggestion-tagline">{{ suggestion.tagline }}</span>
          <span class="suggestion-tags">
            <span v-for="tag in suggestion.tags" :key="tag" class="tag">{{ tag }}</span>
          </span>
          <span v-if="suggestion.budget_estime" class="suggestion-budget">
            Environ {{ suggestion.budget_estime.toLocaleString('fr-FR') }} €
          </span>
        </button>
      </div>
      <p v-if="isLoading" class="loading">
        <Loader2 class="spin" :size="18" />
        Préparation de ton itinéraire…
      </p>
    </section>

    <!-- ══ Voyage ══ -->
    <div v-else-if="currentStep === 'planner'" class="planner">
      <section class="banner banner--planner" aria-label="Destination">
        <span class="orb orb--a" aria-hidden="true" />
        <span class="orb orb--b" aria-hidden="true" />
        <span class="orb orb--c" aria-hidden="true" />
        <h2 class="banner-title">
          {{ form.destination }},<br />
          <span class="banner-title-soft">{{ dateRange }}</span>
        </h2>
        <p class="banner-meta">
          <template v-if="tripDuration">{{ tripDuration }} jour{{ tripDuration > 1 ? 's' : '' }}, </template>{{ totalBudget.toLocaleString('fr-FR') }} € estimés
        </p>
      </section>

      <div class="segmented planner-tabs" role="tablist" aria-label="Sections du voyage">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          role="tab"
          :aria-selected="activeTab === tab.id"
          class="segmented-btn"
          :class="{ 'segmented-btn--active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >{{ tab.label }}</button>
      </div>

      <section class="card budget" :class="{ 'pane--hidden': activeTab !== 'budget' }" aria-label="Budget">
        <svg class="budget-ring" viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="15.9" class="ring-track" pathLength="100" />
          <circle
            v-for="seg in budgetSegments"
            :key="seg.category"
            cx="18"
            cy="18"
            r="15.9"
            class="ring-seg"
            pathLength="100"
            :stroke="seg.color"
            :stroke-dasharray="`${seg.percent} 100`"
            :stroke-dashoffset="-seg.offset"
          />
        </svg>
        <div class="budget-body">
          <p class="budget-total">{{ totalBudget.toLocaleString('fr-FR') }} €</p>
          <ul class="budget-list">
            <li v-for="item in budgetItems" :key="item.category">
              <span :style="{ color: item.color }">{{ item.category }}</span>
              <span>{{ item.amount.toLocaleString('fr-FR') }} €</span>
            </li>
          </ul>
        </div>
      </section>

      <div class="days" :class="{ 'pane--hidden': activeTab !== 'itinerary' }">
        <section v-for="(day, index) in itineraryDays" :key="index" class="card day">
          <p class="card-sub">{{ formatItineraryDate(form.dateDepart, index) }}</p>
          <h3 class="day-title">{{ day.titre || `Jour ${index + 1}` }}</h3>
          <div v-for="slot in daySlots(day)" :key="slot.label" class="slot">
            <span class="slot-label">{{ slot.label }}</span>
            <p class="slot-text">{{ slot.text }}</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { supabase } from '@/supabase'
import { ArrowLeft, Loader2, X } from 'lucide-vue-next'

// ── Step State ──
const currentStep = ref('form') // 'form' | 'suggestions' | 'planner'
const isLoading = ref(false)
const activeTab = ref('itinerary')
const isAbroad = ref(true)
const departureTime = ref('matin')
const returnTime = ref('matin')
const errorMessage = ref(null)

// ── Form State ──
const form = ref({
  destination: '',
  dateDepart: '',
  dateRetour: '',
  budget: null
})

// ── Tabs Config ──
const tabs = [
  { id: 'itinerary', label: 'Itinéraire' },
  { id: 'budget', label: 'Budget' }
]

const MOMENTS = [
  { value: 'matin', label: 'Matin' },
  { value: 'apres-midi', label: 'Après-midi' },
  { value: 'soir', label: 'Soir' }
]

// ── Data from API ──
const suggestions = ref([])
const budgetItems = ref([])
const itineraryDays = ref([])
const cameFromSuggestions = ref(false)

// ── Budget category → UI mapping ──
const BUDGET_UI_MAP = {
  transport:  { category: 'Transport',   color: 'var(--module-sleep)' },
  logement:   { category: 'Hébergement', color: 'var(--accent)' },
  nourriture: { category: 'Nourriture',  color: 'var(--module-windows)' },
  activites:  { category: 'Activités',   color: 'var(--module-dress)' }
}

// ── Computed ──
const isFormValid = computed(() => {
  return (
    form.value.dateDepart &&
    form.value.dateRetour &&
    form.value.budget > 0 &&
    form.value.dateRetour >= form.value.dateDepart
  )
})

const tripDuration = computed(() => {
  if (!form.value.dateDepart || !form.value.dateRetour) return null
  const start = new Date(form.value.dateDepart)
  const end = new Date(form.value.dateRetour)
  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
  return diff > 0 ? diff : null
})

const formatDayMonth = (date) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(new Date(date))

const dateRange = computed(() => {
  const start = new Date(form.value.dateDepart)
  const end = new Date(form.value.dateRetour)
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  return sameMonth
    ? `${start.getDate()} au ${formatDayMonth(end)}`
    : `${formatDayMonth(start)} au ${formatDayMonth(end)}`
})

const headSubtitle = computed(() => {
  if (currentStep.value === 'suggestions') return 'trois idées pour toi'
  if (currentStep.value === 'planner') return 'ton itinéraire'
  return 'nouveau voyage'
})

const budgetSegments = computed(() => {
  let offset = 0
  return budgetItems.value.map(item => {
    const segment = { ...item, offset }
    offset += item.percent
    return segment
  })
})

const daySlots = (day) =>
  [
    { label: 'Matin', text: day.matin },
    { label: 'Midi', text: day.midi },
    { label: 'Après-midi', text: day.apres_midi },
    { label: 'Soir', text: day.soir }
  ].filter(slot => slot.text)

const totalBudget = computed(() => budgetItems.value.reduce((sum, item) => sum + item.amount, 0))

// ── Date formatting (prevents AI hallucinated weekdays) ──
function formatItineraryDate(startDate, index) {
  const date = new Date(startDate)
  date.setDate(date.getDate() + index)
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(date)
}

// ── API Call ──
async function callGenerateTravel(destination) {
  const { data, error } = await supabase.functions.invoke('generate-travel', {
    body: {
      destination: destination || null,
      startDate: form.value.dateDepart,
      endDate: form.value.dateRetour,
      budget: form.value.budget,
      isAbroad: isAbroad.value,
      departureTime: departureTime.value,
      returnTime: returnTime.value
    }
  })

  if (error) throw new Error(error.message || "Erreur lors de l'appel à l'API.")
  if (data?.error) throw new Error(data.error)

  return data
}

// ── Transform API response → UI data ──
function applyPlannerData(data) {
  const breakdown = data.budget_breakdown || {}
  const total = Object.values(breakdown).reduce((s, v) => s + (Number(v) || 0), 0)

  budgetItems.value = Object.entries(BUDGET_UI_MAP).map(([key, ui]) => {
    const amount = Number(breakdown[key]) || 0
    return {
      ...ui,
      amount,
      percent: total > 0 ? Math.round((amount / total) * 100) : 0
    }
  })

  itineraryDays.value = (data.itinerary || []).map((day) => ({
    date: day.date || `Jour ${day.jour}`,
    titre: day.titre || '',
    matin: day.matin || '',
    midi: day.midi || '',
    apres_midi: day.apres_midi || '',
    soir: day.soir || ''
  }))
}

// ── Actions ──
const handleGenerate = async () => {
  if (!isFormValid.value) return

  errorMessage.value = null
  isLoading.value = true

  try {
    const data = await callGenerateTravel(form.value.destination.trim())

    if (data.suggestions) {
      suggestions.value = data.suggestions
      cameFromSuggestions.value = false
      currentStep.value = 'suggestions'
    } else if (data.budget_breakdown) {
      applyPlannerData(data)
      cameFromSuggestions.value = false
      activeTab.value = 'itinerary'
      currentStep.value = 'planner'
    } else {
      throw new Error("Réponse inattendue de l'IA, réessaie.")
    }
  } catch (err) {
    errorMessage.value = err.message || 'Une erreur inattendue est survenue.'
  } finally {
    isLoading.value = false
  }
}

const selectSuggestion = async (suggestion) => {
  form.value.destination = suggestion.name
  errorMessage.value = null
  isLoading.value = true

  try {
    const data = await callGenerateTravel(suggestion.name)

    if (data.budget_breakdown) {
      applyPlannerData(data)
      cameFromSuggestions.value = true
      activeTab.value = 'itinerary'
      currentStep.value = 'planner'
    } else {
      throw new Error("Réponse inattendue de l'IA, réessaie.")
    }
  } catch (err) {
    errorMessage.value = err.message || 'Une erreur inattendue est survenue.'
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  errorMessage.value = null

  if (currentStep.value === 'planner') {
    budgetItems.value = []
    itineraryDays.value = []

    if (cameFromSuggestions.value) {
      form.value.destination = ''
      currentStep.value = 'suggestions'
    } else {
      currentStep.value = 'form'
    }
  } else if (currentStep.value === 'suggestions') {
    form.value.destination = ''
    suggestions.value = []
    currentStep.value = 'form'
  }
}
</script>

<style scoped>
/* ── En-tête ── */
.view-head {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: flex-start;
}

.view-title {
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.22;
}

.view-title-soft { color: var(--text-secondary); }

/* ── Boutons ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: 0 18px;
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
.btn--soft  { background: var(--bg-overlay); color: var(--text-primary); }
.btn--light { background: var(--bg-raised); color: var(--text-primary); }
.btn--wide  { width: 100%; }

.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

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
  justify-content: center;
  gap: var(--space-2);
  min-height: 160px;
  padding: 18px;
  overflow: hidden;
  border-radius: var(--radius-lg);
}

.banner > :not(.orb) {
  position: relative;
  z-index: var(--z-raised);
}

.banner-title {
  max-width: 72%;
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.22;
}

.banner-title-soft { color: var(--text-secondary); }

.chip {
  display: inline-flex;
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--status-success);
}

.orb {
  position: absolute;
  border-radius: 50%;
  opacity: var(--orb-opacity);
  pointer-events: none;
}

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

.card-label,
.card-sub {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

/* ── Sélecteur ── */
.segmented {
  display: flex;
  gap: 2px;
  padding: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--bg-overlay);
}

.segmented-btn {
  flex: 1;
  min-height: 44px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-pill);
  background: none;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
  cursor: pointer;
}

.segmented-btn--active {
  background: var(--action);
  color: var(--on-action);
}

.travel-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 1480px;
  margin: 0 auto;
}

.btn--tall { min-height: 56px; font-size: var(--text-sm); }

.error--close {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.error-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
}

.banner {
  background: var(--aurore-travel);
}

.orb--a { top: -46px; right: -30px; width: 130px; height: 130px; background: var(--orb-ciel); }
.orb--b { top: 56px; right: -26px; width: 70px; height: 70px; background: var(--orb-peche); }
.orb--c { display: none; }

.banner-meta {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

/* ── Formulaire ── */
.form-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
}

.form { gap: var(--space-3); }

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
  min-width: 0;
  min-height: 48px;
  padding: 0 var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-overlay);
  font-family: var(--font-sans);
  font-size: var(--text-md);
  color: var(--text-primary);
  outline: none;
}

.field-input:focus { border-color: var(--accent); }
.field-input::placeholder { color: var(--text-secondary); }

.dates {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

.abroad {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--bg-overlay);
}

.abroad-title { font-size: var(--text-sm); font-weight: 500; }

.switch {
  display: flex;
  align-items: center;
  width: 52px;
  height: 32px;
  flex-shrink: 0;
  padding: 0 4px;
  border: none;
  border-radius: var(--radius-pill);
  position: relative;
  background: var(--bg-muted);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out);
}

.switch::after {
  content: '';
  position: absolute;
  inset: -6px 0;
}

.switch-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--on-rail);
  box-shadow: var(--shadow-sm);
  transition: transform var(--dur-fast) var(--ease-out);
}

.switch--on { background: var(--accent); }
.switch--on .switch-thumb { transform: translateX(20px); }

/* ── Suggestions ── */
.suggestions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.suggestions-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
}

.suggestion {
  align-items: flex-start;
  border: none;
  font-family: var(--font-sans);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out);
}

.suggestion:active { transform: scale(0.985); }
.suggestion:disabled { opacity: 0.6; cursor: not-allowed; }

.suggestion-name {
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
}

.suggestion-tagline {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.suggestion-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.tag {
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  background: var(--module-travel-dim);
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--module-travel);
}

.suggestion-budget {
  font-size: var(--text-xs);
  font-weight: 600;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-secondary);
}

/* ── Voyage ── */
.planner {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
}

.pane--hidden { display: none; }

.budget {
  flex-direction: row;
  align-items: center;
  gap: var(--space-4);
}

.budget-ring {
  display: block;
  width: 110px;
  height: 110px;
  flex-shrink: 0;
  transform: rotate(-90deg);
}

.ring-track,
.ring-seg {
  fill: none;
  stroke-width: 3.2;
}

.ring-track { stroke: var(--bg-overlay); }

.budget-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.budget-total {
  font-size: var(--text-2xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}

.budget-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0;
  list-style: none;
  font-size: var(--text-2xs);
  font-weight: 500;
}

.budget-list li {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  font-variant-numeric: tabular-nums;
}

.days {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
}

.day { gap: var(--space-1); }
.day .card-sub::first-letter { text-transform: uppercase; }

.day-title {
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.slot {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: var(--space-2) 0;
  border-top: 1px solid var(--border-subtle);
}

.slot-label {
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  background: var(--module-travel-dim);
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--module-travel);
}

.slot-text {
  font-size: var(--text-sm);
  line-height: 1.45;
}

@media (min-width: 768px) {
  .view-head {
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

  .banner { padding: var(--space-6) 28px; }
  .card { padding: 20px; }
  .suggestions-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .days { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (min-width: 1100px) {
  .travel-view { gap: var(--space-4); }

  .form-layout {
    grid-template-columns: minmax(0, 1fr) 520px;
    gap: var(--space-4);
  }

  .form-layout .banner { align-self: stretch; min-height: 560px; justify-content: flex-start; }
  .form-layout .orb--a { top: auto; right: -40px; bottom: -60px; width: 340px; height: 340px; }
  .form-layout .orb--b { top: auto; right: 280px; bottom: 60px; width: 150px; height: 150px; }
  .form-layout .orb--c { display: block; right: 60px; bottom: 300px; width: 80px; height: 80px; background: var(--orb-rose); }

  .planner {
    grid-template-columns: minmax(0, 1fr) 430px;
    gap: var(--space-4);
  }

  .planner-tabs { display: none; }
  .pane--hidden { display: flex; }
  .days.pane--hidden { display: grid; }
  .days { grid-column: 1 / -1; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--space-4); }

  .banner--planner { min-height: 240px; }
  .banner--planner .banner-title { font-size: var(--text-3xl); font-weight: 700; letter-spacing: -0.03em; line-height: 1.1; }
  .banner--planner .orb--a { top: -60px; right: 110px; width: 240px; height: 240px; }
  .banner--planner .orb--b { top: 90px; right: 20px; width: 130px; height: 130px; }
  .banner--planner .orb--c { display: block; top: 160px; right: 320px; width: 60px; height: 60px; background: var(--orb-rose); }

  .budget-ring { width: 150px; height: 150px; }
}
</style>
