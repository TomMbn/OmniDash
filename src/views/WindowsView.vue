<template>
  <div class="windows-view">

    <!-- ── En-tête ── -->
    <header class="view-head">
      <h1 class="view-title">
        Fenêtres,{{ ' ' }}<br class="view-break" />
        <span class="view-title-soft">{{ netatmoData ? `${Math.round(netatmoData.indoor_temp)} °C chez toi` : 'Netatmo et prévisions' }}</span>
      </h1>
      <button class="btn btn--dark" :disabled="netatmoSyncing" @click="syncNetatmo()">
        <RefreshCw :size="16" stroke-width="2" :class="{ spin: netatmoSyncing }" />
        {{ netatmoSyncing ? 'Synchronisation…' : (netatmoData ? 'Actualiser' : 'Connecter Netatmo') }}
      </button>
    </header>

    <p v-if="netatmoError" class="error" role="alert">{{ netatmoError }}</p>

    <div class="grid">

      <!-- ── Créneau ── -->
      <section class="banner" aria-label="Créneau recommandé">
        <span class="orb orb--a" aria-hidden="true" />
        <span class="orb orb--b" aria-hidden="true" />
        <span v-if="forecastPlan?.openAt" class="chip">Créneau favorable</span>
        <h2 class="banner-title">
          {{ heroTitle }}<br />
          <span class="banner-title-soft">{{ heroSubtitle }}</span>
        </h2>
      </section>

      <!-- ── Températures ── -->
      <section class="card temp temp--in">
        <p class="card-label">Dedans</p>
        <p class="temp-value">{{ netatmoData ? `${Math.round(netatmoData.indoor_temp)} °C` : '–' }}</p>
        <p class="card-sub">{{ netatmoData ? `humidex ${Math.round(netatmoData.indoor_humidex)}` : 'Station non connectée' }}</p>
      </section>

      <section class="card temp temp--out">
        <p class="card-label">Dehors</p>
        <p class="temp-value">{{ outdoorNow != null ? `${Math.round(outdoorNow)} °C` : '–' }}</p>
        <p class="card-sub">{{ outdoorNow != null ? 'Prévision Open-Meteo' : 'Pas encore de prévision' }}</p>
      </section>

      <!-- ── Prévisions ── -->
      <section class="card forecast" aria-labelledby="forecast-title">
        <div class="forecast-head">
          <h2 id="forecast-title" class="card-title">Prévisions</h2>
          <button class="btn btn--soft" :disabled="forecastLoading" @click="refreshForecast">
            <RefreshCw :size="16" stroke-width="2" :class="{ spin: forecastLoading }" />
            {{ forecastLoading ? 'Calcul…' : 'Actualiser' }}
          </button>
        </div>

        <p v-if="forecastError" class="error" role="alert">{{ forecastError }}</p>

        <WindowForecastChart
          v-if="forecastPlan"
          :hours="forecastPlan.hours"
          :open-at="forecastPlan.openAt"
          :close-at="forecastPlan.closeAt"
        />
        <p v-else class="card-sub">
          Le créneau optimal se calcule avec Open-Meteo sur 48 h et l'inertie de ton logement.
        </p>
      </section>

      <!-- ── Réglages ── -->
      <div class="side">
        <section class="card">
          <div class="setting">
            <h2 id="notif-title" class="setting-title">Notifications fenêtres</h2>
            <label class="switch">
              <input v-model="notificationsEnabled" type="checkbox" aria-labelledby="notif-title" @change="onToggleNotifications" />
              <span class="switch-track"><span class="switch-thumb" /></span>
            </label>
          </div>
          <p class="card-sub">
            Une notification pour ouvrir quand il fait plus frais et plus confortable dehors, et pour refermer quand ça s'inverse.
          </p>
          <p v-if="pushError" class="error" role="alert">{{ pushError }}</p>
        </section>

        <section class="card">
          <h2 class="setting-title">Type de murs</h2>
          <div class="segmented" role="group" aria-label="Type de murs">
            <button
              v-for="option in wallTypeOptions"
              :key="option.value"
              class="segmented-btn"
              :class="{ 'segmented-btn--active': wallType === option.value }"
              :aria-pressed="wallType === option.value"
              @click="setWallType(option.value)"
            >{{ option.label }}</button>
          </div>
          <p class="card-sub">Ils déterminent la vitesse à laquelle ton logement change de température.</p>
        </section>

        <section class="card check">
          <h2 class="setting-title">Vérifier maintenant</h2>
          <p class="card-sub">Compare l'humidex dedans et dehors sans attendre la prochaine vérification.</p>
          <button class="btn btn--dark btn--wide" :disabled="checking" @click="checkNow">
            <RefreshCw v-if="checking" :size="16" stroke-width="2" class="spin" />
            {{ checking ? 'Vérification…' : 'Lancer la vérification' }}
          </button>

          <p v-if="checkError" class="error" role="alert">{{ checkError }}</p>

          <div v-if="checkResult" class="result" :class="`result--${checkResult.recommendation}`">
            <p class="result-title">
              <component :is="resultIcon" :size="18" stroke-width="1.75" />
              {{ resultLabel }}
            </p>
            <p class="result-line">
              <span>Dedans</span>
              <span>{{ Math.round(checkResult.indoorTemp) }} °C, humidex {{ Math.round(checkResult.indoorHumidex) }}, {{ comfortLevel(checkResult.indoorHumidex).label.toLowerCase() }}</span>
            </p>
            <p class="result-line">
              <span>Dehors</span>
              <span>{{ Math.round(checkResult.outdoorTemp) }} °C, humidex {{ Math.round(checkResult.outdoorHumidex) }}, {{ comfortLevel(checkResult.outdoorHumidex).label.toLowerCase() }}</span>
            </p>
            <p v-if="checkResult.precipitation > 0" class="result-line">
              <span>Pluie</span>
              <span>{{ checkResult.precipitation.toLocaleString('fr-FR') }} mm</span>
            </p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'
