import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const authorizationCode = body.code
    const clientId = Deno.env.get('WITHINGS_CLIENT_ID')
    const clientSecret = Deno.env.get('WITHINGS_CLIENT_SECRET')

    let accessToken: string | null = null

    // --- STEP 1: Get a valid access token ---
    // Check if we have a stored token for this user
    const { data: storedToken } = await supabaseClient
      .from('withings_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (authorizationCode) {
      // We have a fresh OAuth code → exchange it for tokens
      const tokenParams = new URLSearchParams({
        action: 'requesttoken',
        grant_type: 'authorization_code',
        client_id: clientId || '',
        client_secret: clientSecret || '',
        code: authorizationCode,
        redirect_uri: body.redirect_uri
      })

      const tokenResponse = await fetch('https://wbsapi.withings.net/v2/oauth2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams
      })

      const tokenData = await tokenResponse.json()
      if (tokenData.status !== 0) {
        throw new Error(`Withings Auth Error: ${JSON.stringify(tokenData)}`)
      }

      accessToken = tokenData.body.access_token
      const refreshToken = tokenData.body.refresh_token
      const expiresIn = tokenData.body.expires_in || 10800 // default 3h
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

      // Store/update the tokens in Supabase
      if (storedToken) {
        await supabaseClient
          .from('withings_tokens')
          .update({ access_token: accessToken, refresh_token: refreshToken, expires_at: expiresAt })
          .eq('user_id', user.id)
      } else {
        await supabaseClient
          .from('withings_tokens')
          .insert({ user_id: user.id, access_token: accessToken, refresh_token: refreshToken, expires_at: expiresAt })
      }

    } else if (storedToken) {
      // No code provided → try to use stored token
      const isExpired = new Date(storedToken.expires_at) <= new Date()

      if (isExpired) {
        // Refresh the token
        const refreshParams = new URLSearchParams({
          action: 'requesttoken',
          grant_type: 'refresh_token',
          client_id: clientId || '',
          client_secret: clientSecret || '',
          refresh_token: storedToken.refresh_token
        })

        const refreshResponse = await fetch('https://wbsapi.withings.net/v2/oauth2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: refreshParams
        })

        const refreshData = await refreshResponse.json()
        if (refreshData.status !== 0) {
          // Refresh failed → user needs to re-authorize
          return new Response(JSON.stringify({ needs_auth: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        accessToken = refreshData.body.access_token
        const newRefreshToken = refreshData.body.refresh_token
        const expiresIn = refreshData.body.expires_in || 10800
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

        await supabaseClient
          .from('withings_tokens')
          .update({ access_token: accessToken, refresh_token: newRefreshToken, expires_at: expiresAt })
          .eq('user_id', user.id)
      } else {
        // Token is still valid
        accessToken = storedToken.access_token
      }
    } else {
      // No code AND no stored token → tell frontend to start OAuth
      return new Response(JSON.stringify({ needs_auth: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- STEP 2: Fetch Sleep Data ---
    const date = new Date()
    const today = date.toISOString().split('T')[0]
    date.setDate(date.getDate() - 7)
    const sevenDaysAgo = date.toISOString().split('T')[0]

    const sleepParams = new URLSearchParams({
      action: 'getsummary',
      startdateymd: sevenDaysAgo,
      enddateymd: today,
      data_fields: 'deepsleepduration,remsleepduration,lightsleepduration,wakeupduration,duration,sleep_score'
    })

    const sleepResponse = await fetch('https://wbsapi.withings.net/v2/sleep', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: sleepParams
    })

    const sleepData = await sleepResponse.json()
    const seriesData = sleepData.body?.series || []

    // Group by date → keep only the main sleep (longest duration)
    const groupedByDate: Record<string, any> = {}

    for (const item of seriesData) {
      const data = item.data
      const actualDate = item.date

      const deepSleepSec = data.deepsleepduration || 0
      const remSleepSec = data.remsleepduration || 0
      const awakeSec = data.wakeupduration || 0
      const lightSleepSec = data.lightsleepduration || 0
      const durationSec = data.duration || (deepSleepSec + remSleepSec + lightSleepSec)
      const sleepScore = data.sleep_score || 0

      if (durationSec > 0) {
        if (!groupedByDate[actualDate] || groupedByDate[actualDate].duration_seconds < durationSec) {
          groupedByDate[actualDate] = {
            user_id: user.id,
            date: actualDate,
            duration_seconds: durationSec,
            deep_sleep_seconds: deepSleepSec,
            rem_sleep_seconds: remSleepSec,
            awake_seconds: awakeSec,
            score: sleepScore
          }
        }
      }
    }

    const recordsToUpsert = Object.values(groupedByDate)

    if (recordsToUpsert.length === 0) {
      return new Response(JSON.stringify([]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- STEP 3: Upsert into Supabase ---
    const results: any[] = []
    for (const payload of recordsToUpsert) {
      const { data: existingRecord } = await supabaseClient
        .from('sleep_records')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', payload.date)
        .single()

      if (existingRecord) {
        const { data, error } = await supabaseClient
          .from('sleep_records')
          .update(payload)
          .eq('id', existingRecord.id)
          .select()
        if (!error && data) results.push(data[0])
      } else {
        const { data, error } = await supabaseClient
          .from('sleep_records')
          .insert(payload)
          .select()
        if (!error && data) results.push(data[0])
      }
    }

    results.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
