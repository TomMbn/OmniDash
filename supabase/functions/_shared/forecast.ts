// Modèle thermique RC simplifié (2 régimes) pour prédire un créneau d'ouverture optimal
// à partir des prévisions horaires Open-Meteo. Inspiré des modèles simplifiés type EN ISO 13790 :
// fenêtre fermée = conduction lente à travers les murs (tau selon l'inertie),
// fenêtre ouverte = échange d'air direct qui domine largement la conduction (tau court, fixe).
import { computeHumidex } from './netatmo.ts'

export type WallType = 'light' | 'medium' | 'heavy'

const TAU_CLOSED_HOURS: Record<WallType, number> = {
  light: 6,
  medium: 16,
  heavy: 30
}

const TAU_OPEN_HOURS = 1.5
const RAIN_PROBABILITY_LIMIT = 30

export interface HourlyForecast {
  time: string[]
  temperature_2m: number[]
  relative_humidity_2m: number[]
  precipitation_probability: number[]
}

export interface SimulatedHour {
  time: string
  indoorTemp: number
  outdoorTemp: number
}

export interface WindowPlan {
  hours: SimulatedHour[]
  openAt: string | null
  closeAt: string | null
}

function stepTemperature(indoorTemp: number, outdoorTemp: number, tauHours: number): number {
  return outdoorTemp + (indoorTemp - outdoorTemp) * Math.exp(-1 / tauHours)
}

function isFavorable(outdoorTemp: number, outdoorHumidex: number, indoorTemp: number, indoorHumidex: number, precipitationProbability: number): boolean {
  return (
    outdoorTemp < indoorTemp &&
    outdoorHumidex < indoorHumidex &&
    precipitationProbability < RAIN_PROBABILITY_LIMIT
  )
}

// Open-Meteo renvoie les prévisions horaires depuis minuit (heure locale) du jour courant,
// pas depuis l'heure actuelle — il faut donc écarter les heures déjà passées avant de simuler.
function trimToFutureHours(hourly: HourlyForecast): HourlyForecast {
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

export function simulateWindowPlan(
  hourlyRaw: HourlyForecast,
  currentIndoorTemp: number,
  currentIndoorHumidity: number,
  wallType: WallType
): WindowPlan {
  const hourly = trimToFutureHours(hourlyRaw)
  const n = hourly.time.length
  const tauClosed = TAU_CLOSED_HOURS[wallType] ?? TAU_CLOSED_HOURS.medium

  // Passe 1 : trajectoire "toujours fermé" pour repérer le premier créneau candidat.
  // Le premier point est la lecture Netatmo actuelle telle quelle (pas encore simulée).
  const baseline: number[] = []
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

  // Passe 2 : trajectoire réelle — bascule sur tau_open dès l'ouverture, referme dès que
  // les conditions ne sont plus favorables contre l'indoor simulé en temps réel.
  const real: number[] = []
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
