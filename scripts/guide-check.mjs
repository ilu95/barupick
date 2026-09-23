/**
 * 색 구역 점검 — npm run guide:check
 *
 * 만들기 색 칩을 네 구역(찰떡 궁합 / 무난한 조합 / 고수의 영역 / 피하는 게 좋아요)으로 나누는
 * zoneOf 가 guideFor 와 같은 규칙을 쓰는지, 그리고 그 과정에서 guideFor 가 안 바뀌었는지 본다.
 *
 *   a) guideFor().groups.match 의 키는 전부 zoneOf 에서 'match', safe → 'safe', point → 'point',
 *      marks 의 warn → 'avoid'
 *   b) guideFor 출력(rec·groups·marks·delta)이 변경 전과 한 글자도 다르지 않다 — golden 대조
 *      (zones 는 이번에 새로 붙은 칸이라 해시에 넣지 않는다)
 *
 * 상황 3 × 코디 20 × 자리 5.
 * golden 다시 뜨기(guideFor 의 채점을 일부러 바꿨을 때만): node scripts/guide-check.mjs --golden
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'node_modules/.cache/guide-check.bundle.mjs')
const GOLDEN = path.join(ROOT, 'scripts/guide.golden.json')
fs.mkdirSync(path.dirname(OUT), { recursive: true })

/* 브라우저 전역 스텁 — 앱 모듈이 최상단에서 localStorage·navigator 를 읽는다 (catalog-check.mjs 와 같다) */
const store = new Map()
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear(), key: i => [...store.keys()][i], get length() { return store.size } }
globalThis.sessionStorage = globalThis.localStorage
Object.defineProperty(globalThis, 'navigator', { value: { language: 'ko-KR', languages: ['ko-KR'], userAgent: 'node', onLine: true }, configurable: true })
const noop = () => {}
globalThis.window = Object.assign(globalThis, { addEventListener: noop, removeEventListener: noop, dispatchEvent: () => true, matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }), location: { href: 'http://localhost/', origin: 'http://localhost', pathname: '/', search: '', hash: '' } })
globalThis.document = { documentElement: { lang: 'ko', setAttribute: noop, classList: { add: noop, remove: noop, toggle: noop } }, addEventListener: noop, removeEventListener: noop, createElement: () => ({ style: {}, setAttribute: noop }), body: { appendChild: noop } }
globalThis.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o && o.detail } }

await build({
  stdin: {
    contents: [
      `export { COLORS_60 } from './src/lib/colors'`,
      `export { guideFor } from './src/lib/engine'`,
      `export * as Guide from './src/lib/guide'`,   // zoneOf 가 아직 없어도 번들이 깨지지 않게 네임스페이스로
    ].join('\n'),
    resolveDir: ROOT,
    loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', outfile: OUT, logLevel: 'error',
  loader: { '.json': 'json' },
})

const { COLORS_60, guideFor, Guide } = await import(pathToFileURL(OUT).href)
const zoneOf = Guide.zoneOf
const KEYS = Object.keys(COLORS_60)

/* ── 돌릴 것: 상황 3 × 코디 20 × 자리 5 ── */
const SITUS = ['daily', 'work', 'date']
const SLOTS = ['top', 'bottom', 'shoes', 'outer', 'scarf']   // shoes·scarf 는 작은 자리 — point 구역이 나오는 쪽
const PICK = ['black', 'white', 'navy', 'charcoal', 'ivory', 'camel', 'brown', 'olive', 'burgundy', 'mustard', 'lime', 'magenta', 'sky_blue', 'beige', 'gray']
for (const k of PICK) if (!COLORS_60[k]) throw new Error('색 키가 팔레트에 없다: ' + k)

/* 20벌 — 세 자리 색을 돌려 가며(아우터 있는 벌 절반) 고르게 깐다 */
const OUTFITS = Array.from({ length: 20 }, (_, i) => {
  const o = { top: PICK[i % PICK.length], bottom: PICK[(i * 7 + 3) % PICK.length], shoes: PICK[(i * 11 + 5) % PICK.length] }
  if (i % 2) o.outer = PICK[(i * 5 + 2) % PICK.length]
  if (i % 4 === 3) o.scarf = PICK[(i * 3 + 1) % PICK.length]
  return o
})

const hash = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16)
/* guideFor 출력 지문 — zones 는 이번에 새로 붙은 칸이라 뺀다 */
const fingerprint = g => hash([
  g.rec.join(','),
  ['safe', 'match', 'point', 'mine'].map(k => k + ':' + g.groups[k].join(',')).join('|'),
  KEYS.map(k => k + '=' + (g.marks[k] || '')).join(','),
  KEYS.map(k => k + '=' + g.delta[k]).join(','),
].join('\n'))

