<template>
  <div class="sleep-view">

    <!-- ── En-tête ── -->
    <header class="view-head">
      <h1 class="view-title">
        Sommeil,{{ ' ' }}<br class="view-break" />
        <span class="view-title-soft">{{ selectedNight ? formatDate(selectedNight.date) : 'tes nuits' }}</span>
      </h1>
      <div class="sync">
        <p v-if="lastAutoSyncLabel && !errorMsg" class="sync-label">Withings, {{ lastAutoSyncLabel }}</p>
        <button class="btn btn--dark" :disabled="syncing" @click="syncSleep()">
          <RefreshCw :size="16" stroke-width="2" :class="{ spin: syncing }" />
          {{ syncing ? 'Synchronisation…' : 'Synchroniser' }}
        </button>
      </div>
    </header>

    <p v-if="errorMsg" class="error" role="alert">{{ errorMsg }}</p>

    <!-- ── Chargement ── -->
    <div v-if="loadingRecords" class="grid">
      <div class="skeleton skeleton--banner" />
      <div class="skeleton skeleton--metric" />
      <div class="skeleton skeleton--metric" />
      <div class="skeleton skeleton--metric" />
    </div>

    <!-- ── Nuits ── -->
    <div v-else-if="selectedNight" class="grid">

      <section class="banner" aria-label="Score de la nuit">
        <span class="orb orb--a" aria-hidden="true" />
        <span class="orb orb--b" aria-hidden="true" />
        <div class="banner-score">
          <p class="banner-label">Score de la nuit</p>
          <p class="score">{{ selectedNight.score ?? 'Non noté' }}</p>
        </div>
        <p class="banner-reading">{{ reading }}</p>
      </section>

      <section v-for="metric in metrics" :key="metric.label" class="card metric">
        <div>
          <p class="card-label">{{ metric.label }}</p>
          <p class="metric-value">{{ metric.value }}</p>
          <p class="card-sub">{{ metric.detail }}</p>
        </div>
        <svg class="metric-ring" viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="15.9" class="ring-track" pathLength="100" />
          <circle
            cx="18"
            cy="18"
            r="15.9"
            class="ring-value"
            pathLength="100"
            :stroke="metric.color"
            :stroke-dasharray="`${metric.percent} 100`"
          />
        </svg>
      </section>

      <section class="card trend" aria-labelledby="trend-title">
        <div class="trend-head">
          <h2 id="trend-title" class="card-title">
            Score,{{ ' ' }}<span class="view-title-soft">{{ chartNights.length }} nuits</span>
          </h2>
          <div class="segmented" role="group" aria-label="Période">
            <button
              v-for="period in PERIODS"
              :key="period"
              class="segmented-btn"
              :class="{ 'segmented-btn--active': period === activePeriod }"
              :aria-pressed="period === activePeriod"
              @click="activePeriod = period"
            >{{ period }} j</button>
          </div>
        </div>

        <svg
          v-if="trendPath"
          class="trend-chart"
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          role="img"
          :aria-label="`Score de sommeil sur ${chartNights.length} nuits`"
        >
          <defs>
            <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="var(--module-sleep)" stop-opacity="0.24" />
              <stop offset="1" stop-color="var(--module-sleep)" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path :d="`${trendPath} L 100 40 L 0 40 Z`" fill="url(#trendArea)" />
          <path :d="trendPath" class="trend-line" />
        </svg>
        <p v-else class="card-sub">Il faut au moins deux nuits pour tracer la tendance.</p>

        <div v-if="trendPath" class="trend-axis">
          <span v-for="label in axisLabels" :key="label">{{ label }}</span>
        </div>
      </section>

      <section class="card nights" aria-labelledby="nights-title">
        <h2 id="nights-title" class="card-title">Sept nuits</h2>
        <ul class="night-list">
          <li v-for="record in lastNights" :key="record.id">
            <button
              class="night"
              :class="{ 'night--active': record.id === selectedNight.id }"
              :aria-pressed="record.id === selectedNight.id"
              @click="selectedId = record.id"
            >
              <span class="night-date">{{ formatShortDate(record.date) }}</span>
              <span class="night-duration">{{ formatDuration(record.duration_seconds) }}</span>
              <span class="night-score" :class="`night-score--${scoreState(record.score)}`">{{ record.score ?? '–' }}</span>
            </button>
          </li>
        </ul>
      </section>
    </div>

    <!-- ── Vide ── -->
    <section v-else class="card empty">
      <span class="empty-icon" aria-hidden="true">
        <Moon :size="24" stroke-width="1.75" />
      </span>
      <h2 class="card-title">Aucune nuit pour l'instant</h2>
      <p class="card-sub">Synchronise Withings pour voir ton score, ta durée et tes phases de sommeil.</p>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'
