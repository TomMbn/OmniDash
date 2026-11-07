import { nextTick, ref, watch } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'

// Réglages de machine notés par exercice (hauteur du siège, poulie…).
// Le compte (user_settings.exercise_setups) fait foi pour partager entre les appareils,
// le navigateur garde une copie pour l'affichage immédiat et le hors-ligne.

const STORAGE_KEY = 'omnidash_exercise_setups'

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

const writeLocal = (value) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)) } catch (e) {}
}

// Partagé entre tous les composants
const setups = ref(load())

let syncedUserId = null
let applyingRemote = false

const saveRemote = async (value) => {
  if (!syncedUserId) return
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: syncedUserId, exercise_setups: value }, { onConflict: 'user_id' })
  if (error) console.warn('Réglages de machine non synchronisés :', error.message)
}

const loadRemote = async (userId) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('exercise_setups')
    .eq('user_id', userId)
    .maybeSingle()
  // Colonne absente ou réseau coupé : on reste sur la copie locale
  if (error) {
    console.warn('Réglages de machine non synchronisés :', error.message)
    return
  }
  syncedUserId = userId
  if (data?.exercise_setups) {
    applyingRemote = true
    setups.value = data.exercise_setups
    await nextTick()
    applyingRemote = false
  } else if (Object.keys(setups.value).length) {
    // Première synchronisation : le compte reprend les réglages de cet appareil
    await saveRemote(setups.value)
  }
}

watch(setups, (value) => {
  writeLocal(value)
  if (!applyingRemote) saveRemote(value)
})

const { user } = useAuth()
watch(user, (u) => {
  if (u?.id && u.id !== syncedUserId) loadRemote(u.id)
  if (!u) syncedUserId = null
}, { immediate: true })

export function useExerciseSetup() {
  const getSetup = (exerciseId) => setups.value[exerciseId] || ''

  const saveSetup = (exerciseId, note) => {
    if (!exerciseId) return
    const updated = { ...setups.value }
    if (note?.trim()) {
      updated[exerciseId] = note.trim()
    } else {
      delete updated[exerciseId]
    }
    setups.value = updated
  }

  return { getSetup, saveSetup }
}
