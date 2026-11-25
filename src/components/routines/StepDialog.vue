<template>
  <dialog ref="dialog" class="shop-dialog" aria-labelledby="step-dialog-title" @cancel.prevent="emit('close')">
    <form v-if="draft" @submit.prevent="submit">
      <h2 id="step-dialog-title">{{ heading }}</h2>

      <div class="shop-form-grid">
        <label class="shop-field shop-field--wide">
          <span>Nom</span>
          <input v-model="draft.title" class="shop-input" required maxlength="140">
        </label>
        <label class="shop-field">
          <span>Type</span>
          <select v-model="draft.section" class="shop-input">
            <option value="matin">Routine du matin</option>
            <option value="soir">Routine du soir</option>
            <option value="habitude">Habitude</option>
          </select>
        </label>
        <label class="shop-field">
          <span>Selon le shampooing</span>
          <select v-model="draft.condition" class="shop-input">
            <option v-for="c in CONDITIONS" :key="c.id" :value="c.id">{{ c.label }}</option>
          </select>
        </label>
        <label class="shop-field shop-field--wide">
          <span>Produit</span>
          <input v-model="draft.product" class="shop-input" maxlength="140">
        </label>
        <label class="shop-field shop-field--wide">
          <span>Consigne</span>
          <textarea v-model="draft.detail" class="shop-input" rows="3" />
        </label>
      </div>

      <fieldset class="days">
        <legend>Jours</legend>
        <div class="days-row">
          <label v-for="d in WEEKDAYS" :key="d.id" class="day">
            <input v-model="draft.days" type="checkbox" :value="d.id" :aria-label="d.label">
            <span aria-hidden="true">{{ d.label.slice(0, 3) }}</span>
          </label>
        </div>
        <p>Aucun jour coché : tous les jours.</p>
      </fieldset>

      <label class="optional">
        <input v-model="draft.optional" type="checkbox">
        Facultatif (ne compte pas dans l’avancement)
      </label>

      <div class="shop-dialog-actions">
        <button type="button" class="shop-btn" @click="emit('close')">Annuler</button>
        <button type="submit" class="shop-btn shop-btn--dark" :disabled="saving">
          {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { CONDITIONS, WEEKDAYS } from '@/utils/routines/routines'

const props = defineProps({
  item: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['save', 'close'])

const dialog = ref(null)
const draft = ref(null)

const heading = computed(() => {
  if (draft.value?.id) return 'Modifier'
  return draft.value?.section === 'habitude' ? 'Nouvelle habitude' : 'Nouvelle étape'
})

const sync = () => {
  const item = props.item
  if (!item) {
    draft.value = null
    if (dialog.value?.open) dialog.value.close()
    return
  }
  draft.value = {
    id: item.id,
    title: item.title || '',
    section: item.section || 'habitude',
    condition: item.condition || 'toujours',
    product: item.product || '',
    detail: item.detail || '',
    days: [...(item.days || [])],
    optional: Boolean(item.optional),
  }
  if (dialog.value && !dialog.value.open) dialog.value.showModal()
}

watch(() => props.item, sync)
onMounted(sync)

const clean = (value) => String(value || '').trim() || null

const submit = () => {
  const d = draft.value
  if (!d.title.trim()) return
  emit('save', {
    ...(d.id ? { id: d.id } : {}),
    title: d.title.trim(),
    section: d.section,
    condition: d.condition,
    product: clean(d.product),
    detail: clean(d.detail),
    // Les sept jours cochés reviennent à « tous les jours ».
    days: d.days.length === 7 ? [] : [...d.days].sort((a, b) => a - b),
    optional: d.optional,
  })
}
</script>

<style scoped>
.days { min-width: 0; margin: 0; padding: 0; border: none; }
.days legend { margin-bottom: var(--space-2); font-size: var(--text-sm); font-weight: 600; }
.days-row { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; margin-bottom: var(--space-1); }

.day { position: relative; cursor: pointer; }
.day input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
.day span {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border-radius: var(--radius-pill);
  background: var(--bg-overlay);
  font-size: var(--text-2xs);
  font-weight: 600;
  pointer-events: none;
}
.day input:checked + span { background: var(--action); color: var(--on-action); }
.day input:focus-visible + span { outline: 2px solid var(--accent); outline-offset: 2px; }

.optional { display: flex; align-items: center; gap: var(--space-2); min-height: 44px; font-size: var(--text-xs); }
</style>
