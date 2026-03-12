// @ts-nocheck
// ═══════════════════════════════════════════════════════
// AllCombos.tsx — 내 옷장 전체 조합 리스트
// 모든 조합을 점수와 함께 표시, 순위, 감점 이유, 원탭 기록
// ═══════════════════════════════════════════════════════
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Check, ShoppingBag } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import { COLORS_60 } from '@/lib/colors'
import { CATEGORY_NAMES } from '@/lib/categories'
import { evaluationSystem } from '@/lib/evaluation'
import { profile } from '@/lib/profile'
import { useWardrobe, getScorePercentile } from '@/hooks/useWardrobe'
import { useQuickRecord } from '@/hooks/useQuickRecord'
import { useWeather } from '@/hooks/useWeather'

type SortMode = 'score' | 'unworn' | 'minimal'
type FilterMode = 'all' | 'with_outer' | 'no_outer' | string // string = specific item colorKey

interface ComboCard {
  outfit: Record<string, string>
  outfitHex: Record<string, string>
  score: number
  theory: string[]
  feedback: string
  improvements: any[]
  slotCount: number
  // 점수 상세
  subScores: Record<string, number>
  lowestSub: { key: string; value: number; label: string } | null
}

const SUB_LABELS: Record<string, string> = {
  goldilocks: '컬러 배치',
  ratio: '색상 비율',
  harmony: '색상 조화',
  season: '계절감',
  balance: '밸런스',
  personal: '퍼스널 컬러',
}

