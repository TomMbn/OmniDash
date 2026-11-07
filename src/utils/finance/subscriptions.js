// Abonnements : prélèvements au même libellé normalisé, montant proche (±10 %), au moins deux mois d'affilée.

import { displayLabel, normalizeLabel } from './normalize.js'
import { diffDays, fromDay, toDay } from './period.js'

const monthIndex = (day) => {
  const [y, m] = day.split('-').map(Number)
  return y * 12 + (m - 1)
}

const close = (a, b, tolerance = 0.1) => Math.abs(a - b) <= Math.max(a, b) * tolerance

// Une hausse de prix reste le même abonnement, jusqu'à +60 %
const raised = (amount, previous) => amount > previous && amount <= previous * 1.6

// Prélèvement, ou paiement par carte d'un service connu pour être un abonnement.
// Un resto ou une enseigne fréquentée chaque mois n'est pas un abonnement.
const DEBIT_ORDER = /\b(PRLV|PRELEVEMENT|PRELEV|ECHEANCE)\b/
const KNOWN_SERVICES = /\b(NETFLIX|SPOTIFY|DEEZER|DISNEY|CANAL|APPLE|ICLOUD|GOOGLE|YOUTUBE|AMAZON PRIME|PRIME VIDEO|AUDIBLE|FREE|SFR|ORANGE|BOUYGUES|SOSH|RED BY SFR|BASIC FIT|FITNESS PARK|NEONESS|ON AIR|UBER ONE|DEEPL|CHATGPT|OPENAI|NOTION|ADOBE|MICROSOFT|XBOX|PLAYSTATION|NINTENDO|TWITCH|DAZN|BEIN|MOLOTOV|LE MONDE|LIBERATION|MEDIAPART)\b/
const looksRecurring = (labelRaw) => {
  const text = String(labelRaw || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
  return DEBIT_ORDER.test(text) || KNOWN_SERVICES.test(text)
}

// Renvoie [{ pattern, name, amount, previous_amount, day, last_seen }]
export function detectSubscriptions(transactions = []) {
  const groups = new Map()
  for (const t of transactions) {
    const amount = Number(t.amount)
    if (!(amount < 0)) continue
    if (t.kind && t.kind !== 'depense') continue
    if (!looksRecurring(t.label_raw)) continue
    const pattern = normalizeLabel(t.label_raw)
    if (!pattern) continue
    if (!groups.has(pattern)) groups.set(pattern, [])
    groups.get(pattern).push({ date: t.date, amount: Math.abs(amount), label_raw: t.label_raw })
  }

  const found = []
  for (const [pattern, list] of groups) {
    list.sort((a, b) => (a.date < b.date ? -1 : 1))
    const months = new Set(list.map((t) => monthIndex(t.date)))
    // Achats fréquents (courses, cafés) : plus de deux opérations par mois en moyenne
    if (list.length / months.size > 2) continue

    // Chaîne la plus récente : un montant par mois, mois consécutifs, montant proche du précédent
    let chain = []
    for (const t of list) {
      const prev = chain[chain.length - 1]
      if (!prev) {
        chain = [t]
        continue
      }
      const gap = monthIndex(t.date) - monthIndex(prev.date)
      if (gap === 0) {
        // Deux opérations le même mois : on garde celle qui ressemble le plus à la précédente
        const before = chain[chain.length - 2]
        if (before && Math.abs(t.amount - before.amount) < Math.abs(prev.amount - before.amount)) chain[chain.length - 1] = t
        continue
      }
      if (gap === 1 && (close(t.amount, prev.amount) || raised(t.amount, prev.amount))) chain.push(t)
      else chain = [t]
    }
    if (chain.length < 2) continue
    const last = chain[chain.length - 1]
    const before = chain[chain.length - 2]
    found.push({
      pattern,
      name: displayLabel(last.label_raw),
      amount: last.amount,
      previous_amount: Math.abs(last.amount - before.amount) >= 0.01 ? before.amount : null,
      day: fromDay(last.date).getDate(),
      last_seen: last.date,
    })
  }
  return found.sort((a, b) => b.amount - a.amount)
}

// Fusionne la détection avec les abonnements enregistrés.
// Le statut choisi par l'utilisateur est conservé ; une hausse garde l'ancien montant dans previous_amount.
export function mergeSubscriptions(existing = [], detected = []) {
  const byPattern = new Map(existing.map((s) => [s.pattern, s]))
  const out = []
  for (const d of detected) {
    const old = byPattern.get(d.pattern)
    if (!old) {
      out.push({ ...d, status: 'detecte' })
      continue
    }
    const oldAmount = Number(old.amount)
    let previous = old.previous_amount ?? null
    if (Math.abs(oldAmount - d.amount) >= 0.01) previous = oldAmount
    else if (d.previous_amount != null) previous = d.previous_amount
    const changed =
      Math.abs(oldAmount - d.amount) >= 0.01 ||
      old.last_seen !== d.last_seen ||
      old.day !== d.day ||
      (old.previous_amount ?? null) !== previous
    if (!changed) continue
    out.push({
      id: old.id,
      pattern: d.pattern,
      name: old.name || d.name,
      amount: d.amount,
      previous_amount: previous,
      day: d.day,
      last_seen: d.last_seen,
      status: old.status || 'detecte',
    })
  }
  return out
}

export const isIncreased = (s) =>
  s.previous_amount != null && Number(s.amount) - Number(s.previous_amount) >= 0.01

// Abonnement vu il y a plus de 70 jours : sans doute résilié
export const isStale = (s, today = new Date()) => {
  if (!s.last_seen) return false
  const todayDay = typeof today === 'string' ? today : toDay(today)
  return diffDays(s.last_seen, todayDay) > 70
}
