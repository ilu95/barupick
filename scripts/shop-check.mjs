/**
 * 자사몰 연결 점검 — npm run shop:check (네트워크 사용, engine:check 와 별도 커맨드)
 *
 *   1) 앱 판 중 subcategory 매핑이 없는 것 (의도적으로 뺀 것: 신발·타이·양말·원피스류)
 *   2) 주요 12판 × 주요 10색 조합의 실제 후보 수 — 5개 미만인 조합이 몇 개인지
 *   3) 색 거리 threshold 25/35/45 비교 — 후보 수와 눈에 띄는 오배색 여부
 *
 * engine-check.mjs 와 같은 방식으로 esbuild 번들 + Node 실행.
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
      `export { SUBCAT_BY_PLATE, shopSupabase, colorDist } from './src/lib/shop'`,
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

const { PLATE_NAMES, PLATE_SLOT, TYPES, TYPES_W, SUBCAT_BY_PLATE, shopSupabase, colorDist } = await import(pathToFileURL(OUT).href)

// ── 1) 매핑 없는 앱 판 (신발·양말·타이·원피스류는 HANDOFF 범위 밖이라 의도적으로 제외) ──
const allWearPlates = new Set([...Object.keys(PLATE_NAMES), ...Object.values(TYPES).flat(), ...Object.values(TYPES_W).flat()])
const unmapped = [...allWearPlates].filter(p => !SUBCAT_BY_PLATE[p] && PLATE_SLOT[p] !== 'shoe')
console.log('== 1) subcategory 매핑 없는 판 (신발 제외) ==')
console.log(unmapped.length ? unmapped.join(', ') : '(없음)')
console.log('→ 신발 판은 재고 0이라 원천적으로 미매핑')

// ── 2) 12 주요 판 × 10 주요 색 → 실제 후보 수, threshold 25/35/45 비교 ──
const MAJOR_PLATES = ['08_shirt_closed', '11_knit_crew', '35_sweat', '16_hoodie', '15_cardigan', '17_coat_long', '19_blazer', '18_jacket_short', '20_leather', '21_windbreaker', '29_puffer', '01_denim_straight']
const MAJOR_COLORS = ['white', 'black', 'navy', 'beige', 'gray', 'charcoal', 'camel', 'olive', 'burgundy', 'brown']

const subcats = [...new Set(MAJOR_PLATES.map(p => SUBCAT_BY_PLATE[p]))]
console.log('\n조회 subcategory:', subcats.join(', '))
const { data, error } = await shopSupabase
  .from('products_cache')
  .select('cafe24_url,product_name,subcategory,color_hex_primary,price,original_price,image_url,style_tags')
  .eq('is_sold', false)
  .in('subcategory', subcats)
  .not('color_hex_primary', 'is', null)
  .limit(1000) // 점검용: 실제 화면 질의는 200
if (error) { console.error('조회 실패', error); process.exit(1) }
console.log(`조회된 상품 ${data.length}개`)

for (const THRESHOLD of [25, 35, 45]) {
  console.log(`\n== threshold ${THRESHOLD} (헤더: ${MAJOR_COLORS.join(' ')}) ==`)
  let under5 = 0, total = 0
  for (const plate of MAJOR_PLATES) {
    const subcat = SUBCAT_BY_PLATE[plate]
    const counts = MAJOR_COLORS.map(colorKey => {
      const n = data.filter(p => p.subcategory === subcat && colorDist(colorKey, p.color_hex_primary) <= THRESHOLD).length
      total++; if (n < 5) under5++
      return n
    })
    console.log(`${plate}(${subcat}): ${counts.join(' ')}`)
  }
  console.log(`→ 5개 미만 조합: ${under5}/${total}`)

  // 눈에 띄는 오배색 샘플 — 파랑 계열 색에 threshold 안에서 잡힌 상품 중 색상명이 크게 다른 것
  const navySample = data.filter(p => p.subcategory === '셔츠' && colorDist('navy', p.color_hex_primary) <= THRESHOLD).slice(0, 5)
  console.log('  navy·셔츠 샘플 hex:', navySample.map(p => p.color_hex_primary).join(', ') || '(없음)')
}

console.log('\n== 완료 == 위 표를 보고 shop.ts 의 COLOR_DIST_THRESHOLD·PR 본문을 정한다.')
