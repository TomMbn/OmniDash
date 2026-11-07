import { computed, ref, watch } from 'vue'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'
import { localDay } from '@/utils/date'
import { parseStatementBuffer } from '@/utils/finance/parse'
import { displayLabel as displayOf } from '@/utils/finance/normalize'
import { DEFAULT_CATEGORIES, applyAiResult, categorize, matchRule, rulePattern } from '@/utils/finance/categorize'
import { addMonths, computePeriod, detectIncome, monthStart, previousPeriods } from '@/utils/finance/period'
import { detectSubscriptions, isIncreased, isStale, mergeSubscriptions } from '@/utils/finance/subscriptions'
import {
  candidateExpenses,
  computeByCategory,
  computeTotals,
  suggestBudgets as suggestBudgetsFrom,
} from '@/utils/finance/budgets'
import { computePatrimoine } from '@/utils/finance/patrimoine'

// ── État partagé ──

const loading = ref(false)
const error = ref(null)
const ready = ref(true)
const accounts = ref([])
const allCategories = ref([])
const transactions = ref([])
const rules = ref([])
const subscriptions = ref([])
const holdingValues = ref([])
const today = ref(localDay())

let loadedFor = null
let pending = null

const BATCH = 200
const PAGE = 1000
const AI_TIMEOUT = 6000

// Table absente : la migration n'a pas encore été exécutée
const isMissingTable = (err) => {
  if (!err) return false
  const msg = `${err.message || ''} ${err.details || ''}`
  return err.code === '42P01' || err.code === 'PGRST205' || /does not exist|schema cache/i.test(msg)
}

const fail = (context, err) => {
  if (isMissingTable(err)) {
    ready.value = false
    error.value = null
    return 'Module en cours d’installation.'
  }
  const message = `${context} : ${err?.message || 'erreur inconnue'}`
  error.value = message
  return message
}

const chunks = (list, size = BATCH) => {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

const byPosition = (a, b) => (a.position ?? 0) - (b.position ?? 0) || String(a.name).localeCompare(String(b.name), 'fr')

const reset = () => {
  accounts.value = []
  allCategories.value = []
  transactions.value = []
  rules.value = []
  subscriptions.value = []
  holdingValues.value = []
  error.value = null
  ready.value = true
  loadedFor = null
}

// ── Chargement ──

// Transactions des 13 derniers mois, par pages (la limite serveur est de 1000 lignes)
async function fetchTransactions() {
  const since = addMonths(monthStart(localDay()), -13)
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error: err } = await supabase
      .from('finance_transactions')
      .select('*')
      .gte('date', since)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1)
    if (err) return { error: err }
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return { data: rows }
}

async function ensureDefaultCategories() {
  if (allCategories.value.length) return
  const payload = DEFAULT_CATEGORIES.map((name, position) => ({ name, position }))
  const { data, error: err } = await supabase.from('finance_categories').insert(payload).select()
  if (err) return fail('Création des catégories impossible', err)
  allCategories.value = data
}

async function doLoad() {
  loading.value = true
  error.value = null
  today.value = localDay()
  try {
    const [acc, cat, tx, rul, sub, hold] = await Promise.all([
      supabase.from('finance_accounts').select('*').order('position'),
      supabase.from('finance_categories').select('*').order('position'),
      fetchTransactions(),
      supabase.from('finance_rules').select('*'),
      supabase.from('finance_subscriptions').select('*'),
      supabase.from('finance_holding_values').select('*').order('month'),
    ])
    const results = [acc, cat, tx, rul, sub, hold]
    const missing = results.find((r) => isMissingTable(r.error))
    if (missing) {
      ready.value = false
      return
    }
    ready.value = true
    const failed = results.find((r) => r.error)
    if (failed) {
      fail('Chargement des finances impossible', failed.error)
      return
    }
    accounts.value = acc.data
    allCategories.value = cat.data
    transactions.value = tx.data
    rules.value = rul.data
    subscriptions.value = sub.data
    holdingValues.value = hold.data
    await ensureDefaultCategories()
  } catch (err) {
    fail('Chargement des finances impossible', err)
  } finally {
    loading.value = false
  }
}

