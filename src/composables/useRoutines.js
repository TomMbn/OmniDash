import { ref } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'
import { localDay } from '@/utils/date'
import { DEFAULT_WASH_DAYS, addDays, logKey, nextPosition } from '@/utils/routines/routines'

// Profondeur de l'historique chargé, la même que celle des séries.
const HISTORY_DAYS = 400
// Supabase renvoie 1 000 lignes au plus par requête.
const PAGE = 1000

// ── État partagé ──

const items = ref([])
const done = ref(new Set())
const washDays = ref([...DEFAULT_WASH_DAYS])
const workoutDays = ref(new Set())
const loading = ref(false)
const error = ref(null)
const ready = ref(true)

let loadedFor = null
let settingsQueue = Promise.resolve()
const logQueues = new Map()

// Table absente : la migration n'a pas encore été exécutée
const isMissingTable = (err) => {
  if (!err) return false
  const msg = `${err.message || ''} ${err.details || ''}`
  return err.code === '42P01' || err.code === 'PGRST205' || /does not exist|schema cache/i.test(msg)
}

const fail = (message, err) => {
  console.error(message, err)
  if (isMissingTable(err)) {
    ready.value = false
    error.value = null
  } else {
    error.value = message
  }
  return false
}

const mark = (key, value) => {
  const next = new Set(done.value)
  if (value) next.add(key)
  else next.delete(key)
  done.value = next
}

const fetchLogs = async (uid, since) => {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error: err } = await supabase
      .from('routine_logs')
      .select('item_id, day')
      .eq('user_id', uid)
      .gte('day', since)
      .order('day')
      .order('item_id')
      .range(from, from + PAGE - 1)
    if (err) throw err
    rows.push(...(data || []))
    if (!data || data.length < PAGE) return rows
  }
}

export function useRoutines() {
  const { user } = useAuth()

  const userId = async () => {
    if (user.value?.id) return user.value.id
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id || null
  }

  // Les séances ne servent qu'à marquer le calendrier : leur absence ne bloque rien.
  const loadWorkouts = async (uid, since) => {
    const results = await Promise.all(['workouts', 'cardio_sessions'].map((table) =>
      supabase.from(table).select('date').eq('user_id', uid).gte('date', since)))
    workoutDays.value = new Set(results.flatMap((r) => (r.data || []).map((row) => String(row.date).slice(0, 10))))
  }

  const load = async () => {
    const uid = await userId()
    if (!uid) return
    if (loadedFor !== uid) {
      items.value = []
      done.value = new Set()
      washDays.value = [...DEFAULT_WASH_DAYS]
      workoutDays.value = new Set()
    }
    loading.value = true
    error.value = null
    ready.value = true
    const since = addDays(localDay(), -HISTORY_DAYS)
    try {
      const [list, settings, logs] = await Promise.all([
        supabase.from('routine_items').select('*').eq('user_id', uid).order('position'),
        supabase.from('routine_settings').select('wash_days').eq('user_id', uid).maybeSingle(),
        fetchLogs(uid, since),
      ])
      if (list.error) throw list.error
      if (settings.error) throw settings.error
      items.value = list.data || []
      washDays.value = settings.data?.wash_days || [...DEFAULT_WASH_DAYS]
      done.value = new Set(logs.map((l) => logKey(l.item_id, l.day)))
      loadedFor = uid
      await loadWorkouts(uid, since)
    } catch (err) {
      fail('Impossible de charger les routines, réessaie.', err)
    } finally {
      loading.value = false
    }
  }

  // La case change tout de suite. Les écritures d'une même case passent l'une après l'autre.
  const setDone = (item, day, value) => {
    const key = logKey(item.id, day)
    error.value = null
    mark(key, value)
    const run = async () => {
      const uid = await userId()
      const request = value
        ? supabase.from('routine_logs').upsert({ user_id: uid, item_id: item.id, day }, { onConflict: 'item_id,day' })
        : supabase.from('routine_logs').delete().eq('item_id', item.id).eq('day', day)
      const { error: err } = await request
      if (!err) return true
      mark(key, !value)
      return fail('Case non enregistrée, réessaie.', err)
    }
    const queued = (logQueues.get(key) || Promise.resolve()).then(run)
    logQueues.set(key, queued)
    return queued
  }

  const replace = (id, patch) => {
    items.value = items.value.map((i) => (i.id === id ? { ...i, ...patch } : i))
  }

  const saveItem = async (draft) => {
    error.value = null
    const { id, ...fields } = draft
    if (id) {
      const { data, error: err } = await supabase.from('routine_items').update(fields).eq('id', id).select().single()
      if (err) return fail('Modification non enregistrée, réessaie.', err)
      replace(id, data)
      return true
    }
    const uid = await userId()
    const { data, error: err } = await supabase
      .from('routine_items')
      .insert({ ...fields, user_id: uid, start_day: localDay(), position: nextPosition(items.value) })
      .select()
      .single()
    if (err) return fail('Ajout impossible, réessaie.', err)
    items.value = [...items.value, data]
    return true
  }

  const archiveItem = async (item) => {
    error.value = null
    const archived_on = localDay()
    const { error: err } = await supabase.from('routine_items').update({ archived_on }).eq('id', item.id)
    if (err) return fail('Retrait impossible, réessaie.', err)
    replace(item.id, { archived_on })
    return true
  }

  // Échange la place de deux étapes voisines.
  const swapPositions = async (a, b) => {
    error.value = null
    const pairs = [[a.id, b.position], [b.id, a.position]]
    pairs.forEach(([id, position]) => replace(id, { position }))
    const results = await Promise.all(pairs.map(([id, position]) =>
      supabase.from('routine_items').update({ position }).eq('id', id)))
    const failed = results.find((r) => r.error)
    if (!failed) return true
    await load()
    return fail('Ordre non enregistré, réessaie.', failed.error)
  }

  const saveWashDays = (days) => {
    washDays.value = [...days].sort((a, b) => a - b)
    settingsQueue = settingsQueue.then(async () => {
      const uid = await userId()
      const { error: err } = await supabase
        .from('routine_settings')
        .upsert({ user_id: uid, wash_days: washDays.value, updated_at: new Date().toISOString() })
      if (err) fail('Jours de shampooing non enregistrés, réessaie.', err)
    })
    return settingsQueue
  }

  return {
    items, done, washDays, workoutDays, loading, error, ready,
    load, setDone, saveItem, archiveItem, swapPositions, saveWashDays,
  }
}