export default function AllCombos() {
  const navigate = useNavigate()
  const wardrobe = useWardrobe()
  const { weather } = useWeather()
  const quickRecord = useQuickRecord()

  const [sort, setSort] = useState<SortMode>('score')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [showCount, setShowCount] = useState(20)
  const [recordedId, setRecordedId] = useState<string | null>(null)  // 방금 기록한 조합 key
  const [datePickerFor, setDatePickerFor] = useState<string | null>(null)
  const [datePickerValue, setDatePickerValue] = useState('')
  const [analyzing, setAnalyzing] = useState(true)
  const [progress, setProgress] = useState(0)

  // ─── 전체 조합 생성 + 상세 평가 ───
  const [combos, setCombos] = useState<ComboCard[]>([])

  useEffect(() => {
    if (wardrobe.items.length < 2) {
      setAnalyzing(false)
      return
    }

    const pc = profile.getPersonalColor()
    const rawCombos = wardrobe.generateAllCombos({ maxCombos: 800 })
    const total = rawCombos.length
    if (total === 0) { setAnalyzing(false); return }

    const results: ComboCard[] = []
    let idx = 0

    function processChunk() {
      const end = Math.min(idx + 5, total)
      for (let i = idx; i < end; i++) {
        const raw = rawCombos[i]
        try {
          const evalResult = evaluationSystem.evaluate(raw.outfit, pc)
          const outfitHex: Record<string, string> = {}
          Object.entries(raw.outfit).forEach(([k, v]) => {
            if (v) { const c = COLORS_60[v]; if (c) outfitHex[k] = c.hex }
          })

          // 가장 낮은 세부 점수 찾기
          const subs = { goldilocks: evalResult.goldilocks, ratio: evalResult.ratio, harmony: evalResult.harmony, season: evalResult.season, balance: evalResult.balance }
          let lowestSub = null
          if (evalResult.total < 75) {
            const entries = Object.entries(subs)
            entries.sort((a, b) => a[1] - b[1])
            if (entries[0]) {
              lowestSub = { key: entries[0][0], value: Math.round(entries[0][1]), label: SUB_LABELS[entries[0][0]] || entries[0][0] }
            }
          }

          // 개선 제안 (70점 미만만)
          let improvements = []
          if (evalResult.total < 70) {
            try { improvements = evaluationSystem.generateImprovements(raw.outfit, evalResult.total, pc).slice(0, 2) } catch {}
          }

          results.push({
            outfit: raw.outfit,
            outfitHex,
            score: evalResult.total,
            theory: evalResult.theory || [],
            feedback: evalResult.feedback || '',
            improvements,
            slotCount: Object.keys(raw.outfit).filter(k => raw.outfit[k]).length,
            subScores: subs,
            lowestSub,
          })
        } catch {}
      }
      idx = end
      setProgress(Math.round((idx / total) * 100))
      if (idx < total) {
        requestAnimationFrame(processChunk)
      } else {
        results.sort((a, b) => b.score - a.score)
        setCombos(results)
        setAnalyzing(false)
      }
    }
    requestAnimationFrame(processChunk)
  }, [wardrobe.items])

  // ─── OOTD 기록에서 최근 착용 정보 ───
  const recentWorn = useMemo(() => {
    try {
      const records = JSON.parse(localStorage.getItem('sp_ootd_records') || '[]')
      const map: Record<string, string> = {}  // outfitKey → date
      records.forEach((r: any) => {
        const key = comboKey(r.colors)
        if (!map[key]) map[key] = r.date
      })
      return map
    } catch { return {} }
  }, [recordedId]) // recordedId가 바뀌면 재계산

  // ─── 정렬 + 필터 ───
  const filtered = useMemo(() => {
    let list = [...combos]

    // 필터
    if (filter === 'with_outer') {
      list = list.filter(c => c.outfit.outer)
    } else if (filter === 'no_outer') {
      list = list.filter(c => !c.outfit.outer)
    } else if (filter !== 'all') {
      // 특정 아이템 포함 필터 (colorKey)
      list = list.filter(c => Object.values(c.outfit).includes(filter))
    }

    // 정렬
    if (sort === 'score') {
      list.sort((a, b) => b.score - a.score)
    } else if (sort === 'unworn') {
      list.sort((a, b) => {
        const aDate = recentWorn[comboKey(a.outfit)] || '0000'
        const bDate = recentWorn[comboKey(b.outfit)] || '0000'
        return aDate.localeCompare(bDate) // 오래된 것 먼저
      })
    } else if (sort === 'minimal') {
      list.sort((a, b) => a.slotCount - b.slotCount || b.score - a.score)
    }

    return list
  }, [combos, filter, sort, recentWorn])

  // ─── 날씨 코멘트 ───
  const weatherComment = useMemo(() => {
    if (!weather) return null
    const t = weather.feels ?? weather.temp
    if (t >= 28) return { emoji: '☀️', text: `${t}°C — 가볍게 입기 좋은 날이에요` }
    if (t >= 20) return { emoji: '🌤', text: `${t}°C — 간절기 코디 좋아요` }
    if (t >= 12) return { emoji: '🌥', text: `${t}°C — 자켓이나 가디건 추천해요` }
    if (t >= 5) return { emoji: '🧥', text: `${t}°C — 아우터가 필요해요` }
    return { emoji: '❄️', text: `${t}°C — 따뜻하게 레이어링하세요` }
  }, [weather])

  // ─── 옷장 진단 (조합 부족 시) ───
  const diagnosis = useMemo(() => {
    if (combos.length > 3) return null
    const pools: Record<string, number> = {}
    wardrobe.items.forEach(item => {
      const cat = item.category
      const color = item.color || item.colorKey
      if (cat && color) pools[cat] = (pools[cat] || 0) + 1
    })
    const missing: string[] = []
    if (!pools.top) missing.push('상의')
    if (!pools.bottom) missing.push('하의')
    if (!pools.shoes) missing.push('신발')
    return { pools, missing, total: wardrobe.items.length }
  }, [combos, wardrobe.items])

  // ─── 특정 아이템 필터용: 옷장 아이템 목록 ───
  const wardrobeColorItems = useMemo(() => {
    const seen = new Set<string>()
    return wardrobe.items.filter(item => {
      const color = item.color || item.colorKey
      if (!color || seen.has(color)) return false
      seen.add(color)
      return !!COLORS_60[color]
    })
  }, [wardrobe.items])

  // ─── 원탭 기록 ───
  const handleRecordToday = (outfit: Record<string, string>) => {
    const key = comboKey(outfit)
    if (quickRecord.isDuplicateOnDate(outfit, todayStr())) {
      setRecordedId(key + '_dup')
      setTimeout(() => setRecordedId(null), 2000)
      return
    }
    const result = quickRecord.recordToday(outfit)
    if (result.success) {
      setRecordedId(key)
      setTimeout(() => setRecordedId(null), 3000)
    }
  }

  // ─── 날짜 선택 기록 ───
  const handleRecordOnDate = (outfit: Record<string, string>) => {
    if (!datePickerValue) return
    const date = new Date(datePickerValue)
    const result = quickRecord.recordOnDate(outfit, date)
    if (result.success) {
      setRecordedId(comboKey(outfit))
      setDatePickerFor(null)
      setDatePickerValue('')
      setTimeout(() => setRecordedId(null), 3000)
    }
  }

  // ─── 분석 중 ───
  if (analyzing) {
    return (
      <div className="animate-screen-fade px-5 pt-2 pb-10">
        <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-6">내 옷장 전체 조합</h2>
        <div className="py-16 flex flex-col items-center">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx={60} cy={60} r={52} fill="none" stroke="currentColor" className="text-warm-300 dark:text-warm-600" strokeWidth={8} />
              <circle cx={60} cy={60} r={52} fill="none" stroke="currentColor" className="text-terra-500" strokeWidth={8}
                strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - progress / 100)}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.3s' }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-sm font-bold text-warm-700 dark:text-warm-300">{progress}%</span>
            </div>
          </div>
          <div className="text-sm text-warm-500 dark:text-warm-400">옷장 조합 분석 중...</div>
        </div>
      </div>
    )
  }

  // ─── 옷장 진단 (조합 부족) ───
  if (diagnosis && combos.length === 0) {
    return (
      <div className="animate-screen-fade px-5 pt-2 pb-10">
        <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-6">내 옷장 전체 조합</h2>
        <div className="bg-warm-100 dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl p-5 mb-5">
          <div className="text-sm font-semibold text-warm-900 dark:text-warm-100 mb-3">현재 옷장 상태</div>
          {['top', 'bottom', 'shoes', 'outer', 'middleware'].map(cat => {
            const count = diagnosis.pools[cat] || 0
            const label = (CATEGORY_NAMES as any)[cat] || cat
            const isMissing = ['top', 'bottom', 'shoes'].includes(cat) && count === 0
            return (
              <div key={cat} className="flex items-center gap-2 py-1 text-sm">
                <span>{count > 0 ? '✅' : isMissing ? '❌' : '➖'}</span>
                <span className="w-16 font-medium text-warm-800 dark:text-warm-200">{label}</span>
                <span className={`${isMissing ? 'text-red-500 font-semibold' : 'text-warm-500 dark:text-warm-400'}`}>
                  {count > 0 ? `${count}개` : isMissing ? '없음 ← 필요!' : '없음'}
                </span>
              </div>
            )
          })}
        </div>
        {diagnosis.missing.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 mb-5">
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <b>{diagnosis.missing.join(', ')}</b>을 등록하면 코디 조합을 볼 수 있어요
            </div>
          </div>
        )}
        <button onClick={() => navigate('/closet/add')} className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all shadow-terra">
          아이템 등록하기
        </button>
      </div>
    )
  }

  // ─── 메인 렌더 ───
  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-1">내 옷장 전체 조합</h2>

      {/* 날씨 코멘트 (참고) */}
      {weatherComment && (
        <div className="text-sm text-warm-500 dark:text-warm-400 mb-4">
          {weatherComment.emoji} {weatherComment.text} <span className="text-[10px] text-warm-400">(참고)</span>
        </div>
      )}
      {!weatherComment && <div className="mb-3" />}

      {/* 정렬 + 필터 */}
      <div className="flex items-center gap-2 mb-4">
        {/* 정렬 */}
        <select
          value={sort}
          onChange={e => { setSort(e.target.value as SortMode); setShowCount(20) }}
          className="flex-1 py-2 px-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-xl text-[12px] font-medium text-warm-700 dark:text-warm-300 appearance-none"
        >
          <option value="score">점수순</option>
          <option value="unworn">최근 안 입은 순</option>
          <option value="minimal">아이템 적은 순</option>
        </select>

        {/* 필터 */}
        <select
          value={filter}
          onChange={e => { setFilter(e.target.value); setShowCount(20) }}
          className="flex-1 py-2 px-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-xl text-[12px] font-medium text-warm-700 dark:text-warm-300 appearance-none"
        >
          <option value="all">전체 {combos.length}개</option>
          <option value="with_outer">아우터 포함</option>
          <option value="no_outer">아우터 없이</option>
          {wardrobeColorItems.slice(0, 10).map(item => {
            const c = COLORS_60[item.color || item.colorKey]
            if (!c) return null
            return <option key={item.id} value={item.color || item.colorKey}>{c.name} 포함</option>
          })}
        </select>
      </div>

      {/* 결과 수 */}
      <div className="text-[11px] text-warm-500 dark:text-warm-400 mb-3">
        {filtered.length}개 조합{filtered.length > showCount ? ` (${showCount}개 표시 중)` : ''}
      </div>

      {/* 조합 리스트 */}
      <div className="flex flex-col gap-3">
        {filtered.slice(0, showCount).map((combo, idx) => {
          const key = comboKey(combo.outfit)
          const rank = idx + 1
          const isJustRecorded = recordedId === key
          const isDup = recordedId === key + '_dup'
          const lastWorn = recentWorn[key]
          const pct = getScorePercentile(combo.score)

          // 별점
          const stars = combo.score >= 90 ? 5 : combo.score >= 80 ? 4 : combo.score >= 70 ? 3 : combo.score >= 55 ? 2 : 1

          return (
            <div key={key} className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl overflow-hidden shadow-warm-sm">
              {/* 상단: 순위 + 점수 */}
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <div className="flex items-center gap-2">
                  {rank <= 3 ? (
                    <span className="text-sm">{rank === 1 ? '🏆' : rank === 2 ? '🥈' : '🥉'}</span>
                  ) : (
                    <span className="text-[12px] font-bold text-warm-500 dark:text-warm-400 w-6 text-center">{rank}</span>
                  )}
                  <span className="text-[10px] text-warm-400">{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-display text-lg font-bold ${
                    combo.score >= 85 ? 'text-green-600 dark:text-green-400' :
                    combo.score >= 70 ? 'text-warm-800 dark:text-warm-200' :
                    'text-warm-500 dark:text-warm-400'
                  }`}>{combo.score}점</span>
                  {pct && <span className="text-[9px] font-semibold bg-terra-100 text-terra-600 dark:bg-terra-900/30 dark:text-terra-400 px-1.5 py-0.5 rounded-full">{pct.label}</span>}
                </div>
              </div>

              {/* 마네킹 + 아이템 */}
              <div className="flex items-center gap-4 px-4 pb-2">
                <div className="bg-warm-100 dark:bg-warm-700 rounded-xl p-2.5 flex-shrink-0">
                  <MannequinSVG outfit={combo.outfitHex} size={75} />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  {Object.entries(combo.outfit).filter(([_, v]) => v).map(([part, colorKey]) => {
                    const c = COLORS_60[colorKey]
                    if (!c) return null
                    return (
                      <div key={part} className="flex items-center gap-1.5 text-[11px]">
                        <span className="w-3.5 h-3.5 rounded border border-warm-300 dark:border-warm-500 flex-shrink-0" style={{ background: c.hex }} />
                        <span className="text-warm-500 dark:text-warm-400 w-8">{(CATEGORY_NAMES as any)?.[part]?.slice(0, 2)}</span>
                        <span className="text-warm-800 dark:text-warm-200 font-medium">{c.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 배색 이론 */}
              {combo.theory.length > 0 && (
                <div className="px-4 pb-1">
                  <span className="text-[10px] bg-terra-50 dark:bg-terra-900/20 text-terra-600 dark:text-terra-400 px-2 py-0.5 rounded-full">🎨 {combo.theory[0]} 배색</span>
                </div>
              )}

              {/* 최근 착용 */}
              {lastWorn && (
                <div className="px-4 pb-1">
                  <span className="text-[10px] text-warm-400 dark:text-warm-500">📅 마지막 착용: {lastWorn}</span>
                </div>
              )}

              {/* 감점 이유 (75점 미만) */}
              {combo.lowestSub && (
                <div className="px-4 pb-1">
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">⚠️ {combo.lowestSub.label} 점수가 낮아요</span>
                </div>
              )}

              {/* 개선 제안 (70점 미만) */}
              {combo.improvements.length > 0 && (
                <div className="px-4 pb-2 flex flex-col gap-0.5">
                  {combo.improvements.map((imp, i) => {
                    const newC = COLORS_60[imp.newColor]
                    return (
                      <div key={i} className="text-[10px] text-warm-600 dark:text-warm-400 flex items-center gap-1">
                        <span>{imp.icon || '💡'}</span>
                        <span>{(CATEGORY_NAMES as any)?.[imp.item]?.slice(0, 2)}을 </span>
                        {newC && <span className="w-2.5 h-2.5 rounded inline-block border border-warm-300" style={{ background: newC.hex }} />}
                        <span>{newC?.name || imp.newColor}로 바꾸면 {imp.newScore}점</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* CTA: 기록 버튼 */}
              <div className="border-t border-warm-200 dark:border-warm-600 px-3 py-2.5 flex gap-2">
                {isJustRecorded ? (
                  <div className="flex-1 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl text-center text-[11px] font-semibold text-green-600 dark:text-green-400 flex items-center justify-center gap-1">
                    <Check size={14} /> 기록 완료!
                  </div>
                ) : isDup ? (
                  <div className="flex-1 py-2 bg-warm-100 dark:bg-warm-700 rounded-xl text-center text-[11px] text-warm-500">
                    이미 오늘 기록된 조합이에요
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleRecordToday(combo.outfit)}
                      className="flex-1 py-2 bg-terra-500 text-white rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 active:scale-[0.97] transition-all"
                    >
                      <Check size={13} /> 오늘 입었어요
                    </button>
                    <button
                      onClick={() => { setDatePickerFor(key); setDatePickerValue('') }}
                      className="py-2 px-3 bg-warm-100 dark:bg-warm-700 border border-warm-300 dark:border-warm-600 rounded-xl text-[11px] font-medium text-warm-600 dark:text-warm-400 flex items-center gap-1 active:scale-[0.97] transition-all"
                    >
                      <Calendar size={13} /> 날짜 선택
                    </button>
                  </>
                )}
              </div>

              {/* 날짜 선택기 (인라인) */}
              {datePickerFor === key && (
                <div className="px-3 pb-3 flex items-center gap-2 animate-screen-fade">
                  <input
                    type="date"
                    value={datePickerValue}
                    onChange={e => setDatePickerValue(e.target.value)}
                    max={todayStr()}
                    className="flex-1 py-2 px-3 bg-warm-50 dark:bg-warm-700 border border-warm-300 dark:border-warm-600 rounded-xl text-[12px] text-warm-800 dark:text-warm-200"
                  />
                  <button
                    onClick={() => handleRecordOnDate(combo.outfit)}
                    disabled={!datePickerValue}
                    className="py-2 px-4 bg-terra-500 text-white rounded-xl text-[11px] font-semibold disabled:opacity-40 active:scale-[0.97] transition-all"
                  >
                    기록
                  </button>
                  <button
                    onClick={() => setDatePickerFor(null)}
                    className="py-2 px-2 text-warm-500 text-[11px]"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 더 보기 */}
      {filtered.length > showCount && (
        <button
          onClick={() => setShowCount(prev => prev + 20)}
          className="w-full mt-3 py-3 bg-warm-100 dark:bg-warm-700 border border-warm-300 dark:border-warm-600 rounded-2xl text-sm font-medium text-warm-600 dark:text-warm-400 active:scale-[0.98] transition-all"
        >
          더 보기 ({filtered.length - showCount}개 남음)
        </button>
      )}

      {/* 결과 적을 때 추가 안내 */}
      {combos.length > 0 && combos.length <= 5 && (
        <div className="mt-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4">
          <div className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">코디가 {combos.length}개뿐이에요</div>
          <div className="text-[11px] text-warm-600 dark:text-warm-400 mb-3">옷장에 아이템을 추가하면 조합이 늘어나요</div>
          <button
            onClick={() => navigate('/closet/simulate')}
            className="w-full py-2.5 bg-white dark:bg-warm-800 border border-amber-300 dark:border-amber-700 rounded-xl text-[12px] font-semibold text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
          >
            <ShoppingBag size={14} /> 뭘 사면 좋을지 확인하기
          </button>
        </div>
      )}
    </div>
  )
}

// ─── 유틸 ───
function comboKey(outfit: Record<string, string | null>): string {
  return Object.entries(outfit).filter(([_, v]) => v).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join('/')
}

function todayStr(): string {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
