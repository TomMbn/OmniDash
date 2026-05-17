<template>
  <div class="travel-view">
    <!-- Header -->
    <header class="view-header">
      <div class="module-title-group">
        <div class="module-icon">
          <Plane :size="18" stroke-width="1.75" />
        </div>
        <div>
          <h1 class="view-title">Travel Planner</h1>
          <p class="view-sub">Planifiez votre prochain voyage avec l'IA</p>
        </div>
      </div>

      <button v-if="currentStep !== 'form'" @click="goBack" class="back-btn">
        <ArrowLeft :size="14" stroke-width="2" />
        Retour
      </button>
    </header>

    <!-- Error Banner -->
    <div v-if="errorMessage" class="error-banner">
      <AlertCircle :size="16" class="error-icon" stroke-width="2" />
      <div class="error-body">
        <p class="error-title">Une erreur est survenue</p>
        <p class="error-msg">{{ errorMessage }}</p>
      </div>
      <button @click="errorMessage = null" class="error-close">
        <X :size="14" stroke-width="2" />
      </button>
    </div>

    <!-- ══ STEP 1 : FORMULAIRE ══ -->
    <form v-if="currentStep === 'form'" @submit.prevent="handleGenerate" class="form-card">
      <!-- Destination -->
      <div class="field-group">
        <label for="destination" class="field-label">
          Destination <span class="field-optional">(optionnel)</span>
        </label>
        <div class="input-wrap">
          <MapPin :size="16" class="input-icon" />
          <input
            id="destination"
            v-model="form.destination"
            type="text"
            placeholder="Ex : Japon, Road-trip Californie, Surprenez-moi…"
            class="field-input field-input--icon"
          />
        </div>
      </div>

      <!-- Dates -->
      <div class="dates-grid">
        <div class="field-group">
          <label for="dateDepart" class="field-label">Date de départ</label>
          <div class="input-wrap">
            <CalendarDays :size="16" class="input-icon" />
            <input
              id="dateDepart"
              v-model="form.dateDepart"
              type="date"
              class="field-input field-input--icon"
            />
          </div>
          <select v-model="departureTime" class="time-select">
            <option value="matin">☀️ Matin</option>
            <option value="apres-midi">🌤️ Après-midi</option>
            <option value="soir">🌙 Soir</option>
          </select>
        </div>
        <div class="field-group">
          <label for="dateRetour" class="field-label">Date de retour</label>
          <div class="input-wrap">
            <CalendarDays :size="16" class="input-icon" />
            <input
              id="dateRetour"
              v-model="form.dateRetour"
              type="date"
              class="field-input field-input--icon"
            />
          </div>
          <select v-model="returnTime" class="time-select">
            <option value="matin">☀️ Matin</option>
            <option value="apres-midi">🌤️ Après-midi</option>
            <option value="soir">🌙 Soir</option>
          </select>
        </div>
      </div>

      <!-- Budget -->
      <div class="field-group">
        <label for="budget" class="field-label">Budget total (€)</label>
        <div class="input-wrap">
          <Euro :size="16" class="input-icon" />
          <input
            id="budget"
            v-model.number="form.budget"
            type="number"
            min="0"
            step="50"
            placeholder="1500"
            class="field-input field-input--icon"
          />
        </div>
      </div>

      <!-- Trip summary tags -->
      <div v-if="tripSummary" class="trip-tags">
        <span v-for="tag in tripSummary" :key="tag.label" class="trip-tag">
          <component :is="tag.icon" :size="11" />
          {{ tag.label }}
        </span>
      </div>

      <!-- Abroad toggle -->
      <div class="toggle-row">
        <div class="toggle-info">
          <div class="toggle-globe">
            <Globe :size="15" stroke-width="1.75" />
          </div>
          <div>
            <p class="toggle-label">{{ isAbroad ? "Voyager à l'étranger" : 'Voyager en France' }}</p>
            <p class="toggle-sub">{{ isAbroad ? 'Destinations hors de France' : 'France métropolitaine & outre-mer' }}</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          :aria-checked="isAbroad"
          @click="isAbroad = !isAbroad"
          class="toggle-switch"
          :class="{ 'toggle-switch--on': isAbroad }"
        >
          <span class="toggle-thumb" :class="{ 'toggle-thumb--on': isAbroad }" />
        </button>
      </div>

      <!-- Submit -->
      <button type="submit" :disabled="!isFormValid || isLoading" class="btn-generate">
        <Sparkles v-if="!isLoading" :size="16" stroke-width="1.75" />
        <Loader2 v-else class="spin" :size="16" />
        <span>{{ isLoading ? 'Génération en cours…' : 'Générer mon voyage' }}</span>
      </button>
    </form>

    <!-- ══ STEP 2 : SUGGESTIONS ══ -->
    <div v-else-if="currentStep === 'suggestions'" class="suggestions-card">
      <div class="suggestions-header">
        <p class="suggestions-eyebrow">Pas d'idée ?</p>
        <h3 class="suggestions-title">Voici 3 destinations pour vous</h3>
        <p class="suggestions-sub">Cliquez sur celle qui vous inspire le plus</p>
      </div>

      <div class="suggestions-grid">
        <button
          v-for="suggestion in suggestions"
          :key="suggestion.name"
          @click="selectSuggestion(suggestion)"
          :disabled="isLoading"
          class="suggestion-btn"
        >
          <span class="suggestion-emoji-bg">{{ suggestion.emoji }}</span>
          <div class="suggestion-body">
            <span class="suggestion-emoji">{{ suggestion.emoji }}</span>
            <p class="suggestion-name">{{ suggestion.name }}</p>
            <p class="suggestion-tagline">{{ suggestion.tagline }}</p>
            <div class="suggestion-tags">
              <span v-for="tag in suggestion.tags" :key="tag" class="suggestion-tag">{{ tag }}</span>
            </div>
            <p v-if="suggestion.budget_estime" class="suggestion-budget">
              ~{{ suggestion.budget_estime.toLocaleString('fr-FR') }} €
            </p>
          </div>
        </button>
      </div>

      <div v-if="isLoading" class="suggestions-loading">
        <Loader2 class="spin" :size="18" />
        <span>Préparation de votre itinéraire…</span>
      </div>
    </div>

    <!-- ══ STEP 3 : PLANNER ══ -->
    <div v-else-if="currentStep === 'planner'" class="planner-card">
      <!-- Destination header -->
      <div class="planner-header">
        <div class="planner-dest-icon">
          <MapPin :size="16" stroke-width="1.75" />
        </div>
        <div>
          <p class="planner-dest-label">Destination</p>
          <p class="planner-dest-name">{{ form.destination }}</p>
        </div>
        <div v-if="tripDuration" class="planner-duration">
          <Clock :size="11" stroke-width="2" />
          {{ tripDuration }} jour{{ tripDuration > 1 ? 's' : '' }}
        </div>
      </div>

      <!-- Planner tabs -->
      <div class="planner-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="planner-tab"
          :class="{ 'planner-tab--active': activeTab === tab.id }"
        >
          <component :is="tab.icon" :size="14" stroke-width="2" />
          {{ tab.label }}
          <div v-if="activeTab === tab.id" class="tab-indicator" />
        </button>
      </div>

      <!-- Budget tab -->
      <div v-if="activeTab === 'budget'" class="planner-content">
        <div class="budget-total">
          <span class="budget-total-label">Total estimé</span>
          <span class="budget-total-value">{{ totalBudget.toLocaleString('fr-FR') }} €</span>
        </div>
        <div class="budget-grid">
          <div v-for="item in budgetItems" :key="item.category" class="budget-item">
            <div class="budget-icon" :style="item.iconStyle">
              <component :is="item.icon" :size="18" stroke-width="1.75" />
            </div>
            <div class="budget-item-body">
              <p class="budget-cat">{{ item.category }}</p>
              <p class="budget-amount">{{ item.amount.toLocaleString('fr-FR') }} €</p>
            </div>
            <span class="budget-pct">{{ item.percent }}%</span>
          </div>
        </div>
      </div>

      <!-- Itinerary tab -->
      <div v-if="activeTab === 'itinerary'" class="planner-content">
        <div class="itinerary-list">
          <div
            v-for="(day, index) in itineraryDays"
            :key="index"
            class="itinerary-day"
          >
            <div class="day-timeline">
              <div class="day-dot">{{ index + 1 }}</div>
              <div v-if="index < itineraryDays.length - 1" class="day-line" />
            </div>
            <div class="day-card">
              <p class="day-date">{{ formatItineraryDate(form.dateDepart, index) }}</p>
              <p class="day-title">{{ day.titre }}</p>
              <div class="day-slots">
                <div v-if="day.matin" class="day-slot">
                  <span class="slot-label">Matin</span>
                  <p class="slot-text">{{ day.matin }}</p>
                </div>
                <div v-if="day.midi" class="day-slot">
                  <span class="slot-label">Midi</span>
                  <p class="slot-text">{{ day.midi }}</p>
                </div>
                <div v-if="day.apres_midi" class="day-slot">
                  <span class="slot-label">A-midi</span>
                  <p class="slot-text">{{ day.apres_midi }}</p>
                </div>
                <div v-if="day.soir" class="day-slot">
                  <span class="slot-label">Soir</span>
                  <p class="slot-text">{{ day.soir }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { supabase } from '@/supabase'
import {
  Plane,
  MapPin,
  CalendarDays,
  Euro,
  Sparkles,
  Loader2,
  Route,
  Wallet,
  Clock,
  ArrowLeft,
  TrainFront,
  BedDouble,
  UtensilsCrossed,
  Ticket,
  AlertCircle,
  X,
  Globe
} from 'lucide-vue-next'

// ── Step State ──
const currentStep = ref('form') // 'form' | 'suggestions' | 'planner'
const isLoading = ref(false)
const activeTab = ref('budget')
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
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'itinerary', label: 'Itinéraire', icon: Route }
]

