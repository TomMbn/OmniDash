import { computed, onBeforeUnmount, ref } from 'vue'

// Minuteur de repos entre deux séries.
// Il repose sur une heure de fin plutôt qu'un décompte : il reste juste si l'écran
// se met en veille ou si la page est rechargée.

const STORAGE_KEY = 'omnidash_rest_timer'
const DEFAULT_SECONDS = 90

// « 2–3 min », « 90 s », « 2 min » : on prend la borne basse, l'utilisateur ajoute au besoin
export const parseRest = (text) => {
  if (!text) return DEFAULT_SECONDS
  const match = String(text).replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(?:[–-]\s*\d+(?:\.\d+)?)?\s*(min|mn|m|s|sec)?/i)
  if (!match) return DEFAULT_SECONDS
  const value = parseFloat(match[1])
  const unit = (match[2] || 's').toLowerCase()
  return Math.round(unit.startsWith('m') ? value * 60 : value)
}

const readSaved = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    return saved?.endAt > Date.now() ? saved : null
  } catch (e) {
    return null
  }
}

const save = (value) => {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    else localStorage.removeItem(STORAGE_KEY)
  } catch (e) {}
}

// Petit signal sonore, sans fichier audio
let audioContext = null
const beep = () => {
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)()
    const now = audioContext.currentTime
    ;[0, 0.22].forEach((offset) => {
      const osc = audioContext.createOscillator()
      const gain = audioContext.createGain()
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, now + offset)
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18)
      osc.connect(gain).connect(audioContext.destination)
      osc.start(now + offset)
      osc.stop(now + offset + 0.2)
    })
  } catch (e) {}
}

// Débloque l'audio sur iOS : à appeler pendant un geste de l'utilisateur
const unlockAudio = () => {
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)()
    if (audioContext.state === 'suspended') audioContext.resume()
  } catch (e) {}
}

export function useRestTimer() {
  const saved = readSaved()
  const endAt = ref(saved?.endAt ?? null)
  const duration = ref(saved?.duration ?? 0)
  const now = ref(Date.now())
  let ticker = null

  const stopTicker = () => {
    clearInterval(ticker)
    ticker = null
  }

  const finish = (signal) => {
    stopTicker()
    endAt.value = null
    save(null)
    if (signal) {
      beep()
      try { navigator.vibrate?.([200, 100, 200]) } catch (e) {}
    }
  }

  const tick = () => {
    now.value = Date.now()
    if (endAt.value && now.value >= endAt.value) finish(true)
  }

  const startTicker = () => {
    if (!ticker) ticker = setInterval(tick, 250)
  }

  const start = (seconds) => {
    unlockAudio()
    duration.value = seconds
    endAt.value = Date.now() + seconds * 1000
    now.value = Date.now()
    save({ endAt: endAt.value, duration: duration.value })
    startTicker()
  }

  const adjust = (seconds) => {
    if (!endAt.value) return
    endAt.value = Math.max(Date.now() + 1000, endAt.value + seconds * 1000)
    duration.value = Math.max(duration.value + seconds, Math.ceil((endAt.value - Date.now()) / 1000))
    save({ endAt: endAt.value, duration: duration.value })
    tick()
  }

  const skip = () => finish(false)

  // Au retour sur l'onglet, le décompte se recale tout de suite
  const onVisible = () => { if (document.visibilityState === 'visible') tick() }
  document.addEventListener('visibilitychange', onVisible)
  if (endAt.value) startTicker()

  onBeforeUnmount(() => {
    stopTicker()
    document.removeEventListener('visibilitychange', onVisible)
  })

  const active = computed(() => endAt.value !== null)
  const remaining = computed(() => (endAt.value ? Math.max(0, Math.ceil((endAt.value - now.value) / 1000)) : 0))
  const progress = computed(() => (duration.value ? 1 - remaining.value / duration.value : 0))
  const label = computed(() => {
    const s = remaining.value
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  })

  return { active, remaining, progress, label, start, adjust, skip }
}
