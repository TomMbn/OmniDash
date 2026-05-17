<template>
  <div class="dressing-view">
    <!-- Header -->
    <header class="view-header">
      <div class="header-top">
        <div class="module-title-group">
          <div class="module-icon">
            <Shirt :size="18" stroke-width="1.75" />
          </div>
          <div>
            <h1 class="view-title">Dressing Room</h1>
            <p class="view-sub">Intelligence & Style</p>
          </div>
        </div>
      </div>

      <div class="tab-switcher">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="tab-btn"
          :class="{ 'tab-btn--active': activeTab === tab.id }"
        >
          <component :is="tab.icon" :size="14" />
          {{ tab.label }}
        </button>
      </div>
    </header>

    <!-- Generator tab -->
    <div v-if="activeTab === 'generator'" class="tab-content">
      <section class="stylist-card">
        <div class="card-header">
          <div class="card-icon">
            <Sparkles :size="16" stroke-width="1.75" />
          </div>
          <h3 class="card-title">Assistant Styliste</h3>
        </div>

        <div class="field-group">
          <label class="field-label">L'occasion</label>
          <div class="occasion-grid">
            <button
              v-for="opt in occasions"
              :key="opt.id"
              @click="generatorState.occasion = opt.id"
              class="occasion-btn"
              :class="{ 'occasion-btn--active': generatorState.occasion === opt.id }"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">Météo</label>
          <div class="weather-grid">
            <button
              v-for="opt in weathers"
              :key="opt.id"
              @click="generatorState.weather = opt.id"
              class="weather-btn"
              :class="{ 'weather-btn--active': generatorState.weather === opt.id }"
            >
              <component :is="opt.icon" :size="15" />
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="actions-group">
          <button @click="generateOutfit" :disabled="isGenerating" class="btn-primary">
            <Wand2 v-if="!isGenerating" :size="16" stroke-width="1.75" />
            <Loader2 v-else class="spin" :size="16" />
            {{ isGenerating ? 'Styliste en réflexion...' : 'Générer une tenue' }}
          </button>
          <button @click="analyzeGaps" :disabled="isGenerating" class="btn-secondary">
            <Search v-if="!isGenerating" :size="16" stroke-width="1.75" />
            <Loader2 v-else class="spin" :size="16" />
            Analyser les manques
          </button>
        </div>
      </section>

      <!-- AI Result -->
      <section v-if="aiResult" class="ai-result">
        <div class="sparkles-bg"><Sparkles :size="110" /></div>
        <div class="ai-result-label">
          <span class="label-line"></span>
          Conseil de votre styliste
        </div>
        <div class="ai-result-content" v-html="renderedResult"></div>
        <button @click="aiResult = null" class="clear-btn">Effacer les conseils</button>
      </section>

      <!-- Empty placeholder -->
      <section v-else class="empty-state">
        <div class="empty-icon"><Lightbulb :size="28" stroke-width="1.5" /></div>
        <p class="empty-title">En attente de génération</p>
        <p class="empty-sub">Sélectionnez une occasion et la météo pour commencer.</p>
      </section>
    </div>

    <!-- Wardrobe tab -->
    <div v-if="activeTab === 'wardrobe'" class="tab-content">
      <section class="magic-add-card">
        <div class="card-header">
          <div class="card-icon card-icon--add">
            <Wand2 :size="16" stroke-width="1.75" />
          </div>
          <h3 class="card-title">Ajout Magique</h3>
        </div>

        <div class="field-group">
          <label class="field-label">Description libre</label>
          <textarea
            v-model="magicForm.rawInput"
            rows="2"
            placeholder="Ex: Gros pull en laine rouge un peu ample..."
            class="magic-textarea"
            :disabled="isMagicLoading"
          ></textarea>
        </div>

        <div class="field-group">
          <label class="field-label">Lien (optionnel)</label>
          <input
            v-model="magicForm.link"
            type="url"
            placeholder="https://www.exemple.com/article..."
            class="magic-input"
            :disabled="isMagicLoading"
          />
        </div>

        <button @click="smartAdd" :disabled="isMagicLoading || !magicForm.rawInput" class="btn-magic">
          <Loader2 v-if="isMagicLoading" class="spin" :size="16" />
          <Sparkles v-else :size="16" />
          {{ isMagicLoading ? "Analyse par l'IA..." : 'Ajout Magique' }}
        </button>
      </section>

      <!-- Wardrobe list -->
      <section v-if="wardrobe && wardrobe.length > 0" class="wardrobe-section">
        <div class="wardrobe-header">
          <h3 class="wardrobe-count">Mon Placard ({{ wardrobe.length }})</h3>
          <button @click="copyWardrobeContent" class="copy-btn">
            <component :is="copyStatus === 'copied' ? Check : ClipboardCopy" :size="13" />
            {{ copyStatus === 'copied' ? 'Copié !' : "Copier pour l'IA" }}
          </button>
        </div>

        <div v-for="group in groupedWardrobe" :key="group.id" class="category-group">
          <div class="category-header">
            <div class="category-icon" :style="group.iconStyle">
              <component :is="group.icon" :size="12" stroke-width="2.5" />
            </div>
            <span class="category-label">{{ group.label }} ({{ group.itemsCount }})</span>
            <div class="category-divider"></div>
          </div>

          <div v-for="sub in group.subSections" :key="sub.label" class="sub-section">
            <div v-if="group.subSections.length > 1" class="sub-label">{{ sub.label }}</div>
            <div class="items-list">
              <div v-for="item in sub.items" :key="item.id" class="item-card">
                <div class="item-left">
                  <div class="item-category-icon" :style="group.iconStyleLarge">
                    <component :is="group.icon" :size="20" />
                  </div>
                  <div class="item-info">
                    <h4 class="item-name">{{ item.name }}</h4>
                    <div class="item-tags">
                      <span v-if="item.quantity > 1" class="tag tag--qty">x{{ item.quantity }}</span>
                      <span class="tag tag--color">{{ item.color }}</span>
                      <span v-if="item.brand" class="tag tag--brand">{{ item.brand }}</span>
                      <span v-if="item.style" class="tag tag--style">{{ item.style }}</span>
                    </div>
                  </div>
                </div>
                <div class="item-actions">
                  <button @click="updateQuantity(item, -1)" class="action-btn action-btn--minus" title="Diminuer">
                    <Minus :size="14" />
                  </button>
                  <button @click="updateQuantity(item, 1)" class="action-btn action-btn--plus" title="Augmenter">
                    <Plus :size="14" />
                  </button>
                  <a v-if="item.link" :href="item.link" target="_blank" class="action-btn action-btn--link">
                    <ExternalLink :size="14" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Empty wardrobe -->
      <section v-else-if="!loading" class="empty-state">
        <div class="empty-icon"><Shirt :size="28" stroke-width="1.5" /></div>
        <p class="empty-title">Placard vide</p>
        <p class="empty-sub">Décrivez votre premier vêtement ci-dessus !</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'
