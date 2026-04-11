<template>
  <div class="bg-gradient-to-br from-blue-50 to-sky-100 dark:from-slate-900 dark:to-blue-900/20 rounded-[2rem] p-5 md:p-6 border border-blue-100 dark:border-blue-900/30 shadow-xl shadow-blue-500/5 transition-all hover:shadow-blue-500/10 group">
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-500">
          <Droplets :size="20" stroke-width="2.5" />
        </div>
        <div>
          <h3 class="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">Hydratation</h3>
          <p class="text-blue-500/60 dark:text-blue-400/60 text-[9px] font-black uppercase tracking-[0.2em] mt-1">Besoin estimé</p>
        </div>
      </div>
    </div>

    <!-- Main Display -->
    <div class="flex flex-col items-center justify-center py-3 mb-6 relative">
      <div class="absolute inset-0 flex items-center justify-center opacity-[0.02] dark:opacity-[0.04] pointer-events-none select-none">
        <Droplets :size="120" stroke-width="1" />
      </div>
      <div class="relative flex items-baseline gap-2">
        <span class="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter transition-all duration-500">
          {{ dailyWaterNeeds }}
        </span>
        <span class="text-xl font-black text-blue-500 tracking-tight">L</span>
      </div>
      <div class="mt-2 flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 dark:bg-blue-500/20 rounded-full border border-blue-500/10 transition-all select-none">
        <span class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
        <span class="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">En temps réel</span>
      </div>
    </div>

    <!-- Controls -->
    <div class="space-y-4">
      <!-- Weight Input -->
      <div class="space-y-2">
        <div class="flex justify-between items-center px-1">
          <label for="weight" class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none">
            Poids (kg)
          </label>
        </div>
        <div class="relative group/input">
          <input 
            id="weight"
            v-model.number="weight" 
            type="number" 
            step="0.5"
            class="w-full px-5 py-3 bg-white dark:bg-slate-800/50 border border-blue-100 dark:border-blue-900/30 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-800 dark:text-white text-base shadow-sm"
          >
          <div class="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500 font-bold text-sm pointer-events-none select-none">
            kg
          </div>
        </div>
      </div>

      <!-- Toggles Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Training Day Toggle -->
        <label 
          class="flex items-center justify-between p-3.5 bg-white dark:bg-slate-800/50 border border-blue-100 dark:border-blue-900/30 rounded-xl cursor-pointer transition-all hover:border-blue-300 dark:hover:border-blue-700 active:scale-[0.98] select-none"
          :class="{ 'ring-2 ring-blue-500/10 border-blue-500 dark:border-blue-500': isTrainingDay }"
        >
          <div class="flex flex-col">
            <span class="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Sport ?</span>
            <span class="text-[8px] font-bold text-blue-500 uppercase tracking-tighter font-mono">+0.5L</span>
          </div>
          <div class="relative inline-flex items-center">
            <input type="checkbox" v-model="isTrainingDay" class="sr-only peer">
            <div class="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
          </div>
        </label>

        <!-- Creatine Toggle -->
        <label 
          class="flex items-center justify-between p-3.5 bg-white dark:bg-slate-800/50 border border-blue-100 dark:border-blue-900/30 rounded-xl cursor-pointer transition-all hover:border-blue-300 dark:hover:border-blue-700 active:scale-[0.98] select-none"
          :class="{ 'ring-2 ring-blue-500/10 border-blue-500 dark:border-blue-500': takesCreatine }"
        >
          <div class="flex flex-col">
            <span class="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Créatine ?</span>
            <span class="text-[8px] font-bold text-blue-500 uppercase tracking-tighter font-mono">+0.5L</span>
          </div>
          <div class="relative inline-flex items-center">
            <input type="checkbox" v-model="takesCreatine" class="sr-only peer">
            <div class="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
          </div>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Droplets } from 'lucide-vue-next'

const props = defineProps({
  weight: {
    type: Number,
    default: 75
  }
})

const emit = defineEmits(['update:weight'])

// State
const weight = ref(props.weight)
const isTrainingDay = ref(false)
const takesCreatine = ref(false)

// Sync weight with prop changes
watch(() => props.weight, (newWeight) => {
  weight.value = newWeight
})

// Emit changes back to parent
watch(weight, (newWeight) => {
  emit('update:weight', newWeight)
})

/**
 * Calcul du besoin d'hydratation
 * Formule: (Poids * 35) + (500 si entrainement) + (500 si créatine)
 * Résultat en Litres
 */
const dailyWaterNeeds = computed(() => {
  const baseNeeds = (weight.value || 0) * 35
  const activityBonus = isTrainingDay.value ? 500 : 0
  const supplementBonus = takesCreatine.value ? 500 : 0
  
  const totalMl = baseNeeds + activityBonus + supplementBonus
  return (totalMl / 1000).toFixed(1)
})
</script>

<style scoped>
/* Suppression des flèches sur les inputs number pour un look plus clean */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
