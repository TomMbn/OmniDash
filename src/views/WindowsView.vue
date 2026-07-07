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
        Reçois une notif pour ouvrir les fenêtres dès qu'il fait à la fois plus frais et plus confortable dehors (température ET humidex plus bas, Netatmo vs Open-Meteo), et pour les refermer quand ça s'inverse.
      </p>

      <div v-if="pushError" class="sync-error">
        <div class="sync-error-dot" />
        {{ pushError }}
      </div>
    </div>

    <!-- ── Wall type card ── -->
    <div class="settings-card">
      <div class="sync-title-row">
        <div class="sync-zap-icon"><Building2 :size="14" stroke-width="1.75" /></div>
        <h3 class="sync-title">Type de murs</h3>
      </div>
      <p class="sync-desc">
        Détermine la vitesse à laquelle ton logement se réchauffe/refroidit — utilisé pour prédire le meilleur créneau.
      </p>
      <div class="segmented">
        <button
          v-for="option in wallTypeOptions"
          :key="option.value"
          class="segmented-btn"
          :class="{ 'segmented-btn--active': wallType === option.value }"
          @click="setWallType(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <!-- ── Forecast card ── -->
    <div class="settings-card">
      <div class="sync-title-row">
        <div class="sync-zap-icon"><TrendingUp :size="14" stroke-width="1.75" /></div>
        <h3 class="sync-title">Prévisions</h3>
      </div>
      <p class="sync-desc">
        Créneau optimal calculé à partir des prévisions Open-Meteo sur 48h et de l'inertie thermique de ton logement.
      </p>

      <button @click="refreshForecast" :disabled="forecastLoading" class="sync-btn" :class="{ 'sync-btn--loading': forecastLoading }" style="align-self: flex-start;">
        <RefreshCw :size="14" stroke-width="2" :class="forecastLoading ? 'sync-icon-spin' : 'sync-icon-idle'" />
        {{ forecastLoading ? 'Calcul…' : 'Actualiser les prévisions' }}
      </button>

      <div v-if="forecastError" class="sync-error">
        <div class="sync-error-dot" />
        {{ forecastError }}
      </div>

      <template v-if="forecastPlan">
        <p class="forecast-window-label">
          <span v-if="forecastPlan.openAt">
            Ouvrez de {{ formatHour(forecastPlan.openAt) }}
            <span v-if="forecastPlan.closeAt">à {{ formatHour(forecastPlan.closeAt) }}</span>
            <span v-else>(durée indéterminée)</span>
          </span>
          <span v-else>Aucun créneau favorable dans les prochaines 48h.</span>
        </p>
        <WindowForecastChart
          :hours="forecastPlan.hours"
          :open-at="forecastPlan.openAt"
          :close-at="forecastPlan.closeAt"
        />
      </template>
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
            <span class="result-metric-value">
              {{ Math.round(checkResult.indoorTemp) }}°C · humidex {{ Math.round(checkResult.indoorHumidex) }}
              <span class="comfort-badge" :style="{ color: comfortLevel(checkResult.indoorHumidex).color }">{{ comfortLevel(checkResult.indoorHumidex).label }}</span>
            </span>
          </div>
          <div class="result-metric">
            <span class="result-metric-label">Extérieur</span>
            <span class="result-metric-value">
              {{ Math.round(checkResult.outdoorTemp) }}°C · humidex {{ Math.round(checkResult.outdoorHumidex) }}
              <span class="comfort-badge" :style="{ color: comfortLevel(checkResult.outdoorHumidex).color }">{{ comfortLevel(checkResult.outdoorHumidex).label }}</span>
            </span>
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
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'
import { Wind, Thermometer, Bell, RefreshCw, Gauge, DoorOpen, DoorClosed, Check, Building2, TrendingUp } from 'lucide-vue-next'
import WindowForecastChart from '@/components/WindowForecastChart.vue'

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

const wallTypeOptions = [
  { value: 'light', label: 'Légers' },
  { value: 'medium', label: 'Moyens' },
  { value: 'heavy', label: 'Lourds' }
]
const wallType = ref('medium')

const forecastLoading = ref(false)
const forecastError = ref('')
const forecastPlan = ref(null)

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
  } else {
    // Silent: si Netatmo est déjà connecté, ça charge automatiquement les données
    // et déclenche le graphe de prévisions ; sinon ça ne redirige pas tout seul vers l'OAuth.
    await syncNetatmo(null, { silent: true })
  }
})

