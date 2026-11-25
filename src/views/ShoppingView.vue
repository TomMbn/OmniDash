<template>
  <div class="shop-view">

    <!-- ── En-tête ── -->
    <header class="view-head">
      <h1 class="view-title">
        Achats,{{ ' ' }}<br class="view-break" />
        <span class="view-title-soft">{{ headline }}</span>
      </h1>
      <div class="segmented" role="tablist" aria-label="Sections">
        <button
          v-for="tab in sectionTabs"
          :key="tab.id"
          role="tab"
          :aria-selected="activeTab === tab.id"
          class="segmented-btn"
          :class="{ 'segmented-btn--active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >{{ tab.label }}</button>
      </div>
    </header>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <section v-if="!ready" class="card empty">
      <span class="empty-icon" aria-hidden="true"><ShoppingBag :size="22" stroke-width="1.75" /></span>
      <p class="empty-title">Module en cours d’installation</p>
      <p class="card-sub">Exécute supabase/schema/shopping.sql dans le SQL Editor Supabase, puis recharge la page.</p>
    </section>

    <MeasuresPanel v-else-if="activeTab === 'measures'" :measures="measures" @save="saveMeasure" />

    <div v-else class="board">
      <!-- ═══ Colonne de gauche ═══ -->
      <div class="side">
        <section class="banner" aria-label="Filtres">
          <span class="orb orb--a" aria-hidden="true" />
          <span class="orb orb--b" aria-hidden="true" />

          <h2 class="banner-title">
            Qu’est-ce qu’il te reste&nbsp;?<br />
            <span class="banner-title-soft">Et par quoi commencer&nbsp;?</span>
          </h2>

          <fieldset class="choice">
            <legend class="field-label">Les pièces</legend>
            <div class="choice-row">
              <button class="choice-btn" :class="{ 'choice-btn--active': !onlyTodo }" :aria-pressed="!onlyTodo" @click="onlyTodo = false">Toutes</button>
              <button class="choice-btn" :class="{ 'choice-btn--active': onlyTodo }" :aria-pressed="onlyTodo" @click="onlyTodo = true">À acheter</button>
            </div>
          </fieldset>

          <fieldset class="choice">
            <legend class="field-label">La gamme</legend>
            <div class="choice-row">
              <button
                v-for="tier in tierChoices"
                :key="tier.id"
                class="choice-btn"
                :class="{ 'choice-btn--active': activeTiers.includes(tier.id) }"
                :aria-pressed="activeTiers.includes(tier.id)"
                @click="toggleTier(tier.id)"
              >{{ tier.label }}</button>
            </div>
          </fieldset>

          <button class="shop-btn shop-btn--dark banner-action" @click="openNew">
            <Plus :size="18" stroke-width="2" /> Ajouter une pièce
          </button>
        </section>

        <!-- Avancement par catégorie, qui sert aussi à filtrer -->
        <section class="card overview" aria-labelledby="overview-title">
          <div class="overview-head">
            <h2 id="overview-title" class="card-title">Avancement</h2>
            <p class="card-sub">{{ stats.done }} sur {{ stats.total }}</p>
          </div>
          <ul class="overview-list">
            <li v-for="tab in categoryTabs" :key="tab.id">
              <button
                class="overview-row"
                :class="{ 'overview-row--active': category === tab.id }"
                :aria-pressed="category === tab.id"
                :style="toneStyle(tab.tone)"
                @click="category = tab.id"
              >
                <span class="overview-name">{{ tab.label }}</span>
                <span class="overview-bar"><span class="overview-fill" :style="{ width: `${tab.ratio * 100}%` }" /></span>
                <span class="overview-count">{{ tab.remaining }}</span>
              </button>
            </li>
          </ul>
        </section>

        <nav class="pills" aria-label="Catégories">
          <button
            v-for="tab in categoryTabs"
            :key="tab.id"
            class="pill-btn"
            :class="{ 'pill-btn--active': category === tab.id }"
            :aria-pressed="category === tab.id"
            @click="category = tab.id"
          >{{ tab.label }} <span>{{ tab.remaining }}</span></button>
        </nav>
      </div>

      <!-- ═══ Liste ═══ -->
      <div class="list">
        <div v-if="loading && !items.length" class="skeleton" />

        <section v-else-if="!sections.length" class="card empty">
          <span class="empty-icon" aria-hidden="true"><ShoppingBag :size="22" stroke-width="1.75" /></span>
          <p class="empty-title">Rien à afficher</p>
          <p class="card-sub">{{ emptyText }}</p>
        </section>

        <template v-else>
          <section v-for="section in sections" :key="section.id" class="section">
            <h2 class="card-title section-title">{{ section.label }}</h2>

            <div v-for="group in section.groups" :key="group.name" class="card" :style="toneStyle(lookFor(section.id, group.name).tone)">
              <h3 class="group-title">
                <span class="group-icon" aria-hidden="true">
                  <component :is="lookFor(section.id, group.name).icon" :size="16" stroke-width="1.75" />
                </span>
                {{ group.name }}
                <span class="card-sub">{{ group.items.length }}</span>
              </h3>

              <ul class="item-list">
                <ShoppingItem
                  v-for="item in group.items"
                  :key="item.id"
                  :item="item"
                  @toggle="toggle(item, $event)"
                  @edit="editing = item"
                  @remove="remove(item)"
                  @wardrobe="wardrobeItem = item"
                />
              </ul>
            </div>
          </section>
        </template>
      </div>
    </div>

    <ItemDialog
      :item="editing"
      :categories="categories"
      :groups="groupNames"
      :saving="saving"
      @save="save"
      @close="editing = null"
    />
    <WardrobeDialog :item="wardrobeItem" :saving="saving" @add="addPiece" @close="wardrobeItem = null" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Plus, ShoppingBag } from 'lucide-vue-next'
