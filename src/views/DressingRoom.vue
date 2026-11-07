<template>
  <div class="dressing-view">

    <!-- ── En-tête ── -->
    <header class="view-head">
      <h1 class="view-title">
        Dressing,{{ ' ' }}<br class="view-break" />
        <span class="view-title-soft">{{ activeTab === 'generator' ? 'tenue du moment' : `${pieceCount} pièce${pieceCount > 1 ? 's' : ''}` }}</span>
      </h1>
      <div class="segmented" role="tablist" aria-label="Sections">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          role="tab"
          :aria-selected="activeTab === tab.id"
          class="segmented-btn"
          :class="{ 'segmented-btn--active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >{{ tab.label }}</button>
      </div>
    </header>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <!-- ═══ GÉNÉRATEUR ═══ -->
    <div v-if="activeTab === 'generator'" class="generator">
      <section class="banner" aria-label="Choix de la tenue">
        <span class="orb orb--a" aria-hidden="true" />
        <span class="orb orb--b" aria-hidden="true" />
        <span class="orb orb--c" aria-hidden="true" />

        <h2 class="banner-title">
          Pour quelle occasion ?<br />
          <span class="banner-title-soft">Et quel temps ?</span>
        </h2>

        <fieldset class="choice">
          <legend class="field-label">L'occasion</legend>
          <div class="choice-row">
            <button
              v-for="opt in occasions"
              :key="opt.id"
              class="choice-btn"
              :class="{ 'choice-btn--active': generatorState.occasion === opt.id }"
              :aria-pressed="generatorState.occasion === opt.id"
              @click="generatorState.occasion = opt.id"
            >{{ opt.label }}</button>
          </div>
        </fieldset>

        <fieldset class="choice">
          <legend class="field-label">La météo</legend>
          <div class="choice-row">
            <button
              v-for="opt in weathers"
              :key="opt.id"
              class="choice-btn"
              :class="{ 'choice-btn--active': generatorState.weather === opt.id }"
              :aria-pressed="generatorState.weather === opt.id"
              @click="generatorState.weather = opt.id"
            >
              <component :is="opt.icon" :size="16" stroke-width="1.75" />
              {{ opt.label }}
            </button>
          </div>
        </fieldset>

        <div class="banner-actions">
          <button class="btn btn--dark btn--wide" :disabled="isGenerating" @click="generateOutfit">
            <Loader2 v-if="isGenerating" class="spin" :size="18" />
            {{ isGenerating ? 'Le styliste réfléchit…' : 'Générer une tenue' }}
          </button>
          <button class="btn btn--light btn--wide" :disabled="isGenerating" @click="analyzeGaps">
            Analyser les manques
          </button>
        </div>
      </section>

      <!-- Résultat -->
      <section class="card result" aria-labelledby="result-title" :aria-busy="isGenerating">
        <h2 id="result-title" class="card-title">Conseil du styliste</h2>

        <div v-if="isGenerating" class="result-loading">
          <div v-for="i in 5" :key="i" class="skeleton skeleton--line" />
        </div>

        <template v-else-if="aiResult">
          <div class="result-content" v-html="renderedResult" />
          <button class="link-btn" @click="aiResult = null">Effacer le conseil</button>
        </template>

        <div v-else class="result-empty">
          <span class="empty-icon" aria-hidden="true">
            <Shirt :size="22" stroke-width="1.75" />
          </span>
          <p class="item-name">Aucun conseil pour l'instant</p>
          <p class="card-sub">Choisis une occasion et la météo, puis génère une tenue.</p>
        </div>
      </section>

      <!-- Placard résumé -->
      <section class="card overview" aria-labelledby="overview-title">
        <div class="overview-head">
          <h2 id="overview-title" class="card-title">Mon placard</h2>
          <p class="card-sub">{{ pieceCount }} pièce{{ pieceCount > 1 ? 's' : '' }}</p>
        </div>
        <ul v-if="groupedWardrobe.length" class="overview-list">
          <li v-for="group in groupedWardrobe" :key="group.id">
            <span class="overview-name">{{ group.label }}</span>
            <span class="overview-bar">
              <span class="overview-fill" :style="{ ...group.tone, width: (group.itemsCount / largestGroup) * 100 + '%' }" />
            </span>
            <span class="overview-count">{{ group.itemsCount }}</span>
          </li>
        </ul>
        <p v-else-if="!loading" class="card-sub">Ton placard est vide.</p>
        <button class="btn btn--soft" @click="activeTab = 'wardrobe'">
          {{ groupedWardrobe.length ? 'Voir le placard' : 'Ajouter une pièce' }}
        </button>
      </section>
    </div>

    <!-- ═══ PLACARD ═══ -->
    <div v-if="activeTab === 'wardrobe'" class="wardrobe">
      <form class="card add" @submit.prevent="smartAdd">
        <h2 class="card-title">Ajout magique</h2>
        <div class="field-group">
          <label class="field-label" for="magic-text">Description libre</label>
          <textarea
            id="magic-text"
            v-model="magicForm.rawInput"
            rows="3"
            class="field-input field-input--area"
            placeholder="Gros pull en laine rouge un peu ample"
            :disabled="isMagicLoading"
          />
        </div>
        <div class="field-group">
          <label class="field-label" for="magic-link">Lien (optionnel)</label>
          <input
            id="magic-link"
            v-model="magicForm.link"
            type="url"
            class="field-input"
            placeholder="https://"
            :disabled="isMagicLoading"
          />
        </div>
        <button type="submit" class="btn btn--dark btn--wide" :disabled="isMagicLoading || !magicForm.rawInput">
          <Loader2 v-if="isMagicLoading" class="spin" :size="18" />
          <Plus v-else :size="18" stroke-width="2" />
          {{ isMagicLoading ? "Analyse par l'IA…" : 'Ajouter au placard' }}
        </button>
      </form>

      <div v-if="loading" class="skeleton skeleton--list" />

      <section v-else-if="wardrobe.length > 0" class="closet" aria-label="Mon placard">
        <div class="closet-head">
          <h2 class="card-title">Mon placard</h2>
          <button class="link-btn" @click="copyWardrobeContent">
            <component :is="copyStatus === 'copied' ? Check : ClipboardCopy" :size="16" stroke-width="2" />
            {{ copyStatus === 'copied' ? 'Copié' : "Copier pour l'IA" }}
          </button>
        </div>

        <div v-for="group in groupedWardrobe" :key="group.id" class="card category" :style="group.tone">
          <h3 class="category-title">
            <span class="item-icon item-icon--sm" aria-hidden="true">
              <component :is="group.icon" :size="16" stroke-width="1.75" />
            </span>
            {{ group.label }}
            <span class="card-sub">{{ group.itemsCount }}</span>
          </h3>

          <div v-for="sub in group.subSections" :key="sub.label" class="sub-section">
            <p v-if="group.subSections.length > 1" class="sub-label">{{ sub.label }}</p>
            <ul class="item-list">
              <li v-for="item in sub.items" :key="item.id" class="item">
                <span class="item-icon" aria-hidden="true">
                  <component :is="group.icon" :size="20" stroke-width="1.75" />
                </span>
                <div class="item-info">
                  <p class="item-name">
                    {{ item.name }}
                    <span v-if="item.quantity > 1" class="item-qty">× {{ item.quantity }}</span>
                  </p>
                  <p class="card-sub">{{ itemDetails(item) }}</p>
                </div>
                <div class="item-actions">
                  <a
                    v-if="item.link"
                    :href="item.link"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="icon-btn"
                    :aria-label="`Ouvrir le lien de ${item.name}`"
                  >
                    <ExternalLink :size="18" stroke-width="1.75" />
                  </a>
                  <button class="icon-btn" :aria-label="`Retirer un ${item.name}`" @click="updateQuantity(item, -1)">
                    <Minus :size="18" stroke-width="2" />
                  </button>
                  <button class="icon-btn" :aria-label="`Ajouter un ${item.name}`" @click="updateQuantity(item, 1)">
                    <Plus :size="18" stroke-width="2" />
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section v-else class="card result-empty">
        <span class="empty-icon" aria-hidden="true">
          <Shirt :size="22" stroke-width="1.75" />
        </span>
        <p class="item-name">Placard vide</p>
        <p class="card-sub">Décris ton premier vêtement pour commencer.</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'
