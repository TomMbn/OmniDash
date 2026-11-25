<template>
  <dialog ref="dialog" class="shop-dialog" aria-labelledby="item-dialog-title" @cancel.prevent="emit('close')">
    <form v-if="draft" @submit.prevent="submit">
      <h2 id="item-dialog-title">{{ draft.id ? 'Modifier la pièce' : 'Nouvelle pièce' }}</h2>

      <div class="shop-form-grid">
        <label class="shop-field shop-field--wide">
          <span>Nom</span>
          <input v-model="draft.name" class="shop-input" required maxlength="140">
        </label>
        <label class="shop-field">
          <span>Catégorie</span>
          <select v-model="draft.category" class="shop-input">
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.label }}</option>
          </select>
        </label>
        <label class="shop-field">
          <span>Sous-section</span>
          <input v-model="draft.group_name" class="shop-input" list="shop-groups" maxlength="60">
          <datalist id="shop-groups">
            <option v-for="g in groups" :key="g" :value="g" />
          </datalist>
        </label>
        <label class="shop-field">
          <span>Quantité</span>
          <input v-model="draft.qty" class="shop-input" maxlength="40">
        </label>
        <label class="shop-field">
          <span>Niveau de gamme</span>
          <select v-model="draft.tier" class="shop-input">
            <option value="">Non précisé</option>
            <option v-for="(label, id) in TIERS" :key="id" :value="id">{{ label }}</option>
          </select>
        </label>
        <label class="shop-field">
          <span>Prix indicatif</span>
          <input v-model="draft.price" class="shop-input" maxlength="60">
        </label>
        <label class="shop-field shop-field--wide">
          <span>Taille conseillée</span>
          <textarea v-model="draft.size" class="shop-input" rows="2" />
        </label>
        <label class="shop-field shop-field--wide">
          <span>Note</span>
          <textarea v-model="draft.note" class="shop-input" rows="3" />
        </label>
      </div>

      <fieldset class="refs">
        <legend>Références</legend>
        <div v-for="(option, index) in draft.options" :key="index" class="ref-row">
          <div class="shop-form-grid">
            <label class="shop-field shop-field--wide">
              <span>Produit</span>
              <input v-model="option.label" class="shop-input">
            </label>
            <label class="shop-field">
              <span>Prix</span>
              <input v-model="option.price" class="shop-input">
            </label>
            <label class="shop-field">
              <span>Lien (https)</span>
              <input v-model="option.url" class="shop-input" type="url">
            </label>
            <label class="shop-field shop-field--wide">
              <span>Détail</span>
              <input v-model="option.detail" class="shop-input">
            </label>
          </div>
          <div class="ref-actions">
            <label class="ref-pick"><input v-model="option.pick" type="checkbox"> Choix retenu</label>
            <button type="button" class="shop-btn" @click="draft.options.splice(index, 1)">Retirer la référence</button>
          </div>
        </div>
        <button type="button" class="shop-btn" @click="draft.options.push({ label: '', price: '', url: '', detail: '', pick: false })">
          Ajouter une référence
        </button>
      </fieldset>

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
import { onMounted, ref, watch } from 'vue'
import { TIERS } from '@/utils/shopping/shopping'

const props = defineProps({
  item: { type: Object, default: null },
  categories: { type: Array, required: true },
  groups: { type: Array, required: true },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['save', 'close'])

const dialog = ref(null)
const draft = ref(null)

const sync = () => {
  const item = props.item
  if (!item) {
    draft.value = null
    if (dialog.value?.open) dialog.value.close()
    return
  }
  draft.value = {
    id: item.id,
    name: item.name || '',
    category: item.category || 'vetements',
    group_name: item.group_name || '',
    qty: item.qty || '',
    tier: item.tier || '',
    price: item.price || '',
    size: item.size || '',
    note: item.note || '',
    options: (item.options || []).map((o) => ({ ...o })),
  }
  if (dialog.value && !dialog.value.open) dialog.value.showModal()
}

watch(() => props.item, sync)
onMounted(sync)

const clean = (value) => String(value || '').trim() || null

const submit = () => {
  const d = draft.value
  if (!d.name.trim()) return
  const options = d.options
    .filter((o) => String(o.label || '').trim())
    .map((o) => {
      const out = { label: o.label.trim() }
      for (const key of ['price', 'url', 'detail']) if (clean(o[key])) out[key] = clean(o[key])
      if (o.pick) out.pick = true
      return out
    })
  emit('save', {
    ...(d.id ? { id: d.id } : {}),
    name: d.name.trim(),
    category: d.category,
    group_name: clean(d.group_name) || 'Divers',
    qty: clean(d.qty),
    tier: d.tier || null,
    price: clean(d.price),
    size: clean(d.size),
    note: clean(d.note),
    options,
  })
}
</script>

<style scoped>
.refs { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; margin: 0; padding: 0; border: none; }
.refs legend { margin-bottom: var(--space-2); font-size: var(--text-sm); font-weight: 600; }

.ref-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border-subtle);
}

.ref-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2); }
.ref-pick { display: flex; align-items: center; gap: var(--space-2); min-height: 44px; font-size: var(--text-xs); }
</style>