async function load(force = false) {
  const { user } = useAuth()
  const userId = user.value?.id
  if (!userId) return { ok: false, error: 'Connexion requise.' }
  if (pending) {
    await pending
    if (!force) return { ok: !error.value }
  }
  if (!force && loadedFor === userId) return { ok: !error.value }
  loadedFor = userId
  pending = doLoad()
  try {
    await pending
  } finally {
    pending = null
  }
  return { ok: !error.value && ready.value, error: error.value }
}

// Rechargement des seules transactions (après import ou reclassement)
async function reloadTransactions() {
  const res = await fetchTransactions()
  if (res.error) {
    fail('Rechargement des opérations impossible', res.error)
    return false
  }
  transactions.value = res.data
  return true
}

const { user } = useAuth()
watch(user, (u) => {
  if (!u) {
    reset()
    return
  }
  if (u.id !== loadedFor) {
    reset()
    load()
  }
}, { immediate: true })

// ── Vues calculées ──

const categories = computed(() => allCategories.value.filter((c) => !c.archived).sort(byPosition))

const period = computed(() => {
  const { incomeDates, ...p } = computePeriod(transactions.value, today.value)
  return p
})

// Période complète (avec les dates du revenu) pour remonter dans le temps
const periodFull = computed(() => computePeriod(transactions.value, today.value))

const totals = computed(() => computeTotals(transactions.value, categories.value, period.value))

const byCategory = computed(() => computeByCategory(transactions.value, categories.value, period.value))

const toReview = computed(() =>
  transactions.value
    .filter((t) => t.status === 'verifier')
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
)

const withFlags = (s) => ({ ...s, increased: isIncreased(s), stale: isStale(s, today.value) })

const subscriptionsActive = computed(() =>
  subscriptions.value
    .filter((s) => s.status === 'confirme' && !isStale(s, today.value))
    .map(withFlags)
    .sort((a, b) => Number(b.amount) - Number(a.amount)),
)

const subscriptionsNew = computed(() =>
  subscriptions.value
    .filter((s) => s.status === 'detecte' && !isStale(s, today.value))
    .map(withFlags)
    .sort((a, b) => Number(b.amount) - Number(a.amount)),
)

const subscriptionsTotal = computed(() =>
  Math.round(subscriptionsActive.value.reduce((s, x) => s + Number(x.amount), 0) * 100) / 100,
)

const patrimoine = computed(() => computePatrimoine(accounts.value, holdingValues.value, today.value))

const hasData = computed(() => transactions.value.length > 0)

// ── Import ──

async function parseFile(file) {
  if (!file) throw new Error('Aucun fichier sélectionné.')
  let buffer
  try {
    buffer = await file.arrayBuffer()
  } catch {
    throw new Error('Lecture du fichier impossible.')
  }
  const parsed = parseStatementBuffer(buffer, file.name || '')
  return {
    ...parsed,
    rows: parsed.rows.map((r) => ({ ...r })),
  }
}

async function ensureCurrentAccount() {
  const existing = accounts.value.find((a) => a.kind === 'courant')
  if (existing) return existing
  const { data, error: err } = await supabase
    .from('finance_accounts')
    .insert({ name: 'Compte courant', kind: 'courant', position: 0 })
    .select()
    .single()
  if (err) {
    fail('Création du compte courant impossible', err)
    return null
  }
  accounts.value = [...accounts.value, data]
  return data
}

// IA facultative : délai court, repli silencieux si la fonction n'est pas déployée
async function aiCategorize(labels) {
  if (!labels.length) return new Map()
  try {
    const call = supabase.functions.invoke('categorize-transactions', {
      body: { labels: labels.slice(0, 150), categories: categories.value.map((c) => c.name) },
    })
    const timeout = new Promise((resolve) => setTimeout(() => resolve({ data: null, error: 'timeout' }), AI_TIMEOUT))
    const { data, error: err } = await Promise.race([call, timeout])
    if (err || !Array.isArray(data?.results)) return new Map()
    return new Map(data.results.filter((r) => r && r.label).map((r) => [r.label, r]))
  } catch {
    return new Map()
  }
}

const emptyImport = (extra = {}) => ({ imported: 0, duplicates: 0, autoClassified: 0, toReview: 0, incomeDetectedOn: null, ...extra })

