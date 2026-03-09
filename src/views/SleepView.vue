<template>
  <div class="animate-fade-in max-w-5xl mx-auto pb-24 px-4 sm:px-6 lg:px-8">
    <!-- Header -->
    <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 md:mb-12 pt-4 md:pt-6">
      <div class="flex items-center gap-3">
        <div class="p-2 md:p-2.5 bg-indigo-600 rounded-xl md:rounded-2xl text-white shadow-lg shadow-indigo-100/50">
          <Moon :size="20" md:size="24" stroke-width="2.5" />
        </div>
        <div>
          <h2 class="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Sommeil</h2>
          <p class="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-1 ml-0.5">Analyse de Récupération</p>
        </div>
      </div>
    </header>

    <!-- Sync Action Widget -->
    <div class="bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden mb-8 md:mb-12 shadow-2xl shadow-slate-900/20 group">
      <div class="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl transition-all duration-700 group-hover:scale-110"></div>
      <div class="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 rounded-full bg-slate-800 opacity-50 blur-2xl"></div>
      
      <div class="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-8">
        <div class="text-center lg:text-left">
          <div class="flex items-center justify-center lg:justify-start gap-3 mb-3">
            <div class="p-2 bg-slate-800 rounded-xl">
              <Zap :size="18" md:size="20" class="text-indigo-400" />
            </div>
            <h3 class="text-lg md:text-xl font-black text-white tracking-tight">Withings Sleep Analyzer</h3>
          </div>
          <p class="text-slate-400 font-bold text-xs md:text-sm max-w-sm">Synchronisez vos cycles pour optimiser votre récupération.</p>
          
          <div v-if="errorMsg" class="mt-4 bg-rose-500/10 text-rose-400 px-4 py-3 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest border border-rose-500/20 flex items-center gap-2">
            <div class="w-1.5 h-1.5 bg-rose-400 rounded-full animate-pulse"></div>
            {{ errorMsg }}
          </div>
        </div>
        
        <button 
          @click="syncSleep()" 
          :disabled="syncing"
          class="bg-indigo-600 text-white hover:bg-indigo-500 px-6 md:px-8 py-3.5 md:py-4 rounded-xl md:rounded-2xl font-black flex items-center justify-center transition-all active:scale-95 shadow-xl shadow-indigo-600/20 w-full lg:w-auto disabled:opacity-50 disabled:cursor-not-allowed group/btn text-xs md:text-sm uppercase tracking-widest"
        >
          <RefreshCw v-if="syncing" class="animate-spin -ml-1 mr-3 h-4 w-4 md:h-5 md:w-5" :stroke-width="3" />
          <RefreshCw v-else class="mr-3 h-4 w-4 md:h-5 md:w-5 transition-transform group-hover/btn:rotate-180 duration-500" :stroke-width="3" />
          {{ syncing ? 'SYNC...' : 'SYNCHRONISER' }}
        </button>
      </div>
    </div>

    <!-- Loading Data -->
    <div v-if="loadingRecords" class="flex flex-col items-center justify-center py-24 gap-4">
      <div class="relative">
        <div class="absolute inset-0 bg-indigo-400/20 rounded-full animate-ping"></div>
        <RefreshCw class="animate-spin h-8 w-8 md:h-10 md:w-10 text-indigo-600 relative z-10" :stroke-width="2.5" />
      </div>
      <p class="text-slate-400 font-black text-[10px] uppercase tracking-widest mt-4">Chargement...</p>
    </div>

    <!-- Sleep Metrics List -->
    <div v-if="sleepRecords.length > 0" class="space-y-12 md:space-y-16">
      <div v-for="record in sleepRecords" :key="record.id" class="space-y-6 md:space-y-8">
        <div class="flex justify-between items-center px-1">
          <div class="flex items-center gap-3">
            <div class="p-1.5 md:p-2 bg-slate-100 rounded-lg md:rounded-xl">
              <Calendar :size="16" md:size="18" class="text-slate-500" />
            </div>
            <h3 class="text-lg md:text-xl font-black text-slate-800 tracking-tight">Nuit du {{ formatDate(record.date) }}</h3>
          </div>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <!-- Duration -->
          <div class="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-2 transition-all hover:border-indigo-100 group">
            <div class="flex items-center gap-2 mb-2">
              <Clock :size="14" md:size="16" class="text-slate-400" stroke-width="2.5" />
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Durée Totale</span>
            </div>
            <div class="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter tabular-nums">
              {{ formatDuration(record.duration_seconds).split(' ')[0] }}<span class="text-lg md:text-xl text-slate-300 ml-0.5">{{ formatDuration(record.duration_seconds).split(' ')[1] || 'h' }}</span> 
              <span v-if="formatDuration(record.duration_seconds).split(' ')[2]" class="ml-1">
                {{ formatDuration(record.duration_seconds).split(' ')[2] }}<span class="text-lg md:text-xl text-slate-300 ml-0.5">{{ formatDuration(record.duration_seconds).split(' ')[3] || 'm' }}</span>
              </span>
            </div>
            <div class="w-full bg-slate-50 h-1.5 mt-4 rounded-full overflow-hidden border border-slate-100">
               <div class="bg-indigo-600 h-full rounded-full transition-all duration-1000" :style="{ width: Math.min(100, (record.duration_seconds / 28800) * 100) + '%' }"></div>
            </div>
          </div>
          
          <!-- Deep Sleep -->
          <div class="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-2 transition-all hover:border-indigo-100">
            <div class="flex items-center gap-2 mb-2">
              <Waves :size="14" md:size="16" class="text-indigo-400" stroke-width="2.5" />
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Profond</span>
            </div>
            <div class="text-3xl md:text-4xl font-black text-indigo-700 tracking-tighter tabular-nums">
              {{ formatDuration(record.deep_sleep_seconds).split(' ')[0] }}<span class="text-lg md:text-xl text-indigo-300 ml-0.5">{{ formatDuration(record.deep_sleep_seconds).split(' ')[1] || 'h' }}</span>
              <span v-if="formatDuration(record.deep_sleep_seconds).split(' ')[2]" class="ml-1 text-2xl">
                {{ formatDuration(record.deep_sleep_seconds).split(' ')[2] }}<span class="text-base text-indigo-200 ml-0.5">{{ formatDuration(record.deep_sleep_seconds).split(' ')[3] || 'm' }}</span>
              </span>
            </div>
            <p class="text-[9px] font-black text-slate-300 mt-auto uppercase tracking-widest">Récupération physique</p>
          </div>
          
          <!-- REM Sleep -->
          <div class="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-2 transition-all hover:border-indigo-100">
            <div class="flex items-center gap-2 mb-2">
              <Brain :size="14" md:size="16" class="text-purple-400" stroke-width="2.5" />
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Paradoxal</span>
            </div>
            <div class="text-3xl md:text-4xl font-black text-purple-600 tracking-tighter tabular-nums">
              {{ formatDuration(record.rem_sleep_seconds).split(' ')[0] }}<span class="text-lg md:text-xl text-purple-300 ml-0.5">{{ formatDuration(record.rem_sleep_seconds).split(' ')[1] || 'h' }}</span>
              <span v-if="formatDuration(record.rem_sleep_seconds).split(' ')[2]" class="ml-1 text-2xl">
                {{ formatDuration(record.rem_sleep_seconds).split(' ')[2] }}<span class="text-base text-purple-200 ml-0.5">{{ formatDuration(record.rem_sleep_seconds).split(' ')[3] || 'm' }}</span>
              </span>
            </div>
            <p class="text-[9px] font-black text-slate-300 mt-auto uppercase tracking-widest">Récupération mentale</p>
          </div>

          <!-- Sleep Score -->
          <div class="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-2 transition-all hover:border-indigo-100">
            <div class="flex items-center gap-2 mb-2">
              <Award :size="14" md:size="16" :class="record.score >= 80 ? 'text-emerald-500' : 'text-slate-400'" stroke-width="2.5" />
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sommeil Score</span>
            </div>
            <div 
              class="text-4xl md:text-5xl font-black tracking-tighter tabular-nums"
              :class="record.score >= 80 ? 'text-emerald-500' : record.score >= 60 ? 'text-amber-500' : 'text-slate-800'"
            >
              {{ record.score }}<span class="text-xl opacity-20 ml-1">/100</span>
            </div>
            <p class="text-[9px] font-black text-slate-300 mt-auto uppercase tracking-widest">Indice de qualité</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loadingRecords" class="text-center py-24 bg-white rounded-[3rem] border border-slate-100 shadow-sm flex flex-col items-center">
      <div class="p-6 bg-slate-50 rounded-3xl mb-6">
        <Bed :size="48" class="text-slate-200" />
      </div>
      <h3 class="text-xl font-black text-slate-900 mb-2">Silence radio</h3>
      <p class="text-slate-400 font-medium text-sm max-w-xs mx-auto mb-8 leading-relaxed">
        Synchronisez vos données Withings pour décoder vos nuits et booster vos performances.
      </p>
      <button 
        @click="syncSleep()" 
        class="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:bg-slate-800 active:scale-95"
      >
        Lancer la synchro
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'
import { 
  Moon, 
  RefreshCw, 
  Bed, 
  Activity, 
  Award, 
  Calendar, 
  Zap,
  Waves,
  Brain,
  Eye,
  Clock,
  ChevronRight
} from 'lucide-vue-next'

