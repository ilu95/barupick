// ================================================================
// guide.ts — 2단계 안내 층: 색 칩의 ● 추천 / △ 주의, "더 올리려면?" 한 수
//
// 148칸 전부에 +3/-2 숫자를 붙이면 근접 색끼리 튀는 숫자만 보인다(연구 4장).
// 대신 자리마다 ● 여섯 개(안전한 무채 3 + 색 있는 3)와 △ 만 표시하고,
// "더 올리려면?" 은 옷 하나의 색만 바꿔 얻는 최선의 한 수를 최대 3개 보여 준다.
// 점수는 지금 엔진(evaluation.ts v6)을 그대로 쓴다 — v7.1 이 오면 이 파일의
// 두 함수만 새 엔진의 delta/bestMoves 로 갈아끼운다.
// ================================================================
import { COLORS_60 } from './colors'
import { evaluationSystem } from './evaluation'
import { profile } from './profile'

export type Mark = 'rec' | 'warn'
export interface Guide {
  /** ● 추천 (안전한 무채 먼저, 그다음 색 있는 것) */
  rec: string[]
  /** △ 주의 */
  warn: string[]
  marks: Record<string, Mark>
  delta: Record<string, number>
}
export interface Move { slot: string; from: string; to: string; gain: number; score: number }

/** 이 채도 이하는 '안전한 색'으로 센다 (연구 11장 NEUTRAL_C 와 같은 자리) */
export const SAFE_C = 18
/** 이만큼 떨어지면 △ */
export const WARN_AT = -5

const chroma = (k: string) => COLORS_60[k]?.hcl[1] ?? 50

/** 자리 하나의 색 안내. deltaFn(색) = 그 색으로 바꿨을 때 총점 변화 */
export function colorGuide(deltaFn: (key: string) => number, current: string | null = null, recN = 6): Guide {
  const rows = Object.keys(COLORS_60).filter(k => k !== current).map(k => ({ k, d: deltaFn(k), c: chroma(k) }))
  const delta: Record<string, number> = {}
  for (const r of rows) delta[r.k] = r.d
  // 같은 점수면 차분한(채도 낮은) 쪽을 앞에 — 근접 색 튐을 줄인다
  const by = (a: typeof rows[0], b: typeof rows[0]) => b.d - a.d || a.c - b.c
  const maxD = rows.reduce((m, r) => Math.max(m, r.d), -Infinity)
  // 이미 최선이라 전부 마이너스면, 가장 덜 잃는 것들을 추천으로 둔다
  const floor = maxD >= 0 ? 0 : maxD - 1
  const nSafe = Math.ceil(recN / 2), nColor = recN - nSafe
  const safe = rows.filter(r => r.c <= SAFE_C && r.d >= floor).sort(by).slice(0, nSafe)
  const colored = rows.filter(r => r.c > SAFE_C && r.d >= floor).sort(by).slice(0, nColor)
  const rec = [...safe, ...colored].sort(by).map(r => r.k)
  const warn = rows.filter(r => r.d <= WARN_AT).map(r => r.k)
  const marks: Record<string, Mark> = {}
  for (const k of warn) marks[k] = 'warn'
  for (const k of rec) marks[k] = 'rec'
  return { rec, warn, marks, delta }
}

/** 옷 하나의 색만 바꿔 얻는 최선의 한 수, 자리마다 하나씩 → 이득 큰 순 k개 */
export function bestMoves(outfit: Record<string, string>, k = 3): Move[] {
  const pc = profile.getPersonalColor()
  const base = evaluationSystem.evaluate(outfit, pc).total
  const out: Move[] = []
  for (const slot of Object.keys(outfit)) {
    let best: Move | null = null
    for (const key of Object.keys(COLORS_60)) {
      if (key === outfit[slot]) continue
      const score = evaluationSystem.evaluate({ ...outfit, [slot]: key }, pc).total
      const gain = score - base
      if (gain <= 0) continue
      if (!best || gain > best.gain || (gain === best.gain && chroma(key) < chroma(best.to))) best = { slot, from: outfit[slot], to: key, gain, score }
    }
    if (best) out.push(best)
  }
  return out.sort((a, b) => b.gain - a.gain).slice(0, k)
}
