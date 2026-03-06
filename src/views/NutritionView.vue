<template>
  <div class="animate-fade-in max-w-4xl mx-auto pb-24">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6 px-1">
      <h2 class="text-2xl font-bold text-gray-900">Nutrition</h2>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <svg class="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>

    <template v-else>
      <!-- Macros Progress Bars -->
      <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
        <h3 class="text-lg font-bold text-gray-800 mb-6">Objectifs de la journée</h3>
        
        <div class="space-y-6">
          <!-- Calories -->
          <div>
            <div class="flex justify-between text-sm font-semibold mb-2">
              <span class="text-gray-700">🔥 Calories</span>
              <span class="text-indigo-600">{{ dailyTotals.calories }} / {{ GOALS.calories }} kcal</span>
            </div>
            <div class="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
              <div 
                class="h-full bg-indigo-500 rounded-full transition-all duration-500"
                :style="{ width: Math.min(100, (dailyTotals.calories / GOALS.calories) * 100) + '%' }"
              ></div>
            </div>
          </div>
          
          <!-- Protéines -->
          <div>
            <div class="flex justify-between text-sm font-semibold mb-2">
              <span class="text-gray-700">🥩 Protéines</span>
              <span class="text-blue-500">{{ dailyTotals.protein.toFixed(1) }} / {{ GOALS.protein }} g</span>
            </div>
            <div class="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
              <div 
                class="h-full bg-blue-400 rounded-full transition-all duration-500"
                :style="{ width: Math.min(100, (dailyTotals.protein / GOALS.protein) * 100) + '%' }"
              ></div>
            </div>
          </div>
          
          <!-- Glucides -->
          <div>
            <div class="flex justify-between text-sm font-semibold mb-2">
              <span class="text-gray-700">🍚 Glucides</span>
              <span class="text-green-500">{{ dailyTotals.carbs.toFixed(1) }} / {{ GOALS.carbs }} g</span>
            </div>
            <div class="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
              <div 
                class="h-full bg-green-400 rounded-full transition-all duration-500"
                :style="{ width: Math.min(100, (dailyTotals.carbs / GOALS.carbs) * 100) + '%' }"
              ></div>
            </div>
          </div>
          
          <!-- Lipides -->
          <div>
            <div class="flex justify-between text-sm font-semibold mb-2">
              <span class="text-gray-700">🥑 Lipides</span>
              <span class="text-yellow-500">{{ dailyTotals.fats.toFixed(1) }} / {{ GOALS.fats }} g</span>
            </div>
            <div class="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
              <div 
                class="h-full bg-yellow-400 rounded-full transition-all duration-500"
                :style="{ width: Math.min(100, (dailyTotals.fats / GOALS.fats) * 100) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Meal Form -->
      <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
        <h3 class="text-xl font-bold text-gray-900 mb-5">Ajouter un repas</h3>
        <form @submit.prevent="addMeal" class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Nom du repas</label>
            <input 
              v-model="newMeal.meal_name" 
              required 
              type="text" 
              class="w-full px-4 py-3 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
              placeholder="Ex: Poulet Riz Brocolis" 
            />
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1">Calories</label>
              <input 
                v-model.number="newMeal.calories" 
                required 
                type="number" 
                class="w-full px-4 py-3 text-base font-medium border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1">Protéines (g)</label>
              <input 
                v-model.number="newMeal.protein" 
                required 
                type="number" 
                step="0.1"
                class="w-full px-4 py-3 text-base font-medium border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1">Glucides (g)</label>
              <input 
                v-model.number="newMeal.carbs" 
                required 
                type="number" 
                step="0.1"
                class="w-full px-4 py-3 text-base font-medium border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" 
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1">Lipides (g)</label>
              <input 
                v-model.number="newMeal.fats" 
                required 
                type="number" 
                step="0.1"
                class="w-full px-4 py-3 text-base font-medium border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none" 
              />
            </div>
          </div>

          <!-- Exceptional Meal Checkbox -->
          <div class="pt-2">
            <label class="flex items-center p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-orange-50 transition-colors group">
              <input 
                type="checkbox" 
                v-model="newMeal.is_exceptional_meal"
                class="w-5 h-5 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
              />
              <div class="ml-3">
                <span class="block text-sm font-bold text-gray-900 group-hover:text-orange-700">Repas "Plaisir" (Exceptionnel)</span>
                <span class="block text-xs text-gray-500">Fast-food, restaurant, cheat meal...</span>
              </div>
            </label>
          </div>
          
          <button 
            type="submit" 
            :disabled="addingMeal" 
            class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-transform active:scale-95 text-lg mt-4 disabled:opacity-70 flex justify-center items-center"
          >
            <svg v-if="addingMeal" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ addingMeal ? 'Ajout...' : "Ajouter le repas" }}
          </button>
        </form>
      </div>

      <!-- Meals List -->
      <div>
        <h3 class="text-xl font-bold text-gray-900 mb-4 px-1">Repas du jour</h3>
        
        <div v-if="todaysMeals.length === 0" class="text-center py-8 text-gray-400">
          <span class="block text-4xl mb-2">🍽️</span>
          Aucun repas enregistré aujourd'hui.
        </div>
        
        <div class="space-y-4">
          <div 
            v-for="meal in todaysMeals" 
            :key="meal.id"
            class="bg-white p-5 rounded-2xl shadow-sm border transition-all"
            :class="meal.is_exceptional_meal ? 'border-orange-300 bg-orange-50/30' : 'border-gray-100'"
          >
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center gap-2">
                <span v-if="meal.is_exceptional_meal" class="text-xl" title="Repas Plaisir">🍕</span>
                <span v-else class="text-xl">🥗</span>
                <h4 class="font-bold text-gray-900" :class="{'text-orange-800': meal.is_exceptional_meal}">
                  {{ meal.meal_name }}
                </h4>
              </div>
              <button @click="deleteMeal(meal.id)" class="text-gray-400 hover:text-red-500 font-bold px-2 py-1">
                ✕
              </button>
            </div>
            
            <div class="flex justify-between items-center text-sm">
              <div class="font-bold text-indigo-900 bg-white border border-indigo-100 px-3 py-1 rounded-lg">
                {{ meal.calories }} <span class="text-xs font-normal text-indigo-400 font-medium">kcal</span>
              </div>
              <div class="flex gap-4 font-medium">
                <span class="text-blue-600">{{ meal.protein }}g<span class="text-xs font-normal">P</span></span>
                <span class="text-green-600">{{ meal.carbs }}g<span class="text-xs font-normal">G</span></span>
                <span class="text-yellow-600">{{ meal.fats }}g<span class="text-xs font-normal">L</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'

