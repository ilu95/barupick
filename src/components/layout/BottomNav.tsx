import { useLocation, useNavigate } from 'react-router-dom'
import { Shirt, Archive, Plus, Users, ShoppingBag } from 'lucide-react'

const TABS = [
  { path: '/home', label: '코디', icon: Shirt },
  { path: '/closet', label: '옷장', icon: Archive },
  { path: '/record', label: '기록', icon: Plus, center: true },
  { path: '/community', label: '커뮤', icon: Users },
  { path: '/shop', label: '샵', icon: ShoppingBag },
]

// 네비 숨김 화면
// - 시스템: 온보딩, 인증, 퍼스널컬러 진단
// - 작업 집중: 코디 만들기/추천, OOTD 기록, 글쓰기, 옷장 코디
const HIDDEN_ROUTES = [
  '/onboarding',
  '/auth',
  '/pc-light',
  '/home/build',
  '/home/recommend',
  '/record',
  '/community/post',
  '/closet/coord',
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  // 숨김 판별
  const shouldHide = HIDDEN_ROUTES.some(r => location.pathname.startsWith(r))
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
      aria-label="메인 내비게이션"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 'calc(68px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {TABS.map(tab => {
        const isActive = activeTab === tab.path
        const Icon = tab.icon

        if (tab.center) {
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-col items-center justify-center flex-1 h-full gap-[3px] relative"
            >
              <div className="w-[46px] h-[46px] rounded-full bg-terra-500 flex items-center justify-center -mt-5 shadow-terra transition-transform active:scale-[0.92]">
                <Icon size={24} color="#fff" strokeWidth={2} />
              </div>
              <span className="text-[10px] font-semibold text-terra-500 mt-[2px]">{tab.label}</span>
            </button>
          )
        }

        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            aria-label={tab.label}
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
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
