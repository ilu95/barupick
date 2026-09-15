/**
 * 자사몰 연결 점검 — npm run shop:check (네트워크 사용, engine:check 와 별도 커맨드)
 *
 *   1) 앱 판 중 subcategory 매핑이 없는 것 (의도적으로 뺀 것: 신발·타이·양말·원피스류)
 *   2) 판매중 상품의 final_colors.main.key 중 앱 팔레트(COLORS_60)에 없는 키가 있는지 · 키 자체가 없는 상품 비율
 *   3) 판별 규칙(NAME_RULE_BY_PLATE)이 있는 판마다 규칙 통과 재고 수, 규칙이 없어 subcategory 만으로 통과하는 판 목록
 *   4) 주요 12판 × 주요 10색 조합의 후보 수 — 이름 규칙 적용 후, 같은 키만 vs SHOP_MATCH_THRESHOLD 로 넓힌 뒤. 후보 0인 칸 개수
 *   5) 문턱 후보(20/32/45)마다, 코디 색마다 어떤 상품 색 이름이 딸려 오는지 한글로 — 문턱을 눈으로 정하는 근거
 *
 * engine-check.mjs 와 같은 방식으로 esbuild 번들 + Node 실행.
 * 근거: HANDOFF-shop-garment-type.md (09-15, 옷 종류는 subcategory 가 아니라 상품명에서 좁힌다)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'node_modules/.cache/shop-check.bundle.mjs')
fs.mkdirSync(path.dirname(OUT), { recursive: true })

await build({
  stdin: {
    contents: [
      `export { COLORS_60, getColorName } from './src/lib/colors'`,
      `export { PLATE_NAMES, PLATE_SLOT } from './src/lib/outfits'`,
      `export { TYPES, TYPES_W } from './src/lib/builderSlots'`,
      `export { SUBCAT_BY_PLATE, NAME_RULE_BY_PLATE, matchesNameRule, shopSupabase, productColorKey, colorDistance, SHOP_MATCH_THRESHOLD } from './src/lib/shop'`,
    ].join('\n'),
    resolveDir: ROOT,
    loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', outfile: OUT, logLevel: 'error',
  // Vite 전용 import.meta.env — Node 번들에선 항상 기본값(내장 프로덕션 anon key)을 쓴다
  define: { 'import.meta.env.VITE_SHOP_SUPABASE_URL': 'undefined', 'import.meta.env.VITE_SHOP_SUPABASE_ANON_KEY': 'undefined' },
})
/* 브라우저 전역 스텁 — 앱 모듈이 최상단에서 localStorage·navigator 를 읽는다 (engine-check.mjs 와 동일) */
const store = new Map()
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear(), key: i => [...store.keys()][i], get length() { return store.size } }
globalThis.sessionStorage = globalThis.localStorage
Object.defineProperty(globalThis, 'navigator', { value: { language: 'ko-KR', languages: ['ko-KR'], userAgent: 'node', onLine: true }, configurable: true })
const noop = () => {}
globalThis.window = Object.assign(globalThis, { addEventListener: noop, removeEventListener: noop, dispatchEvent: () => true, matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }), location: { href: 'http://localhost/', origin: 'http://localhost', pathname: '/', search: '', hash: '' } })
globalThis.document = { documentElement: { lang: 'ko', setAttribute: noop, classList: { add: noop, remove: noop, toggle: noop } }, addEventListener: noop, removeEventListener: noop, createElement: () => ({ style: {}, setAttribute: noop }), body: { appendChild: noop } }
globalThis.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o && o.detail } }

const { COLORS_60, getColorName, PLATE_NAMES, PLATE_SLOT, TYPES, TYPES_W, SUBCAT_BY_PLATE, NAME_RULE_BY_PLATE, matchesNameRule, shopSupabase, productColorKey, colorDistance, SHOP_MATCH_THRESHOLD } = await import(pathToFileURL(OUT).href)

// ── 1) 매핑 없는 앱 판 (신발·양말·타이·원피스류는 HANDOFF 범위 밖이라 의도적으로 제외) ──
const allWearPlates = new Set([...Object.keys(PLATE_NAMES), ...Object.values(TYPES).flat(), ...Object.values(TYPES_W).flat()])
const unmapped = [...allWearPlates].filter(p => !SUBCAT_BY_PLATE[p] && PLATE_SLOT[p] !== 'shoe')
console.log('== 1) subcategory 매핑 없는 판 (신발 제외) ==')
console.log(unmapped.length ? unmapped.join(', ') : '(없음)')
console.log('→ 신발 판은 재고 0이라 원천적으로 미매핑')

