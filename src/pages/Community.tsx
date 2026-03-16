import { useEffect, useRef, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Plus, SlidersHorizontal } from 'lucide-react'
import FeedCard from '@/components/community/FeedCard'
import { useCommunity, type CommTab, type SortMode, type ContentFilter, type FriendsMode, type RankingMode } from '@/hooks/useCommunity'
import { STYLE_GUIDE } from '@/lib/styles'
import { useAuth } from '@/contexts/AuthContext'

export default function Community() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  const comm = useCommunity()
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // 초기 로드 + 탭/필터 변경 시 재로드
  useEffect(() => {
    comm.loadPosts(true)
  }, [comm.tab, comm.sort, comm.styleFilter, comm.friendsMode, comm.rankingMode])

  // 무한 스크롤
  const lastCardRef = useCallback((node: HTMLDivElement | null) => {
    if (comm.loading) return
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && comm.hasMore && !comm.loading) {
        comm.loadPosts(false)
      }
    })

    if (node) observerRef.current.observe(node)
  }, [comm.loading, comm.hasMore])

  // 탭 버튼
  const tabs: [CommTab, string][] = [['all', t('community.tabs.all')], ['friends', t('community.tabs.friends')], ['ranking', t('community.tabs.ranking')]]

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">

      {/* 3탭 */}
      <div className="flex gap-1.5 mb-3">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => comm.switchTab(key)}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
              comm.tab === key
                ? 'bg-warm-900 text-white shadow-md'
                : 'bg-white border border-warm-400 text-warm-700 active:scale-95'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 탭별 필터/컨텐츠 */}
      {comm.tab === 'all' && <AllTabFilters comm={comm} />}
      {comm.tab === 'friends' && <FriendsTabContent comm={comm} user={user} navigate={navigate} />}
      {comm.tab === 'ranking' && <RankingTabContent comm={comm} />}

      {/* 피드 그리드 */}
      {comm.posts.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5">
          {comm.posts.map((post, idx) => (
            <div key={post.id} ref={idx === comm.posts.length - 1 ? lastCardRef : undefined}>
              <FeedCard
                post={post}
                isLiked={comm.myLikes.has(post.id)}
                onLike={comm.toggleLike}
                showComments={comm.tab === 'friends'}
              />
            </div>
          ))}
        </div>
      ) : !comm.loading && (
        <EmptyState tab={comm.tab} friendsMode={comm.friendsMode} navigate={navigate} />
      )}

      {/* 로딩 */}
      {comm.loading && (
        <div className="grid grid-cols-2 gap-2.5 mt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-[14px] border border-warm-400 overflow-hidden">
              <div className="skeleton-pulse" style={{ aspectRatio: '4/5' }} />
              <div className="px-2.5 py-3 space-y-2">
                <div className="h-3 w-3/4 skeleton-pulse rounded" />
                <div className="h-2.5 w-1/2 skeleton-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 에러 */}
      {comm.error && !comm.loading && comm.posts.length === 0 && (
        <div className="text-center py-10">
          <div className="text-4xl mb-3">⚠️</div>
          <div className="text-sm text-warm-600 mb-3">{t('common.retry')}</div>
          <button
            onClick={() => comm.loadPosts(true)}
            className="px-5 py-2 bg-terra-500 text-white rounded-full text-xs font-semibold active:scale-95 transition-all"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* 끝 */}
      {!comm.hasMore && comm.posts.length > 0 && !comm.loading && (
        <div className="text-center py-3 text-warm-500 text-xs mt-2">{t('community.empty')}</div>
      )}

      {/* FAB — 글쓰기 */}
      {user && (
        <button
          onClick={() => navigate('/community/post')}
          aria-label={t('communityPost.title')}
          className="fixed right-[max(20px,calc((100vw-480px)/2+20px))] bottom-[calc(80px+env(safe-area-inset-bottom,0px))] z-[180] w-14 h-14 rounded-full bg-terra-500 text-white flex items-center justify-center shadow-terra active:scale-90 transition-transform"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}

// ─── 전체 탭 필터 ───
function AllTabFilters({ comm }: { comm: ReturnType<typeof useCommunity> }) {
  const { t } = useTranslation()
  const [showStyles, setShowStyles] = useState(false)
  const sorts: [SortMode, string][] = [['latest', t('community.sort.latest')], ['popular', t('community.sort.popular')]]
  const cFilters: [ContentFilter, string][] = [['photo', '📷 ' + t('community.content.photo')], ['mannequin', '👤 ' + t('community.content.mannequin')]]
  const styleChips: [string, string][] = [
    ['all', t('community.tabs.all')],
    ...Object.entries(STYLE_GUIDE).map(([k, v]) => [k, v.name.replace(/ 룩$/, '')] as [string, string])
  ]

  const activeStyleLabel = comm.styleFilter
    ? (STYLE_GUIDE[comm.styleFilter]?.name?.replace(/ 룩$/, '') || comm.styleFilter)
    : null

  return (
    <>
      {/* 1줄: 정렬 + 콘텐츠 필터 + 스타일 토글 */}
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto hide-scrollbar">
        {/* 정렬 */}
        {sorts.map(([key, label]) => (
          <button
            key={key}
            onClick={() => comm.setSort(key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
              comm.sort === key ? 'bg-warm-900 text-white' : 'bg-white border border-warm-400 text-warm-700 active:scale-95'
            }`}
          >
            {label}
          </button>
        ))}

        {/* 구분선 */}
        <div className="w-px h-4 bg-warm-400 flex-shrink-0" />

        {/* 콘텐츠 필터 */}
        {cFilters.map(([key, label]) => (
          <button
            key={key}
            onClick={() => comm.setContentFilter(comm.contentFilter === key ? 'all' : key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
              comm.contentFilter === key ? 'bg-terra-500 text-white' : 'bg-white border border-warm-400 text-warm-700 active:scale-95'
            }`}
          >
            {label}
          </button>
        ))}

        {/* 구분선 */}
        <div className="w-px h-4 bg-warm-400 flex-shrink-0" />

        {/* 스타일 필터 토글 */}
        <button
          onClick={() => setShowStyles(!showStyles)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all flex items-center gap-1 ${
            activeStyleLabel || showStyles
              ? 'bg-warm-800 text-white'
              : 'bg-white border border-warm-400 text-warm-700 active:scale-95'
          }`}
        >
          <SlidersHorizontal size={11} />
          {activeStyleLabel || t('recommend.styleTitle')}
        </button>
      </div>

      {/* 스타일 필터 확장 (토글 시) */}
      {showStyles && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 hide-scrollbar mb-3 animate-screen-fade">
          {styleChips.map(([key, label]) => {
            const active = (key === 'all' && !comm.styleFilter) || comm.styleFilter === key
            return (
              <button
                key={key}
                onClick={() => {
                  comm.setStyleFilter(key === 'all' ? null : key)
                  if (key !== 'all') setShowStyles(false)
                }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all whitespace-nowrap ${
                  active ? 'bg-warm-800 text-white' : 'bg-warm-100 border border-warm-300 text-warm-600 active:scale-95'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

// ─── 친구 탭 컨텐츠 ───
function FriendsTabContent({ comm, user, navigate }: { comm: ReturnType<typeof useCommunity>, user: any, navigate: any }) {
  const { t } = useTranslation()

  if (!user) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">👫</div>
        <div className="text-sm text-warm-600 mb-4">{t('common.loginRequired')}</div>
        <button
          onClick={() => navigate('/auth/login')}
          className="px-6 py-2.5 bg-terra-500 text-white rounded-full text-sm font-semibold active:scale-95 transition-all shadow-terra"
        >
          {t('auth.loginButton')}
        </button>
      </div>
    )
  }

  const modes: [FriendsMode, string][] = [['mutual', t('common.mutualFriend')], ['following', t('common.followingLabel')]]
  const followCount = comm.myFollows.size

  return (
    <>
      <div className="flex gap-1.5 mb-4">
        {modes.map(([key, label]) => (
          <button
            key={key}
            onClick={() => comm.setFriendsMode(key)}
            className={`px-4 py-2 rounded-full text-[11px] font-medium transition-all ${
              comm.friendsMode === key ? 'bg-terra-500 text-white' : 'bg-white border border-warm-400 text-warm-700 active:scale-95'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {followCount === 0 && (
        <div className="bg-gradient-to-b from-terra-50 to-warm-100 border border-terra-200 rounded-2xl p-6 text-center mb-4">
          <div className="text-3xl mb-3">🔍</div>
          <div className="text-sm font-bold text-warm-900 mb-1.5">{t('community.friendsTab.findUsers')}</div>
          <div className="text-xs text-warm-600 mb-4 leading-relaxed">
            {t('community.friendsTab.empty')}
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate('/community/discover')}
              className="px-6 py-2.5 bg-terra-500 text-white rounded-full text-sm font-semibold active:scale-95 transition-all shadow-terra"
            >
              {t('community.friendsTab.findUsers')}
            </button>
            <button
              onClick={() => { comm.setRankingMode('user'); comm.switchTab('ranking') }}
              className="px-6 py-2 bg-white text-warm-700 border border-warm-400 rounded-full text-xs font-medium active:scale-95 transition-all"
            >
              {t('community.ranking.users')}
            </button>
          </div>
        </div>
      )}

      {followCount > 0 && followCount <= 3 && (
        <div className="bg-terra-50 border border-terra-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <div className="text-2xl flex-shrink-0">💡</div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-warm-800 mb-0.5">{t('community.friendsTab.findUsers')}</div>
            <div className="text-[11px] text-warm-600">{t('community.friendsTab.empty')}</div>
          </div>
          <button
            onClick={() => navigate('/community/discover')}
            className="px-3 py-1.5 bg-terra-500 text-white rounded-full text-[11px] font-semibold active:scale-95 transition-all flex-shrink-0"
          >
            {t('common.search')}
          </button>
        </div>
      )}
    </>
  )
}

// ─── 랭킹 탭 ───
function RankingTabContent({ comm }: { comm: ReturnType<typeof useCommunity> }) {
  const { t } = useTranslation()
  const modes: [RankingMode, string][] = [['weekly', t('community.ranking.weekly')], ['monthly', t('community.ranking.monthly')], ['user', t('community.ranking.users')], ['event', t('community.ranking.events')]]

  return (
    <div className="flex gap-1.5 mb-4">
      {modes.map(([key, label]) => (
        <button
          key={key}
          onClick={() => comm.setRankingMode(key)}
          className={`px-3.5 py-2 rounded-full text-[11px] font-medium transition-all ${
            comm.rankingMode === key ? 'bg-terra-500 text-white' : 'bg-white border border-warm-400 text-warm-700 active:scale-95'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── 빈 상태 ───
function EmptyState({ tab, friendsMode, navigate }: { tab: CommTab, friendsMode: FriendsMode, navigate: any }) {
  const { t } = useTranslation()
  const msg = tab === 'friends'
    ? t('community.friendsTab.empty')
    : t('community.empty')
  const emoji = tab === 'friends' ? '👫' : '🎨'

  return (
    <div className="text-center py-10">
      <div className="text-4xl mb-2">{emoji}</div>
      <div className="text-sm text-warm-600">{msg}</div>
      {tab === 'friends' && (
        <button
          onClick={() => navigate('/community/discover')}
          className="mt-4 px-5 py-2 bg-terra-500 text-white rounded-full text-xs font-semibold active:scale-95 transition-all shadow-terra"
        >
          {t('community.friendsTab.findUsers')}
        </button>
      )}
    </div>
  )
}
