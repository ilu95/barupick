import { scheduleReminder, initReminderTap } from '@/lib/reminder'
import { useWeather } from '@/hooks/useWeather'
import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { ModalProvider } from '@/components/ui/Modal'
import BottomNav from '@/components/layout/BottomNav'
import AppHeader from '@/components/layout/AppHeader'
import OfflineBanner from '@/components/ui/OfflineBanner'
import StorageFullToaster from '@/components/ui/StorageFullToaster'
import { useAnalytics } from '@/hooks/useAnalytics'

// Pages — 탭 루트·온보딩·로그인은 즉시, 나머지는 첫 진입 때 로드 (초기 번들 축소)
import Home from '@/pages/Home'
import Community from '@/pages/Community'
const CommunityDetail = lazy(() => import('@/pages/CommunityDetail'))
const CommunityPost = lazy(() => import('@/pages/CommunityPost'))
import RecommendCoord from '@/pages/RecommendCoord'
import BuildCoord from '@/pages/BuildCoord'
import Profile from '@/pages/Profile'
import Auth from '@/pages/Auth'
import AuthCallback from '@/pages/AuthCallback'
const Settings = lazy(() => import('@/pages/Settings'))
const LanguageSettings = lazy(() => import('@/pages/LanguageSettings'))
import OotdRecord from '@/pages/OotdRecord'
import Closet from '@/pages/Closet'
const ClosetAdd = lazy(() => import('@/pages/ClosetAdd'))
const OotdCalendar = lazy(() => import('@/pages/OotdCalendar'))
const OotdDetail = lazy(() => import('@/pages/OotdDetail'))
const BestCoord = lazy(() => import('@/pages/BestCoord'))
const UserDiscover = lazy(() => import('@/pages/UserDiscover'))
const UserProfile = lazy(() => import('@/pages/UserProfile'))
const FollowList = lazy(() => import('@/pages/FollowList'))
const BlockList = lazy(() => import('@/pages/BlockList'))
const Notifications = lazy(() => import('@/pages/Notifications'))
const MyLevel = lazy(() => import('@/pages/ProfileSubPages').then(m => ({ default: m.MyLevel })))
const MyBadges = lazy(() => import('@/pages/ProfileSubPages').then(m => ({ default: m.MyBadges })))
const ColorRanking = lazy(() => import('@/pages/ProfileSubPages').then(m => ({ default: m.ColorRanking })))
const ColorPattern = lazy(() => import('@/pages/ProfileSubPages').then(m => ({ default: m.ColorPattern })))
const Challenges = lazy(() => import('@/pages/ProfileSubPages').then(m => ({ default: m.Challenges })))
const TitleExam = lazy(() => import('@/pages/ProfileSubPages').then(m => ({ default: m.TitleExam })))
const MyPosts = lazy(() => import('@/pages/ProfileSubPages').then(m => ({ default: m.MyPosts })))
const Insights = lazy(() => import('@/pages/ProfileSubPages').then(m => ({ default: m.Insights })))
const SavedCoords = lazy(() => import('@/pages/ProfileSubPages').then(m => ({ default: m.SavedCoords })))
const Weather = lazy(() => import('@/pages/RemainingPages').then(m => ({ default: m.Weather })))
const Quiz = lazy(() => import('@/pages/RemainingPages').then(m => ({ default: m.Quiz })))
const FabricGuide = lazy(() => import('@/pages/RemainingPages').then(m => ({ default: m.FabricGuide })))
const BodyGuide = lazy(() => import('@/pages/RemainingPages').then(m => ({ default: m.BodyGuide })))
const Shop = lazy(() => import('@/pages/RemainingPages').then(m => ({ default: m.Shop })))
const Terms = lazy(() => import('@/pages/RemainingPages').then(m => ({ default: m.Terms })))
const Privacy = lazy(() => import('@/pages/RemainingPages').then(m => ({ default: m.Privacy })))
const Support = lazy(() => import('@/pages/RemainingPages').then(m => ({ default: m.Support })))
const EventDetail = lazy(() => import('@/pages/RemainingPages').then(m => ({ default: m.EventDetail })))
const PcSelect = lazy(() => import('@/pages/RemainingPages').then(m => ({ default: m.PcSelect })))

import Onboarding from '@/pages/Onboarding'
const TasteQuiz = lazy(() => import('@/pages/TasteQuiz'))
const VotePage = lazy(() => import('@/pages/Vote'))
const TasteComparePage = lazy(() => import('@/pages/TasteCompare'))
const ClosetCoord = lazy(() => import('@/pages/ClosetCoord'))
const PurchaseSimulate = lazy(() => import('@/pages/PurchaseSimulate'))
const WardrobeReport = lazy(() => import('@/pages/WardrobeReport'))
const AllCombos = lazy(() => import('@/pages/AllCombos'))
const EventSubmit = lazy(() => import('@/pages/EventSubmit'))
const PcLight = lazy(() => import('@/pages/PcLight'))
const PostInsight = lazy(() => import('@/pages/PostInsight'))
const DevDiag = lazy(() => import('@/pages/DevDiag'))
import { useAutoSync } from '@/hooks/useAutoSync'
import { useBindSocialUser } from '@/lib/socialStore'
import { bindPostQueueUser } from '@/lib/postQueue'
import { useBindNotifUser } from '@/lib/notifStore'
import { useAuth } from '@/contexts/AuthContext'


