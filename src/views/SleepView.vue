<template>
  <div class="animate-fade-in max-w-4xl mx-auto pb-24">
    <div class="flex justify-between items-center mb-6 px-1">
      <h2 class="text-2xl font-bold text-gray-900">Sommeil</h2>
    </div>

    <!-- Sync Action Widget -->
    <div class="bg-indigo-600 rounded-3xl shadow-sm overflow-hidden relative mb-8">
      <div class="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-10"></div>
      <div class="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-white opacity-10"></div>
      
      <div class="p-6 md:p-8 relative z-10 flex flex-col md:flex-row items-center justify-between text-white">
        <div class="mb-6 md:mb-0 text-center md:text-left">
          <h3 class="text-xl font-bold mb-1">Withings Sleep Analyzer</h3>
          <p class="text-indigo-100 text-sm">Synchronisez vos données de sommeil de la nuit dernière.</p>
          <div v-if="errorMsg" class="mt-3 bg-red-500/20 text-red-100 px-3 py-2 rounded-lg text-sm border border-red-500/30">
            {{ errorMsg }}
          </div>
        </div>
        
        <button 
          @click="syncSleep()" 
          :disabled="syncing"
          class="bg-white text-indigo-600 hover:bg-gray-50 px-6 py-3 rounded-xl font-bold flex items-center justify-center transition-transform active:scale-95 shadow-md w-full md:w-auto"
        >
          <svg v-if="syncing" class="animate-spin -ml-1 mr-2 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span v-else class="mr-2">🔄</span>
          {{ syncing ? 'Synchronisation...' : 'Synchroniser' }}
        </button>
      </div>
    </div>

    <!-- Loading Data -->
    <div v-if="loadingRecords" class="flex justify-center py-12">
      <svg class="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>

    <!-- Sleep Metrics List -->
    <div v-if="sleepRecords.length > 0" class="space-y-12">
      <div v-for="record in sleepRecords" :key="record.id" class="space-y-6">
        <div class="flex justify-between items-end px-1">
          <h3 class="text-xl font-bold text-gray-800">Nuit du {{ formatDate(record.date) }}</h3>
          <span class="text-sm font-medium bg-green-100 text-green-700 px-3 py-1 rounded-full">
            Score: {{ record.score }}/100
          </span>
        </div>
        
        <div class="grid grid-cols-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden divide-x divide-y divide-gray-100">
          <!-- Duration -->
          <div class="p-6 col-span-2 sm:col-span-1">
            <div class="text-sm font-medium text-gray-500 mb-1 flex items-center">
              <span class="mr-2">⏱️</span> Durée Totale
            </div>
            <div class="text-2xl font-bold text-gray-900">
              {{ formatDuration(record.duration_seconds) }}
            </div>
            <div class="w-full bg-gray-100 h-2 mt-3 rounded-full overflow-hidden">
               <div class="bg-indigo-500 h-full rounded-full" :style="{ width: Math.min(100, (record.duration_seconds / 28800) * 100) + '%' }"></div>
            </div>
          </div>
          
          <!-- Deep Sleep -->
          <div class="p-6">
            <div class="text-sm font-medium text-gray-500 mb-1 flex items-center">
              <span class="mr-2">🌊</span> Sommeil Profond
            </div>
            <div class="text-2xl font-bold text-indigo-700">
              {{ formatDuration(record.deep_sleep_seconds) }}
            </div>
            <p class="text-xs text-gray-400 mt-1 font-medium">Récupération physique</p>
          </div>
          
          <!-- REM Sleep -->
          <div class="p-6">
            <div class="text-sm font-medium text-gray-500 mb-1 flex items-center">
              <span class="mr-2">🧠</span> Sommeil Paradoxal
            </div>
            <div class="text-2xl font-bold text-purple-600">
              {{ formatDuration(record.rem_sleep_seconds) }}
            </div>
            <p class="text-xs text-gray-400 mt-1 font-medium">Récupération mentale</p>
          </div>

          <!-- Awake -->
          <div class="p-6">
            <div class="text-sm font-medium text-gray-500 mb-1 flex items-center">
              <span class="mr-2">👀</span> Temps Éveillé
            </div>
            <div class="text-2xl font-bold text-gray-700">
              {{ formatDuration(record.awake_seconds) }}
            </div>
            <p class="text-xs text-gray-400 mt-1 font-medium">Interruptions</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loadingRecords" class="text-center py-16 bg-white rounded-3xl shadow-sm border border-gray-100">
      <span class="block text-5xl mb-4">🛏️</span>
      <h3 class="text-lg font-bold text-gray-900 mb-2">Aucune donnée disponible</h3>
      <p class="text-gray-500 text-sm max-w-sm mx-auto">
        Synchronisez vos données Withings pour afficher vos métriques de sommeil.
      </p>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'

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
