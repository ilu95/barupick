#!/usr/bin/env node
/**
 * Hardcoded Korean String Finder — BaruPick
 *
 * Scans TypeScript/TSX source files for Korean characters that may need i18n.
 * Excludes comments, imports, and known safe patterns.
 *
 * Usage:
 *   node scripts/i18n/find-hardcoded.mjs
 *   node scripts/i18n/find-hardcoded.mjs --path src/pages
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC_DIR = path.resolve(__dirname, '../../src')

const args = process.argv.slice(2)
const pathIdx = args.indexOf('--path')
const scanDir = pathIdx >= 0 ? path.resolve(args[pathIdx + 1]) : SRC_DIR

// Korean character range: Hangul Syllables + Hangul Jamo + Hangul Compatibility Jamo
const KOREAN_RE = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/

// Files to skip
const SKIP_DIRS = ['i18n', 'node_modules', '.git', 'dist']
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx']

// Lines to skip (comments, imports, console.log, etc.)
const SKIP_LINE_PATTERNS = [
  /^\s*\/\//, // single-line comment
  /^\s*\*/, // multi-line comment continuation
  /^\s*\/\*/, // multi-line comment start
  /^\s*import\s/, // import statement
  /console\.(log|warn|error|info)/, // console output
  /^\s*\/\/ ?@ts-/, // ts directives
]

function walkDir(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkDir(full))
    } else if (EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      files.push(full)
    }
  }
  return files
}

const files = walkDir(scanDir)
let totalFindings = 0

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const findings = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!KOREAN_RE.test(line)) continue
    if (SKIP_LINE_PATTERNS.some(p => p.test(line))) continue
    findings.push({ line: i + 1, text: line.trim() })
  }

  if (findings.length > 0) {
    const relPath = path.relative(SRC_DIR, filePath)
    console.log(`\n📄 src/${relPath}`)
    for (const f of findings) {
      console.log(`   L${f.line}: ${f.text.substring(0, 120)}`)
    }
    totalFindings += findings.length
  }
}

console.log(`\n${'─'.repeat(50)}`)
console.log(`Found ${totalFindings} line(s) with Korean text in ${files.length} files`)
console.log(`Scanned: ${path.relative(path.resolve(__dirname, '../..'), scanDir)}`)
console.log()