import { marked } from 'marked'
import { createLucideIcon } from 'lucide-vue-next'
import { trousers, wardrobe as wardrobeNode } from '@lucide/lab'
import {
  Shirt,
  Sparkles,
  Wand2,
  Search,
  ExternalLink,
  Sun,
  CloudRain,
  ThermometerSnowflake,
  Lightbulb,
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

// Tabs
const activeTab = ref('generator')
const tabs = [
  { id: 'generator', label: 'Générateur', icon: Sparkles },
  { id: 'wardrobe', label: 'Placard', icon: WardrobeIcon }
]

// ── GENERATOR LOGIC ──
const isGenerating = ref(false)
const generatorState = reactive({
  occasion: 'Work',
  weather: 'Hot'
})

const occasions = [
  { id: 'Work', label: '💼 Travail' },
  { id: 'Sport', label: '👟 Sport' },
  { id: 'Evening', label: '🍸 Soirée' },
  { id: 'Chill', label: '🛋️ Chill' }
]

const weathers = [
  { id: 'Hot', label: 'Chaud', icon: Sun },
  { id: 'Rain', label: 'Pluie', icon: CloudRain },
  { id: 'Cold', label: 'Froid', icon: ThermometerSnowflake }
]

const aiResult = ref(null)

const renderedResult = computed(() => {
  if (!aiResult.value) return ''
  return marked.parse(aiResult.value)
})

const generateOutfit = async () => {
  isGenerating.value = true
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
  } finally {
    isGenerating.value = false
  }
}

