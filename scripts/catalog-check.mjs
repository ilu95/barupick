/**
 * 코디 카탈로그 점검 — npm run catalog:check
 *
 * v3 부터 카탈로그의 입력은 "유저가 고른 조합 한 벌"이다 — 템플릿 × 고정으로 돈다.
 *   1) 카드 총점 == [이대로 만들기] 로 넘어간 결과 화면 점수 (같은 길로 매겨야 한다)
 *   2) 무작위 없음 — 같은 조합·같은 고정이면 두 번 돌려도 같은 목록
 *   3) 어떤 고정을 걸어도 카드가 0장이 되지 않는다
 *   4) 상위 12장의 원점수(rawTotal)가 비증가 — 92점 동점 안에서도 순위가 있다
 *   5) depth 2 후보가 depth 1 보다 적지 않다. 자유 자리 4개면 36장 이상 (더보기가 헛돌지 않게)
 *   6) 잠근 모자·머플러·레이어드가 모든 카드에 그 색으로 들어 있다
 *   7) depth 생략(=1) 결과는 v2 와 한 글자도 다르지 않다 — golden 대조
 *
 * 화면(ColorCatalog.tsx)이 하는 계산을 그대로 옮겨 놓았다 — 화면이 바뀌면 여기도 바뀐다.
 * golden 다시 뜨기(engine 의 depth 1 동작을 일부러 바꿨을 때만): node scripts/catalog-check.mjs --golden
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'node_modules/.cache/catalog-check.bundle.mjs')
const GOLDEN = path.join(ROOT, 'scripts/catalog-depth1.golden.json')
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
      `export { TEMPLATES, partsOf, scoreOf, loadPrefs, loadRecent } from './src/lib/outfits'`,
      `export { pickPayload } from './src/lib/pickPayload'`,
      `export { initialState, outfitToState, engineInputOf } from './src/hooks/useBuild'`,
      `export { uiSlotOf, typesFor } from './src/lib/builderSlots'`,
      `export { catalogFor, scoreOutfit } from './src/lib/engine'`,
    ].join('\n'),
    resolveDir: ROOT,
    loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', outfile: OUT, logLevel: 'error',
  loader: { '.json': 'json' },
})

const M = await import(pathToFileURL(OUT).href)
const { COLORS_60, TEMPLATES, partsOf, scoreOf, loadPrefs, loadRecent, pickPayload, initialState, outfitToState, engineInputOf, uiSlotOf, typesFor, catalogFor, scoreOutfit } = M

/* ── ColorCatalog.tsx 의 상수 그대로 ── */
const COMBO_SLOTS = ['outer', 'middleware', 'top', 'bottom', 'shoes']
const ACC_SLOTS = ['hat', 'scarf']
const LOCK_SLOTS = [...COMBO_SLOTS, ...ACC_SLOTS]
const KINDS = ['safe', 'point', 'two', 'tone', 'taste']
const PAGE = 24
const DEPTH = 2
const N = 200
const CTX_TEMP = 21
const rawOf = c => c.rawTotal ?? c.total

/** 잠근 모자·머플러만 얹는다 — ColorCatalog 의 accs */
const accsOf = (locks, sex) => ({
  hat: locks.hat ? { plate: typesFor('hat', sex)[0], colorKey: locks.hat } : null,
  scarf: locks.scarf ? { plate: typesFor('scarf', sex)[0], colorKey: locks.scarf } : null,
})

/** 고른 조합 한 벌 → 점수 매길 상태. ColorCatalog 의 base */
function baseOf(tpl, sex, situ, asked) {
  const p = partsOf(tpl, sex)
  const e = { c: tpl, p, s: scoreOf(tpl, p, { sex, situ, temp: CTX_TEMP, prefs: loadPrefs(), recent: loadRecent() }) }
  const state = outfitToState(initialState('coord'), { ...pickPayload(e, situ, 'result'), ...accsOf(asked, sex) })
  const input = engineInputOf(state)
  // 자물쇠 줄 = 이 조합에 있는 자리 + 모자·머플러. 조합에 없는 자리의 자물쇠는 버린다
  const lockSlots = [...COMBO_SLOTS.filter(s => input.outfit[s]), ...ACC_SLOTS]
  const locks = {}
  for (const s of lockSlots) if (asked[s]) locks[s] = asked[s]
  return { e, state, input, lockSlots, locks }
}