import { useConfirm } from '@/composables/useConfirm'
import { marked } from 'marked'
import { createLucideIcon } from 'lucide-vue-next'
import { trousers, wardrobe as wardrobeNode } from '@lucide/lab'
import {
  Shirt,
  ExternalLink,
  Sun,
  CloudRain,
  ThermometerSnowflake,
  Loader2,
  Footprints,
  Watch,
  ClipboardCopy,
  Check,
  Plus,
  Minus,
} from 'lucide-vue-next'

const TrousersIcon = createLucideIcon('Trousers', trousers)
const WardrobeIcon = createLucideIcon('Wardrobe', wardrobeNode)

const { user } = useAuth()
const { askConfirm } = useConfirm()

// Tabs
const activeTab = ref('generator')
const tabs = [
  { id: 'generator', label: 'Générateur' },
  { id: 'wardrobe', label: 'Placard' }
]

// ── GENERATOR LOGIC ──
const isGenerating = ref(false)
const generatorState = reactive({
  occasion: 'Work',
  weather: 'Hot'
})

const occasions = [
  { id: 'Work', label: 'Travail' },
  { id: 'Sport', label: 'Sport' },
  { id: 'Evening', label: 'Soirée' },
  { id: 'Chill', label: 'Chill' }
]

const weathers = [
  { id: 'Hot', label: 'Chaud', icon: Sun },
  { id: 'Rain', label: 'Pluie', icon: CloudRain },
  { id: 'Cold', label: 'Froid', icon: ThermometerSnowflake }
]

