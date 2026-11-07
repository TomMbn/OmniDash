import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decodeBuffer, parseAmount, parseDate, parseStatement, parseStatementBuffer } from '../../src/utils/finance/parse.js'

// Données fictives uniquement
const CSV_A = [
  'Code de la banque : 00000;Code de l\'agence : 00000',
  'Date de début de téléchargement : 01/10/2026;Date de fin de téléchargement : 31/10/2026',
  '',
  'Date de comptabilisation;Libelle simplifie;Libelle operation;Reference;Informations complementaires;Type operation;Categorie;Sous categorie;Debit;Credit;Date operation;Date de valeur;Pointage',
  '02/10/2026;CARREFOUR CITY;CB CARREFOUR CITY FACT 011026;REF1;;Carte;Alimentation;Supermarché;-23,45;;01/10/2026;02/10/2026;0',
  '05/10/2026;SOCIETE FICTIVE;VIR SEPA SOCIETE FICTIVE SALAIRE;REF2;;Virement;Revenus;Salaire;;2 150,00;05/10/2026;05/10/2026;0',
  '06/10/2026;CAFE;CB CAFE DU COIN;REF3;;Carte;;;-2,50;;06/10/2026;06/10/2026;0',
  '06/10/2026;CAFE;CB CAFE DU COIN;REF4;;Carte;;;-2,50;;06/10/2026;06/10/2026;0',
  'Solde au 31/10/2026;;;;;;;;;;;;',
].join('\r\n')

const CSV_B = [
  'Compte courant fictif',
  'Date;Numéro d\'opération;Libellé;Débit;Crédit;Détail',
  '03/10/2026;0001;PRLV SEPA NETFLIX;-13,49;;NETFLIX.COM',
  '12/10/2026;0002;VIR INST RE M JEAN DUPONT;;15,00;REMBOURSEMENT',
  '15/10/2026;0003;CB AMAZON PAYMENTS 1410;1 234,56;;',
].join('\n')

const CSV_C = [
  'Date,Libellé,Montant',
  '2026-10-03,"CB BOULANGERIE, PARIS","-4,20"',
  '2026-10-04,VIR LIVRET A,"-100,00"',
].join('\n')

const OFX_SGML = `OFXHEADER:100
DATA:OFXSGML
CHARSET:1252

<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261002
<TRNAMT>-23.45
<FITID>ABC001
<NAME>CB CARREFOUR CITY
<MEMO>FACT 011026
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261005120000[0:GMT]
<TRNAMT>2150,00
<FITID>ABC002
<NAME>VIR SEPA SOCIETE FICTIVE
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`

const OFX_XML = `<?xml version="1.0"?><OFX><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261003</DTPOSTED><TRNAMT>-9.99</TRNAMT><FITID>X1</FITID><NAME>PRLV SPOTIFY &amp; CO</NAME></STMTTRN>
</BANKTRANLIST></OFX>`

test('montants au format français', () => {
  assert.equal(parseAmount('-1 234,56'), -1234.56)
  assert.equal(parseAmount('1 234,56'), 1234.56)
  assert.equal(parseAmount('12,50 €'), 12.5)
  assert.equal(parseAmount('+1.234,56'), 1234.56)
  assert.equal(parseAmount('12.50'), 12.5)
  assert.equal(parseAmount('1.234'), 1234)
  assert.equal(parseAmount(''), null)
  assert.equal(parseAmount('abc'), null)
})

test('dates', () => {
  assert.equal(parseDate('05/10/2026'), '2026-10-05')
  assert.equal(parseDate('5/1/26'), '2026-01-05')
  assert.equal(parseDate('2026-10-05'), '2026-10-05')
  assert.equal(parseDate('20261005120000[0:GMT]'), '2026-10-05')
  assert.equal(parseDate('31/02/2026'), null)
  assert.equal(parseDate('Solde'), null)
})

test('CSV Caisse d\'Épargne, variante détaillée avec en-tête de compte', () => {
  const p = parseStatement(CSV_A, 'releve.csv')
  assert.equal(p.format, 'csv')
  assert.equal(p.rows.length, 4)
  assert.deepEqual(p.period, { start: '2026-10-01', end: '2026-10-06' })
  const [carrefour, salaire] = p.rows
  assert.equal(carrefour.date, '2026-10-01') // date d'opération prioritaire
  assert.equal(carrefour.amount, -23.45)
  assert.equal(carrefour.label_raw, 'CB CARREFOUR CITY FACT 011026')
  assert.equal(carrefour.bank_category, 'Alimentation')
  assert.equal(salaire.amount, 2150)
  assert.ok(p.warnings.some((w) => w.includes('ignorée')))
})

