import { ref } from 'vue'

// Vrai pendant une séance : la navigation mobile laisse l'écran à l'exercice en cours.
const focusModeActive = ref(false)

export function useFocusMode() {
  return { focusModeActive }
}