const { user } = useAuth()

const syncing = ref(false)
const loadingRecords = ref(true)
const sleepRecords = ref([])
const errorMsg = ref('')

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id || user.value?.id
  
  if (userId) {
    await fetchLatestRecord(userId)
    
    // Check if we are returning from Withings OAuth flow
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      // Clean URL silently
      window.history.replaceState({}, document.title, window.location.pathname);
      await syncSleep(code);
    }
  }
})

const fetchLatestRecord = async (userId) => {
  loadingRecords.value = true
  try {
    const { data } = await supabase
      .from('sleep_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(7)
      
    if (data) {
      sleepRecords.value = data
    }
  } catch (e) {
    console.error('Error fetching sleep records:', e)
  } finally {
    loadingRecords.value = false
  }
}

const startWithingsOAuth = () => {
  const clientId = import.meta.env.VITE_WITHINGS_CLIENT_ID
  
  if (!clientId) {
    errorMsg.value = "Identifiant Client Withings manquant dans les variables d'environnement."
    return
  }

  const redirectUri = encodeURIComponent(window.location.origin + '/sommeil')
  const state = Math.random().toString(36).substring(7)
  const url = `https://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=${clientId}&state=${state}&scope=user.metrics,user.activity&redirect_uri=${redirectUri}`
  
  window.location.href = url
}

const syncSleep = async (code = null) => {
  syncing.value = true
  errorMsg.value = ''
  
  try {
    const payload = {}
    if (code) {
      payload.code = code
      payload.redirect_uri = window.location.origin + '/sommeil'
    }

    const { data, error } = await supabase.functions.invoke('withings-sync', {
      body: payload
    })
    
    if (error) throw error
    
    // If needs_auth → redirect to Withings OAuth
    if (data.needs_auth) {
      startWithingsOAuth()
      return
    }
    
    if (data.error) throw new Error(data.error)
    
    // Successful sync, re-fetch all records
    if (Array.isArray(data) && data.length > 0) {
      const userId = user.value?.id
      if (userId) await fetchLatestRecord(userId)
    } else if (Array.isArray(data) && data.length === 0) {
      errorMsg.value = "Aucune nouvelle donnée de sommeil trouvée chez Withings pour les 7 derniers jours."
    } else if (data && !Array.isArray(data) && !data.needs_auth) {
      sleepRecords.value = [data]
    }
    
  } catch (e) {
    console.error("Withings Sync Error:", e)
    errorMsg.value = "Erreur de synchronisation : " + (e.message || String(e))
  } finally {
    syncing.value = false
  }
}

// Formatting utils
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
}

const formatDuration = (seconds) => {
  if (!seconds) return '0h 0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}
</script>
