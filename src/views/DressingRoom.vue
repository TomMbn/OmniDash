<template>
  <div class="animate-fade-in max-w-2xl mx-auto pb-24 px-4 sm:px-6">
    <!-- Header Section -->
    <header class="flex flex-col gap-6 mb-8 pt-4">
      <div class="flex justify-between items-center px-1">
        <div class="flex items-center gap-3">
          <div class="p-2 md:p-2.5 bg-indigo-600 rounded-xl md:rounded-2xl text-white shadow-lg shadow-indigo-100/50">
            <Shirt :size="20" md:size="24" stroke-width="2.5" />
          </div>
          <div>
            <h2 class="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Dressing Room</h2>
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Intelligence & Style</p>
          </div>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="flex p-1.5 bg-slate-100 rounded-2xl select-none">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          @click="activeTab = tab.id"
          class="flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2"
          :class="activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'"
        >
          <component :is="tab.icon" :size="16" />
          {{ tab.label }}
        </button>
      </div>
    </header>

    <!-- Section 1: Générateur & Conseils -->
    <div v-if="activeTab === 'generator'" class="space-y-8 animate-slide-up">
      <section class="bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 shadow-xl shadow-slate-100/50">
        <div class="flex items-center gap-3 mb-8">
          <div class="p-2 bg-indigo-50 text-indigo-500 rounded-xl">
            <Sparkles :size="20" stroke-width="2.5" />
          </div>
          <h3 class="text-lg font-black text-slate-900 tracking-tight">Assistant Styliste</h3>
        </div>

        <div class="space-y-6">
          <!-- Occasion Selection -->
          <div class="space-y-3">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 select-none">L'occasion</label>
            <div class="grid grid-cols-2 gap-2">
              <button 
                v-for="opt in occasions" :key="opt.id"
                @click="generatorState.occasion = opt.id"
                class="px-4 py-4 rounded-2xl font-black text-xs uppercase transition-all select-none border"
                :class="generatorState.occasion === opt.id ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Weather Selection -->
          <div class="space-y-3">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 select-none">Météo</label>
            <div class="grid grid-cols-3 gap-2">
              <button 
                v-for="opt in weathers" :key="opt.id"
                @click="generatorState.weather = opt.id"
                class="px-3 py-4 rounded-2xl font-black text-[10px] uppercase transition-all select-none border flex flex-col items-center gap-2"
                :class="generatorState.weather === opt.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'"
              >
                <component :is="opt.icon" :size="16" />
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="grid grid-cols-1 gap-3 pt-4">
            <button 
              @click="generateOutfit"
              :disabled="isGenerating"
              class="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black transition-all active:scale-[0.98] flex justify-center items-center gap-2 shadow-xl select-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wand2 v-if="!isGenerating" :size="18" />
              <Loader2 v-else class="animate-spin" :size="18" />
              {{ isGenerating ? 'Styliste en réflexion...' : 'Générer une tenue' }}
            </button>
            <button 
              @click="analyzeGaps"
              :disabled="isGenerating"
              class="w-full bg-white hover:bg-slate-50 text-slate-900 py-5 rounded-2xl font-black transition-all active:scale-[0.98] border border-slate-100 flex justify-center items-center gap-2 shadow-sm select-none disabled:opacity-50"
            >
              <Search v-if="!isGenerating" :size="18" />
              <Loader2 v-else class="animate-spin" :size="18" />
              Analyser les manques
            </button>
          </div>
        </div>
      </section>

      <!-- AI Results Display -->
      <section v-if="aiResult" class="space-y-4 animate-fade-in">
        <div class="bg-white rounded-[2rem] p-8 border border-indigo-100 relative overflow-hidden shadow-xl shadow-indigo-50">
          <div class="absolute top-0 right-0 p-8 text-indigo-500/5">
            <Sparkles :size="120" />
          </div>
          <div class="relative">
            <h4 class="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <span class="w-8 h-[1px] bg-indigo-200"></span>
              Conseil de votre styliste
            </h4>
            <div 
              class="prose prose-slate prose-sm max-w-none prose-headings:text-slate-900 prose-headings:font-black prose-p:text-slate-600 prose-p:leading-relaxed prose-strong:text-indigo-600 prose-li:text-slate-600"
              v-html="renderedResult"
            ></div>
          </div>
        </div>
        
        <button 
          @click="aiResult = null"
          class="w-full py-4 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-indigo-500 transition-colors"
        >
          Effacer les conseils
        </button>
      </section>

      <!-- Placeholder Results -->
      <section v-else class="flex flex-col items-center justify-center py-20 px-8 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
        <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 border border-slate-100 mb-4 shadow-sm">
          <Lightbulb :size="32" stroke-width="1.5" />
        </div>
        <p class="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] text-center">En attente de génération</p>
        <p class="text-slate-300 text-[10px] font-bold text-center mt-2">Sélectionnez une occasion et la météo pour commencer.</p>
      </section>
    </div>

    <!-- Section 2: Mon Placard -->
    <div v-if="activeTab === 'wardrobe'" class="space-y-8 animate-slide-up">
      <!-- Magic Add Section -->
      <section class="bg-white rounded-[2.5rem] border border-slate-100 p-6 md:p-8 shadow-xl shadow-slate-100/50">
        <div class="flex items-center gap-3 mb-8">
          <div class="p-2 bg-emerald-50 text-emerald-500 rounded-xl">
            <Wand2 :size="20" stroke-width="2.5" />
          </div>
          <h3 class="text-lg font-black text-slate-900 tracking-tight">Ajout Magique</h3>
        </div>

        <div class="space-y-6">
          <div class="space-y-2">
            <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 select-none font-sans">Description libre</label>
            <textarea 
              v-model="magicForm.rawInput"
              rows="2"
              placeholder="Ex: Gros pull en laine rouge un peu ample..."
              class="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-slate-800 resize-none text-sm placeholder:text-slate-300 shadow-inner"
              :disabled="isMagicLoading"
            ></textarea>
          </div>

          <div class="space-y-2">
            <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 select-none font-sans">Lien (optionnel)</label>
            <input 
              v-model="magicForm.link"
              type="url"
              placeholder="https://www.exemple.com/article..."
              class="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-slate-800 text-sm placeholder:text-slate-300 shadow-inner"
              :disabled="isMagicLoading"
            >
          </div>

          <button 
            @click="smartAdd"
            :disabled="isMagicLoading || !magicForm.rawInput"
            class="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-5 rounded-[1.5rem] font-black transition-all active:scale-[0.98] shadow-xl shadow-emerald-100 flex justify-center items-center gap-3 select-none"
          >
            <Loader2 v-if="isMagicLoading" class="animate-spin" :size="20" />
            <Sparkles v-else :size="20" />
            {{ isMagicLoading ? 'Analyse par l\'IA...' : 'Ajout Magique ✨' }}
          </button>
        </div>
      </section>

      <!-- Wardrobe List Categorized -->
      <section v-if="wardrobe.length > 0" class="space-y-12">
        <div class="flex items-center justify-between px-1">
          <h3 class="text-xl font-black text-slate-900 tracking-tight">Mon Placard ({{ wardrobe.length }})</h3>
          <button 
            @click="copyWardrobeContent"
            class="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all active:scale-[0.98] group"
          >
            <component :is="copyStatus === 'copied' ? Check : ClipboardCopy" :size="16" :class="copyStatus === 'copied' ? 'text-emerald-500' : ''" />
            <span class="text-[10px] font-black uppercase tracking-widest">{{ copyStatus === 'copied' ? 'Copié !' : 'Copier pour l\'IA' }}</span>
          </button>
        </div>

        <div v-for="group in groupedWardrobe" :key="group.id" class="space-y-4">
          <div class="flex items-center gap-3 px-1 ml-1">
            <div :class="['p-1.5 rounded-lg', group.bg, group.color]">
              <component :is="group.icon" :size="14" stroke-width="3" />
            </div>
            <h4 class="text-xs font-black text-slate-400 capitalize tracking-[0.2em]">{{ group.label }} ({{ group.items.length }})</h4>
            <div class="h-[1px] flex-1 bg-slate-100"></div>
          </div>

          <div class="grid grid-cols-1 gap-4">
            <div 
              v-for="item in group.items" 
              :key="item.id"
              class="bg-white p-5 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:border-indigo-100 transition-all shadow-sm"
            >
              <div class="flex items-center gap-4">
                <div :class="['p-4 rounded-full transition-colors shadow-sm', group.bg, group.color]">
                  <component :is="group.icon" :size="24" />
                </div>
                <div>
                  <h4 class="font-black text-slate-800 group-hover:text-slate-900 transition-colors">{{ item.name }}</h4>
                  <div class="flex flex-wrap gap-2 items-center mt-2">
                    <span v-if="item.quantity > 1" class="text-[9px] font-black uppercase text-white tracking-widest bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-900">x{{ item.quantity }}</span>
                    <span class="text-[9px] font-black uppercase text-indigo-500 tracking-widest bg-indigo-50/50 px-2.5 py-1 rounded-lg border border-indigo-100">{{ item.color }}</span>
                    <span v-if="item.brand" class="text-[9px] font-black uppercase text-emerald-600 tracking-widest bg-emerald-50/50 px-2.5 py-1 rounded-lg border border-emerald-100">{{ item.brand }}</span>
                    <span v-if="item.style" class="text-[9px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">{{ item.style }}</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-1">
                <button 
                  @click="updateQuantity(item, -1)"
                  class="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  title="Diminuer"
                >
                  <Minus :size="16" />
                </button>
                <button 
                  @click="updateQuantity(item, 1)"
                  class="p-2 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                  title="Augmenter"
                >
                  <Plus :size="16" />
                </button>
                <a v-if="item.link" :href="item.link" target="_blank" class="p-2 text-slate-300 hover:text-indigo-500 hover:bg-slate-50 rounded-xl transition-all">
                  <ExternalLink :size="16" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="!loading" class="flex flex-col items-center justify-center py-20 px-8 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
        <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 border border-slate-100 mb-4 shadow-sm">
          <Shirt :size="32" stroke-width="1.5" />
        </div>
        <p class="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] text-center">Placard vide</p>
        <p class="text-slate-300 text-[10px] font-bold text-center mt-2 underline">Décrivez votre premier vêtement ci-dessus !</p>
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
  Library, 
  Sun, 
  CloudRain, 
  ThermometerSnowflake,
  Lightbulb,
  Loader2,
  Footprints,
  Watch,
  ClipboardCopy,
  Check,
  Columns2,
  Plus,
  Minus,
  Trash2
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
const groupedWardrobe = computed(() => {
  const categories = [
    { id: 'haut', label: 'Hauts', icon: Shirt, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { id: 'veste', label: 'Vestes', icon: Shirt, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'bas', label: 'Bas', icon: TrousersIcon, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'chaussures', label: 'Chaussures', icon: Footprints, color: 'text-orange-500', bg: 'bg-orange-50' },
    { id: 'accessoire', label: 'Accessoires', icon: Watch, color: 'text-rose-500', bg: 'bg-rose-50' }
  ]

  // Add items that don't match any category to "Autres"
  const knownCategories = categories.map(c => c.id)
  const others = wardrobe.value.filter(item => !knownCategories.includes(item.category?.toLowerCase()))
  
  const result = categories.map(cat => ({
    ...cat,
    items: wardrobe.value.filter(item => item.category?.toLowerCase() === cat.id)
  })).filter(group => group.items.length > 0)

  if (others.length > 0) {
    result.push({ id: 'autres', label: 'Autres', icon: WardrobeIcon, color: 'text-slate-500', bg: 'bg-slate-50', items: others })
  }

  return result
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
    setTimeout(() => {
      copyStatus.value = 'idle'
    }, 2000)
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
    wardrobe.value = data
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
    // 1. Appeler l'ia pour extraire les données
    const { data: extractedData, error: functionError } = await supabase.functions.invoke('smart-add-item', {
      body: { 
        rawInput: magicForm.rawInput,
        link: magicForm.link 
      }
    })

    if (functionError) throw functionError

    // 2. Insérer dans Supabase
    const { error: insertError } = await supabase
      .from('wardrobe')
      .insert({
        ...extractedData,
        link: magicForm.link,
        user_id: user.value.id
      })

    if (insertError) throw insertError

    // 3. Reset & Refresh
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
.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}

.animate-slide-up {
  animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

::placeholder {
  @apply opacity-50;
}
</style>
