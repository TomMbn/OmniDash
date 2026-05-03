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
                    : (day.session === 'REPOS' ? 'bg-slate-100' : (day.session === 'MATCH' ? 'bg-amber-100/60' : (day.session === 'CARDIO' ? 'bg-teal-100/60' : 'bg-indigo-100/60')))
                ]"
              >
                <component
                  :is="day.session === 'REPOS' ? Moon : (day.session === 'MATCH' ? Trophy : (day.session === 'CARDIO' ? Heart : Dumbbell))"
                  :size="18"
                  :stroke-width="day.dayIndex === selectedDayIndex ? 3 : 2.5"
                  :class="[
                    day.dayIndex === selectedDayIndex
                      ? 'text-white'
                      : (day.session === 'REPOS' ? 'text-slate-500' : (day.session === 'MATCH' ? 'text-amber-600' : (day.session === 'CARDIO' ? 'text-teal-600' : 'text-indigo-600')))
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

            <!-- CARDIO SESSION -->
            <div v-if="isCardioSession" class="px-8 pb-8">
              <div class="space-y-3 mb-8">
                <div v-for="option in selectedPlan.template.cardioOptions" :key="option.name"
                  class="flex items-start gap-4 p-4 rounded-2xl bg-teal-50/60 border border-teal-100/50">
                  <div class="p-2 bg-teal-100 rounded-xl text-teal-600 flex-shrink-0">
                    <Heart :size="16" />
                  </div>
                  <div>
                    <p class="text-sm font-black text-slate-800">{{ option.name }}</p>
                    <p class="text-xs font-bold text-teal-600 mt-0.5">{{ option.duration }}</p>
                    <p class="text-[10px] text-slate-400 mt-0.5">{{ option.note }}</p>
                  </div>
                </div>
              </div>

              <!-- Active cardio logging form -->
              <div v-if="isSelectedToday && currentWorkout && !cardioSaved" class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Activité</label>
                    <input v-model="cardioLog.activity" placeholder="Vélo, marche…"
                      class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Durée (min)</label>
                    <input v-model.number="cardioLog.duration" type="number" placeholder="35"
                      class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">FC moy. (bpm)</label>
                    <input v-model.number="cardioLog.avgHR" type="number" placeholder="130"
                      class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Zone</label>
                    <select v-model="cardioLog.zone"
                      class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-teal-500 outline-none appearance-none">
                      <option value="2">Zone 2 (LISS)</option>
                      <option value="3">Zone 3</option>
                      <option value="4">Zone 4</option>
                    </select>
                  </div>
                </div>
                <button @click="saveCardioLog"
                  class="w-full bg-teal-600 hover:bg-teal-700 text-white py-5 rounded-[2rem] font-black text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl">
                  <CheckCircle2 :size="22" />
                  Valider la séance cardio
                </button>
              </div>

              <!-- Cardio done state -->
              <div v-else-if="isSelectedToday && currentWorkout && cardioSaved" class="bg-teal-50 border border-teal-100 p-5 rounded-[2rem] flex items-center justify-center gap-3">
                <CheckCircle2 :size="18" class="text-teal-600" />
                <div class="text-center">
                  <p class="text-sm font-black text-teal-700">Cardio enregistré ✓</p>
                  <p v-if="cardioLog.duration" class="text-xs text-teal-500 mt-0.5">{{ cardioLog.activity || 'Séance' }} · {{ cardioLog.duration }} min<span v-if="cardioLog.avgHR"> · {{ cardioLog.avgHR }} bpm moy.</span></p>
                </div>
              </div>

              <!-- Start cardio button -->
              <button v-if="isSelectedToday && !currentWorkout" @click="startCardio" :disabled="loading.workout"
                class="w-full bg-teal-600 hover:bg-teal-700 text-white py-6 rounded-[2rem] font-black text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl disabled:opacity-50">
                <div v-if="loading.workout" class="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                <Play v-else :size="24" />
                Démarrer le cardio
              </button>
            </div>

            <!-- STRENGTH SESSION — Exercises Quick List -->
            <div v-else-if="selectedPlan.template.exercises.length > 0" class="px-8 pb-8">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-2 mb-8">
                <template v-for="item in enrichedExercises" :key="item.isSep ? 'sep-' + item.label : item.name + item.num">
                  <!-- Section separator -->
                  <div v-if="item.isSep" class="col-span-full pt-4 pb-1">
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{{ item.label }}</span>
                  </div>
                  <!-- Exercise card -->
                  <div v-else
                    class="flex flex-col p-5 rounded-3xl transition-all gap-3"
                    :class="editingTemplate ? 'bg-indigo-50/50 border border-indigo-100' : 'bg-slate-50 border border-transparent'"
                  >
                    <!-- Top row: number + name + badges -->
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-start gap-3 min-w-0 flex-1">
                        <span class="text-xs font-black text-slate-300 w-4 text-center mt-0.5 flex-shrink-0">{{ item.num }}</span>
                        <div class="min-w-0">
                          <p class="text-sm font-black text-slate-800 whitespace-normal break-words leading-tight">{{ item.name }}</p>
                          <p v-if="item.note && !editingTemplate" class="text-[10px] font-medium text-slate-400 mt-1 leading-tight">{{ item.note }}</p>
                        </div>
                      </div>
                      <div class="flex flex-col items-end gap-1 flex-shrink-0 pt-0.5 ml-1">
                        <template v-if="editingTemplate">
                          <div class="flex items-center gap-1">
                            <input type="number" :value="item.sets"
                              @change="updateTemplateField(selectedPlan.session, item.num - 1, 'sets', $event.target.value)"
                              class="w-8 py-1.5 text-xs font-black text-center bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                            <span class="text-indigo-300 text-[10px] font-black">×</span>
                            <input type="text" :value="item.repsRange"
                              @change="updateTemplateField(selectedPlan.session, item.num - 1, 'repsRange', $event.target.value)"
                              class="w-12 py-1.5 text-xs font-black text-center bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                            <input type="number" :value="item.targetWeight"
                              @change="updateExerciseWeight(selectedPlan.session, item.num - 1, Number($event.target.value))"
                              class="w-14 py-1.5 text-xs font-black text-center bg-indigo-600 text-white rounded-xl outline-none" placeholder="kg" />
                          </div>
                        </template>
                        <template v-else>
                          <span class="px-3 py-1.5 bg-slate-200/50 text-slate-700 text-[10px] font-black rounded-lg whitespace-nowrap">{{ item.sets }} × {{ item.repsRange }}</span>
                          <span class="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-lg">
                            {{ item.targetWeight > 0 ? `${item.targetWeight}kg` : 'PDC' }}
                          </span>
                          <span v-if="item.restTime" class="text-[10px] text-slate-400 font-bold">{{ item.restTime }}</span>
                        </template>
                      </div>
                    </div>

                    <!-- Overload status row (viewing mode only) -->
                    <div v-if="!editingTemplate && getExerciseDbId(item.name)"
                      class="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                      <span class="text-[10px] text-slate-400 font-medium">
                        {{ getOverloadStatus(getExerciseDbId(item.name), item.repsRange)?.lastPerf || '—' }}
                      </span>
                      <div v-if="getOverloadStatus(getExerciseDbId(item.name), item.repsRange)"
                        class="flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          :class="overloadStyles[getOverloadStatus(getExerciseDbId(item.name), item.repsRange).status]?.dot"></span>
                        <span class="text-[10px] font-black"
                          :class="overloadStyles[getOverloadStatus(getExerciseDbId(item.name), item.repsRange).status]?.text">
                          {{ getOverloadStatus(getExerciseDbId(item.name), item.repsRange).label }}
                        </span>
                        <span v-if="getOverloadStatus(getExerciseDbId(item.name), item.repsRange).detail"
                          class="text-[10px] text-slate-400">
                          {{ getOverloadStatus(getExerciseDbId(item.name), item.repsRange).detail }}
                        </span>
                      </div>
                    </div>
                  </div>
                </template>
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
              <!-- Previous performance + overload indicator -->
              <template v-if="getLastSession(block.exercise_id) || getTemplateExercise(block.exercise_id)">
                <div class="mb-5 rounded-2xl overflow-hidden border"
                  :class="getOverloadStatus(block.exercise_id, getTemplateExercise(block.exercise_id)?.repsRange)?.status === 'INCREASE'
                    ? 'bg-emerald-50 border-emerald-200'
                    : getOverloadStatus(block.exercise_id, getTemplateExercise(block.exercise_id)?.repsRange)?.status === 'PROGRESS'
                      ? 'bg-amber-50 border-amber-200'
                      : getOverloadStatus(block.exercise_id, getTemplateExercise(block.exercise_id)?.repsRange)?.status === 'CONSOLIDATE'
                        ? 'bg-rose-50 border-rose-200'
                        : 'bg-slate-50 border-slate-200'"
                >
                  <div class="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                    <!-- Last session detail -->
                    <div>
                      <p class="text-[10px] font-black uppercase tracking-widest mb-1"
                        :class="getOverloadStatus(block.exercise_id, getTemplateExercise(block.exercise_id)?.repsRange)?.status === 'INCREASE' ? 'text-emerald-600'
                          : getOverloadStatus(block.exercise_id, getTemplateExercise(block.exercise_id)?.repsRange)?.status === 'PROGRESS' ? 'text-amber-600'
                          : getOverloadStatus(block.exercise_id, getTemplateExercise(block.exercise_id)?.repsRange)?.status === 'CONSOLIDATE' ? 'text-rose-600'
                          : 'text-slate-400'">
                        Séance précédente
                      </p>
                      <p v-if="getLastSession(block.exercise_id)" class="text-sm font-black text-slate-800">
                        {{ getLastSession(block.exercise_id).sets.map(s => `${s.weight > 0 ? s.weight + 'kg' : 'PDC'} × ${s.reps}`).join(' · ') }}
                      </p>
                      <p v-else class="text-sm font-medium text-slate-400 italic">Première séance avec cet exercice</p>
                    </div>
                    <!-- Overload badge -->
                    <div v-if="getOverloadStatus(block.exercise_id, getTemplateExercise(block.exercise_id)?.repsRange)"
                      class="flex flex-col items-end gap-0.5">
                      <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                        :class="overloadStyles[getOverloadStatus(block.exercise_id, getTemplateExercise(block.exercise_id)?.repsRange).status]?.bg">
                        <span class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          :class="overloadStyles[getOverloadStatus(block.exercise_id, getTemplateExercise(block.exercise_id)?.repsRange).status]?.dot"></span>
                        <span class="text-xs font-black"
                          :class="overloadStyles[getOverloadStatus(block.exercise_id, getTemplateExercise(block.exercise_id)?.repsRange).status]?.text">
                          {{ getOverloadStatus(block.exercise_id, getTemplateExercise(block.exercise_id)?.repsRange).label }}
                        </span>
                      </div>
                      <span v-if="getOverloadStatus(block.exercise_id, getTemplateExercise(block.exercise_id)?.repsRange).detail"
                        class="text-[10px] text-slate-500 font-medium mt-0.5">
                        {{ getOverloadStatus(block.exercise_id, getTemplateExercise(block.exercise_id)?.repsRange).detail }}
                      </span>
                    </div>
                  </div>
                </div>
              </template>

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

              <!-- Live completion indicator -->
              <div v-if="getLiveCompletion(block)"
                class="mt-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2">
                <CheckCircle2 :size="16" class="text-emerald-600 flex-shrink-0" />
                <p class="text-xs font-black text-emerald-700">{{ getLiveCompletion(block).text }}</p>
              </div>
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
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'
import { useWorkoutStats } from '@/composables/useWorkoutStats'
import { useWorkoutPrograms } from '@/composables/useWorkoutPrograms'
import { useProgressiveOverload } from '@/composables/useProgressiveOverload'
import {
  Dumbbell,
  Plus,
  Trash2,
  Play,
  Activity,
  ChevronRight,
  CheckCircle2,
  X,
  Pencil,
  Save,
  Trophy,
  Target,
  Flame,
  Moon,
  Heart,
  Timer,
  Layout as LayoutIcon
} from 'lucide-vue-next'
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