// ── Data from API ──
const suggestions = ref([])
const budgetItems = ref([])
const itineraryDays = ref([])
const cameFromSuggestions = ref(false)

// ── Budget category → UI mapping ──
const BUDGET_UI_MAP = {
  transport:  { category: 'Transport',   icon: TrainFront,      iconStyle: { background: 'rgba(122,145,184,0.12)', color: '#7A91B8' } },
  logement:   { category: 'Hébergement', icon: BedDouble,       iconStyle: { background: 'rgba(160,139,106,0.12)', color: '#A08B6A' } },
  nourriture: { category: 'Nourriture',  icon: UtensilsCrossed, iconStyle: { background: 'rgba(125,173,138,0.12)', color: '#7DAD8A' } },
  activites:  { category: 'Activités',   icon: Ticket,          iconStyle: { background: 'rgba(212,151,106,0.12)', color: '#D4976A' } }
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

const tripSummary = computed(() => {
  const tags = []
  if (form.value.destination.trim()) {
    tags.push({ label: form.value.destination, icon: MapPin })
  }
  if (tripDuration.value) {
    tags.push({ label: `${tripDuration.value} jour${tripDuration.value > 1 ? 's' : ''}`, icon: Clock })
  }
  if (form.value.budget > 0) {
    tags.push({ label: `${form.value.budget.toLocaleString('fr-FR')} €`, icon: Euro })
  }
  return tags.length > 0 ? tags : null
})

const totalBudget = computed(() => budgetItems.value.reduce((sum, item) => sum + item.amount, 0))

// ── Date formatting (prevents AI hallucinated weekdays) ──
function formatItineraryDate(startDate, index) {
  const date = new Date(startDate)
  date.setDate(date.getDate() + index)
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  }).format(date).toUpperCase()
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
      activeTab.value = 'budget'
      currentStep.value = 'planner'
    } else {
      throw new Error("Réponse inattendue de l'IA. Veuillez réessayer.")
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
      activeTab.value = 'budget'
      currentStep.value = 'planner'
    } else {
      throw new Error("Réponse inattendue de l'IA. Veuillez réessayer.")
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
.travel-view {
  max-width: 720px;
  margin: 0 auto;
  padding: 8px 0 100px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  user-select: none;
}

/* ── Header ── */
.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 2px;
}