const aiResult = ref(null)
const errorMessage = ref('')
watch(activeTab, () => { errorMessage.value = '' })

const renderedResult = computed(() => {
  if (!aiResult.value) return ''
  return marked.parse(aiResult.value)
})

const generateOutfit = async () => {
  isGenerating.value = true
  errorMessage.value = ''
  try {
    const { data, error } = await supabase.functions.invoke('ai-stylist', {
      body: {
        action: 'suggest_outfit',
        weather: generatorState.weather,
        occasion: generatorState.occasion,
        wardrobeData: wardrobe.value
      }
    })
    if (error) throw error
    aiResult.value = data.result
  } catch (err) {
    console.error('Stylist error:', err)
    errorMessage.value = 'Le styliste ne répond pas, réessaie dans un instant.'
  } finally {
    isGenerating.value = false
  }
}

const analyzeGaps = async () => {
  isGenerating.value = true
  errorMessage.value = ''
  try {
    const { data, error } = await supabase.functions.invoke('ai-stylist', {
      body: {
        action: 'analyze_gaps',
        wardrobeData: wardrobe.value
      }
    })
    if (error) throw error
    aiResult.value = data.result
  } catch (err) {
    console.error('Analysis error:', err)
    errorMessage.value = 'Analyse impossible, réessaie dans un instant.'
  } finally {
    isGenerating.value = false
  }
}

// ── WARDROBE LOGIC (MAGIC ADD) ──
const loading = ref(true)
const isMagicLoading = ref(false)
const wardrobe = ref([])
const magicForm = reactive({
  rawInput: '',
  link: ''
})

// -- GROUPED WARDROBE LOGIC --
const deduceSubCategory = (name) => {
  if (!name) return 'Autres'
  const n = name.toLowerCase()
  if (n.includes('t-shirt') || n.includes('tee-shirt')) return 'T-shirts'
  if (n.includes('pull') || n.includes('sweat')) return 'Pulls & Sweats'
  if (n.includes('chemise')) return 'Chemises'
  if (n.includes('jean')) return 'Jeans'
  if (n.includes('pantalon') || n.includes('chino')) return 'Pantalons'
  if (n.includes('short')) return 'Shorts'
  if (n.includes('basket') || n.includes('sneaker')) return 'Sneakers'
  if (n.includes('chaussure')) return 'Chaussures'
  if (n.includes('veste') || n.includes('blouson')) return 'Vestes'
  if (n.includes('manteau')) return 'Manteaux'
  return 'Autres'
}

