/**
 * 기온 점검 — npm run temp:check   (ALL=1 이면 상황 6개를 전부 찍는다)
 *
 * 체감 온도에 맞춰 고른 코디가 그 기온에 실제로 입을 만한지 본다(대표님 지적 09-17:
 * "몇몇 조합은 이 온도에 입기에는 좀 많이 덥지 않나").
 * 기온 10개 × 상황 6개 × 상위 3벌 = 180벌을 통용 기온별 옷차림표(8칸)에 비춘다.
 *
 * HOT 표와 coldFlag 는 그 옷차림표를 옮긴 것이다 — 검사 기준이므로 코드에 맞춰 고치지 않는다.
 * 어긋나면 outfits.ts 의 W_ANCHORS(기온 앵커)나 TEMPLATES(고를 옷이 없는 경우)를 손본다.
 *
 * 앱과 같은 판·규칙을 쓰려고 esbuild 로 src/lib/outfits.ts 를 Node 용으로 번들해 부른다(engine-check.mjs 와 같은 방식).
 */
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import fs from 'node:fs'
import { build } from 'esbuild'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'node_modules/.cache/temp-check.bundle.mjs')
fs.mkdirSync(path.dirname(OUT), { recursive: true })
await build({
  stdin: { contents: `export { ranked, TEMPLATES, PARTS, partsOf, idealW, plateName, warmth, SITU } from './src/lib/outfits'`, resolveDir: ROOT, loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', outfile: OUT, logLevel: 'error',
})

/* 브라우저 전역 스텁 — 앱 모듈이 최상단에서 localStorage·navigator 를 읽는다 */
const store = new Map()
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear(), key: i => [...store.keys()][i], get length() { return store.size } }
globalThis.sessionStorage = globalThis.localStorage
Object.defineProperty(globalThis, 'navigator', { value: { language: 'ko-KR', languages: ['ko-KR'], userAgent: 'node' }, configurable: true })
const noop = () => {}
globalThis.window = Object.assign(globalThis, { addEventListener: noop, removeEventListener: noop, dispatchEvent: () => true, matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }), location: { href: 'http://localhost/', origin: 'http://localhost', pathname: '/', search: '', hash: '' } })
globalThis.document = { documentElement: { lang: 'ko', setAttribute: noop, classList: { add: noop, remove: noop, toggle: noop } }, addEventListener: noop, removeEventListener: noop, createElement: () => ({ style: {}, setAttribute: noop }), body: { appendChild: noop } }
globalThis.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o && o.detail } }

const { ranked, TEMPLATES, PARTS, partsOf, idealW, plateName, warmth, SITU } = await import(pathToFileURL(OUT).href)

/* ── 기준표(나무위키·기상청 통용 기온별 옷차림) ── */
const HOT = { // 그 구간에 "덥다"고 보는 판
  26:  ['29_puffer','17_coat_long','28_coat_short','30_trench','19_blazer','31_trucker','20_leather','43_mustang','21_windbreaker','42_fleece','15_cardigan','14_knit_vest','45_vest_padding','13_knit_turtle','11_knit_crew','12_knit_vneck','35_sweat','16_hoodie','07_tee_long','03_slacks_straight','04_slacks_wide','75_boots_chelsea','76_boots_walker'],
  23:  ['29_puffer','17_coat_long','28_coat_short','30_trench','19_blazer','31_trucker','20_leather','43_mustang','15_cardigan','14_knit_vest','45_vest_padding','13_knit_turtle','11_knit_crew','12_knit_vneck','35_sweat','16_hoodie','75_boots_chelsea','76_boots_walker'],
  20:  ['29_puffer','17_coat_long','28_coat_short','30_trench','20_leather','43_mustang','13_knit_turtle','45_vest_padding'],
  17:  ['29_puffer','17_coat_long','28_coat_short','43_mustang'],
  12:  ['29_puffer'],
  9:   [],
  5:   [], 0: [], [-99]: [] }
const bandOf = t => t>=28?26 : t>=23?23 : t>=20?20 : t>=17?17 : t>=12?12 : t>=9?9 : t>=5?5 : t>=0?0 : -99
const coldFlag = (t,p) => t<9 ? (!p.outer ? '춥다(아우터 없음)' : (t<5 && !['29_puffer','17_coat_long','28_coat_short','20_leather','43_mustang'].includes(p.outer) ? '춥다(얇은 아우터)' : null))
                        : t<12 ? (!p.outer && !p.layer ? '춥다(아우터·레이어 없음)' : null) : null

