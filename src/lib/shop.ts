// ================================================================
// shop.ts — 결과 화면 → 자사몰(바루사) 상품 연결
//
// products_cache 는 앱 DB(ywqaxxcvzhwhascbkyhp)가 아니라 별도의
// 프로덕션 전용 Supabase 프로젝트(kwcogjzwpnvqwmifizce)에 있다 (2026-09-14 직접 조회 확인).
// cafe24_url 은 이미 완성된 링크이므로 그대로 연다 — 절대 조립하지 않는다.
//
// 색 매칭은 product_data_json.final_colors.main.key — 앱 팔레트 키 그대로다(판매중 99.1%에 있음).
// color_hex_primary·final_colors 의 hex/hcl 은 팔레트 v3.1 이전 값이라 낡았다(예: 상품 navy #000080 ≠
// 앱 navy #1F2A44) — 쓰지 않는다. 키만 꺼내 앱 팔레트(COLORS_60)로 다시 읽어 거리를 잰다.
// 근거: HANDOFF-shop-color-v2.md (09-15, CEO 지적대로 계열 매칭 → 키 매칭으로 교체)
// ================================================================
import { createClient } from '@supabase/supabase-js'
import { lch } from '@/lib/engine/v7'
import { COLORS_60 } from '@/lib/colors'

const SHOP_URL = 'https://kwcogjzwpnvqwmifizce.supabase.co'
// 공개용 anon key (RLS 로 보호됨 — 프로덕션 번들에 이미 노출되어 있는 값과 동일)
const SHOP_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3Y29nanp3cG52cXdtaWZpemNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzYwODQsImV4cCI6MjA4Nzg1MjA4NH0.9vxFkBSMERxEtQnwEPceEAosLCZjY9NLQO9qfx-MZlw'

const envUrl = import.meta.env.VITE_SHOP_SUPABASE_URL as string | undefined
const envKey = import.meta.env.VITE_SHOP_SUPABASE_ANON_KEY as string | undefined

export const shopSupabase = createClient(envUrl || SHOP_URL, envKey || SHOP_KEY)

/** 판 id → products_cache.subcategory. 신발 판은 넣지 않는다(재고 0). 목록 밖 판(타이·양말·원피스류)은 연결하지 않는다. */
export const SUBCAT_BY_PLATE: Record<string, string> = {
  '08_shirt_closed': '셔츠', '09_shirt_short': '셔츠', '10_shirt_open': '셔츠', '47_blouse': '셔츠',
  '11_knit_crew': '스웨터', '12_knit_vneck': '스웨터', '13_knit_turtle': '스웨터', '46_knit_crop': '스웨터',
  '35_sweat': '맨투맨',
  '16_hoodie': '후드',
  '15_cardigan': '가디건',
  '14_knit_vest': '조끼', '45_vest_padding': '조끼',
  '17_coat_long': '코트', '28_coat_short': '코트', '30_trench': '코트',
  '19_blazer': '블레이저',
  '18_jacket_short': '자켓', '31_trucker': '자켓', '41_jacket_crop': '자켓',
  '20_leather': '가죽자켓', '43_mustang': '가죽자켓',
  '21_windbreaker': '바람막이', '42_fleece': '바람막이',
  '29_puffer': '패딩', '32_padding_long': '패딩',
  '22_sukajan': '스카잔',
  '01_denim_straight': '바지', '02_denim_wide': '바지', '03_slacks_straight': '바지', '04_slacks_wide': '바지',
  '38_denim_slim': '바지', '39_cargo': '바지', '40_track': '바지', '60_denim_barrel': '바지',
  '61_pants_balloon': '바지', '62_denim_boot': '바지', '63_chino': '바지', '64_corduroy': '바지', '50_leggings': '바지',
  '05_shorts': '반바지',
  '23_skirt_wrap': '스커트', '24_skirt_pleat': '스커트', '25_skirt_denim': '스커트', '34_skirt_knit': '스커트',
  '48_skirt_mini': '스커트', '49_skirt_long': '스커트',
  '54_scarf': '머플러', '55_snood': '머플러', '56_scarf_silk': '머플러', '57_scarf_cable': '머플러', '58_scarf_blanket': '머플러',
  'c1_cap': '모자', 'c2_beanie': '모자', 'c3_bucket': '모자', 'c4_beret': '모자',
}

