// ================================================================
// guide.ts — 2단계 안내 층: 색 칩의 ● 추천 / △ 주의, 네 구역, "더 올리려면?" 한 수
//
// 계산은 엔진 v7.1(lib/engine.ts)이 한다. 이 파일은 화면이 쓰는 꼴로만 편다.
// (v6 위에서 돌던 이전 판은 PR #54 — delta 순위 + 채도 tie-break였다. v7 은
//  감점 규칙이 걸린 색을 ●에서 빼고, 계열이 겹치는 색은 둘까지만 올린다.)
// ================================================================
import { guideFor, bestMovesFor, type EngineInput, type EngineMove, type Zone } from './engine'
import { lch } from './engine/v7'
import { COLORS_60 } from './colors'

export type Mark = 'rec' | 'warn'
export type { Zone }
export interface Guide { rec: string[]; warn: string[]; marks: Record<string, Mark>; delta: Record<string, number>; why: Record<string, string>; groups: { safe: string[]; match: string[]; point: string[]; mine: string[] }; zones: Record<string, Zone> }
export type Move = EngineMove

/**
 * 구역 상수 — 점수는 보정(calibrate) 전 v7 원점수 단위.
 * T_MATCH/T_AVOID: 그 자리 최고점과의 차이. C_VIVID: LCh 채도. L_CONTRAST: 기준 자리들과의 명도 차.
 * 값은 scripts/guide-check.mjs 의 분포·기준 세트 검사로 정했다.
 *   T_MATCH 6 · MATCH_CAP 12: 기준이 하나면 후보 대부분이 같은 점수라 0 으로는 계절 +1 받은 색만 찰떡이 됐다(네이비 상의 → 카라멜 44, 그레이 38).
 *   6점 안쪽을 찰떡 후보로 두고, 12개를 넘으면 채도 낮은 순 → delta → 키 순 앞 12 만 찰떡, 나머지는 무난.
 *   delta 를 먼저 보면 1점 앞선 카라멜·로즈핑크·라일락이 12칸을 다 먹고 그레이·화이트가 또 빠진다.
 *   C_VIVID 50: 35면 고수가 50%. 좋은 룩 실제 색 85%가 채도 30 이하라 50에서 좋은 룩을 거의 안 건드린다.
 *   L_CONTRAST 101: 명도 차 최대가 ~100(흑백)이라 사실상 끔. 좋은 룩 절반이 명도 차 61 이상(흑백·네이비·아이보리 대비)이라
 *   40~90 어디에 둬도 좋은 룩이 고수로 빠진다(85% 미달). 규칙은 남겨 두고 값만 막았다.
 */
export const ZONE = { T_MATCH: 6, MATCH_CAP: 12, T_AVOID: 20, C_VIVID: 50, L_CONTRAST: 101 }

const chromaOf = (k: string) => lch(COLORS_60[k].hex).C

/** 칸 안 순서 — 찰떡·무난은 무채·저채도 먼저(같으면 delta), 고수·피하는 색은 delta 순. 점수·구역은 안 바꾼다 */
export function sortInZone(zone: Zone, keys: string[], delta: Record<string, number>): string[] {
  const d = (k: string) => delta[k] ?? -999
  return zone === 'match' || zone === 'safe'
    ? [...keys].sort((a, b) => chromaOf(a) - chromaOf(b) || d(b) - d(a))
    : [...keys].sort((a, b) => d(b) - d(a))
}

/** 액세서리는 면적이 작아 총점이 안 움직인다 — 구역을 끄고 △ 만. 액센트 규칙(v8.6, 실제 룩 검증)이 들어오면 구역을 켠다. */
export const ACC_SLOTS = new Set(['hat', 'scarf', 'tie'])

/** 기준 자리: 유저가 고른(touched) 자리 중 지금 자리를 뺀, 실제로 색이 있는 것 */
export const basisSlots = (input: EngineInput, touched: Iterable<string>, slot: string): string[] =>
  Array.from(touched).filter(s => s !== slot && input.outfit[s])

/** 구역·기준 문장·● 가 보는 입력 — 고른 자리 + 지금 자리만. 기본색으로만 채워진 자리는 뺀다. 기준이 없으면 null */
export function basisOf(input: EngineInput, touched: Iterable<string>, slot: string): EngineInput | null {
  const keep = new Set(basisSlots(input, touched, slot))
  if (!keep.size) return null
  keep.add(slot)
  const pick = (o: Record<string, string | null | undefined> = {}) => Object.fromEntries(Object.entries(o).filter(([s]) => keep.has(s)))
  return { ...input, outfit: pick(input.outfit), plates: pick(input.plates) }
}

function zonesFrom(g: ReturnType<typeof guideFor>, input: EngineInput, slot: string): Record<string, Zone> {
  if (ACC_SLOTS.has(slot)) return {}
  // 후보 총점 − 최고점 = delta − 최고 delta (같은 base 에서 잰 차이라 원점수 그대로)
  const best = Math.max(...Object.values(g.delta))
  const basisL = Object.entries(input.outfit)
    .filter(([s, k]) => s !== slot && k && COLORS_60[k])
    .map(([, k]) => lch(COLORS_60[k!].hex).L)
  const out: Record<string, Zone> = {}
  const near: string[] = []
  for (const [k, d] of Object.entries(g.delta)) {
    const gap = best - d
    if (g.marks[k] === 'warn' || gap > ZONE.T_AVOID) { out[k] = 'avoid'; continue }
    const c = lch(COLORS_60[k].hex)
    const bold = c.C >= ZONE.C_VIVID || basisL.some(L => Math.abs(c.L - L) >= ZONE.L_CONTRAST)
    out[k] = bold ? 'point' : 'safe'
    if (!bold && gap <= ZONE.T_MATCH) near.push(k)
  }
  near.sort((a, b) => chromaOf(a) - chromaOf(b) || g.delta[b] - g.delta[a] || a.localeCompare(b))
  for (const k of near.slice(0, ZONE.MATCH_CAP)) out[k] = 'match'
  return out
}

export function colorGuide(input: EngineInput, slot: string, recN = 12): Guide {
  const g = guideFor(input, slot, recN)
  return { rec: g.rec, warn: Object.keys(g.marks).filter(k => g.marks[k] === 'warn'), marks: g.marks, delta: g.delta, why: g.why, groups: g.groups, zones: zonesFrom(g, input, slot) }
}

/**
 * 색 키들을 네 구역으로. 순서: △(marks warn) 또는 최고점보다 T_AVOID 넘게 낮으면 avoid →
 * 쨍하거나(채도) 기준 자리와 명도가 크게 벌어지면 point(과감한 선택) → 최고점과 T_MATCH 이내 앞 MATCH_CAP 개면 match → 나머지 safe.
 * 액세서리 자리는 빈 객체.
 */
export function zoneOf(input: EngineInput, slot: string, keys: string[]): Record<string, Zone> {
  const z = zonesFrom(guideFor(input, slot), input, slot)
  const out: Record<string, Zone> = {}
  for (const k of keys) if (z[k]) out[k] = z[k]
  return out
}

export function bestMoves(input: EngineInput, k = 3): Move[] {
  try { return bestMovesFor(input, k) } catch { return [] }
}