import { smoothPath } from '@/composables/useChartPath'
import { markSynced, getLastSyncLabel } from '@/composables/useWithingsAutoSync'
import { Moon, RefreshCw } from 'lucide-vue-next'

const PERIODS = [7, 21, 90]
const NIGHTS_LISTED = 7
const SLEEP_GOAL_SECONDS = 8 * 3600
const SCORE_GOOD = 80
const SCORE_LIMIT = 60
const AVERAGE_MARGIN = 0.05

const { user } = useAuth()

const syncing = ref(false)
const loadingRecords = ref(true)
const sleepRecords = ref([])
const errorMsg = ref('')
const selectedId = ref(null)
const activePeriod = ref(21)

const lastAutoSyncLabel = computed(() => getLastSyncLabel())

const selectedNight = computed(() =>
  sleepRecords.value.find(r => r.id === selectedId.value) ?? sleepRecords.value[0] ?? null
)

const lastNights = computed(() => sleepRecords.value.slice(0, NIGHTS_LISTED))

// ── Lecture de la nuit ──
const averageDeep = computed(() => {
  const nights = sleepRecords.value.filter(r => r.deep_sleep_seconds)
  if (nights.length < 2) return null
  return nights.reduce((sum, r) => sum + r.deep_sleep_seconds, 0) / nights.length
})

const reading = computed(() => {
  const deep = selectedNight.value?.deep_sleep_seconds
  if (!deep || !averageDeep.value) return `Nuit de ${formatDuration(selectedNight.value?.duration_seconds)}.`
  const gap = deep / averageDeep.value - 1
  if (gap > AVERAGE_MARGIN) return 'Plus de sommeil profond que ta moyenne.'
  if (gap < -AVERAGE_MARGIN) return 'Moins de sommeil profond que ta moyenne.'
  return 'Sommeil profond dans ta moyenne.'
})

const percentOfNight = (seconds) => {
  const total = selectedNight.value?.duration_seconds
  return total ? Math.round(((seconds ?? 0) / total) * 100) : 0
}

const metrics = computed(() => {
  const night = selectedNight.value
  const duration = night?.duration_seconds ?? 0
  return [
    {
      label: 'Durée',
      value: formatDuration(duration),
      detail: 'sur 8 h visées',
      percent: Math.min(100, Math.round((duration / SLEEP_GOAL_SECONDS) * 100)),
      color: 'var(--module-sleep)'
    },
    {
      label: 'Profond',
      value: formatDuration(night?.deep_sleep_seconds),
      detail: `${percentOfNight(night?.deep_sleep_seconds)} % de la nuit`,
      percent: percentOfNight(night?.deep_sleep_seconds),
      color: 'var(--accent)'
    },
    {
      label: 'Paradoxal',
      value: formatDuration(night?.rem_sleep_seconds),
      detail: `${percentOfNight(night?.rem_sleep_seconds)} % de la nuit`,
      percent: percentOfNight(night?.rem_sleep_seconds),
      color: 'var(--module-windows)'
    }
  ]
})

// ── Tendance ──
const chartNights = computed(() =>
  sleepRecords.value
    .filter(r => r.score != null)
    .slice(0, activePeriod.value)
    .reverse()
)

const trendPath = computed(() => smoothPath(chartNights.value.map(r => r.score)))

const axisLabels = computed(() => {
  const nights = chartNights.value
  if (nights.length < 2) return []
  const middle = nights[Math.floor(nights.length / 2)]
  return [...new Set([nights[0], middle, nights.at(-1)].map(n => formatAxisDate(n.date)))]
})

