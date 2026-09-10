// ================================================================
// builderSlots.ts — 만들기 2단계(새 디자인)의 칸·옷 종류·헤어 표
//
// 화면 오른쪽 레일 8칸: 헤어 · 이너 · 레이어드 · 악세서리 / 아우터 · 상의 · 하의 · 신발.
// 상체 네 칸은 useBuild 의 레이어(outerness 버킷)로, 하의·신발·목도리·모자는
// 판 id + 색으로 저장한다. 옷 이름은 outfits.ts 의 PLATE_NAMES(catalog3 에서 구움).
// 근거: 목업 flow-v1~v5 의 RAIL/TYPES/HINTS.
// ================================================================
import type { UpperLayer } from '@/hooks/useBuild'

export type UpperSlot = 'outer' | 'middleware' | 'top' | 'inner'
export type RailSlot = 'hair' | 'inner' | 'middleware' | 'acc' | 'outer' | 'top' | 'bottom' | 'shoes'
export type AccSlot = 'scarf' | 'hat'

/** 레일 순서 = 화면 순서 (2열 × 4행) */
export const RAIL: { id: RailSlot; icon: string; optional: boolean }[] = [
  { id: 'hair', icon: '✂︎', optional: false },
  { id: 'inner', icon: '🎽', optional: true },
  { id: 'middleware', icon: '🧶', optional: true },
  { id: 'acc', icon: '🧣', optional: true },
  { id: 'outer', icon: '🧥', optional: true },
  { id: 'top', icon: '👕', optional: false },
  { id: 'bottom', icon: '👖', optional: false },
  { id: 'shoes', icon: '👟', optional: false },
]

/** 상체 칸 → 레이어 outerness 버킷. 정렬(getSlotKey)이 그대로 outer/middleware/top/inner 가 되게 벌려 둔다 */
export const UI_OUTERNESS: Record<UpperSlot, number> = { outer: 95, middleware: 55, top: 40, inner: 10 }
/** 레이어 → 상체 칸 (옛 아이템 그리드로 만든 레이어도 outerness 로 나눈다) */
export const uiSlotOf = (l: { outerness: number }): UpperSlot => l.outerness >= 90 ? 'outer' : l.outerness >= 50 ? 'middleware' : l.outerness >= 20 ? 'top' : 'inner'
export const layerOf = (upper: UpperLayer[], slot: UpperSlot) => upper.find(l => uiSlotOf(l) === slot) || null

/** 칸별 판 목록 (남 기준). 여성은 TYPES_W 로 덧붙인다 */
export const TYPES: Record<'inner' | 'top' | 'middleware' | 'outer' | 'bottom' | 'shoes' | 'scarf' | 'hat', string[]> = {
  inner: ['07_tee_long', '06_tee_short', '13_knit_turtle', '36_tank'],
  top: ['11_knit_crew', '35_sweat', '08_shirt_closed', '16_hoodie', '37_polo', '12_knit_vneck', '09_shirt_short', '53_halfzip'],
  middleware: ['15_cardigan', '14_knit_vest', '10_shirt_open', '45_vest_padding'],
  outer: ['28_coat_short', '17_coat_long', '30_trench', '19_blazer', '31_trucker', '29_puffer', '18_jacket_short', '20_leather', '21_windbreaker', '42_fleece', '32_padding_long', '43_mustang', '44_field', '22_sukajan', '41_jacket_crop'],
  bottom: ['03_slacks_straight', '04_slacks_wide', '01_denim_straight', '02_denim_wide', '60_denim_barrel', '61_pants_balloon', '63_chino', '39_cargo', '38_denim_slim', '62_denim_boot', '64_corduroy', '40_track', '05_shorts'],
  shoes: ['74_loafer', '71_sneaker_canvas', '75_boots_chelsea', '76_boots_walker', '73_sneaker_chunky', '77_derby', '72_sneaker_runner', '80_sandal_slide', '81_boots_ugg'],
  scarf: ['54_scarf', '55_snood', '56_scarf_silk', '57_scarf_cable', '58_scarf_blanket'],
  hat: ['c1_cap', 'c2_beanie', 'c3_bucket', 'c4_beret'],
}
export const TYPES_W: Partial<Record<keyof typeof TYPES, string[]>> = {
  top: [...TYPES.top, '46_knit_crop', '47_blouse'],
  bottom: [...TYPES.bottom, '24_skirt_pleat', '49_skirt_long', '23_skirt_wrap', '25_skirt_denim', '34_skirt_knit', '48_skirt_mini', '50_leggings'],
  shoes: [...TYPES.shoes, '78_flats_ballet', '79_maryjane', '82_boots_long'],
}
export const typesFor = (slot: keyof typeof TYPES, sex: 'm' | 'w') => (sex === 'w' && TYPES_W[slot]) || TYPES[slot]

