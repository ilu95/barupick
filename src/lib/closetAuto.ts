// ================================================================
// closetAuto.ts — 옷장은 입력하는 곳이 아니라 쌓이는 곳
//
// 코디를 완성(저장·물어보기)하면 그 옷들이 옷장에 담긴다. 없는 옷은 결과 화면에서
// 칩 한 번으로 뺀다(없는 옷 목록은 따로 남겨 나중에 "살 옷"이 된다). 담긴 옷의 판에는
// 1단계 좋아요를 한 번 더해 "가진 옷이 들어간 조합"이 먼저 오게 한다.
// 같은 옷(자리·판·색)은 두 번 담지 않는다.
// ================================================================
import { COLORS_60, getColorName } from './colors'
import { PLATE_TO_ITEM, plateName, loadPrefs, savePrefs } from './outfits'
import { HAT_NAMES, uiSlotOf, type UpperSlot } from './builderSlots'
import { defaultPlateFor, DEFAULT_BOTTOM, DEFAULT_SHOE, DEFAULT_SCARF, DEFAULT_HAT } from './char/map'
import { setJSON } from './storage'
import { trackEvent } from './analytics'
import type { BuildState } from '@/hooks/useBuild'
import i18n from '@/i18n'

export interface Garment { slot: string; plate: string; itemType: string | null; colorKey: string; name: string }

const W_KEY = 'sp_wardrobe', WISH_KEY = 'sp_wishlist'
const ko = () => (i18n.language || 'ko').startsWith('ko')
const nameOf = (plate: string) => HAT_NAMES[plate] ? HAT_NAMES[plate][ko() ? 'ko' : 'en'] : plateName(plate)

/** 만들기 상태 → 입은 옷 목록 (자리·판·색) */
export function garmentsOf(s: BuildState): Garment[] {
  const out: Garment[] = []
  for (const slot of ['outer', 'middleware', 'top', 'inner'] as UpperSlot[]) {
    const l = s.upper.find(x => uiSlotOf(x) === slot); if (!l || !COLORS_60[l.colorKey]) continue
    const plate = l.plate || defaultPlateFor(l.itemId, slot === 'inner' ? 'inner' : slot) || ''
    if (!plate) continue
    out.push({ slot, plate, itemType: PLATE_TO_ITEM[plate] || l.itemId, colorKey: l.colorKey, name: nameOf(plate) })
  }
  if (s.bottomColor && COLORS_60[s.bottomColor]) { const p = s.bottomItem || DEFAULT_BOTTOM; out.push({ slot: 'bottom', plate: p, itemType: null, colorKey: s.bottomColor, name: nameOf(p) }) }
  if (s.shoesColor && COLORS_60[s.shoesColor]) { const p = s.shoesItem || DEFAULT_SHOE; out.push({ slot: 'shoes', plate: p, itemType: null, colorKey: s.shoesColor, name: nameOf(p) }) }
  if (s.scarfColor && COLORS_60[s.scarfColor]) { const p = s.scarfItem || DEFAULT_SCARF; out.push({ slot: 'scarf', plate: p, itemType: 'scarf', colorKey: s.scarfColor, name: nameOf(p) }) }
  if (s.hatColor && COLORS_60[s.hatColor]) { const p = s.hatItem || DEFAULT_HAT; out.push({ slot: 'hat', plate: p, itemType: 'hat', colorKey: s.hatColor, name: nameOf(p) }) }
  return out
}

function readW(): any[] { try { return JSON.parse(localStorage.getItem(W_KEY) || '[]') } catch { return [] } }
const sameItem = (it: any, g: Garment) => it.category === g.slot && (it.color || it.colorKey) === g.colorKey && (it.plate ? it.plate === g.plate : !g.itemType || it.itemType === g.itemType)

export const inCloset = (g: Garment) => readW().some(it => sameItem(it, g))
export const garmentKey = (g: Garment) => `${g.slot}|${g.plate}|${g.colorKey}`

/**
 * 가진 옷은 옷장에 담고(중복 없음), 없는 옷은 옷장에서 빼고 살 옷 목록에 남긴다.
 * 돌려주는 값: 새로 담긴 수
 */
export function commitCloset(garments: Garment[], missing: Set<string>, from: string): number {
  const items = readW()
  let added = 0
  const owned = garments.filter(g => !missing.has(garmentKey(g)))
  const gone = garments.filter(g => missing.has(garmentKey(g)))
  // 없다고 표시한 옷 중 코디에서 자동으로 담겼던 것은 뺀다 (직접 등록한 것은 건드리지 않는다)
  const rest = items.filter(it => !(it.source === 'coord' && gone.some(g => sameItem(it, g))))
  for (const g of owned) {
    if (rest.some(it => sameItem(it, g))) continue
    rest.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      category: g.slot, itemType: g.itemType, plate: g.plate, color: g.colorKey, colorKey: g.colorKey,
      name: `${getColorName(g.colorKey)} ${g.name}`, source: 'coord', createdAt: new Date().toISOString(),
    })
    added++
  }
  if (rest.length > 200) rest.length = 200
  setJSON(W_KEY, rest)
  // 살 옷 목록
  try {
    const wish: { plate: string; colorKey: string; slot: string; at: number }[] = JSON.parse(localStorage.getItem(WISH_KEY) || '[]')
    for (const g of gone) if (!wish.some(w => w.plate === g.plate && w.colorKey === g.colorKey)) wish.unshift({ plate: g.plate, colorKey: g.colorKey, slot: g.slot, at: Date.now() })
    setJSON(WISH_KEY, wish.slice(0, 50))
  } catch {}
  // 가진 옷의 판은 1단계에서 먼저 오게 (좋아요 +1)
  if (owned.length) {
    const p = loadPrefs(); const likes = { ...p.likes }
    for (const g of owned) likes[g.plate] = Math.min(6, (likes[g.plate] || 0) + 1)
    savePrefs({ ...p, likes })
  }
  if (added || gone.length) trackEvent('closet_auto', { from, added, missing: gone.length, total: rest.length })
  return added
}
