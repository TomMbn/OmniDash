import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'
import { getNetatmoAccessToken, fetchStationData } from '../_shared/netatmo.ts'
import { simulateWindowPlan } from '../_shared/forecast.ts'
import type { WallType } from '../_shared/forecast.ts'

// Une fenêtre "différente" de celle déjà stockée si son heure d'ouverture prévue
// dérive de plus d'1h (nouvelle occurrence détectée par une prévision plus fraîche).
const WINDOW_DRIFT_MS = 60 * 60 * 1000

const formatTime = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).format(new Date(iso))

serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const netatmoClientId = Deno.env.get('NETATMO_CLIENT_ID') || ''
  const netatmoClientSecret = Deno.env.get('NETATMO_CLIENT_SECRET') || ''

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') || 'mailto:contact@example.com',
    Deno.env.get('VAPID_PUBLIC_KEY') || '',
    Deno.env.get('VAPID_PRIVATE_KEY') || ''
  )

  const { data: settingsRows } = await supabase
    .from('user_settings')
    .select('user_id, windows_notifications_enabled, home_lat, home_lon, wall_type')
    .eq('windows_notifications_enabled', true)

  const results: any[] = []

  for (const settings of settingsRows || []) {
    try {
      if (settings.home_lat == null || settings.home_lon == null) continue

      const { accessToken, needsAuth } = await getNetatmoAccessToken(
        supabase,
        settings.user_id,
        netatmoClientId,
        netatmoClientSecret
      )
      if (needsAuth || !accessToken) continue

      const station = await fetchStationData(accessToken)

      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${settings.home_lat}&longitude=${settings.home_lon}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability&forecast_days=2`
      )
      const weather = await weatherResponse.json()
      const hourly = weather.hourly
      if (!hourly?.time?.length) continue

      const wallType = (settings.wall_type as WallType) || 'medium'
      const plan = simulateWindowPlan(hourly, station.indoorTemp, station.indoorHumidity, wallType)

      const { data: state } = await supabase
        .from('window_forecast')
        .select('*')
        .eq('user_id', settings.user_id)
        .single()

      const openDrifted = !state?.predicted_open_at || !plan.openAt ||
        Math.abs(new Date(plan.openAt).getTime() - new Date(state.predicted_open_at).getTime()) > WINDOW_DRIFT_MS

      const openNotified = openDrifted ? false : !!state?.open_notified
      const closeNotified = openDrifted ? false : !!state?.close_notified

      await supabase.from('window_forecast').upsert({
        user_id: settings.user_id,
        predicted_open_at: plan.openAt,
        predicted_close_at: plan.closeAt,
        open_notified: openNotified,
        close_notified: closeNotified,
        computed_at: new Date().toISOString()
      })

      if (!plan.openAt) continue

      const now = Date.now()
      const openAt = new Date(plan.openAt).getTime()
      const closeAt = plan.closeAt ? new Date(plan.closeAt).getTime() : null

      let notify: 'open' | 'close' | null = null
      if (now >= openAt && (closeAt === null || now < closeAt) && !openNotified) {
        notify = 'open'
      } else if (closeAt !== null && now >= closeAt && openNotified && !closeNotified) {
        notify = 'close'
      }

      if (!notify) continue

      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', settings.user_id)

      const title = notify === 'open' ? 'Ouvre les fenêtres 🌬️' : 'Ferme les fenêtres 🪟'
      const body = notify === 'open'
        ? (plan.closeAt ? `Favorable jusqu'à ${formatTime(plan.closeAt)}.` : 'Favorable pour un moment.')
        : "Le créneau favorable est terminé."

      for (const sub of subscriptions || []) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title, body })
          )
        } catch (pushError: any) {
          if (pushError.statusCode === 404 || pushError.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          }
        }
      }

      await supabase
        .from('window_forecast')
        .update(notify === 'open' ? { open_notified: true } : { close_notified: true })
        .eq('user_id', settings.user_id)

      results.push({ user_id: settings.user_id, notify, openAt: plan.openAt, closeAt: plan.closeAt })
    } catch (err: any) {
      results.push({ user_id: settings.user_id, error: err.message || String(err) })
    }
  }

  return new Response(JSON.stringify({ results }), { headers: { 'Content-Type': 'application/json' } })
})
