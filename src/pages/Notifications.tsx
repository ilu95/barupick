import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, User, Heart, UserPlus, Trophy, MessageSquare, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface Notification {
  id: string; type: string; message: string; related_id: string | null; read: boolean; created_at: string
  actor?: { nickname: string | null; avatar_url: string | null }
}

export default function Notifications() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [notis, setNotis] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadNotis() }, [user])

  const loadNotis = async () => {
    if (!user) { setLoading(false); return }
    try {
      const { data } = await supabase.from('notifications')
        .select('*, actor:profiles!notifications_actor_id_profiles_fkey(nickname, avatar_url)')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
      setNotis(data || [])
      // 읽음 처리
      await supabase.rpc('mark_notifications_read', { p_user_id: user.id })
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const clearAll = async () => {
    if (!user || !confirm('모든 알림을 삭제할까요?')) return
    await supabase.from('notifications').delete().eq('user_id', user.id)
    setNotis([])
  }

  const icon = (type: string) => {
    if (type === 'like') return <Heart size={14} className="text-red-400" />
    if (type === 'follow' || type === 'friend') return <UserPlus size={14} className="text-terra-500" />
    if (type === 'comment') return <MessageSquare size={14} className="text-blue-500" />
    if (type === 'event' || type === 'badge') return <Trophy size={14} className="text-amber-500" />
    return <Bell size={14} className="text-warm-500" />
  }

  const timeAgo = (dt: string) => {
    const d = (Date.now() - new Date(dt).getTime()) / 1000
    if (d < 60) return '방금'
    if (d < 3600) return Math.floor(d / 60) + '분 전'
    if (d < 86400) return Math.floor(d / 3600) + '시간 전'
    return Math.floor(d / 86400) + '일 전'
  }

  if (!user) return <div className="animate-screen-fade px-5 pt-6 text-center py-20 text-sm text-warm-600">로그인이 필요합니다</div>

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-bold text-warm-900">알림</h2>
        {notis.length > 0 && (
          <button onClick={clearAll} className="text-xs text-warm-500 active:opacity-70"><Trash2 size={14} className="inline mr-1" />모두 삭제</button>
        )}
      </div>

      {loading ? <div className="text-center py-10 text-warm-400 text-sm">불러오는 중...</div>
      : notis.length === 0 ? (
        <div className="text-center py-16"><Bell size={40} className="text-warm-400 mx-auto mb-3" /><div className="text-sm text-warm-600">새 알림이 없어요</div></div>
      ) : (
        <div className="flex flex-col">
          {notis.map(n => (
            <button key={n.id} onClick={() => n.related_id && navigate(`/community/${n.related_id}`)}
              className={`flex items-start gap-3 py-3.5 border-b border-warm-300 text-left ${!n.read ? 'bg-terra-50/50 -mx-5 px-5 rounded-lg' : ''}`}>
              <div className="flex-shrink-0 mt-0.5">
                {n.actor?.avatar_url ? <img src={n.actor.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
                : <div className="w-9 h-9 rounded-full bg-warm-200 flex items-center justify-center"><User size={16} className="text-warm-500" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">{icon(n.type)}<span className="text-sm text-warm-900"><strong>@{n.actor?.nickname || '유저'}</strong> {n.message}</span></div>
                <div className="text-[11px] text-warm-500">{timeAgo(n.created_at)}</div>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-terra-500 flex-shrink-0 mt-2" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