const groupedWardrobe = computed(() => {
  if (!Array.isArray(wardrobe.value)) return []
  const currentWardrobe = wardrobe.value

  const categories = [
    {
      id: 'haut', label: 'Hauts', icon: Shirt,
      tone: { '--tone': 'var(--module-dress)', '--tone-dim': 'var(--module-dress-dim)' }
    },
    {
      id: 'veste', label: 'Vestes', icon: Shirt,
      tone: { '--tone': 'var(--module-sleep)', '--tone-dim': 'var(--module-sleep-dim)' }
    },
    {
      id: 'bas', label: 'Bas', icon: TrousersIcon,
      tone: { '--tone': 'var(--module-nutri)', '--tone-dim': 'var(--module-nutri-dim)' }
    },
    {
      id: 'chaussures', label: 'Chaussures', icon: Footprints,
      tone: { '--tone': 'var(--module-windows)', '--tone-dim': 'var(--module-windows-dim)' }
    },
    {
      id: 'accessoire', label: 'Accessoires', icon: Watch,
      tone: { '--tone': 'var(--status-warning)', '--tone-dim': 'var(--status-warning-dim)' }
    }
  ]

  const knownCategories = categories.map(c => c.id)

  try {
    const result = categories.map(cat => {
      const catItems = currentWardrobe.filter(item => item && item.category?.toLowerCase() === cat.id)

      const subSectionsMap = catItems.reduce((acc, item) => {
        let label = item.sub_category || deduceSubCategory(item.name)
        label = (typeof label === 'string' && label.length > 0)
          ? label.charAt(0).toUpperCase() + label.slice(1)
          : 'Autres'
        if (!acc[label]) acc[label] = []
        acc[label].push(item)
        return acc
      }, {})

      const subSections = Object.entries(subSectionsMap).map(([label, items]) => ({
        label,
        items
      })).sort((a, b) => a.label.localeCompare(b.label))

      return { ...cat, subSections, itemsCount: catItems.length }
    }).filter(group => group.subSections.length > 0)

    const others = currentWardrobe.filter(item => item && !knownCategories.includes(item.category?.toLowerCase()))
    if (others.length > 0) {
      result.push({
        id: 'autres',
        label: 'Autres',
        icon: WardrobeIcon,
        tone: { '--tone': 'var(--text-secondary)', '--tone-dim': 'var(--bg-overlay)' },
        subSections: [{ label: 'Divers', items: others }],
        itemsCount: others.length
      })
    }

    return result
  } catch (err) {
    console.error('Grouped wardrobe calculation error:', err)
    return []
  }
})

const pieceCount = computed(() =>
  wardrobe.value.reduce((total, item) => total + (item?.quantity || 1), 0)
)

const largestGroup = computed(() =>
  Math.max(1, ...groupedWardrobe.value.map(group => group.itemsCount))
)

const itemDetails = (item) =>
  [item.color, item.brand, item.style].filter(Boolean).join(', ')

// -- COPY FOR IA LOGIC --
const copyStatus = ref('idle')
const copyWardrobeContent = async () => {
  if (wardrobe.value.length === 0) return

  const content = wardrobe.value.map(item => {
    let details = `${item.category}, ${item.color}`
    if (item.brand) details += `, ${item.brand}`
    if (item.link) details += ` - ${item.link}`
    return `- ${item.name} (${details})`
  }).join('\n')

  const fullPrompt = `Voici le contenu de mon placard utile pour tes conseils de style :\n\n${content}\n\nPeux-tu me suggérer des tenues ou répondre à mes questions en te basant sur ces éléments ?`

  try {
    await navigator.clipboard.writeText(fullPrompt)
    copyStatus.value = 'copied'
    setTimeout(() => { copyStatus.value = 'idle' }, 2000)
  } catch (err) {
    console.error('Copy error:', err)
  }
}

const fetchWardrobe = async () => {
  if (!user.value) return
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('wardrobe')
      .select('*')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    wardrobe.value = data || []
  } catch (err) {
    console.error('Fetch wardrobe error:', err)
  } finally {
    loading.value = false
  }
}

const updateQuantity = async (item, delta) => {
  const newQuantity = (item.quantity || 1) + delta
  if (newQuantity < 1) {
    if (await askConfirm({ title: `Supprimer « ${item.name} » du placard ?`, detail: 'Cette action est définitive.' })) {
      await deleteItem(item.id)
    }
    return
  }
  try {
    const { error } = await supabase
      .from('wardrobe')
      .update({ quantity: newQuantity })
      .eq('id', item.id)
    if (error) throw error
    item.quantity = newQuantity
  } catch (err) {
    console.error('Update quantity error:', err)
    errorMessage.value = 'Quantité non enregistrée, réessaie.'
  }
}

