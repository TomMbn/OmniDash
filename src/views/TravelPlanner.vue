<template>
  <div class="animate-fade-in max-w-4xl mx-auto pb-24 px-4 sm:px-6 lg:px-8 select-none">
    <!-- Header -->
    <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 md:mb-12 pt-4 md:pt-6">
      <div>
        <h2 class="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div class="p-2 md:p-2.5 bg-amber-500 rounded-xl md:rounded-2xl text-white shadow-lg shadow-amber-100/50">
            <Plane :size="20" stroke-width="2.5" />
          </div>
          Travel Planner
        </h2>
        <p class="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 ml-1">Planifiez votre prochain voyage avec l'IA</p>
      </div>

      <!-- Bouton retour (visible uniquement si pas à l'étape form) -->
      <button
        v-if="currentStep !== 'form'"
        @click="goBack"
        class="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
      >
        <ArrowLeft :size="14" stroke-width="3" />
        Retour
      </button>
    </header>

    <!-- Error Banner -->
    <div
      v-if="errorMessage"
      class="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600"
    >
      <AlertCircle :size="18" class="mt-0.5 shrink-0" stroke-width="2.5" />
      <div class="flex-1 min-w-0">
        <p class="text-xs font-bold">Une erreur est survenue</p>
        <p class="text-xs font-medium mt-0.5 opacity-80">{{ errorMessage }}</p>
      </div>
      <button @click="errorMessage = null" class="text-red-300 hover:text-red-500 transition-colors">
        <X :size="16" stroke-width="2.5" />
      </button>
    </div>

    <!-- ════════════════════════════════════════════════════ -->
    <!-- STEP 1 : FORMULAIRE                                 -->
    <!-- ════════════════════════════════════════════════════ -->
    <form
      v-if="currentStep === 'form'"
      @submit.prevent="handleGenerate"
      class="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 p-6 md:p-8 shadow-2xl shadow-slate-100/30 space-y-6"
    >
      <!-- Destination (optionnel) -->
      <div>
        <label for="destination" class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
          Destination <span class="text-slate-300 normal-case tracking-normal">(optionnel)</span>
        </label>
        <div class="relative">
          <MapPin :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
          <input
            id="destination"
            v-model="form.destination"
            type="text"
            placeholder="Ex : Japon, Road-trip Californie, Surprenez-moi…"
            class="w-full pl-11 pr-4 py-3.5 bg-slate-50/80 border border-slate-100 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all"
          />
        </div>
      </div>

      <!-- Dates + Moments -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label for="dateDepart" class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
            Date de départ
          </label>
          <div class="relative">
            <CalendarDays :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
            <input
              id="dateDepart"
              v-model="form.dateDepart"
              type="date"
              class="w-full pl-11 pr-4 py-3.5 bg-slate-50/80 border border-slate-100 rounded-2xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all"
            />
          </div>
          <select
            v-model="departureTime"
            class="mt-2 w-full px-4 py-2.5 bg-slate-50/80 border border-slate-100 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all appearance-none cursor-pointer"
          >
            <option value="matin">☀️ Matin</option>
            <option value="apres-midi">🌤️ Après-midi</option>
            <option value="soir">🌙 Soir</option>
          </select>
        </div>
        <div>
          <label for="dateRetour" class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
            Date de retour
          </label>
          <div class="relative">
            <CalendarDays :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
            <input
              id="dateRetour"
              v-model="form.dateRetour"
              type="date"
              class="w-full pl-11 pr-4 py-3.5 bg-slate-50/80 border border-slate-100 rounded-2xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all"
            />
          </div>
          <select
            v-model="returnTime"
            class="mt-2 w-full px-4 py-2.5 bg-slate-50/80 border border-slate-100 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all appearance-none cursor-pointer"
          >
            <option value="matin">☀️ Matin</option>
            <option value="apres-midi">🌤️ Après-midi</option>
            <option value="soir">🌙 Soir</option>
          </select>
        </div>
      </div>

      <!-- Budget -->
      <div>
        <label for="budget" class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
          Budget total (€)
        </label>
        <div class="relative">
          <Euro :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
          <input
            id="budget"
            v-model.number="form.budget"
            type="number"
            min="0"
            step="50"
            placeholder="1500"
            class="w-full pl-11 pr-4 py-3.5 bg-slate-50/80 border border-slate-100 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all"
          />
        </div>
      </div>

      <!-- Résumé rapide -->
      <div v-if="tripSummary" class="flex flex-wrap gap-3 pt-2">
        <span v-for="tag in tripSummary" :key="tag.label" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs font-bold">
          <component :is="tag.icon" :size="12" stroke-width="2.5" />
          {{ tag.label }}
        </span>
      </div>

      <!-- Toggle Étranger / France -->
      <div class="flex items-center justify-between p-4 bg-slate-50/80 border border-slate-100 rounded-2xl">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-amber-50 rounded-xl">
            <Globe :size="16" class="text-amber-600" stroke-width="2.5" />
          </div>
          <div>
            <p class="text-xs font-bold text-slate-700">{{ isAbroad ? 'Voyager à l\'étranger' : 'Voyager en France' }}</p>
            <p class="text-[10px] text-slate-400 font-medium mt-0.5">{{ isAbroad ? 'Destinations hors de France' : 'France métropolitaine & outre-mer' }}</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          :aria-checked="isAbroad"
          @click="isAbroad = !isAbroad"
          class="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:ring-offset-2"
          :class="isAbroad ? 'bg-amber-500' : 'bg-slate-200'"
        >
          <span
            class="inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200"
            :class="isAbroad ? 'translate-x-6' : 'translate-x-1'"
          />
        </button>
      </div>

      <!-- CTA -->
      <button
        type="submit"
        :disabled="!isFormValid || isLoading"
        class="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-200/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none group"
      >
        <Sparkles :size="18" class="group-hover:rotate-12 transition-transform" stroke-width="2.5" />
        <span v-if="!isLoading">Générer mon voyage</span>
        <span v-else class="flex items-center gap-2">
          <Loader2 :size="18" class="animate-spin" />
          Génération en cours…
        </span>
      </button>
    </form>

    <!-- ════════════════════════════════════════════════════ -->
    <!-- STEP 2 : SUGGESTIONS DE DESTINATIONS                -->
    <!-- ════════════════════════════════════════════════════ -->
    <div
      v-else-if="currentStep === 'suggestions'"
      class="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 p-6 md:p-8 shadow-2xl shadow-slate-100/30 space-y-6"
    >
      <div class="text-center mb-2">
        <p class="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em]">Pas d'idée ?</p>
        <h3 class="text-lg md:text-xl font-black text-slate-900 mt-1">Voici 3 destinations pour vous</h3>
        <p class="text-slate-400 text-xs font-medium mt-1">Cliquez sur celle qui vous inspire le plus</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          v-for="suggestion in suggestions"
          :key="suggestion.name"
          @click="selectSuggestion(suggestion)"
          :disabled="isLoading"
          class="group relative overflow-hidden rounded-2xl border border-slate-100 p-5 text-left transition-all hover:border-amber-200 hover:shadow-lg hover:shadow-amber-100/30 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
        >
          <!-- Emoji background -->
          <span class="absolute -right-2 -top-2 text-5xl opacity-15 group-hover:opacity-25 transition-opacity">{{ suggestion.emoji }}</span>

          <div class="relative z-10">
            <span class="text-2xl mb-3 block">{{ suggestion.emoji }}</span>
            <p class="text-sm font-black text-slate-900">{{ suggestion.name }}</p>
            <p class="text-xs text-slate-400 font-medium mt-1 leading-relaxed">{{ suggestion.tagline }}</p>
            <div class="flex flex-wrap gap-1.5 mt-3">
              <span
                v-for="tag in suggestion.tags"
                :key="tag"
                class="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold uppercase tracking-wider"
              >
                {{ tag }}
              </span>
            </div>
            <p v-if="suggestion.budget_estime" class="text-[10px] font-bold text-slate-300 mt-3">
              ~{{ suggestion.budget_estime.toLocaleString('fr-FR') }} €
            </p>
          </div>
        </button>
      </div>

      <!-- Loading overlay -->
      <div v-if="isLoading" class="flex items-center justify-center gap-3 pt-4 text-amber-600">
        <Loader2 :size="20" class="animate-spin" />
        <span class="text-sm font-bold">Préparation de votre itinéraire…</span>
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════ -->
    <!-- STEP 3 : PLANNER (Budget + Itinéraire)              -->
    <!-- ════════════════════════════════════════════════════ -->
    <div
      v-else-if="currentStep === 'planner'"
      class="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-100/30 overflow-hidden"
    >
      <!-- Destination choisie -->
      <div class="p-6 md:p-8 pb-0 md:pb-0">
        <div class="flex items-center gap-3 mb-6">
          <div class="p-2 bg-amber-50 rounded-xl">
            <MapPin :size="18" class="text-amber-600" stroke-width="2.5" />
          </div>
          <div>
            <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Destination</p>
            <p class="text-base font-black text-slate-900">{{ form.destination }}</p>
          </div>
          <div v-if="tripDuration" class="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs font-bold">
            <Clock :size="12" stroke-width="2.5" />
            {{ tripDuration }} jour{{ tripDuration > 1 ? 's' : '' }}
          </div>
        </div>
      </div>

      <!-- Onglets -->
      <div class="flex border-b border-slate-100">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black uppercase tracking-widest transition-all relative"
          :class="activeTab === tab.id
            ? 'text-amber-600 bg-amber-50/50'
            : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50/50'"
        >
          <component :is="tab.icon" :size="16" stroke-width="2.5" />
          {{ tab.label }}
          <div
            v-if="activeTab === tab.id"
            class="absolute bottom-0 left-4 right-4 h-0.5 bg-amber-500 rounded-full"
          />
        </button>
      </div>

      <!-- Contenu des onglets -->
      <div class="p-6 md:p-8">
        <!-- Budget Prévisionnel -->
        <div v-if="activeTab === 'budget'" class="space-y-4">
          <!-- Total -->
          <div class="flex items-baseline justify-between mb-2">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total estimé</span>
            <span class="text-xl font-black text-slate-900">{{ totalBudget.toLocaleString('fr-FR') }} €</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              v-for="item in budgetItems"
              :key="item.category"
              class="p-5 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center gap-4"
            >
              <div class="p-2.5 rounded-xl" :class="item.bgColor">
                <component :is="item.icon" :size="20" :class="item.textColor" stroke-width="2.5" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ item.category }}</p>
                <p class="text-lg font-black text-slate-900">{{ item.amount.toLocaleString('fr-FR') }} €</p>
              </div>
              <span class="text-xs font-bold text-slate-300">{{ item.percent }}%</span>
            </div>
          </div>
        </div>

        <!-- Itinéraire -->
        <div v-if="activeTab === 'itinerary'" class="space-y-4">
          <div
            v-for="(day, index) in itineraryDays"
            :key="index"
            class="relative pl-8 pb-6 last:pb-0"
          >
            <div v-if="index < itineraryDays.length - 1" class="absolute left-[11px] top-6 w-0.5 h-full bg-amber-100 rounded-full" />
            <div class="absolute left-0 top-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-md shadow-amber-200/50">
              {{ index + 1 }}
            </div>
            <div class="bg-slate-50/80 rounded-2xl border border-slate-100 p-4 space-y-2">
              <p class="text-[10px] font-black text-amber-600 uppercase tracking-widest">{{ formatItineraryDate(form.dateDepart, index) }}</p>
              <p class="text-sm font-bold text-slate-900">{{ day.titre }}</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                <div v-if="day.matin" class="flex items-start gap-2">
                  <span class="text-[10px] font-black text-slate-300 uppercase w-12 shrink-0 pt-px">Matin</span>
                  <p class="text-xs text-slate-500 leading-relaxed">{{ day.matin }}</p>
                </div>
                <div v-if="day.midi" class="flex items-start gap-2">
                  <span class="text-[10px] font-black text-slate-300 uppercase w-12 shrink-0 pt-px">Midi</span>
                  <p class="text-xs text-slate-500 leading-relaxed">{{ day.midi }}</p>
                </div>
                <div v-if="day.apres_midi" class="flex items-start gap-2">
                  <span class="text-[10px] font-black text-slate-300 uppercase w-12 shrink-0 pt-px">A-midi</span>
                  <p class="text-xs text-slate-500 leading-relaxed">{{ day.apres_midi }}</p>
                </div>
                <div v-if="day.soir" class="flex items-start gap-2">
                  <span class="text-[10px] font-black text-slate-300 uppercase w-12 shrink-0 pt-px">Soir</span>
                  <p class="text-xs text-slate-500 leading-relaxed">{{ day.soir }}</p>
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
  transport:  { category: 'Transport',    icon: TrainFront,       bgColor: 'bg-blue-50',    textColor: 'text-blue-500' },
  logement:   { category: 'Hébergement',  icon: BedDouble,        bgColor: 'bg-purple-50',  textColor: 'text-purple-500' },
  nourriture: { category: 'Nourriture',   icon: UtensilsCrossed,  bgColor: 'bg-emerald-50', textColor: 'text-emerald-500' },
  activites:  { category: 'Activités',    icon: Ticket,           bgColor: 'bg-amber-50',   textColor: 'text-amber-500' }
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

  if (error) throw new Error(error.message || 'Erreur lors de l\'appel à l\'API.')
  if (data?.error) throw new Error(data.error)

  return data
}

// ── Transform API response → UI data ──
function applyPlannerData(data) {
  // Budget breakdown
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

  // Itinerary
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
      // Scénario A → affiche les suggestions
      suggestions.value = data.suggestions
      cameFromSuggestions.value = false
      currentStep.value = 'suggestions'
    } else if (data.budget_breakdown) {
      // Scénario B → affiche le planner
      applyPlannerData(data)
      cameFromSuggestions.value = false
      activeTab.value = 'budget'
      currentStep.value = 'planner'
    } else {
      throw new Error('Réponse inattendue de l\'IA. Veuillez réessayer.')
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
      throw new Error('Réponse inattendue de l\'IA. Veuillez réessayer.')
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
      // Retour vers les suggestions (les données sont toujours en mémoire)
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
