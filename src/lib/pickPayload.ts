// 1단계 후보(Entry) → 만들기(useBuild.applyOutfit) 입력. 홈·조합 목록에서 같이 쓴다.
import { PARTS, PLATE_TO_ITEM, STYLE_KEY, type Entry, type Part, type Situ } from './outfits'

export const FALLBACK_PAL: Record<Part, string> = { outer: 'camel', layer: 'beige', top: 'white', bottom: 'charcoal', shoes: 'black' }
export const colorKeyOf = (e: Entry, k: Part) => e.c.pal[k] || FALLBACK_PAL[k]
export const colorKeysOf = (e: Entry) => PARTS.filter(k => e.p[k]).map(k => colorKeyOf(e, k))

export function pickPayload(e: Entry, situ: Situ, goto: 'builder' | 'result') {
  const p = e.p
  const layers: { itemId: string; plate: string; colorKey: string }[] = []
  const seen = new Set<string>()
  for (const k of ['outer', 'layer', 'top'] as Part[]) {
    const plate = p[k]; if (!plate) continue
    const itemId = PLATE_TO_ITEM[plate]; if (!itemId || seen.has(itemId)) continue
    seen.add(itemId); layers.push({ itemId, plate, colorKey: colorKeyOf(e, k) })
  }
  return {
    layers,
    bottom: p.bottom ? { plate: p.bottom, colorKey: colorKeyOf(e, 'bottom') } : undefined,
    shoes: p.shoes ? { plate: p.shoes, colorKey: colorKeyOf(e, 'shoes') } : undefined,
    style: STYLE_KEY[e.c.st] ?? null, templateId: e.c.id, situ, goto,
  }
}

/** 후보를 만들기에 넘기고 /home/build 로 (BuildCoord 가 sp_rec_pick 을 읽는다) */
export function stashPick(e: Entry, situ: Situ, goto: 'builder' | 'result') {
  try { sessionStorage.setItem('sp_rec_pick', JSON.stringify(pickPayload(e, situ, goto))) } catch {}
}
