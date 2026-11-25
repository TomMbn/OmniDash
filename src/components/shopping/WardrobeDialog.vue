<template>
  <dialog ref="dialog" class="shop-dialog" aria-labelledby="wardrobe-dialog-title" @cancel.prevent="emit('close')">
    <form v-if="piece" @submit.prevent="emit('add', { ...piece })">
      <h2 id="wardrobe-dialog-title">Ajouter au dressing</h2>
      <p>Indique ce que tu as réellement acheté. Tu peux aussi le faire plus tard.</p>

      <div class="shop-form-grid">
        <label v-if="options.length" class="shop-field shop-field--wide">
          <span>Référence achetée</span>
          <select v-model="choice" class="shop-input" @change="applyChoice">
            <option :value="-1">Autre ou non précisée</option>
            <option v-for="(o, i) in options" :key="i" :value="i">{{ o.label }}</option>
          </select>
        </label>
        <label class="shop-field shop-field--wide">
          <span>Nom dans le dressing</span>
          <input v-model="piece.name" class="shop-input" required maxlength="140">
        </label>
        <label class="shop-field">
          <span>Type</span>
          <select v-model="piece.category" class="shop-input">
            <option value="haut">Haut</option>
            <option value="veste">Veste ou manteau</option>
            <option value="bas">Bas</option>
            <option value="chaussures">Chaussures</option>
            <option value="accessoire">Accessoire</option>
          </select>
        </label>
        <label class="shop-field">
          <span>Couleur</span>
          <input v-model="piece.color" class="shop-input" required maxlength="40">
        </label>
        <label class="shop-field">
          <span>Marque</span>
          <input v-model="piece.brand" class="shop-input" maxlength="60">
        </label>
        <label class="shop-field">
          <span>Quantité achetée</span>
          <input v-model.number="piece.quantity" class="shop-input" type="number" min="1" step="1">
        </label>
        <label class="shop-field shop-field--wide">
          <span>Lien</span>
          <input v-model="piece.link" class="shop-input" type="url">
        </label>
      </div>

      <div class="shop-dialog-actions">
        <button type="button" class="shop-btn" @click="emit('close')">Plus tard</button>
        <button type="submit" class="shop-btn shop-btn--dark" :disabled="saving">
          {{ saving ? 'Ajout…' : 'Ajouter au dressing' }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { brandFromLabel, safeUrl, wardrobeDraft } from '@/utils/shopping/shopping'

const props = defineProps({
  item: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['add', 'close'])

const dialog = ref(null)
const piece = ref(null)
const choice = ref(-1)
const options = computed(() => props.item?.options || [])

const applyChoice = () => {
  const option = options.value[choice.value]
  piece.value.brand = option ? brandFromLabel(option.label) : ''
  piece.value.link = safeUrl(option?.url) || ''
}

const sync = () => {
  if (!props.item) {
    piece.value = null
    if (dialog.value?.open) dialog.value.close()
    return
  }
  choice.value = options.value.findIndex((o) => o.pick)
  piece.value = wardrobeDraft(props.item, options.value[choice.value] || null)
  if (dialog.value && !dialog.value.open) dialog.value.showModal()
}

watch(() => props.item?.id, sync)
onMounted(sync)
</script>
