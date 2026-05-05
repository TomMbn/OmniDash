import { ref } from 'vue'

const STORAGE_KEY = 'omnidash_exercise_setups'

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

// Shared reactive map so all components see the same state
const setups = ref(load())

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  return { getSetup, saveSetup }
}
