// @ts-nocheck
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, ShieldOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { useTranslation } from 'react-i18next'

interface BlockedUser {
  id: string
  blocked_id: string
  profiles?: { id: string; nickname: string | null; avatar_url: string | null }
}

export default function BlockList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const [blocked, setBlocked] = useState<BlockedUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadBlocked() }, [user])

  const loadBlocked = async () => {
    if (!user) { setLoading(false); return }
    try {
      const { data } = await supabase.from('blocks')
        .select('id, blocked_id, profiles:blocked_id(id, nickname, avatar_url)')
        .eq('blocker_id', user.id)
      setBlocked(data || [])
    } catch (e) {
      console.error('Block list error:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleUnblock = async (blockId: string, nickname: string) => {
    if (!confirm(t('blockList.unblockConfirm', { nickname }))) return
    try {
      await supabase.from('blocks').delete().eq('id', blockId)
      setBlocked(prev => prev.filter(b => b.id !== blockId))
    } catch (e: any) {
      toast.error(t('blockList.unblockFailed', { error: e.message || '' }))
    }
  }

  if (!user) {
    return (
      <div className="animate-screen-fade px-5 pt-6 pb-10 text-center py-20">
        <div className="text-sm text-warm-600">{t('common.loginRequired')}</div>
      </div>
    )
  }

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-1">{t('blockList.title')}</h2>
      <p className="text-sm text-warm-600 mb-5">{t('blockList.subtitle')}</p>

      {loading ? (
        <div className="text-center py-10 text-warm-400 text-sm">{t('common.loading')}</div>
      ) : blocked.length === 0 ? (
        <div className="text-center py-16">
          <ShieldOff size={40} className="text-warm-400 mx-auto mb-3" />
          <div className="text-sm text-warm-600">{t('blockList.empty')}</div>
        </div>
      ) : (
        <div className="flex flex-col">
          {blocked.map(b => {
            const prof = b.profiles as any
            const nick = prof?.nickname || t('common.user')
            const avatar = prof?.avatar_url

            return (
              <div key={b.id} className="flex items-center gap-3 py-3 border-b border-warm-300">
                <div className="flex-shrink-0">
                  {avatar ? (
                    <img src={avatar} className="w-11 h-11 rounded-full object-cover border border-warm-300" alt="" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-warm-200 flex items-center justify-center border border-warm-300">
                      <User size={18} className="text-warm-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-warm-900 truncate">@{nick}</div>
                  <div className="text-[11px] text-warm-500">{t('common.blocked')}</div>
                </div>
                <button
                  onClick={() => handleUnblock(b.id, nick)}
                  className="px-3.5 py-1.5 rounded-full text-[11px] font-semibold bg-white text-red-600 border border-red-200 active:scale-95 transition-all flex-shrink-0"
                >
                  {t('common.unblock')}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
