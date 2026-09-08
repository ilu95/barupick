// ================================================================
// map.ts — 바루픽 만들기 상태 → 캐릭터 렌더러 입력
//
// 바루픽의 옷은 '상의 12종 + 하의·신발·목도리·모자는 색만' 이고, 렌더러의
// 칸은 inner/mid1/mid2/outer/bottom/shoe/scarf + 머리 부속이다. 여기서
// 두 세계를 잇는다. 1단계(옷 조합 선택)가 들어오면 하의·신발도 실제 판 id 를
// 갖게 되므로, 그때는 기본 판(DEFAULT_*) 대신 고른 판을 넘기면 된다.
// ================================================================
import { getSlotKey, sortUpper, type UpperLayer, type SlotKey } from '@/hooks/useBuild'
import { profile } from '@/lib/profile'
import { PLATE_SLOT } from '@/lib/outfits'

export type CharSlot = 'inner' | 'mid1' | 'mid2' | 'outer'
export interface CharItem { id: string; color: string }
export interface CharBody {
  sex: 'm' | 'w'
  hair: string
  hairColor: string
  face?: string | null
  glasses?: string | null
  hat?: string | null
  hatColor?: string
}
export interface CharScene { items: CharItem[]; body: CharBody }

/** 바루픽 아이템 → 렌더러 칸별 후보 판. 앞에 있는 칸을 먼저 쓴다. */
const PLATES: Record<string, Partial<Record<CharSlot, string>>> = {
  padding:  { outer: '29_puffer' },
  coat:     { outer: '17_coat_long' },
  jacket:   { outer: '18_jacket_short' },
  hood_zip: { outer: '42_fleece' },
  cardigan: { mid2: '15_cardigan' },
  knit_zip: { mid1: '53_halfzip', mid2: '15_cardigan' },
  vest:     { mid2: '14_knit_vest' },
  hoodie:   { mid1: '16_hoodie' },
  knit:     { mid1: '11_knit_crew', inner: '13_knit_turtle', mid2: '14_knit_vest' },
  mtm:      { mid1: '35_sweat', inner: '07_tee_long' },
  shirt:    { mid1: '08_shirt_closed', mid2: '10_shirt_open', inner: '07_tee_long' },
  tshirt:   { inner: '07_tee_long', mid1: '06_tee_short' },
}

/** 바루픽 자동 슬롯 → 우선 시도할 렌더러 칸 */
const PREFER: Record<SlotKey, CharSlot[]> = {
  outer: ['outer', 'mid2', 'mid1', 'inner'],
  middleware: ['mid2', 'mid1', 'outer', 'inner'],
  top: ['mid1', 'inner', 'mid2', 'outer'],
  inner: ['inner', 'mid1', 'mid2', 'outer'],
  hidden: ['inner', 'mid1', 'mid2', 'outer'],
}

/** 아이템 종류 + 자리 → 기본 판 (1단계 없이 직접 고른 옷의 면적 모델용) */
export function defaultPlateFor(itemId: string, appSlot: SlotKey): string | null {
  const cands = PLATES[itemId]; if (!cands) return null
  const slot = PREFER[appSlot]?.find(s => cands[s]) ; return slot ? cands[slot]! : null
}

export const DEFAULT_BOTTOM = '03_slacks_straight'
export const DEFAULT_SHOE = '71_sneaker_canvas'
export const DEFAULT_SCARF = '54_scarf'
export const DEFAULT_HAT = 'c1_cap'
export const DEFAULT_HAIR: Record<'m' | 'w', string> = { m: 'h1_twoblock', w: 'hf5_bob' }
export const DEFAULT_HAIR_COLOR = '#2B2320'

export function charSex(): 'm' | 'w' {
  try { return profile.getGender() === 'female' ? 'w' : 'm' } catch { return 'm' }
}

/**
 * 만들기 상태(상체 레이어 + 자리별 hex)를 렌더러 입력으로 바꾼다.
 * hex 는 useBuild.outfitHex 와 같은 꼴: { outer, middleware, top, inner, bottom, shoes, scarf, hat }.
 * 한 칸에 두 벌이 겹치면 바깥쪽 옷이 다른 칸으로 비켜서고, 자리가 없으면 그 옷은 그리지 않는다.
 */
export function charSceneFromBuild(upper: UpperLayer[], hex: Record<string, string | undefined>, opts: { sex?: 'm' | 'w'; bottomItem?: string | null; shoesItem?: string | null } = {}): CharScene {
  const sex = opts.sex || charSex()
  const items: CharItem[] = []
  const used = new Set<CharSlot>()
  const sorted = sortUpper(upper)              // 바깥 → 안쪽
  // 1단계에서 고른 판이 있으면 그 판을 먼저 앉힌다 (칸도 판이 정한다)
  const pending: { i: number; layer: UpperLayer; appSlot: SlotKey; color: string }[] = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    const layer = sorted[i]
    const appSlot = getSlotKey(i, sorted.length, layer)
    const color = hex[appSlot]
    if (!color) continue
    const ps = layer.plate ? PLATE_SLOT[layer.plate] as CharSlot | undefined : undefined
    if (layer.plate && ps && ['inner', 'mid1', 'mid2', 'outer'].includes(ps) && !used.has(ps)) { used.add(ps); items.push({ id: layer.plate, color }); continue }
    pending.push({ i, layer, appSlot, color })
  }
  // 나머지는 아이템 종류로 판을 고른다 — 안쪽 옷부터 자리를 잡는다 (이너가 밀려나면 겹침이 더 티 난다)
  for (const { layer, appSlot, color } of pending) {
    const cands = PLATES[layer.itemId]
    if (!cands) continue
    const slot = PREFER[appSlot].find(s => cands[s] && !used.has(s))
    if (!slot) continue
    used.add(slot)
    items.push({ id: cands[slot]!, color })
  }
  items.push({ id: opts.bottomItem || DEFAULT_BOTTOM, color: hex.bottom || '#1C1917' })
  if (hex.shoes) items.push({ id: opts.shoesItem || DEFAULT_SHOE, color: hex.shoes })
  if (hex.scarf) items.push({ id: DEFAULT_SCARF, color: hex.scarf })
  const body: CharBody = { sex, hair: DEFAULT_HAIR[sex], hairColor: DEFAULT_HAIR_COLOR }
  if (hex.hat) { body.hat = DEFAULT_HAT; body.hatColor = hex.hat }
  return { items, body }
}

/** 만들기 상태 → 자리별 판 id (엔진 v7.1 의 면적 모델 입력) */
export function platesOf(state: { upper: UpperLayer[]; bottomItem?: string | null; shoesItem?: string | null }): Record<string, string> {
  const out: Record<string, string> = {}
  const sorted = sortUpper(state.upper)
  sorted.forEach((l, i) => {
    const slot = getSlotKey(i, sorted.length, l)
    if (slot === 'hidden') return
    const p = l.plate || defaultPlateFor(l.itemId, slot)
    if (p) out[slot] = p
  })
  out.bottom = state.bottomItem || DEFAULT_BOTTOM
  out.shoes = state.shoesItem || DEFAULT_SHOE
  out.scarf = DEFAULT_SCARF
  out.hat = DEFAULT_HAT
  return out
}