import MeasuresPanel from '@/components/shopping/MeasuresPanel.vue'
import ShoppingItem from '@/components/shopping/ShoppingItem.vue'
import ItemDialog from '@/components/shopping/ItemDialog.vue'
import WardrobeDialog from '@/components/shopping/WardrobeDialog.vue'
import { lookFor, toneStyle } from '@/components/shopping/looks'
import '@/components/shopping/shopping.css'
import { useShopping } from '@/composables/useShopping'
import { useConfirm } from '@/composables/useConfirm'
import { canGoToWardrobe, categoriesFor, filterItems, groupItems, progress } from '@/utils/shopping/shopping'

const {
  items, measures, loading, error, ready,
  load, setDone, saveItem, removeItem, saveMeasure, addToWardrobe,
} = useShopping()
const { askConfirm } = useConfirm()

const sectionTabs = [
  { id: 'list', label: 'Liste' },
  { id: 'measures', label: 'Mesures' },
]
const tierChoices = [
  { id: 'invest', label: 'Investir' },
  { id: 'mid', label: 'Milieu' },
  { id: 'basic', label: 'Basique' },
]

const activeTab = ref('list')
const category = ref('all')
const onlyTodo = ref(false)
const activeTiers = ref([])
const editing = ref(null)
const wardrobeItem = ref(null)
const saving = ref(false)

const stats = computed(() => progress(items.value))
const categories = computed(() => categoriesFor(items.value))
const groupNames = computed(() => [...new Set(items.value.map((i) => i.group_name).filter(Boolean))])

const headline = computed(() => {
  if (!stats.value.total) return 'ta liste'
  const n = stats.value.remaining
  return n ? `${n} pièce${n > 1 ? 's' : ''} à acheter` : 'tout est acheté'
})

const categoryTabs = computed(() => [
  { id: 'all', label: 'Tout', tone: 'shop', ...stats.value },
  ...categories.value.map((c) => ({
    ...c,
    tone: lookFor(c.id).tone,
    ...progress(items.value.filter((i) => i.category === c.id)),
  })),
])

const sections = computed(() => {
  const visible = filterItems(items.value, {
    category: category.value, onlyTodo: onlyTodo.value, tiers: activeTiers.value,
  })
  return categories.value
    .map((c) => ({ ...c, groups: groupItems(visible.filter((i) => i.category === c.id)) }))
    .filter((s) => s.groups.length)
})

const emptyText = computed(() => {
  if (onlyTodo.value || activeTiers.value.length) return 'Aucune pièce ne correspond à ces filtres.'
  if (category.value === 'parfums') return 'Aucun parfum pour l’instant. Ajoute le premier avec le bouton « Ajouter une pièce ».'
  return 'Ajoute une pièce avec le bouton « Ajouter une pièce ».'
})

const toggleTier = (id) => {
  activeTiers.value = activeTiers.value.includes(id)
    ? activeTiers.value.filter((t) => t !== id)
    : [...activeTiers.value, id]
}

const toggle = async (item, done) => {
  const saved = await setDone(item, done)
  if (saved && done && canGoToWardrobe(item)) wardrobeItem.value = item
}

const openNew = () => {
  editing.value = { category: category.value === 'all' ? 'vetements' : category.value, options: [] }
}

const save = async (draft) => {
  saving.value = true
  if (await saveItem(draft)) editing.value = null
  else editing.value = { ...draft }
  saving.value = false
}

const addPiece = async (piece) => {
  saving.value = true
  await addToWardrobe(wardrobeItem.value, piece)
  wardrobeItem.value = null
  saving.value = false
}

const remove = async (item) => {
  if (await askConfirm({ title: `Retirer « ${item.name} » de la liste ?`, detail: 'Cette action est définitive.', confirmLabel: 'Retirer' })) {
    await removeItem(item.id)
  }
}

onMounted(load)
</script>

<style scoped>
/* Mêmes proportions que le Dressing */
.shop-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 1480px;
  margin: 0 auto;
}

/* ── En-tête ── */
.view-head { display: flex; flex-direction: column; gap: var(--space-3); }
.view-title { font-size: var(--text-xl); font-weight: 600; letter-spacing: -0.02em; line-height: 1.22; }
.view-title-soft { color: var(--text-secondary); }

