import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useOotd, type OotdRecord } from '@/hooks/useOotd'
import { COLORS_60 } from '@/lib/colors'
import MannequinSVG from '@/components/mannequin/MannequinSVG'

export default function OotdCalendar() {
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

  // 이번 달 기록 요약
  const monthRecords = records.filter(r => r.date.startsWith(`${month.year}-${String(month.month + 1).padStart(2, '0')}`))
  const daysWithRecords = new Set(monthRecords.map(r => r.date)).size

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
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
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
          const bestRecord = day.records.sort((a, b) => b.score - a.score)[0]

          return (
            <button
              key={idx}
              onClick={() => hasRecords && navigate(`/closet/ootd/${day.dateStr}`)}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${
                day.isToday ? 'bg-terra-100 border border-terra-300' :
                hasRecords ? 'bg-white border border-warm-400 shadow-warm-sm active:scale-95' :
                'bg-warm-100'
              }`}
            >
              <span className={`text-[12px] font-medium ${
                day.isToday ? 'text-terra-600 font-bold' : hasRecords ? 'text-warm-900' : 'text-warm-500'
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
                <div className="text-[7px] font-bold text-terra-600 mt-[1px]">{bestRecord.score}점</div>
              )}

              {day.records.length > 1 && (
                <span className="text-[7px] text-warm-500">+{day.records.length - 1}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
