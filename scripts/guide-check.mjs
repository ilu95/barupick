/**
 * 색 구역 점검 — npm run guide:check
 *
 * 만들기 색 칩의 네 구역(찰떡 궁합 / 무난한 조합 / 고수의 영역 / 피하는 게 좋아요) v2.
 *   golden) guideFor 출력(rec·groups·marks·delta)이 변경 전과 한 글자도 다르지 않다 — 점수 불변
 *   a) 기준 입력은 고른(touched) 자리만: 상의만 고른 상태에서 신발 기본색을 바꿔도 하의 구역이 안 변한다
 *   b) 큰 자리 구역 분포(기준 있는 300경우): match 10~30% · safe 30~60% · point 5~20% · avoid ≤ 40%
 *   c) 기준 세트 refset_v2: 좋은 100벌의 실제 색이 match/safe ≥ 85%, 나쁜 50벌 중 한 자리라도 avoid ≥ 50%
 *   d) 무채색이 match 에 들어오는 경우가 있다
 *   e) 액세서리 자리(hat·scarf·tie)는 zones 가 비고 marks 만 있다
 *
 * 벗어나면 guide.ts 의 ZONE 상수를 고친다(점수 규칙은 안 만진다).
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
      `export { lch, NEUTRAL_C } from './src/lib/engine/v7'`,
      `export { zoneOf, colorGuide, basisOf, ZONE } from './src/lib/guide'`,
    ].join('\n'),
    resolveDir: ROOT,
    loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', outfile: OUT, logLevel: 'error',
  loader: { '.json': 'json' },
})

const { COLORS_60, guideFor, lch, NEUTRAL_C, zoneOf, colorGuide, basisOf, ZONE } = await import(pathToFileURL(OUT).href)
const KEYS = Object.keys(COLORS_60)
const REF = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/lib/engine/refset_v2.json'), 'utf8'))
const pct = (a, b) => b ? +(a / b * 100).toFixed(1) : 0
let fail = 0
const line = (ok, label, msg) => { if (!ok) fail++; console.log(`  ${label.padEnd(26)} ${ok ? '✅' : '❌'} ${msg}`) }

/* ── golden: 상황 3 × 코디 20 × 자리 5 — guideFor 불변 ── */
const SITUS = ['daily', 'work', 'date']
const PICK = ['black', 'white', 'navy', 'charcoal', 'ivory', 'camel', 'brown', 'olive', 'burgundy', 'mustard', 'lime', 'magenta', 'sky_blue', 'beige', 'gray']
for (const k of PICK) if (!COLORS_60[k]) throw new Error('색 키가 팔레트에 없다: ' + k)
const OUTFITS = Array.from({ length: 20 }, (_, i) => {
  const o = { top: PICK[i % PICK.length], bottom: PICK[(i * 7 + 3) % PICK.length], shoes: PICK[(i * 11 + 5) % PICK.length] }
  if (i % 2) o.outer = PICK[(i * 5 + 2) % PICK.length]
  if (i % 4 === 3) o.scarf = PICK[(i * 3 + 1) % PICK.length]
  return o
})
const hash = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16)
const fingerprint = g => hash([
  g.rec.join(','),
  ['safe', 'match', 'point', 'mine'].map(k => k + ':' + g.groups[k].join(',')).join('|'),
  KEYS.map(k => k + '=' + (g.marks[k] || '')).join(','),
  KEYS.map(k => k + '=' + g.delta[k]).join(','),
].join('\n'))
const golden = {}
for (const situ of SITUS) for (let oi = 0; oi < OUTFITS.length; oi++) for (const slot of ['top', 'bottom', 'shoes', 'outer', 'scarf'])
  golden[`${situ} #${oi} ${slot}`] = fingerprint(guideFor({ outfit: OUTFITS[oi], situ, month: 4 }, slot))
if (process.argv.includes('--golden')) {
  fs.writeFileSync(GOLDEN, JSON.stringify(golden, null, 1) + '\n')
  console.log(`golden 다시 떴다 — ${Object.keys(golden).length}개`)
  process.exit(0)
}
const was = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'))
const drift = Object.entries(golden).filter(([k, v]) => was[k] !== v).length
console.log(`ZONE = ${JSON.stringify(ZONE)}\n`)
line(drift === 0, 'guideFor 불변', `${Object.keys(golden).length - drift}/${Object.keys(golden).length}개 같음`)