const deleteItem = async (id) => {
  try {
    const { error } = await supabase
      .from('wardrobe')
      .delete()
      .eq('id', id)
    if (error) throw error
    await fetchWardrobe()
  } catch (err) {
    console.error('Delete item error:', err)
    errorMessage.value = 'Suppression impossible, réessaie.'
  }
}

const smartAdd = async () => {
  if (!magicForm.rawInput || !user.value) return
  isMagicLoading.value = true
  errorMessage.value = ''
  try {
    const { data: extractedData, error: functionError } = await supabase.functions.invoke('smart-add-item', {
      body: {
        rawInput: magicForm.rawInput,
        link: magicForm.link
      }
    })
    if (functionError) throw functionError

    const { error: insertError } = await supabase
      .from('wardrobe')
      .insert({
        ...extractedData,
        link: magicForm.link,
        user_id: user.value.id
      })
    if (insertError) throw insertError

    magicForm.rawInput = ''
    magicForm.link = ''
    await fetchWardrobe()
  } catch (err) {
    console.error('Smart add error:', err)
    errorMessage.value = "Impossible d'ajouter cette pièce, réessaie."
  } finally {
    isMagicLoading.value = false
  }
}

onMounted(async () => {
  if (!user.value) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user && !user.value) user.value = session.user
  }
  await fetchWardrobe()
  loading.value = false
})
</script>

<style scoped>
.dressing-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 1480px;
  margin: 0 auto;
}

/* ── En-tête ── */
.view-head {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.view-title {
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.22;
}

.view-title-soft { color: var(--text-secondary); }

.segmented {
  display: flex;
  gap: 2px;
  padding: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
}

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

.segmented-btn--active {
  background: var(--action);
  color: var(--on-action);
}

.error {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--status-error-dim);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--status-error);
}

/* ── Boutons ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 48px;
  padding: 0 var(--space-5);
  border: none;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}

.btn:hover { opacity: 0.88; }
.btn:active { transform: scale(0.97); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn--dark  { background: var(--action); color: var(--on-action); }
.btn--light { background: var(--bg-raised); color: var(--text-primary); }
.btn--soft  { background: var(--bg-overlay); color: var(--text-primary); }
.btn--wide  { width: 100%; }

.link-btn {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: var(--space-1);
  min-height: 44px;
  border: none;
  background: none;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Générateur ── */
.generator {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
}

.banner {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: 18px;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--aurore-dress);
}

.banner > :not(.orb) {
  position: relative;
  z-index: var(--z-raised);
}

.banner-title {
  max-width: 76%;
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.22;
}

.banner-title-soft { color: var(--text-secondary); }

.choice {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 0;
  border: none;
}

.choice .field-label { padding: 0 0 6px; }

.choice-row {
  display: flex;
  gap: 6px;
}

.choice-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
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

.choice-btn--active {
  background: var(--action);
  color: var(--on-action);
}

.banner-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

.orb {
  position: absolute;
  border-radius: 50%;
  opacity: var(--orb-opacity);
  pointer-events: none;
}

.orb--a { top: -44px; right: -30px; width: 118px; height: 118px; background: var(--orb-rose); }
.orb--b { top: 24px; right: -26px; width: 56px; height: 56px; background: var(--orb-lilas); }
.orb--c { display: none; }

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

.card-title {
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.card-sub {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.item-name {
  font-size: var(--text-sm);
  font-weight: 500;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.field-input {
  width: 100%;
  min-height: 48px;
  padding: 0 var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-overlay);
  font-family: var(--font-sans);
  font-size: var(--text-md);
  color: var(--text-primary);
  outline: none;
}

.field-input--area {
  padding: var(--space-3) var(--space-4);
  line-height: 1.4;
  resize: none;
}

.field-input:focus { border-color: var(--accent); }
.field-input::placeholder { color: var(--text-secondary); }

/* ── Conseil ── */
.result { gap: var(--space-3); }

.result-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.result-empty {
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-8) var(--space-4);
  text-align: center;
}

.result > .result-empty { display: flex; flex-direction: column; flex: 1; justify-content: center; }

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-bottom: var(--space-2);
  border-radius: var(--radius-md);
  background: var(--module-dress-dim);
  color: var(--module-dress);
}

