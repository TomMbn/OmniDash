import { ref } from 'vue'

const request = ref(null)

// Ouvre la fenêtre de confirmation et résout true si l'utilisateur confirme.
const askConfirm = ({ title, detail = '', confirmLabel = 'Supprimer' }) => {
  request.value?.resolve(false)
  return new Promise((resolve) => {
    request.value = { title, detail, confirmLabel, resolve }
  })
}

const answerConfirm = (accepted) => {
  request.value?.resolve(accepted)
  request.value = null
}

export function useConfirm() {
  return { request, askConfirm, answerConfirm }
}
