// ================================================================
// shop.ts — 결과 화면 → 자사몰(바루사) 상품 연결
//
// products_cache 는 앱 DB(ywqaxxcvzhwhascbkyhp)가 아니라 별도의
// 프로덕션 전용 Supabase 프로젝트(kwcogjzwpnvqwmifizce)에 있다 (2026-09-14 직접 조회 확인).
// color_primary(한글 색이름)는 32%가 비어 있어 hex(color_hex_primary, 99.9% 채움)로만 비교한다.
// cafe24_url 은 이미 완성된 링크이므로 그대로 연다 — 절대 조립하지 않는다.
// 근거: HANDOFF-shop-link.md (09-14 전면 수정판)
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

/** ΔL·ΔC 는 작게, Δh 는 크게 — 완전히 다른 색이 "가장 가까운 색"이 되지 않도록 threshold 로 자른다.
 *  값은 scripts/shop-check.mjs 로 25/35/45 를 비교해 정했다(PR 본문 참고). */
export const COLOR_DIST_THRESHOLD = 35

const dH = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d }

/** 앱 팔레트 hcl [h,C,L] vs 상품 hex 를 같은 공간(LCh)에서 비교한다 */
export function colorDist(colorKey: string, productHex: string): number {
  const hcl = COLORS_60[colorKey]?.hcl
  if (!hcl) return Infinity
  const [h, C, L] = hcl
  const p = lch(productHex)
  return dH(h, p.h) + Math.abs(L - p.L) * 0.3 + Math.abs(C - p.C) * 0.3
}

export interface ShopProduct {
  cafe24_url: string
  product_name: string
  subcategory: string
  color_hex_primary: string
  price: number | null
  original_price: number | null
  image_url: string | null
  style_tags: string[] | null
}

export interface OutfitItem { plate: string; colorKey: string }
export interface ShopGroup { subcat: string; colorKey: string; products: ShopProduct[] }

/** 현재 코디에서 연결 가능한 (subcategory, 그 칸의 색) 목록. 같은 subcat 이 여럿이면 처음 것만 쓴다 */
export function shopEntries(items: OutfitItem[]): { subcat: string; colorKey: string }[] {
  const seen = new Set<string>()
  const out: { subcat: string; colorKey: string }[] = []
  for (const { plate, colorKey } of items) {
    const subcat = SUBCAT_BY_PLATE[plate]
    if (!subcat || seen.has(subcat)) continue
    seen.add(subcat); out.push({ subcat, colorKey })
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
    .select('cafe24_url,product_name,subcategory,color_hex_primary,price,original_price,image_url,style_tags')
    .eq('is_sold', false)
    .in('subcategory', subcats)
    .not('color_hex_primary', 'is', null)
    .limit(200)
  if (error || !data) return []

  const styleTag = styleId ? STYLE_TAG_BY_ID[styleId] : null
  const groups = entries.map(({ subcat, colorKey }) => {
    const products = (data as ShopProduct[])
      .filter(p => p.subcategory === subcat)
      .map(p => ({ p, dist: colorDist(colorKey, p.color_hex_primary) }))
      .filter(x => x.dist <= COLOR_DIST_THRESHOLD)
      .sort((a, b) => {
        const ta = styleTag && a.p.style_tags?.includes(styleTag) ? 0 : 1
        const tb = styleTag && b.p.style_tags?.includes(styleTag) ? 0 : 1
        return ta - tb || a.dist - b.dist
      })
      .map(x => x.p)
    return { subcat, colorKey, products }
  })
  return groups.sort((a, b) => b.products.length - a.products.length)
}
