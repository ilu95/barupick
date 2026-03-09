import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { ModalProvider } from '@/components/ui/Modal'
import BottomNav from '@/components/layout/BottomNav'
import AppHeader from '@/components/layout/AppHeader'

// Pages
import Home from '@/pages/Home'
import Community from '@/pages/Community'
import CommunityDetail from '@/pages/CommunityDetail'
import CommunityPost from '@/pages/CommunityPost'
import RecommendCoord from '@/pages/RecommendCoord'
import BuildCoord from '@/pages/BuildCoord'
import Profile from '@/pages/Profile'
import Auth from '@/pages/Auth'
import Settings from '@/pages/Settings'
import OotdRecord from '@/pages/OotdRecord'
import Closet from '@/pages/Closet'
import ClosetAdd from '@/pages/ClosetAdd'
import OotdCalendar from '@/pages/OotdCalendar'
import OotdDetail from '@/pages/OotdDetail'
import BestCoord from '@/pages/BestCoord'
import UserDiscover from '@/pages/UserDiscover'
import UserProfile from '@/pages/UserProfile'
import FollowList from '@/pages/FollowList'
import BlockList from '@/pages/BlockList'
import Notifications from '@/pages/Notifications'
import { MyLevel, MyBadges, ColorRanking, ColorPattern, Challenges, TitleExam, MyPosts, Insights, SavedCoords } from '@/pages/ProfileSubPages'
import { Weather, Quiz, FabricGuide, BodyGuide, Shop, Terms, Privacy, EventDetail, PcSelect } from '@/pages/RemainingPages'

import Onboarding from '@/pages/Onboarding'
import ClosetCoord from '@/pages/ClosetCoord'
import EventSubmit from '@/pages/EventSubmit'
import PcLight from '@/pages/PcLight'
import PostInsight from '@/pages/PostInsight'
import DevDiag from '@/pages/DevDiag'
import { useAutoSync } from '@/hooks/useAutoSync'

// 자동 동기화 래퍼 (AuthProvider 내부에서 실행)
function AutoSyncProvider({ children }: { children: React.ReactNode }) {
  useAutoSync()
  return <>{children}</>
}

function PageLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-terra-300 border-t-terra-500 rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
        <ModalProvider>
        <AutoSyncProvider>
        <AppHeader />
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/home/build" element={<BuildCoord />} />
            <Route path="/home/build/improve" element={<BuildCoord />} />
            <Route path="/home/evaluate" element={<BuildCoord />} />
            <Route path="/home/recommend" element={<RecommendCoord />} />
            <Route path="/home/weather" element={<Weather />} />
            <Route path="/home/saved" element={<SavedCoords />} />
            <Route path="/home/quiz" element={<Quiz />} />
            <Route path="/home/fabric" element={<FabricGuide />} />
            <Route path="/home/body" element={<BodyGuide />} />

            <Route path="/closet" element={<Closet />} />
            <Route path="/closet/add" element={<ClosetAdd />} />
            <Route path="/closet/coord" element={<ClosetCoord />} />
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
            <Route path="/profile/color-ranking" element={<ColorRanking />} />
            <Route path="/profile/color-pattern" element={<ColorPattern />} />
            <Route path="/profile/challenges" element={<Challenges />} />
            <Route path="/profile/title-exam" element={<TitleExam />} />
            <Route path="/profile/block-list" element={<BlockList />} />
            <Route path="/profile/personal-color" element={<PcSelect />} />
            <Route path="/profile/personal-color/light" element={<PcLight />} />

            <Route path="/auth/login" element={<Auth />} />
            <Route path="/auth/signup" element={<Auth />} />

            <Route path="/notifications" element={<Notifications />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dev/diag" element={<DevDiag />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Suspense>
        <BottomNav />
        </AutoSyncProvider>
        </ModalProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
