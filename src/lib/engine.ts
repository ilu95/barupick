// ================================================================
// engine.ts — 점수 엔진 v7.1 파사드 (만들기 흐름이 쓰는 유일한 입구)
//
// 앱의 자리 이름(outer/middleware/top/inner/bottom/shoes/scarf/hat)과 색 키를
// v7 이 받는 items(slot, id=판, hex)로 바꾸고, 결과를 화면용 parts/reasons 로 편다.
// 판(id)은 면적 모델의 열쇠다 — 1단계에서 고른 판이 있으면 그것, 없으면 아이템
// 종류의 기본 판, 그것도 없으면 자리 이름(→ v7 의 기본 면적).
// 다른 화면(추천·기록·옷장)은 아직 evaluation.ts(v6)를 쓴다. 저장 기록에는
// 어느 엔진으로 매긴 점수인지 engine 필드가 남는다 (lib/versions.ts).
// ================================================================
import * as V7 from './engine/v7'
import { COLORS_60, getColorName } from './colors'
import { profile } from './profile'
import { tasteContrast } from './taste'
import { PLATE_SLOT } from './outfits'

const TO_V7: Record<string, string> = { outer: 'outer', middleware: 'layer', top: 'top', inner: 'inner', bottom: 'bottom', shoes: 'shoes', scarf: 'scarf', hat: 'hat' }
const FROM_V7: Record<string, string> = Object.fromEntries(Object.entries(TO_V7).map(([a, b]) => [b, a]))
const PART_KEY: Record<string, string> = { '명도 구조': 'structure', '색 수·면적': 'count', '조화': 'harmony', '시선 정리': 'focus', '상황·계절': 'situation', '나에게': 'me' }

export interface EngineInput {
  /** 자리 → 색 키 (getFilledOutfit 결과) */
  outfit: Record<string, string | null | undefined>
  /** 자리 → 판 id (없으면 자리 이름으로 기본 면적) */
  plates?: Record<string, string | null | undefined>
  /** work | daily | date | formal | active | home */
  situ?: string | null
  month?: number
}
export interface EnginePart { key: string; label: string; value: number; max: number }
export interface EngineReason { id: string; txt: string; w: number; slots: string[] }
export interface EngineResult { total: number; parts: EnginePart[]; reasons: EngineReason[]; raw: any }
export interface EngineMove { slot: string; from: string; to: string; gain: number; score: number; why: string }

export function pcSeason(): 'spring' | 'summer' | 'autumn' | 'winter' | null {
  try {
    const pc = profile.getPersonalColor(); if (!pc) return null
    const s = String(pc).split('_')[0]
    return (['spring', 'summer', 'autumn', 'winter'] as const).find(x => x === s) || null
  } catch { return null }
}

const PLATE_V7: Record<string, string> = { inner: 'inner', mid1: 'top', mid2: 'layer', outer: 'outer', bottom: 'bottom', shoe: 'shoes', scarf: 'scarf', hat: 'hat' }
export function toItems(input: EngineInput) {
  return Object.entries(input.outfit)
    .filter(([, key]) => key && COLORS_60[key])
    .map(([slot, key]) => {
      const plate = input.plates?.[slot] || null
      // 판을 알면 그 판이 실제로 앉는 칸으로 (목폴라를 '상의' 칸에 넣어도 inner 면적으로 센다)
      const v7slot = (plate && PLATE_SLOT[plate] && PLATE_V7[PLATE_SLOT[plate]]) || TO_V7[slot] || slot
      return { slot: v7slot, id: plate || slot, hex: COLORS_60[key!].hex, color: getColorName(key!), key: key! }
    })
}
export const ctxOf = (input: EngineInput) => ({ situ: input.situ || 'daily', month: input.month || (new Date().getMonth() + 1), pc: pcSeason(), contrast: tasteContrast() })

/** 조합표 그대로 채점: parts = v7 slot → 판 id, keys = slot → 색 키 (취향 폭포·1단계가 쓴다) */
export function scoreTemplate(parts: Record<string, string>, keys: Record<string, string>, situ?: string | null) {
  const items = Object.entries(parts).filter(([s]) => keys[s] && COLORS_60[keys[s]]).map(([s, id]) => ({ slot: s, id, hex: COLORS_60[keys[s]].hex, color: getColorName(keys[s]) }))
  if (items.length < 2) return null
  return V7.evaluate(items, ctxOf({ outfit: {}, situ }))
}

/** 148색 팔레트를 v7 guide/bestMoves 가 받는 꼴로 (한 번만) */
let PAL: Record<string, { hex: string; name: string }> | null = null
const palette = () => PAL || (PAL = Object.fromEntries(Object.entries(COLORS_60).map(([k, c]) => [k, { hex: c.hex, name: c.name }])))

export function scoreOutfit(input: EngineInput): EngineResult {
  const r = V7.evaluate(toItems(input), ctxOf(input))
  return {
    total: r.total,
    parts: Object.entries(r.parts as Record<string, [number, number]>).map(([k, [v, mx]]) => ({ key: PART_KEY[k] || k, label: k, value: v, max: mx })),
    reasons: (r.reasons as EngineReason[]).map(x => ({ ...x, slots: x.slots.map(s => FROM_V7[s] || s) })),
    raw: r,
  }
}

/** slot 을 key 색으로 바꾸면(없으면 더하면) 총점이 얼마나 변하나 */
export function scoreDelta(input: EngineInput, slot: string, key: string): number {
  const base = V7.evaluate(toItems(input), ctxOf(input)).total
  const next = V7.evaluate(toItems({ ...input, outfit: { ...input.outfit, [slot]: key } }), ctxOf(input)).total
  return next - base
}

/** 자리 하나의 ● 추천 / △ 주의 (v7 guide: 안전 3 + 유채 3, 감점 규칙 없는 것만, 계열 겹침 2까지) */
export function guideFor(input: EngineInput, slot: string, recN = 6) {
  const g = V7.guide(toItems(input), ctxOf(input), TO_V7[slot] || slot, palette(), { idFor: input.plates?.[slot] || slot, recN })
  const marks: Record<string, 'rec' | 'warn'> = {}
  for (const [k, m] of Object.entries(g.marks as Record<string, string>)) if (m === 'rec' || m === 'warn') marks[k] = m
  const delta: Record<string, number> = {}; const why: Record<string, string> = {}
  for (const x of g.list) { delta[x.key] = x.d; why[x.key] = x.why }
  return { rec: g.rec.map((x: any) => x.key as string), marks, delta, why }
}

/** 옷 하나의 색만 바꿔 얻는 최선의 한 수 k개 (차분한 색 우선) */
export function bestMovesFor(input: EngineInput, k = 3): EngineMove[] {
  const r = V7.bestMoves(toItems(input), ctxOf(input), palette(), k)
  return r.moves.map((m: any) => { const slot = FROM_V7[m.slot] || m.slot; return { slot, from: input.outfit[slot] || '', to: m.key, gain: m.d, score: m.total, why: m.why } })
}
