<template>
  <div class="animate-fade-in max-w-5xl mx-auto pb-24 px-4 sm:px-6 select-none">
    <!-- Header with Dynamic Tab Switch -->
    <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 md:mb-10 pt-4 md:pt-4">
      <div class="flex items-center gap-3">
        <div class="p-2 md:p-2.5 bg-indigo-600 rounded-xl md:rounded-2xl text-white shadow-lg shadow-indigo-100/50">
          <Dumbbell :size="20" md:size="24" stroke-width="2.5" />
        </div>
        <div>
          <h2 class="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Musculation</h2>
          <p class="hidden sm:block text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-1 ml-0.5">Performance & Progression</p>
        </div>
      </div>
      
      <div class="bg-white p-1 rounded-2xl border border-slate-100 flex shadow-sm w-full sm:w-auto">
        <button 
          @click="activeTab = 'workout'" 
          :class="activeTab === 'workout' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600'"
          class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-[0.9rem] text-xs md:text-sm font-black transition-all"
        >
          <Target :size="14" md:size="16" /> Séance
        </button>
        <button 
          @click="activeTab = 'exercises'" 
          :class="activeTab === 'exercises' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600'"
          class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-[0.9rem] text-xs md:text-sm font-black transition-all"
        >
          <LayoutIcon :size="14" md:size="16" /> Bibliothèque
        </button>
      </div>
    </header>

    <!-- ═══ BIBLIOTHÈQUE TAB ═══ -->
    <div v-if="activeTab === 'exercises'" class="animate-fade-in group">
      <div class="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-2xl shadow-slate-100/50 mb-8">
        <h3 class="text-2xl font-black text-slate-900 tracking-tight mb-8">Ajouter un exercice</h3>
        
        <!-- Quick Add Muscle Group -->
        <div class="mb-10 p-6 bg-slate-50 rounded-3xl border border-slate-100">
          <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nouveau Groupe Musculaire</label>
          <div class="flex gap-3">
            <input 
              v-model="newMuscleGroup" 
              type="text" 
              class="flex-1 px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-300 font-bold" 
              placeholder="Ex: Pectoraux, Dos..." 
            />
            <button 
              type="button" 
              @click="handleAddMuscleGroup" 
              class="bg-white border border-slate-200 text-slate-900 hover:text-indigo-600 hover:border-indigo-100 px-6 rounded-2xl transition-all active:scale-95 shadow-sm"
            >
              <Plus :size="24" />
            </button>
          </div>
        </div>

        <form @submit.prevent="addExercise" class="space-y-6">
          <div class="space-y-6">
            <div>
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nom de l'exercice</label>
              <input 
                v-model="newExercise.name" 
                required 
                type="text" 
                class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-300 font-bold text-slate-900" 
                placeholder="Ex: Développé couché" 
              />
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Groupe musculaire</label>
              <div class="relative">
                <select 
                  v-model="newExercise.muscle_group_id" 
                  required 
                  class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-bold text-slate-900"
                >
                  <option value="" disabled>Sélectionnez un groupe</option>
                  <option v-for="group in muscleGroups" :key="group.id" :value="group.id">{{ group.name }}</option>
                </select>
                <div class="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronRight :size="18" class="rotate-90" />
                </div>
              </div>
            </div>
          </div>
          
          <button 
            type="submit" 
            :disabled="loading.exercises" 
            class="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black text-lg transition-all active:scale-[0.98] mt-6 flex justify-center items-center gap-3 shadow-xl"
          >
            <div v-if="loading.exercises" class="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            <Save v-else :size="22" />
            {{ loading.exercises ? 'Enregistrement...' : "Ajouter l'exercice" }}
          </button>
        </form>
      </div>
    </div>

    <!-- ═══ TRACKING TAB ═══ -->
    <div v-if="activeTab === 'workout'">
      <div v-if="loading.data" class="flex flex-col items-center justify-center py-24">
        <div class="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
        <p class="text-slate-400 font-bold text-xs uppercase tracking-widest mt-4">Chargement des données...</p>
      </div>
      
      <template v-else>
        <!-- Week Navigation Widget -->
        <div class="mb-10 bg-white rounded-[2.5rem] border border-slate-100 p-2 shadow-sm overflow-hidden">
          <div class="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
            <button 
              v-for="day in weekOverview" 
              :key="day.dayIndex"
              @click="selectedDayIndex = day.dayIndex"
              class="flex-1 min-w-[70px] relative py-5 flex flex-col items-center gap-2 rounded-3xl transition-all active:scale-95"
              :class="day.dayIndex === selectedDayIndex ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100/40' : 'text-slate-400 hover:bg-slate-50'"
            >
              <span class="text-[10px] font-black uppercase tracking-widest">{{ day.label.slice(0, 3) }}</span>
              <div class="p-1.5 rounded-full transition-colors" 
                :class="[
                  day.dayIndex === selectedDayIndex 
                    ? 'bg-white/20' 
                    : (day.session === 'REPOS' ? 'bg-slate-100' : (day.session === 'MATCH' ? 'bg-amber-100/60' : 'bg-indigo-100/60'))
                ]"
              >
                <component 
                  :is="day.session === 'REPOS' ? Moon : (day.session === 'MATCH' ? Trophy : Dumbbell)" 
                  :size="18" 
                  :stroke-width="day.dayIndex === selectedDayIndex ? 3 : 2.5"
                  :class="[
                    day.dayIndex === selectedDayIndex 
                      ? 'text-white' 
                      : (day.session === 'REPOS' ? 'text-slate-500' : (day.session === 'MATCH' ? 'text-amber-600' : 'text-indigo-600'))
                  ]"
                />
              </div>
              <div v-if="day.dayIndex === todayDayIndex" class="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full"></div>
            </button>
          </div>
        </div>

        <!-- Selected Session Card -->
        <div v-if="selectedPlan" class="mb-10 group">
          <div 
            class="relative rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-2xl shadow-slate-100/50 transition-all hover:border-slate-200"
            :class="isRestDay ? 'bg-slate-50/50' : 'bg-white'"
          >
            <!-- Premium Header -->
            <div class="p-8 pb-6 flex flex-wrap justify-between items-start gap-4">
              <div class="flex-1 min-w-[200px]">
                <div class="flex items-center gap-2 mb-3">
                  <span class="px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                    {{ isSelectedToday ? "Aujourd'hui" : selectedPlan.label }}
                  </span>
                  <span v-if="selectedPlan.note" class="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                    {{ selectedPlan.note }}
                  </span>
                </div>
                <h3 class="text-4xl font-black text-slate-900 tracking-tighter leading-tight mb-1">
                  {{ selectedPlan.template.label }}
                </h3>
                <p class="text-slate-400 font-bold text-sm">{{ selectedPlan.template.description }}</p>
              </div>

              <!-- Action Buttons -->
              <div class="flex items-center gap-2">
                <button 
                  v-if="selectedPlan.template.exercises.length > 0"
                  @click="editingTemplate = !editingTemplate" 
                  class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-100 shadow-sm"
                  :title="editingTemplate ? 'Valider' : 'Éditer les charges'"
                >
                  <component :is="editingTemplate ? CheckCircle2 : Pencil" :size="22" />
                </button>
              </div>
            </div>

            <!-- Exercises Quick List -->
            <div v-if="selectedPlan.template.exercises.length > 0" class="px-8 pb-8">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                <div 
                  v-for="(ex, i) in selectedPlan.template.exercises" 
                  :key="i"
                  class="flex items-start justify-between p-5 rounded-3xl transition-all"
                  :class="editingTemplate ? 'bg-indigo-50/50 border border-indigo-100' : 'bg-slate-50 border border-transparent'"
                >
                  <div class="flex items-center gap-4 min-w-0">
                    <span class="text-xs font-black text-slate-300 w-4 text-center">{{ i + 1 }}</span>
                    <div class="min-w-0">
                      <p class="text-sm font-black text-slate-800 whitespace-normal break-words leading-tight">{{ ex.name }}</p>
                      <p v-if="ex.focus && !editingTemplate" class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{{ ex.focus }}</p>
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-1.5 flex-shrink-0 pt-1">
                    <template v-if="editingTemplate">
                      <input 
                        type="number" 
                        :value="ex.sets" 
                        @change="updateTemplateField(selectedPlan.session, i, 'sets', $event.target.value)"
                        class="w-8 py-1.5 text-xs font-black text-center bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <span class="text-indigo-300 text-[10px] font-black">×</span>
                      <input 
                        type="text" 
                        :value="ex.repsRange" 
                        @change="updateTemplateField(selectedPlan.session, i, 'repsRange', $event.target.value)"
                        class="w-12 py-1.5 text-xs font-black text-center bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <input 
                        type="number" 
                        :value="ex.targetWeight" 
                        @change="updateExerciseWeight(selectedPlan.session, i, Number($event.target.value))"
                        class="w-14 py-1.5 text-xs font-black text-center bg-indigo-600 text-white rounded-xl outline-none"
                        placeholder="kg"
                      />
                    </template>
                    <template v-else>
                      <span class="px-3 py-1.5 bg-slate-200/50 text-slate-700 text-[10px] font-black rounded-lg">{{ ex.sets }} × {{ ex.repsRange }}</span>
                      <span class="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-lg">
                        {{ ex.targetWeight > 0 ? `${ex.targetWeight}kg` : 'PDC' }}
                      </span>
                    </template>
                  </div>
                </div>
              </div>

              <!-- Action Start Button -->
              <button 
                v-if="isSelectedToday && !currentWorkout"
                @click="startFromTemplate" 
                :disabled="loading.workout" 
                class="w-full bg-slate-900 hover:bg-black text-white py-6 rounded-[2rem] font-black text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl group/btn disabled:opacity-50"
              >
                <div v-if="loading.workout" class="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                <Play v-else :size="24" class="group-hover/btn:translate-x-1 transition-transform" />
                Démarrer la séance
              </button>

              <div v-if="isSelectedToday && currentWorkout" class="bg-emerald-50 border border-emerald-100 p-5 rounded-[2rem] flex items-center justify-center gap-3">
                <div class="p-1.5 bg-emerald-100 text-emerald-600 rounded-full">
                  <CheckCircle2 :size="18" />
                </div>
                <p class="text-sm font-black text-emerald-700 text-center">Séance active — Enregistrez vos performances ci-dessous</p>
              </div>
            </div>

            <!-- Rest Day Premium Empty State -->
            <div v-else class="p-16 flex flex-col items-center text-center">
              <div class="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 mb-6 shadow-inner">
                <Trophy :size="48" />
              </div>
              <p class="text-slate-900 font-black text-2xl tracking-tight">Jour de Récupération</p>
              <p class="text-slate-400 font-medium text-sm max-w-xs mt-3 leading-relaxed">Votre corps se reconstruit aujourd'hui. Profitez-en pour bien vous hydrater.</p>
            </div>
          </div>
        </div>

        <!-- Volume Stats Badge Widget -->
        <div v-if="hasStats" class="mb-10 flex flex-wrap gap-2 animate-fade-in group">
          <div 
            v-for="(vol, group) in volumeLoadByMuscleGroup" 
            :key="group" 
            class="relative overflow-hidden px-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col min-w-[100px]"
          >
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{{ group }}</span>
            <span class="text-lg font-black text-slate-900 tracking-tighter">{{ vol }}<span class="text-xs text-slate-300 ml-0.5 font-bold">kg</span></span>
            <div class="absolute bottom-0 left-0 h-1 bg-indigo-600/20" :style="{ width: '100%' }"></div>
          </div>
        </div>

        <!-- Start/Current Workout (free-form or active) -->
        <div v-if="!currentWorkout && (!todayPlan || isRestDay)" class="mb-10 text-center">
          <button 
            @click="startWorkout" 
            :disabled="loading.workout" 
            class="w-full bg-slate-50 hover:bg-white border-2 border-dashed border-slate-200 hover:border-indigo-200 p-12 rounded-[2.5rem] transition-all active:scale-[0.99] group shadow-inner"
          >
            <div class="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-300 group-hover:text-indigo-600 transition-colors mx-auto mb-6 shadow-sm border border-slate-100">
              <Flame :size="40" />
            </div>
            <p class="text-slate-900 font-black text-xl tracking-tight">Démarrer une séance libre</p>
            <p class="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Aucun programme prévu pour aujourd'hui</p>
          </button>
        </div>

        <div v-if="currentWorkout" class="space-y-8 relative">
          <!-- Floating Volume Badge for Active Session -->
          <div class="sticky top-4 z-40 mb-4 px-6 py-4 bg-slate-900/95 backdrop-blur-md rounded-3xl border border-slate-800 shadow-2xl flex justify-between items-center text-white">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-indigo-600 rounded-2xl">
                <Activity :size="20" />
              </div>
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Volume Total</p>
                <p class="text-xl font-black tracking-tighter">{{ Object.values(volumeLoadByMuscleGroup).reduce((a, b) => a + b, 0) }} kg</p>
              </div>
            </div>
            <p class="text-[10px] font-black bg-white/10 px-3 py-1.5 rounded-full uppercase tracking-widest border border-white/5">Séance Active</p>
          </div>

          <!-- Workout Blocks (Exercises) -->
          <div v-for="(block, bIndex) in workoutBlocks" :key="bIndex" class="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/30 overflow-hidden transition-all hover:border-slate-200 mb-6">
            <!-- Block Header -->
            <div class="p-5 md:p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center gap-3">
              <div class="relative flex-1">
                <select 
                  v-model="block.exercise_id" 
                  class="w-full bg-transparent font-black text-slate-900 text-lg md:text-2xl outline-none appearance-none cursor-pointer tracking-tight"
                >
                  <option value="" disabled>Choisir un exercice...</option>
                  <option v-for="ex in exercises" :key="ex.id" :value="ex.id">{{ ex.name }}</option>
                </select>
                <div class="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                  <ChevronRight :size="16" md:size="20" class="rotate-90" />
                </div>
              </div>
              <button @click="removeBlock(bIndex)" class="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white border border-slate-100 text-slate-300 hover:text-rose-500 rounded-xl md:rounded-2xl shadow-sm transition-colors">
                <Trash2 :size="18" md:size="20" />
              </button>
            </div>
            
            <div class="p-5 md:p-8" v-if="block.exercise_id">
              <!-- Sets Headers (Desktop) -->
              <div class="hidden md:grid grid-cols-[3.5rem_1fr_1fr_1fr_3rem] gap-4 mb-4 px-2">
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Set</div>
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Poids (kg)</div>
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Reps</div>
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">RPE</div>
                <div></div>
              </div>
              
              <!-- Sets Data -->
              <transition-group name="list" tag="div" class="space-y-3 md:space-y-4">
                <div v-for="(set, sIndex) in block.sets" :key="sIndex" class="grid grid-cols-[2.5rem_1fr_1fr_1fr_2.5rem] md:grid-cols-[3.5rem_1fr_1fr_1fr_3rem] gap-2 md:gap-4 items-center">
                  <div class="h-12 md:h-14 flex items-center justify-center font-black text-slate-400 bg-slate-50 rounded-xl md:rounded-2xl text-xs md:text-sm border border-slate-100">
                    {{ sIndex + 1 }}
                  </div>
                  <input 
                    v-model.number="set.weight" 
                    @blur="saveSet(set, block.exercise_id)" 
                    type="number" 
                    class="w-full text-center h-12 md:h-14 text-lg md:text-xl font-black text-slate-900 bg-white border border-slate-100 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow shadow-sm placeholder:text-slate-200" 
                    placeholder="W" 
                  />
                  <input 
                    v-model.number="set.reps" 
                    @blur="saveSet(set, block.exercise_id)" 
                    type="number" 
                    class="w-full text-center h-12 md:h-14 text-lg md:text-xl font-black text-slate-900 bg-white border border-slate-100 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow shadow-sm placeholder:text-slate-200" 
                    placeholder="R" 
                  />
                  <input 
                    v-model.number="set.rpe" 
                    @blur="saveSet(set, block.exercise_id)" 
                    type="number" 
                    class="w-full text-center h-12 md:h-14 text-lg md:text-xl font-black text-slate-500 bg-slate-50/50 border border-slate-100 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow placeholder:text-slate-200" 
                    placeholder="E" 
                  />
                  <button @click="removeSet(block, sIndex)" class="h-12 md:h-14 w-full flex items-center justify-center text-slate-200 hover:text-rose-400 transition-colors">
                    <X :size="16" md:size="18" />
                  </button>
                </div>
              </transition-group>
              
              <!-- Add Set Button -->
              <button 
                @click="addSet(block)" 
                class="mt-6 md:mt-8 w-full py-4 md:py-5 bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-white rounded-2xl md:rounded-3xl font-black text-xs uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Plus :size="16" /> Série
              </button>
            </div>
          </div>

          <!-- Add Exercise Block -->
          <button 
            @click="addBlock" 
            class="w-full bg-slate-900 hover:bg-black text-white py-6 md:py-8 rounded-[2rem] font-black text-lg md:text-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 md:gap-4 shadow-2xl shadow-indigo-200/50 mt-8 mb-20"
          >
            <Plus :size="24" md:size="28" />
            Exercice
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'
import { useWorkoutStats } from '@/composables/useWorkoutStats'
import { useWorkoutPrograms } from '@/composables/useWorkoutPrograms'
import { 
  Dumbbell, 
  Plus, 
  Trash2, 
  Play, 
  Calendar, 
  Settings, 
  Activity, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  X,
  Pencil,
  Save,
  Trophy,
  History,
  Target,
  Flame,
  Layout as LayoutIcon
} from 'lucide-vue-next'
import { watch } from 'vue'

