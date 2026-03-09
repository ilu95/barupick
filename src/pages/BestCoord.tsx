import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import { COLORS_60 } from '@/lib/colors'
import { useOotd } from '@/hooks/useOotd'

export default function BestCoord() {
  const navigate = useNavigate()
  const { getRecords } = useOotd()

  const bestRecords = useMemo(() => {
    return getRecords().sort((a, b) => b.score - a.score).slice(0, 10)
  }, [])

  if (bestRecords.length === 0) {
    return (
      <div className="animate-screen-fade px-5 pt-6 pb-10 text-center py-20">
        <Trophy size={40} className="text-warm-400 mx-auto mb-3" />
        <div className="text-sm text-warm-600 mb-4">아직 기록이 없어요</div>
        <button onClick={() => navigate('/record')} className="px-5 py-2.5 bg-terra-500 text-white rounded-full text-sm font-semibold active:scale-95 transition-all shadow-terra">
          첫 OOTD 기록하기
        </button>
      </div>
    )
  }

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-1">베스트 코디</h2>
      <p className="text-sm text-warm-600 mb-5">높은 점수순으로 정렬했어요</p>

      <div className="flex flex-col gap-3">
        {bestRecords.map((record, idx) => {
          const outfitHex: Record<string, string> = {}
          Object.entries(record.colors || {}).forEach(([k, v]) => {
            if (v) { const c = COLORS_60[v]; if (c) outfitHex[k] = c.hex }
          })
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`

          return (
            <button
              key={record.id}
              onClick={() => navigate(`/closet/ootd/${record.date}?id=${record.id}`)}
              className="flex items-center gap-3 bg-white border border-warm-400 rounded-2xl p-4 shadow-warm-sm active:scale-[0.98] transition-all text-left"
            >
              <span className="text-lg w-8 text-center flex-shrink-0">{medal}</span>
              <MannequinSVG outfit={outfitHex} size={65} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-display text-lg font-bold text-terra-600">{record.score}<span className="text-xs text-warm-500">점</span></span>
                </div>
                <div className="text-[11px] text-warm-600">{record.date}</div>
                {record.situation && <div className="text-[11px] text-warm-500 mt-0.5">{record.situation}</div>}
                <div className="flex gap-1 mt-1">
                  {Object.values(record.colors || {}).filter(Boolean).slice(0, 5).map((ck, i) => {
                    const c = COLORS_60[ck as string]
                    return c ? <div key={i} className="w-3 h-3 rounded-full border border-warm-400/50" style={{ background: c.hex }} /> : null
                  })}
                </div>
              </div>
              {record.photos?.[0] && (
                <img src={record.photos[0]} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt="" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
