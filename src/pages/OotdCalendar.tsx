import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useOotd, type OotdRecord } from '@/hooks/useOotd'
import { COLORS_60 } from '@/lib/colors'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import { useTranslation } from 'react-i18next'

export default function OotdCalendar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { getRecords } = useOotd()
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const records = getRecords()

  // 날짜별 기록 맵
  const recordsByDate = useMemo(() => {
    const map: Record<string, OotdRecord[]> = {}
    records.forEach(r => {
      if (!map[r.date]) map[r.date] = []
      map[r.date].push(r)
    })
    return map
  }, [records])

  // 캘린더 데이터 생성
  const calendarDays = useMemo(() => {
    const firstDay = new Date(month.year, month.month, 1)
    const lastDay = new Date(month.year, month.month + 1, 0)
    const startPad = firstDay.getDay() // 0=일요일

    const days: { date: number, dateStr: string, records: OotdRecord[], isToday: boolean }[] = []

    // 앞쪽 빈칸
    for (let i = 0; i < startPad; i++) {
      days.push({ date: 0, dateStr: '', records: [], isToday: false })
    }

    const today = new Date()
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0')

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = month.year + '-' + String(month.month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0')
      days.push({
        date: d,
        dateStr,
        records: recordsByDate[dateStr] || [],
        isToday: dateStr === todayStr,
      })
    }

    return days
  }, [month, recordsByDate])

  const monthLabel = `${month.year}년 ${month.month + 1}월`
  const prevMonth = () => setMonth(m => m.month === 0 ? { year: m.year - 1, month: 11 } : { ...m, month: m.month - 1 })
  const nextMonth = () => setMonth(m => m.month === 11 ? { year: m.year + 1, month: 0 } : { ...m, month: m.month + 1 })

  const [typeFilter, setTypeFilter] = useState<'all' | 'photo' | 'mannequin'>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

  // 이번 달 기록 요약
  const monthRecords = records.filter(r => r.date.startsWith(`${month.year}-${String(month.month + 1).padStart(2, '0')}`))
  const daysWithRecords = new Set(monthRecords.map(r => r.date)).size

  // 필터링된 기록
  const filteredRecords = useMemo(() => {
    let filtered = [...monthRecords]
    if (typeFilter === 'photo') filtered = filtered.filter(r => r.photos && r.photos.length > 0)
    if (typeFilter === 'mannequin') filtered = filtered.filter(r => !r.photos || r.photos.length === 0)
    filtered.sort((a, b) => sortOrder === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date))
    return filtered
  }, [monthRecords, typeFilter, sortOrder])

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      {/* 월 네비 */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={prevMonth} className="w-9 h-9 rounded-full bg-white border border-warm-400 flex items-center justify-center active:scale-90 transition-transform">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <div className="font-display text-lg font-bold text-warm-900">{monthLabel}</div>
          <div className="text-[11px] text-warm-600">{daysWithRecords}일 기록 · {monthRecords.length}개 코디</div>
        </div>
        <button onClick={nextMonth} className="w-9 h-9 rounded-full bg-white border border-warm-400 flex items-center justify-center active:scale-90 transition-transform">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {(t('ootdCalendar.weekDays', { returnObjects: true }) as string[]).map((d, i) => (
          <div key={d} className={`text-center text-[11px] font-semibold py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-warm-500'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* 캘린더 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          if (day.date === 0) return <div key={idx} />

          const hasRecords = day.records.length > 0
          const bestRecord = hasRecords ? [...day.records].sort((a, b) => b.score - a.score)[0] : null

          return (
            <button
              key={idx}
              onClick={() => hasRecords && navigate(`/closet/ootd/${day.dateStr}`)}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${
                day.isToday ? 'bg-terra-100 dark:bg-terra-900/20 border border-terra-300 dark:border-terra-700' :
                hasRecords ? 'bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 shadow-warm-sm active:scale-95' :
                'bg-warm-100 dark:bg-warm-800'
              }`}
            >
              <span className={`text-[12px] font-medium ${
                day.isToday ? 'text-terra-600 dark:text-terra-400 font-bold' : hasRecords ? 'text-warm-900 dark:text-warm-100' : 'text-warm-500 dark:text-warm-400'
              }`}>
                {day.date}
              </span>

              {hasRecords && bestRecord && (
                <div className="flex gap-[2px] mt-0.5">
                  {Object.values(bestRecord.colors).filter(Boolean).slice(0, 4).map((ck, i) => {
                    const c = COLORS_60[ck as string]
                    return c ? <div key={i} className="w-[6px] h-[6px] rounded-full border border-white/50" style={{ background: c.hex }} /> : null
                  })}
                </div>
              )}
              {hasRecords && bestRecord && (
                <div className="text-[7px] font-bold text-terra-600 dark:text-terra-400 mt-[1px]">{t('common.score', { score: bestRecord.score })}</div>
              )}

              {day.records.length > 1 && (
                <span className="text-[7px] text-warm-500 dark:text-warm-400">+{day.records.length - 1}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* 컬러 반복 감지 */}
      {(() => {
        // 최근 7일 중 연속된 날짜의 컬러 유사도 체크
        const recentDays = calendarDays.filter(d => d.date > 0 && d.records.length > 0).slice(-7)
        if (recentDays.length < 2) return null

        let streakDays = 0
        for (let i = recentDays.length - 1; i > 0; i--) {
          const todayColors = new Set(Object.values(recentDays[i].records[0]?.colors || {}).filter(Boolean))
          const prevColors = new Set(Object.values(recentDays[i - 1].records[0]?.colors || {}).filter(Boolean))
          if (todayColors.size === 0 || prevColors.size === 0) break
          const overlap = [...todayColors].filter(c => prevColors.has(c)).length
          const similarity = overlap / Math.max(todayColors.size, prevColors.size)
          if (similarity >= 0.5) streakDays++
          else break
        }

        if (streakDays < 2) return null

        return (
          <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-3.5">
            <div className="text-[12px] text-amber-800 dark:text-amber-300 font-medium mb-1">
              이번 주 비슷한 컬러가 {streakDays + 1}일 이어지고 있어요
            </div>
            <div className="text-[11px] text-warm-600 dark:text-warm-400 mb-2">다른 조합도 확인해볼까요?</div>
            <button
              onClick={() => navigate('/closet/combos')}
              className="w-full py-2 bg-white dark:bg-warm-800 border border-amber-200 dark:border-amber-700 rounded-xl text-[11px] font-semibold text-amber-700 dark:text-amber-300 active:scale-[0.98] transition-all"
            >
              다른 조합 보기 →
            </button>
          </div>
        )
      })()}

      {/* 이번 달 기록 리스트 */}
      {monthRecords.length > 0 && (
        <div className="mt-6">
          <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-widest uppercase mb-3">
            {month.month + 1}월 기록 ({monthRecords.length})
          </div>

          {/* 필터 */}
          <div className="flex gap-1.5 mb-3">
            {(['all', 'photo', 'mannequin'] as const).map(f => (
              <button key={f} onClick={() => setTypeFilter(f)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${typeFilter === f ? 'bg-terra-500 text-white' : 'bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 text-warm-600 dark:text-warm-300 active:scale-95'}`}>
                {f === 'all' ? t('ootdCalendar.filterAll') : f === 'photo' ? `📷 ${t('ootdCalendar.filterPhoto')}` : `👤 ${t('ootdCalendar.filterMannequin')}`}
              </button>
            ))}
            <div className="flex-1" />
            <button onClick={() => setSortOrder(s => s === 'newest' ? 'oldest' : 'newest')}
              className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 text-warm-600 dark:text-warm-300 active:scale-95 transition-all">
              {sortOrder === 'newest' ? `${t('ootdCalendar.sortNewest')} ↓` : `${t('ootdCalendar.sortOldest')} ↑`}
            </button>
          </div>

          {/* 2열 그리드 */}
          <div className="grid grid-cols-2 gap-2.5">
            {filteredRecords.map(record => (
              <CalendarRecordCard key={record.id} record={record} navigate={navigate} />
            ))}
          </div>

          {filteredRecords.length === 0 && (
            <div className="text-center py-8 text-sm text-warm-500 dark:text-warm-400">
              {typeFilter === 'photo' ? t('ootdCalendar.filterPhoto') : t('ootdCalendar.filterMannequin')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── 캘린더용 기록 카드 (Closet RecordCard 기반, 날짜 표시 변경) ───
function CalendarRecordCard({ record, navigate }: { record: OotdRecord, navigate: any }) {
  const { t } = useTranslation()
  const outfitHex: Record<string, string> = {}
  Object.entries(record.colors || {}).forEach(([k, v]) => {
    if (v) { const c = COLORS_60[v as string]; if (c) outfitHex[k] = c.hex }
  })

  const [ry, rm, rd] = (record.date || '').split('-').map(Number)
  const weekDays = t('ootdCalendar.weekDays', { returnObjects: true }) as string[]
  const dayOfWeek = weekDays[new Date(ry, rm - 1, rd).getDay()]
  const dateLabel = `${rm}/${rd} ${dayOfWeek}`

  const hasPhoto = record.photos && record.photos.length > 0

  if (hasPhoto) {
    return (
      <button
        onClick={() => navigate(`/closet/ootd/${record.date}?id=${record.id}`)}
        className="w-full bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl overflow-hidden shadow-warm-sm active:scale-[0.98] transition-all text-left"
      >
        <img src={record.photos[0]} className="w-full aspect-[4/5] object-cover" alt="" />
        <div className="px-2.5 py-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px] font-semibold text-warm-900 dark:text-warm-100">{dateLabel}</span>
            <span className="font-display text-[10px] font-bold text-terra-600 bg-terra-100 dark:bg-terra-900/30 px-1.5 py-0.5 rounded-full">{t('common.score', { score: record.score })}</span>
          </div>
          <div className="flex gap-0.5">
            {Object.values(record.colors || {}).filter(Boolean).slice(0, 5).map((colorKey, i) => {
              const c = COLORS_60[colorKey as string]
              return c ? <div key={i} className="w-2.5 h-2.5 rounded-full border border-warm-400/50" style={{ background: c.hex }} /> : null
            })}
          </div>
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={() => navigate(`/closet/ootd/${record.date}?id=${record.id}`)}
      className="w-full bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl overflow-hidden shadow-warm-sm active:scale-[0.98] transition-all text-left"
    >
      <div className="flex items-center justify-center py-4 bg-warm-100 dark:bg-warm-700">
        <MannequinSVG outfit={outfitHex} size={80} />
      </div>
      <div className="px-2.5 py-2">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[11px] font-semibold text-warm-900 dark:text-warm-100">{dateLabel}</span>
          <span className="font-display text-[10px] font-bold text-terra-600 bg-terra-100 dark:bg-terra-900/30 px-1.5 py-0.5 rounded-full">{t('common.score', { score: record.score })}</span>
        </div>
        <div className="flex gap-0.5">
          {Object.values(record.colors || {}).filter(Boolean).slice(0, 5).map((colorKey, i) => {
            const c = COLORS_60[colorKey as string]
            return c ? <div key={i} className="w-2.5 h-2.5 rounded-full border border-warm-400/50" style={{ background: c.hex }} /> : null
          })}
        </div>
      </div>
    </button>
  )
}
