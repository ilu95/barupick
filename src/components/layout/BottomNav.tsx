import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Shirt, Archive, Plus, Users, ShoppingBag } from 'lucide-react'

const TAB_KEYS = [
  { path: '/home', labelKey: 'nav.coord', icon: Shirt },
  { path: '/closet', labelKey: 'nav.closet', icon: Archive },
  { path: '/record', labelKey: 'nav.record', icon: Plus, center: true },
  { path: '/community', labelKey: 'nav.community', icon: Users },
]

// 네비 숨김 화면
// - 시스템: 온보딩, 인증, 퍼스널컬러 진단
// - 작업 집중: 코디 만들기/추천, OOTD 기록, 글쓰기, 옷장 코디
const HIDDEN_ROUTES = [
  '/v/',           // 웹 투표 (앱 없이 여는 페이지)
  '/t/',           // 취향 친구 비교 (앱 없이 여는 페이지)
  '/onboarding',
  '/auth',
  '/pc-light',
  '/home/build',
  '/record',        // 기록 (만들기 화면과 고정 발 버튼을 같이 씀)
  '/home/recommend',
  '/community/post',
  '/closet/coord',
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()

  // 작업 중 숨김: 직접 만드는 모드는 /home 이 곧 만들기라, 1단계 밖(색 고르기·결과·후보)에선 만들기 화면이 알려 준다
  const [busy, setBusy] = useState(false)
  useEffect(() => { const h = (e: Event) => setBusy(!!(e as CustomEvent).detail); window.addEventListener('bp:workflow', h); return () => window.removeEventListener('bp:workflow', h) }, [])
  useEffect(() => { setBusy(false) }, [location.pathname])
  // 숨김 판별
  const shouldHide = busy || HIDDEN_ROUTES.some(r => location.pathname.startsWith(r))
  if (shouldHide) return null

  // 활성 탭 판별
  const getActiveTab = () => {
    const p = location.pathname
    if (p.startsWith('/home') || p === '/') return '/home'
    if (p.startsWith('/closet')) return '/closet'
    if (p.startsWith('/record')) return '/record'
    if (p.startsWith('/community')) return '/community'
    if (p.startsWith('/shop')) return '/shop'
    return ''
  }

  const activeTab = getActiveTab()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white/92 dark:bg-[#1C1917]/95 backdrop-blur-[20px] border-t border-warm-400/60 dark:border-[#44403C]/60 flex items-center justify-around z-[200] px-1"
      aria-label={t('nav.coord')}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 'calc(68px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {TAB_KEYS.map(tab => {
        const isActive = activeTab === tab.path
        const Icon = tab.icon
        const label = t(tab.labelKey)

        if (tab.center) {
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-col items-center justify-center flex-1 h-full gap-[3px] relative"
            >
              <div className="w-[46px] h-[46px] rounded-full bg-terra-500 flex items-center justify-center -mt-5 shadow-terra transition-transform active:scale-[0.92]">
                <Icon size={24} color="#fff" strokeWidth={2} />
              </div>
              <span className="text-[10px] font-semibold text-terra-500 mt-[2px]">{label}</span>
            </button>
          )
        }

        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-[3px] transition-all ${
              isActive ? 'text-terra-500' : 'text-warm-600'
            }`}
          >
            <Icon
              size={22}
              strokeWidth={isActive ? 2.2 : 1.8}
              className={`transition-transform ${isActive ? 'scale-[1.08]' : ''}`}
            />
            <span className={`text-[10px] ${isActive ? 'font-bold text-terra-500' : 'font-medium'}`}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
