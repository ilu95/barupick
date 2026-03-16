import { useLocation } from 'react-router-dom'
import { Construction } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Placeholder({ name }: { name?: string }) {
  const location = useLocation()
  const { t } = useTranslation()
  const displayName = name || location.pathname

  return (
    <div className="animate-screen-fade px-5 pt-6 pb-10">
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-full bg-warm-300 flex items-center justify-center mb-4">
          <Construction size={28} className="text-warm-600" />
        </div>
        <h2 className="font-display text-lg font-bold text-warm-900 mb-2">{displayName}</h2>
        <p className="text-sm text-warm-600 text-center">{t('placeholder.comingSoon')}</p>
      </div>
    </div>
  )
}
