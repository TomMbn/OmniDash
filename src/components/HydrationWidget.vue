<template>
  <div class="hydration-widget">
    <div class="hydration-header">
      <div class="hydration-icon">
        <Droplets :size="16" stroke-width="1.75" />
      </div>
      <div>
        <h3 class="hydration-title">Hydratation</h3>
        <p class="hydration-sub">Besoin estimé</p>
      </div>
    </div>

    <div class="hydration-display">
      <div class="hydration-value">
        <span class="hydration-number">{{ dailyWaterNeeds }}</span>
        <span class="hydration-unit">L</span>
      </div>
      <div class="hydration-live-badge">
        <span class="live-dot" />
        <span>En temps réel</span>
      </div>
    </div>

    <div class="hydration-controls">
      <div class="field-group">
        <label class="field-label" for="hyd-weight">Poids (kg)</label>
        <div class="weight-input-wrap">
          <input
            id="hyd-weight"
            v-model.number="weight"
            type="number"
            step="0.5"
            class="field-input"
          />
          <span class="weight-suffix">kg</span>
        </div>
      </div>

      <div class="toggle-grid">
        <label class="toggle-card" :class="{ 'toggle-card--on': isTrainingDay }">
          <div>
            <span class="toggle-label">Sport ?</span>
            <span class="toggle-bonus">+0.5L</span>
          </div>
          <div class="toggle-switch" :class="{ 'toggle-switch--on': isTrainingDay }">
            <input type="checkbox" v-model="isTrainingDay" class="sr-only" />
            <div class="toggle-thumb" />
          </div>
        </label>

        <label class="toggle-card" :class="{ 'toggle-card--on': takesCreatine }">
          <div>
            <span class="toggle-label">Créatine ?</span>
            <span class="toggle-bonus">+0.5L</span>
          </div>
          <div class="toggle-switch" :class="{ 'toggle-switch--on': takesCreatine }">
            <input type="checkbox" v-model="takesCreatine" class="sr-only" />
            <div class="toggle-thumb" />
          </div>
        </label>
      </div>
    </div>
  </div>
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
  return ((base + activity + supplement) / 1000).toFixed(1)
})
</script>

<style scoped>
.hydration-widget {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-top-color: rgba(122, 145, 184, 0.2);
  border-radius: var(--radius-xl);
  padding: 22px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hydration-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hydration-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  background: rgba(122, 145, 184, 0.10);
  border: 1px solid rgba(122, 145, 184, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7A91B8;
}

.hydration-title {
  font-family: var(--font-serif);
  font-size: var(--text-md);
  font-weight: 400;
  color: var(--text-primary);
  margin: 0;
}

.hydration-sub {
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  margin-top: 1px;
}

.hydration-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 0 4px;
}

.hydration-value {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.hydration-number {
  font-family: var(--font-serif);
  font-size: 3.5rem;
  font-weight: 400;
  color: var(--text-primary);
  line-height: 1;
  letter-spacing: -0.02em;
}

.hydration-unit {
  font-size: var(--text-xl);
  color: #7A91B8;
  font-weight: 400;
}

.hydration-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(122, 145, 184, 0.08);
  border: 1px solid rgba(122, 145, 184, 0.14);
  border-radius: var(--radius-pill);
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #7A91B8;
}

.live-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #7A91B8;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

.hydration-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-group { display: flex; flex-direction: column; gap: 6px; }

.field-label {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
}

.weight-input-wrap { position: relative; }

.field-input {
  width: 100%;
  padding: 11px 40px 11px 14px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-primary);
  outline: none;
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}

.field-input:focus {
  border-color: rgba(122, 145, 184, 0.35);
  box-shadow: 0 0 0 3px rgba(122, 145, 184, 0.08);
}

.weight-suffix {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: var(--text-xs);
  color: var(--text-muted);
  pointer-events: none;
}

.toggle-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.toggle-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px;
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease-out);
  user-select: none;
}

.toggle-card:hover { border-color: var(--border-default); }
.toggle-card--on { border-color: rgba(122, 145, 184, 0.25); }

.toggle-label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}

.toggle-bonus {
  display: block;
  font-size: 9px;
  font-weight: 500;
  color: #7A91B8;
  margin-top: 2px;
}

.toggle-switch {
  position: relative;
  width: 36px;
  height: 20px;
  background: var(--bg-muted);
  border-radius: 999px;
  flex-shrink: 0;
  transition: background var(--dur-fast) var(--ease-out);
}

.toggle-switch--on { background: #7A91B8; }

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: var(--text-primary);
  border-radius: 50%;
  transition: transform var(--dur-fast) var(--ease-out);
}

.toggle-switch--on .toggle-thumb { transform: translateX(16px); }

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
input[type=number] { -moz-appearance: textfield; appearance: textfield; }
</style>
