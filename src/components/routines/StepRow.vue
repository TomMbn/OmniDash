<template>
  <li class="step" :class="{ 'step--done': checked }">
    <div class="step-row">
      <label class="check" :class="{ 'check--off': readonly }">
        <input
          type="checkbox"
          class="check-input"
          :checked="checked"
          :disabled="readonly"
          :aria-label="`Fait : ${item.title}`"
          @change="emit('toggle', $event.target.checked)"
        >
        <span class="check-tile" aria-hidden="true">
          <Check v-if="checked" :size="20" stroke-width="2.5" />
          <Circle v-else :size="22" stroke-width="1.75" />
        </span>
      </label>

      <button class="step-info" :aria-expanded="open" :aria-controls="panelId" @click="open = !open">
        <span class="step-name">{{ item.title }}</span>
        <span v-if="meta" class="step-meta">{{ meta }}</span>
        <span v-if="hint" class="step-meta step-hint">{{ hint }}</span>
      </button>

      <ChevronDown class="chevron" :class="{ 'chevron--open': open }" :size="18" stroke-width="2" aria-hidden="true" />
    </div>

    <div v-if="open" :id="panelId" class="panel">
      <p v-if="item.detail" class="detail">{{ item.detail }}</p>
      <p class="detail">Fréquence : {{ frequencyLabel(item).toLowerCase() }}</p>
      <p v-if="item.uv_min != null" class="detail">Indice UV : facultatif sous {{ item.uv_min }}.</p>
      <div class="actions">
        <button class="shop-btn" @click="emit('edit')"><Pencil :size="16" stroke-width="1.75" /> Modifier</button>
        <button v-if="canUp" class="shop-btn" @click="emit('move', -1)"><ArrowUp :size="16" stroke-width="1.75" /> Monter</button>
        <button v-if="canDown" class="shop-btn" @click="emit('move', 1)"><ArrowDown :size="16" stroke-width="1.75" /> Descendre</button>
        <button class="shop-btn" @click="emit('remove')"><Trash2 :size="16" stroke-width="1.75" /> Retirer</button>
      </div>
    </div>
  </li>
</template>

<script setup>
import { computed, ref, useId } from 'vue'
import { ArrowDown, ArrowUp, Check, ChevronDown, Circle, Pencil, Trash2 } from 'lucide-vue-next'
import { frequencyLabel } from '@/utils/routines/routines'

const props = defineProps({
  item: { type: Object, required: true },
  checked: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  hint: { type: String, default: null },
  canUp: { type: Boolean, default: false },
  canDown: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle', 'edit', 'move', 'remove'])

const open = ref(false)
const panelId = useId()
const uvText = computed(() => {
  if (props.item.uv_min == null) return null
  if (props.item.uvIndex == null) return 'Indice UV inconnu : à faire'
  return `UV max ${props.item.uvIndex} : ${props.item.uvSkipped || props.item.optional ? 'facultatif' : 'à faire'}`
})
const meta = computed(() => [
  uvText.value,
  props.item.optional && !uvText.value ? 'Facultatif' : null,
  props.item.product,
].filter(Boolean).join(' · '))
</script>

<style scoped>
.step { min-width: 0; border-top: 1px solid var(--border-subtle); }

.step-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) 0; }

.check { position: relative; flex-shrink: 0; cursor: pointer; }
.check--off { cursor: default; opacity: 0.45; }

/* La case reste dans la page pour le clavier et les lecteurs d'écran. */
.check-input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
.check-input:disabled { cursor: default; }

.check-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1.5px dashed transparent;
  border-radius: var(--radius-md);
  background: var(--tone-dim);
  color: var(--tone);
  pointer-events: none;
}

.check:not(.check--off):hover .check-tile { border-color: var(--tone); }
.check-input:focus-visible + .check-tile { outline: 2px solid var(--accent); outline-offset: 2px; }
.step--done .check-tile { background: var(--tone); color: var(--bg-raised); }

.step-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  min-height: 44px;
  padding: 0;
  border: none;
  background: none;
  font-family: var(--font-sans);
  text-align: left;
  color: var(--text-primary);
  cursor: pointer;
}

.step-name { font-size: var(--text-sm); font-weight: 500; overflow-wrap: anywhere; }
.step--done .step-name { text-decoration: line-through; color: var(--text-secondary); }
.step-meta { font-size: var(--text-2xs); font-weight: 500; color: var(--text-secondary); overflow-wrap: anywhere; }

.step-hint { color: var(--tone); font-weight: 600; }

.chevron { flex-shrink: 0; color: var(--text-secondary); transition: transform var(--dur-fast) var(--ease-out); }
.chevron--open { transform: rotate(180deg); }

.panel { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-1) 0 var(--space-4); }
.detail { font-size: var(--text-xs); line-height: 1.55; color: var(--text-secondary); }
.actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
</style>
