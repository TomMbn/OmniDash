<template>
  <div class="animate-fade-in max-w-4xl mx-auto pb-24">
    <!-- Header & Toggle Tab -->
    <div class="flex justify-between items-center mb-6 px-1">
      <h2 class="text-2xl font-bold text-gray-900">Musculation</h2>
      <button 
        @click="activeTab = activeTab === 'workout' ? 'exercises' : 'workout'" 
        class="text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors"
      >
        {{ activeTab === 'workout' ? 'Gérer Exercices' : 'Voir Séance' }}
      </button>
    </div>

    <!-- Active Tab: Exercises Management -->
    <div v-if="activeTab === 'exercises'" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-8 mb-6">
      <h3 class="text-xl font-bold text-gray-800 mb-6">Ajouter un exercice</h3>
      
      <!-- Quick Add Muscle Group -->
      <div class="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
        <label class="block text-sm font-semibold text-gray-700 mb-2">Créer un nouveau groupe musculaire</label>
        <div class="flex gap-2">
          <input 
            v-model="newMuscleGroup" 
            type="text" 
            class="flex-1 px-4 py-3 text-lg border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
            placeholder="Ex: Pectoraux, Dos..." 
          />
          <button 
            type="button" 
            @click="handleAddMuscleGroup" 
            class="bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 px-5 rounded-xl font-bold text-xl transition-colors"
          >
            +
          </button>
        </div>
      </div>

      <form @submit.prevent="addExercise" class="space-y-5">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Nom de l'exercice</label>
          <input 
            v-model="newExercise.name" 
            required 
            type="text" 
            class="w-full px-4 py-3 text-lg border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400" 
            placeholder="Ex: Développé couché" 
          />
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Groupe musculaire</label>
          <select 
            v-model="newExercise.muscle_group_id" 
            required 
            class="w-full px-4 py-3 text-lg border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-800"
          >
            <option value="" disabled>Sélectionnez un groupe</option>
            <option v-for="group in muscleGroups" :key="group.id" :value="group.id">{{ group.name }}</option>
          </select>
        </div>
        
        <button 
          type="submit" 
          :disabled="loading.exercises" 
          class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-transform active:scale-95 text-lg mt-4 disabled:opacity-70 flex justify-center items-center"
        >
          <svg v-if="loading.exercises" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ loading.exercises ? 'Ajout...' : "Ajouter l'exercice" }}
        </button>
      </form>
    </div>

    <!-- Active Tab: Workout Logging -->
    <div v-if="activeTab === 'workout'">
      <!-- Loading State -->
      <div v-if="loading.data" class="flex justify-center py-12">
        <svg class="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      
      <template v-else>
        <!-- Volume Load Summary Widget -->
        <div v-if="hasStats" class="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-5 border border-indigo-100 shadow-sm">
          <h3 class="text-xs font-bold text-indigo-400 mb-3 uppercase tracking-wider">Volume Load (KG × REP)</h3>
          <div class="flex flex-wrap gap-2">
            <div 
              v-for="(vol, group) in volumeLoadByMuscleGroup" 
              :key="group" 
              class="bg-white px-4 py-2 rounded-xl text-sm font-semibold text-gray-800 shadow-sm border border-indigo-50 flex items-center"
            >
              <span class="text-indigo-600 mr-2">{{ group }}</span>
              <span class="text-base">{{ vol }}</span>
            </div>
          </div>
        </div>

        <!-- Start/Current Workout -->
        <div v-if="!currentWorkout" class="flex justify-center py-16 bg-white rounded-3xl shadow-sm border-2 border-dashed border-gray-200">
          <button 
            @click="startWorkout" 
            :disabled="loading.workout" 
            class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-indigo-200 text-xl transition-transform active:scale-[0.98] flex items-center"
          >
            <span class="text-2xl mr-3">🚀</span> 
            Démarrer ma séance
          </button>
        </div>

        <div v-else class="space-y-6">
          <!-- Workout Blocks (Exercises) -->
          <div v-for="(block, bIndex) in workoutBlocks" :key="bIndex" class="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <!-- Block Header -->
            <div class="bg-gray-50/80 px-4 py-4 border-b border-gray-100 flex justify-between items-center">
              <select 
                v-model="block.exercise_id" 
                class="bg-transparent font-bold text-gray-900 text-xl outline-none w-full appearance-none pr-8 cursor-pointer"
              >
                <option value="" disabled class="text-gray-400">Choisir un exercice...</option>
                <option v-for="ex in exercises" :key="ex.id" :value="ex.id">{{ ex.name }}</option>
              </select>
              <button @click="removeBlock(bIndex)" class="text-gray-400 hover:text-red-500 p-2 text-xl font-bold bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-sm">
                ✕
              </button>
            </div>
            
            <div class="p-4" v-if="block.exercise_id">
              <!-- Sets Headers -->
              <div class="grid grid-cols-[3rem_1fr_1fr_1fr_2rem] gap-2 mb-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center pr-2">
                <div>Set</div>
                <div>Poids</div>
                <div>Reps</div>
                <div>RPE</div>
                <div></div>
              </div>
              
              <!-- Sets Data -->
              <transition-group name="list" tag="div">
                <div v-for="(set, sIndex) in block.sets" :key="sIndex" class="grid grid-cols-[3rem_1fr_1fr_1fr_2rem] gap-2 mb-3 items-center group">
                  <div class="text-center font-bold text-gray-500 bg-gray-50 rounded-xl h-12 flex items-center justify-center">
                    {{ sIndex + 1 }}
                  </div>
                  <input 
                    v-model.number="set.weight" 
                    @blur="saveSet(set, block.exercise_id)" 
                    type="number" 
                    class="w-full text-center h-12 text-lg font-bold text-gray-900 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" 
                    placeholder="kg" 
                  />
                  <input 
                    v-model.number="set.reps" 
                    @blur="saveSet(set, block.exercise_id)" 
                    type="number" 
                    class="w-full text-center h-12 text-lg font-bold text-gray-900 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" 
                    placeholder="reps" 
                  />
                  <input 
                    v-model.number="set.rpe" 
                    @blur="saveSet(set, block.exercise_id)" 
                    type="number" 
                    class="w-full text-center h-12 text-lg font-bold text-gray-600 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" 
                    placeholder="RPE" 
                  />
                  <button @click="removeSet(block, sIndex)" class="text-gray-300 hover:text-red-400 flex items-center justify-center h-12">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                  </button>
                </div>
              </transition-group>
              
              <!-- Add Set Button -->
              <button 
                @click="addSet(block)" 
                class="mt-4 w-full py-3.5 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-50 rounded-xl font-bold transition-colors text-base flex items-center justify-center"
              >
                + Ajouter une série
              </button>
            </div>
          </div>

          <!-- Add Exercise Block -->
          <button 
            @click="addBlock" 
            class="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-5 rounded-3xl shadow-md text-lg transition-transform active:scale-[0.98] flex items-center justify-center mt-8"
          >
            Nouvel Exercice
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

