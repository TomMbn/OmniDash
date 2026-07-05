export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET
  const functionsUrl = process.env.SUPABASE_FUNCTIONS_URL

  if (!cronSecret || !functionsUrl) {
    res.status(500).json({ error: 'Missing CRON_SECRET or SUPABASE_FUNCTIONS_URL env var' })
    return
  }

  try {
    const response = await fetch(`${functionsUrl}/check-windows`, {
      method: 'POST',
      headers: { 'x-cron-secret': cronSecret }
    })
    const data = await response.json()
    res.status(response.status).json(data)
  } catch (error) {
    res.status(500).json({ error: error.message || String(error) })
  }
}