const analyzeGaps = async () => {
  isGenerating.value = true
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
      iconStyle: { background: 'rgba(184,150,126,0.12)', color: '#B8967E' },
      iconStyleLarge: { background: 'rgba(184,150,126,0.10)', color: '#B8967E', borderRadius: '10px' }
    },
    {
      id: 'veste', label: 'Vestes', icon: Shirt,
      iconStyle: { background: 'rgba(122,145,184,0.12)', color: '#7A91B8' },
      iconStyleLarge: { background: 'rgba(122,145,184,0.10)', color: '#7A91B8', borderRadius: '10px' }
    },
    {
      id: 'bas', label: 'Bas', icon: TrousersIcon,
      iconStyle: { background: 'rgba(125,173,138,0.12)', color: '#7DAD8A' },
      iconStyleLarge: { background: 'rgba(125,173,138,0.10)', color: '#7DAD8A', borderRadius: '10px' }
    },
    {
      id: 'chaussures', label: 'Chaussures', icon: Footprints,
      iconStyle: { background: 'rgba(212,151,106,0.12)', color: '#D4976A' },
      iconStyleLarge: { background: 'rgba(212,151,106,0.10)', color: '#D4976A', borderRadius: '10px' }
    },
    {
      id: 'accessoire', label: 'Accessoires', icon: Watch,
      iconStyle: { background: 'rgba(201,160,76,0.12)', color: '#C9A04C' },
      iconStyleLarge: { background: 'rgba(201,160,76,0.10)', color: '#C9A04C', borderRadius: '10px' }
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
        iconStyle: { background: 'rgba(240,235,227,0.06)', color: 'var(--text-muted)' },
        iconStyleLarge: { background: 'rgba(240,235,227,0.05)', color: 'var(--text-muted)', borderRadius: '10px' },
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
    if (confirm(`Voulez-vous supprimer "${item.name}" du placard ?`)) {
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
  }
}

const smartAdd = async () => {
  if (!magicForm.rawInput || !user.value) return
  isMagicLoading.value = true
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
  } finally {
    isMagicLoading.value = false
  }
}

onMounted(() => {
  fetchWardrobe()
})
</script>

<style scoped>
.dressing-view {
  max-width: 640px;
  margin: 0 auto;
  padding: 8px 0 100px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Header ── */
.view-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 2px;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.module-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.module-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  background: var(--module-dress-dim);
  border: 1px solid var(--module-dress-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--module-dress);
}

.view-title {
  font-family: var(--font-serif);
  font-size: var(--text-2xl);
  font-weight: 400;
  color: var(--text-primary);
  margin: 0;
}

.view-sub {
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  margin-top: 1px;
}

/* ── Tab switcher ── */
.tab-switcher {
  display: flex;
  padding: 4px;
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 14px;
  border-radius: calc(var(--radius-lg) - 4px);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
  user-select: none;
  border: none;
  background: transparent;
}

.tab-btn--active {
  background: var(--bg-raised);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
}

.tab-btn:not(.tab-btn--active):hover {
  color: var(--text-secondary);
}

/* ── Tab content ── */
.tab-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Shared card ── */
.stylist-card,
.magic-add-card {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: 24px 22px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  background: var(--module-dress-dim);
  border: 1px solid var(--module-dress-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--module-dress);
}

.card-icon--add {
  background: rgba(125, 173, 138, 0.10);
  border-color: rgba(125, 173, 138, 0.20);
  color: #7DAD8A;
}

.card-title {
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  font-weight: 400;
  color: var(--text-primary);
  margin: 0;
}

/* ── Field groups ── */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
}

/* ── Occasion grid ── */
.occasion-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.occasion-btn {
  padding: 14px 16px;
  border-radius: var(--radius-md);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  background: var(--bg-subtle);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  user-select: none;
}

.occasion-btn:hover {
  border-color: var(--border-default);
  color: var(--text-secondary);
}

.occasion-btn--active {
  background: var(--module-dress-dim);
  border-color: var(--module-dress-border);
  color: var(--module-dress);
}

/* ── Weather grid ── */
.weather-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.weather-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 10px;
  border-radius: var(--radius-md);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  background: var(--bg-subtle);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  user-select: none;
}

.weather-btn:hover {
  border-color: var(--border-default);
  color: var(--text-secondary);
}

.weather-btn--active {
  background: var(--module-dress-dim);
  border-color: var(--module-dress-border);
  color: var(--module-dress);
}

/* ── Action buttons ── */
.actions-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-primary,
.btn-secondary,
.btn-magic {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 20px;
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  user-select: none;
  border: 1px solid transparent;
}

.btn-primary:active,
.btn-secondary:active,
.btn-magic:active { transform: scale(0.98); }

.btn-primary:disabled,
.btn-secondary:disabled,
.btn-magic:disabled { opacity: 0.45; cursor: not-allowed; }

.btn-primary {
  background: var(--text-primary);
  color: var(--bg-base);
}

.btn-primary:hover:not(:disabled) { background: var(--text-secondary); }

.btn-secondary {
  background: var(--bg-overlay);
  border-color: var(--border-default);
  color: var(--text-secondary);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--module-dress-border);
  color: var(--module-dress);
}

