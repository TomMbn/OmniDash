import { ref } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'
import { nextPosition, parseMeasure } from '@/utils/shopping/shopping'

// ── État partagé ──

const items = ref([])
const measures = ref({})
const loading = ref(false)
const error = ref(null)
const ready = ref(true)

let loadedFor = null
let measureQueue = Promise.resolve()

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

export function useShopping() {
  const { user } = useAuth()

  const userId = async () => {
    if (user.value?.id) return user.value.id
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id || null
  }

  const load = async () => {
    const uid = await userId()
    if (!uid) return
    if (loadedFor !== uid) {
      items.value = []
      measures.value = {}
    }
    loading.value = true
    error.value = null
    ready.value = true
    try {
      const [list, profile] = await Promise.all([
        supabase.from('shopping_items').select('*').eq('user_id', uid).order('position'),
        supabase.from('shopping_profile').select('measures').eq('user_id', uid).maybeSingle(),
      ])
      if (list.error) throw list.error
      if (profile.error) throw profile.error
      items.value = list.data || []
      measures.value = profile.data?.measures || {}
      loadedFor = uid
    } catch (err) {
      fail('Impossible de charger la liste, réessaie.', err)
    } finally {
      loading.value = false
    }
  }

  const replace = (id, patch) => {
    items.value = items.value.map((i) => (i.id === id ? { ...i, ...patch } : i))
  }

  // La case change tout de suite ; elle revient en arrière si l'enregistrement échoue.
  const setDone = async (item, done) => {
    error.value = null
    replace(item.id, { done })
    const { error: err } = await supabase.from('shopping_items').update({ done }).eq('id', item.id)
    if (!err) return true
    replace(item.id, { done: !done })
    return fail('Case non enregistrée, réessaie.', err)
  }

  const saveItem = async (draft) => {
    error.value = null
    const { id, ...fields } = draft
    if (id) {
      const { data, error: err } = await supabase.from('shopping_items').update(fields).eq('id', id).select().single()
      if (err) return fail('Modification non enregistrée, réessaie.', err)
      replace(id, data)
      return true
    }
    const uid = await userId()
    const { data, error: err } = await supabase
      .from('shopping_items')
      .insert({ ...fields, user_id: uid, position: nextPosition(items.value) })
      .select()
      .single()
    if (err) return fail('Ajout impossible, réessaie.', err)
    items.value = [...items.value, data]
    return true
  }

  const removeItem = async (id) => {
    error.value = null
    const { error: err } = await supabase.from('shopping_items').delete().eq('id', id)
    if (err) return fail('Suppression impossible, réessaie.', err)
    items.value = items.value.filter((i) => i.id !== id)
    return true
  }

  // Les mesures partagent une ligne : les écritures passent l'une après l'autre.
  const saveMeasure = (key, value) => {
    const next = { ...measures.value }
    const parsed = parseMeasure(value)
    if (parsed === null) delete next[key]
    else next[key] = parsed
    measures.value = next
    measureQueue = measureQueue.then(async () => {
      const uid = await userId()
      const { error: err } = await supabase
        .from('shopping_profile')
        .upsert({ user_id: uid, measures: measures.value, updated_at: new Date().toISOString() })
      if (err) fail('Mesure non enregistrée, réessaie.', err)
    })
    return measureQueue
  }

  const addToWardrobe = async (item, piece) => {
    error.value = null
    const uid = await userId()
    const { error: insertError } = await supabase.from('wardrobe').insert({
      user_id: uid,
      name: piece.name.trim(),
      category: piece.category,
      color: piece.color.trim() || 'Inconnu',
      brand: piece.brand.trim() || null,
      quantity: Math.max(1, Math.round(Number(piece.quantity) || 1)),
      link: piece.link.trim(),
      style: 'casual',
      season: 'toutes',
    })
    if (insertError) return fail('Ajout au dressing impossible, réessaie.', insertError)

    const stamp = new Date().toISOString()
    const { error: markError } = await supabase.from('shopping_items').update({ wardrobe_added_at: stamp }).eq('id', item.id)
    replace(item.id, { wardrobe_added_at: stamp })
    if (markError) fail('Pièce ajoutée au dressing, mais pas marquée dans la liste.', markError)
    return true
  }

  return { items, measures, loading, error, ready, load, setDone, saveItem, removeItem, saveMeasure, addToWardrobe }
}