async function refreshSubscriptions() {
  const detected = detectSubscriptions(transactions.value)
  const changes = mergeSubscriptions(subscriptions.value, detected)
  if (!changes.length) return true
  const { data, error: err } = await supabase
    .from('finance_subscriptions')
    .upsert(changes.map(({ id, ...rest }) => ({ ...rest, user_id: user.value?.id })), { onConflict: 'user_id,pattern' })
    .select()
  if (err) {
    fail('Mise à jour des abonnements impossible', err)
    return false
  }
  const map = new Map(subscriptions.value.map((s) => [s.pattern, s]))
  for (const s of data) map.set(s.pattern, s)
  subscriptions.value = [...map.values()]
  return true
}

async function importRows(parsed, { fileName } = {}) {
  if (!user.value?.id) return emptyImport({ error: fail('Import impossible', { message: 'connexion requise' }) })
  if (!ready.value) return emptyImport({ error: 'Module en cours d’installation.' })
  const rows = parsed?.rows || []
  if (!rows.length) return emptyImport()
  error.value = null

  if (loadedFor !== user.value.id || !allCategories.value.length) await load(true)
  if (!ready.value) return emptyImport({ error: 'Module en cours d’installation.' })
  const account = await ensureCurrentAccount()
  if (!account) return emptyImport({ error: error.value })

  // Fiche d'import
  const { data: imp, error: impErr } = await supabase
    .from('finance_imports')
    .insert({
      file_name: fileName || null,
      format: parsed.format || null,
      period_start: parsed.period?.start || null,
      period_end: parsed.period?.end || null,
      row_count: rows.length,
    })
    .select()
    .single()
  if (impErr) return emptyImport({ error: fail('Import impossible', impErr) })

  // Classement : règles, dictionnaire, puis IA sur les dépenses restées sans catégorie
  const cats = categories.value
  const classified = rows.map((r) => ({ row: r, result: categorize(r, { rules: rules.value, categories: cats }) }))
  const uncertain = classified.filter((c) => c.result.status === 'verifier' && c.result.kind === 'depense')
  const labels = [...new Set(uncertain.map((c) => c.result.label))]
  const ai = await aiCategorize(labels)
  if (ai.size) {
    for (const c of uncertain) c.result = applyAiResult(c.result, ai.get(c.result.label), cats)
  }

  const payload = classified.map(({ row, result }) => ({
    user_id: user.value.id,
    account_id: account.id,
    date: row.date,
    amount: row.amount,
    label_raw: row.label_raw,
    label: displayOf(row.label_raw),
    category_id: result.category_id,
    kind: result.kind,
    status: result.status,
    import_hash: row.import_hash,
    import_id: imp.id,
  }))

  let imported = 0
  let autoClassified = 0
  let reviewCount = 0
  for (const batch of chunks(payload)) {
    const { data, error: err } = await supabase
      .from('finance_transactions')
      .upsert(batch, { onConflict: 'user_id,import_hash', ignoreDuplicates: true })
      .select('id, status')
    if (err) {
      const message = fail('Enregistrement des opérations interrompu', err)
      await reloadTransactions()
      return emptyImport({ imported, duplicates: 0, autoClassified, toReview: reviewCount, error: message })
    }
    imported += data.length
    autoClassified += data.filter((d) => d.status === 'auto').length
    reviewCount += data.filter((d) => d.status === 'verifier').length
  }
  const duplicates = rows.length - imported

  const { error: updErr } = await supabase
    .from('finance_imports')
    .update({ imported, duplicates })
    .eq('id', imp.id)
  if (updErr) fail('Mise à jour de la fiche d’import impossible', updErr)

  await reloadTransactions()
  await refreshSubscriptions()
  const income = detectIncome(transactions.value, today.value)

  return { imported, duplicates, autoClassified, toReview: reviewCount, incomeDetectedOn: income?.lastDate ?? null }
}

// ── Classement manuel ──

const patchLocal = (ids, fields) => {
  const set = new Set(ids)
  transactions.value = transactions.value.map((t) => (set.has(t.id) ? { ...t, ...fields } : t))
}