.btn-magic {
  background: var(--module-dress-dim);
  border-color: var(--module-dress-border);
  color: var(--module-dress);
}

.btn-magic:hover:not(:disabled) { background: rgba(184, 150, 126, 0.18); }

/* ── AI Result ── */
.ai-result {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-top: 2px solid var(--module-dress);
  border-radius: var(--radius-xl);
  padding: 26px 22px 22px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sparkles-bg {
  position: absolute;
  top: 0;
  right: 0;
  padding: 18px;
  color: var(--module-dress);
  opacity: 0.04;
  pointer-events: none;
}

.ai-result-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--module-dress);
}

.label-line {
  display: block;
  width: 28px;
  height: 1px;
  background: var(--module-dress);
  opacity: 0.5;
}

.ai-result-content {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.75;
}

.ai-result-content :deep(h1),
.ai-result-content :deep(h2),
.ai-result-content :deep(h3),
.ai-result-content :deep(h4) {
  font-family: var(--font-serif);
  font-weight: 400;
  color: var(--text-primary);
  margin: 18px 0 8px;
}

.ai-result-content :deep(strong) {
  color: var(--module-dress);
  font-weight: 600;
}

.ai-result-content :deep(p) { margin: 8px 0; }

.ai-result-content :deep(ul),
.ai-result-content :deep(ol) { padding-left: 20px; margin: 8px 0; }

.ai-result-content :deep(li) { margin: 4px 0; }

.clear-btn {
  align-self: center;
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 0;
  transition: color var(--dur-fast) var(--ease-out);
}

.clear-btn:hover { color: var(--module-dress); }

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  background: var(--bg-overlay);
  border: 1px dashed var(--border-subtle);
  border-radius: var(--radius-xl);
  gap: 10px;
}

.empty-icon {
  width: 54px;
  height: 54px;
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.empty-title {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--text-muted);
  margin: 0;
}

.empty-sub {
  font-size: 11px;
  color: var(--text-muted);
  opacity: 0.55;
  text-align: center;
  margin: 0;
}

/* ── Magic Add inputs ── */
.magic-textarea,
.magic-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-primary);
  outline: none;
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
  resize: none;
  box-sizing: border-box;
}

.magic-textarea:focus,
.magic-input:focus {
  border-color: var(--module-dress-border);
  box-shadow: 0 0 0 3px rgba(184, 150, 126, 0.08);
}

.magic-textarea::placeholder,
.magic-input::placeholder {
  color: var(--text-muted);
  opacity: 0.5;
}

/* ── Wardrobe section ── */
.wardrobe-section {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.wardrobe-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px;
}

.wardrobe-count {
  font-family: var(--font-serif);
  font-size: var(--text-xl);
  font-weight: 400;
  color: var(--text-primary);
  margin: 0;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}

.copy-btn:hover {
  border-color: var(--border-default);
  color: var(--text-secondary);
}

/* ── Category groups ── */
.category-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 2px;
}

.category-icon {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.category-label {
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--text-muted);
}

.category-divider {
  flex: 1;
  height: 1px;
  background: var(--border-subtle);
}

/* ── Sub-sections ── */
.sub-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sub-label {
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--text-muted);
  opacity: 0.5;
  padding: 0 2px;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── Item card ── */
.item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  transition: border-color var(--dur-fast) var(--ease-out);
}

.item-card:hover { border-color: var(--module-dress-border); }

.item-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.item-category-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-info { min-width: 0; }

.item-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag {
  font-size: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 3px 7px;
  border-radius: 4px;
}

.tag--qty {
  background: var(--bg-overlay);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

.tag--color {
  background: var(--module-dress-dim);
  color: var(--module-dress);
  border: 1px solid var(--module-dress-border);
}

.tag--brand {
  background: rgba(125, 173, 138, 0.10);
  color: #7DAD8A;
  border: 1px solid rgba(125, 173, 138, 0.18);
}

.tag--style {
  background: var(--bg-subtle);
  color: var(--text-muted);
  border: 1px solid var(--border-subtle);
}

/* ── Item actions ── */
.item-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  text-decoration: none;
}

.action-btn--minus:hover { background: rgba(239, 68, 68, 0.10); color: #EF4444; }
.action-btn--plus:hover  { background: rgba(125, 173, 138, 0.12); color: #7DAD8A; }
.action-btn--link:hover  { background: var(--module-dress-dim); color: var(--module-dress); }

/* ── Spinner ── */
.spin { animation: spin 0.8s linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }
</style>