.module-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.module-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  background: var(--module-travel-dim);
  border: 1px solid var(--module-travel-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--module-travel);
}

.view-title {
  font-family: var(--font-serif);
  font-size: var(--text-2xl);
  font-weight: 400;
  color: var(--text-primary);
  margin: 0;
}

.view-sub {
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  margin-top: 1px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  flex-shrink: 0;
}

.back-btn:hover {
  border-color: var(--border-default);
  color: var(--text-secondary);
}

/* ── Error banner ── */
.error-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.18);
  border-radius: var(--radius-md);
}

.error-icon { color: #EF4444; margin-top: 1px; flex-shrink: 0; }

.error-body { flex: 1; min-width: 0; }

.error-title {
  font-size: 11px;
  font-weight: 500;
  color: #EF4444;
  margin: 0;
}

.error-msg {
  font-size: 11px;
  color: #EF4444;
  opacity: 0.75;
  margin: 3px 0 0;
}

.error-close {
  color: rgba(239, 68, 68, 0.5);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  transition: color var(--dur-fast) var(--ease-out);
}

.error-close:hover { color: #EF4444; }

/* ── Form card ── */
.form-card {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Field groups ── */
.field-group { display: flex; flex-direction: column; gap: 8px; }

.field-label {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
}

.field-optional {
  font-size: 10px;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--text-muted);
  opacity: 0.6;
}

.input-wrap { position: relative; }

.input-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

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
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
  box-sizing: border-box;
  color-scheme: dark;
}

.field-input--icon { padding-left: 40px; }

.field-input:focus {
  border-color: var(--module-travel-border);
  box-shadow: 0 0 0 3px rgba(160, 139, 106, 0.08);
}

.field-input::placeholder { color: var(--text-muted); opacity: 0.45; }

/* ── Dates grid ── */
.dates-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 480px) {
  .dates-grid { grid-template-columns: 1fr; }
}

