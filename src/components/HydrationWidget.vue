<template>
  <section class="hydration-widget" aria-label="Hydratation">
    <div class="hydration-head">
      <span class="hydration-icon" aria-hidden="true">
        <Droplets :size="20" stroke-width="1.75" />
      </span>
      <div class="hydration-text">
        <h2 class="hydration-title">Hydratation</h2>
        <p class="hydration-sub">Besoin estimé</p>
      </div>
      <p class="hydration-value">{{ dailyWaterNeeds }}<span class="hydration-unit"> L</span></p>
    </div>

    <div class="hydration-controls">
      <label class="weight-field">
        <span>Poids</span>
        <input v-model.number="weight" type="number" inputmode="decimal" step="0.5" class="weight-input" />
        <span>kg</span>
      </label>
      <label class="toggle-chip" :class="{ 'toggle-chip--on': isTrainingDay }">
        <input v-model="isTrainingDay" type="checkbox" class="sr-only" />
        Sport, +0,5 L
      </label>
      <label class="toggle-chip" :class="{ 'toggle-chip--on': takesCreatine }">
        <input v-model="takesCreatine" type="checkbox" class="sr-only" />
        Créatine, +0,5 L
      </label>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Droplets } from 'lucide-vue-next'

const props = defineProps({ weight: { type: Number, default: 75 } })
const emit = defineEmits(['update:weight'])

const weight = ref(props.weight)
const isTrainingDay = ref(false)
const takesCreatine = ref(false)

watch(() => props.weight, (v) => { weight.value = v })
watch(weight, (v) => emit('update:weight', v))

const dailyWaterNeeds = computed(() => {
  const base = (weight.value || 0) * 35
  const activity = isTrainingDay.value ? 500 : 0
  const supplement = takesCreatine.value ? 500 : 0
  return ((base + activity + supplement) / 1000).toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })
})
</script>

<style scoped>
.hydration-widget {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--bg-raised);
}

.hydration-head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.hydration-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: var(--module-sleep-dim);
  color: var(--module-sleep);
}

.hydration-text { flex: 1; min-width: 0; }

.hydration-title {
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.hydration-sub {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.hydration-value {
  font-size: var(--text-2xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.hydration-unit {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.hydration-controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.weight-field,
.toggle-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 44px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--bg-overlay);
  font-size: var(--text-xs);
  font-weight: 500;
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}

.weight-field { color: var(--text-secondary); cursor: text; }

.weight-input {
  width: 52px;
  min-height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--bg-raised);
  font-family: var(--font-sans);
  font-size: var(--text-md);
  color: var(--text-primary);
  text-align: center;
}

.toggle-chip--on {
  background: var(--module-sleep-dim);
  color: var(--module-sleep);
}

.toggle-chip:focus-within {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
