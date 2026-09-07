// @ts-nocheck
import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import i18n from '@/i18n'
import { useSocialState, ensureLikes, toggleLike as storeToggleLike, friendIds, LIKE_EVENT, type LikeEventDetail } from '@/lib/socialStore'

export interface CommunityPost {
  id: string
  user_id: string
  title: string | null
  outfit: Record<string, string> | null
  score: number
  style: string | null
  layer_type: string
  caption: string | null
  photo_urls: string[] | null
  status: string
  tags: string[] | null
  visibility: string
  show_instagram: boolean
  hide_counts: boolean
  likes_count: number
  view_count: number
  save_count: number
  comments_count: number
  created_at: string
  profiles?: {
    nickname: string | null
    avatar_url: string | null
    instagram_id: string | null
  }
}

export type CommTab = 'all' | 'friends' | 'ranking'
export type SortMode = 'latest' | 'popular'
export type ContentFilter = 'all' | 'photo' | 'mannequin'
export type FriendsMode = 'mutual' | 'following'
export type RankingMode = 'weekly' | 'monthly' | 'user' | 'event'

const PAGE_SIZE = 20
const FEED_CACHE_KEY = 'bp_feed_cache' // 기본 탭(전체·최신) 첫 페이지. 오프라인/재시작 첫 화면용

function readFeedCache(): CommunityPost[] {
  try { const v = JSON.parse(localStorage.getItem(FEED_CACHE_KEY) || 'null'); return Array.isArray(v?.posts) ? v.posts : [] } catch { return [] }
}
function writeFeedCache(posts: CommunityPost[]) {
  try { localStorage.setItem(FEED_CACHE_KEY, JSON.stringify({ posts: posts.slice(0, PAGE_SIZE), ts: Date.now() })) } catch { /* 용량 초과 등은 무시 — 캐시일 뿐 */ }
}

// 모듈 레벨 캐시: 페이지 이동 후 돌아왔을 때 즉시 복원
let _cache: {
  posts: CommunityPost[]
  tab: CommTab
  sort: SortMode
  contentFilter: ContentFilter
  styleFilter: string | null
  friendsMode: FriendsMode
  rankingMode: RankingMode
  page: number
  hasMore: boolean
} | null = null