test('CSV variante courte : débit positif rendu négatif, crédit positif', () => {
  const p = parseStatement(CSV_B)
  assert.equal(p.rows.length, 3)
  assert.equal(p.rows[0].amount, -13.49)
  assert.equal(p.rows[0].detail, 'NETFLIX.COM')
  assert.equal(p.rows[1].amount, 15)
  assert.equal(p.rows[2].amount, -1234.56)
})

test('CSV séparé par des virgules avec colonne Montant signée', () => {
  const p = parseStatement(CSV_C)
  assert.equal(p.rows.length, 2)
  assert.equal(p.rows[0].label_raw, 'CB BOULANGERIE, PARIS')
  assert.equal(p.rows[0].amount, -4.2)
  assert.equal(p.rows[1].date, '2026-10-04')
})

test('encodage Windows-1252', () => {
  const header = 'Date;Libell\xe9;D\xe9bit;Cr\xe9dit\n01/10/2026;CB CAF\xc9 R\xc9PUBLIQUE;-3,00;\n'
  const bytes = Uint8Array.from(header, (c) => c.charCodeAt(0))
  assert.ok(decodeBuffer(bytes).includes('Libellé'))
  const p = parseStatementBuffer(bytes, 'x.csv')
  assert.equal(p.rows[0].label_raw, 'CB CAFÉ RÉPUBLIQUE')
})

test('UTF-8 avec BOM', () => {
  const bytes = new TextEncoder().encode('﻿Date;Libellé;Montant\n01/10/2026;CB TEST;-1,00\n')
  assert.equal(parseStatementBuffer(bytes).rows.length, 1)
})

test('OFX SGML', () => {
  const p = parseStatement(OFX_SGML, 'releve.ofx')
  assert.equal(p.format, 'ofx')
  assert.equal(p.rows.length, 2)
  assert.equal(p.rows[0].amount, -23.45)
  assert.equal(p.rows[0].import_hash, 'fitid:ABC001')
  assert.equal(p.rows[0].detail, 'FACT 011026')
  assert.equal(p.rows[1].date, '2026-10-05')
  assert.equal(p.rows[1].amount, 2150)
})

test('OFX XML', () => {
  const p = parseStatement(OFX_XML, 'x.ofx')
  assert.equal(p.rows.length, 1)
  assert.equal(p.rows[0].label_raw, 'PRLV SPOTIFY & CO')
  assert.equal(p.rows[0].amount, -9.99)
})

test('fichier illisible : erreur en français', () => {
  assert.throws(() => parseStatement('bonjour;monde\n1;2'), /introuvable/)
  assert.throws(() => parseStatement('   '), /vide/)
})

test('empreintes : deux cafés identiques le même jour restent distincts', () => {
  const p = parseStatement(CSV_A)
  const hashes = p.rows.map((r) => r.import_hash)
  assert.equal(new Set(hashes).size, hashes.length)
})

test('empreintes stables : un même fichier réimporté donne les mêmes empreintes', () => {
  const a = parseStatement(CSV_A).rows.map((r) => r.import_hash)
  const b = parseStatement(CSV_A).rows.map((r) => r.import_hash)
  assert.deepEqual(a, b)
  // Simulation de la contrainte unique (user_id, import_hash)
  const stored = new Set(a)
  const again = b.filter((h) => !stored.has(h))
  assert.equal(again.length, 0)
})

test('empreintes : fichiers qui se chevauchent', () => {
  const head = 'Date;Libellé;Montant\n'
  const f1 = head + '01/10/2026;CB CAFE;-2,50\n06/10/2026;CB CAFE;-2,50\n06/10/2026;CB CAFE;-2,50\n'
  const f2 = head + '06/10/2026;CB CAFE;-2,50\n06/10/2026;CB CAFE;-2,50\n07/10/2026;CB CAFE;-2,50\n'
  const h1 = new Set(parseStatement(f1).rows.map((r) => r.import_hash))
  const fresh = parseStatement(f2).rows.filter((r) => !h1.has(r.import_hash))
  assert.equal(fresh.length, 1)
  assert.equal(fresh[0].date, '2026-10-07')
})
