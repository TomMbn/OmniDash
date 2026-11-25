<template>
  <div class="measures">
    <section class="advice" aria-labelledby="advice-title">
      <span class="orb orb--a" aria-hidden="true" />
      <span class="orb orb--b" aria-hidden="true" />

      <h2 id="advice-title" class="advice-title">
        {{ filled }} mesure{{ filled > 1 ? 's' : '' }} sur {{ MEASURES.length }}<br>
        <span>pour choisir tes tailles</span>
      </h2>

      <p v-if="advice" class="advice-text">
        Pour un ourlet qui touche la chaussure, vise un entrejambe de pantalon d’environ
        <strong>{{ advice.min }} à {{ advice.max }} cm</strong>, soit à peu près <strong>L{{ advice.length }}</strong>.
        À confirmer à l’essayage.
      </p>
      <p v-else class="advice-text">Renseigne ton entrejambe pour obtenir un repère de longueur de pantalon.</p>
    </section>

    <section class="card" aria-labelledby="measures-title">
      <h2 id="measures-title" class="card-title">Mes mesures</h2>
      <p class="card-sub">En centimètres, avec un mètre souple. Chaque valeur est enregistrée quand tu quittes le champ.</p>

      <div class="grid">
        <label v-for="m in MEASURES" :key="m.key" class="shop-field">
          <span>{{ m.label }}</span>
          <input
            class="shop-input"
            type="text"
            inputmode="decimal"
            :value="measures[m.key] ?? ''"
            @change="emit('save', m.key, $event.target.value)"
          >
          <small>{{ m.how }}</small>
        </label>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { MEASURES, inseamAdvice } from '@/utils/shopping/shopping'

const props = defineProps({ measures: { type: Object, required: true } })
const emit = defineEmits(['save'])

const filled = computed(() => MEASURES.filter((m) => props.measures[m.key] != null).length)
const advice = computed(() => inseamAdvice(props.measures.inseam))
</script>

<style scoped>
.measures { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-3); align-items: start; }

.advice {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  padding: 18px;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--aurore-shop);
}
.advice > :not(.orb) { position: relative; z-index: var(--z-raised); }
.advice-title { font-size: var(--text-xl); letter-spacing: -0.02em; line-height: 1.22; }
.advice-title span { color: var(--text-secondary); }
.advice-text { font-size: var(--text-sm); }

.orb { position: absolute; border-radius: 50%; opacity: var(--orb-opacity); pointer-events: none; }
.orb--a { top: -44px; right: -30px; width: 118px; height: 118px; background: var(--orb-peche); }
.orb--b { top: 24px; right: -26px; width: 56px; height: 56px; background: var(--orb-lilas); }

.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--bg-raised);
}
.card-title { font-size: var(--text-lg); letter-spacing: -0.01em; }
.card-sub { font-size: var(--text-2xs); font-weight: 500; color: var(--text-secondary); }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--space-4) var(--space-3);
  margin-top: var(--space-3);
}

@media (min-width: 768px) {
  .card { padding: 20px; }
}

@media (min-width: 1100px) {
  .measures { grid-template-columns: 340px minmax(0, 1fr); gap: var(--space-4); }
  .advice { padding: 28px; min-height: 320px; }
  .card { padding: var(--space-6); }
  .card-title { font-size: var(--text-xl); }
  .orb--a { top: auto; right: -40px; bottom: -60px; width: 200px; height: 200px; }
  .orb--b { top: auto; right: auto; left: 40px; bottom: 28px; width: 80px; height: 80px; }
}
</style>
