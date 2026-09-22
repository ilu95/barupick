/**
 * 코디 카탈로그 점검 — npm run catalog:check
 *
 * 카탈로그 화면이 지켜야 하는 것 딱 세 가지만 본다.
 *   1) 카드 총점 == [이대로 만들기] 로 넘어간 결과 화면 점수 (같은 길로 매겨야 한다)
 *   2) 무작위 없음 — 같은 고정·같은 상황이면 두 번 돌려도 같은 목록
 *   3) 어떤 고정을 걸어도 카드가 0장이 되지 않는다
 * 화면(ColorCatalog.tsx)이 하는 계산을 그대로 옮겨 놓았다 — 화면이 바뀌면 여기도 바뀐다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'node_modules/.cache/catalog-check.bundle.mjs')
fs.mkdirSync(path.dirname(OUT), { recursive: true })

/* 브라우저 전역 스텁 — 앱 모듈이 최상단에서 localStorage·navigator 를 읽는다 (engine-check.mjs 와 같다) */
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
      `export { ranked, sig, loadPrefs, loadRecent } from './src/lib/outfits'`,
      `export { pickPayload } from './src/lib/pickPayload'`,
      `export { initialState, outfitToState, engineInputOf } from './src/hooks/useBuild'`,
      `export { uiSlotOf } from './src/lib/builderSlots'`,
      `export { catalogFor, scoreOutfit } from './src/lib/engine'`,
    ].join('\n'),
    resolveDir: ROOT,
    loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', outfile: OUT, logLevel: 'error',
  loader: { '.json': 'json' },
})

const M = await import(pathToFileURL(OUT).href)
const { COLORS_60, ranked, sig, loadPrefs, loadRecent, pickPayload, initialState, outfitToState, engineInputOf, uiSlotOf, catalogFor, scoreOutfit } = M

const LOCK_SLOTS = ['outer', 'top', 'bottom', 'shoes']

/** ColorCatalog.tsx 의 bases + cards 를 그대로 옮긴 것 */
function catalog(situ, locks) {
  const lockedSlots = LOCK_SLOTS.filter(s => locks[s])
  const ctx = { sex: 'w', situ, temp: 21, prefs: loadPrefs(), recent: loadRecent() }
  const bases = []
  const seenSig = new Set()
  for (const e of ranked(ctx)) {
    const s = sig(e.p)
    if (seenSig.has(s)) continue
    seenSig.add(s)
    const state = outfitToState(initialState('coord'), pickPayload(e, situ, 'result'))
    const input = engineInputOf(state)
    if (lockedSlots.some(k => !input.outfit[k])) continue
    bases.push({ e, state, input })
    if (bases.length >= 4) break
  }
  const locked = new Set(lockedSlots)
  const all = []
  for (const base of bases) {
    const input = { ...base.input, outfit: { ...base.input.outfit, ...locks } }
    const list = catalogFor(input, locked, 12)
    if (!list.length) {
      const r = scoreOutfit(input)
      list.push({ outfit: {}, total: r.total, why: (r.reasons.find(x => x.w > 0) || { txt: '' }).txt || '', kind: 'safe', mine: 0 })
    }
    for (const c of list) all.push({ c, base, full: { ...input.outfit, ...c.outfit } })
  }
  all.sort((a, b) => b.c.total - a.c.total)
  const bySig = new Set(); const mainCount = {}; const kept = []
  for (const x of all) {
    const key = Object.keys(x.full).sort().map(s => s + ':' + x.full[s]).join('|')
    if (bySig.has(key)) continue
    bySig.add(key)
    const main = LOCK_SLOTS.filter(s => !locks[s]).map(s => x.full[s]).find(Boolean) || ''
    if (main && (mainCount[main] || 0) >= 4) continue
    mainCount[main] = (mainCount[main] || 0) + 1
    kept.push(x)
    if (kept.length >= 24) break
  }
  const good = kept.filter(x => x.c.total >= 60)
  return (good.length >= 6 ? good : kept.slice(0, Math.max(6, good.length))).map(x => ({ ...x, hard: x.c.total < 60 }))
}

/** ColorCatalog.tsx 의 make() 가 만드는 payload */
function makePayload(x, situ) {
  const p = pickPayload(x.base.e, situ, 'result')
  const slotOf = new Map(x.base.state.upper.map(l => [l.itemId, uiSlotOf(l)]))
  const recolor = (part, slot) => (part && x.full[slot] ? { ...part, colorKey: x.full[slot] } : part)
  return {
    ...p,
    layers: p.layers.map(l => { const s = slotOf.get(l.itemId); return s && x.full[s] ? { ...l, colorKey: x.full[s] } : l }),
    bottom: recolor(p.bottom, 'bottom'),
    shoes: recolor(p.shoes, 'shoes'),
    tie: recolor(p.tie, 'tie'),
  }
}

const listOf = cards => cards.map(x => x.base.e.c.id + '#' + x.c.total + '#' + Object.keys(x.full).sort().map(s => s + ':' + x.full[s]).join('|')).join('\n')

const SITUS = ['work', 'daily', 'date', 'formal', 'active', 'home']
const LOCK_SETS = [
  {},
  { top: 'navy' }, { top: 'white' }, { top: 'mustard' },
  { bottom: 'charcoal' }, { shoes: 'white' }, { outer: 'camel' },
  { top: 'navy', shoes: 'white' }, { outer: 'black', bottom: 'ivory' },
  { top: 'lime', bottom: 'magenta' },                     // 맞추기 어려운 색 — 그래도 0장은 아니어야 한다
  { outer: 'camel', top: 'navy', bottom: 'charcoal', shoes: 'brown' },
]

let cases = 0, mismatch = 0, empty = 0, unstable = 0, hard = 0, minCards = Infinity
for (const situ of SITUS) {
  for (const locks of LOCK_SETS) {
    if (Object.values(locks).some(k => !COLORS_60[k])) throw new Error('색 키가 팔레트에 없다: ' + JSON.stringify(locks))
    const cards = catalog(situ, locks)
    const tag = situ + ' ' + (JSON.stringify(locks) === '{}' ? '(고정 없음)' : JSON.stringify(locks))
    if (!cards.length) { empty++; console.log('  ✗ 0장  ' + tag); continue }
    minCards = Math.min(minCards, cards.length)
    hard += cards.filter(x => x.hard).length
    if (listOf(cards) !== listOf(catalog(situ, locks))) { unstable++; console.log('  ✗ 목록이 흔들린다  ' + tag) }
    for (const x of cards) {
      cases++
      // [이대로 만들기] → 만들기 화면이 다시 세운 상태의 점수
      const again = scoreOutfit(engineInputOf(outfitToState(initialState('coord'), makePayload(x, situ)))).total
      if (again !== x.c.total) { mismatch++; console.log(`  ✗ 카드 ${x.c.total} != 결과 ${again}  ${tag}  ${JSON.stringify(x.full)}`) }
    }
  }
}

console.log('')
console.log(`검사한 카드 ${cases}장 (상황 ${SITUS.length} × 고정 ${LOCK_SETS.length}), 가장 적을 때 ${minCards}장, △ ${hard}장`)
console.log(`  점수 일치      ${mismatch === 0 ? '✅' : '❌ ' + mismatch + '장 불일치'}`)
console.log(`  같은 결과      ${unstable === 0 ? '✅' : '❌ ' + unstable + '경우 흔들림'}`)
console.log(`  0장 없음       ${empty === 0 ? '✅' : '❌ ' + empty + '경우'}`)
process.exit(mismatch || unstable || empty ? 1 : 0)