// ── Progressive overload ──
const { exerciseHistory, fetchHistoryForExercises, getLastSession, getOverloadStatus } = useProgressiveOverload()

// fetchHistoryForPlan is called inside loadData (after exercises are loaded)
// and when the user switches day in the week overview
const fetchHistoryForPlan = async (plan) => {
  if (!plan?.template?.exercises?.length || !exercises.value.length) return
  const uid = user.value?.id
  if (!uid) return
  const ids = plan.template.exercises
    .map(tplEx => exercises.value.find(e => e.name.toLowerCase() === tplEx.name.toLowerCase())?.id)
    .filter(Boolean)
  if (ids.length) await fetchHistoryForExercises(uid, ids)
}

// Helper: get DB id for a template exercise by name
const getExerciseDbId = (name) =>
  exercises.value.find(e => e.name.toLowerCase() === name.toLowerCase())?.id || null

// Helper: get the template exercise definition for an active block
const getTemplateExercise = (exerciseId) => {
  if (!exerciseId || !selectedPlan.value?.template?.exercises) return null
  const name = exercises.value.find(e => e.id === exerciseId)?.name
  if (!name) return null
  return selectedPlan.value.template.exercises.find(
    ex => ex.name.toLowerCase() === name.toLowerCase()
  ) || null
}