// Body scroll lock logic (consistent with NutritionView if any modals are added later)
const showModals = ref(false) // Placeholder if needed
watch(showModals, (isOpen) => {
  if (isOpen) document.body.style.overflow = 'hidden'
  else document.body.style.overflow = ''
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

const updateTemplateField = (sessionKey, exerciseIndex, field, value) => {
  if (templates.value[sessionKey]?.exercises[exerciseIndex]) {
    if (field === 'sets') {
      templates.value[sessionKey].exercises[exerciseIndex].sets = Number(value) || 1
    } else if (field === 'repsRange') {
      templates.value[sessionKey].exercises[exerciseIndex].repsRange = value
    }
  }
}

// Core State
const activeTab = ref('workout')
const loading = ref({ data: true, workout: false, exercises: false })
const muscleGroups = ref([])
const exercises = ref([])
const currentWorkout = ref(null)
const workoutBlocks = ref([])

// Form State
const newMuscleGroup = ref('')
const newExercise = ref({ name: '', muscle_group_id: '' })

// Stats Integration
const flatSets = computed(() => {
  const result = []
  workoutBlocks.value.forEach(b => {
    if (!b.exercise_id) return
    b.sets.forEach(s => {
      if (s.weight > 0 && s.reps > 0) {
        result.push({
          exercise_id: b.exercise_id,
          weight: s.weight,
          reps: s.reps
        })
      }
    })
  })
  return result
})

const { volumeLoadByMuscleGroup } = useWorkoutStats(flatSets, exercises, muscleGroups)
const hasStats = computed(() => Object.keys(volumeLoadByMuscleGroup.value).length > 0)

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id || user.value?.id

  if (userId) {
    await loadData(userId)
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
      .select('*')
      .eq('user_id', userId)
      .gte('date', todayStr + 'T00:00:00.000Z')
      .lte('date', todayStr + 'T23:59:59.999Z')
      .limit(1)
      .single()
      
    if (w) {
      currentWorkout.value = w
      const { data: sets } = await supabase.from('workout_sets')
        .select('*')
        .eq('workout_id', w.id)
        .order('id', { ascending: true })
        
      if (sets && sets.length > 0) {
        const blocksMap = new Map()
        sets.forEach(set => {
          if (!blocksMap.has(set.exercise_id)) {
             blocksMap.set(set.exercise_id, { exercise_id: set.exercise_id, sets: [] })
          }
          blocksMap.get(set.exercise_id).sets.push(set)
        })
        workoutBlocks.value = Array.from(blocksMap.values())
      }
    }
  } catch (err) {
    console.error("Error loading workout data:", err)
  } finally {
    loading.value.data = false
  }
}

// ═══ Template-based Workout Start ═══
const startFromTemplate = async () => {
  if (!selectedPlan.value || isRestDay.value || !isSelectedToday.value) return
  
  loading.value.workout = true
  try {
    // 1. Create workout in DB
    const { data, error } = await supabase.from('workouts').insert({
      date: new Date().toISOString(),
      user_id: user.value.id
    }).select()

    if (error) throw error
    if (!data || data.length === 0) return

    currentWorkout.value = data[0]

    // 2. Generate pre-filled blocks from template
    const blocks = generateBlocks(selectedPlan.value.session, exercises.value)
    workoutBlocks.value = blocks

  } catch (e) {
    console.error("Error starting template workout:", e)
  } finally {
    loading.value.workout = false
  }
}

// Exercise Management Methods
const handleAddMuscleGroup = async () => {
  if (!newMuscleGroup.value.trim()) return
  const { data, error } = await supabase.from('muscle_groups').insert({
    name: newMuscleGroup.value.trim(),
    category: 'Custom'
  }).select()
  
  if (data) {
    muscleGroups.value.push(data[0])
    newMuscleGroup.value = ''
  }
}

const addExercise = async () => {
  loading.value.exercises = true
  const { data, error } = await supabase.from('exercises').insert({
    name: newExercise.value.name,
    muscle_group_id: newExercise.value.muscle_group_id,
    type: 'custom'
  }).select()
  
  if (data) {
    exercises.value.push(data[0])
    newExercise.value = { name: '', muscle_group_id: '' }
    activeTab.value = 'workout'
  }
  loading.value.exercises = false
}

// Workout Management Methods
const startWorkout = async () => {
  loading.value.workout = true
  const { data, error } = await supabase.from('workouts').insert({
    date: new Date().toISOString(),
    user_id: user.value.id
  }).select()
  
  if (data) {
    currentWorkout.value = data[0]
  }
  loading.value.workout = false
}

const addBlock = () => {
  workoutBlocks.value.push({
    exercise_id: '',
    sets: [{ weight: null, reps: null, rpe: null }]
  })
}

const addSet = (block) => {
  const lastSet = block.sets[block.sets.length - 1]
  block.sets.push({ 
    weight: lastSet ? lastSet.weight : null, 
    reps: lastSet ? lastSet.reps : null, 
    rpe: lastSet ? lastSet.rpe : null 
  })
}

const saveSet = async (set, exercise_id) => {
  if (!exercise_id || !set.weight || !set.reps) return
  
  const payload = {
    workout_id: currentWorkout.value.id,
    exercise_id: exercise_id,
    weight: set.weight,
    reps: set.reps,
    rpe: set.rpe || null,
    user_id: user.value.id
  }
  
  try {
    if (set.id) {
      await supabase.from('workout_sets').update(payload).eq('id', set.id)
    } else {
      const { data } = await supabase.from('workout_sets').insert(payload).select()
      if (data && data.length > 0) {
        set.id = data[0].id
      }
    }
  } catch(e) {
    console.error("Save set error:", e)
  }
}

const removeBlock = async (bIndex) => {
  const block = workoutBlocks.value[bIndex]
  const setIds = block.sets.filter(s => s.id).map(s => s.id)
  if (setIds.length > 0) {
    await supabase.from('workout_sets').delete().in('id', setIds)
  }
  workoutBlocks.value.splice(bIndex, 1)
}

const removeSet = async (block, sIndex) => {
   const set = block.sets[sIndex]
   if (set.id) {
     await supabase.from('workout_sets').delete().eq('id', set.id)
   }
   block.sets.splice(sIndex, 1)
   
   if (block.sets.length === 0) {
     block.sets.push({ weight: null, reps: null, rpe: null })
   }
}
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