export function useCommunity() {
  const { user } = useAuth()

  const [tab, setTab] = useState<CommTab>(_cache?.tab || 'all')
  const [sort, setSort] = useState<SortMode>(_cache?.sort || 'latest')
  const [contentFilter, setContentFilter] = useState<ContentFilter>(_cache?.contentFilter || 'all')
  const [styleFilter, setStyleFilter] = useState<string | null>(_cache?.styleFilter ?? null)
  const [friendsMode, setFriendsMode] = useState<FriendsMode>(_cache?.friendsMode || 'mutual')
  const [rankingMode, setRankingMode] = useState<RankingMode>(_cache?.rankingMode || 'weekly')

  const [posts, setPosts] = useState<CommunityPost[]>(_cache?.posts || readFeedCache())
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(_cache?.hasMore ?? true)
  const [error, setError] = useState<string | null>(null)

  const social = useSocialState()
  const myLikes = social.likes
  const myFollows = social.follows
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set())

  const pageRef = useRef(_cache?.page || 0)
  const loadVerRef = useRef(0)
  const hasCacheRef = useRef(!!_cache)

  // 차단 목록 로드 (팔로우는 socialStore 가 관리)
  useEffect(() => {
    if (!user) return
    const loadBlocks = async () => {
      try {
        const { data } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id)
        setBlockedUsers(new Set((data || []).map(b => b.blocked_id)))
      } catch (e) { console.warn('Blocks load error:', e) }
    }
    loadBlocks()
  }, [user?.id])

  // 메인 로드 함수
  const loadPosts = useCallback(async (reset = false) => {
    loadVerRef.current += 1
    const myVer = loadVerRef.current

    if (reset) {
      setPosts([])
      pageRef.current = 0
      setHasMore(true)
      setError(null)
    }

    setLoading(true)

    try {
      if (tab === 'ranking') {
        // 랭킹은 별도 처리
        await loadRanking(myVer)
        return
      }

      const profileSelect = ', profiles!posts_user_id_fkey(nickname, avatar_url, instagram_id)'
      let query = supabase.from('posts').select('*' + profileSelect).eq('status', 'approved')

      if (tab === 'friends' && user) {
        const followIds = Array.from(myFollows)
        if (followIds.length === 0) {
          setPosts([])
          setHasMore(false)
          setLoading(false)
          return
        }
        if (friendsMode === 'mutual') {
          const friends = friendIds()
          if (friends.length === 0) {
            setPosts([])
            setHasMore(false)
            setLoading(false)
            return
          }
          query = query.in('user_id', friends)
        } else {
          query = query.in('user_id', followIds)
        }
        // 친구 탭: 전체 공개 + 친구 공개만 (비공개 제외)
        query = query.or('visibility.eq.public,visibility.eq.friends,visibility.is.null')
        query = query.order('created_at', { ascending: false })
      } else {
        // 전체 탭: 전체 공개만 (작성자 본인 포함 비공개/친구공개 제외)
        query = query.or('visibility.eq.public,visibility.is.null')
        if (styleFilter) query = query.eq('style', styleFilter)
        if (sort === 'popular') query = query.order('likes_count', { ascending: false })
        else query = query.order('created_at', { ascending: false })
      }

      const serverPage = reset ? 0 : pageRef.current
      query = query.range(serverPage * PAGE_SIZE, (serverPage + 1) * PAGE_SIZE - 1)

      const { data, error: queryError } = await query
      if (queryError) throw queryError
      if (myVer !== loadVerRef.current) return

      const newPosts = (data || []) as CommunityPost[]

      if (reset) {
        setPosts(newPosts)
        if (tab === 'all' && sort === 'latest' && !styleFilter) writeFeedCache(newPosts)
      } else {
        setPosts(prev => [...prev, ...newPosts])
      }
      setHasMore(newPosts.length === PAGE_SIZE)
      pageRef.current = serverPage + 1

      // 내 좋아요 로드 (모르는 것만 서버에 묻는다)
      if (user && newPosts.length > 0) ensureLikes(newPosts.map(p => p.id))
    } catch (e: any) {
      console.error('Community load error:', e)
      if (myVer !== loadVerRef.current) return
      setError(e.message || i18n.t('common.loadError'))
      // 오프라인/실패: 기본 탭이면 마지막으로 본 피드라도 보여준다
      if (reset && tab === 'all' && sort === 'latest' && !styleFilter) {
        const cached = readFeedCache()
        if (cached.length > 0) { setPosts(cached); setHasMore(false) }
      }
    } finally {
      if (myVer === loadVerRef.current) setLoading(false)
    }
  }, [tab, sort, styleFilter, friendsMode, user, myFollows])

  // 랭킹 로드 (별도)
  const loadRanking = async (myVer: number) => {
    try {
      if (rankingMode === 'user') {
        const { data, error: err } = await supabase.rpc('get_user_like_rankings', { lim: 20 })
        if (err) throw err
        if (myVer !== loadVerRef.current) return
        // 유저 랭킹은 별도 상태로 관리해도 됨, 일단 posts 형태로 변환
        setPosts([])
        setHasMore(false)
      } else {
        // 주간/월간: 최근 N일 기준 인기순
        const days = rankingMode === 'weekly' ? 7 : 30
        const since = new Date(Date.now() - days * 86400000).toISOString()
        const profileSelect = ', profiles!posts_user_id_fkey(nickname, avatar_url, instagram_id)'
        const { data, error: err } = await supabase.from('posts')
          .select('*' + profileSelect)
          .eq('status', 'approved')
          .or('visibility.eq.public,visibility.is.null')
          .gte('created_at', since)
          .order('likes_count', { ascending: false })
          .limit(30)
        if (err) throw err
        if (myVer !== loadVerRef.current) return
        setPosts((data || []) as CommunityPost[])
        setHasMore(false)
      }
    } catch (e: any) {
      console.error('Ranking load error:', e)
      setError(e.message || i18n.t('common.rankingLoadError'))
    } finally {
      if (myVer === loadVerRef.current) setLoading(false)
    }
  }

  // 좋아요 수는 socialStore 이벤트로 맞춘다 (상세 화면에서 눌러도 목록이 같이 움직인다)
  useEffect(() => {
    const h = (e: Event) => {
      const { postId, delta } = (e as CustomEvent<LikeEventDetail>).detail
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) + delta) } : p))
    }
    window.addEventListener(LIKE_EVENT, h)
    return () => window.removeEventListener(LIKE_EVENT, h)
  }, [])

  // 좋아요 토글 — 결과를 돌려주므로 화면이 실패를 알릴 수 있다
  const toggleLike = useCallback((postId: string) => {
    const owner = posts.find(p => p.id === postId)?.user_id
    return storeToggleLike(postId, owner)
  }, [posts])

  // 필터링된 posts (차단 유저 + 콘텐츠 필터)
  const filteredPosts = posts.filter(p => {
    if (blockedUsers.has(p.user_id)) return false
    if (contentFilter === 'photo') return p.photo_urls && p.photo_urls.length > 0
    if (contentFilter === 'mannequin') return !p.photo_urls || p.photo_urls.length === 0
    return true
  })

  // 탭 전환
  const switchTab = useCallback((newTab: CommTab) => {
    setTab(newTab)
    setPosts([])
    pageRef.current = 0
    setHasMore(true)
  }, [])

  // 캐시 저장 (언마운트 시)
  useEffect(() => {
    return () => {
      _cache = { posts, tab, sort, contentFilter, styleFilter, friendsMode, rankingMode, page: pageRef.current, hasMore }
    }
  })

  // 캐시에서 복원된 경우 초기 로드 건너뜀 여부
  const hadCache = hasCacheRef.current
  useEffect(() => {
    hasCacheRef.current = false
  }, [])

  return {
    // 상태
    tab, sort, contentFilter, styleFilter, friendsMode, rankingMode,
    posts: filteredPosts,
    loading, hasMore, error,
    myLikes, myFollows,
    hadCache,

    // 액션
    loadPosts,
    switchTab,
    setSort: (s: SortMode) => { setSort(s) },
    setContentFilter: (f: ContentFilter) => { setContentFilter(f) },
    setStyleFilter: (s: string | null) => { setStyleFilter(s) },
    setFriendsMode: (m: FriendsMode) => { setFriendsMode(m) },
    setRankingMode: (m: RankingMode) => { setRankingMode(m) },
    toggleLike,
  }
}