/* 예외 하나: 28° 위 '정장'의 슬랙스. HOT 표의 "28° 위엔 슬랙스가 덥다"는 평상복 기준이고,
   격식 범위(3.8~5)에 드는 하의는 슬랙스뿐이라 풀을 늘려도 앵커를 옮겨도 사라지지 않는다.
   30° 결혼식에 반바지를 권할 수는 없으므로 세지 않되, 눈에 보이게 따로 찍는다. */
const SLACKS = ['03_slacks_straight','04_slacks_wide']
const dressCode = (t, situ, hotParts) => t >= 28 && situ === 'formal' && hotParts.every(k => SLACKS.includes(k))

const ctxOf = (temp, situ) => ({ sex:'m', situ, temp, prefs:{likes:{},likedStyles:{},dislikes:[]}, recent:[] })
const TEMPS = [-5, 2, 6, 10, 14, 18, 21, 24, 27, 30]
const situs = SITU.map(s => s.id)
const GATE = 10 // 어긋남 통과선 %

/* 풀 자체 — 칸을 고쳐도 고를 옷이 없으면 못 고친다 */
const pool = TEMPLATES.map(c => ({ c, p: partsOf(c, 'm') }))
console.log(`상황: ${situs.join(' ')} | 템플릿 ${TEMPLATES.length}벌`)
console.log(`풀: 아우터 없음 ${pool.filter(x=>!x.p.outer).length} · 반팔/민소매 상의 ${pool.filter(x=>x.p.top==='06_tee_short'||x.p.top==='36_tank').length} · 반바지 ${pool.filter(x=>x.p.bottom==='05_shorts').length}`)
const hist = {}; for (const x of pool) { const b = Math.round(warmth(x.p)*2)/2; hist[b] = (hist[b]||0)+1 }
console.log('풀 보온 분포(w):', Object.keys(hist).sort((a,b)=>a-b).map(k=>`${k}:${hist[k]}`).join(' '))

const summary = {}
for (const t of TEMPS) {
  const hot = new Set(HOT[bandOf(t)] || [])
  let flagged = 0, exempt = 0, total = 0; const lines = []
  for (const situ of situs) {
    const top = ranked(ctxOf(t, situ)).slice(0, 3)
    for (const e of top) {
      total++
      const hotParts = PARTS.filter(k => e.p[k] && hot.has(e.p[k]))
      const ex = hotParts.length > 0 && dressCode(t, situ, hotParts.map(k => e.p[k]))
      const flag = hotParts.length ? `덥다(${hotParts.map(k => plateName(e.p[k])).join('·')})${ex ? ' ※정장 예외' : ''}` : coldFlag(t, e.p)
      if (flag) { if (ex) exempt++; else flagged++ }
      if (process.env.ALL || situ === 'daily' || situ === 'work')
        lines.push(`   ${situ.padEnd(6)} #${top.indexOf(e)+1} w=${e.s.w.toFixed(1)} 날씨점수 ${e.s.weather.toFixed(0).padStart(2)}/25 ${flag ? '⚠ '+flag : '  ok'}  ${PARTS.filter(k => e.p[k] && k !== 'tie').map(k => plateName(e.p[k])).join(' · ')}`)
    }
  }
  summary[t] = { flagged, exempt, total }
  console.log(`\n■ ${t}°  이상적 w ${idealW(t).map(x => x.toFixed(2)).join('~')}  — 상황 ${situs.length}개 × 상위 3 = ${total}벌 중 기준표와 어긋남 ${flagged}${exempt ? ` (+ 정장 예외 ${exempt})` : ''}`)
  for (const l of lines) console.log(l)
}

console.log('\n== 요약: 기온별 상위 3벌(상황 6개) 중 기준표 어긋남 ==')
const bad = []
for (const t of TEMPS) {
  const { flagged, exempt, total } = summary[t], pct = flagged / total * 100
  if (pct > GATE) bad.push(t)
  console.log(` ${pct > GATE ? '❌' : '✅'} ${String(t).padStart(3)}°  ${flagged}/${total}  ${pct.toFixed(0)}%${exempt ? `   (정장 예외 ${exempt})` : ''}`)
}
if (bad.length) { console.log(`\n${bad.join('·')}° 가 ${GATE}% 를 넘는다. 폭을 넓히지 말고 그 기온의 W_ANCHORS 를 옮기거나, 고를 옷이 없으면 TEMPLATES 를 늘린다.`); process.exit(1) }
console.log(`\n모든 기온에서 어긋남 ${GATE}% 이하.`)
