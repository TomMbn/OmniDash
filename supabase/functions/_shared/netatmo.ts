// Shared Netatmo OAuth + station-data helpers, used by netatmo-sync and check-windows.

export interface NetatmoResult {
  accessToken: string | null
  needsAuth: boolean
}

export async function getNetatmoAccessToken(
  supabaseClient: any,
  userId: string,
  clientId: string,
  clientSecret: string,
  authorizationCode?: string,
  redirectUri?: string
): Promise<NetatmoResult> {
  const { data: storedToken } = await supabaseClient
    .from('netatmo_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (authorizationCode) {
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: authorizationCode,
      redirect_uri: redirectUri || '',
      scope: 'read_homecoach'
    })

    const tokenResponse = await fetch('https://api.netatmo.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams
    })

    const tokenData = await tokenResponse.json()
    if (!tokenData.access_token) {
      throw new Error(`Netatmo Auth Error: ${JSON.stringify(tokenData)}`)
    }

    const accessToken = tokenData.access_token
    const refreshToken = tokenData.refresh_token
    const expiresIn = tokenData.expires_in || 10800
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    if (storedToken) {
      await supabaseClient
        .from('netatmo_tokens')
        .update({ access_token: accessToken, refresh_token: refreshToken, expires_at: expiresAt })
        .eq('user_id', userId)
    } else {
      await supabaseClient
        .from('netatmo_tokens')
        .insert({ user_id: userId, access_token: accessToken, refresh_token: refreshToken, expires_at: expiresAt })
    }

    return { accessToken, needsAuth: false }
  }

  if (!storedToken) {
    return { accessToken: null, needsAuth: true }
  }

  const isExpired = new Date(storedToken.expires_at) <= new Date()
  if (!isExpired) {
    return { accessToken: storedToken.access_token, needsAuth: false }
  }

  const refreshParams = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: storedToken.refresh_token
  })

  const refreshResponse = await fetch('https://api.netatmo.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: refreshParams
  })

  const refreshData = await refreshResponse.json()
  if (!refreshData.access_token) {
    return { accessToken: null, needsAuth: true }
  }

  const accessToken = refreshData.access_token
  const newRefreshToken = refreshData.refresh_token
  const expiresIn = refreshData.expires_in || 10800
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  await supabaseClient
    .from('netatmo_tokens')
    .update({ access_token: accessToken, refresh_token: newRefreshToken, expires_at: expiresAt })
    .eq('user_id', userId)

  return { accessToken, needsAuth: false }
}

export interface StationData {
  indoorTemp: number
  indoorHumidity: number
  lat: number | null
  lon: number | null
}

export async function fetchStationData(accessToken: string): Promise<StationData> {
  const response = await fetch('https://api.netatmo.com/api/gethomecoachsdata', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  const data = await response.json()

  const device = data.body?.devices?.[0]
  if (!device) throw new Error(`Aucun capteur Netatmo trouvé — réponse API: ${JSON.stringify(data)}`)

  const dashboard = device.dashboard_data

  if (!dashboard) throw new Error('Aucune donnée intérieure disponible')

  const [lon, lat] = device.place?.location || [null, null]

  return {
    indoorTemp: dashboard.Temperature,
    indoorHumidity: dashboard.Humidity,
    lat,
    lon
  }
}

export function computeHumidex(tempC: number, relativeHumidity: number): number {
  const e = (relativeHumidity / 100) * 6.112 * Math.pow(10, (7.5 * tempC) / (237.7 + tempC))
  return tempC + (5 / 9) * (e - 10)
}