/** ColorCatalog.tsx 의 cards 를 그대로 옮긴 것 */
function catalog(base) {
  const { locks } = base
  const lockedSlots = base.lockSlots.filter(s => locks[s])
  const input = { ...base.input, outfit: { ...base.input.outfit, ...locks } }
  const list = catalogFor(input, new Set(lockedSlots), N, DEPTH)
  if (!list.length) {
    const r = scoreOutfit(input)
    list.push({ outfit: {}, total: r.total, rawTotal: r.raw?.total ?? r.total, why: (r.reasons.find(x => x.w > 0) || { txt: '' }).txt || '', kind: 'safe', mine: 0 })
  }
  const all = list.map(c => ({ c, full: { ...input.outfit, ...c.outfit } }))
  all.sort((a, b) => b.c.total - a.c.total || rawOf(b.c) - rawOf(a.c) || KINDS.indexOf(a.c.kind) - KINDS.indexOf(b.c.kind))
  const mainOf = x => LOCK_SLOTS.filter(s => !locks[s]).map(s => x.full[s]).find(Boolean) || ''
  const bySig = new Set(); const mainCount = {}; const kept = []; const spare = []
  for (const x of all) {
    const key = Object.keys(x.full).sort().map(s => s + ':' + x.full[s]).join('|')
    if (bySig.has(key)) continue
    bySig.add(key)
    const main = mainOf(x)
    if (kept.length < PAGE && main && (mainCount[main] || 0) >= 4) { spare.push(x); continue }
    mainCount[main] = (mainCount[main] || 0) + 1
    kept.push(x)
  }
  kept.push(...spare)
  const good = kept.filter(x => x.c.total >= 60)
  return (good.length >= 6 ? good : kept.slice(0, Math.max(6, good.length))).map(x => ({ ...x, hard: x.c.total < 60 }))
}

/** ColorCatalog.tsx 의 make() 가 만드는 payload */
function makePayload(base, x, situ, sex) {
  const p = pickPayload(base.e, situ, 'result')
  const slotOf = new Map(base.state.upper.map(l => [l.itemId, uiSlotOf(l)]))
  const recolor = (part, slot) => (part && x.full[slot] ? { ...part, colorKey: x.full[slot] } : part)
  return {
    ...p,
    layers: p.layers.map(l => { const s = slotOf.get(l.itemId); return s && x.full[s] ? { ...l, colorKey: x.full[s] } : l }),
    bottom: recolor(p.bottom, 'bottom'),
    shoes: recolor(p.shoes, 'shoes'),
    tie: recolor(p.tie, 'tie'),
    ...accsOf(base.locks, sex),
  }
}

const listOf = cards => cards.map(x => x.c.total + '#' + Object.keys(x.full).sort().map(s => s + ':' + x.full[s]).join('|')).join('\n')
const hash = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16)

/* ── 돌릴 것: 템플릿 10벌(레이어드 6 + 아닌 것 4, 남·여 5씩) × 고정 15 ── */
const every = (arr, n) => Array.from({ length: n }, (_, i) => arr[Math.floor(i * arr.length / n)])
const TPLS = []
for (const sex of ['m', 'w']) {
  for (const c of every(TEMPLATES.filter(x => partsOf(x, sex).layer), 3)) TPLS.push({ c, sex })
  for (const c of every(TEMPLATES.filter(x => !partsOf(x, sex).layer), 2)) TPLS.push({ c, sex })
}
const LOCK_SETS = [
  {},
  { top: 'navy' }, { top: 'white' }, { top: 'mustard' },
  { bottom: 'charcoal' }, { shoes: 'white' }, { outer: 'camel' },
  { top: 'navy', shoes: 'white' }, { outer: 'black', bottom: 'ivory' },
  { top: 'lime', bottom: 'magenta' },                     // 맞추기 어려운 색 — 그래도 0장은 아니어야 한다
  { outer: 'camel', top: 'navy', bottom: 'charcoal', shoes: 'brown' },
  { hat: 'black' },                                       // 잠가야만 쓰는 자리
  { scarf: 'burgundy', top: 'ivory' },
  { middleware: 'beige' },                                // 레이어드 자리
  { middleware: 'olive', top: 'white', shoes: 'black' },
]

/* golden 다시 뜨기 — engine 의 depth 1 동작을 일부러 바꿨을 때만 */
const golden = {}
const goldenKey = (t, locks) => `${t.sex}/${t.c.id}/${JSON.stringify(locks)}`
const depth1 = base => {
  const lockedSlots = base.lockSlots.filter(s => base.locks[s])
  const input = { ...base.input, outfit: { ...base.input.outfit, ...base.locks } }
  return catalogFor(input, new Set(lockedSlots), N, 1)
}

