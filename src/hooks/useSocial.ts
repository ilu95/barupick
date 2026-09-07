// ═══════════════════════════════════════════════════════
// useSocial.ts — 화면용 팔로우/차단 훅. 상태는 lib/socialStore(서버 진실)에서 온다.
// 실패는 토스트로 알리고, 비로그인은 로그인 화면으로 보낸다.
// ═══════════════════════════════════════════════════════
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { useSocialState, toggleFollow as storeToggleFollow } from '@/lib/socialStore'

export function useSocial() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const social = useSocialState()

  const isFollowing = useCallback((userId: string) => social.follows.has(userId), [social.follows])
  const isFriend = useCallback((userId: string) => social.follows.has(userId) && social.followers.has(userId), [social.follows, social.followers])

  const toggleFollow = useCallback(async (userId: string) => {
    const r = await storeToggleFollow(userId)
    if (!r.ok) {
      if (r.error === 'login') { toast.toast({ message: r.message, variant: 'info' }); navigate('/auth/login') }
      else toast.error(r.message)
    }
    return r.ok
  }, [toast, navigate])

  const toggleBlock = useCallback(async (userId: string) => {
    if (!user) return null
    try {
      const { data } = await supabase.from('blocks').select('id').eq('blocker_id', user.id).eq('blocked_id', userId)
      if (data && data.length > 0) {
        const { error } = await supabase.from('blocks').delete().eq('id', data[0].id)
        if (error) throw error
        return false // unblocked
      } else {
        const { error } = await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: userId })
        if (error) throw error
        return true // blocked
      }
    } catch (e) {
      console.error('Block error:', e)
      toast.error((e as Error)?.message || 'error')
      return null
    }
  }, [user, toast])

  return { follows: social.follows, followers: social.followers, ready: social.ready, isFollowing, isFriend, toggleFollow, toggleBlock }
}
