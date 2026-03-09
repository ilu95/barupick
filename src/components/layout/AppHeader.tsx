import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, Home, User, Bell } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

// 정확한 경로 매핑 (우선)
const TITLES: Record<string, string> = {
  '/home': '바루픽',
  '/closet': '옷장',
  '/record': 'OOTD 기록',
  '/community': '커뮤니티',
  '/shop': '샵',
  '/profile': '마이',
  '/profile/settings': '설정',
  '/profile/level': '내 레벨',
  '/profile/badges': '배지 컬렉션',
  '/profile/personal-color': '퍼스널컬러',
  '/profile/personal-color/light': '퍼스널컬러 진단',
  '/profile/posts': '내 게시물',
  '/profile/insights': '인사이트',
  '/profile/color-ranking': '컬러 랭킹',
  '/profile/color-pattern': '색상 패턴',
  '/profile/challenges': '주간 챌린지',
  '/profile/title-exam': '칭호 시험',
  '/profile/block-list': '차단 목록',
  '/auth/login': '로그인',
  '/auth/signup': '회원가입',
  '/home/build': '코디 만들기',
  '/home/recommend': '코디 추천받기',
  '/home/weather': '오늘 뭐 입지?',
  '/home/saved': '저장한 코디',
  '/home/quiz': '스타일 퀴즈',
  '/home/fabric': '소재 가이드',
  '/home/body': '체형별 코디 가이드',
  '/notifications': '알림',
  '/terms': '이용약관',
  '/privacy': '개인정보처리방침',
  '/closet/add': '아이템 등록',
  '/closet/coord': '내 옷 코디',
  '/closet/calendar': '코디 캘린더',
  '/closet/best': '베스트 코디',
  '/community/post': '코디 공유',
  '/community/discover': '유저 탐색',
}

// 동적 라우트 (startsWith 매칭, 길이 내림차순으로 우선순위)
const PREFIX_TITLES: [string, string][] = [
  ['/profile/insights/', '인사이트'],
  ['/community/event/', '이벤트'],
  ['/community/', '코디 상세'],
  ['/closet/ootd/', 'OOTD 상세'],
  ['/user/', '프로필'],
]

// 헤더 숨김 화면
const HIDDEN_ROUTES = ['/onboarding', '/pc-light']

// 뒤로가기 시 홈으로 보낼 최상위 탭 경로
const ROOT_PATHS = ['/', '/home', '/closet', '/record', '/community', '/shop', '/profile']

function resolveTitle(pathname: string): string {
  // 1. 정확한 매핑
  if (TITLES[pathname]) return TITLES[pathname]
  // 2. prefix 매칭
  for (const [prefix, title] of PREFIX_TITLES) {
    if (pathname.startsWith(prefix)) return title
  }
  return '바루픽'
}

export default function AppHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()

  if (HIDDEN_ROUTES.some(r => location.pathname.startsWith(r))) return null

  const pathname = location.pathname
  const isHome = pathname === '/home' || pathname === '/'
  const title = resolveTitle(pathname)

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
          aria-label="뒤로가기"
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
        aria-label="알림"
        className="w-9 h-9 rounded-full bg-white/80 dark:bg-warm-800/80 flex items-center justify-center shadow-warm-sm active:scale-90 transition-transform relative"
      >
        <Bell size={17} strokeWidth={2} />
      </button>

      {/* 프로필 */}
      <button
        onClick={() => navigate('/profile')}
        aria-label="프로필"
        className="w-9 h-9 rounded-full bg-terra-100 flex items-center justify-center shadow-warm-sm active:scale-90 transition-transform overflow-hidden flex-shrink-0"
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="프로필" />
        ) : (
          <User size={18} strokeWidth={2} className="text-terra-600" />
        )}
      </button>
    </header>
  )
}
