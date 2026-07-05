<template>
  <div class="settings-view">

    <header class="module-header">
      <div class="module-header-title">
        <div class="module-icon">
          <Wind :size="18" stroke-width="1.75" />
        </div>
        <div>
          <h2 class="module-name">Fenêtres</h2>
          <p class="module-sub">Netatmo & notifications</p>
        </div>
      </div>
    </header>

    <!-- ── Netatmo card ── -->
    <div class="sync-card">
      <div class="sync-content">
        <div class="sync-left">
          <div class="sync-title-row">
            <div class="sync-zap-icon"><Thermometer :size="14" stroke-width="1.75" /></div>
            <h3 class="sync-title">Station Netatmo</h3>
          </div>
          <p class="sync-desc">Connecte ta station intérieure pour suivre température et humidité.</p>

          <div v-if="netatmoData" class="sync-timestamp">
            <div class="sync-timestamp-dot" />
            <span>Intérieur {{ Math.round(netatmoData.indoor_temp) }}°C · humidex {{ Math.round(netatmoData.indoor_humidex) }}</span>
          </div>
          <div v-if="netatmoError" class="sync-error">
            <div class="sync-error-dot" />
            {{ netatmoError }}
          </div>
        </div>

        <button @click="syncNetatmo()" :disabled="netatmoSyncing" class="sync-btn" :class="{ 'sync-btn--loading': netatmoSyncing }">
          <RefreshCw :size="14" stroke-width="2" :class="netatmoSyncing ? 'sync-icon-spin' : 'sync-icon-idle'" />
          {{ netatmoSyncing ? 'Sync…' : (netatmoData ? 'Actualiser' : 'Connecter Netatmo') }}
        </button>
      </div>
    </div>

    <!-- ── Notifications card ── -->
    <div class="settings-card">
      <div class="settings-card-head">
        <div class="sync-title-row">
          <div class="sync-zap-icon"><Bell :size="14" stroke-width="1.75" /></div>
          <h3 class="sync-title">Notifications fenêtres</h3>
        </div>
        <label class="toggle">
          <input type="checkbox" v-model="notificationsEnabled" @change="onToggleNotifications" />
          <span class="toggle-track"><span class="toggle-thumb" /></span>
        </label>
      </div>

      <p class="sync-desc">
        Reçois une notif pour ouvrir les fenêtres dès que l'humidex extérieur passe sous l'humidex intérieur (Netatmo vs Open-Meteo), et pour les refermer quand ça s'inverse.
      </p>

      <div v-if="pushError" class="sync-error">
        <div class="sync-error-dot" />
        {{ pushError }}
      </div>
    </div>

    <!-- ── Manual check card ── -->
    <div class="settings-card">
      <div class="sync-title-row">
        <div class="sync-zap-icon"><Gauge :size="14" stroke-width="1.75" /></div>
        <h3 class="sync-title">Tester maintenant</h3>
      </div>

      <p class="sync-desc">
        Compare l'humidex intérieur et extérieur tout de suite, sans attendre la prochaine vérification automatique.
      </p>

      <button @click="checkNow" :disabled="checking" class="sync-btn" :class="{ 'sync-btn--loading': checking }" style="align-self: flex-start;">
        <RefreshCw :size="14" stroke-width="2" :class="checking ? 'sync-icon-spin' : 'sync-icon-idle'" />
        {{ checking ? 'Vérification…' : 'Vérifier maintenant' }}
      </button>

      <div v-if="checkError" class="sync-error">
        <div class="sync-error-dot" />
        {{ checkError }}
      </div>

      <div v-if="checkResult" class="result-card" :class="`result-card--${checkResult.recommendation}`">
        <div class="result-title">
          <component :is="resultIcon" :size="18" stroke-width="1.75" />
          <span>{{ resultLabel }}</span>
        </div>
        <div class="result-metrics">
          <div class="result-metric">
            <span class="result-metric-label">Intérieur</span>
            <span class="result-metric-value">{{ Math.round(checkResult.indoorTemp) }}°C · humidex {{ Math.round(checkResult.indoorHumidex) }}</span>
          </div>
          <div class="result-metric">
            <span class="result-metric-label">Extérieur</span>
            <span class="result-metric-value">{{ Math.round(checkResult.outdoorTemp) }}°C · humidex {{ Math.round(checkResult.outdoorHumidex) }}</span>
          </div>
          <div v-if="checkResult.precipitation > 0" class="result-metric">
            <span class="result-metric-label">Pluie</span>
            <span class="result-metric-value">{{ checkResult.precipitation }} mm</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'