/* ── a) 기준은 touched 만 ── */
{
  let changed = 0, n = 0
  for (const top of PICK) for (const situ of SITUS) {
    const zs = ['black', 'white', 'lime'].map(shoes => {
      const full = { outfit: { top, bottom: 'charcoal', shoes }, situ, month: 4 }
      return JSON.stringify(zoneOf(basisOf(full, ['top'], 'bottom'), 'bottom', KEYS))
    })
    n++; if (new Set(zs).size !== 1) changed++
  }
  const none = basisOf({ outfit: { top: 'red', bottom: 'charcoal', shoes: 'black' } }, [], 'bottom') === null
    && basisOf({ outfit: { top: 'red', bottom: 'charcoal' } }, ['bottom'], 'bottom') === null
  line(changed === 0 && none, 'a) 기준 = touched 만', `신발 기본색 3가지로 바꿔도 하의 구역 불변 ${n - changed}/${n} · 기준 없음 → null ${none ? '예' : '아니오'}`)
}

/* ── b) 큰 자리 분포 · d) 무채 match ── */
const BIG = ['top', 'bottom', 'shoes', 'outer', 'middleware']
const seen = { match: 0, safe: 0, point: 0, avoid: 0 }
const bySlot = {}
let neutralMatch = 0, cases = 0
for (const situ of SITUS) for (const o of OUTFITS) for (const slot of BIG) {
  const full = { outfit: { ...o }, situ, month: 4 }
  if (!full.outfit[slot]) full.outfit[slot] = 'white'   // 자리가 비었으면 채워서 기준 있는 경우로
  const input = basisOf(full, Object.keys(full.outfit), slot)
  const z = zoneOf(input, slot, KEYS)
  cases++
  const bs = bySlot[slot] = bySlot[slot] || { match: 0, safe: 0, point: 0, avoid: 0 }
  for (const k of KEYS) { seen[z[k]]++; bs[z[k]]++; if (z[k] === 'match' && lch(COLORS_60[k].hex).C <= NEUTRAL_C) neutralMatch++ }
}
const tot = Object.values(seen).reduce((a, b) => a + b, 0)
const P = Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, pct(v, tot)]))
const distOk = P.match >= 10 && P.match <= 30 && P.safe >= 30 && P.safe <= 60 && P.point >= 5 && P.point <= 20 && P.avoid <= 40
line(distOk, `b) 분포 (${cases}경우)`, `찰떡 ${P.match}% · 무난 ${P.safe}% · 고수 ${P.point}% · 피하는 ${P.avoid}%`)
for (const [s, v] of Object.entries(bySlot)) { const t = Object.values(v).reduce((a, b) => a + b, 0); console.log(`     ${s.padEnd(11)} 찰떡 ${pct(v.match, t)} · 무난 ${pct(v.safe, t)} · 고수 ${pct(v.point, t)} · 피하는 ${pct(v.avoid, t)}`) }
line(neutralMatch > 0, 'd) 무채색 찰떡', `${neutralMatch}건`)

/* ── c) 기준 세트 ── */
const APP = { layer: 'middleware' }
const REF_BIG = new Set(['outer', 'middleware', 'top', 'bottom', 'shoes'])
const lookZones = look => {
  const outfit = {}, plates = {}
  for (const [s, [id, k]] of Object.entries(look.items)) { const a = APP[s] || s; outfit[a] = k; plates[a] = id }
  const full = { outfit, plates, situ: 'daily', month: 4 }
  return Object.keys(outfit).filter(s => REF_BIG.has(s)).map(s => zoneOf(full, s, [outfit[s]])[outfit[s]])
}
let gOk = 0, gAll = 0
for (const look of REF.good) for (const z of lookZones(look)) { gAll++; if (z === 'match' || z === 'safe') gOk++ }
const bHit = REF.bad.filter(look => lookZones(look).includes('avoid')).length
const gP = pct(gOk, gAll), bP = pct(bHit, REF.bad.length)
line(gP >= 85, 'c) 좋은 100벌', `실제 색이 찰떡·무난 ${gOk}/${gAll} = ${gP}% (≥ 85%)`)
line(bP >= 50, 'c) 나쁜 50벌', `한 자리라도 피하는 ${bHit}/${REF.bad.length} = ${bP}% (≥ 50%)`)

/* ── e) 액세서리 ── */
{
  let bad = 0, n = 0
  for (const slot of ['hat', 'scarf', 'tie']) for (const o of OUTFITS.slice(0, 10)) {
    const g = colorGuide({ outfit: { ...o, top: 'white' }, situ: 'work', month: 4 }, slot)
    n++; if (Object.keys(g.zones).length || !g.marks) bad++
  }
  line(bad === 0, 'e) 액세서리 구역 끔', `zones 빈 경우 ${n - bad}/${n}`)
}

process.exit(fail ? 1 : 0)