// ── 2) 판매중 상품 전체 조회 + 색 키 상태 확인 ──
const MAJOR_PLATES = ['08_shirt_closed', '11_knit_crew', '35_sweat', '16_hoodie', '15_cardigan', '17_coat_long', '19_blazer', '18_jacket_short', '20_leather', '21_windbreaker', '29_puffer', '01_denim_straight']
const MAJOR_COLORS = ['white', 'black', 'navy', 'beige', 'gray', 'charcoal', 'camel', 'olive', 'burgundy', 'brown']

const subcats = [...new Set(MAJOR_PLATES.map(p => SUBCAT_BY_PLATE[p]))]
console.log('\n조회 subcategory:', subcats.join(', '))
const { data, error } = await shopSupabase
  .from('products_cache')
  .select('cafe24_url,product_name,subcategory,color_key:product_data_json->final_colors->main->>key,style_tags')
  .eq('is_sold', false)
  .in('subcategory', subcats)
  .limit(1000)
if (error) { console.error('조회 실패', error); process.exit(1) }
console.log(`조회된 상품 ${data.length}개`)

const keys = data.map(productColorKey)
const noKey = keys.filter(k => !k).length
const unknownKeys = [...new Set(keys.filter(k => k && !COLORS_60[k]))]
console.log('\n== 2) 색 키 상태 ==')
console.log(`키 없음: ${noKey}/${data.length}`)
console.log(`앱 팔레트에 없는 키: ${unknownKeys.length ? unknownKeys.join(', ') : '(없음)'}`)

// ── 3) 판별 규칙(NAME_RULE_BY_PLATE) 통과 재고 — 규칙 없는 판은 subcategory 만으로 통과 ──
console.log('\n== 3) 이름 규칙 통과 재고 ==')
for (const plate of MAJOR_PLATES) {
  const subcat = SUBCAT_BY_PLATE[plate]
  const inSubcat = data.filter(p => p.subcategory === subcat)
  const rule = NAME_RULE_BY_PLATE[plate]
  if (!rule) continue
  const passed = inSubcat.filter(p => matchesNameRule(plate, p.product_name)).length
  console.log(`${plate}(${subcat}): 규칙 통과 ${passed}/${inSubcat.length}`)
}
const noRule = MAJOR_PLATES.filter(p => !NAME_RULE_BY_PLATE[p])
console.log(`규칙 없음(subcategory 만으로 통과): ${noRule.length ? noRule.join(', ') : '(없음)'}`)

// ── 4) 12 주요 판 × 10 주요 색 → 이름 규칙 적용 후, 같은 키 후보 수 / 문턱 넓힌 뒤 후보 수 ──
console.log(`\n== 4) 후보 수(이름 규칙 적용 후, 같은키/넓힌뒤, 문턱=${SHOP_MATCH_THRESHOLD}) — 헤더: ${MAJOR_COLORS.join(' ')} ==`)
let zeroCells = 0
for (const plate of MAJOR_PLATES) {
  const subcat = SUBCAT_BY_PLATE[plate]
  const withKey = data.filter(p => p.subcategory === subcat && matchesNameRule(plate, p.product_name)).map(productColorKey).filter(Boolean)
  const cells = MAJOR_COLORS.map(colorKey => {
    const same = withKey.filter(k => k === colorKey).length
    const wide = withKey.filter(k => k === colorKey || colorDistance(colorKey, k) <= SHOP_MATCH_THRESHOLD).length
    if (wide === 0) zeroCells++
    return `${same}/${wide}`
  })
  console.log(`${plate}(${subcat}): ${cells.join(' ')}`)
}
console.log(`후보 0인 칸: ${zeroCells}/${MAJOR_PLATES.length * MAJOR_COLORS.length}`)

// ── 5) 문턱 후보마다 딸려 오는 상품 색 이름 — 분홍이 버건디에 섞이면 문턱이 넓은 것 ──
console.log('\n== 5) 문턱별로 딸려 오는 상품 색 (조회된 12판 전체 기준, 색 매칭만 — 이름 규칙 무관) ==')
const allKeys = keys.filter(Boolean)
const CHECK_COLORS = ['burgundy', 'gray', 'navy', 'camel', 'white', 'olive']
for (const threshold of [20, 32, 45]) {
  console.log(`-- 문턱 ${threshold} --`)
  for (const colorKey of CHECK_COLORS) {
    const matched = allKeys.filter(k => k === colorKey || colorDistance(colorKey, k) <= threshold)
    const counts = new Map()
    for (const k of matched) counts.set(k, (counts.get(k) || 0) + 1)
    const desc = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${getColorName(k)} ${n}`).join(' · ')
    console.log(`${getColorName(colorKey)} → ${desc || '(없음)'}`)
  }
}

console.log('\n== 완료 ==')