// ── Chargement ──
onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id || user.value?.id
  if (!userId) {
    loadingRecords.value = false
    return
  }
  await fetchRecords(userId)

  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')
  if (code) {
    window.history.replaceState({}, document.title, window.location.pathname)
    await syncSleep(code)
    markSynced()
  }
})

const fetchRecords = async (userId) => {
  loadingRecords.value = true
  try {
    const { data } = await supabase
      .from('sleep_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(Math.max(...PERIODS))
    if (data) sleepRecords.value = data
  } catch (e) {
    console.error('Error fetching sleep records:', e)
  } finally {
    loadingRecords.value = false
  }
}

const startWithingsOAuth = () => {
  const clientId = import.meta.env.VITE_WITHINGS_CLIENT_ID
  if (!clientId) { errorMsg.value = 'Client ID Withings manquant.'; return }
  const redirectUri = encodeURIComponent(window.location.origin + '/sommeil')
  const state = Math.random().toString(36).substring(7)
  window.location.href = `https://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=${clientId}&state=${state}&scope=user.metrics,user.activity&redirect_uri=${redirectUri}`
}

const syncSleep = async (code = null) => {
  syncing.value = true
  errorMsg.value = ''
  try {
    const payload = {}
    if (code) { payload.code = code; payload.redirect_uri = window.location.origin + '/sommeil' }
    const { data, error } = await supabase.functions.invoke('withings-sync', { body: payload })
    if (error) throw error
    if (data.needs_auth) { startWithingsOAuth(); return }
    if (data.error) throw new Error(data.error)
    const userId = user.value?.id
    if (Array.isArray(data) && data.length > 0) {
      if (userId) await fetchRecords(userId)
    } else if (Array.isArray(data) && data.length === 0) {
      errorMsg.value = 'Aucune nouvelle donnée Withings ces 7 derniers jours.'
    } else if (data && !Array.isArray(data) && !data.needs_auth) {
      sleepRecords.value = [data]
    }
  } catch (e) {
    console.error('Withings Sync Error:', e)
    errorMsg.value = 'Synchronisation impossible : ' + (e.message || String(e))
  } finally {
    syncing.value = false
  }
}

// ── Formats ──
const formatDate = (date) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(date))

const formatShortDate = (date) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' }).format(new Date(date))

const formatAxisDate = (date) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(date))

const formatDuration = (seconds) => {
  if (!seconds) return '0 h'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return minutes > 0 ? `${hours} h ${String(minutes).padStart(2, '0')}` : `${hours} h`
}

const scoreState = (score) => {
  if (score == null) return 'empty'
  if (score >= SCORE_GOOD) return 'good'
  return score >= SCORE_LIMIT ? 'mid' : 'bad'
}
</script>

<style scoped>
.sleep-view {
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

.sync {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.sync-label {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

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
  transition:
    transform var(--dur-fast) var(--ease-out),
    opacity var(--dur-fast) var(--ease-out);
}

.btn:hover { opacity: 0.88; }
.btn:active { transform: scale(0.97); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn--dark { background: var(--action); color: var(--on-action); }

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

/* ── Grille ── */
.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-areas:
    "banner banner banner"
    "m1     m2     m3"
    "trend  trend  trend"
    "nights nights nights";
  gap: var(--space-3);
}

.grid > :nth-child(2) { grid-area: m1; }
.grid > :nth-child(3) { grid-area: m2; }
.grid > :nth-child(4) { grid-area: m3; }

/* ── Bandeau ── */
.banner {
  grid-area: banner;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 200px;
  padding: 18px;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--aurore-sleep);
}

.banner-score,
.banner-reading {
  position: relative;
  z-index: var(--z-raised);
  max-width: 68%;
}

.banner-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
}