async function classify(transactionId, { categoryId, kind, remember = false } = {}) {
  const tx = transactions.value.find((t) => t.id === transactionId)
  if (!tx) return { ok: false, error: 'Opération introuvable.' }
  const fields = { status: 'confirme' }
  if (categoryId !== undefined) fields.category_id = categoryId
  if (kind) fields.kind = kind
  if (kind && kind !== 'remboursement') fields.linked_id = null
  if (fields.kind && fields.kind !== 'depense' && fields.kind !== 'remboursement' && categoryId === undefined) fields.category_id = null

  const { error: err } = await supabase.from('finance_transactions').update(fields).eq('id', transactionId)
  if (err) return { ok: false, error: fail('Classement impossible', err) }
  patchLocal([transactionId], fields)

  if (!remember) return { ok: true, reclassified: 0 }

  // Règle sur le libellé normalisé, puis reclassement des opérations à vérifier qui correspondent
  const pattern = rulePattern(tx.label_raw)
  const ruleFields = {
    pattern,
    category_id: fields.category_id !== undefined ? fields.category_id : tx.category_id ?? null,
    kind: fields.kind || tx.kind || null,
  }
  const existing = rules.value.find((r) => r.pattern === pattern)
  const query = existing
    ? supabase.from('finance_rules').update(ruleFields).eq('id', existing.id).select().single()
    : supabase.from('finance_rules').insert(ruleFields).select().single()
  const { data: rule, error: ruleErr } = await query
  if (ruleErr) return { ok: false, error: fail('Enregistrement de la règle impossible', ruleErr) }
  rules.value = existing ? rules.value.map((r) => (r.id === rule.id ? rule : r)) : [...rules.value, rule]

  const matching = transactions.value.filter(
    (t) => t.id !== transactionId && t.status === 'verifier' && matchRule(t.label_raw, [rule]),
  )
  const update = { status: 'auto', category_id: rule.category_id, kind: rule.kind || 'depense' }
  let reclassified = 0
  for (const batch of chunks(matching.map((t) => t.id))) {
    const { error: upErr } = await supabase.from('finance_transactions').update(update).in('id', batch)
    if (upErr) return { ok: false, reclassified, error: fail('Reclassement impossible', upErr) }
    patchLocal(batch, update)
    reclassified += batch.length
  }
  return { ok: true, reclassified }
}

async function linkRefund(refundId, expenseId) {
  const expense = transactions.value.find((t) => t.id === expenseId)
  const fields = {
    kind: 'remboursement',
    linked_id: expenseId,
    status: 'confirme',
    category_id: expense?.category_id ?? null,
  }
  const { error: err } = await supabase.from('finance_transactions').update(fields).eq('id', refundId)
  if (err) return { ok: false, error: fail('Liaison du remboursement impossible', err) }
  patchLocal([refundId], fields)
  return { ok: true }
}

function candidateExpensesFor(refund) {
  const r = typeof refund === 'string' ? transactions.value.find((t) => t.id === refund) : refund
  return candidateExpenses(transactions.value, r)
}

// ── Budgets ──

function suggestBudgets() {
  const periods = previousPeriods(periodFull.value, 3)
  return suggestBudgetsFrom(transactions.value, categories.value, periods)
}

const patchCategory = (id, fields) => {
  allCategories.value = allCategories.value.map((c) => (c.id === id ? { ...c, ...fields } : c))
}

async function setBudget(categoryId, amount) {
  const value = Number(amount) > 0 ? Math.round(Number(amount) * 100) / 100 : null
  const { error: err } = await supabase.from('finance_categories').update({ budget: value }).eq('id', categoryId)
  if (err) return { ok: false, error: fail('Enregistrement du budget impossible', err) }
  patchCategory(categoryId, { budget: value })
  return { ok: true }
}

async function applyBudgets(list = []) {
  const results = await Promise.all(list.map((b) => setBudget(b.categoryId, b.amount)))
  const failed = results.find((r) => !r.ok)
  return failed ? { ok: false, error: failed.error } : { ok: true }
}

// ── Catégories ──

