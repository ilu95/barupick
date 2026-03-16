import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { COLORS_60, COLOR_TABS } from '@/lib/colors'
import { useTranslation } from 'react-i18next'

interface Props {
  selected: string | null
  onSelect: (colorKey: string) => void
  onClear?: () => void
  onClose?: () => void
  inline?: boolean
  scoreDeltaFn?: (colorKey: string) => number
}

const RECENT_KEY = 'sp_recent_colors'
const MAX_RECENT = 6

function getRecentColors(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, MAX_RECENT) } catch { return [] }
}
function addRecentColor(key: string) {
  try {
    const recent = getRecentColors().filter(k => k !== key)
    recent.unshift(key)
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
  } catch {}
}

export default function ColorPicker({ selected, onSelect, onClear, onClose, inline, scoreDeltaFn }: Props) {
  const [tab, setTab] = useState(COLOR_TABS[0].id)
  const [recent, setRecent] = useState<string[]>([])
  const { t } = useTranslation()
  const group = COLOR_TABS.find(t => t.id === tab) || COLOR_TABS[0]

  useEffect(() => { setRecent(getRecentColors()) }, [])

  const handleSelect = (key: string) => {
    addRecentColor(key)
    setRecent(getRecentColors())
    onSelect(key)
  }

  const content = (
    <div className={inline ? 'bg-warm-100 dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl p-3' : ''}>
      {/* 2열 그리드 탭 */}
      <div className="grid grid-cols-4 gap-1.5 mb-2.5">
        {COLOR_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-2 px-1 rounded-xl text-[10px] font-semibold text-center transition-all active:scale-95 ${
              tab === t.id
                ? 'bg-terra-500 text-white'
                : 'bg-warm-200 dark:bg-warm-700 text-warm-600 dark:text-warm-400'
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* 최근 사용 */}
      {recent.length > 0 && (
        <>
          <div className="text-[9px] font-semibold text-warm-400 dark:text-warm-500 tracking-wider uppercase mb-1.5">{t('common.recentColors')}</div>
          <div className="flex gap-1.5 mb-2.5 pb-2.5 border-b border-warm-300 dark:border-warm-600">
            {recent.map(k => {
              const c = COLORS_60[k]
              if (!c) return null
              const needsBorder = c.hcl[2] > 90
              return (
                <button
                  key={k}
                  onClick={() => handleSelect(k)}
                  className={`w-8 h-8 rounded-lg transition-all active:scale-90 ${
                    selected === k ? 'ring-2 ring-terra-500 ring-offset-1 scale-105' : ''
                  }`}
                  style={{ background: c.hex, border: needsBorder ? '1px solid #ddd' : '1px solid rgba(0,0,0,0.06)' }}
                  title={c.name}
                />
              )
            })}
          </div>
        </>
      )}

      {/* 컬러 그리드 */}
      <div className="grid grid-cols-5 gap-1.5">
        {group.keys.map(k => {
          const c = COLORS_60[k]
          if (!c) return null
          const isSelected = selected === k
          const isLight = c.hcl[2] > 55
          const needsBorder = c.hcl[2] > 90
          const delta = scoreDeltaFn ? scoreDeltaFn(k) : 0

          return (
            <div key={k} className="relative">
              <button
                onClick={() => handleSelect(k)}
                aria-label={c.name}
                className={`w-full aspect-square rounded-xl flex items-center justify-center text-[8px] font-semibold leading-tight transition-all active:scale-90 ${
                  isSelected ? 'ring-2 ring-terra-500 ring-offset-1 scale-105' : ''
                }`}
                style={{
                  background: c.hex,
                  border: needsBorder ? '1px solid #ddd' : '1px solid rgba(0,0,0,0.05)',
                  color: isLight ? '#1C1917' : '#ffffff',
                }}
              >
                <span className="text-center px-0.5">{breakName(c.name)}</span>
              </button>
              {delta !== 0 && (
                <span className={`absolute -top-2 -right-2 text-[9px] font-bold px-1 py-0.5 rounded-full pointer-events-none ${
                  delta > 0 ? 'bg-green-500 text-white' : 'bg-red-400 text-white'
                }`}>
                  {delta > 0 ? '+' : ''}{delta}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* 탭 정보 */}
      <div className="text-center text-[10px] text-warm-400 dark:text-warm-500 mt-2">
        {group.emoji} {group.label} · {t('common.colorCount', { count: group.keys.length })}
      </div>
    </div>
  )

  if (inline) return content

  // 바텀시트 모드
  return (
    <div className="fixed inset-0 bg-black/40 z-[300] flex items-end justify-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={t('colorPicker.title')}>
      <div className="w-full max-w-[480px] bg-white dark:bg-warm-800 rounded-t-3xl p-5 pb-8 animate-screen-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-warm-900 dark:text-warm-100">{t('colorPicker.title')}</h3>
          <div className="flex gap-2">
            {selected && onClear && (
              <button onClick={onClear} className="text-xs text-warm-600 dark:text-warm-400 active:opacity-70 py-1">{t('colorPicker.reset')}</button>
            )}
            {onClose && (
              <button onClick={onClose} aria-label={t('colorPicker.closeLabel')} className="w-9 h-9 rounded-full bg-warm-200 dark:bg-warm-700 flex items-center justify-center active:scale-90">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        {content}
      </div>
    </div>
  )
}

function breakName(name: string): string {
  if (name.length <= 3) return name
  const mid = Math.ceil(name.length / 2)
  return name.slice(0, mid) + '\n' + name.slice(mid)
}