.segmented { display: flex; gap: 2px; padding: var(--space-1); border-radius: var(--radius-pill); background: var(--bg-raised); }
.segmented-btn {
  flex: 1;
  min-height: 44px;
  padding: 0 var(--space-5);
  border: none;
  border-radius: var(--radius-pill);
  background: none;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}
.segmented-btn--active { background: var(--action); color: var(--on-action); }

.error {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--status-error-dim);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--status-error);
}

.board { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-3); align-items: start; }
.side { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }

/* ── Bandeau ── */
.banner {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: 18px;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--aurore-shop);
}
.banner > :not(.orb) { position: relative; z-index: var(--z-raised); }
.banner-title { max-width: 80%; font-size: var(--text-xl); font-weight: 600; letter-spacing: -0.02em; line-height: 1.22; }
.banner-title-soft { color: var(--text-secondary); }
.banner-action { width: 100%; min-height: 48px; }

.choice { display: flex; flex-direction: column; min-width: 0; margin: 0; padding: 0; border: none; }
.field-label { padding: 0 0 6px; font-size: var(--text-2xs); font-weight: 500; color: var(--text-secondary); }
.choice-row { display: flex; gap: 6px; }
.choice-btn {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  padding: 0 var(--space-2);
  border: none;
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.choice-btn--active { background: var(--action); color: var(--on-action); }

.orb { position: absolute; border-radius: 50%; opacity: var(--orb-opacity); pointer-events: none; }
.orb--a { top: -44px; right: -30px; width: 118px; height: 118px; background: var(--orb-peche); }
.orb--b { top: 24px; right: -26px; width: 56px; height: 56px; background: var(--orb-lilas); }

/* ── Cartes ── */
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--bg-raised);
}
.card-title { font-size: var(--text-lg); font-weight: 600; letter-spacing: -0.01em; }
.card-sub { font-size: var(--text-2xs); font-weight: 500; color: var(--text-secondary); }

/* ── Avancement : sur téléphone, des pastilles le remplacent ── */
.overview { display: none; }
.overview-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
.overview-list { margin: 0; padding: 0; list-style: none; }
.overview-row {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr) 28px;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-height: 44px;
  padding: 0 var(--space-3);
  border: none;
  border-radius: var(--radius-pill);
  background: none;
  font-family: var(--font-sans);
  text-align: left;
  color: var(--text-primary);
  cursor: pointer;
}
.overview-row:hover, .overview-row--active { background: var(--bg-overlay); }
.overview-name { overflow: hidden; font-size: var(--text-sm); font-weight: 500; white-space: nowrap; text-overflow: ellipsis; }
.overview-row--active .overview-name { font-weight: 600; }
.overview-bar { height: 6px; overflow: hidden; border-radius: 3px; background: var(--bg-muted); }
.overview-fill { display: block; height: 100%; border-radius: 3px; background: var(--tone); }
.overview-count { font-size: var(--text-xs); font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }

.pills { display: flex; gap: var(--space-2); overflow-x: auto; padding: 2px; }
.pill-btn {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 var(--space-4);
  border: none;
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  white-space: nowrap;
  color: var(--text-primary);
  cursor: pointer;
}
.pill-btn span { font-size: var(--text-2xs); opacity: 0.7; font-variant-numeric: tabular-nums; }
.pill-btn--active { background: var(--action); color: var(--on-action); }

/* ── Liste ── */
.list, .section { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
.section + .section { margin-top: var(--space-3); }
.section-title { padding-top: var(--space-1); }

.group-title { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-lg); font-weight: 600; }
.group-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--tone-dim);
  color: var(--tone);
}

.item-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* ── Vide et chargement ── */
.empty { align-items: center; gap: var(--space-1); padding: var(--space-8) var(--space-4); text-align: center; }
.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-bottom: var(--space-2);
  border-radius: var(--radius-md);
  background: var(--module-shop-dim);
  color: var(--module-shop);
}
.empty-title { font-size: var(--text-sm); font-weight: 500; }

@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
.skeleton {
  height: 320px;
  border-radius: var(--radius-lg);
  background: linear-gradient(90deg, var(--bg-overlay) 25%, var(--bg-muted) 50%, var(--bg-overlay) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}

/* ── Tablette ── */
@media (min-width: 768px) {
  .view-head { flex-direction: row; align-items: center; justify-content: space-between; }
  .view-break { display: none; }
  .view-title { font-size: var(--text-3xl); font-weight: 700; letter-spacing: -0.03em; line-height: 1.1; }
  .segmented { flex-shrink: 0; width: 280px; }
  .banner { padding: var(--space-6); }
  .card { padding: 20px; }
}

/* ── Desktop ── */
@media (min-width: 1100px) {
  .shop-view { gap: var(--space-4); }
  .board { grid-template-columns: 340px minmax(0, 1fr); gap: var(--space-4); }
  .side { gap: var(--space-4); }
  .overview { display: flex; }
  .pills { display: none; }
  .list { gap: var(--space-4); }
  .section { gap: var(--space-4); }
  .card-title { font-size: var(--text-xl); }
  .banner-title { max-width: none; }
  .item-list { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: var(--space-5); }
}
</style>