/** 코디 스타일 id → products_cache.style_tags 값. 겹치는 6개 태그만 있다(정렬용, 필터 아님) */
export const STYLE_TAG_BY_ID: Record<string, string> = {
  preppy: '프레피', workwear: '워크웨어', oldmoney: '올드머니', gorpcore: '아웃도어', athleisure: '스포츠', street: '스트릿',
}

/** 판 id → 상품명으로 종류를 더 좁히는 규칙. 규칙이 없는 판은 subcategory 만으로 충분해 그대로 통과한다.
 *  통과 조건: include 매치 OR (exclude 가 있고, exclude 에 안 걸림) — "이름에 표시가 있으면 그것만 고르고,
 *  아무 표시도 없으면 그 subcategory 의 기본형으로 본다"(HANDOFF-shop-garment-type.md, 09-15 대표님 지적:
 *  목폴라 보던 사람에게 니트 스웨터를 억지로 보여주지 않는다). 대소문자 무시(상품명에 V넥·v넥 섞여 있음).
 *  통과 0건이면 그 칸은 후보 없음 — subcategory 로 되돌아가 넓히지 않는다. */
export const NAME_RULE_BY_PLATE: Record<string, { include: RegExp; exclude?: RegExp }> = {
  '13_knit_turtle': { include: /목폴라|터틀|하이넥/i },
  '12_knit_vneck': { include: /브이넥|v넥/i },
  '11_knit_crew': { include: /크루넥|라운드넥/i, exclude: /목폴라|터틀|하이넥|브이넥|v넥/i },
  '46_knit_crop': { include: /크루넥|라운드넥/i, exclude: /목폴라|터틀|하이넥|브이넥|v넥/i },
  '14_knit_vest': { include: /베스트|조끼/i },
  '45_vest_padding': { include: /베스트|조끼/i },
  '63_chino': { include: /치노/i },
  '03_slacks_straight': { include: /슬랙스|트라우저/i },
  '04_slacks_wide': { include: /슬랙스|트라우저/i },
  '01_denim_straight': { include: /데님|청바지/i },
  '02_denim_wide': { include: /데님|청바지/i },
  '38_denim_slim': { include: /데님|청바지/i },
  '60_denim_barrel': { include: /데님|청바지/i },
  '62_denim_boot': { include: /데님|청바지/i },
}

export function matchesNameRule(plate: string, productName: string): boolean {
  const rule = NAME_RULE_BY_PLATE[plate]
  if (!rule) return true
  if (rule.include.test(productName)) return true
  return rule.exclude ? !rule.exclude.test(productName) : false
}

/** 상품 색 키. 질의에서 product_data_json->final_colors->main->>key 만 color_key 로 뽑아 온다 —
 *  jsonb 를 통째로 받으면 3개 subcategory 기준 1.3MB 인데 키만 받으면 0.2MB 다(실측, 6배 차이).
 *  결과 화면을 볼 때마다 나가는 요청이라 모바일 데이터로 그냥 둘 수 없다. 없으면(0.9%) 후보에서 뺀다.
 *  final_colors.sub(보조색)는 이번엔 안 쓴다 — 후보만 늘고 정확도가 떨어진다. 나중에 후보가
 *  모자랄 때 main 매칭에 sub 도 더해 넓히는 식으로 풀면 된다. */
export function productColorKey(p: { color_key: string | null }): string | undefined {
  return p.color_key ?? undefined
}

/** 코디 색 ↔ 상품 색 거리 — 둘 다 앱 팔레트(COLORS_60) hex 를 lch() 로 다시 재서 잰다
 *  (상품에 박힌 hex·hcl 은 팔레트 v3.1 이전 값이라 쓰지 않는다). 채도가 낮을수록(무채에 가까울수록)
 *  색상각 차이는 의미가 옅어지므로 접어 준다. */
export function colorDistance(colorKeyA: string, colorKeyB: string): number {
  const a = COLORS_60[colorKeyA], b = COLORS_60[colorKeyB]
  if (!a || !b) return Infinity
  const la = lch(a.hex), lb = lch(b.hex)
  const dH = Math.abs(((la.h - lb.h + 540) % 360) - 180)
  const hueFold = Math.min(la.C, lb.C, 20) / 20 // 채도 20 이하(무채에 가까움)면 색상각 차이를 접는다
  return Math.abs(la.L - lb.L) + Math.abs(la.C - lb.C) + dH * hueFold
}

