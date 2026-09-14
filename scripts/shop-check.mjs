/**
 * 자사몰 연결 점검 — npm run shop:check (네트워크 사용, engine:check 와 별도 커맨드)
 *
 *   1) 앱 판 중 subcategory 매핑이 없는 것 (의도적으로 뺀 것: 신발·타이·양말·원피스류)
 *   2) 판매중 상품의 color_hex_primary 중 PRODUCT_HEX_LABEL 표에 없는 새 hex 가 있는지
 *   3) 주요 12판 × 주요 10색 조합의 실제 후보 수 — 5개 미만인 조합이 몇 개인지
 *   4) 후보로 잡힌 상품 hex 목록 — 계열이 엉뚱하게 섞였는지 눈으로 확인
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
      `export { SUBCAT_BY_PLATE, shopSupabase, colorLabel, productLabel, PRODUCT_HEX_LABEL } from './src/lib/shop'`,
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

const { PLATE_NAMES, PLATE_SLOT, TYPES, TYPES_W, SUBCAT_BY_PLATE, shopSupabase, colorLabel, productLabel, PRODUCT_HEX_LABEL } = await import(pathToFileURL(OUT).href)

// ── 1) 매핑 없는 앱 판 (신발·양말·타이·원피스류는 HANDOFF 범위 밖이라 의도적으로 제외) ──
const allWearPlates = new Set([...Object.keys(PLATE_NAMES), ...Object.values(TYPES).flat(), ...Object.values(TYPES_W).flat()])
const unmapped = [...allWearPlates].filter(p => !SUBCAT_BY_PLATE[p] && PLATE_SLOT[p] !== 'shoe')
console.log('== 1) subcategory 매핑 없는 판 (신발 제외) ==')
console.log(unmapped.length ? unmapped.join(', ') : '(없음)')
console.log('→ 신발 판은 재고 0이라 원천적으로 미매핑')

// ── 2) 판매중 상품 전체 조회 + PRODUCT_HEX_LABEL 표에 없는 새 hex 확인 ──
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
  .limit(1000)
if (error) { console.error('조회 실패', error); process.exit(1) }
console.log(`조회된 상품 ${data.length}개`)

console.log('\n== 2) PRODUCT_HEX_LABEL 표에 없는 hex ==')
const unknownHex = [...new Set(data.map(p => p.color_hex_primary.toUpperCase()).filter(h => !PRODUCT_HEX_LABEL[h]))]
console.log(unknownHex.length ? unknownHex.join(', ') : '(없음 — 표에 다 있음)')

// ── 3) 12 주요 판 × 10 주요 색 → 실제 후보 수 ──
console.log(`\n== 3) 후보 수 (헤더: ${MAJOR_COLORS.join(' ')}) ==`)
let under5 = 0, total = 0
for (const plate of MAJOR_PLATES) {
  const subcat = SUBCAT_BY_PLATE[plate]
  const counts = MAJOR_COLORS.map(colorKey => {
    const label = colorLabel(colorKey)
    const n = data.filter(p => p.subcategory === subcat && productLabel(p.color_hex_primary) === label).length
    total++; if (n < 5) under5++
    return n
  })
  console.log(`${plate}(${subcat}): ${counts.join(' ')}`)
}
console.log(`→ 5개 미만 조합: ${under5}/${total}`)

// ── 4) 후보 hex 눈으로 확인 — 화이트·블랙·그레이·네이비·카멜·버건디 여섯 색 ──
console.log('\n== 4) 후보 상품 hex 목록 (셔츠 subcat, 색상별) ==')
for (const colorKey of ['white', 'black', 'gray', 'navy', 'camel', 'burgundy']) {
  const label = colorLabel(colorKey)
  const hexes = data.filter(p => p.subcategory === '셔츠' && productLabel(p.color_hex_primary) === label).map(p => p.color_hex_primary)
  console.log(`${colorKey}(${label}): ${hexes.join(', ') || '(없음)'}`)
}

console.log('\n== 완료 ==')
