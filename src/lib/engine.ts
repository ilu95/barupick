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

const TO_V7: Record<string, string> = { outer: 'outer', middleware: 'layer', top: 'top', inner: 'inner', bottom: 'bottom', shoes: 'shoes', scarf: 'scarf', hat: 'hat', tie: 'tie' }
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

const PLATE_V7: Record<string, string> = { inner: 'inner', mid1: 'top', mid2: 'layer', outer: 'outer', bottom: 'bottom', shoe: 'shoes', scarf: 'scarf', hat: 'hat', tie: 'tie' }
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
/**
 * 점수 보정 (v7.2) — 분포 벌리기.
 * v7.1 원점수는 무작위 색 조합의 중앙값이 87, 35% 가 92점(완벽) 이상이라 "전부 좋다"가 됐다.
 * 순서는 그대로 두고 눈금만 편다: 원점수 58→42, 87→75, 100→92. 무작위 조합의 중앙값이 "좋음"(75)에,
 * 손질한 조합의 중앙값이 82 안팎에 오고, 완벽(92)은 원점수 100 에만 붙는다.
 * 과거 기록 점수는 그대로 두고(engine 버전이 함께 저장됨) 새 점수만 이 눈금이다.
 */
const CAL: [number, number][] = [[0, 0], [58, 42], [87, 75], [100, 92]]
export function calibrate(raw: number): number {
  const x = Math.max(0, Math.min(100, raw))
  for (let i = 1; i < CAL.length; i++) {
    const [x0, y0] = CAL[i - 1], [x1, y1] = CAL[i]
    if (x <= x1) return Math.round(y0 + (y1 - y0) * (x - x0) / (x1 - x0))
  }
  return 92
}

export function scoreTemplate(parts: Record<string, string>, keys: Record<string, string>, situ?: string | null) {
  const items = Object.entries(parts).filter(([s]) => keys[s] && COLORS_60[keys[s]]).map(([s, id]) => ({ slot: s, id, hex: COLORS_60[keys[s]].hex, color: getColorName(keys[s]) }))
  if (items.length < 2) return null
  const r = V7.evaluate(items, ctxOf({ outfit: {}, situ }))
  return { ...r, total: calibrate(r.total), rawTotal: r.total }
}

/** 148색 팔레트를 v7 guide/bestMoves 가 받는 꼴로 (한 번만) */
let PAL: Record<string, { hex: string; name: string }> | null = null
const palette = () => PAL || (PAL = Object.fromEntries(Object.entries(COLORS_60).map(([k, c]) => [k, { hex: c.hex, name: c.name }])))

export function scoreOutfit(input: EngineInput): EngineResult {
  const r = V7.evaluate(toItems(input), ctxOf(input))
  const total = calibrate(r.total), k = r.total > 0 ? total / r.total : 1   // 부분 점수도 같은 비율로 (합이 총점이 되게)
  return {
    total,
    parts: Object.entries(r.parts as Record<string, [number, number]>).map(([key, [v, mx]]) => ({ key: PART_KEY[key] || key, label: key, value: v * k, max: mx })),
    reasons: (r.reasons as EngineReason[]).map(x => ({ ...x, slots: x.slots.map(s => FROM_V7[s] || s) })),
    raw: r,
  }
}

/** slot 을 key 색으로 바꾸면(없으면 더하면) 총점이 얼마나 변하나 */
export function scoreDelta(input: EngineInput, slot: string, key: string): number {
  const base = calibrate(V7.evaluate(toItems(input), ctxOf(input)).total)
  const next = calibrate(V7.evaluate(toItems({ ...input, outfit: { ...input.outfit, [slot]: key } }), ctxOf(input)).total)
  return next - base
}

/** 자리 하나의 ● 추천 / △ 주의 (v7 guide: 무난 4 + 어울려요 5 + 포인트(작은 자리) 3, 감점 규칙 없는 것만, 계열 겹침 3까지) */
export function guideFor(input: EngineInput, slot: string, recN = 12) {
  const g = V7.guide(toItems(input), ctxOf(input), TO_V7[slot] || slot, palette(), { idFor: input.plates?.[slot] || slot, recN })
  const marks: Record<string, 'rec' | 'warn'> = {}
  for (const [k, m] of Object.entries(g.marks as Record<string, string>)) if (m === 'rec' || m === 'warn') marks[k] = m
  const delta: Record<string, number> = {}; const why: Record<string, string> = {}
  for (const x of g.list) { delta[x.key] = x.d; why[x.key] = x.why }
  return { rec: g.rec.map((x: any) => x.key as string), marks, delta, why, groups: g.groups as { safe: string[]; match: string[]; point: string[] } }
}