// Capacitor 네이티브 앱에서만 상단 패딩 제거
if ((window as any).Capacitor?.isNativePlatform?.()) {
  document.body.style.paddingTop = '0px'
}

// 자동 동기화 래퍼 (AuthProvider 내부에서 실행)
function AutoSyncProvider({ children }: { children: React.ReactNode }) {
  useAutoSync()
  const { user } = useAuth()
  useBindSocialUser(user?.id ?? null)
  useEffect(() => { bindPostQueueUser(user?.id ?? null) }, [user?.id])
  useBindNotifUser(user?.id ?? null)
  return <>{children}</>
}

function PageLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-terra-300 border-t-terra-500 rounded-full animate-spin" />
    </div>
  )
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  if (!profile?.bio?.includes('개발자')) return <Navigate to="/home" replace />
  return <>{children}</>
}

// 저녁 날씨 알림: 날씨가 갱신될 때 오늘 20시 알림을 다시 잡고, 알림을 누르면 만들기로 (루프 L5)
function ReminderBridge() {
  const navigate = useNavigate()
  const { weather } = useWeather({ auto: false })
  useEffect(() => { initReminderTap(navigate) }, [])
  useEffect(() => { scheduleReminder(weather) }, [weather?.tomorrow?.feels, weather?.tomorrow?.rain])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ReminderBridge />
      <AuthProvider>
        <ToastProvider>
          <ModalProvider>
            <AutoSyncProvider>
              <AppHeader />
              <OfflineBanner />
              <StorageFullToaster />
              <Suspense fallback={<PageLoading />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/home" replace />} />
                  <Route path="/home" element={<Home />} />
                  <Route path="/home/build" element={<BuildCoord />} />
                  <Route path="/home/taste" element={<TasteQuiz />} />
                  <Route path="/v/:code" element={<VotePage />} />
                  <Route path="/t/:code" element={<TasteComparePage />} />
                  <Route path="/home/build/improve" element={<BuildCoord />} />
                  <Route path="/home/evaluate" element={<BuildCoord />} />
                  <Route path="/home/recommend" element={<RecommendCoord />} />
                  <Route path="/home/today" element={<Navigate to="/closet/combos" replace />} />
                  <Route path="/home/weather" element={<Weather />} />
                  <Route path="/home/saved" element={<SavedCoords />} />
                  <Route path="/home/quiz" element={<Quiz />} />
                  <Route path="/home/fabric" element={<FabricGuide />} />
                  <Route path="/home/body" element={<BodyGuide />} />

                  <Route path="/closet" element={<Closet />} />
                  <Route path="/closet/add" element={<ClosetAdd />} />
                  <Route path="/closet/coord" element={<ClosetCoord />} />
                  <Route path="/closet/combos" element={<AllCombos />} />
                  <Route path="/closet/simulate" element={<PurchaseSimulate />} />
                  <Route path="/closet/report" element={<WardrobeReport />} />
                  <Route path="/closet/calendar" element={<OotdCalendar />} />
                  <Route path="/closet/ootd/:date" element={<OotdDetail />} />
                  <Route path="/closet/best" element={<BestCoord />} />
                  <Route path="/record" element={<OotdRecord />} />

                  <Route path="/community" element={<Community />} />
                  <Route path="/community/post" element={<CommunityPost />} />
                  <Route path="/community/discover" element={<UserDiscover />} />
                  <Route path="/community/event/:eventId" element={<EventDetail />} />
                  <Route path="/community/event/:eventId/submit" element={<EventSubmit />} />
                  <Route path="/community/:postId" element={<CommunityDetail />} />
                  <Route path="/user/:userId" element={<UserProfile />} />
                  <Route path="/user/:userId/followers" element={<FollowList />} />
                  <Route path="/user/:userId/following" element={<FollowList />} />

                  <Route path="/shop" element={<Shop />} />

                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/level" element={<MyLevel />} />
                  <Route path="/profile/badges" element={<MyBadges />} />
                  <Route path="/profile/posts" element={<MyPosts />} />
                  <Route path="/profile/insights" element={<Insights />} />
                  <Route path="/profile/insights/:postId" element={<PostInsight />} />
                  <Route path="/profile/settings" element={<Settings />} />
                  <Route path="/profile/settings/language" element={<LanguageSettings />} />
                  <Route path="/profile/color-ranking" element={<ColorRanking />} />
                  <Route path="/profile/color-pattern" element={<ColorPattern />} />
                  <Route path="/profile/challenges" element={<Challenges />} />
                  <Route path="/profile/title-exam" element={<TitleExam />} />
                  <Route path="/profile/block-list" element={<BlockList />} />
                  <Route path="/profile/personal-color" element={<PcSelect />} />
                  <Route path="/profile/personal-color/light" element={<PcLight />} />

                  <Route path="/auth" element={<Navigate to="/auth/login" replace />} />
                  <Route path="/auth/login" element={<Auth />} />
                  <Route path="/auth/signup" element={<Auth />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />

                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/dev/diag" element={<AdminOnly><DevDiag /></AdminOnly>} />
                  <Route path="*" element={<Navigate to="/home" replace />} />
                </Routes>
              </Suspense>
              <BottomNav />
              <AnalyticsTracker />
              <Analytics />
              <SpeedInsights />
            </AutoSyncProvider>
          </ModalProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

// 페이지뷰 자동 기록
function AnalyticsTracker() {
  useAnalytics()
  return null
}
