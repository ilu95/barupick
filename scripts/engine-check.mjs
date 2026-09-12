/**
 * 엔진 회귀 점검 — npm run engine:check   (ALL=1 이면 기준 세트 전 항목을 찍는다)
 *
 * 규칙을 하나 건드리면 어디가 흔들리는지 한 번에 보이게, 연구 때 쓰던 네 가지 측정을 한 파일에 모았다.
 *   1) 기준 세트 v2 (실무 출처에서 옮겨 적은 좋은 100 · 나쁜 50, 스타일리스트 검수 전) 의 AUC
 *   2) 무작위 4벌/3벌 3,000 — 아무거나 집으면 몇 점인지(눈금이 안 무너졌나)
 *   3) 손질한 템플릿 84벌 — 사람이 짠 조합은 높아야 한다
 *   4) 근접 색 교체 10쌍 — 네이비↔미드나잇처럼 눈에 안 띄는 교체로 점수가 튀면 안 된다
 *   5) 대표님 사례 — v8 이 고치려던 바로 그 착장
 *   6) 실제 룩 495벌 — 핀터레스트에서 고른 진짜 착장(색 키만). 정상 코디를 깎고 있으면 여기서 걸린다
 *
 * 앱과 같은 색·판·규칙을 쓰려고 esbuild 로 `src/lib/engine.ts` 를 Node 용으로 번들해 부른다(기존 sim.mjs 방식).
 * 점수는 ctxOf 가 아니라 고정 ctx(daily·9월·퍼스널컬러 없음)로 내서 실행할 때마다 같은 값이 나오게 한다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'node_modules/.cache/engine-check.bundle.mjs')
fs.mkdirSync(path.dirname(OUT), { recursive: true })

await build({
  stdin: {
    contents: [
      `export { COLORS_60, getColorName } from './src/lib/colors'`,
      `export { TEMPLATES } from './src/lib/outfits'`,
      `export * as V7 from './src/lib/engine/v7'`,
      `export { calibrate } from './src/lib/engine'`,
    ].join('\n'),
    resolveDir: ROOT,
    loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', outfile: OUT, logLevel: 'error',
})

/* 브라우저 전역 스텁 — 앱 모듈이 최상단에서 localStorage·navigator 를 읽는다 */
const store = new Map()
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear(), key: i => [...store.keys()][i], get length() { return store.size } }
globalThis.sessionStorage = globalThis.localStorage
Object.defineProperty(globalThis, 'navigator', { value: { language: 'ko-KR', languages: ['ko-KR'], userAgent: 'node', onLine: true }, configurable: true })
const noop = () => {}
globalThis.window = Object.assign(globalThis, { addEventListener: noop, removeEventListener: noop, dispatchEvent: () => true, matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }), location: { href: 'http://localhost/', origin: 'http://localhost', pathname: '/', search: '', hash: '' } })
globalThis.document = { documentElement: { lang: 'ko', setAttribute: noop, classList: { add: noop, remove: noop, toggle: noop } }, addEventListener: noop, removeEventListener: noop, createElement: () => ({ style: {}, setAttribute: noop }), body: { appendChild: noop } }
globalThis.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o && o.detail } }

const { COLORS_60, getColorName, TEMPLATES, V7, calibrate } = await import(pathToFileURL(OUT).href)
const REF = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/lib/engine/refset_v2.json'), 'utf8'))

/* 자리별 기본 판 — 판을 안 주면 이걸 쓴다(면적이 판에서 나오므로 고정해야 비교가 된다) */
const DEF = { outer: '28_coat_short', layer: '15_cardigan', top: '11_knit_crew', inner: '13_knit_turtle', bottom: '03_slacks_straight', shoes: '74_loafer', scarf: '54_scarf', tie: 'tie', socks: 'socks', hat: 'hat' }
const CTX = { situ: 'daily', month: 9, pc: null }
const ev = (keys, ids = {}) => {
  const items = Object.entries(keys).filter(([, k]) => k && COLORS_60[k]).map(([slot, k]) => ({ slot, id: ids[slot] || DEF[slot], hex: COLORS_60[k].hex, color: getColorName(k), key: k }))
  const r = V7.evaluate(items, CTX)
  return { ...r, cal: calibrate(r.total) }
}

const mean = a => +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1)
const stats = arr => { const s = [...arr].sort((a, b) => a - b), m = mean(arr), p = q => s[Math.floor(q * s.length)]
  return `mean ${m} sd ${Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length).toFixed(1)} p10 ${p(.1)} p50 ${p(.5)} p90 ${p(.9)} ≥84 ${(arr.filter(x => x >= 84).length / arr.length * 100).toFixed(1)}% ≥72 ${(arr.filter(x => x >= 72).length / arr.length * 100).toFixed(1)}% <60 ${(arr.filter(x => x < 60).length / arr.length * 100).toFixed(1)}%` }
const gates = []
const gate = (label, ok, got, want) => { gates.push({ label, ok, got, want }); return ok }