// Overload badge style map
const overloadStyles = {
  INCREASE:   { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  PROGRESS:   { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  CONSOLIDATE:{ bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500'    },
  START:      { bg: 'bg-slate-100',   text: 'text-slate-500',   dot: 'bg-slate-400'   },
}

// Live: did the user hit the max rep range on all completed sets?
const getLiveCompletion = (block) => {
  const tplEx = getTemplateExercise(block.exercise_id)
  if (!tplEx) return null
  const done = block.sets.filter(s => s.reps > 0)
  if (!done.length) return null
  const nums = tplEx.repsRange.replace(/[^0-9-]/g, '').split('-').map(Number).filter(Boolean)
  const maxReps = nums[nums.length - 1]
  if (!maxReps) return null
  if (done.length >= tplEx.sets && done.every(s => s.reps >= maxReps)) {
    return { ready: true, text: `${done.length}×${maxReps} ✓ — Augmente de 2.5kg la prochaine fois` }
  }
  return null
}

// ── Computed: exercises enriched with section separators ──
const enrichedExercises = computed(() => {
  const exercises = selectedPlan.value?.template?.exercises
  if (!exercises?.length) return []
  const result = []
  let lastSection = null
  let num = 0
  exercises.forEach(ex => {
    if (ex.section && ex.section !== lastSection) {
      result.push({ isSep: true, label: ex.section })
      lastSection = ex.section
    }
    num++
    result.push({ ...ex, isSep: false, num })
  })
  return result
})

const isCardioSession = computed(() => !!selectedPlan.value?.template?.isCardio)

// ── Cardio session logging ──
const CARDIO_LOG_KEY = 'omnidash_cardio_log'

const cardioLog = ref({ activity: '', duration: null, avgHR: null, zone: '2' })
const cardioSaved = ref(false)

const loadCardioLog = () => {
  const todayStr = new Date().toISOString().split('T')[0]
  try {
    const raw = localStorage.getItem(CARDIO_LOG_KEY)
    if (raw) {
      const log = JSON.parse(raw)
      if (log.date === todayStr) {
        cardioLog.value = { activity: log.activity, duration: log.duration, avgHR: log.avgHR, zone: log.zone || '2' }
        cardioSaved.value = true
      }
    }
  } catch (e) {}
}

const startCardio = async () => {
  loading.value.workout = true
  const { data } = await supabase.from('workouts').insert({
    date: new Date().toISOString(),
    user_id: user.value.id
  }).select()
  if (data) currentWorkout.value = data[0]
  loading.value.workout = false
}

const saveCardioLog = () => {
  const todayStr = new Date().toISOString().split('T')[0]
  localStorage.setItem(CARDIO_LOG_KEY, JSON.stringify({ ...cardioLog.value, date: todayStr }))
  cardioSaved.value = true
}

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

  if (isCardioSession.value) {
    loadCardioLog()
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
          blocksMap.get(set.exercise_id).sets.push({
            id: set.id,
            weight: set.weight,
            reps: set.reps,
            rpe: set.rpe
          })
        })
        workoutBlocks.value = Array.from(blocksMap.values())
      } else if (selectedPlan.value?.template?.exercises?.length) {
        // No sets saved yet (e.g. immediate refresh after starting) — restore from template
        workoutBlocks.value = selectedPlan.value.template.exercises
          .map(tplEx => {
            const dbEx = exercises.value.find(
              e => e.name.trim().toLowerCase() === tplEx.name.trim().toLowerCase()
            )
            if (!dbEx) return null
            const defaultReps = parseInt(tplEx.repsRange.split('-')[0]) || 10
            const lastSession = getLastSession(dbEx.id)
            const lastWeight = lastSession?.sets?.[0]?.weight ?? tplEx.targetWeight
            return {
              exercise_id: dbEx.id,
              sets: Array.from({ length: tplEx.sets }, () => ({
                weight: lastWeight,
                reps: defaultReps,
                rpe: null
              }))
            }
          })
          .filter(Boolean)
      }
    }
  } catch (err) {
    console.error("Error loading workout data:", err)
  } finally {
    loading.value.data = false
  }

  // Fetch progressive overload history for today's plan
  await fetchHistoryForPlan(selectedPlan.value)
}

