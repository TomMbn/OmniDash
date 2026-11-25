<template>
  <li class="item" :class="{ 'item--done': item.done }">
    <div class="item-row">
      <label class="check">
        <input
          type="checkbox"
          class="check-input"
          :checked="item.done"
          :aria-label="`Acheté : ${item.name}`"
          @change="emit('toggle', $event.target.checked)"
        >
        <span class="check-tile" aria-hidden="true">
          <Check v-if="item.done" :size="20" stroke-width="2.5" />
          <Circle v-else :size="22" stroke-width="1.75" />
        </span>
      </label>

      <button class="item-info" :aria-expanded="open" :aria-controls="panelId" @click="open = !open">
        <span class="item-name">{{ item.name }}</span>
        <span class="item-meta">
          <span v-if="item.tier === 'invest'" class="pill">{{ TIERS.invest }}</span>
          <span>{{ meta }}</span>
        </span>
      </button>

      <ChevronDown class="chevron" :class="{ 'chevron--open': open }" :size="18" stroke-width="2" aria-hidden="true" />
    </div>

    <div v-if="open" :id="panelId" class="panel">
      <div v-if="item.size" class="size">
        <span>Taille conseillée</span>
        <p>{{ item.size }}</p>
      </div>
      <p v-if="item.note" class="note">{{ item.note }}</p>

      <ul v-if="item.options?.length" class="refs" aria-label="Références">
        <li v-for="(option, i) in item.options" :key="i" class="ref">
          <div class="ref-info">
            <p class="ref-label">
              {{ option.label }}
              <span v-if="option.pick" class="pill">Choix retenu</span>
            </p>
            <p v-if="option.price || option.detail" class="ref-detail">
              <strong v-if="option.price">{{ option.price }}</strong>
              {{ option.detail }}
            </p>
          </div>
          <a
            v-if="safeUrl(option.url)"
            :href="safeUrl(option.url)"
            target="_blank"
            rel="noopener noreferrer"
            class="icon-btn"
            :aria-label="`Ouvrir le lien : ${option.label}`"
          >
            <ExternalLink :size="18" stroke-width="1.75" />
          </a>
        </li>
      </ul>

      <div class="actions">
        <button v-if="item.done && canGoToWardrobe(item)" class="shop-btn shop-btn--dark" @click="emit('wardrobe')">
          Ajouter au dressing
        </button>
        <button class="shop-btn" @click="emit('edit')"><Pencil :size="16" stroke-width="1.75" /> Modifier</button>
        <button class="shop-btn" @click="emit('remove')"><Trash2 :size="16" stroke-width="1.75" /> Retirer</button>
      </div>
    </div>
  </li>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Check, ChevronDown, Circle, ExternalLink, Pencil, Trash2 } from 'lucide-vue-next'
import { TIERS, canGoToWardrobe, itemSummary, safeUrl } from '@/utils/shopping/shopping'

const props = defineProps({
  item: { type: Object, required: true },
})
const emit = defineEmits(['toggle', 'edit', 'remove', 'wardrobe'])

const open = ref(false)
const panelId = computed(() => `shop-item-${props.item.id}`)
const meta = computed(() => itemSummary(props.item))
</script>

<style scoped>
.item { min-width: 0; border-top: 1px solid var(--border-subtle); }

.item-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) 0; }

.check { position: relative; flex-shrink: 0; cursor: pointer; }

/* La case reste dans la page pour le clavier et les lecteurs d'écran. */
.check-input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }

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

.check:hover .check-tile { border-color: var(--tone); }
.check-input:focus-visible + .check-tile { outline: 2px solid var(--accent); outline-offset: 2px; }
.item--done .check-tile { background: var(--tone); color: var(--bg-raised); }

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
  min-height: 44px;
  justify-content: center;
  padding: 0;
  border: none;
  background: none;
  font-family: var(--font-sans);
  text-align: left;
  color: var(--text-primary);
  cursor: pointer;
}

.item-name { font-size: var(--text-sm); font-weight: 500; overflow-wrap: anywhere; }
.item--done .item-name { text-decoration: line-through; color: var(--text-secondary); }

.item-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.pill {
  padding: 0 var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--module-shop-dim);
  font-size: var(--text-2xs);
  font-weight: 600;
  color: var(--module-shop);
}

.chevron { flex-shrink: 0; color: var(--text-secondary); transition: transform var(--dur-fast) var(--ease-out); }
.chevron--open { transform: rotate(180deg); }

.panel { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-1) 0 var(--space-4); }

.size { padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); background: var(--bg-overlay); }
.size span { font-size: var(--text-2xs); font-weight: 600; color: var(--module-shop); }
.size p { font-size: var(--text-xs); }

.note { font-size: var(--text-xs); line-height: 1.55; color: var(--text-secondary); }

.refs { margin: 0; padding: 0; list-style: none; }
.ref { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) 0; border-top: 1px solid var(--border-subtle); }
.ref-info { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.ref-label { font-size: var(--text-xs); font-weight: 600; }
.ref-detail { font-size: var(--text-2xs); color: var(--text-secondary); }
.ref-detail strong { margin-right: var(--space-1); font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; }

.icon-btn {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
}
.icon-btn:hover { background: var(--bg-overlay); color: var(--text-primary); }

.actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
</style>