export interface ComboCard { outfit: Record<string, string>; total: number; why: string; kind: 'safe' | 'point' | 'two' | 'taste'; mine: number }

/** 지금 입은 옷(판)은 그대로, fixed 아닌 자리의 색만 6가지 패턴(무난·연유채 주색·상의 포인트·아우터 색·하의 연유채·두 색)으로 바꿔 매긴다 */
export function combosFor(input: EngineInput, opts: { fixed?: Set<string>; n?: number; wardrobe?: Record<string, string[]>; taste?: string[] }): ComboCard[] {
  const fixed = opts.fixed || new Set<string>()
  const slots = Object.keys(input.outfit).filter(s => input.outfit[s] && !fixed.has(s))
  if (!slots.length) return []
  const chromaOf = (k: string) => COLORS_60[k]?.hcl[1] ?? 0
  const pools: Record<string, { neu: string[]; soft: string[]; vivid: string[] }> = {}
  for (const slot of slots) {
    const delta = guideFor(input, slot).delta
    const ranked = Object.entries(delta).filter(([k]) => k !== input.outfit[slot]).sort((a, b) => b[1] - a[1]).map(([k]) => k)
    const mine = opts.wardrobe?.[slot] || []
    const withMine = (arr: string[]) => [...arr.filter(k => mine.includes(k)), ...arr.filter(k => !mine.includes(k))]
    pools[slot] = {
      neu: withMine(ranked.filter(k => chromaOf(k) <= 18)).slice(0, 8),
      soft: withMine(ranked.filter(k => chromaOf(k) > 18 && chromaOf(k) <= 35)).slice(0, 8),
      vivid: withMine(ranked.filter(k => chromaOf(k) > 35)).slice(0, 8),
    }
  }
  const pick = (slot: string, bucket: 'neu' | 'soft' | 'vivid', i: number): string => {
    const p = pools[slot][bucket].length ? pools[slot][bucket] : pools[slot].neu
    return p.length ? p[i % p.length] : input.outfit[slot]!
  }
  const main = slots.find(s => s === 'outer') || slots.find(s => s === 'top') || slots[0]
  const others = slots.filter(s => s !== main)
  const patterns: { key: Record<string, string>; kind: ComboCard['kind'] }[] = []
  for (let k = 0; k < 6; k++) {
    const key: Record<string, string> = {}
    slots.forEach(s => { key[s] = pick(s, 'neu', k) })
    if (k === 1) key[main] = pick(main, 'soft', k)
    if (k === 2 && slots.includes('top')) key.top = pick('top', 'vivid', k)
    if (k === 3) key[main] = pick(main, 'vivid', k)
    if (k === 4 && slots.includes('bottom')) key.bottom = pick('bottom', 'soft', k)
    if (k === 5) others.slice(0, 2).forEach((sl, i) => { key[sl] = pick(sl, i === 0 ? 'vivid' : 'soft', k) })
    patterns.push({ key, kind: k === 0 ? 'safe' : k === 5 ? 'two' : 'point' })
  }
  if (opts.taste?.length) {
    const t = opts.taste, key: Record<string, string> = {}
    slots.forEach((sl, i) => { key[sl] = t[i % t.length] })
    patterns.push({ key, kind: 'taste' })
  }
  const seen = new Set<string>(); const cards: ComboCard[] = []
  for (const { key, kind } of patterns) {
    const sig = JSON.stringify(key); if (seen.has(sig)) continue; seen.add(sig)
    const r = scoreOutfit({ ...input, outfit: { ...input.outfit, ...key } })
    const why = (r.reasons.find(x => x.w > 0) || {}).txt || ''
    const mine = slots.filter(s => (opts.wardrobe?.[s] || []).includes(key[s])).length
    cards.push({ outfit: key, total: r.total, why, kind, mine })
  }
  const tasteCard = cards.find(c => c.kind === 'taste')
  const rest = cards.filter(c => c.kind !== 'taste').sort((a, b) => b.total - a.total)
  return [...rest.slice(0, opts.n || 6), ...(tasteCard ? [tasteCard] : [])]
}

/** 옷 하나의 색만 바꿔 얻는 최선의 한 수 k개 (차분한 색 우선) */
export function bestMovesFor(input: EngineInput, k = 3): EngineMove[] {
  const r = V7.bestMoves(toItems(input), ctxOf(input), palette(), k)
  const base = calibrate(r.base?.total ?? V7.evaluate(toItems(input), ctxOf(input)).total)
  return r.moves.map((m: any) => { const slot = FROM_V7[m.slot] || m.slot; const score = calibrate(m.total); return { slot, from: input.outfit[slot] || '', to: m.key, gain: score - base, score, why: m.why } })
}
