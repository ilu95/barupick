import { useTranslation } from 'react-i18next'
import { trackEvent } from '@/lib/analytics'

/** 캐릭터 남/여 세그먼트. 어느 화면에서든 같은 자리에 붙일 수 있게 작게(28px). */
export default function SexToggle({ sex, onChange, screen }: { sex: 'm' | 'w'; onChange: (s: 'm' | 'w') => void; screen: string }) {
  const { t } = useTranslation()
  const pick = (x: 'm' | 'w') => {
    if (x === sex) return
    onChange(x)
    trackEvent('char_sex', { to: x, screen })
  }
  return (
    <div className="flex bg-warm-200 dark:bg-warm-700 rounded-full p-0.5 h-7">
      {(['m', 'w'] as const).map(x => (
        <button key={x} onClick={() => pick(x)} className={`px-2.5 rounded-full text-[11px] font-bold ${sex === x ? 'bg-warm-900 text-white' : 'text-warm-600'}`}>
          {x === 'm' ? t('builder.male') : t('builder.female')}
        </button>
      ))}
    </div>
  )
}