const { user } = useAuth()

// Fixed goals
const GOALS = {
  calories: 2500,
  protein: 160,
  carbs: 300,
  fats: 80
}

const loading = ref(true)
const addingMeal = ref(false)
const todaysMeals = ref([])

const emptyMeal = () => ({
  meal_name: '',
  calories: null,
  protein: null,
  carbs: null,
  fats: null,
  is_exceptional_meal: false
})
const newMeal = ref(emptyMeal())

const dailyTotals = computed(() => {
  return todaysMeals.value.reduce((acc, meal) => {
    return {
      calories: acc.calories + (Number(meal.calories) || 0),
      protein: acc.protein + (Number(meal.protein) || 0),
      carbs: acc.carbs + (Number(meal.carbs) || 0),
      fats: acc.fats + (Number(meal.fats) || 0)
    }
  }, { calories: 0, protein: 0, carbs: 0, fats: 0 })
})

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id || user.value?.id
  if (userId) {
    await fetchTodaysMeals(userId)
  }
})

const fetchTodaysMeals = async (userId) => {
  loading.value = true
  
  const todayStr = new Date().toISOString().split('T')[0]
  
  try {
    const { data: logs, error } = await supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', todayStr)
      .order('created_at', { ascending: false }) // Fallback to sort by id if no created_at
      
    if (logs) {
      todaysMeals.value = logs
    }
  } catch(e) {
    console.error("Erreur lors du chargement de la nutrition:", e)
  } finally {
    loading.value = false
  }
}

const addMeal = async () => {
  if (!user.value) return
  
  addingMeal.value = true
  const todayStr = new Date().toISOString().split('T')[0]
  
  const payload = {
    user_id: user.value.id,
    date: todayStr,
    meal_name: newMeal.value.meal_name,
    calories: newMeal.value.calories || 0,
    protein: newMeal.value.protein || 0,
    carbs: newMeal.value.carbs || 0,
    fats: newMeal.value.fats || 0,
    is_exceptional_meal: newMeal.value.is_exceptional_meal
  }
  
  try {
    const { data, error } = await supabase
      .from('nutrition_logs')
      .insert(payload)
      .select()
      
    if (data && data.length > 0) {
      todaysMeals.value.unshift(data[0]) // Add to beginning of local array
      newMeal.value = emptyMeal() // Reset form
    }
  } catch (error) {
    console.error("Erreur ajout repas:", error)
  } finally {
    addingMeal.value = false
  }
}

const deleteMeal = async (id) => {
  if (!confirm('Supprimer ce repas ?')) return
  
  try {
    const { error } = await supabase.from('nutrition_logs').delete().eq('id', id)
    if (!error) {
      todaysMeals.value = todaysMeals.value.filter(m => m.id !== id)
    }
  } catch(e) {
    console.error("Erreur lors de la suppression:", e)
  }
}
</script>