.time-select {
  margin-top: 6px;
  width: 100%;
  padding: 9px 14px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  outline: none;
  cursor: pointer;
  appearance: none;
  transition: border-color var(--dur-fast) var(--ease-out);
  color-scheme: dark;
}

.time-select:focus { border-color: var(--module-travel-border); }

/* ── Trip summary tags ── */
.trip-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.trip-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: var(--module-travel-dim);
  border: 1px solid var(--module-travel-border);
  border-radius: var(--radius-pill);
  font-size: 10px;
  font-weight: 500;
  color: var(--module-travel);
}

/* ── Abroad toggle ── */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

.toggle-info { display: flex; align-items: center; gap: 12px; }

.toggle-globe {
  width: 32px;
  height: 32px;
  background: var(--module-travel-dim);
  border: 1px solid var(--module-travel-border);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--module-travel);
  flex-shrink: 0;
}

.toggle-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
}

.toggle-sub {
  font-size: 10px;
  color: var(--text-muted);
  margin: 2px 0 0;
}

.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  background: var(--bg-muted);
  border-radius: 999px;
  flex-shrink: 0;
  cursor: pointer;
  border: none;
  transition: background var(--dur-fast) var(--ease-out);
}

.toggle-switch--on { background: var(--module-travel); }

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  background: var(--text-primary);
  border-radius: 50%;
  transition: transform var(--dur-fast) var(--ease-out);
}

.toggle-thumb--on { transform: translateX(20px); }

/* ── Generate button ── */
.btn-generate {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 15px 20px;
  background: var(--module-travel);
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--bg-base);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  user-select: none;
}

.btn-generate:hover:not(:disabled) { filter: brightness(1.08); }
.btn-generate:active:not(:disabled) { transform: scale(0.98); }
.btn-generate:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── Suggestions card ── */
.suggestions-card {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.suggestions-header { text-align: center; }

.suggestions-eyebrow {
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--module-travel);
  margin: 0 0 8px;
}

.suggestions-title {
  font-family: var(--font-serif);
  font-size: var(--text-xl);
  font-weight: 400;
  color: var(--text-primary);
  margin: 0 0 6px;
}

.suggestions-sub {
  font-size: 11px;
  color: var(--text-muted);
  margin: 0;
}

.suggestions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

@media (max-width: 560px) {
  .suggestions-grid { grid-template-columns: 1fr; }
}

.suggestion-btn {
  position: relative;
  overflow: hidden;
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 20px 18px;
  text-align: left;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}