import { Wind, Thermometer, Bell, RefreshCw, Gauge, DoorOpen, DoorClosed, Check } from 'lucide-vue-next'

const { user } = useAuth()

const netatmoSyncing = ref(false)
const netatmoData = ref(null)
const netatmoError = ref('')

const notificationsEnabled = ref(false)
const pushError = ref('')

const homeLat = ref(null)
const homeLon = ref(null)

const checking = ref(false)
const checkError = ref('')
const checkResult = ref(null)

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id || user.value?.id
  if (!userId) return

  await loadSettings(userId)

  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')
  if (code) {
    window.history.replaceState({}, document.title, window.location.pathname)
    await syncNetatmo(code)
  }
})

const loadSettings = async (userId) => {
  const { data } = await supabase
    .from('user_settings')
    .select('windows_notifications_enabled, home_lat, home_lon')
    .eq('user_id', userId)
    .single()

  if (data) {
    notificationsEnabled.value = !!data.windows_notifications_enabled
    homeLat.value = data.home_lat
    homeLon.value = data.home_lon
  }
}

const startNetatmoOAuth = () => {
  const clientId = import.meta.env.VITE_NETATMO_CLIENT_ID
  if (!clientId) { netatmoError.value = 'Client ID Netatmo manquant.'; return }
  const redirectUri = encodeURIComponent(window.location.origin + '/fenetres')
  const state = Math.random().toString(36).substring(7)
  window.location.href = `https://api.netatmo.com/oauth2/authorize?response_type=code&client_id=${clientId}&state=${state}&scope=read_homecoach&redirect_uri=${redirectUri}`
}

const syncNetatmo = async (code = null) => {
  netatmoSyncing.value = true
  netatmoError.value = ''
  try {
    const payload = {}
    if (code) { payload.code = code; payload.redirect_uri = window.location.origin + '/fenetres' }
    const { data, error } = await supabase.functions.invoke('netatmo-sync', { body: payload })
    if (error) throw error
    if (data.needs_auth) { startNetatmoOAuth(); return }
    if (data.error) throw new Error(data.error)
    netatmoData.value = data
    const userId = user.value?.id
    if (userId) {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('home_lat, home_lon')
        .eq('user_id', userId)
        .single()
      if (settings) { homeLat.value = settings.home_lat; homeLon.value = settings.home_lon }
    }
  } catch (e) {
    console.error('Netatmo Sync Error:', e)
    netatmoError.value = 'Erreur : ' + (e.message || String(e))
  } finally {
    netatmoSyncing.value = false
  }
}

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

const subscribeToPush = async () => {
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) throw new Error('Clé VAPID manquante.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Permission de notification refusée.')

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    })
  }

  const { error } = await supabase.functions.invoke('save-push-subscription', {
    body: { subscription: subscription.toJSON() }
  })
  if (error) throw error
}

const onToggleNotifications = async () => {
  pushError.value = ''
  try {
    if (notificationsEnabled.value) {
      await subscribeToPush()
    }
    const userId = user.value?.id
    if (!userId) return
    await supabase.from('user_settings').upsert({
      user_id: userId,
      windows_notifications_enabled: notificationsEnabled.value
    })
  } catch (e) {
    console.error('Push subscription error:', e)
    pushError.value = 'Erreur : ' + (e.message || String(e))
    notificationsEnabled.value = false
  }
}

const computeHumidex = (tempC, relativeHumidity) => {
  const e = (relativeHumidity / 100) * 6.112 * Math.pow(10, (7.5 * tempC) / (237.7 + tempC))
  return tempC + (5 / 9) * (e - 10)
}

