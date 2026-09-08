// ================================================================
// guide.ts — 2단계 안내 층: 색 칩의 ● 추천 / △ 주의, "더 올리려면?" 한 수
//
// 계산은 엔진 v7.1(lib/engine.ts)이 한다. 이 파일은 화면이 쓰는 꼴로만 편다.
// (v6 위에서 돌던 이전 판은 PR #54 — delta 순위 + 채도 tie-break였다. v7 은
//  감점 규칙이 걸린 색을 ●에서 빼고, 계열이 겹치는 색은 둘까지만 올린다.)
// ================================================================
import { guideFor, bestMovesFor, type EngineInput, type EngineMove } from './engine'

export type Mark = 'rec' | 'warn'
export interface Guide { rec: string[]; warn: string[]; marks: Record<string, Mark>; delta: Record<string, number>; why: Record<string, string> }
export type Move = EngineMove

export function colorGuide(input: EngineInput, slot: string, recN = 6): Guide {
  const g = guideFor(input, slot, recN)
  return { rec: g.rec, warn: Object.keys(g.marks).filter(k => g.marks[k] === 'warn'), marks: g.marks, delta: g.delta, why: g.why }
}

export function bestMoves(input: EngineInput, k = 3): Move[] {
  try { return bestMovesFor(input, k) } catch { return [] }
}
