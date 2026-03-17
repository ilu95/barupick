#!/usr/bin/env node
/**
 * i18n Key Checker — BaruPick
 *
 * Compares translation keys across all languages and namespaces.
 * Reports missing, extra, and empty-value keys.
 *
 * Usage:
 *   node scripts/i18n/check.mjs              # check all languages
 *   node scripts/i18n/check.mjs --lang ja    # check only Japanese
 *   node scripts/i18n/check.mjs --verbose    # show all keys, not just issues
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const I18N_DIR = path.resolve(__dirname, '../../src/i18n')
const BASE_LANG = 'ko'
const NAMESPACES = ['ui', 'colors', 'categories', 'styles', 'bodyType', 'personalColor']

// Parse args
const args = process.argv.slice(2)
const verbose = args.includes('--verbose')
const langIdx = args.indexOf('--lang')
const filterLang = langIdx >= 0 ? args[langIdx + 1] : null

// Get all language dirs
function getLangs() {
  return fs.readdirSync(I18N_DIR)
    .filter(d => fs.statSync(path.join(I18N_DIR, d)).isDirectory())
    .filter(d => !filterLang || d === filterLang || d === BASE_LANG)
}

// Flatten nested JSON to dot-notation keys
function flatten(obj, prefix = '') {
  const result = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flatten(v, key))
    } else {
      result[key] = v
    }
  }
  return result
}

function loadNamespace(lang, ns) {
  const filePath = path.join(I18N_DIR, lang, `${ns}.json`)
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

// Main
const langs = getLangs()
const otherLangs = langs.filter(l => l !== BASE_LANG)

let totalMissing = 0
let totalExtra = 0
let totalEmpty = 0

console.log(`\n🔍 i18n Key Check — base: ${BASE_LANG}, comparing: ${otherLangs.join(', ')}\n`)

for (const ns of NAMESPACES) {
  const baseRaw = loadNamespace(BASE_LANG, ns)
  if (!baseRaw) {
    console.log(`⚠️  ${BASE_LANG}/${ns}.json not found, skipping`)
    continue
  }
  const baseKeys = flatten(baseRaw)
  const baseKeySet = new Set(Object.keys(baseKeys))

  for (const lang of otherLangs) {
    const langRaw = loadNamespace(lang, ns)
    if (!langRaw) {
      console.log(`❌ ${lang}/${ns}.json — FILE MISSING`)
      totalMissing += baseKeySet.size
      continue
    }

    const langKeys = flatten(langRaw)
    const langKeySet = new Set(Object.keys(langKeys))

    const missing = [...baseKeySet].filter(k => !langKeySet.has(k))
    const extra = [...langKeySet].filter(k => !baseKeySet.has(k))
    const empty = [...langKeySet].filter(k => langKeys[k] === '' || langKeys[k] === null)

    totalMissing += missing.length
    totalExtra += extra.length
    totalEmpty += empty.length

    if (missing.length === 0 && extra.length === 0 && empty.length === 0) {
      if (verbose) console.log(`✅ ${lang}/${ns}.json — ${langKeySet.size} keys OK`)
      continue
    }

    console.log(`📋 ${lang}/${ns}.json:`)
    if (missing.length > 0) {
      console.log(`   ❌ Missing (${missing.length}):`)
      missing.forEach(k => console.log(`      - ${k}`))
    }
    if (extra.length > 0) {
      console.log(`   ⚠️  Extra (${extra.length}):`)
      extra.forEach(k => console.log(`      + ${k}`))
    }
    if (empty.length > 0) {
      console.log(`   🔸 Empty value (${empty.length}):`)
      empty.forEach(k => console.log(`      ~ ${k}`))
    }
    console.log()
  }
}

// Summary
console.log('─'.repeat(50))
if (totalMissing + totalExtra + totalEmpty === 0) {
  console.log('✅ All languages are fully synchronized!')
} else {
  if (totalMissing > 0) console.log(`❌ ${totalMissing} missing key(s)`)
  if (totalExtra > 0) console.log(`⚠️  ${totalExtra} extra key(s)`)
  if (totalEmpty > 0) console.log(`🔸 ${totalEmpty} empty value(s)`)
}
console.log(`   Total keys in ${BASE_LANG}: ${NAMESPACES.reduce((sum, ns) => {
  const raw = loadNamespace(BASE_LANG, ns)
  return sum + (raw ? Object.keys(flatten(raw)).length : 0)
}, 0)}`)
console.log()

process.exit(totalMissing > 0 ? 1 : 0)