export const HAT_NAMES: Record<string, { ko: string; en: string }> = {
  c1_cap: { ko: '볼캡', en: 'Cap' }, c2_beanie: { ko: '비니', en: 'Beanie' }, c3_bucket: { ko: '버킷햇', en: 'Bucket hat' }, c4_beret: { ko: '베레모', en: 'Beret' },
}

export const HAIR: Record<'m' | 'w', { id: string; ko: string; en: string }[]> = {
  m: [{ id: 'h1_twoblock', ko: '투블럭', en: 'Two-block' }, { id: 'h5_dandy', ko: '댄디컷', en: 'Dandy' }, { id: 'h8_middle', ko: '가르마펌', en: 'Middle part' }, { id: 'h3_slick', ko: '슬릭백', en: 'Slick back' }, { id: 'h2_leaf', ko: '리프컷', en: 'Leaf cut' }, { id: 'h4_wave', ko: '웨이브', en: 'Wave' }, { id: 'h6_shadow', ko: '쉐도우펌', en: 'Shadow perm' }, { id: 'h7_buzz', ko: '반삭', en: 'Buzz' }],
  w: [{ id: 'hf5_bob', ko: '단발', en: 'Bob' }, { id: 'hf2_hush', ko: '허쉬컷', en: 'Hush cut' }, { id: 'hf4_pony', ko: '포니테일', en: 'Ponytail' }, { id: 'hf1_tassel', ko: '태슬컷', en: 'Tassel cut' }],
}
export const HAIR_COLORS: { hex: string; ko: string; en: string }[] = [
  { hex: '#2B2320', ko: '블랙', en: 'Black' }, { hex: '#3B2A21', ko: '다크 브라운', en: 'Dark brown' }, { hex: '#5A3A28', ko: '브라운', en: 'Brown' },
  { hex: '#6E5F55', ko: '애쉬', en: 'Ash' }, { hex: '#B98A5A', ko: '블론드', en: 'Blonde' }, { hex: '#7A3B2A', ko: '레드 브라운', en: 'Red brown' },
]

/** 칸별 한 줄 힌트 — 어디에 보이는 색인지 */
export const HINTS: Record<string, { ko: string; en: string }> = {
  outer: { ko: '제일 넓게 보여요. 차분한 색이 편해요', en: 'Largest area — calm colors work as the base' },
  middleware: { ko: '상의와 밝기가 달라야 겹쳐 입은 게 보여요', en: 'Separate its lightness from the top so the layer shows' },
  top: { ko: '얼굴 바로 아래라 밝은 색이 잘 받아요', en: 'Near the face — light colors flatter' },
  inner: { ko: '목선에만 살짝 보여요. 포인트 색도 괜찮아요', en: 'Only shows at the neckline — use as an accent' },
  bottom: { ko: '아래가 어두우면 안정감이 있어요', en: 'Darker below feels grounded' },
  shoes: { ko: '하의 색이나 무채색으로 맞추면 깔끔해요', en: 'Match the bottom or go neutral' },
  scarf: { ko: '얼굴 옆이라 퍼스널컬러가 제일 잘 드러나요', en: 'Next to the face — personal color shows most' },
  hat: { ko: '신발이나 하의와 같은 계열이면 잘 어울려요', en: 'One dot on top — tie it to shoes or bottom' },
  hair: { ko: '상의보다 어둡거나 밝아야 얼굴이 살아요', en: 'Hair color reads best against the top' },
}

/** 기본 색 (칸을 처음 채울 때) */
export const DEFAULT_COLOR: Record<string, string> = { outer: 'charcoal', middleware: 'beige', top: 'white', inner: 'white', bottom: 'charcoal', shoes: 'black', scarf: 'burgundy', hat: 'black' }
