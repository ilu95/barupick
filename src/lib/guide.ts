// ================================================================
// guide.ts — 2단계 안내 층: 색 칩의 ● 추천 / △ 주의, "더 올리려면?" 한 수
//
// 계산은 엔진 v7.1(lib/engine.ts)이 한다. 이 파일은 화면이 쓰는 꼴로만 편다.
// (v6 위에서 돌던 이전 판은 PR #54 — delta 순위 + 채도 tie-break였다. v7 은
//  감점 규칙이 걸린 색을 ●에서 빼고, 계열이 겹치는 색은 둘까지만 올린다.)
// ================================================================
import { guideFor, bestMovesFor, type EngineInput, type EngineMove, type Zone } from './engine'

export type Mark = 'rec' | 'warn'
export type { Zone }
export interface Guide { rec: string[]; warn: string[]; marks: Record<string, Mark>; delta: Record<string, number>; why: Record<string, string>; groups: { safe: string[]; match: string[]; point: string[]; mine: string[] }; zones: Record<string, Zone> }
export type Move = EngineMove

export function colorGuide(input: EngineInput, slot: string, recN = 12): Guide {
  const g = guideFor(input, slot, recN)
  return { rec: g.rec, warn: Object.keys(g.marks).filter(k => g.marks[k] === 'warn'), marks: g.marks, delta: g.delta, why: g.why, groups: g.groups, zones: g.zones }
}

/**
 * 색 키들을 네 구역으로. 묶음(groups)이 상위 N 개만 집는 것과 달리 모든 색에 같은 규칙을 먹인다.
 * 규칙은 engine/v7.ts 의 zonesOf — guideFor 의 safe/match/point 묶음과 같은 pred 를 쓴다.
 */
export function zoneOf(input: EngineInput, slot: string, keys: string[]): Record<string, Zone> {
  const z = guideFor(input, slot).zones
  const out: Record<string, Zone> = {}
  for (const k of keys) if (z[k]) out[k] = z[k]
  return out
}

export function bestMoves(input: EngineInput, k = 3): Move[] {
  try { return bestMovesFor(input, k) } catch { return [] }
}