import { RefreshCw, DoorOpen, DoorClosed, Check } from 'lucide-vue-next'
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
    if (i > 0) t = stepTemperature(t, hourly.temperature_2m[i - 1], tauClosed)
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
    if (i > 0) {
      const tau = windowOpen ? TAU_OPEN_HOURS : tauClosed
      t = stepTemperature(t, hourly.temperature_2m[i - 1], tau)
    }
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

const dayPrefix = (iso) => {
  const date = new Date(iso)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (date.toDateString() === tomorrow.toDateString()) return 'demain '
  return ''
}

const heroTitle = computed(() => {
  if (!netatmoData.value) return 'Connecte ta station,'
  if (!forecastPlan.value) return 'Calcul du créneau,'
  if (!forecastPlan.value.openAt) return 'Aucun créneau favorable,'
  return `Ouvre ${dayPrefix(forecastPlan.value.openAt)}à ${formatHour(forecastPlan.value.openAt)},`
})

const heroSubtitle = computed(() => {
  if (!netatmoData.value) return 'pour suivre ton intérieur'
  if (!forecastPlan.value) return 'avec les prévisions Open-Meteo'
  if (!forecastPlan.value.openAt) return 'dans les prochaines 48 h'
  return forecastPlan.value.closeAt
    ? `jusqu'à ${formatHour(forecastPlan.value.closeAt)}`
    : 'sans fin prévue'
})

const outdoorNow = computed(() => forecastPlan.value?.hours?.[0]?.outdoorTemp ?? null)

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
/* ── En-tête ── */
.view-head {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: flex-start;
}

.view-title {
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.22;
}

.view-title-soft { color: var(--text-secondary); }

/* ── Boutons ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: 0 18px;
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
.btn--soft  { background: var(--bg-overlay); color: var(--text-primary); }
.btn--light { background: var(--bg-raised); color: var(--text-primary); }
.btn--wide  { width: 100%; }

.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.error {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--status-error-dim);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--status-error);
}

/* ── Bandeau ── */
.banner {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: var(--space-2);
  min-height: 160px;
  padding: 18px;
  overflow: hidden;
  border-radius: var(--radius-lg);
}

