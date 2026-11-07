import { computed, ref } from 'vue'
import { supabase } from '@/supabase'

// File d'écritures pour la séance : chaque série est gardée sur l'appareil puis envoyée
// dès que le réseau le permet. Les identifiants sont créés ici, ce qui rend chaque
// envoi rejouable sans doublon.

const STORAGE_KEY = 'omnidash_sync_queue'
const RETRY_MS = 20000

const read = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch (e) { return [] }
}

const queue = ref(read())
const syncing = ref(false)
const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
const lastError = ref('')
let retryTimer = null

const persist = () => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.value)) } catch (e) {}
}

export const newId = () =>
  crypto.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })

// Sans code d'erreur PostgREST, c'est le réseau : on réessaiera
const isNetworkError = (error) => !error?.code && /fetch|network|load failed|timeout/i.test(error?.message || 'fetch')

const run = async (op) => {
  const table = supabase.from(op.table)
  if (op.type === 'insert') return table.insert(op.row)
  if (op.type === 'update') return table.update(op.changes).eq('id', op.id)
  if (op.type === 'delete') return table.delete().eq('id', op.id)
  return { error: null }
}

const flush = async () => {
  if (syncing.value || !queue.value.length) return
  syncing.value = true
  try {
    while (queue.value.length) {
      const op = queue.value[0]
      let error = null
      try {
        ({ error } = await run(op))
      } catch (e) {
        error = { message: String(e?.message || e) }
      }
      if (error && isNetworkError(error)) {
        online.value = false
        break
      }
      online.value = true
      // 23505 : déjà enregistré lors d'un envoi précédent dont la réponse s'est perdue
      if (error && error.code !== '23505') {
        console.warn('Écriture abandonnée :', op.table, op.type, error.message)
        lastError.value = error.message
      }
      queue.value.shift()
      persist()
    }
  } finally {
    syncing.value = false
  }
  clearTimeout(retryTimer)
  if (queue.value.length) retryTimer = setTimeout(flush, RETRY_MS)
}

const enqueue = (op) => {
  // Une modification ou suppression d'une ligne encore en attente se fusionne avec elle
  const pending = queue.value.find(q => q.type === 'insert' && q.table === op.table && q.row.id === op.id)
  if (pending && op.type === 'update') {
    Object.assign(pending.row, op.changes)
  } else if (pending && op.type === 'delete') {
    queue.value = queue.value.filter(q => q !== pending)
  } else {
    queue.value.push(op)
  }
  persist()
  flush()
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { online.value = true; flush() })
  window.addEventListener('offline', () => { online.value = false })
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') flush() })
  flush()
}

export function useSyncQueue() {
  return {
    pendingCount: computed(() => queue.value.length),
    pendingSets: computed(() => queue.value.filter(q => q.table === 'workout_sets' && q.type !== 'delete').length),
    syncing,
    online,
    lastError,
    flush,
    insert: (table, row) => enqueue({ type: 'insert', table, row }),
    update: (table, id, changes) => enqueue({ type: 'update', table, id, changes }),
    remove: (table, id) => enqueue({ type: 'delete', table, id })
  }
}
