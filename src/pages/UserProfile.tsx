import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { User, MoreHorizontal, ShieldOff } from 'lucide-react'
import CharacterCanvas from '@/components/mannequin/CharacterCanvas'
import { sceneFromColors } from '@/lib/char/scene'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useSocial } from '@/hooks/useSocial'
import { useToast } from '@/components/ui/Toast'
import { useTranslation } from 'react-i18next'

interface ProfileData {
  id: string; nickname: string | null; avatar_url: string | null; bio: string | null; instagram_id: string | null
}

export default function UserProfile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()
  const { user } = useAuth()
  const { isFollowing, isFriend, toggleFollow, toggleBlock } = useSocial()
  const toast = useToast()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  const isMe = user?.id === userId

  useEffect(() => {
    if (isMe) { navigate('/profile', { replace: true }); return }
    if (!userId) return
    loadProfile()
  }, [userId])

  const loadProfile = async () => {
    if (!userId) return
    setLoading(true)
    try {
      let postsQuery = supabase.from('posts').select('*').eq('user_id', userId).eq('status', 'approved')
      if (!isMe) postsQuery = postsQuery.or('visibility.eq.public,visibility.is.null')

      const [profRes, postsRes, fersRes, fingRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        postsQuery.order('created_at', { ascending: false }).limit(30),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
      ])
      setProfile(profRes.data)
      setPosts(postsRes.data || [])
      setFollowers(fersRes.count || 0)
      setFollowing(fingRes.count || 0)
    } catch (e) {
      console.error('Profile load error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (!userId) return null

  const nick = profile?.nickname || t('common.user')
  const avatar = profile?.avatar_url
  const bio = profile?.bio
  const insta = profile?.instagram_id
  const mutual = isFriend(userId)
  const following_ = isFollowing(userId)

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      {/* 프로필 카드 */}
      <div className="text-center py-5 relative">
        {/* 더보기 메뉴 */}
        {!isMe && (
          <button onClick={() => setMenuOpen(!menuOpen)} className="absolute top-2 right-0 w-8 h-8 rounded-full bg-warm-200 dark:bg-warm-700 text-warm-700 dark:text-warm-200 flex items-center justify-center active:scale-90">
            <MoreHorizontal size={16} />
          </button>
        )}
        {menuOpen && (
          <div className="absolute top-12 right-0 bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl shadow-warm p-2 z-10">
            <button
              onClick={async () => {
                const blocked = await toggleBlock(userId)
                setMenuOpen(false)
                toast.success(blocked ? t('userProfile.blockedToast') : t('userProfile.unblockedToast'))
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 active:bg-warm-100 dark:active:bg-warm-700 rounded-lg w-full text-left"
            >
              <ShieldOff size={14} /> {t('common.block')}
            </button>
          </div>
        )}

        {avatar ? (
          <img src={avatar} className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border-2 border-warm-300 dark:border-warm-600" alt="" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-terra-100 dark:bg-terra-900/40 flex items-center justify-center mx-auto mb-3 border-2 border-warm-300 dark:border-warm-600">
            <User size={28} className="text-terra-600" />
          </div>
        )}

        <div className="text-lg font-bold text-warm-900 dark:text-warm-100">@{nick}</div>
        {bio && <div className="text-xs text-warm-500 dark:text-warm-400 mt-1 px-8">{bio}</div>}
        {mutual && !isMe && <div className="text-[11px] text-green-600 font-medium mt-1">{t('common.mutualFriend')}</div>}
        {insta && (
          <button
            onClick={() => window.open(`https://instagram.com/${insta}`, '_blank')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200 dark:border-purple-800 text-xs font-medium text-warm-700 dark:text-warm-200 mt-2 active:scale-95 transition-all"
          >
            📸 @{insta}
          </button>
        )}

        {/* 통계 */}
        <div className="flex justify-center gap-5 mt-4 mb-3">
          <div className="text-center">
            <div className="font-display text-lg font-bold text-warm-900 dark:text-warm-100">{posts.length}</div>
            <div className="text-[10px] text-warm-500 dark:text-warm-400">{t('common.coord')}</div>
          </div>
          <div className="text-center cursor-pointer" onClick={() => navigate(`/user/${userId}/followers`)}>
            <div className="font-display text-lg font-bold text-warm-900 dark:text-warm-100">{followers}</div>
            <div className="text-[10px] text-warm-500 dark:text-warm-400">{t('common.followers')}</div>
          </div>
          <div className="text-center cursor-pointer" onClick={() => navigate(`/user/${userId}/following`)}>
            <div className="font-display text-lg font-bold text-warm-900 dark:text-warm-100">{following}</div>
            <div className="text-[10px] text-warm-500 dark:text-warm-400">{t('common.followingLabel')}</div>
          </div>
        </div>

        {/* 팔로우 버튼 */}
        {!isMe && (
          <button
            onClick={() => toggleFollow(userId)}
            className={`px-5 py-2 rounded-full text-xs font-semibold active:scale-95 transition-all ${
              mutual ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-800'
              : following_ ? 'bg-warm-200 dark:bg-warm-700 text-warm-700 dark:text-warm-200 border border-warm-400 dark:border-warm-600'
              : 'bg-terra-500 text-white shadow-terra'
            }`}
          >
            {mutual ? t('common.friend') : following_ ? t('common.following') : t('common.follow')}
          </button>
        )}
      </div>

      {/* 팔로우 유도 CTA */}
      {!isMe && !following_ && !loading && (
        <div className="bg-gradient-to-r from-terra-50 to-warm-100 dark:from-terra-900/30 dark:to-warm-800 border border-terra-200 dark:border-terra-800 rounded-2xl p-4 mb-3 flex items-center gap-3">
          <div className="text-2xl flex-shrink-0">🔓</div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-warm-800 dark:text-warm-100 mb-0.5">{t('userProfile.followCta')}</div>
            <div className="text-[11px] text-warm-500 dark:text-warm-400">{t('userProfile.followCtaDesc')}</div>
          </div>
          <button onClick={() => toggleFollow(userId)} className="px-3 py-1.5 bg-terra-500 text-white rounded-full text-[11px] font-semibold active:scale-95 flex-shrink-0 shadow-terra">
            {t('common.follow')}
          </button>
        </div>
      )}

      {/* 로딩 */}
      {loading && <div className="text-center py-10 text-warm-400 dark:text-warm-500 text-sm">{t('common.loading')}</div>}

      {/* 코디 그리드 */}
      {!loading && posts.length > 0 && (
        <div className="border-t border-warm-300 dark:border-warm-600 pt-4 mt-2">
          <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 uppercase tracking-wider mb-3">{t('userProfile.publicCoords')}</div>
          <div className="grid grid-cols-2 gap-2.5">
            {posts.map(post => {
              const hasPhoto = post.photo_urls && post.photo_urls.length > 0
              const scene = hasPhoto ? null : sceneFromColors(post.outfit || {})

              return (
                <button
                  key={post.id}
                  onClick={() => navigate(`/community/${post.id}`)}
                  className="aspect-[4/5] rounded-2xl overflow-hidden bg-warm-100 dark:bg-warm-700 border border-warm-300 dark:border-warm-600 shadow-warm-sm active:scale-[0.98] transition-all flex items-center justify-center"
                >
                  {scene ? (
                    <CharacterCanvas items={scene.items} body={scene.body} width={88} />
                  ) : (
                    <img src={post.photo_urls[0]} className="w-full h-full object-cover" alt="" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="text-center py-10 text-warm-400 dark:text-warm-500 text-sm">{t('userProfile.noPublicCoords')}</div>
      )}
    </div>
  )
}
