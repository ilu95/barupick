import { useState } from 'react'
import { X } from 'lucide-react'
import { COLORS_60 } from '@/lib/colors'

interface Props {
  selected: string | null
  onSelect: (colorKey: string) => void
  onClear?: () => void
  onClose?: () => void
  inline?: boolean // true = 인라인 렌더링, false = 바텀시트
}

const COLOR_GROUPS = [
  { label: '베이직', keys: ['white', 'ivory', 'beige', 'lightgray', 'gray', 'charcoal', 'black', 'brown', 'camel', 'navy', 'burgundy', 'olive', 'khaki', 'cream', 'taupe'] },
  { label: '어스톤', keys: ['cognac', 'tan', 'sienna', 'terracotta', 'brick', 'dusty_rose', 'sage', 'moss', 'hunter_green', 'denim', 'steel_blue', 'mauve', 'plum', 'eggplant'] },
  { label: '파스텔', keys: ['pastel_pink', 'pastel_blue', 'pastel_green', 'pastel_yellow', 'pastel_purple', 'pastel_mint', 'pastel_peach', 'pastel_lavender', 'pastel_coral', 'pastel_sky', 'pastel_lilac', 'pastel_sage', 'pastel_lemon', 'pastel_rose', 'pastel_aqua'] },
  { label: '비비드', keys: ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'teal', 'coral', 'turquoise', 'royal_blue', 'emerald', 'cobalt', 'crimson', 'magenta', 'lime', 'cyan', 'gold', 'amber', 'mustard', 'rust', 'burnt_orange'] },
  { label: '다크', keys: ['dark_red', 'dark_blue', 'dark_green', 'dark_purple', 'dark_brown', 'dark_olive', 'dark_teal', 'wine', 'forest', 'midnight', 'chocolate', 'slate', 'maroon', 'indigo', 'espresso', 'powder_blue', 'silver'] },
]

export default function ColorPicker({ selected, onSelect, onClear, onClose, inline }: Props) {
  const [tab, setTab] = useState('베이직')
  const group = COLOR_GROUPS.find(g => g.label === tab) || COLOR_GROUPS[0]

  const content = (
    <div className={inline ? 'bg-warm-100 border border-warm-300 rounded-2xl p-3' : ''}>
      {/* 탭 */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 hide-scrollbar">
        {COLOR_GROUPS.map(g => (
          <button
            key={g.label}
            onClick={() => setTab(g.label)}
            className={`px-3 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
              tab === g.label ? 'bg-terra-500 text-white' : 'bg-warm-200 text-warm-600'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* 컬러 그리드 */}
      <div className="grid grid-cols-5 gap-2">
        {group.keys.map(k => {
          const c = COLORS_60[k]
          if (!c) return null
          const isSelected = selected === k
          const isLight = c.hcl[2] > 60
          const needsBorder = ['white', 'ivory', 'cream'].includes(k)

          return (
            <button
              key={k}
              onClick={() => onSelect(k)}
              aria-label={c.name}
              className={`aspect-square rounded-xl flex items-center justify-center text-[8px] font-semibold leading-tight transition-all active:scale-90 ${
                isSelected ? 'ring-2 ring-terra-500 ring-offset-1 scale-105' : ''
              }`}
              style={{
                background: c.hex,
                border: needsBorder ? '1px solid #ddd' : undefined,
                color: isLight ? '#1C1917' : '#ffffff',
              }}
            >
              <span className="text-center px-0.5">{breakName(c.name)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )

  if (inline) return content

  // 바텀시트 모드
  return (
    <div className="fixed inset-0 bg-black/40 z-[300] flex items-end justify-center" onClick={onClose} role="dialog" aria-modal="true" aria-label="색상 선택">
      <div className="w-full max-w-[480px] bg-white rounded-t-3xl p-5 pb-8 animate-screen-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-warm-900">색상 선택</h3>
          <div className="flex gap-2">
            {selected && onClear && (
              <button onClick={onClear} className="text-xs text-warm-600 active:opacity-70 py-1">초기화</button>
            )}
            {onClose && (
              <button onClick={onClose} aria-label="닫기" className="w-9 h-9 rounded-full bg-warm-200 flex items-center justify-center active:scale-90">
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
