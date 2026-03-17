#!/usr/bin/env node
/**
 * i18n Language Scaffolder — BaruPick
 *
 * Creates a new language directory by copying English translations as defaults.
 * After running, you need to:
 *   1. Translate the values in each JSON file
 *   2. Add imports and resource entry in src/i18n/index.ts
 *   3. Add locale mapping in getLocale()
 *
 * Usage:
 *   node scripts/i18n/add-lang.mjs <lang-code> [--from en]
 *
 * Examples:
 *   node scripts/i18n/add-lang.mjs th         # Thai, copy from English
 *   node scripts/i18n/add-lang.mjs vi --from ko  # Vietnamese, copy from Korean
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const I18N_DIR = path.resolve(__dirname, '../../src/i18n')
const NAMESPACES = ['ui', 'colors', 'categories', 'styles', 'bodyType', 'personalColor']

const args = process.argv.slice(2)
if (args.length === 0 || args[0] === '--help') {
  console.log(`
Usage: node scripts/i18n/add-lang.mjs <lang-code> [--from <source-lang>]

Creates src/i18n/<lang-code>/ with all namespace JSON files copied from source.
Default source: en

After running:
  1. Translate values in src/i18n/<lang-code>/*.json
  2. Update src/i18n/index.ts:
     - Add imports for the new language
     - Add entry in resources object
     - Add locale mapping in getLocale()
`)
  process.exit(0)
}

const newLang = args[0]
const fromIdx = args.indexOf('--from')
const sourceLang = fromIdx >= 0 ? args[fromIdx + 1] : 'en'

// Validate
const targetDir = path.join(I18N_DIR, newLang)
const sourceDir = path.join(I18N_DIR, sourceLang)

if (fs.existsSync(targetDir)) {
  console.error(`❌ Directory already exists: src/i18n/${newLang}/`)
  console.error(`   Delete it first if you want to regenerate.`)
  process.exit(1)
}

if (!fs.existsSync(sourceDir)) {
  console.error(`❌ Source language not found: src/i18n/${sourceLang}/`)
  process.exit(1)
}

// Create directory and copy files
fs.mkdirSync(targetDir, { recursive: true })

for (const ns of NAMESPACES) {
  const srcFile = path.join(sourceDir, `${ns}.json`)
  const dstFile = path.join(targetDir, `${ns}.json`)

  if (!fs.existsSync(srcFile)) {
    console.warn(`⚠️  ${sourceLang}/${ns}.json not found, skipping`)
    continue
  }

  fs.copyFileSync(srcFile, dstFile)
  console.log(`✅ Created ${newLang}/${ns}.json (from ${sourceLang})`)
}

// Generate the code snippet for index.ts
console.log(`
─────────────────────────────────────────────
✅ Language scaffolded: src/i18n/${newLang}/

Next steps — add to src/i18n/index.ts:

1. Add imports:
   import ${newLang}Ui from './${newLang}/ui.json'
   import ${newLang}Colors from './${newLang}/colors.json'
   import ${newLang}Categories from './${newLang}/categories.json'
   import ${newLang}Styles from './${newLang}/styles.json'
   import ${newLang}BodyType from './${newLang}/bodyType.json'
   import ${newLang}PersonalColor from './${newLang}/personalColor.json'

2. Add to resources object:
   ${newLang}: {
     ui: ${newLang}Ui,
     colors: ${newLang}Colors,
     categories: ${newLang}Categories,
     styles: ${newLang}Styles,
     bodyType: ${newLang}BodyType,
     personalColor: ${newLang}PersonalColor,
   },

3. Add locale mapping in getLocale():
   ${newLang}: '${newLang}-${newLang.toUpperCase()}',

4. Translate all values in src/i18n/${newLang}/*.json

5. Run: node scripts/i18n/check.mjs --lang ${newLang}
`)
