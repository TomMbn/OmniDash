import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getNetatmoAccessToken, fetchStationData, computeHumidex } from '../_shared/netatmo.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    const body = await req.json()
    const clientId = Deno.env.get('NETATMO_CLIENT_ID') || ''
    const clientSecret = Deno.env.get('NETATMO_CLIENT_SECRET') || ''

    const { accessToken, needsAuth } = await getNetatmoAccessToken(
      supabaseClient,
      user.id,
      clientId,
      clientSecret,
      body.code,
      body.redirect_uri
    )

    if (needsAuth || !accessToken) {
      return new Response(JSON.stringify({ needs_auth: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let station
    try {
      station = await fetchStationData(accessToken)
    } catch (fetchError: any) {
      const message = fetchError.message || String(fetchError)
      // Forbidden (code 13) usually means the stored token predates a scope change (e.g. read_station -> read_homecoach).
      // Drop the stale token so the frontend re-triggers a full OAuth authorization.
      if (message.includes('"code":13') || message.includes('Forbidden')) {
        await supabaseClient.from('netatmo_tokens').delete().eq('user_id', user.id)
        return new Response(JSON.stringify({ needs_auth: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      throw fetchError
    }
    const indoorHumidex = computeHumidex(station.indoorTemp, station.indoorHumidity)

    if (station.lat != null && station.lon != null) {
      const { data: existingSettings } = await supabaseClient
        .from('user_settings')
        .select('user_id, home_lat, home_lon')
        .eq('user_id', user.id)
        .single()

      if (!existingSettings?.home_lat || !existingSettings?.home_lon) {
        await supabaseClient
          .from('user_settings')
          .upsert({ user_id: user.id, home_lat: station.lat, home_lon: station.lon })
      }
    }

    return new Response(
      JSON.stringify({
        indoor_temp: station.indoorTemp,
        indoor_humidity: station.indoorHumidity,
        indoor_humidex: Math.round(indoorHumidex * 10) / 10
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
