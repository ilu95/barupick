import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView, setAnalyticsUser } from '@/lib/analytics'
import { useAuth } from '@/contexts/AuthContext'

export function useAnalytics() {
  const location = useLocation()
  const { user } = useAuth()

  // 유저 ID 연동
  useEffect(() => {
    setAnalyticsUser(user?.id || null)
  }, [user])

  // 라우트 변경 시 페이지뷰 자동 기록
  useEffect(() => {
    trackPageView(location.pathname)
  }, [location.pathname])
}