.suggestion-btn:hover:not(:disabled) {
  border-color: var(--module-travel-border);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.suggestion-btn:active:not(:disabled) { transform: scale(0.98); }
.suggestion-btn:disabled { opacity: 0.5; pointer-events: none; }

.suggestion-emoji-bg {
  position: absolute;
  right: -4px;
  top: -4px;
  font-size: 48px;
  opacity: 0.10;
  pointer-events: none;
  transition: opacity var(--dur-fast) var(--ease-out);
}

.suggestion-btn:hover .suggestion-emoji-bg { opacity: 0.18; }

.suggestion-body { position: relative; }

.suggestion-emoji {
  display: block;
  font-size: 24px;
  margin-bottom: 10px;
}

.suggestion-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.suggestion-tagline {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.5;
  margin: 0 0 10px;
}

.suggestion-tags { display: flex; flex-wrap: wrap; gap: 4px; }

.suggestion-tag {
  padding: 2px 7px;
  background: var(--module-travel-dim);
  border: 1px solid var(--module-travel-border);
  border-radius: var(--radius-pill);
  font-size: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--module-travel);
}

.suggestion-budget {
  font-size: 10px;
  color: var(--text-muted);
  opacity: 0.6;
  margin: 8px 0 0;
}

.suggestions-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 12px;
  color: var(--module-travel);
}

/* ── Planner card ── */
.planner-card {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.planner-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 24px 0;
}

.planner-dest-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  background: var(--module-travel-dim);
  border: 1px solid var(--module-travel-border);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--module-travel);
}

.planner-dest-label {
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--text-muted);
  margin: 0 0 3px;
}

.planner-dest-name {
  font-size: var(--text-md);
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
}

.planner-duration {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: var(--module-travel-dim);
  border: 1px solid var(--module-travel-border);
  border-radius: var(--radius-pill);
  font-size: 10px;
  font-weight: 500;
  color: var(--module-travel);
  flex-shrink: 0;
}

/* ── Planner tabs ── */
.planner-tabs {
  display: flex;
  border-top: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
  margin-top: 20px;
}

.planner-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 14px;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  position: relative;
  transition: all var(--dur-fast) var(--ease-out);
}

.planner-tab--active { color: var(--module-travel); }

.planner-tab:not(.planner-tab--active):hover {
  color: var(--text-secondary);
  background: var(--bg-overlay);
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background: var(--module-travel);
  border-radius: 999px;
}

/* ── Planner content ── */
.planner-content { padding: 24px; }

/* Budget tab */
.budget-total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
}

.budget-total-label {
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--text-muted);
}

.budget-total-value {
  font-family: var(--font-serif);
  font-size: var(--text-xl);
  color: var(--text-primary);
}

.budget-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

@media (max-width: 480px) {
  .budget-grid { grid-template-columns: 1fr; }
}

.budget-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

.budget-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.budget-item-body { flex: 1; min-width: 0; }

.budget-cat {
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  margin: 0 0 4px;
}

.budget-amount {
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  color: var(--text-primary);
  margin: 0;
}

.budget-pct {
  font-size: 10px;
  font-weight: 500;
  color: var(--text-muted);
  opacity: 0.6;
  flex-shrink: 0;
}

/* Itinerary tab */
.itinerary-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.itinerary-day {
  display: flex;
  gap: 14px;
  padding-bottom: 16px;
}

.itinerary-day:last-child { padding-bottom: 0; }

.day-timeline {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.day-dot {
  width: 24px;
  height: 24px;
  background: var(--module-travel);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 600;
  color: var(--bg-base);
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(160, 139, 106, 0.3);
}

.day-line {
  flex: 1;
  width: 1px;
  background: var(--module-travel-border);
  margin-top: 6px;
  min-height: 20px;
}

.day-card {
  flex: 1;
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.day-date {
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--module-travel);
  margin: 0;
}

.day-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
}

.day-slots {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

@media (max-width: 480px) {
  .day-slots { grid-template-columns: 1fr; }
}

.day-slot { display: flex; gap: 8px; align-items: flex-start; }

.slot-label {
  font-size: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  flex-shrink: 0;
  padding-top: 2px;
  width: 36px;
}

.slot-text {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

/* ── Spinner ── */
.spin { animation: spin 0.8s linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }

/* Remove number input arrows */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
input[type=number] { -moz-appearance: textfield; appearance: textfield; }
</style>
