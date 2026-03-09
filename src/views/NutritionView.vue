<template>
  <div class="animate-fade-in max-w-2xl mx-auto pb-24 px-4 sm:px-6">
    <!-- Header Section -->
    <header class="flex flex-col gap-6 mb-10 pt-4">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight">Nutrition</h2>
          <p class="text-slate-500 text-sm font-medium">Suivi de vos performances</p>
        </div>
        <div class="flex items-center gap-2">
          <button @click="showLibrary = true" class="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all border border-transparent hover:border-slate-200" title="Meal Prep">
            <Archive :size="22" />
          </button>
          <button @click="showHabits = true" class="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all border border-transparent hover:border-slate-200" title="Habitudes">
            <Repeat :size="22" />
          </button>
          <button @click="showSettings = true" class="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all border border-transparent hover:border-slate-200" title="Paramètres">
            <Settings :size="22" />
          </button>
        </div>
      </div>

      <!-- Date Navigator -->
      <div class="flex items-center justify-between bg-slate-50/50 rounded-2xl border border-slate-100 p-1.5">
        <button @click="changeDate(-1)" class="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-sm rounded-xl transition-all">
          <ChevronLeft :size="20" />
        </button>
        <div class="flex items-center gap-2 font-bold text-slate-800">
          <Calendar :size="16" class="text-slate-400" />
          <span class="text-sm tracking-wide">{{ formattedCurrentDate }}</span>
        </div>
        <button @click="changeDate(1)" class="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-sm rounded-xl transition-all">
          <ChevronRight :size="20" />
        </button>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="relative w-12 h-12">
        <div class="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
        <div class="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
    </div>

    <template v-else>
      <!-- Summary Dashboard -->
      <section class="bg-white rounded-[2rem] border border-slate-100 p-8 mb-10 overflow-hidden relative">
        <div class="flex justify-between items-end mb-8">
          <div>
            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Total Calories</span>
            <div class="flex items-baseline gap-2">
              <span class="text-4xl font-black text-slate-900">{{ dailyTotals.calories }}</span>
              <span class="text-slate-400 font-bold">/ {{ calculatedGoals.calories }} kcal</span>
            </div>
          </div>
          <div class="p-3 bg-rose-50 rounded-2xl text-rose-500">
            <Flame :size="28" />
          </div>
        </div>

        <div class="space-y-6">
          <!-- Protéines -->
          <div>
            <div class="flex justify-between text-xs font-bold mb-2.5 tracking-tight">
              <span class="text-slate-400 uppercase flex items-center gap-1.5"><Beef :size="14" class="text-blue-500" /> Protéines</span>
              <span class="text-slate-900">{{ dailyTotals.protein.toFixed(0) }}g<span class="text-slate-300 font-medium ml-1">of {{ calculatedGoals.protein }}g</span></span>
            </div>
            <div class="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
              <div 
                class="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                :style="{ width: Math.min(100, (dailyTotals.protein / calculatedGoals.protein) * 100) + '%' }"
              ></div>
            </div>
          </div>
          
          <!-- Glucides -->
          <div>
            <div class="flex justify-between text-xs font-bold mb-2.5 tracking-tight">
              <span class="text-slate-400 uppercase flex items-center gap-1.5"><Wheat :size="14" class="text-amber-500" /> Glucides</span>
              <span class="text-slate-900">{{ dailyTotals.carbs.toFixed(0) }}g<span class="text-slate-300 font-medium ml-1">of {{ calculatedGoals.carbs }}g</span></span>
            </div>
            <div class="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
              <div 
                class="h-full bg-amber-500 rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                :style="{ width: Math.min(100, (dailyTotals.carbs / calculatedGoals.carbs) * 100) + '%' }"
              ></div>
            </div>
          </div>
          
          <!-- Lipides -->
          <div>
            <div class="flex justify-between text-xs font-bold mb-2.5 tracking-tight">
              <span class="text-slate-400 uppercase flex items-center gap-1.5"><Droplet :size="14" class="text-emerald-500" /> Lipides</span>
              <span class="text-slate-900">{{ dailyTotals.fats.toFixed(0) }}g<span class="text-slate-300 font-medium ml-1">of {{ calculatedGoals.fats }}g</span></span>
            </div>
            <div class="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
              <div 
                class="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                :style="{ width: Math.min(100, (dailyTotals.fats / calculatedGoals.fats) * 100) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </section>

      <!-- AI Assistant Input -->
      <div class="bg-slate-900 rounded-[2rem] p-8 mb-12 relative overflow-hidden group">
        <div class="absolute top-0 right-0 p-8 text-slate-800 opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none">
          <Sparkles :size="80" />
        </div>
        
        <h3 class="text-xl font-bold text-white mb-2 flex items-center gap-2 relative z-10">
          Enregistrement Magique
        </h3>
        <p class="text-slate-400 text-sm mb-6 relative z-10">Décrivez votre repas, l'IA s'occupe des chiffres.</p>
        
        <div v-if="!analyzedMeal" class="space-y-4 relative z-10">
          <div class="relative">
            <textarea 
              v-model="mealText" 
              rows="3" 
              class="w-full px-5 py-4 bg-slate-800/50 border border-slate-700 text-white rounded-2xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-all placeholder:text-slate-600" 
              placeholder="Ex: Un bol de riz avec du poulet grillé et avocat..." 
              :disabled="analyzing"
            ></textarea>
          </div>
          
          <button 
            @click="analyzeWithAI" 
            :disabled="analyzing || !mealText.trim()" 
            class="w-full bg-white hover:bg-slate-100 text-slate-900 font-black py-4 rounded-2xl transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-50"
          >
            <Sparkles v-if="!analyzing" :size="18" />
            <div v-else class="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            {{ analyzing ? 'Analyse en cours...' : 'Analyser le repas' }}
          </button>
        </div>

        <!-- AI Result Preview -->
        <div v-else class="animate-fade-in space-y-6 relative z-10 pointer-events-auto">
          <div class="bg-indigo-600 rounded-2xl p-6 border border-white/10 shadow-xl">
            <div class="flex justify-between items-start mb-6">
              <div>
                <h4 class="font-black text-white text-xl leading-tight">
                  {{ analyzedMeal.meal_name }}
                </h4>
                <div v-if="analyzedMeal.is_exceptional_meal" class="inline-flex items-center gap-1 mt-1 text-[10px] font-black uppercase tracking-tighter text-indigo-200">
                  <AlertCircle :size="10" /> Repas Plaisir
                </div>
              </div>
              <button @click="analyzedMeal = null" class="text-indigo-200 hover:text-white p-1 transition-colors">
                <Pencil :size="18" />
              </button>
            </div>
            
            <div class="grid grid-cols-4 gap-3">
              <div v-for="(val, key) in { Cal: analyzedMeal.calories, Prot: analyzedMeal.protein+'g', Gluc: analyzedMeal.carbs+'g', Lip: analyzedMeal.fats+'g' }" :key="key" class="bg-white/10 rounded-xl p-2.5 border border-white/5 text-center">
                <div class="text-[9px] text-indigo-200 font-black uppercase tracking-widest mb-1">{{ key }}</div>
                <div class="font-bold text-white text-sm">{{ val }}</div>
              </div>
            </div>
          </div>

          <button 
            @click="saveAnalyzedMeal" 
            :disabled="savingMeal"
            class="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-black py-4 rounded-2xl transition-all active:scale-[0.98] flex justify-center items-center gap-2 border border-indigo-400/30"
          >
            <Save v-if="!savingMeal" :size="18" />
            <div v-else class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {{ savingMeal ? 'Enregistrement...' : 'Confirmer ce repas' }}
          </button>
        </div>
      </div>

      <!-- Meals List -->
      <section>
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-extrabold text-slate-900 tracking-tight">Journal nutritionnel</h3>
        </div>
        
        <div v-if="todaysMeals.length === 0" class="flex flex-col items-center justify-center py-16 px-8 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
          <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 border border-slate-100 mb-4 shadow-sm">
            <Utensils :size="32" />
          </div>
          <p class="text-slate-400 font-bold text-center">Aucun repas pour ce jour</p>
          <p class="text-slate-400 text-xs text-center mt-1">Utilisez l'enregistreur magique ci-dessus.</p>
        </div>
        
        <div class="space-y-3">
          <div 
            v-for="meal in todaysMeals" 
            :key="meal.id"
            class="group bg-white p-5 rounded-2xl border border-slate-100 hover:border-slate-300 transition-all flex flex-col gap-4 relative overflow-hidden"
            :class="{ 'opacity-50 grayscale-[0.5]': meal.is_skipped }"
          >
            <div class="flex justify-between items-start">
              <div class="flex flex-col">
                <h4 class="font-black text-slate-800 text-base group-hover:text-slate-900 transition-colors" :class="{ 'line-through': meal.is_skipped }">
                  {{ meal.meal_name }}
                </h4>
                <p class="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">
                  {{ meal.calories }} kcal
                </p>
              </div>
              <div class="flex gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                <button @click="toggleSkipMeal(meal)" class="p-1.5 transition-colors" :class="meal.is_skipped ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'" :title="meal.is_skipped ? 'Manger' : 'Passer'">
                  <CheckCircle2 v-if="meal.is_skipped" :size="16" />
                  <Circle v-else :size="16" />
                </button>
                <button @click="saveToLibrary(meal)" class="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors" title="Library">
                  <Save :size="16" />
                </button>
                <button @click="openEditModal(meal)" class="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors" title="Edit">
                  <Pencil :size="16" />
                </button>
                <button @click="deleteMeal(meal.id)" class="p-1.5 text-slate-400 hover:text-rose-600 transition-colors" title="Delete">
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>
            
            <div class="grid grid-cols-3 gap-2">
              <div class="flex flex-col gap-1">
                <div class="h-1 w-full bg-slate-50 rounded-full border border-slate-100/50">
                  <div class="h-full bg-blue-500 rounded-full" :style="{ width: Math.min(100, (meal.protein / (meal.calories/10) * 100)) + '%' }"></div>
                </div>
                <span class="text-[10px] font-black text-slate-400 uppercase">{{ meal.protein }}g P</span>
              </div>
              <div class="flex flex-col gap-1">
                <div class="h-1 w-full bg-slate-50 rounded-full border border-slate-100/50">
                  <div class="h-full bg-amber-500 rounded-full" :style="{ width: Math.min(100, (meal.carbs / (meal.calories/10) * 100)) + '%' }"></div>
                </div>
                <span class="text-[10px] font-black text-slate-400 uppercase">{{ meal.carbs }}g G</span>
              </div>
              <div class="flex flex-col gap-1">
                <div class="h-1 w-full bg-slate-50 rounded-full border border-slate-100/50">
                  <div class="h-full bg-emerald-500 rounded-full" :style="{ width: Math.min(100, (meal.fats / (meal.calories/20) * 100)) + '%' }"></div>
                </div>
                <span class="text-[10px] font-black text-slate-400 uppercase">{{ meal.fats }}g L</span>
              </div>
            </div>
            
            <div v-if="meal.is_exceptional_meal" class="absolute top-0 right-0 h-1.5 w-1.5 m-2 bg-rose-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </section>
    </template>

    <!-- Meal Prep Library Modal -->
    <div v-if="showLibrary" class="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 sm:p-6">
      <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" @click="showLibrary = false"></div>

      <div class="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
        <div class="p-8 flex justify-between items-center border-b border-slate-50">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-indigo-50 rounded-2xl text-indigo-600">
              <Archive :size="24" />
            </div>
            <h3 class="text-2xl font-black text-slate-900 tracking-tight">Mon Meal Prep</h3>
          </div>
          <button @click="showLibrary = false" class="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all">
            <X :size="24" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-8 space-y-4">
          <div v-if="loadingLibrary" class="flex justify-center py-12">
            <div class="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
          
          <div v-else-if="savedMeals.length === 0" class="text-center py-12 px-6">
            <div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4">
              <Utensils :size="32" />
            </div>
            <p class="text-slate-500 font-bold">Votre bibliothèque est vide</p>
            <p class="text-slate-400 text-sm mt-2">Enregistrez vos créations depuis le journal principal pour les retrouver ici.</p>
          </div>

          <div v-else class="space-y-3">
            <div v-for="meal in savedMeals" :key="meal.id" class="group bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-slate-200 transition-all">
              <div class="flex justify-between items-start mb-4">
                <div class="flex flex-col">
                  <h4 class="font-black text-slate-900 text-lg leading-tight">{{ meal.meal_name }}</h4>
                  <p class="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">{{ meal.calories }} kcal</p>
                </div>
                <div class="flex items-center gap-2">
                  <button @click="openPlanModal(meal)" class="text-xs bg-slate-900 text-white px-4 py-2 rounded-xl font-black hover:bg-indigo-600 transition-all active:scale-[0.95]">
                    Planifier
                  </button>
                  <button @click="deleteSavedMeal(meal.id)" class="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                    <Trash2 :size="18" />
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-3">
                <div class="bg-white/50 rounded-xl p-2 border border-white flex flex-col items-center">
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Protéines</span>
                  <span class="text-xs font-bold text-slate-700">{{ meal.protein }}g</span>
                </div>
                <div class="bg-white/50 rounded-xl p-2 border border-white flex flex-col items-center">
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Glucides</span>
                  <span class="text-xs font-bold text-slate-700">{{ meal.carbs }}g</span>
                </div>
                <div class="bg-white/50 rounded-xl p-2 border border-white flex flex-col items-center">
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Lipides</span>
                  <span class="text-xs font-bold text-slate-700">{{ meal.fats }}g</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Planning Modal -->
    <div v-if="showPlanningModal && planningMealPayload" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xl transition-opacity" @click="showPlanningModal = false"></div>

      <div class="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-8 animate-scale-up">
        <div class="flex items-center gap-3 mb-6">
          <div class="p-2 bg-indigo-50 rounded-xl text-indigo-600">
            <Calendar :size="20" />
          </div>
          <h3 class="text-xl font-black text-slate-900 tracking-tight">Planification</h3>
        </div>
        
        <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
          <p class="text-[10px] uppercase font-black text-slate-400 mb-1 tracking-widest">Plat Sélectionné</p>
          <p class="text-slate-900 font-bold">{{ planningMealPayload.meal_name }}</p>
        </div>

        <div class="space-y-2 mb-8 max-h-[30vh] overflow-y-auto pr-1">
          <label 
            v-for="day in planningDaysOptions" 
            :key="day.dateStr" 
            class="flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border group"
            :class="planningDatesSelection.includes(day.dateStr) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-100 hover:border-slate-200'"
          >
            <span class="text-sm font-bold capitalize" :class="planningDatesSelection.includes(day.dateStr) ? 'text-white' : 'text-slate-700'">
              {{ day.label }}
            </span>
            <div class="relative flex items-center">
              <input type="checkbox" :value="day.dateStr" v-model="planningDatesSelection" class="sr-only">
              <div 
                class="w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center"
                :class="planningDatesSelection.includes(day.dateStr) ? 'bg-white border-white text-indigo-600' : 'border-slate-200 group-hover:border-slate-300'"
              >
                <CheckCircle2 v-if="planningDatesSelection.includes(day.dateStr)" :size="16" />
              </div>
            </div>
          </label>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <button @click="showPlanningModal = false" class="py-4 rounded-2xl font-black text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all text-sm">
            Annuler
          </button>
          <button @click="dispatchPlannedMeals" class="bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black transition-all active:scale-[0.95] text-sm shadow-xl flex items-center justify-center gap-2">
            Valider {{ planningDatesSelection.length > 0 ? `(${planningDatesSelection.length})` : '' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Settings Modal -->
    <div v-if="showSettings" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" @click="showSettings = false"></div>

      <div class="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] animate-slide-up">
        <div class="p-8 flex justify-between items-center border-b border-slate-50">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-indigo-50 rounded-2xl text-indigo-600">
              <Settings :size="24" />
            </div>
            <h3 class="text-2xl font-black text-slate-900 tracking-tight">Configuration</h3>
          </div>
          <button @click="showSettings = false" class="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all">
            <X :size="24" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-8 space-y-8">
          <!-- Biometry -->
          <div class="space-y-4">
            <h4 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Données Biométriques</h4>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-slate-500 uppercase ml-1">Genre</label>
                <select v-model="userProfile.gender" class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800 appearance-none">
                  <option value="male">Homme</option>
                  <option value="female">Femme</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-slate-500 uppercase ml-1">Âge</label>
                <input type="number" v-model.number="userProfile.age" class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800">
              </div>
              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-slate-500 uppercase ml-1">Poids (kg)</label>
                <input type="number" v-model.number="userProfile.weight" step="0.1" class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800">
              </div>
              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-slate-500 uppercase ml-1">Taille (cm)</label>
                <input type="number" v-model.number="userProfile.height" class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800">
              </div>
            </div>
          </div>

          <!-- Activity & Goal -->
          <div class="space-y-4">
            <h4 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Mode de Vie</h4>
            <div class="space-y-5">
              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-slate-500 uppercase ml-1">Niveau d'activité</label>
                <select v-model.number="userProfile.activity_level" class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800 appearance-none">
                  <option :value="1.2">Sédentaire (Pas d'exercice)</option>
                  <option :value="1.375">Légèrement actif (1-3 j/sem)</option>
                  <option :value="1.55">Modérément actif (3-5 j/sem)</option>
                  <option :value="1.725">Très actif (6-7 j/sem)</option>
                  <option :value="1.9">Extrêmement actif (Pro + Sport intensity)</option>
                </select>
              </div>

              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-slate-500 uppercase ml-1">Objectif Principal</label>
                <div class="grid grid-cols-3 gap-2">
                  <button v-for="type in [{id:'loss', l:'Sèche'}, {id:'maintenance', l:'Maintien'}, {id:'muscle', l:'Masse'}]" 
                    :key="type.id"
                    @click="userProfile.goal_type = type.id" 
                    :class="userProfile.goal_type === type.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'"
                    class="px-4 py-4 rounded-2xl font-black transition-all text-xs uppercase"
                  >
                    {{ type.l }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Target Preview -->
          <div class="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Cibles Automatiques</h4>
            <div class="grid grid-cols-4 gap-4 text-center">
              <div>
                <div class="text-[9px] text-slate-500 font-black uppercase mb-1 tracking-tighter">Calories</div>
                <div class="font-black text-lg text-rose-400">{{ calculatedGoals.calories }}</div>
              </div>
              <div>
                <div class="text-[9px] text-slate-500 font-black uppercase mb-1 tracking-tighter">Prot. (g)</div>
                <div class="font-black text-lg text-blue-400">{{ calculatedGoals.protein }}</div>
              </div>
              <div>
                <div class="text-[9px] text-slate-500 font-black uppercase mb-1 tracking-tighter">Gluc. (g)</div>
                <div class="font-black text-lg text-amber-400">{{ calculatedGoals.carbs }}</div>
              </div>
              <div>
                <div class="text-[9px] text-slate-500 font-black uppercase mb-1 tracking-tighter">Lip. (g)</div>
                <div class="font-black text-lg text-emerald-400">{{ calculatedGoals.fats }}</div>
              </div>
            </div>
            <div class="absolute -bottom-4 -right-4 text-white opacity-5">
              <Activity :size="120" />
            </div>
          </div>
        </div>

        <div class="p-8 border-t border-slate-50 grid grid-cols-2 gap-4">
          <button @click="showSettings = false" class="py-4 rounded-2xl font-black text-slate-400 hover:text-slate-900 transition-colors uppercase text-xs tracking-widest">
            Annuler
          </button>
          <button @click="saveUserSettings" :disabled="savingSettings" class="bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black transition-all flex justify-center items-center gap-2 shadow-xl active:scale-[0.95] uppercase text-xs tracking-widest disabled:opacity-50">
            <div v-if="savingSettings" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Sauvegarder
          </button>
        </div>
      </div>
    </div>

    <!-- Habits Modal -->
    <div v-if="showHabits" class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
      <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" @click="showHabits = false"></div>

      <div class="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] animate-slide-up">
        <div class="p-8 flex justify-between items-center border-b border-slate-50">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-indigo-50 rounded-2xl text-indigo-600">
              <Repeat :size="24" />
            </div>
            <h3 class="text-2xl font-black text-slate-900 tracking-tight">Mes Habitudes</h3>
          </div>
          <button @click="showHabits = false" class="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all">
            <X :size="24" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-8">
          <div v-if="loadingHabits" class="flex justify-center py-12">
            <div class="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
          
          <div v-else class="space-y-6">
            <div v-if="recurringMeals.length === 0" class="text-center py-8">
              <p class="text-slate-400 font-bold">Aucune habitude enregistrée</p>
            </div>
            <div class="space-y-3">
              <div v-for="habit in recurringMeals" :key="habit.id" class="flex items-center justify-between bg-slate-50 p-5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all group">
                <div class="flex flex-col">
                  <h4 class="font-black text-slate-800 text-base leading-tight">{{ habit.meal_name }}</h4>
                  <div class="text-[10px] font-black text-slate-400 uppercase flex gap-3 mt-1 tracking-widest">
                    <span>{{ habit.calories }} kcal</span>
                    <span>P {{ habit.protein }}g</span>
                    <span>G {{ habit.carbs }}g</span>
                    <span>L {{ habit.fats }}g</span>
                  </div>
                </div>
                <button @click="deleteHabit(habit.id)" class="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 :size="18" />
                </button>
              </div>
            </div>

            <!-- New Habit Form -->
            <div class="pt-8 border-t border-slate-100">
              <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Ajouter un Modèle</h4>
              <div class="space-y-4">
                <input v-model="newHabit.meal_name" type="text" placeholder="Nom du repas (ex: Shaker Whey)" class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800">
                <div class="grid grid-cols-4 gap-3">
                  <div class="space-y-1.5">
                    <label class="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-tighter">Cal</label>
                    <input v-model.number="newHabit.calories" type="number" class="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-bold text-center">
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-tighter">Prot</label>
                    <input v-model.number="newHabit.protein" type="number" class="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-bold text-center">
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-tighter">Gluc</label>
                    <input v-model.number="newHabit.carbs" type="number" class="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-bold text-center">
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-tighter">Lip</label>
                    <input v-model.number="newHabit.fats" type="number" class="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-bold text-center">
                  </div>
                </div>
                <button @click="addHabit" :disabled="!newHabit.meal_name" class="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black transition-all flex justify-center items-center gap-2 shadow-xl active:scale-[0.95] disabled:opacity-50 uppercase text-xs tracking-widest mt-2">
                  <Plus :size="18" /> Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Meal Modal -->
    <div v-if="showEditModal && editingMeal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" @click="showEditModal = false"></div>

      <div class="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 animate-scale-up">
        <div class="flex items-center gap-3 mb-8">
          <div class="p-2.5 bg-indigo-50 rounded-2xl text-indigo-600">
            <Pencil :size="22" />
          </div>
          <h3 class="text-2xl font-black text-slate-900 tracking-tight">Modifier</h3>
        </div>

        <div class="space-y-6">
          <div class="space-y-1.5">
            <label class="text-[11px] font-bold text-slate-500 uppercase ml-1">Désignation</label>
            <input v-model="editingMeal.meal_name" type="text" class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800">
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-[11px] font-bold text-slate-500 uppercase ml-1">Calories</label>
              <input v-model.number="editingMeal.calories" type="number" class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold">
            </div>
            <div class="space-y-1.5">
              <label class="text-[11px] font-bold text-slate-500 uppercase ml-1">Protéines (g)</label>
              <input v-model.number="editingMeal.protein" type="number" class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold">
            </div>
            <div class="space-y-1.5">
              <label class="text-[11px] font-bold text-slate-500 uppercase ml-1">Glucides (g)</label>
              <input v-model.number="editingMeal.carbs" type="number" class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold">
            </div>
            <div class="space-y-1.5">
              <label class="text-[11px] font-bold text-slate-500 uppercase ml-1">Lipides (g)</label>
              <input v-model.number="editingMeal.fats" type="number" class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold">
            </div>
          </div>
        </div>

        <div class="mt-10 flex gap-3">
          <button @click="showEditModal = false" class="flex-1 py-4 rounded-2xl font-black text-slate-400 hover:text-slate-900 transition-colors uppercase text-xs tracking-widest">
            Annuler
          </button>
          <button @click="updateMeal" class="flex-1 bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black transition-all shadow-xl active:scale-[0.95] uppercase text-xs tracking-widest">
            Mettre à jour
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'
import { 
  Activity, 
  Flame, 
  Beef, 
  Wheat, 
  Droplet, 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  Repeat, 
  Archive, 
  Plus, 
  Sparkles, 
  Save, 
  Pencil, 
  Trash2, 
  X, 
  Calendar, 
  Utensils,
  CheckCircle2,
  AlertCircle,
  Circle
} from 'lucide-vue-next'

const { user } = useAuth()

// State
const loading = ref(true)
const todaysMeals = ref([])
const showSettings = ref(false)
const savingSettings = ref(false)

// Time Navigation State
const currentDate = ref(new Date())

const formattedCurrentDate = computed(() => {
  const today = new Date()
  const isToday = currentDate.value.toDateString() === today.toDateString()
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = currentDate.value.toDateString() === yesterday.toDateString()
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = currentDate.value.toDateString() === tomorrow.toDateString()

  if (isToday) return "Aujourd'hui"
  if (isYesterday) return "Hier"
  if (isTomorrow) return "Demain"

  return currentDate.value.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
})

const getLocalISOString = (date) => {
  const offset = date.getTimezoneOffset()
  const d = new Date(date.getTime() - (offset * 60 * 1000))
  return d.toISOString().split('T')[0]
}

const currentDateStr = computed(() => {
  return getLocalISOString(currentDate.value)
})

const changeDate = (days) => {
  const newDate = new Date(currentDate.value)
  newDate.setDate(newDate.getDate() + days)
  currentDate.value = newDate
}

// User Settings State (Biometrics)
const userProfile = ref({
  gender: 'male',
  age: 25,
  weight: 75,
  height: 180,
  activity_level: 1.55, // default: moderately active
  goal_type: 'maintenance' // loss, maintenance, muscle
})

// Calculated goals (Fallback defaults)
const GOALS = ref({
  calories: 2500,
  protein: 160,
  carbs: 300,
  fats: 80
})

// Habits State
const showHabits = ref(false)
const recurringMeals = ref([])
const loadingHabits = ref(false)
const newHabit = ref({
  meal_name: '',
  calories: 0,
  protein: 0,
  carbs: 0,
  fats: 0,
  is_exceptional_meal: false
})

// Edit State
const showEditModal = ref(false)
const editingMeal = ref(null)

// Library / Meal Prep State
const showLibrary = ref(false)
const savedMeals = ref([])
const loadingLibrary = ref(false)

// AI State
const mealText = ref('')
const analyzing = ref(false)
const analyzedMeal = ref(null)
const savingMeal = ref(false)

const dailyTotals = computed(() => {
  return todaysMeals.value
    .filter(meal => !meal.is_skipped)
    .reduce((acc, meal) => {
      return {
        calories: acc.calories + (Number(meal.calories) || 0),
        protein: acc.protein + (Number(meal.protein) || 0),
        carbs: acc.carbs + (Number(meal.carbs) || 0),
        fats: acc.fats + (Number(meal.fats) || 0)
      }
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 })
})

// Auto-calculate macros based on biometrics
const calculatedGoals = computed(() => {
  const p = userProfile.value
  let bmr = (10 * p.weight) + (6.25 * p.height) - (5 * p.age)
  bmr = p.gender === 'male' ? bmr + 5 : bmr - 161
  const tdee = bmr * p.activity_level
  
  let targetCalories = tdee
  if (p.goal_type === 'loss') targetCalories -= 500
  if (p.goal_type === 'muscle') targetCalories += 300
  
  targetCalories = Math.round(targetCalories)
  
  const protein = Math.round(p.weight * 2.2)
  const proteinCal = protein * 4
  
  const fats = Math.round(p.weight * 1.0)
  const fatsCal = fats * 9
  
  const remainingCal = targetCalories - proteinCal - fatsCal
  const carbs = Math.max(0, Math.round(remainingCal / 4))
  
  return { calories: targetCalories, protein, carbs, fats }
})

// On Date Change -> refetch meals
watch(currentDateStr, async (newVal) => {
  if (user.value?.id) {
    await fetchTodaysMeals(user.value.id, newVal)
  }
})

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
    const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).single()
    if (data) userProfile.value = { ...userProfile.value, ...data }
  } catch(e) {
    console.error("Erreur chargement préférences:", e)
  }
}

const saveUserSettings = async () => {
  if (!user.value) return
  savingSettings.value = true
  try {
    const { error } = await supabase.from('user_settings').upsert({
      user_id: user.value.id,
      ...userProfile.value,
      calories_target: calculatedGoals.value.calories,
      protein_target: calculatedGoals.value.protein,
      carbs_target: calculatedGoals.value.carbs,
      fats_target: calculatedGoals.value.fats,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    if (error) throw error
    showSettings.value = false
  } catch(e) {
    console.error("Erreur sauvegarde:", e)
  } finally {
    savingSettings.value = false
  }
}

const fetchTodaysMeals = async (userId, focusDateStr) => {
  loading.value = true
  try {
    const { data: logs, error } = await supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', focusDateStr)
      .order('id', { ascending: false })
      
    if (logs && logs.length > 0) {
      todaysMeals.value = logs
    } else {
      todaysMeals.value = []
      // Injection des habitudes sur n'importe quel jour consulté s'il est vide
      await checkAndInjectHabits(userId, focusDateStr)
    }
  } catch(e) {
    console.error("Erreur chargement nutrition:", e)
  } finally {
    loading.value = false
  }
}

const checkAndInjectHabits = async (userId, dateStr) => {
  try {
    const { data: habits } = await supabase.from('recurring_meals').select('*').eq('user_id', userId)
    if (habits && habits.length > 0) {
      const payloads = habits.map(h => ({
        user_id: userId,
        date: dateStr,
        meal_name: h.meal_name,
        calories: h.calories,
        protein: h.protein,
        carbs: h.carbs,
        fats: h.fats,
        is_exceptional_meal: h.is_exceptional_meal,
        is_skipped: false
      }))
      const { data: insertedLogs } = await supabase.from('nutrition_logs').insert(payloads).select()
      if (insertedLogs) todaysMeals.value = insertedLogs.sort((a,b) => b.id - a.id)
    }
  } catch(e) {
    console.error("Erreur injection habitudes:", e)
  }
}

const fetchHabits = async (userId) => {
  loadingHabits.value = true
  try {
    const { data } = await supabase.from('recurring_meals').select('*').eq('user_id', userId).order('created_at', { ascending: true })
    if (data) recurringMeals.value = data
  } catch(e) {
    console.error("Erreur chargement habitudes:", e)
  } finally {
    loadingHabits.value = false
  }
}

const addHabit = async () => {
  if (!user.value || !newHabit.value.meal_name) return
  try {
    const { data } = await supabase.from('recurring_meals').insert({ user_id: user.value.id, ...newHabit.value }).select()
    if (data && data.length > 0) {
      recurringMeals.value.push(data[0])
      newHabit.value = { meal_name: '', calories: 0, protein: 0, carbs: 0, fats: 0, is_exceptional_meal: false }
    }
  } catch(e) {
    console.error("Erreur ajout habitude:", e)
  }
}

const deleteHabit = async (id) => {
  if (!confirm('Supprimer cette habitude ?')) return
  try {
    const { error } = await supabase.from('recurring_meals').delete().eq('id', id)
    if (!error) recurringMeals.value = recurringMeals.value.filter(h => h.id !== id)
  } catch(e) {
    console.error("Erreur suppression habitude:", e)
  }
}

const openEditModal = (meal) => {
  editingMeal.value = { ...meal }
  showEditModal.value = true
}

const updateMeal = async () => {
  if (!editingMeal.value) return
  try {
    const { data, error } = await supabase
      .from('nutrition_logs')
      .update({
        meal_name: editingMeal.value.meal_name,
        calories: editingMeal.value.calories,
        protein: editingMeal.value.protein,
        carbs: editingMeal.value.carbs,
        fats: editingMeal.value.fats,
      })
      .eq('id', editingMeal.value.id)
      .select()
      
    if (data && data.length > 0) {
      const idx = todaysMeals.value.findIndex(m => m.id === editingMeal.value.id)
      if (idx !== -1) todaysMeals.value[idx] = data[0]
      showEditModal.value = false
    }
  } catch(e) {
    console.error("Erreur de mise à jour:", e)
  }
}

const analyzeWithAI = async () => {
  if (!mealText.value.trim()) return
  
  analyzing.value = true
  analyzedMeal.value = null
  
  try {
    // Force un rafraîchissement du JWT pour éviter les erreurs 401
    const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError || !session) throw new Error("Non authentifié — veuillez vous reconnecter.")

    const response = await supabase.functions.invoke('analyze-nutrition', {
      body: { 
        text: `Objectif journalier autorisé: ${calculatedGoals.value.calories}kcal, ${calculatedGoals.value.protein}g protéines, ${calculatedGoals.value.carbs}g glucides, ${calculatedGoals.value.fats}g lipides.\n\nDescription du repas: ${mealText.value}` 
      }
    })
    
    if (response.error) {
      const errorMsg = response.error.context?.error || response.error.message || JSON.stringify(response.error)
      throw new Error(`Erreur API: ${errorMsg}`)
    }
    
    if (!response.data) throw new Error("Aucune donnée renvoyée par l'API")
    
    analyzedMeal.value = response.data
  } catch (error) {
    console.error("Erreur lors de l'analyse avec l'IA:", error)
    alert(`Échec de l'analyse. ${error.message || String(error)}`)
  } finally {
    analyzing.value = false
  }
}

const saveAnalyzedMeal = async () => {
  if (!user.value || !analyzedMeal.value) return
  
  savingMeal.value = true
  
  const payload = {
    user_id: user.value.id,
    date: currentDateStr.value,
    meal_name: analyzedMeal.value.meal_name,
    calories: analyzedMeal.value.calories || 0,
    protein: analyzedMeal.value.protein || 0,
    carbs: analyzedMeal.value.carbs || 0,
    fats: analyzedMeal.value.fats || 0,
    is_exceptional_meal: analyzedMeal.value.is_exceptional_meal || false
  }
  
  try {
    const { data } = await supabase.from('nutrition_logs').insert(payload).select()
      
    if (data && data.length > 0) {
      todaysMeals.value.unshift(data[0]) 
      mealText.value = ''
      analyzedMeal.value = null
    }
  } catch (error) {
    console.error("Erreur d'enregistrement:", error)
  } finally {
    savingMeal.value = false
  }
}

const deleteMeal = async (id) => {
  if (!confirm('Supprimer ce repas ?')) return
  try {
    const { error } = await supabase.from('nutrition_logs').delete().eq('id', id)
    if (!error) todaysMeals.value = todaysMeals.value.filter(m => m.id !== id)
  } catch(e) {
    console.error("Erreur lors de la suppression:", e)
  }
}

const toggleSkipMeal = async (meal) => {
  const newSkipStatus = !meal.is_skipped
  try {
    const { data, error } = await supabase
      .from('nutrition_logs')
      .update({ is_skipped: newSkipStatus })
      .eq('id', meal.id)
      .select()
    
    if (data && data.length > 0) {
      const idx = todaysMeals.value.findIndex(m => m.id === meal.id)
      if (idx !== -1) todaysMeals.value[idx].is_skipped = data[0].is_skipped
    }
  } catch (e) {
    console.error("Erreur lors de la modification du statut:", e)
  }
}

// -----------------------
// Meal Prep / Library Module
// -----------------------
const fetchLibrary = async (userId) => {
  loadingLibrary.value = true
  try {
    const { data } = await supabase.from('saved_meals').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (data) savedMeals.value = data
  } catch(e) {
    console.error("Erreur chargement bibliothèque:", e)
  } finally {
    loadingLibrary.value = false
  }
}

const saveToLibrary = async (meal) => {
  if (!user.value) return
  try {
    const payload = { ...meal, user_id: user.value.id, id: undefined, date: undefined, created_at: undefined }
    const { data, error } = await supabase.from('saved_meals').insert(payload).select()
    if (data && data.length > 0) {
      savedMeals.value.unshift(data[0])
      alert("Meal ajouté à votre Prep Library ! Vous pourrez le planifier dans 'Mon Meal Prep'.")
    }
  } catch(e) {
    console.error("Erreur ajout à la bibliothèque:", e)
  }
}

// To implement in Meal Prep Template Modal
const planningMealPayload = ref(null)
const planningDatesSelection = ref([])
const showPlanningModal = ref(false)

const openPlanModal = (meal) => {
  planningMealPayload.value = meal
  planningDatesSelection.value = []
  showPlanningModal.value = true
}

const dispatchPlannedMeals = async () => {
  if(!planningMealPayload.value || planningDatesSelection.value.length === 0) return
  try {
    const payloads = planningDatesSelection.value.map(dateStr => ({
      user_id: user.value.id,
      date: dateStr,
      meal_name: planningMealPayload.value.meal_name,
      calories: planningMealPayload.value.calories,
      protein: planningMealPayload.value.protein,
      carbs: planningMealPayload.value.carbs,
      fats: planningMealPayload.value.fats,
      is_exceptional_meal: planningMealPayload.value.is_exceptional_meal
    }))
    
    const { error } = await supabase.from('nutrition_logs').insert(payloads)
    if(error) throw error
    alert("Repas planifié avec succès !")
    showPlanningModal.value = false
    
    // Automatically reload current view if any selected dates hit today's view
    if(planningDatesSelection.value.includes(currentDateStr.value)) {
      await fetchTodaysMeals(user.value.id, currentDateStr.value)
    }

  } catch(e) {
    console.error("Erreur lors de la planification:", e)
  }
}

const deleteSavedMeal = async (id) => {
  if (!confirm('Supprimer ce template de la bibliothèque ?')) return
  try {
    const { error } = await supabase.from('saved_meals').delete().eq('id', id)
    if (!error) savedMeals.value = savedMeals.value.filter(m => m.id !== id)
  } catch(e) {
    console.error("Erreur suppression de la bibliothèque:", e)
  }
}

const buildNextDays = () => {
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const offset = d.getTimezoneOffset()
    const dLocal = new Date(d.getTime() - (offset*60*1000))
    const dateStr = dLocal.toISOString().split('T')[0]
    const label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })
    dates.push({ dateStr, label })
  }
  return dates
}

const planningDaysOptions = buildNextDays()

</script>