/* 1) 기준 세트 v2 */
const run = arr => arr.map(o => {
  const ids = {}, keys = {}
  for (const [s, [id, k]] of Object.entries(o.items)) { ids[s] = id; keys[s] = k }
  const r = ev(keys, ids)
  return { ...o, cal: r.cal, raw: r.total, neg: r.reasons.filter(x => x.w < 0).map(x => x.id).join(','), pos: r.reasons.filter(x => x.w > 0).map(x => x.id).join(',') }
})
const g = run(REF.good), b = run(REF.bad)
const auc = +([...g].reduce((s, x) => s + b.reduce((t, y) => t + (x.cal > y.cal ? 1 : x.cal === y.cal ? .5 : 0), 0), 0) / g.length / b.length).toFixed(3)
const byCat = arr => { const m = {}; arr.forEach(o => (m[o.cat] = m[o.cat] || []).push(o.cal)); return Object.entries(m).map(([k, v]) => `${k} ${mean(v)} (${Math.min(...v)}~${Math.max(...v)}) n${v.length}`).join(' | ') }
console.log('== 기준 세트 v2 ==')
console.log('GOOD mean', mean(g.map(x => x.cal)), 'min', Math.min(...g.map(x => x.cal)), '<72:', g.filter(x => x.cal < 72).length, '<60:', g.filter(x => x.cal < 60).length, '\n  ', byCat(g))
console.log('BAD  mean', mean(b.map(x => x.cal)), 'max', Math.max(...b.map(x => x.cal)), '>=72:', b.filter(x => x.cal >= 72).length, '>=60:', b.filter(x => x.cal >= 60).length, '\n  ', byCat(b))
console.log('AUC', auc, '| acc@72', +((g.filter(x => x.cal >= 72).length + b.filter(x => x.cal < 72).length) / 150).toFixed(3), '| acc@60', +((g.filter(x => x.cal >= 60).length + b.filter(x => x.cal < 60).length) / 150).toFixed(3))
gate('refset_v2 AUC', auc >= .90, auc, '≥ 0.90')
console.log('\n-- 좋은데 72 미만 (남은 오판)'); g.filter(x => x.cal < 72).sort((a, b) => a.cal - b.cal).forEach(x => console.log(` ${x.cal} [${x.cat}] ${x.name} :: ${x.neg}`))
console.log('\n-- 나쁜데 60 이상 (남은 오판)'); b.filter(x => x.cal >= 60).sort((a, b) => b.cal - a.cal).forEach(x => console.log(` ${x.cal} [${x.cat}] ${x.name} :: neg=${x.neg} pos=${x.pos}`))
if (process.env.ALL) {
  console.log('\n-- 좋은 100'); g.forEach(x => console.log(` ${x.cal} [${x.cat}] ${x.name} :: neg=${x.neg}`))
  console.log('\n-- 나쁜 50'); b.forEach(x => console.log(` ${x.cal} [${x.cat}] ${x.name} :: neg=${x.neg}`))
}

/* 2) 무작위 — 시드를 고정해 실행마다 같은 표가 나오게 한다 */
let seed = 7
const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
const rnd = a => a[Math.floor(rand() * a.length)]
const KEYS = Object.keys(COLORS_60)
const OUTERS = ['28_coat_short', '19_blazer', '30_trench', '31_trucker', '17_coat_long', '29_puffer'], TOPS = ['11_knit_crew', '35_sweat', '08_shirt_closed', '16_hoodie', '37_polo', '12_knit_vneck', '07_tee_long'], BOTTOMS = ['03_slacks_straight', '04_slacks_wide', '01_denim_straight', '02_denim_wide', '63_chino', '39_cargo'], SHOES = ['74_loafer', '71_sneaker_canvas', '75_boots_chelsea', '76_boots_walker', '73_sneaker_chunky', '77_derby']
const s4 = [], s3 = []
for (let i = 0; i < 3000; i++) {
  s4.push(ev({ outer: rnd(KEYS), top: rnd(KEYS), bottom: rnd(KEYS), shoes: rnd(KEYS) }, { outer: rnd(OUTERS), top: rnd(TOPS), bottom: rnd(BOTTOMS), shoes: rnd(SHOES) }).cal)
  s3.push(ev({ top: rnd(KEYS), bottom: rnd(KEYS), shoes: rnd(KEYS) }, { top: rnd(TOPS), bottom: rnd(BOTTOMS), shoes: rnd(SHOES) }).cal)
}
console.log('\n== 무작위 3,000 ==')
console.log('random4', stats(s4)); console.log('random3', stats(s3))
gate('무작위 4벌 평균', mean(s4) >= 45 && mean(s4) <= 62, mean(s4), '45~62')

/* 3) 손질한 템플릿 */
const tv = TEMPLATES.map(t => { const ids = {}, keys = {}; for (const [s, id] of Object.entries(t.p)) if (t.pal[s]) { ids[s] = id; keys[s] = t.pal[s] } return ev(keys, ids).cal })
console.log(`\n== 템플릿 ${tv.length}벌 ==`); console.log(stats(tv))
gate(`템플릿 ${tv.length}벌 평균`, mean(tv) >= 82, mean(tv), '≥ 82')

