<template>
  <div class="animate-fade-in max-w-4xl mx-auto pb-24">
    <div class="flex items-center justify-between mb-8 px-1">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Vue d'ensemble</h2>
        <p class="text-sm text-gray-500 mt-1">Votre résumé pour la journée</p>
      </div>
      <div class="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center text-xl font-bold text-indigo-600 shadow-inner">
        {{ userInitials }}
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-24">
      <svg class="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>

    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        
        <!-- Sleep Summary Widget -->
        <router-link 
          to="/sommeil" 
          class="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 shadow-md text-white hover:scale-[1.02] transition-transform cursor-pointer relative overflow-hidden group"
        >
          <div class="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          
          <div class="flex justify-between items-start mb-6">
            <div class="flex items-center gap-2">
              <span class="text-xl">🌙</span>
              <h3 class="font-bold">Sommeil</h3>
            </div>
            <span v-if="sleepData" class="px-2 py-1 bg-white/20 rounded-lg text-xs font-bold backdrop-blur-md">
              Score: {{ sleepData.score }}
            </span>
          </div>

          <div v-if="sleepData">
            <p class="text-3xl font-bold mb-1">{{ formatDuration(sleepData.duration_seconds) }}</p>
            <p class="text-indigo-100 text-sm">Dernière nuit</p>
          </div>
          <div v-else>
            <p class="text-indigo-200 text-sm italic">Aucune donnée synchronisée.</p>
          </div>
        </router-link>

        <!-- Nutrition Summary Widget -->
        <router-link 
          to="/nutrition" 
          class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
        >
          <div class="flex justify-between items-start mb-4">
            <div class="flex items-center gap-2">
              <span class="text-xl">🥗</span>
              <h3 class="font-bold text-gray-800">Nutrition</h3>
            </div>
            <span class="text-xs font-bold text-gray-500">{{ nutritionData.mealsCount }} repas</span>
          </div>
          
          <div>
            <div class="flex items-end gap-2 mb-3">
              <span class="text-3xl font-bold text-gray-900">{{ nutritionData.calories }}</span>
              <span class="text-sm font-medium text-gray-500 mb-1">/ 2500 kcal</span>
            </div>
            
            <div class="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
               <div class="bg-indigo-500 h-full rounded-full" :style="{ width: Math.min(100, (nutritionData.calories / 2500) * 100) + '%' }"></div>
            </div>
          </div>
        </router-link>

        <!-- Workout Summary Widget -->
        <router-link 
          to="/musculation" 
          class="md:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
        >
          <div class="flex items-center gap-4">
            <div class="h-14 w-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-2xl shadow-inner">
              💪
            </div>
            <div>
              <h3 class="font-bold text-gray-800 text-lg">Musculation</h3>
              <p class="text-gray-500 text-sm">
                {{ workoutData ? 'Séance enregistrée aujourd\'hui' : 'Aucune séance aujourd\'hui' }}
              </p>
            </div>
          </div>
          <div v-if="workoutData" class="flex flex-col items-end">
            <span class="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Reps Totales</span>
            <span class="text-2xl font-bold text-indigo-600">{{ workoutData.totalReps }}</span>
          </div>
          <div v-else class="text-gray-300">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </router-link>

      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'

const { user } = useAuth()

const loading = ref(true)
const sleepData = ref(null)
const nutritionData = ref({ calories: 0, mealsCount: 0 })
const workoutData = ref(null)

const userInitials = computed(() => {
  if (!user.value || !user.value.email) return 'U'
  return user.value.email.charAt(0).toUpperCase()
})

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id || user.value?.id
  
  if (userId) {
    await fetchDashboardData(userId)
  }
})

const fetchDashboardData = async (userId) => {
  loading.value = true
  const todayStr = new Date().toISOString().split('T')[0]
  
  try {
    // 1. Fetch latest Sleep (could be today or yesterday)
    const { data: sleep } = await supabase
      .from('sleep_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()
      
    sleepData.value = sleep

    // 2. Fetch today's nutrition
    const { data: nutrition } = await supabase
      .from('nutrition_logs')
      .select('calories')
      .eq('user_id', userId)
      .eq('date', todayStr)
      
    if (nutrition) {
      nutritionData.value.mealsCount = nutrition.length
      nutritionData.value.calories = nutrition.reduce((acc, curr) => acc + (Number(curr.calories) || 0), 0)
    }

    // 3. Fetch today's workout
    const { data: workouts } = await supabase
      .from('workouts')
      .select('id')
      .eq('user_id', userId)
      .gte('date', todayStr + 'T00:00:00.000Z')
      .lte('date', todayStr + 'T23:59:59.999Z')
      .limit(1)
      .maybeSingle()

    if (workouts) {
      const { data: sets } = await supabase
        .from('workout_sets')
        .select('reps')
        .eq('workout_id', workouts.id)
        
      const totalReps = sets ? sets.reduce((acc, curr) => acc + (Number(curr.reps) || 0), 0) : 0
      workoutData.value = {
        id: workouts.id,
        totalReps: totalReps
      }
    }

  } catch(e) {
    console.error("Dashboard error:", e)
  } finally {
    loading.value = false
  }
}

const formatDuration = (seconds) => {
  if (!seconds) return '0h00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m < 10 ? '0' : ''}${m}m`
}
</script>
