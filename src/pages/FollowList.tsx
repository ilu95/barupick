import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useSocial } from '@/hooks/useSocial'

type Tab = 'followers' | 'following'

interface FollowUser {
  id: string; nickname: string | null; avatar_url: string | null; instagram_id: string | null
}

export default function FollowList() {
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()
  const location = useLocation()
  const { user } = useAuth()
  const { isFollowing, isFriend, toggleFollow } = useSocial()

  const initialTab: Tab = location.pathname.includes('following') ? 'following' : 'followers'
  const [tab, setTab] = useState<Tab>(initialTab)
  const [users, setUsers] = useState<FollowUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadList() }, [userId, tab])

  const loadList = async () => {
    if (!userId) return
    setLoading(true)
    try {
      if (tab === 'followers') {
        const { data } = await supabase.from('follows')
          .select('follower_id, profiles:follower_id(id, nickname, avatar_url, instagram_id)')
          .eq('following_id', userId)
          .limit(100)
        setUsers((data || []).map((d: any) => d.profiles).filter(Boolean))
      } else {
        const { data } = await supabase.from('follows')
          .select('following_id, profiles:following_id(id, nickname, avatar_url, instagram_id)')
          .eq('follower_id', userId)
          .limit(100)
        setUsers((data || []).map((d: any) => d.profiles).filter(Boolean))
      }
    } catch (e) {
      console.error('Follow list error:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      {/* 탭 */}
      <div className="flex gap-1.5 mb-5">
        {([['followers', '팔로워'], ['following', '팔로잉']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
              tab === key ? 'bg-warm-900 text-white shadow-md' : 'bg-white border border-warm-400 text-warm-700 active:scale-95'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 리스트 */}
      {loading ? (
        <div className="text-center py-10 text-warm-400 text-sm">불러오는 중...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-4xl mb-3">{tab === 'followers' ? '👤' : '👥'}</div>
          <div className="text-sm text-warm-600">{tab === 'followers' ? '아직 팔로워가 없어요' : '아직 팔로잉이 없어요'}</div>
        </div>
      ) : (
        <div className="flex flex-col">
          {users.map(u => {
            const isMe = u.id === user?.id
            const following = isFollowing(u.id)
            const mutual = isFriend(u.id)

            return (
              <div key={u.id} className="flex items-center gap-3 py-3 border-b border-warm-300">
                <div onClick={() => navigate(`/user/${u.id}`)} className="flex-shrink-0 cursor-pointer">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} className="w-11 h-11 rounded-full object-cover border border-warm-300" alt="" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-terra-100 flex items-center justify-center border border-warm-300">
                      <User size={18} className="text-terra-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/user/${u.id}`)}>
                  <div className="text-sm font-semibold text-warm-900 truncate">@{u.nickname || '유저'}</div>
                  {mutual && <div className="text-[10px] text-green-600 font-medium">👫 서로 친구</div>}
                </div>
                {!isMe && (
                  <button
                    onClick={() => toggleFollow(u.id)}
                    className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold active:scale-95 transition-all flex-shrink-0 ${
                      mutual ? 'bg-green-100 text-green-700 border border-green-300'
                      : following ? 'bg-warm-200 text-warm-700 border border-warm-400'
                      : 'bg-terra-500 text-white shadow-terra'
                    }`}
                  >
                    {mutual ? '👫 친구' : following ? '팔로잉 ✓' : '팔로우'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
