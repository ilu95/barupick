import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import CharacterCanvas from '@/components/mannequin/CharacterCanvas'
import { sceneFromColors } from '@/lib/char/scene'
import { COLORS_60 } from '@/lib/colors'
import { useOotd } from '@/hooks/useOotd'
import { useTranslation } from 'react-i18next'

export default function BestCoord() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { getRecords } = useOotd()

  const bestRecords = useMemo(() => {
    return getRecords().sort((a, b) => b.score - a.score).slice(0, 10)
  }, [])

  if (bestRecords.length === 0) {
    return (
      <div className="animate-screen-fade px-5 pt-6 pb-10 text-center py-20">
        <Trophy size={40} className="text-warm-400 dark:text-warm-500 mx-auto mb-3" />
        <div className="text-sm text-warm-600 dark:text-warm-400 mb-4">{t('closet.noRecordsYet')}</div>
        <button onClick={() => navigate('/record')} className="px-5 py-2.5 bg-terra-500 text-white rounded-full text-sm font-semibold active:scale-95 transition-all shadow-terra">
          {t('closet.firstOotdRecord')}
        </button>
      </div>
    )
  }

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-1">{t('closet.bestCoordTitle')}</h2>
      <p className="text-sm text-warm-600 dark:text-warm-400 mb-5">{t('closet.sortByScore')}</p>

      <div className="flex flex-col gap-3">
        {bestRecords.map((record, idx) => {
          const scene = sceneFromColors(record.colors as any, record.itemTypes)
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`

          return (
            <button
              key={record.id}
              onClick={() => navigate(`/closet/ootd/${record.date}?id=${record.id}`)}
              className="flex items-center gap-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 shadow-warm-sm active:scale-[0.98] transition-all text-left"
            >
              <span className="text-lg w-8 text-center flex-shrink-0">{medal}</span>
              <div className="w-[65px] h-[65px] flex items-center justify-center flex-shrink-0 bg-warm-100 dark:bg-warm-700 rounded-xl overflow-hidden">
                <CharacterCanvas items={scene.items} body={scene.body} width={52} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-display text-lg font-bold text-terra-600 dark:text-terra-400">{record.score}<span className="text-xs text-warm-500 dark:text-warm-400">{t('closet.scoreSuffix')}</span></span>
                </div>
                <div className="text-[11px] text-warm-600 dark:text-warm-400">{record.date}</div>
                {record.situation && <div className="text-[11px] text-warm-500 dark:text-warm-400 mt-0.5">{record.situation}</div>}
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
