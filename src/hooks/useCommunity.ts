// @ts-nocheck
import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

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

export function useCommunity() {
  const { user } = useAuth()

  const [tab, setTab] = useState<CommTab>('all')
  const [sort, setSort] = useState<SortMode>('latest')
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all')
  const [styleFilter, setStyleFilter] = useState<string | null>(null)
  const [friendsMode, setFriendsMode] = useState<FriendsMode>('mutual')
  const [rankingMode, setRankingMode] = useState<RankingMode>('weekly')

  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [myLikes, setMyLikes] = useState<Set<string>>(new Set())
  const [myFollows, setMyFollows] = useState<Set<string>>(new Set())
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set())

  const pageRef = useRef(0)
  const loadVerRef = useRef(0)

  // 팔로우 목록 로드
  useEffect(() => {
    if (!user) return
    const loadFollows = async () => {
      try {
        const { data } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
        setMyFollows(new Set((data || []).map(f => f.following_id)))
      } catch (e) { console.warn('Follows load error:', e) }
    }
    const loadBlocks = async () => {
      try {
        const { data } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id)
        setBlockedUsers(new Set((data || []).map(b => b.blocked_id)))
      } catch (e) { console.warn('Blocks load error:', e) }
    }
    loadFollows()
    loadBlocks()
  }, [user])

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
          const friends = JSON.parse(localStorage.getItem('sp_friends') || '[]')
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
        query = query.order('created_at', { ascending: false })
      } else {
        // 전체 탭
        if (user) {
          query = query.or(`visibility.eq.public,visibility.is.null,user_id.eq.${user.id}`)
        } else {
          query = query.or('visibility.eq.public,visibility.is.null')
        }
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
      } else {
        setPosts(prev => [...prev, ...newPosts])
      }
      setHasMore(newPosts.length === PAGE_SIZE)
      pageRef.current = serverPage + 1

      // 내 좋아요 로드
      if (user && newPosts.length > 0) {
        try {
          const pids = newPosts.map(p => p.id)
          const { data: likes } = await supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', pids)
          if (likes) {
            setMyLikes(prev => {
              const next = new Set(prev)
              likes.forEach(l => next.add(l.post_id))
              return next
            })
          }
        } catch (e) { /* ignore */ }
      }
    } catch (e: any) {
      console.error('Community load error:', e)
      if (myVer !== loadVerRef.current) return
      setError(e.message || '로딩 실패')
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
      setError(e.message || '랭킹 로딩 실패')
    } finally {
      if (myVer === loadVerRef.current) setLoading(false)
    }
  }

  // 좋아요 토글
  const toggleLike = useCallback(async (postId: string) => {
    if (!user) return

    const isLiked = myLikes.has(postId)

    // 낙관적 업데이트
    setMyLikes(prev => {
      const next = new Set(prev)
      if (isLiked) next.delete(postId)
      else next.add(postId)
      return next
    })
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, likes_count: p.likes_count + (isLiked ? -1 : 1) } : p
    ))

    try {
      if (isLiked) {
        const { data } = await supabase.from('likes').select('id').eq('user_id', user.id).eq('post_id', postId)
        if (data && data[0]) {
          await supabase.from('likes').delete().eq('id', data[0].id)
        }
      } else {
        await supabase.from('likes').insert({ user_id: user.id, post_id: postId })
      }
    } catch (e) {
      // 롤백
      setMyLikes(prev => {
        const next = new Set(prev)
        if (isLiked) next.add(postId)
        else next.delete(postId)
        return next
      })
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, likes_count: p.likes_count + (isLiked ? 1 : -1) } : p
      ))
    }
  }, [user, myLikes])

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

  return {
    // 상태
    tab, sort, contentFilter, styleFilter, friendsMode, rankingMode,
    posts: filteredPosts,
    loading, hasMore, error,
    myLikes, myFollows,

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
