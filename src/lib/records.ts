// ═══════════════════════════════════════════════════════
// records.ts — 기록 배열의 표준 순서
// 화면(홈 "최근 OOTD", 옷장 목록)은 배열 순서를 그대로 믿는다. 기기마다 배열 순서가 달라지면
// (동기화 병합 순서, 옛 데이터의 createdAt 형식 차이) "최근"이 기기마다 다르게 보인다.
// 그래서 읽을 때와 병합할 때 항상 이 순서로 맞춘다: 날짜(YYYY-MM-DD) 내림차순 → 같은 날은 createdAt 내림차순.
// ═══════════════════════════════════════════════════════

export interface DatedItem { date?: string; createdAt?: number | string }

function created(it: DatedItem): number {
  const c = it.createdAt
  if (typeof c === 'number') return c
  if (typeof c === 'string') { const n = Number(c); if (!Number.isNaN(n)) return n; const d = new Date(c).getTime(); return Number.isNaN(d) ? 0 : d }
  return 0
}

/** 새 배열을 돌려준다 (원본 유지). 날짜가 없는 항목은 createdAt 만으로 비교 */
export function sortRecordsDesc<T extends DatedItem>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    const da = a.date || '', db = b.date || ''
    if (da !== db) return db.localeCompare(da)
    return created(b) - created(a)
  })
}