const { user } = useAuth()

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
  return workoutBlocks.value.flatMap(b => b.sets)
    .filter(s => s.weight > 0 && s.reps > 0 && b.exercise_id)
    .map(s => ({
       exercise_id: b.exercise_id,
       weight: s.weight,
       reps: s.reps
    }))
})

const { volumeLoadByMuscleGroup } = useWorkoutStats(flatSets, exercises, muscleGroups)
const hasStats = computed(() => Object.keys(volumeLoadByMuscleGroup.value).length > 0)

onMounted(async () => {
  // Wait explicitly to ensure session is loaded if needed
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id || user.value?.id

  if (userId) {
    await loadData(userId)
  }
})

const loadData = async (userId) => {
  loading.value.data = true
  
  try {
    // Parallelize data fetching
    const [mgResponse, exResponse] = await Promise.all([
      supabase.from('muscle_groups').select('*'),
      supabase.from('exercises').select('*')
    ])
    
    if (mgResponse.data) muscleGroups.value = mgResponse.data
    if (exResponse.data) exercises.value = exResponse.data
    
    // Check for today's workout
    const todayStr = new Date().toISOString().split('T')[0]
    
    // We check between start and end of day local timezone approx
    const { data: w } = await supabase.from('workouts')
      .select('*')
      .eq('user_id', userId)
      .gte('date', todayStr + 'T00:00:00.000Z')
      .lte('date', todayStr + 'T23:59:59.999Z')
      .limit(1)
      .single()
      
    if (w) {
      currentWorkout.value = w
      // Load sets for today's workout
      const { data: sets } = await supabase.from('workout_sets')
        .select('*')
        .eq('workout_id', w.id)
        .order('id', { ascending: true }) // use ID to maintain order of insertion
        
      if (sets && sets.length > 0) {
        // Reconstruct blocks by exercise_id
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
      // Update existing
      await supabase.from('workout_sets').update(payload).eq('id', set.id)
    } else {
      // Insert new
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
  // Delete all persisted sets in this block
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
   
   // If it was the last set, maybe we want to keep one empty set row
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
