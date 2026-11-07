// Lecture des relevés bancaires (CSV Caisse d'Épargne et OFX).
// Tout est pur : on reçoit du texte ou des octets, on renvoie des lignes { date, amount, label_raw, import_hash }.

import { basicNormalize, stripAccents } from './normalize.js'

// ── Décodage ──

// UTF-8 d'abord, Windows-1252 si des caractères de remplacement apparaissent
export function decodeBuffer(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let text = new TextDecoder('utf-8').decode(bytes)
  if (text.includes('�')) {
    try {
      text = new TextDecoder('windows-1252').decode(bytes)
    } catch {
      // Décodeur absent : on garde l'UTF-8
    }
  }
  return text.replace(/^﻿/, '')
}

// ── Valeurs ──

const pad = (n) => String(n).padStart(2, '0')

const validDay = (y, m, d) => {
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1) return null
  const last = new Date(y, m, 0).getDate()
  if (d > last) return null
  return `${y}-${pad(m)}-${pad(d)}`
}

// JJ/MM/AAAA, JJ/MM/AA, JJ-MM-AAAA, AAAA-MM-JJ, AAAAMMJJ (OFX)
export function parseDate(value) {
  const s = String(value ?? '').trim()
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})\b/)
  if (m) {
    let y = +m[3]
    if (m[3].length === 2) y += 2000
    return validDay(y, +m[2], +m[1])
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\b/)
  if (m) return validDay(+m[1], +m[2], +m[3])
  m = s.match(/^(\d{4})(\d{2})(\d{2})/)
  if (m) return validDay(+m[1], +m[2], +m[3])
  return null
}

// Montant au format français : « -1 234,56 », « 12,50 € », « +1.234,56 », « 12.50 »
export function parseAmount(value) {
  let s = String(value ?? '').trim()
  if (!s) return null
  s = s.replace(/[\s  ']/g, '').replace(/€|EUR/gi, '')
  let negative = false
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1)
  }
  if (s.endsWith('-')) {
    negative = true
    s = s.slice(0, -1)
  }
  if (s.startsWith('-')) {
    negative = !negative
    s = s.slice(1)
  } else if (s.startsWith('+')) {
    s = s.slice(1)
  }
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null
  const hasComma = s.includes(',')
  const hasDot = s.includes('.')
  if (hasComma && hasDot) {
    // Le dernier séparateur est la décimale
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else if (hasComma) {
    if ((s.match(/,/g) || []).length > 1) return null
    s = s.replace(',', '.')
  } else if (hasDot) {
    const parts = s.split('.')
    // 1.234 ou 1.234.567 : séparateur de milliers
    if (parts.length > 2 || parts[parts.length - 1].length === 3) s = parts.join('')
  }
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  const rounded = Math.round(n * 100) / 100
  return negative ? -rounded : rounded
}

// ── Empreinte d'import ──

// Hachage 53 bits rapide et déterministe
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0')
}

export const hashString = (s) => cyrb53(s, 0) + cyrb53(s, 7919)

// FITID si présent ; sinon date + montant + libellé + rang du même triplet dans le fichier.
// Les lignes doivent être dans l'ordre du fichier.
export function assignImportHashes(rows) {
  const seen = new Map()
  const fitids = new Set()
  const out = []
  const warnings = []
  for (const row of rows) {
    if (row.fitid) {
      if (fitids.has(row.fitid)) {
        warnings.push(`Opération en double ignorée (identifiant ${row.fitid}).`)
        continue
      }
      fitids.add(row.fitid)
      out.push({ ...row, import_hash: `fitid:${row.fitid}` })
      continue
    }
    const key = `${row.date}|${row.amount.toFixed(2)}|${basicNormalize(row.label_raw)}`
    const rank = seen.get(key) ?? 0
    seen.set(key, rank + 1)
    out.push({ ...row, import_hash: `h:${hashString(`${key}|${rank}`)}` })
  }
  return { rows: out, warnings }
}

// ── CSV ──

// Découpe tout le texte en lignes de cellules, guillemets compris
export function splitCsv(text, sep) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else quoted = false
      } else cell += c
      continue
    }
    if (c === '"' && cell.trim() === '') {
      quoted = true
      cell = ''
    } else if (c === sep) {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.map((r) => r.map((v) => v.trim()))
}

// En-tête comparable : minuscules, sans accents ni ponctuation
const headerKey = (h) => stripAccents(h).toLowerCase().replace(/[^a-z0-9]/g, '')

const HEADER_ALIASES = {
  dateOperation: ['dateoperation', 'datedoperation'],
  dateCompta: ['datedecomptabilisation', 'datecomptabilisation', 'datecomptable', 'date'],
  dateValeur: ['datedevaleur', 'datevaleur'],
  label: ['libelleoperation', 'libelledoperation', 'libelle', 'intitule', 'description', 'nature', 'naturedeloperation'],
  labelSimple: ['libellesimplifie'],
  detail: ['detail', 'details', 'informationscomplementaires', 'complement'],
  debit: ['debit', 'debiteuros', 'debiteur', 'debiteur', 'montantdebit'],
  credit: ['credit', 'crediteuros', 'crediteur', 'montantcredit'],
  amount: ['montant', 'montanteuros', 'montanteur', 'montantdeloperation', 'valeur'],
  category: ['categorie'],
}

