import { WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useOnline } from '@/lib/appLifecycle'

/**
 * 오프라인 배너 — 헤더 바로 아래. 연결이 끊기면 나타나고, 돌아오면 사라진다.
 * 요청 실패를 화면마다 따로 설명하지 않아도 "지금 오프라인이라서"임을 한 곳에서 알려준다.
 */
export default function OfflineBanner() {
  const online = useOnline()
  const { t } = useTranslation()
  if (online) return null
  return (
    <div role="status" className="sticky top-[calc(57px+env(safe-area-inset-top,0px))] z-[90] mx-5 mt-1 mb-2 flex items-center gap-2 rounded-xl bg-warm-800 text-warm-100 dark:bg-warm-200 dark:text-warm-900 px-3.5 py-2 text-xs shadow-warm">
      <WifiOff size={14} className="flex-shrink-0" />
      <span>{t('common.offline')}</span>
    </div>
  )
}