/* 4) 근접 색 교체 — 눈에 안 띄는 색 차이로 점수가 튀면 눈금을 못 믿는다 */
const swaps = [['navy', 'midnight'], ['black', 'charcoal'], ['white', 'ivory'], ['white', 'off_white'], ['beige', 'ecru'], ['camel', 'tan'], ['gray', 'pewter'], ['brown', 'walnut'], ['olive', 'dark_olive'], ['burgundy', 'wine']]
const bases = [{ outer: 'camel', top: 'white', bottom: 'navy', shoes: 'brown' }, { outer: 'navy', top: 'white', bottom: 'beige', shoes: 'black' }, { top: 'gray', bottom: 'black', shoes: 'white' }, { outer: 'olive', top: 'cream', bottom: 'brown', shoes: 'brown' }, { top: 'burgundy', bottom: 'charcoal', shoes: 'black' }]
let mx = 0, mxRaw = 0; const rows = []
for (const o of bases) for (const [a, c] of swaps) for (const slot of Object.keys(o)) if (o[slot] === a) {
  const r0 = ev(o), r1 = ev({ ...o, [slot]: c })
  rows.push(`${slot}:${a}→${c} ${r0.cal}→${r1.cal}`)
  mx = Math.max(mx, Math.abs(r1.cal - r0.cal)); mxRaw = Math.max(mxRaw, Math.abs(r1.total - r0.total))
}
console.log('\n== 근접 색 교체 ==')
console.log('max |Δ|', mx, '(원점수 기준', mxRaw, ')\n ', rows.join(' | '))
gate('근접 색 최대 |Δ|', mxRaw <= 9, mxRaw, '≤ 9 (원점수)')

/* 5) 대표님 사례 — 오트밀 코트 · 스칼렛 니트 · 다크틸 슬랙스 · 화이트 로퍼 */
const ceoBase = { top: 'scarlet', bottom: 'dark_teal', shoes: 'white' }
const withCoat = ev({ outer: 'oatmeal', ...ceoBase }), noCoat = ev(ceoBase)
console.log('\n== 대표님 사례 ==')
console.log('코트 있음', withCoat.cal, '|', withCoat.reasons.filter(x => x.w < 0).map(x => x.txt).join(' / '))
console.log('코트 없음', noCoat.cal, '|', noCoat.reasons.filter(x => x.w < 0).map(x => x.txt).join(' / '))
gate('대표님 사례 (코트 있음)', withCoat.cal <= 70, withCoat.cal, '≤ 70')
gate('대표님 사례 (코트 없음)', noCoat.cal <= 50, noCoat.cal, '≤ 50')

/* 6) 실제 룩 495 — 대표님이 핀터레스트에서 고른 착장의 자리→색 키(이미지 없음).
   좋은/나쁜을 가르는 세트가 아니라 "정상 코디"만 모은 것이라, 평균이 떨어지거나 60 미만이 늘면 규칙이 과하게 깎는다는 뜻이다.
   이너는 셔츠로 본다(연구 때와 같은 조건 — 기본 판의 터틀넥은 실제 룩에서 드물다) */
const LOOKS = fs.readFileSync(path.join(ROOT, 'src/lib/engine/looks_v1.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l))
const LOOK_SLOTS = ['outer', 'top', 'inner', 'bottom', 'shoes', 'hat', 'scarf']
const LOOK_IDS = { ...DEF, inner: '08_shirt_closed' }
const unknown = [...new Set(LOOKS.flatMap(l => LOOK_SLOTS.map(s => l[s]).filter(k => k && !COLORS_60[k])))]
const looks = LOOKS.map(l => {
  const keys = {}
  for (const s of LOOK_SLOTS) if (l[s]) keys[s] = l[s]
  return { file: l.file, cal: ev(keys, LOOK_IDS).cal }
})
const lc = looks.map(x => x.cal)
const lt60 = +(lc.filter(x => x < 60).length / lc.length * 100).toFixed(1)
console.log(`\n== 실제 룩 ${looks.length}벌 ==`)
console.log(stats(lc))
console.log('-- 낮은 10벌'); [...looks].sort((a, b) => a.cal - b.cal).slice(0, 10).forEach(x => console.log(` ${x.cal} ${x.file}`))
gate('실제 룩 색 키', unknown.length === 0, unknown.length ? unknown.join(',') : '전부 팔레트에 있음', '팔레트에 없는 키 0')
gate(`실제 룩 ${looks.length}벌 평균`, mean(lc) >= 84, mean(lc), '≥ 84')
gate('실제 룩 60점 미만', lt60 <= 2, lt60 + '%', '≤ 2%')

console.log('\n== 통과선 ==')
gates.forEach(x => console.log(` ${x.ok ? '✅' : '❌'} ${x.label}: ${x.got} (${x.want})`))
const failed = gates.filter(x => !x.ok)
if (failed.length) { console.log(`\n${failed.length}개 통과 못 함. 가중치를 만지기 전에 ALL=1 로 어느 규칙이 튀는지 본다.`); process.exit(1) }
