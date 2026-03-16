import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, Home, User, Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'

// 정확한 경로 매핑 (우선) — i18n key
const TITLE_KEYS: Record<string, string> = {
  '/home': 'header.home',
  '/closet': 'header.closet',
  '/record': 'header.record',
  '/community': 'header.community',
  '/shop': 'header.shop',
  '/profile': 'header.profile',
  '/profile/settings': 'header.settings',
  '/profile/level': 'header.myLevel',
  '/profile/badges': 'header.myBadges',
  '/profile/personal-color': 'header.personalColor',
  '/profile/personal-color/light': 'header.personalColorLight',
  '/profile/posts': 'header.myPosts',
  '/profile/insights': 'header.insights',
  '/profile/color-ranking': 'header.colorRanking',
  '/profile/color-pattern': 'header.colorPattern',
  '/profile/challenges': 'header.challenges',
  '/profile/title-exam': 'header.titleExam',
  '/profile/block-list': 'header.blockList',
  '/auth/login': 'auth.loginTitle',
  '/auth/signup': 'auth.signupTitle',
  '/home/build': 'header.build',
  '/home/recommend': 'header.recommend',
  '/home/weather': 'header.weather',
  '/home/saved': 'header.saved',
  '/home/quiz': 'header.quiz',
  '/home/fabric': 'header.fabricGuide',
  '/home/body': 'header.bodyGuide',
  '/notifications': 'header.notifications',
  '/terms': 'header.terms',
  '/privacy': 'header.privacy',
  '/closet/add': 'header.closetAdd',
  '/closet/coord': 'header.closetCoord',
  '/closet/calendar': 'header.calendar',
  '/closet/best': 'header.closetBest',
  '/community/post': 'header.communityPost',
  '/community/discover': 'header.userDiscover',
}

// 동적 라우트 (startsWith 매칭, 길이 내림차순으로 우선순위)
const PREFIX_TITLE_KEYS: [string, string][] = [
  ['/profile/insights/', 'header.insights'],
  ['/community/event/', 'header.eventDetail'],
  ['/community/', 'communityDetail.like'],
  ['/closet/ootd/', 'header.record'],
  ['/user/', 'header.profile'],
]

// 헤더 숨김 화면
const HIDDEN_ROUTES = ['/onboarding', '/pc-light']

// 뒤로가기 시 홈으로 보낼 최상위 탭 경로
const ROOT_PATHS = ['/', '/home', '/closet', '/record', '/community', '/shop', '/profile']

function resolveTitleKey(pathname: string): string {
  // 1. 정확한 매핑
  if (TITLE_KEYS[pathname]) return TITLE_KEYS[pathname]
  // 2. prefix 매칭
  for (const [prefix, key] of PREFIX_TITLE_KEYS) {
    if (pathname.startsWith(prefix)) return key
  }
  return 'header.home'
}

export default function AppHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const { t } = useTranslation()

  if (HIDDEN_ROUTES.some(r => location.pathname.startsWith(r))) return null

  const pathname = location.pathname
  const isHome = pathname === '/home' || pathname === '/'
  const title = t(resolveTitleKey(pathname))

  // 최상위 탭이 아니면 항상 뒤로가기 표시
  const isRootTab = ROOT_PATHS.includes(pathname)
  const showBack = !isRootTab

  const handleBack = () => {
    // history에 이전 페이지가 있으면 뒤로, 없으면 홈으로
    if (window.history.state?.idx > 0) {
      navigate(-1)
    } else {
      navigate('/home', { replace: true })
    }
  }

  return (
    <header
      className="sticky top-0 z-[100] bg-warm-200/88 dark:bg-[#1C1917]/90 backdrop-blur-[20px] flex items-center gap-3"
      style={{
        padding: '12px 20px',
        paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
      }}
    >
      {/* 뒤로가기 */}
      {showBack && (
        <button
          onClick={handleBack}
          aria-label={t('common.back')}
          className="w-9 h-9 rounded-full bg-white/80 dark:bg-warm-800/80 flex items-center justify-center shadow-warm-sm active:scale-90 transition-transform"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
      )}

      {/* 제목 */}
      <span className="flex-1 font-display text-[17px] font-bold text-warm-900 tracking-tight truncate">
        {title}
      </span>

      {/* 알림 */}
      <button
        onClick={() => navigate('/notifications')}
        aria-label={t('header.notifications')}
        className="w-9 h-9 rounded-full bg-white/80 dark:bg-warm-800/80 flex items-center justify-center shadow-warm-sm active:scale-90 transition-transform relative"
      >
        <Bell size={17} strokeWidth={2} />
      </button>

      {/* 프로필 */}
      <button
        onClick={() => navigate('/profile')}
        aria-label={t('header.profile')}
        className="w-9 h-9 rounded-full bg-terra-100 flex items-center justify-center shadow-warm-sm active:scale-90 transition-transform overflow-hidden flex-shrink-0"
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} className="w-9 h-9 rounded-full object-cover" alt={t('header.profile')} />
        ) : (
          <User size={18} strokeWidth={2} className="text-terra-600" />
        )}
      </button>
    </header>
  )
}