.banner > :not(.orb) {
  position: relative;
  z-index: var(--z-raised);
}

.banner-title {
  max-width: 72%;
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.22;
}

.banner-title-soft { color: var(--text-secondary); }

.chip {
  display: inline-flex;
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--status-success);
}

.orb {
  position: absolute;
  border-radius: 50%;
  opacity: var(--orb-opacity);
  pointer-events: none;
}

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

.card-label,
.card-sub {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

/* ── Sélecteur ── */
.segmented {
  display: flex;
  gap: 2px;
  padding: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--bg-overlay);
}

.segmented-btn {
  flex: 1;
  min-height: 44px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-pill);
  background: none;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
  cursor: pointer;
}

.segmented-btn--active {
  background: var(--action);
  color: var(--on-action);
}

.windows-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 1480px;
  margin: 0 auto;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-areas:
    "banner banner"
    "in     out"
    "chart  chart"
    "side   side";
  gap: var(--space-3);
}

.banner {
  grid-area: banner;
  background: var(--aurore-windows);
}

.orb--a { top: -40px; right: -30px; width: 130px; height: 130px; background: var(--orb-peche); }
.orb--b { top: 50px; right: -30px; width: 70px; height: 70px; background: var(--orb-ciel); }

.temp--in { grid-area: in; }
.temp--out { grid-area: out; }
.temp { gap: 0; }

.temp-value {
  font-size: var(--text-2xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}

.forecast { grid-area: chart; gap: var(--space-3); }

.forecast-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.side {
  grid-area: side;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

.setting {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.setting-title {
  font-size: var(--text-sm);
  font-weight: 500;
}

.switch {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  cursor: pointer;
}

.switch input {
  position: absolute;
  inset: -6px 0;
  width: 100%;
  height: calc(100% + 12px);
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.switch-track {
  display: flex;
  align-items: center;
  width: 52px;
  height: 32px;
  padding: 0 4px;
  border-radius: var(--radius-pill);
  background: var(--bg-muted);
  transition: background var(--dur-fast) var(--ease-out);
}

.switch-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--on-rail);
  box-shadow: var(--shadow-sm);
  transition: transform var(--dur-fast) var(--ease-out);
}

.switch input:checked + .switch-track { background: var(--accent); }
.switch input:checked + .switch-track .switch-thumb { transform: translateX(20px); }
.switch input:focus-visible + .switch-track { outline: 2px solid var(--accent); outline-offset: 2px; }

.result {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--bg-overlay);
}

.result--open  { background: var(--status-success-dim); }
.result--close { background: var(--status-warning-dim); }

.result-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 600;
}

.result--open .result-title  { color: var(--status-success); }
.result--close .result-title { color: var(--status-warning); }

.result-line {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: var(--space-2);
  font-size: var(--text-2xs);
  font-weight: 500;
}

.result-line > :first-child { color: var(--text-secondary); }

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

  .banner { padding: var(--space-6) 28px; }
  .card { padding: 20px; }
}

@media (min-width: 1100px) {
  .windows-view { gap: var(--space-4); }

  .grid {
    grid-template-columns: minmax(0, 1fr) 240px 240px;
    grid-template-rows: 232px minmax(360px, 1fr);
    grid-template-areas:
      "banner in   out"
      "chart  side side";
    gap: var(--space-4);
  }

  .orb--a { top: -50px; right: 80px; width: 220px; height: 220px; }
  .orb--b { top: 70px; right: 10px; width: 120px; height: 120px; }
  .temp { justify-content: center; padding: var(--space-6); }
  .temp-value { font-size: var(--text-3xl); }
  .card-title { font-size: var(--text-xl); }
  .forecast { padding: var(--space-6); }
  .side { gap: var(--space-4); }
}
</style>
