<template>
  <div class="sleep-view">

    <!-- ── Header ── -->
    <header class="module-header">
      <div class="module-header-title">
        <div class="module-icon">
          <Moon :size="18" stroke-width="1.75" />
        </div>
        <div>
          <h2 class="module-name">Sommeil</h2>
          <p class="module-sub">Analyse de récupération</p>
        </div>
      </div>
    </header>

    <!-- ── Sync widget ── -->
    <div class="sync-card">
      <div class="sync-orb" />

      <div class="sync-content">
        <div class="sync-left">
          <div class="sync-title-row">
            <div class="sync-zap-icon">
              <Zap :size="14" stroke-width="1.75" />
            </div>
            <h3 class="sync-title">Withings Sleep Analyzer</h3>
          </div>
          <p class="sync-desc">Synchronisez vos cycles pour optimiser votre récupération.</p>

          <div v-if="lastAutoSyncLabel && !errorMsg" class="sync-timestamp">
            <div class="sync-timestamp-dot" />
            <span>Mis à jour {{ lastAutoSyncLabel }}</span>
          </div>

          <div v-if="errorMsg" class="sync-error">
            <div class="sync-error-dot" />
            {{ errorMsg }}
          </div>
        </div>

        <button
          @click="syncSleep()"
          :disabled="syncing"
          class="sync-btn"
          :class="{ 'sync-btn--loading': syncing }"
        >
          <RefreshCw
            :size="14"
            stroke-width="2"
            :class="syncing ? 'sync-icon-spin' : 'sync-icon-idle'"
          />
          {{ syncing ? 'Sync…' : 'Synchroniser' }}
        </button>
      </div>
    </div>

    <!-- ── Loading ── -->
    <div v-if="loadingRecords" class="skeleton-stack">
      <div v-for="i in 3" :key="i" class="skeleton skeleton--night" />
    </div>

    <!-- ── Records ── -->
    <div v-else-if="sleepRecords.length > 0" class="nights-list">
      <div v-for="record in sleepRecords" :key="record.id" class="night-card">

        <!-- Score + date -->
        <div class="night-card-head">
          <div class="night-date">
            <Calendar :size="10" stroke-width="1.75" />
            <span>{{ formatDate(record.date) }}</span>
          </div>
          <div class="night-score-wrap">
            <span
              class="night-score"
              :style="scoreColor(record.score)"
            >{{ record.score }}</span>
            <span class="night-score-denom">/100</span>
          </div>
        </div>

        <!-- Score bar -->
        <div class="score-bar-track">
          <div
            class="score-bar-fill"
            :style="{
              width: record.score + '%',
              background: scoreColor(record.score).color
            }"
          />
        </div>

        <!-- 3 metrics -->
        <div class="night-metrics">

          <div class="metric">
            <div class="metric-label">
              <Clock :size="10" stroke-width="1.75" />
              <span>Durée</span>
            </div>
            <p class="metric-value">{{ formatDuration(record.duration_seconds) }}</p>
            <div class="metric-bar">
              <div class="metric-bar-fill metric-bar-fill--total"
                :style="{ width: Math.min(100, (record.duration_seconds / 28800) * 100) + '%' }" />
            </div>
          </div>

          <div class="metric">
            <div class="metric-label">
              <Waves :size="10" stroke-width="1.75" />
              <span>Profond</span>
            </div>
            <p class="metric-value metric-value--deep">{{ formatDuration(record.deep_sleep_seconds) }}</p>
            <div class="metric-bar">
              <div class="metric-bar-fill metric-bar-fill--deep"
                :style="{ width: Math.min(100, (record.deep_sleep_seconds / (record.duration_seconds || 1)) * 100) + '%' }" />
            </div>
          </div>

          <div class="metric">
            <div class="metric-label">
              <Brain :size="10" stroke-width="1.75" />
              <span>Paradoxal</span>
            </div>
            <p class="metric-value metric-value--rem">{{ formatDuration(record.rem_sleep_seconds) }}</p>
            <div class="metric-bar">
              <div class="metric-bar-fill metric-bar-fill--rem"
                :style="{ width: Math.min(100, (record.rem_sleep_seconds / (record.duration_seconds || 1)) * 100) + '%' }" />
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- ── Empty state ── -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <Bed :size="28" stroke-width="1.25" />
      </div>
      <h3 class="empty-title">Aucune donnée</h3>
      <p class="empty-desc">
        Synchronisez vos données Withings pour décoder vos nuits et booster vos performances.
      </p>
      <button @click="syncSleep()" class="empty-cta">
        <RefreshCw :size="14" stroke-width="1.75" />
        Lancer la synchro
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'
import {
  Moon, RefreshCw, Bed, Award, Calendar,
  Zap, Waves, Brain, Clock
} from 'lucide-vue-next'

const { user } = useAuth()

const syncing = ref(false)
const loadingRecords = ref(true)
const sleepRecords = ref([])
const errorMsg = ref('')

import { markSynced, getLastSyncLabel } from '@/composables/useWithingsAutoSync'

const lastAutoSyncLabel = computed(() => getLastSyncLabel())

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id || user.value?.id
  if (!userId) return
  await fetchLatestRecord(userId)

  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')
  if (code) {
    window.history.replaceState({}, document.title, window.location.pathname)
    await syncSleep(code)
    markSynced()
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
    if (data) sleepRecords.value = data
  } catch (e) {
    console.error('Error fetching sleep records:', e)
  } finally {
    loadingRecords.value = false
  }
}

