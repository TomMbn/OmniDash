import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'
import { getNetatmoAccessToken, fetchStationData, computeHumidex } from '../_shared/netatmo.ts'

const COOLDOWN_MS = 2 * 60 * 60 * 1000

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
    .select('user_id, windows_notifications_enabled, home_lat, home_lon')
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
      const indoorHumidex = computeHumidex(station.indoorTemp, station.indoorHumidity)

      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${settings.home_lat}&longitude=${settings.home_lon}&current=temperature_2m,relative_humidity_2m,precipitation`
      )
      const weather = await weatherResponse.json()
      const outdoorTemp = weather.current?.temperature_2m
      const outdoorHumidity = weather.current?.relative_humidity_2m
      const precipitation = weather.current?.precipitation ?? 0
      if (outdoorTemp == null || outdoorHumidity == null) continue

      const outdoorHumidex = computeHumidex(outdoorTemp, outdoorHumidity)

      const { data: state } = await supabase
        .from('window_notification_state')
        .select('*')
        .eq('user_id', settings.user_id)
        .single()

      let recommendation: 'open' | 'close' | null = null

      // Ouvrir n'a de sens que si l'air extérieur va réellement refroidir la pièce
      // (température plus basse) ET améliorer le confort (humidex plus bas).
      if (outdoorTemp < station.indoorTemp && outdoorHumidex < indoorHumidex && precipitation === 0) {
        recommendation = 'open'
      } else if (
        state?.last_recommendation === 'open' &&
        (precipitation > 0 || outdoorTemp >= station.indoorTemp || outdoorHumidex >= indoorHumidex)
      ) {
        recommendation = 'close'
      }

      if (!recommendation) continue

      const changed = state?.last_recommendation !== recommendation
      const cooldownElapsed = !state?.last_sent_at || (Date.now() - new Date(state.last_sent_at).getTime()) > COOLDOWN_MS
      if (!changed && !cooldownElapsed) continue

      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', settings.user_id)

      const title = recommendation === 'open' ? 'Ouvre les fenêtres 🌬️' : 'Ferme les fenêtres 🪟'
      const body =
        recommendation === 'open'
          ? `Intérieur ${Math.round(station.indoorTemp)}°C / humidex ${Math.round(indoorHumidex)}, il fait plus frais dehors (${Math.round(outdoorTemp)}°C).`
          : `L'extérieur devient moins favorable (${Math.round(outdoorTemp)}°C), pense à refermer.`

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
        .from('window_notification_state')
        .upsert({ user_id: settings.user_id, last_recommendation: recommendation, last_sent_at: new Date().toISOString() })

      results.push({ user_id: settings.user_id, recommendation })
    } catch (err: any) {
      results.push({ user_id: settings.user_id, error: err.message || String(err) })
    }
  }

  return new Response(JSON.stringify({ results }), { headers: { 'Content-Type': 'application/json' } })
})