const checkNow = async () => {
  checking.value = true
  checkError.value = ''
  checkResult.value = null
  try {
    await syncNetatmo()
    if (!netatmoData.value) return
    if (homeLat.value == null || homeLon.value == null) {
      throw new Error("Localisation inconnue, reconnecte Netatmo pour la récupérer.")
    }

    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${homeLat.value}&longitude=${homeLon.value}&current=temperature_2m,relative_humidity_2m,precipitation`
    )
    const weather = await weatherResponse.json()
    const outdoorTemp = weather.current?.temperature_2m
    const outdoorHumidity = weather.current?.relative_humidity_2m
    const precipitation = weather.current?.precipitation ?? 0
    if (outdoorTemp == null || outdoorHumidity == null) throw new Error('Météo extérieure indisponible.')

    const indoorHumidex = computeHumidex(netatmoData.value.indoor_temp, netatmoData.value.indoor_humidity)
    const outdoorHumidex = computeHumidex(outdoorTemp, outdoorHumidity)

    let recommendation = 'none'
    if (outdoorHumidex < indoorHumidex && precipitation === 0) {
      recommendation = 'open'
    } else if (precipitation > 0 || outdoorHumidex >= indoorHumidex) {
      recommendation = 'close'
    }

    checkResult.value = {
      recommendation,
      indoorTemp: netatmoData.value.indoor_temp,
      indoorHumidex,
      outdoorTemp,
      outdoorHumidex,
      precipitation
    }
  } catch (e) {
    console.error('Manual check error:', e)
    checkError.value = 'Erreur : ' + (e.message || String(e))
  } finally {
    checking.value = false
  }
}

const resultLabel = computed(() => {
  if (!checkResult.value) return ''
  if (checkResult.value.recommendation === 'open') return 'Ouvre les fenêtres'
  if (checkResult.value.recommendation === 'close') return 'Ferme les fenêtres'
  return "Rien à faire pour l'instant"
})

const resultIcon = computed(() => {
  if (!checkResult.value) return Check
  if (checkResult.value.recommendation === 'open') return DoorOpen
  if (checkResult.value.recommendation === 'close') return DoorClosed
  return Check
})
</script>

<style scoped>
.settings-view {
  max-width: 560px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.module-header { padding-bottom: 4px; }

.module-header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.module-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  flex-shrink: 0;
}

.module-name {
  font-family: var(--font-serif);
  font-size: var(--text-xl);
  font-weight: 400;
  color: var(--text-primary);
  margin: 0;
}

.module-sub {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  margin-top: 2px;
}

.sync-card {
  position: relative;
  overflow: hidden;
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: 28px 24px;
}

.sync-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: flex-start;
}

@media (min-width: 480px) {
  .sync-content {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.sync-left { flex: 1; }

.sync-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.sync-zap-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  flex-shrink: 0;
}

.sync-title {
  font-family: var(--font-serif);
  font-size: var(--text-md);
  font-weight: 400;
  color: var(--text-primary);
}

.sync-desc {
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: 1.5;
  max-width: 360px;
}

.sync-timestamp {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 10px;
  color: var(--text-muted);
}

.sync-timestamp-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--status-success);
  opacity: 0.7;
}

.sync-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 14px;
  background: var(--status-error-dim);
  border: 1px solid rgba(176, 90, 90, 0.2);
  border-radius: var(--radius-md);
  font-size: 11px;
  color: var(--status-error);
}

.sync-error-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--status-error);
  flex-shrink: 0;
}

.sync-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--bg-overlay);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.sync-btn:disabled { opacity: 0.5; cursor: not-allowed; }

@keyframes spin { to { transform: rotate(360deg); } }
.sync-icon-spin { animation: spin 0.9s linear infinite; }

.settings-card {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toggle { display: inline-flex; cursor: pointer; }
.toggle input { display: none; }

.toggle-track {
  width: 40px;
  height: 22px;
  background: var(--bg-overlay);
  border: 1px solid var(--border-default);
  border-radius: 999px;
  position: relative;
  transition: background var(--dur-fast) var(--ease-out);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
}

.toggle input:checked + .toggle-track { background: var(--status-success-dim); }
.toggle input:checked + .toggle-track .toggle-thumb {
  transform: translateX(18px);
  background: var(--status-success);
}

.result-card {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--bg-overlay);
}

.result-card--open { border-color: rgba(90, 176, 120, 0.35); }
.result-card--close { border-color: rgba(176, 90, 90, 0.35); }

.result-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-serif);
  font-size: var(--text-md);
  color: var(--text-primary);
}

.result-card--open .result-title { color: var(--status-success); }
.result-card--close .result-title { color: var(--status-error); }

.result-metrics {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-metric {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--text-sm);
}

.result-metric-label { color: var(--text-muted); }
.result-metric-value { color: var(--text-primary); font-variant-numeric: tabular-nums; }
</style>