const startWithingsOAuth = () => {
  const clientId = import.meta.env.VITE_WITHINGS_CLIENT_ID
  if (!clientId) { errorMsg.value = "Client ID Withings manquant."; return }
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
      if (userId) await fetchLatestRecord(userId)
    } else if (Array.isArray(data) && data.length === 0) {
      errorMsg.value = 'Aucune nouvelle donnée Withings ces 7 derniers jours.'
    } else if (data && !Array.isArray(data) && !data.needs_auth) {
      sleepRecords.value = [data]
    }
  } catch (e) {
    console.error('Withings Sync Error:', e)
    errorMsg.value = 'Erreur : ' + (e.message || String(e))
  } finally {
    syncing.value = false
  }
}

const formatDate = (dateString) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(dateString))

const formatDuration = (seconds) => {
  if (!seconds) return '0h'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const scoreColor = (score) => {
  if (score >= 80) return { color: 'var(--status-success)' }
  if (score >= 60) return { color: 'var(--status-warning)' }
  return { color: 'var(--status-error)' }
}
</script>

<style scoped>
/* ── Layout ── */
.sleep-view {
  max-width: 560px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  user-select: none;
}

/* ── Module header ── */
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
  background: var(--module-sleep-dim);
  border: 1px solid var(--module-sleep-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--module-sleep);
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

/* ── Sync card ── */
.sync-card {
  position: relative;
  overflow: hidden;
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-top-color: var(--module-sleep-border);
  border-radius: var(--radius-xl);
  padding: 28px 24px;
}

.sync-orb {
  position: absolute;
  top: -60px;
  right: -60px;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(122, 145, 184, 0.08) 0%, transparent 70%);
  pointer-events: none;
}

.sync-content {
  position: relative;
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
  background: var(--module-sleep-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--module-sleep);
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
  max-width: 320px;
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
  animation: pulse-dot 2s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

.sync-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--module-sleep-dim);
  border: 1px solid var(--module-sleep-border);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--module-sleep);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    background var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.sync-btn:hover {
  background: color-mix(in srgb, var(--module-sleep) 14%, transparent);
}

.sync-btn:active { transform: scale(0.97); }

.sync-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

@keyframes spin { to { transform: rotate(360deg); } }

.sync-icon-spin { animation: spin 0.9s linear infinite; }

.sync-icon-idle {
  transition: transform var(--dur-slow) var(--ease-out);
}

.sync-btn:not(:disabled):hover .sync-icon-idle {
  transform: rotate(180deg);
}

/* ── Skeletons ── */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

.skeleton-stack { display: flex; flex-direction: column; gap: 8px; }

.skeleton {
  background: linear-gradient(90deg, var(--bg-overlay) 25%, var(--bg-muted) 50%, var(--bg-overlay) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
  border-radius: var(--radius-xl);
}

.skeleton--night { height: 140px; }

/* ── Nights list ── */
.nights-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── Night card ── */
.night-card {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: 22px 22px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: border-color var(--dur-fast) var(--ease-out);
}

.night-card:hover { border-color: var(--border-default); }

/* Head: date + score */
.night-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.night-date {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted);
  text-transform: capitalize;
}

.night-score-wrap {
  display: flex;
  align-items: baseline;
  gap: 3px;
  flex-shrink: 0;
}

.night-score {
  font-family: var(--font-serif);
  font-size: 2.2rem;
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.02em;
}

.night-score-denom {
  font-size: 11px;
  color: var(--text-disabled);
}

/* Score progress bar */
.score-bar-track {
  height: 2px;
  background: var(--bg-overlay);
  border-radius: 999px;
  overflow: hidden;
}

.score-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width var(--dur-slow) var(--ease-out);
  opacity: 0.7;
}

/* Metrics row */
.night-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding-top: 2px;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.metric-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.metric-value {
  font-size: var(--text-md);
  font-weight: 300;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.metric-value--deep { color: var(--module-sleep); }
.metric-value--rem  { color: color-mix(in srgb, var(--module-sleep) 70%, var(--text-primary)); }

.metric-bar {
  height: 2px;
  background: var(--bg-overlay);
  border-radius: 999px;
  overflow: hidden;
  margin-top: 2px;
}

.metric-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width var(--dur-slow) var(--ease-out);
}

.metric-bar-fill--total { background: var(--text-muted); }
.metric-bar-fill--deep  { background: var(--module-sleep); }
.metric-bar-fill--rem   { background: color-mix(in srgb, var(--module-sleep) 60%, white); opacity: 0.7; }

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 56px 32px;
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  gap: 10px;
}

.empty-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-disabled);
  margin-bottom: 8px;
}

.empty-title {
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  font-weight: 400;
  color: var(--text-primary);
}

.empty-desc {
  font-size: var(--text-sm);
  color: var(--text-muted);
  max-width: 260px;
  line-height: 1.6;
}

.empty-cta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 12px 24px;
  background: var(--text-primary);
  color: var(--bg-base);
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.empty-cta:hover  { background: #fff; }
.empty-cta:active { transform: scale(0.97); }
</style>