function mapHeaders(cells) {
  const keys = cells.map(headerKey)
  const map = {}
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) {
      const idx = keys.indexOf(alias)
      if (idx !== -1) {
        map[field] = idx
        break
      }
    }
  }
  const hasDate = map.dateOperation !== undefined || map.dateCompta !== undefined || map.dateValeur !== undefined
  const hasLabel = map.label !== undefined || map.labelSimple !== undefined || map.detail !== undefined
  const hasAmount = map.amount !== undefined || map.debit !== undefined || map.credit !== undefined
  return hasDate && hasLabel && hasAmount ? map : null
}

// Cherche le séparateur et la ligne d'en-tête du tableau
function findTable(text) {
  const head = text.split(/\r?\n/).slice(0, 60)
  for (const sep of [';', ',', '\t']) {
    for (let i = 0; i < head.length; i++) {
      if (!head[i].includes(sep)) continue
      const cells = splitCsv(head[i], sep)[0] || []
      const map = mapHeaders(cells)
      if (map) return { sep, map, headerLine: i }
    }
  }
  return null
}

export function parseCsv(text) {
  const table = findTable(text)
  if (!table) {
    throw new Error("Tableau d'opérations introuvable : le fichier doit contenir une ligne d'en-tête avec une date, un libellé et un montant (ou débit et crédit).")
  }
  const { sep, map, headerLine } = table
  const lines = text.split(/\r?\n/)
  const body = lines.slice(headerLine + 1).join('\n')
  const records = splitCsv(body, sep)
  const rows = []
  const warnings = []
  let skipped = 0

  const cell = (rec, field) => (map[field] !== undefined ? rec[map[field]] ?? '' : '')

  for (const rec of records) {
    if (!rec.some((v) => v)) continue
    const date =
      parseDate(cell(rec, 'dateOperation')) ||
      parseDate(cell(rec, 'dateCompta')) ||
      parseDate(cell(rec, 'dateValeur'))
    let amount = null
    if (map.amount !== undefined) {
      amount = parseAmount(cell(rec, 'amount'))
    }
    if (amount === null) {
      const debit = parseAmount(cell(rec, 'debit'))
      const credit = parseAmount(cell(rec, 'credit'))
      if (debit) amount = -Math.abs(debit)
      else if (credit) amount = Math.abs(credit)
      else if (debit === 0 || credit === 0) amount = 0
    }
    const label = cell(rec, 'label') || cell(rec, 'labelSimple') || cell(rec, 'detail')
    if (!date || amount === null || !label) {
      // Lignes de solde ou de total en fin de fichier : ignorées
      skipped++
      continue
    }
    if (amount === 0) {
      skipped++
      continue
    }
    const detail = [cell(rec, 'labelSimple'), cell(rec, 'detail')].filter((d) => d && d !== label).join(' ')
    const row = { date, amount, label_raw: label.replace(/\s+/g, ' ').trim() }
    if (detail) row.detail = detail
    const bankCategory = cell(rec, 'category')
    if (bankCategory) row.bank_category = bankCategory
    rows.push(row)
  }
  if (skipped) warnings.push(`${skipped} ligne${skipped > 1 ? 's' : ''} sans date ou sans montant ignorée${skipped > 1 ? 's' : ''}.`)
  return { rows, warnings }
}

// ── OFX (SGML ou XML) ──

const decodeEntities = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')

function ofxField(block, tag) {
  const m = block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i'))
  return m ? decodeEntities(m[1]).trim() : ''
}

export function parseOfx(text) {
  const blocks = text.match(/<STMTTRN>[\s\S]*?(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>|$)/gi) || []
  if (!blocks.length) throw new Error('Aucune opération trouvée dans ce fichier OFX.')
  const rows = []
  let skipped = 0
  for (const block of blocks) {
    const date = parseDate(ofxField(block, 'DTPOSTED')) || parseDate(ofxField(block, 'DTUSER'))
    const amount = parseAmount(ofxField(block, 'TRNAMT'))
    const name = ofxField(block, 'NAME')
    const memo = ofxField(block, 'MEMO')
    const label = name || memo
    if (!date || amount === null || amount === 0 || !label) {
      skipped++
      continue
    }
    const row = { date, amount, label_raw: label.replace(/\s+/g, ' ') }
    if (memo && memo !== label) row.detail = memo
    const fitid = ofxField(block, 'FITID')
    if (fitid) row.fitid = fitid
    rows.push(row)
  }
  const warnings = skipped ? [`${skipped} opération${skipped > 1 ? 's' : ''} incomplète${skipped > 1 ? 's' : ''} ignorée${skipped > 1 ? 's' : ''}.`] : []
  return { rows, warnings }
}

// ── Point d'entrée ──

export const isOfx = (text, fileName = '') =>
  /\.(ofx|qfx)$/i.test(fileName) || /OFXHEADER|<OFX>/i.test(text.slice(0, 2000))

export function parseStatement(text, fileName = '') {
  if (!text || !text.trim()) throw new Error('Le fichier est vide.')
  const format = isOfx(text, fileName) ? 'ofx' : 'csv'
  const parsed = format === 'ofx' ? parseOfx(text) : parseCsv(text)
  if (!parsed.rows.length) throw new Error("Aucune opération lisible dans ce fichier.")
  const { rows, warnings } = assignImportHashes(parsed.rows)
  const dates = rows.map((r) => r.date).sort()
  return {
    format,
    rows,
    warnings: [...parsed.warnings, ...warnings],
    period: { start: dates[0], end: dates[dates.length - 1] },
  }
}

export function parseStatementBuffer(buffer, fileName = '') {
  return parseStatement(decodeBuffer(buffer), fileName)
}