const loadSettings = async (userId) => {
  const { data } = await supabase
    .from('user_settings')
    .select('windows_notifications_enabled, home_lat, home_lon, wall_type')
    .eq('user_id', userId)
    .single()

  if (data) {
    notificationsEnabled.value = !!data.windows_notifications_enabled
    homeLat.value = data.home_lat
    homeLon.value = data.home_lon
    if (data.wall_type) wallType.value = data.wall_type
  }
}

const setWallType = async (value) => {
  wallType.value = value
  const userId = user.value?.id
  if (userId) {
    await supabase.from('user_settings').upsert({ user_id: userId, wall_type: value })
  }
  refreshForecast()
}

const startNetatmoOAuth = () => {
  const clientId = import.meta.env.VITE_NETATMO_CLIENT_ID
  if (!clientId) { netatmoError.value = 'Client ID Netatmo manquant.'; return }
  const redirectUri = encodeURIComponent(window.location.origin + '/fenetres')
  const state = Math.random().toString(36).substring(7)
  window.location.href = `https://api.netatmo.com/oauth2/authorize?response_type=code&client_id=${clientId}&state=${state}&scope=read_homecoach&redirect_uri=${redirectUri}`
}

const syncNetatmo = async (code = null, { silent = false } = {}) => {
  netatmoSyncing.value = true
  netatmoError.value = ''
  try {
    const payload = {}
    if (code) { payload.code = code; payload.redirect_uri = window.location.origin + '/fenetres' }
    const { data, error } = await supabase.functions.invoke('netatmo-sync', { body: payload })
    if (error) throw error
    if (data.needs_auth) {
      if (!silent) startNetatmoOAuth()
      return
    }
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
  const cleaned = base64String.trim().replace(/^["']|["']$/g, '')
  const padding = '='.repeat((4 - (cleaned.length % 4)) % 4)
  const base64 = (cleaned + padding).replace(/-/g, '+').replace(/_/g, '/')
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

const comfortLevel = (humidex) => {
  if (humidex < 20) return { label: 'Confortable', color: 'var(--status-success)' }
  if (humidex < 30) return { label: 'Léger inconfort', color: 'var(--status-warning)' }
  if (humidex < 40) return { label: 'Inconfort marqué', color: 'var(--status-error)' }
  return { label: 'Dangereux', color: 'var(--status-error)' }
}

const TAU_CLOSED_HOURS = { light: 6, medium: 16, heavy: 30 }
const TAU_OPEN_HOURS = 1.5
const RAIN_PROBABILITY_LIMIT = 30

const stepTemperature = (indoorTemp, outdoorTemp, tauHours) =>
  outdoorTemp + (indoorTemp - outdoorTemp) * Math.exp(-1 / tauHours)

const isFavorable = (outdoorTemp, outdoorHumidex, indoorTemp, indoorHumidex, precipitationProbability) =>
  outdoorTemp < indoorTemp && outdoorHumidex < indoorHumidex && precipitationProbability < RAIN_PROBABILITY_LIMIT

// Open-Meteo renvoie les prévisions horaires depuis minuit (heure locale) du jour courant,
// pas depuis l'heure actuelle — il faut donc écarter les heures déjà passées avant de simuler.
const trimToFutureHours = (hourly) => {
  const currentHourStart = new Date()
  currentHourStart.setMinutes(0, 0, 0)
  const startIdx = hourly.time.findIndex((t) => new Date(t).getTime() >= currentHourStart.getTime())
  const from = startIdx === -1 ? hourly.time.length : startIdx
  return {
    time: hourly.time.slice(from),
    temperature_2m: hourly.temperature_2m.slice(from),
    relative_humidity_2m: hourly.relative_humidity_2m.slice(from),
    precipitation_probability: hourly.precipitation_probability.slice(from)
  }
}

const simulateWindowPlan = (hourlyRaw, currentIndoorTemp, currentIndoorHumidity, wall) => {
  const hourly = trimToFutureHours(hourlyRaw)
  const n = hourly.time.length
  const tauClosed = TAU_CLOSED_HOURS[wall] ?? TAU_CLOSED_HOURS.medium

  const baseline = []
  let t = currentIndoorTemp
  for (let i = 0; i < n; i++) {
    t = stepTemperature(t, hourly.temperature_2m[i], tauClosed)
    baseline.push(t)
  }

  let openIdx = -1
  for (let i = 0; i < n; i++) {
    const outdoorHumidex = computeHumidex(hourly.temperature_2m[i], hourly.relative_humidity_2m[i])
    const indoorHumidexBaseline = computeHumidex(baseline[i], currentIndoorHumidity)
    if (isFavorable(hourly.temperature_2m[i], outdoorHumidex, baseline[i], indoorHumidexBaseline, hourly.precipitation_probability[i] ?? 0)) {
      openIdx = i
      break
    }
  }

  if (openIdx === -1) {
    return {
      hours: hourly.time.map((time, i) => ({ time, indoorTemp: baseline[i], outdoorTemp: hourly.temperature_2m[i] })),
      openAt: null,
      closeAt: null
    }
  }

  const real = []
  let closeIdx = -1
  let windowOpen = false
  t = currentIndoorTemp
  for (let i = 0; i < n; i++) {
    if (i === openIdx) windowOpen = true
    const tau = windowOpen ? TAU_OPEN_HOURS : tauClosed
    t = stepTemperature(t, hourly.temperature_2m[i], tau)
    real.push(t)

    if (windowOpen && closeIdx === -1) {
      const outdoorHumidex = computeHumidex(hourly.temperature_2m[i], hourly.relative_humidity_2m[i])
      const indoorHumidexReal = computeHumidex(t, currentIndoorHumidity)
      const stillFavorable = isFavorable(hourly.temperature_2m[i], outdoorHumidex, t, indoorHumidexReal, hourly.precipitation_probability[i] ?? 0)
      if (!stillFavorable) {
        closeIdx = i
        windowOpen = false
      }
    }
  }

  return {
    hours: hourly.time.map((time, i) => ({ time, indoorTemp: real[i], outdoorTemp: hourly.temperature_2m[i] })),
    openAt: hourly.time[openIdx],
    closeAt: closeIdx !== -1 ? hourly.time[closeIdx] : null
  }
}

const formatHour = (iso) =>
  new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

const refreshForecast = async () => {
  forecastLoading.value = true
  forecastError.value = ''
  try {
    if (!netatmoData.value) await syncNetatmo()
    if (!netatmoData.value) return
    if (homeLat.value == null || homeLon.value == null) {
      throw new Error("Localisation inconnue, reconnecte Netatmo pour la récupérer.")
    }

    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${homeLat.value}&longitude=${homeLon.value}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability&forecast_days=2&timezone=Europe%2FParis`
    )
    const weather = await weatherResponse.json()
    if (!weather.hourly?.time?.length) throw new Error('Prévisions horaires indisponibles.')

    forecastPlan.value = simulateWindowPlan(
      weather.hourly,
      netatmoData.value.indoor_temp,
      netatmoData.value.indoor_humidity,
      wallType.value
    )
  } catch (e) {
    console.error('Forecast error:', e)
    forecastError.value = 'Erreur : ' + (e.message || String(e))
  } finally {
    forecastLoading.value = false
  }
}

watch(netatmoData, (val) => {
  if (val && !forecastPlan.value) refreshForecast()
})

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
    if (outdoorTemp < netatmoData.value.indoor_temp && outdoorHumidex < indoorHumidex && precipitation === 0) {
      recommendation = 'open'
    } else if (precipitation > 0 || outdoorTemp >= netatmoData.value.indoor_temp || outdoorHumidex >= indoorHumidex) {
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
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  font-size: var(--text-sm);
}

.result-metric-label { color: var(--text-muted); flex-shrink: 0; }
.result-metric-value {
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.comfort-badge {
  display: inline-block;
  margin-left: 6px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.segmented {
  display: flex;
  gap: 6px;
  background: var(--bg-overlay);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 4px;
}

.segmented-btn {
  flex: 1;
  padding: 8px 10px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-muted);
  cursor: pointer;
}

.segmented-btn--active {
  background: var(--bg-raised);
  color: var(--text-primary);
}

.forecast-window-label {
  font-family: var(--font-serif);
  font-size: var(--text-md);
  color: var(--text-primary);
}
</style>