/** 같은 키가 아니어도 후보로 넓히는 거리 문턱. scripts/shop-check.mjs 로 눈으로 정함(HANDOFF-shop-color-v2.md #3):
 *  버건디-와인(31)·버건디-마룬(31) 은 넣고, 그레이-차콜(34)·올리브-브라운(47)·버건디-핑크(102) 는 뺀다. */
export const SHOP_MATCH_THRESHOLD = 32

export interface ShopProduct {
  cafe24_url: string
  product_name: string
  subcategory: string
  color_key: string | null
  price: number | null
  original_price: number | null
  image_url: string | null
  style_tags: string[] | null
}

/** 칩·목록 머리에 쓸 이름. 판 이름에 색 이름이 이미 들어 있으면 색을 앞에 또 붙이지 않는다
 *  ("데님" + "일자 데님" → "데님 일자 데님" 이 되는 걸 막는다). */
export function shopItemLabel(colorName: string, plateLabel: string): string {
  return plateLabel.includes(colorName) ? plateLabel : `${colorName} ${plateLabel}`
}

export interface OutfitItem { plate: string; colorKey: string }
export interface ShopGroup { plate: string; subcat: string; colorKey: string; products: ShopProduct[] }

/** 현재 코디에서 연결 가능한 (판, subcategory, 그 칸의 색) 목록. 같은 subcat 이 여럿이면 처음 것만 쓴다 */
export function shopEntries(items: OutfitItem[]): { plate: string; subcat: string; colorKey: string }[] {
  const seen = new Set<string>()
  const out: { plate: string; subcat: string; colorKey: string }[] = []
  for (const { plate, colorKey } of items) {
    const subcat = SUBCAT_BY_PLATE[plate]
    if (!subcat || seen.has(subcat)) continue
    seen.add(subcat); out.push({ plate, subcat, colorKey })
  }
  return out
}

/** 코디 전체를 한 번에 질의(HANDOFF 지정 쿼리) 후, 클라이언트에서 subcat·색 거리로 나눠 정렬한다 */
export async function findShopMatches(items: OutfitItem[], styleId?: string | null): Promise<ShopGroup[]> {
  const entries = shopEntries(items)
  if (entries.length === 0) return []
  const subcats = entries.map(e => e.subcat)
  const { data, error } = await shopSupabase
    .from('products_cache')
    .select('cafe24_url,product_name,subcategory,color_key:product_data_json->final_colors->main->>key,price,original_price,image_url,style_tags')
    .eq('is_sold', false)
    .in('subcategory', subcats)
    .limit(1000) // 판매중 전체(1,209개)가 실질적으로 다 들어오는 값 — 200이면 판별로 잘려서 후보가 60%씩 빠진다
  if (error || !data) return []

  const styleTag = styleId ? STYLE_TAG_BY_ID[styleId] : null
  const groups = entries.map(({ plate, subcat, colorKey }) => {
    const products = (data as ShopProduct[])
      .filter(p => p.subcategory === subcat && matchesNameRule(plate, p.product_name))
      .map(p => {
        const productKey = productColorKey(p)
        if (!productKey) return null
        const sameKey = productKey === colorKey
        const d = sameKey ? 0 : colorDistance(colorKey, productKey)
        return sameKey || d <= SHOP_MATCH_THRESHOLD ? { p, sameKey, d } : null
      })
      .filter((x): x is { p: ShopProduct; sameKey: boolean; d: number } => x !== null)
      // 같은 키 먼저, 그다음 거리 가까운 순, 스타일 태그는 마지막 소프트 가중(동률 정리).
      .sort((a, b) => {
        if (a.sameKey !== b.sameKey) return a.sameKey ? -1 : 1
        if (a.d !== b.d) return a.d - b.d
        const ta = styleTag && a.p.style_tags?.includes(styleTag) ? 0 : 1
        const tb = styleTag && b.p.style_tags?.includes(styleTag) ? 0 : 1
        return ta - tb
      })
      .map(x => x.p)
    return { plate, subcat, colorKey, products }
  })
  return groups.sort((a, b) => b.products.length - a.products.length)
}