.score {
  font-size: clamp(4rem, 20vw, var(--text-geant));
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.banner-reading {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.orb {
  position: absolute;
  border-radius: 50%;
  opacity: var(--orb-opacity);
  pointer-events: none;
}

.orb--a { top: -40px; right: -36px; width: 150px; height: 150px; background: var(--orb-ciel); }
.orb--b { right: -24px; bottom: -14px; width: 88px; height: 88px; background: var(--orb-lilas); }

/* ── Cartes ── */
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
  padding: 14px;
  border-radius: var(--radius-lg);
  background: var(--bg-raised);
}

.card-label,
.card-sub {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.card-title {
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* ── Métriques ── */
.metric { justify-content: space-between; gap: var(--space-3); }

.metric-value {
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.3;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.metric-ring {
  display: block;
  width: 64px;
  height: 64px;
  transform: rotate(-90deg);
}

.ring-track,
.ring-value {
  fill: none;
  stroke-width: 3.4;
}

.ring-track { stroke: var(--bg-overlay); }
.ring-value { stroke-linecap: round; }

/* ── Tendance ── */
.trend { grid-area: trend; gap: var(--space-3); }

.trend-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.segmented {
  display: flex;
  gap: 2px;
  padding: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--bg-overlay);
}

.segmented-btn {
  min-height: 36px;
  padding: 0 12px;
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

.trend-chart {
  display: block;
  flex: 1;
  width: 100%;
  min-height: 170px;
  overflow: visible;
}

.trend-line {
  fill: none;
  stroke: var(--module-sleep);
  stroke-width: 3;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}

.trend-axis {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

/* ── Nuits ── */
.nights { grid-area: nights; gap: var(--space-1); }

.night-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  padding: 0;
  list-style: none;
}

.night-list li { flex: 1; }

.night {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  height: 100%;
  min-height: 48px;
  padding: 0 var(--space-2);
  border: none;
  border-radius: var(--radius-md);
  background: none;
  font-family: var(--font-sans);
  color: var(--text-primary);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out);
}

.night:hover { background: var(--bg-overlay); }
.night--active { background: var(--module-sleep-dim); }

.night-date {
  flex: 1;
  font-size: var(--text-sm);
  font-weight: 500;
  text-align: left;
  text-transform: capitalize;
}

.night-duration {
  font-size: var(--text-2xs);
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.night-score {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 32px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.night-score--good  { background: var(--status-success-dim); color: var(--status-success); }
.night-score--mid   { background: var(--status-warning-dim); color: var(--status-warning); }
.night-score--bad   { background: var(--status-error-dim);   color: var(--status-error); }
.night-score--empty { background: var(--bg-overlay);         color: var(--text-secondary); }

/* ── Vide ── */
.empty {
  align-items: center;
  padding: var(--space-10) var(--space-5);
  text-align: center;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  background: var(--module-sleep-dim);
  color: var(--module-sleep);
}

/* ── Squelettes ── */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

.skeleton {
  border-radius: var(--radius-lg);
  background: linear-gradient(90deg, var(--bg-raised) 25%, var(--bg-muted) 50%, var(--bg-raised) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}

.skeleton--banner { grid-area: banner; height: 200px; }
.skeleton--metric { height: 150px; }

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

  .sync { flex-shrink: 0; }
  .banner { padding: var(--space-6) 28px; }
  .metric-value { font-size: var(--text-2xl); }
  .card { padding: 20px; }
}

/* ── Desktop ── */
@media (min-width: 1100px) {
  .sleep-view {
    gap: var(--space-4);
    min-height: calc(100dvh - 40px);
  }

  .grid {
    flex: 1;
    grid-template-columns: minmax(0, 1.75fr) repeat(3, minmax(0, 1fr));
    grid-template-rows: 280px minmax(0, 1fr);
    grid-template-areas:
      "banner m1    m2     m3"
      "trend  trend trend  nights";
    gap: var(--space-4);
  }

  .banner-score,
  .banner-reading { max-width: 62%; }

  .orb--a { top: -50px; right: -10px; width: 230px; height: 230px; }
  .orb--b { right: -30px; bottom: 16px; width: 130px; height: 130px; }

  .card { padding: 22px; }
  .metric-ring { width: 96px; height: 96px; }
  .card-title { font-size: var(--text-xl); }
  .trend { padding: var(--space-6); }
  .nights { padding: var(--space-5); }
}
</style>