let cases = 0, mismatch = 0, empty = 0, unstable = 0, hard = 0, minCards = Infinity, maxCards = 0
let noRaw = 0, thin = 0, noLock = 0, drift = 0, wide4 = 0
for (const tplCase of TPLS) {
  const { c: tpl, sex } = tplCase
  const situ = tpl.tag
  for (const asked of LOCK_SETS) {
    if (Object.values(asked).some(k => !COLORS_60[k])) throw new Error('색 키가 팔레트에 없다: ' + JSON.stringify(asked))
    const base = baseOf(tpl, sex, situ, asked)
    const cards = catalog(base)
    const tag = `${sex} ${tpl.id} ${situ} ` + (JSON.stringify(base.locks) === '{}' ? '(고정 없음)' : JSON.stringify(base.locks))
    if (!cards.length) { empty++; console.log('  ✗ 0장  ' + tag); continue }
    minCards = Math.min(minCards, cards.length)
    maxCards = Math.max(maxCards, cards.length)
    hard += cards.filter(x => x.hard).length
    if (listOf(cards) !== listOf(catalog(baseOf(tpl, sex, situ, asked)))) { unstable++; console.log('  ✗ 목록이 흔들린다  ' + tag) }

    // 4) 원점수 비증가 — 표시 점수가 92에 몰려도 그 안에 순서가 있다
    const top = cards.slice(0, 12)
    for (let i = 1; i < top.length; i++) {
      if (top[i - 1].c.total === top[i].c.total && rawOf(top[i - 1].c) < rawOf(top[i].c)) {
        noRaw++; console.log(`  ✗ 원점수가 거꾸로  ${tag}  ${rawOf(top[i - 1].c)} < ${rawOf(top[i].c)}`); break
      }
    }
    // 5) depth 2 가 depth 1 보다 넓다. 자유 자리 4개면 36장 이상
    const one = depth1(base)
    const two = catalogFor({ ...base.input, outfit: { ...base.input.outfit, ...base.locks } }, new Set(base.lockSlots.filter(s => base.locks[s])), N, DEPTH)
    if (two.length < one.length) { thin++; console.log(`  ✗ depth 2 가 더 좁다  ${tag}  ${two.length} < ${one.length}`) }
    const free = Object.keys(base.input.outfit).filter(s => base.input.outfit[s] && !base.locks[s]).length
    if (free === 4) { wide4++; if (two.length < 36) { thin++; console.log(`  ✗ 자유 자리 4인데 ${two.length}장  ${tag}`) } }
    // 7) depth 생략(=1) 결과가 v2 와 같은가
    golden[goldenKey(tplCase, base.locks)] = hash(one.map(c => `${c.total}|${rawOf(c)}|${c.kind}|${JSON.stringify(c.outfit)}`).join('\n'))

    for (const x of cards) {
      cases++
      // 6) 잠근 자리는 모든 카드에 그 색으로 들어 있다
      for (const s of LOCK_SLOTS) if (base.locks[s] && x.full[s] !== base.locks[s]) { noLock++; console.log(`  ✗ ${s} 빠짐  ${tag}`) }
      // [이대로 만들기] → 만들기 화면이 다시 세운 상태의 점수
      const again = scoreOutfit(engineInputOf(outfitToState(initialState('coord'), makePayload(base, x, situ, sex)))).total
      if (again !== x.c.total) { mismatch++; console.log(`  ✗ 카드 ${x.c.total} != 결과 ${again}  ${tag}  ${JSON.stringify(x.full)}`) }
    }
  }
}

if (process.argv.includes('--golden')) {
  fs.writeFileSync(GOLDEN, JSON.stringify(golden, null, 1) + '\n')
  console.log(`\ngolden 다시 떴다 — ${Object.keys(golden).length}개 (${path.relative(ROOT, GOLDEN)})`)
  process.exit(0)
}
const was = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'))
for (const [k, v] of Object.entries(golden)) {
  if (was[k] !== v) { drift++; console.log(`  ✗ depth 1 이 v2 와 다르다  ${k}`) }
}

const bad = mismatch || unstable || empty || noRaw || thin || noLock || drift
console.log('')
console.log(`검사한 카드 ${cases}장 (조합 ${TPLS.length}벌 × 고정 ${LOCK_SETS.length}), ${minCards}~${maxCards}장, △ ${hard}장`)
console.log(`  점수 일치      ${mismatch === 0 ? '✅' : '❌ ' + mismatch + '장 불일치'}`)
console.log(`  같은 결과      ${unstable === 0 ? '✅' : '❌ ' + unstable + '경우 흔들림'}`)
console.log(`  0장 없음       ${empty === 0 ? '✅' : '❌ ' + empty + '경우'}`)
console.log(`  동점 순위      ${noRaw === 0 ? '✅' : '❌ ' + noRaw + '경우 원점수 역전'}`)
console.log(`  후보 넓힘      ${thin === 0 ? `✅ (자유 자리 4인 경우 ${wide4})` : '❌ ' + thin + '경우 좁음'}`)
console.log(`  자물쇠 반영    ${noLock === 0 ? '✅' : '❌ ' + noLock + '장 빠짐'}`)
console.log(`  depth 1 불변   ${drift === 0 ? `✅ (${Object.keys(golden).length}개 대조)` : '❌ ' + drift + '개 달라짐'}`)
process.exit(bad ? 1 : 0)