.result-content {
  font-size: var(--text-sm);
  line-height: 1.55;
  color: var(--text-secondary);
}

.result-content :deep(h1),
.result-content :deep(h2),
.result-content :deep(h3),
.result-content :deep(h4) {
  margin: var(--space-4) 0 var(--space-1);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
}

.result-content :deep(> :first-child) { margin-top: 0; }
.result-content :deep(strong) { font-weight: 600; color: var(--text-primary); }
.result-content :deep(p) { margin: var(--space-2) 0; }
.result-content :deep(ul),
.result-content :deep(ol) { margin: var(--space-2) 0; padding-left: var(--space-5); }
.result-content :deep(ul) { list-style: disc; }
.result-content :deep(ol) { list-style: decimal; }
.result-content :deep(li) { margin: var(--space-1) 0; }

/* ── Placard résumé ── */
.overview { gap: var(--space-3); }

.overview-head,
.closet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.overview-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: 0;
  list-style: none;
}

.overview-list li {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr) 28px;
  align-items: center;
  gap: var(--space-2);
}

.overview-name {
  font-size: var(--text-sm);
  font-weight: 500;
}

.overview-bar {
  height: 6px;
  overflow: hidden;
  border-radius: 3px;
  background: var(--bg-overlay);
}

.overview-fill {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--tone);
}

.overview-count {
  font-size: var(--text-xs);
  font-weight: 600;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* ── Placard ── */
.wardrobe {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
  align-items: start;
}

.add { gap: var(--space-3); }

.closet {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

.category-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-lg);
  font-weight: 600;
}

.sub-section { min-width: 0; }

.sub-label {
  padding: var(--space-2) 0 var(--space-1);
  font-size: var(--text-2xs);
  font-weight: 600;
  color: var(--text-secondary);
}

.item-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-2) 0;
  border-top: 1px solid var(--border-subtle);
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: var(--tone-dim);
  color: var(--tone);
}

.item-icon--sm {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
}

.item-info { flex: 1; min-width: 0; }

.item-info .item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-qty {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
}

.item-actions {
  display: flex;
  flex-shrink: 0;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 44px;
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
}

.icon-btn:hover { background: var(--bg-overlay); color: var(--text-primary); }

/* ── Squelettes ── */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

.skeleton {
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, var(--bg-overlay) 25%, var(--bg-muted) 50%, var(--bg-overlay) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}

.skeleton--line { height: 16px; }
.skeleton--line:nth-child(3n) { width: 70%; }
.skeleton--list { height: 320px; border-radius: var(--radius-lg); }

/* ── Tablette ── */
@media (min-width: 768px) {
  .view-head {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .view-break { display: none; }

  .view-title {
    font-size: var(--text-3xl);
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }

  .segmented { flex-shrink: 0; width: 280px; }
  .banner { padding: var(--space-6); }
  .card { padding: 20px; }
  .generator { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .result { grid-column: 1 / -1; grid-row: 2; }
  .wardrobe { grid-template-columns: 340px minmax(0, 1fr); }
  .add { position: sticky; top: 0; }
  .item-list { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: var(--space-5); }
}

/* ── Desktop ── */
@media (min-width: 1100px) {
  .dressing-view {
    gap: var(--space-4);
    min-height: calc(100dvh - 40px);
  }

  .generator {
    flex: 1;
    grid-template-columns: 400px minmax(0, 1fr) 340px;
    gap: var(--space-4);
  }

  .result { grid-column: auto; grid-row: auto; padding: var(--space-6); }
  .card-title { font-size: var(--text-xl); }
  .banner { padding: 28px; }
  .banner-title { max-width: none; }
  .wardrobe { gap: var(--space-4); }
  .closet { gap: var(--space-4); }

  .orb--a { top: auto; right: -40px; bottom: -60px; width: 250px; height: 250px; }
  .orb--b { top: auto; right: auto; left: 64px; bottom: 40px; width: 130px; height: 130px; }
  .orb--c { display: block; right: 40px; bottom: 210px; width: 70px; height: 70px; background: var(--orb-peche); }
}
</style>