async function addCategory(name) {
  const clean = String(name || '').trim()
  if (!clean) return { ok: false, error: 'Nom de catégorie vide.' }
  const archived = allCategories.value.find((c) => c.archived && c.name.toLowerCase() === clean.toLowerCase())
  if (archived) {
    const { error: err } = await supabase.from('finance_categories').update({ archived: false }).eq('id', archived.id)
    if (err) return { ok: false, error: fail('Ajout de la catégorie impossible', err) }
    patchCategory(archived.id, { archived: false })
    return { ok: true, category: { ...archived, archived: false } }
  }
  const position = allCategories.value.reduce((m, c) => Math.max(m, c.position ?? 0), -1) + 1
  const { data, error: err } = await supabase.from('finance_categories').insert({ name: clean, position }).select().single()
  if (err) return { ok: false, error: fail('Ajout de la catégorie impossible', err) }
  allCategories.value = [...allCategories.value, data]
  return { ok: true, category: data }
}

async function renameCategory(id, name) {
  const clean = String(name || '').trim()
  if (!clean) return { ok: false, error: 'Nom de catégorie vide.' }
  const { error: err } = await supabase.from('finance_categories').update({ name: clean }).eq('id', id)
  if (err) return { ok: false, error: fail('Renommage impossible', err) }
  patchCategory(id, { name: clean })
  return { ok: true }
}

async function archiveCategory(id) {
  const { error: err } = await supabase.from('finance_categories').update({ archived: true }).eq('id', id)
  if (err) return { ok: false, error: fail('Archivage impossible', err) }
  patchCategory(id, { archived: true })
  return { ok: true }
}

// ── Abonnements ──

async function setSubscriptionStatus(id, status) {
  const { error: err } = await supabase.from('finance_subscriptions').update({ status }).eq('id', id)
  if (err) return { ok: false, error: fail('Mise à jour de l’abonnement impossible', err) }
  subscriptions.value = subscriptions.value.map((s) => (s.id === id ? { ...s, status } : s))
  return { ok: true }
}

const confirmSubscription = (id) => setSubscriptionStatus(id, 'confirme')
const ignoreSubscription = (id) => setSubscriptionStatus(id, 'ignore')

// ── Patrimoine ──

async function addAccount({ name, kind = 'autre' } = {}) {
  const clean = String(name || '').trim()
  if (!clean) return { ok: false, error: 'Nom du compte vide.' }
  const allowed = ['courant', 'pea', 'livret', 'autre']
  const position = accounts.value.reduce((m, a) => Math.max(m, a.position ?? 0), -1) + 1
  const { data, error: err } = await supabase
    .from('finance_accounts')
    .insert({ name: clean, kind: allowed.includes(kind) ? kind : 'autre', position })
    .select()
    .single()
  if (err) return { ok: false, error: fail('Ajout du compte impossible', err) }
  accounts.value = [...accounts.value, data]
  return { ok: true, account: data }
}

async function saveHoldingValues(month, list = []) {
  if (!user.value?.id) return { ok: false, error: 'Connexion requise.' }
  const m = monthStart(month || localDay())
  const payload = list
    .filter((v) => v.accountId && v.value !== '' && v.value !== null && v.value !== undefined && Number.isFinite(Number(v.value)))
    .map((v) => ({ user_id: user.value.id, account_id: v.accountId, month: m, value: Math.round(Number(v.value) * 100) / 100 }))
  if (!payload.length) return { ok: true }
  const { data, error: err } = await supabase
    .from('finance_holding_values')
    .upsert(payload, { onConflict: 'account_id,month' })
    .select()
  if (err) return { ok: false, error: fail('Enregistrement des valeurs impossible', err) }
  const key = (v) => `${v.account_id}|${monthStart(v.month)}`
  const map = new Map(holdingValues.value.map((v) => [key(v), v]))
  for (const v of data) map.set(key(v), v)
  holdingValues.value = [...map.values()].sort((a, b) => (a.month < b.month ? -1 : 1))
  return { ok: true }
}

// ── Composable ──

export function useFinance() {
  return {
    loading,
    error,
    ready,
    accounts,
    categories,
    transactions,
    rules,
    subscriptions,
    holdingValues,
    period,
    totals,
    byCategory,
    toReview,
    subscriptionsActive,
    subscriptionsNew,
    subscriptionsTotal,
    patrimoine,
    hasData,
    load,
    parseFile,
    importRows,
    classify,
    linkRefund,
    candidateExpensesFor,
    suggestBudgets,
    applyBudgets,
    setBudget,
    addCategory,
    renameCategory,
    archiveCategory,
    confirmSubscription,
    ignoreSubscription,
    addAccount,
    saveHoldingValues,
  }
}
