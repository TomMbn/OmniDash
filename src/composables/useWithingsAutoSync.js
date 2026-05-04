import { supabase } from '@/supabase'

const SYNC_KEY = 'withings_last_auto_sync'
const SYNC_INTERVAL_H = 6

const shouldAutoSync = () => {
  const last = localStorage.getItem(SYNC_KEY)
  if (!last) return true
  return (Date.now() - Number(last)) / 3_600_000 >= SYNC_INTERVAL_H
}

export const markSynced = () => localStorage.setItem(SYNC_KEY, String(Date.now()))

export const getLastSyncLabel = () => {
  const last = localStorage.getItem(SYNC_KEY)
  if (!last) return null
  const diffMin = Math.round((Date.now() - Number(last)) / 60_000)
  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  return `il y a ${Math.floor(diffMin / 60)}h`
}

export const runAutoSync = async (userId) => {
  if (!userId || !shouldAutoSync()) return
  try {
    const { data, error } = await supabase.functions.invoke('withings-sync', { body: {} })
    if (error || !data || data.needs_auth || data.error) return
    if (Array.isArray(data) && data.length > 0) markSynced()
  } catch {
    // silent fail — user can still sync manually
  }
}