// Refetch when user navigates to a different day
watch(selectedDayIndex, () => fetchHistoryForPlan(selectedPlan.value))

// ═══ Template-based Workout Start ═══
const startFromTemplate = async () => {
  if (!selectedPlan.value || isRestDay.value || !isSelectedToday.value) return

  loading.value.workout = true
  try {
    const { data, error } = await supabase.from('workouts').insert({
      date: new Date().toISOString(),
      user_id: user.value.id
    }).select()

    if (error) throw error
    if (!data?.length) return

    currentWorkout.value = data[0]

    // Pre-fill weight from last session if available, otherwise from template
    const template = selectedPlan.value.template
    workoutBlocks.value = template.exercises
      .map(tplEx => {
        const dbEx = exercises.value.find(
          e => e.name.trim().toLowerCase() === tplEx.name.trim().toLowerCase()
        )
        if (!dbEx) return null

        const lastSession = getLastSession(dbEx.id)
        const lastWeight = lastSession?.sets?.[0]?.weight ?? tplEx.targetWeight
        const defaultReps = parseInt(tplEx.repsRange.split('-')[0]) || 10

        return {
          exercise_id: dbEx.id,
          sets: Array.from({ length: tplEx.sets }, () => ({
            weight: lastWeight,
            reps: defaultReps,
            rpe: null
          }))
        }
      })
      .filter(Boolean)
  } catch (e) {
    console.error('Error starting template workout:', e)
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
  if (!exercise_id || set.weight == null || !set.reps) return

  try {
    if (set.id) {
      await supabase.from('workout_sets').update({
        weight: set.weight,
        reps: set.reps,
        rpe: set.rpe || null,
      }).eq('id', set.id)
    } else {
      const { data } = await supabase.from('workout_sets').insert({
        workout_id: currentWorkout.value.id,
        exercise_id,
        weight: set.weight,
        reps: set.reps,
        rpe: set.rpe || null,
        user_id: user.value.id
      }).select()
      if (data?.length > 0) set.id = data[0].id
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