const golden = {}
let cases = 0, badMatch = 0, badSafe = 0, badPoint = 0, badWarn = 0, missing = 0, drift = 0, both = 0
const seen = { match: 0, safe: 0, point: 0, avoid: 0 }

for (const situ of SITUS) {
  for (let oi = 0; oi < OUTFITS.length; oi++) {
    for (const slot of SLOTS) {
      const input = { outfit: OUTFITS[oi], situ, month: 4 }
      const g = guideFor(input, slot)
      const tag = `${situ} #${oi} ${slot}`
      cases++
      golden[tag] = fingerprint(g)
      if (!zoneOf) continue   // golden 을 변경 전 나무에서 뜰 때 (zoneOf 가 아직 없다)
      const z = zoneOf(input, slot, KEYS)

      // 모든 색이 정확히 한 구역에 들어간다
      for (const k of KEYS) { if (!z[k]) { missing++; console.log(`  ✗ 구역 없음  ${tag}  ${k}`) } else seen[z[k]]++ }
      // a) 묶음 ↔ 구역이 어긋나지 않는다
      // guide() 의 match·point 묶음은 서로 배타가 아니다 — 작은 자리의 쨍한 색은 양쪽에 다 든다.
      // 구역은 하나만 줄 수 있으니 그런 색은 'point'(고수의 영역)로 보낸다. 쨍한 게 그 색의 성질이다.
      const inPoint = new Set(g.groups.point)
      for (const k of g.groups.match) {
        if (z[k] === 'match') continue
        if (inPoint.has(k) && z[k] === 'point') { both++; continue }
        badMatch++; console.log(`  ✗ match 묶음인데 ${z[k]}  ${tag}  ${k}`)
      }
      for (const k of g.groups.safe) if (z[k] !== 'safe') { badSafe++; console.log(`  ✗ safe 묶음인데 ${z[k]}  ${tag}  ${k}`) }
      for (const k of g.groups.point) if (z[k] !== 'point') { badPoint++; console.log(`  ✗ point 묶음인데 ${z[k]}  ${tag}  ${k}`) }
      for (const k of KEYS) if (g.marks[k] === 'warn' && z[k] !== 'avoid') { badWarn++; console.log(`  ✗ △ 인데 ${z[k]}  ${tag}  ${k}`) }
    }
  }
}

if (process.argv.includes('--golden')) {
  fs.writeFileSync(GOLDEN, JSON.stringify(golden, null, 1) + '\n')
  console.log(`golden 다시 떴다 — ${Object.keys(golden).length}개 (${path.relative(ROOT, GOLDEN)})`)
  process.exit(0)
}
const was = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'))
for (const [k, v] of Object.entries(golden)) if (was[k] !== v) { drift++; console.log(`  ✗ guideFor 출력이 달라졌다  ${k}`) }

const total = Object.values(seen).reduce((a, b) => a + b, 0)
const bad = badMatch || badSafe || badPoint || badWarn || missing || drift
console.log('')
console.log(`검사 ${cases}경우 (상황 ${SITUS.length} × 코디 ${OUTFITS.length} × 자리 ${SLOTS.length}), 색 ${KEYS.length}개씩 ${total}건`)
console.log(`  빈 구역 없음   ${missing === 0 ? '✅' : '❌ ' + missing + '건'}`)
console.log(`  match 묶음     ${badMatch === 0 ? `✅ (match·point 양쪽인 색 ${both}건은 point 로)` : '❌ ' + badMatch + '건 어긋남'}`)
console.log(`  safe 묶음      ${badSafe === 0 ? '✅' : '❌ ' + badSafe + '건 어긋남'}`)
console.log(`  point 묶음     ${badPoint === 0 ? '✅' : '❌ ' + badPoint + '건 어긋남'}`)
console.log(`  △ → 피하는     ${badWarn === 0 ? '✅' : '❌ ' + badWarn + '건 어긋남'}`)
console.log(`  guideFor 불변  ${drift === 0 ? `✅ (${Object.keys(golden).length}개 대조)` : '❌ ' + drift + '개 달라짐'}`)
console.log(`  구역 분포      찰떡 ${seen.match} · 무난 ${seen.safe} · 고수 ${seen.point} · 피하는 ${seen.avoid}`)
process.exit(bad ? 1 : 0)
