// ================================================================
// scene.ts — 옛 기록·게시물 저장 형식 → CharScene
//
// OOTD 기록/게시물은 상체 4칸(outer/middleware/top/inner) + 하의·신발·목도리·
// 모자를 { colorKey, itemType } 로 저장한다. itemType 은 판 id(catalog3)일 수도,
// 아이템 종류 id(ITEMS_CATALOG)일 수도 있다 — 저장 시점의 코드에 따라 다르다.
// 여기서 CharacterCanvas 가 그릴 수 있는 판 id 로 통일한다. 읽어서 그리기만
// 한다 — 저장된 기록·점수 데이터는 바꾸지 않는다.
// ================================================================
import { COLORS_60 } from '../colors'
import { PLATE_SLOT } from '../outfits'
import { TYPES, TYPES_W } from '../builderSlots'
import { charSex, defaultPlateFor, DEFAULT_BOTTOM, DEFAULT_SHOE, DEFAULT_SCARF, DEFAULT_HAT, DEFAULT_HAIR, DEFAULT_HAIR_COLOR, type CharScene, type CharItem, type CharBody } from './map'

const KNOWN_PLATES = new Set<string>([...Object.values(TYPES).flat(), ...Object.values(TYPES_W).flat()])
const DEFAULT_TOP_PLATE = '07_tee_long'

type UpperPart = 'outer' | 'middleware' | 'top' | 'inner'
export type SceneColors = Partial<Record<UpperPart | 'bottom' | 'shoes' | 'scarf' | 'hat', string | null>>
export type SceneItemTypes = Partial<Record<string, string>>

/** itemTypes[part] 를 판 id 로. 판 id 면 그대로, 아이템 종류 id 면 defaultPlateFor 로, 없으면 fallback */
function resolvePlate(raw: string | undefined, appSlot: UpperPart, fallback: string): string {
  if (!raw) return fallback
  if (KNOWN_PLATES.has(raw)) return raw
  return defaultPlateFor(raw, appSlot) || fallback
}

export function sceneFromColors(colors: SceneColors, itemTypes: SceneItemTypes = {}, sex: 'm' | 'w' = charSex()): CharScene {
  const items: CharItem[] = []
  const usedSlot = new Set<string>()

  for (const part of ['outer', 'middleware', 'top', 'inner'] as const) {
    const hex = colors[part] ? COLORS_60[colors[part] as string]?.hex : null
    if (!hex) continue
    const plate = resolvePlate(itemTypes[part], part, DEFAULT_TOP_PLATE)
    const cs = PLATE_SLOT[plate] || 'inner'
    if (usedSlot.has(cs)) continue
    usedSlot.add(cs)
    items.push({ id: plate, color: hex })
  }

  const bottomHex = colors.bottom ? COLORS_60[colors.bottom]?.hex : null
  items.push({ id: (itemTypes.bottom && KNOWN_PLATES.has(itemTypes.bottom) && itemTypes.bottom) || DEFAULT_BOTTOM, color: bottomHex || '#1C1917' })

  const shoesHex = colors.shoes ? COLORS_60[colors.shoes]?.hex : null
  if (shoesHex) items.push({ id: (itemTypes.shoes && KNOWN_PLATES.has(itemTypes.shoes) && itemTypes.shoes) || DEFAULT_SHOE, color: shoesHex })

  const scarfHex = colors.scarf ? COLORS_60[colors.scarf]?.hex : null
  if (scarfHex) items.push({ id: (itemTypes.scarf && KNOWN_PLATES.has(itemTypes.scarf) && itemTypes.scarf) || DEFAULT_SCARF, color: scarfHex })

  const body: CharBody = { sex, hair: DEFAULT_HAIR[sex], hairColor: DEFAULT_HAIR_COLOR }
  const hatHex = colors.hat ? COLORS_60[colors.hat]?.hex : null
  if (hatHex) { body.hat = (itemTypes.hat && KNOWN_PLATES.has(itemTypes.hat) && itemTypes.hat) || DEFAULT_HAT; body.hatColor = hatHex }

  return { items, body }
}

/** 판/아이템 id 로 화면에 보여줄 이름 — 판이면 nameOf, 아이템 종류면 카탈로그 번역, 둘 다 아니면 null(호출부가 자리 이름으로 대체) */
export function isPlateId(id: string): boolean { return KNOWN_PLATES.has(id) }
