import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export function useSocial() {
  const { user } = useAuth()
  const [follows, setFollows] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('sp_follows') || '[]'))
    } catch { return new Set() }
  })

  const isFollowing = useCallback((userId: string) => follows.has(userId), [follows])

  const isFriend = useCallback((userId: string) => {
    try {
      const friends = JSON.parse(localStorage.getItem('sp_friends') || '[]')
      return friends.includes(userId)
    } catch { return false }
  }, [])

  const toggleFollow = useCallback(async (userId: string) => {
    if (!user) return

    const wasFollowing = follows.has(userId)

    // 낙관적 업데이트
    setFollows(prev => {
      const next = new Set(prev)
      if (wasFollowing) next.delete(userId)
      else next.add(userId)
      // localStorage 동기화
      localStorage.setItem('sp_follows', JSON.stringify([...next]))
      return next
    })

    if (!wasFollowing) {
      // 맞팔 확인
      try {
        const { data } = await supabase.from('follows').select('id').eq('follower_id', userId).eq('following_id', user.id).limit(1)
        if (data && data.length > 0) {
          const friends = JSON.parse(localStorage.getItem('sp_friends') || '[]')
          if (!friends.includes(userId)) {
            friends.push(userId)
            localStorage.setItem('sp_friends', JSON.stringify(friends))
          }
        }
      } catch {}

      // 알림 전송
      try {
        await supabase.rpc('send_notification', {
          p_user_id: userId,
          p_actor_id: user.id,
          p_type: 'follow',
          p_message: '님이 회원님을 팔로우했어요',
          p_related_id: userId,
        })
      } catch {}
    } else {
      // 언팔로우 → 친구 목록에서 제거
      try {
        const friends = JSON.parse(localStorage.getItem('sp_friends') || '[]').filter((f: string) => f !== userId)
        localStorage.setItem('sp_friends', JSON.stringify(friends))
      } catch {}
    }

    // 서버 동기화
    try {
      if (wasFollowing) {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', userId)
      } else {
        await supabase.from('follows').upsert({ follower_id: user.id, following_id: userId })
      }
    } catch (e) {
      console.error('Follow sync error:', e)
    }
  }, [user, follows])

  const toggleBlock = useCallback(async (userId: string) => {
    if (!user) return
    try {
      const { data } = await supabase.from('blocks').select('id').eq('blocker_id', user.id).eq('blocked_id', userId)
      if (data && data.length > 0) {
        await supabase.from('blocks').delete().eq('id', data[0].id)
        return false // unblocked
      } else {
        await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: userId })
        return true // blocked
      }
    } catch (e) {
      console.error('Block error:', e)
      return null
    }
  }, [user])

  return { follows, isFollowing, isFriend, toggleFollow, toggleBlock }
}
