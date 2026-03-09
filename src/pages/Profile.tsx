// @ts-nocheck
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Award, Palette, ScanLine, GraduationCap, Target, FileText, ShieldOff, SlidersHorizontal, Share, ChevronRight, Pencil, Camera, User, ScanFace, Trophy, Settings, LogOut, LogIn } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { gamification } from '@/lib/gamification'
import { profile as profileLib } from '@/lib/profile'
import { PERSONAL_COLOR_12 } from '@/lib/personalColor'
import { BODY_GUIDE_DATA } from '@/lib/bodyType'
import CropOverlay from '@/components/ui/CropOverlay'

export default function Profile() {
  const navigate = useNavigate()
  const { user, profile: authProfile, logout, updateProfile } = useAuth()
  const modal = useModal()
  const toast = useToast()
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [avatarEditSrc, setAvatarEditSrc] = useState<string | null>(null)

  // @ts-ignore
  const gd = gamification._getData ? gamification._getData() : { records: [], streak: 0, savedCount: 0 }
  // @ts-ignore
  const lv = gamification.getLevel ? gamification.getLevel() : { level: 1, name: '입문자', progress: 0 }
  // @ts-ignore
  const badges = gamification.getBadges ? gamification.getBadges() : []
  const earnedBadges = badges.filter((b: any) => b.earned).length
  const totalRecords = gd.records?.length || 0
  const streak = gd.streak || 0
  const savedCount = gd.savedCount || 0

  // 팔로워/팔로잉 수 로드
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [{ count: fc }, { count: fic }] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
      ])
      setFollowerCount(fc || 0)
      setFollowingCount(fic || 0)
    }
    load()
  }, [user])

  const handleAvatarChange = async () => {
    if (!user) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        setAvatarEditSrc(ev.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const handleAvatarSave = async (croppedDataUrl: string) => {
    setAvatarEditSrc(null)
    if (!user) return
    try {
      const resp = await fetch(croppedDataUrl)
      const blob = await resp.blob()
      const path = `${user.id}/avatar_${Date.now()}.webp`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/webp' })
      if (uploadErr) throw uploadErr
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      await updateProfile({ avatar_url: urlData.publicUrl + '?t=' + Date.now() })
    } catch (err: any) {
      toast.error('아바타 변경 실패: ' + (err.message || ''))
    }
  }

  const handleEditField = (field: 'nickname' | 'bio' | 'instagram_id') => {
    if (!user) return

    const labels: Record<string, string> = { nickname: '닉네임', bio: '소개글', instagram_id: '인스타그램 ID' }
    const placeholders: Record<string, string> = { nickname: '2~12자 닉네임', bio: '나를 소개해보세요', instagram_id: '@없이 입력' }
    const maxLengths: Record<string, number> = { nickname: 12, bio: 100, instagram_id: 30 }
    const current = (authProfile as any)?.[field] || ''

    const forbidden = ['관리자', '운영자', 'admin', '바루픽', 'barupick', '바루사', 'barusa', '시스템', 'system', '테스트', 'test', '공지', 'notice']

    const validate = (value: string): string | null => {
      if (field === 'nickname') {
        if (value.length < 2) return '2자 이상 입력해주세요'
        if (value.length > 12) return '12자 이하로 입력해주세요'
        if (forbidden.some(f => value.toLowerCase().includes(f))) return '사용할 수 없는 닉네임입니다'
      }
      return null
    }

    modal.prompt({
      title: `${labels[field]} 수정`,
      placeholder: placeholders[field],
      defaultValue: current,
      maxLength: maxLengths[field],
      validate: field === 'nickname' ? validate : undefined,
      onConfirm: async (value) => {
        try {
          await updateProfile({ [field]: value || null })
          toast.success(`${labels[field]}을(를) 수정했어요`)
        } catch (err: any) {
          toast.error('수정 실패: ' + (err.message || ''))
        }
      },
    })
  }

  const nickname = authProfile?.nickname || '스타일 입문자'
  const avatarUrl = authProfile?.avatar_url || ''
  const bio = authProfile?.bio || ''

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">

      {/* 프로필 헤더 */}
      <div className="flex items-center gap-4 pb-3">
        <div className="relative flex-shrink-0 overflow-hidden" onClick={user ? handleAvatarChange : undefined}>
          {avatarUrl ? (
            <img src={avatarUrl} className="w-16 h-16 rounded-full object-cover border-[2.5px] border-terra-200" alt="" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-terra-100 border-[2.5px] border-terra-200 flex items-center justify-center">
              <User size={26} className="text-terra-600" />
            </div>
          )}
          {user && (
            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-white border border-warm-400 rounded-full flex items-center justify-center shadow-sm">
              <Camera size={11} className="text-warm-600" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-lg font-bold text-warm-900 tracking-tight">{nickname}</div>
            {user && (
              <button onClick={() => handleEditField('nickname')} className="text-warm-500 active:scale-90 transition-all">
                <Pencil size={13} />
              </button>
            )}
          </div>
          <div className="text-sm text-warm-600 mt-0.5">Lv.{lv.level} · {lv.name}</div>
          <div className="h-1.5 bg-warm-300 rounded-full overflow-hidden mt-1.5 max-w-[140px]">
            <div className="h-full bg-terra-400 rounded-full transition-all" style={{ width: `${lv.progress}%` }} />
          </div>
        </div>
        {user ? (
          <button onClick={logout} className="px-4 py-2 rounded-full border border-warm-400 bg-white text-xs font-medium text-warm-700 active:scale-95 transition-all">
            로그아웃
          </button>
        ) : (
          <button onClick={() => navigate('/auth/login')} className="px-4 py-2 rounded-full bg-terra-500 text-white text-xs font-medium active:scale-95 transition-all shadow-terra">
            로그인
          </button>
        )}
      </div>

      {/* 소개글 */}
      {user && (
        <div className="mb-6 cursor-pointer" onClick={() => handleEditField('bio')}>
          {bio ? (
            <div className="text-sm text-warm-700 leading-relaxed">{bio}</div>
          ) : (
            <div className="text-sm text-warm-500 italic">탭하여 소개글을 작성해보세요</div>
          )}
        </div>
      )}

      {/* 인스타그램 */}
      {user && (
        <div
          className="flex items-center gap-2.5 mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl px-4 py-3 cursor-pointer active:scale-[0.99] transition-all"
          onClick={() => handleEditField('instagram_id')}
        >
          <span className="text-lg">📸</span>
          <div className="flex-1">
            {authProfile?.instagram_id ? (
              <>
                <div className="text-sm font-medium text-warm-900 dark:text-white">@{authProfile.instagram_id}</div>
                <div className="text-[10px] text-warm-500">탭하여 수정</div>
              </>
            ) : (
              <div className="text-sm text-warm-500">인스타그램 ID를 등록해보세요</div>
            )}
          </div>
          <ChevronRight size={16} className="text-warm-500" />
        </div>
      )}

      {/* 소셜 통계 */}
      {user ? (
        <>
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            <div onClick={() => navigate('/profile/posts')} className="bg-white border border-warm-400 rounded-2xl py-3.5 text-center shadow-warm-sm cursor-pointer active:scale-[0.97] transition-all">
              <div className="font-display text-xl font-bold text-terra-500">{totalRecords}</div>
              <div className="text-[10px] text-warm-600 font-medium mt-0.5">코디</div>
            </div>
            <div onClick={() => navigate(`/user/${user.id}/followers`)} className="bg-white border border-warm-400 rounded-2xl py-3.5 text-center shadow-warm-sm cursor-pointer active:scale-[0.97] transition-all">
              <div className="font-display text-xl font-bold text-terra-500">{followerCount}</div>
              <div className="text-[10px] text-warm-600 font-medium mt-0.5">팔로워</div>
            </div>
            <div onClick={() => navigate(`/user/${user.id}/following`)} className="bg-white border border-warm-400 rounded-2xl py-3.5 text-center shadow-warm-sm cursor-pointer active:scale-[0.97] transition-all">
              <div className="font-display text-xl font-bold text-terra-500">{followingCount}</div>
              <div className="text-[10px] text-warm-600 font-medium mt-0.5">팔로잉</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5 mb-6">
            <div className="bg-warm-100 border border-warm-300 rounded-xl py-2.5 text-center">
              <div className="font-display text-sm font-bold text-warm-700">{streak}</div>
              <div className="text-[9px] text-warm-500 mt-0.5">🔥 연속</div>
            </div>
            <div onClick={() => navigate('/profile/badges')} className="bg-warm-100 border border-warm-300 rounded-xl py-2.5 text-center cursor-pointer">
              <div className="font-display text-sm font-bold text-warm-700">{earnedBadges}</div>
              <div className="text-[9px] text-warm-500 mt-0.5">🏅 배지</div>
            </div>
            <div className="bg-warm-100 border border-warm-300 rounded-xl py-2.5 text-center">
              <div className="font-display text-sm font-bold text-warm-700">{savedCount}</div>
              <div className="text-[9px] text-warm-500 mt-0.5">💾 저장</div>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[['코디 기록', totalRecords], ['연속 기록', streak], ['배지', earnedBadges], ['저장 코디', savedCount]].map(([label, val]) => (
            <div key={label as string} className="bg-white border border-warm-400 rounded-2xl py-3.5 text-center shadow-warm-sm">
              <div className="font-display text-xl font-bold text-terra-500">{val}</div>
              <div className="text-[10px] text-warm-600 font-medium mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 성장 섹션 */}
      <MenuSection icon={<Trophy size={14} />} title="성장">
        <MenuItem icon={<BarChart3 size={18} />} label="내 레벨 상세" badge={`Lv.${lv.level} · ${lv.progress}%`} onClick={() => navigate('/profile/level')} />
        <MenuItem icon={<Award size={18} />} label="배지 컬렉션" badge={`${earnedBadges}/${badges.length}`} onClick={() => navigate('/profile/badges')} />
        <MenuItem icon={<Palette size={18} />} label="컬러 랭킹" onClick={() => navigate('/profile/color-ranking')} />
        <MenuItem icon={<ScanLine size={18} />} label="색상 패턴 분석" badge="DNA" badgeVariant="muted" onClick={() => navigate('/profile/color-pattern')} />
        <MenuItem icon={<GraduationCap size={18} />} label="칭호 시험" onClick={() => navigate('/profile/title-exam')} />
        <MenuItem icon={<Target size={18} />} label="주간 챌린지" onClick={() => navigate('/profile/challenges')} last />
      </MenuSection>

      {/* 나의 진단 */}
      <MenuSection icon={<ScanFace size={14} />} title="나의 진단">
        {(() => {
          const pcKey = profileLib.getPersonalColor()
          const pcData = pcKey ? (PERSONAL_COLOR_12 as any)[pcKey] : null
          const pcLabel = pcData ? pcData.name : '미설정'

          const btKey = profileLib.getBodyType()
          const btData = btKey ? (BODY_GUIDE_DATA as any)[btKey] : null
          const btLabel = btData ? btData.name : '미설정'

          return (
            <>
              <MenuItem icon={<Palette size={18} />} label="퍼스널컬러" badge={pcLabel} badgeVariant={pcData ? undefined : 'muted'} onClick={() => navigate('/profile/personal-color')} />
              <MenuItem icon={<BarChart3 size={18} />} label="체형 진단" badge={btLabel} badgeVariant={btData ? undefined : 'muted'} onClick={() => navigate('/home/body')} last />
            </>
          )
        })()}
      </MenuSection>

      {/* 관리/설정 */}
      <MenuSection icon={<Settings size={14} />} title="설정">
        {user && <MenuItem icon={<FileText size={18} />} label="내 게시물" onClick={() => navigate('/profile/posts')} />}
        {user && <MenuItem icon={<BarChart3 size={18} />} label="인사이트" badge="📊 NEW" onClick={() => navigate('/profile/insights')} />}
        {user && <MenuItem icon={<ShieldOff size={18} />} label="차단 목록" onClick={() => navigate('/profile/block-list')} />}
        <MenuItem icon={<SlidersHorizontal size={18} />} label="설정" onClick={() => navigate('/profile/settings')} />
        <MenuItem icon={<Share size={18} />} label="앱 공유하기" onClick={() => {
          navigator.share?.({ title: '바루픽', text: 'AI 컬러 코디 추천 앱', url: 'https://barupick.vercel.app' }).catch(() => {})
        }} last />
      </MenuSection>

      {/* 아바타 크롭 (원형) */}
      {avatarEditSrc && (
        <CropOverlay
          src={avatarEditSrc}
          shape="circle"
          title="프로필 사진"
          outputSize={400}
          onDone={handleAvatarSave}
          onCancel={() => setAvatarEditSrc(null)}
        />
      )}
    </div>
  )
}

// ─── 공통 메뉴 컴포넌트 ───
function MenuSection({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-warm-600 tracking-widest uppercase mb-3 pb-2 border-b border-warm-400">
        {icon} {title}
      </div>
      {children}
    </div>
  )
}

function MenuItem({ icon, label, badge, badgeVariant, onClick, last }: {
  icon: React.ReactNode, label: string, badge?: string, badgeVariant?: 'muted', onClick: () => void, last?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 py-3.5 text-left active:bg-warm-200/50 rounded-lg transition-colors ${last ? '' : 'border-b border-warm-300'}`}
    >
      <span className="text-warm-600">{icon}</span>
      <span className="text-[15px] text-warm-900 flex-1">{label}</span>
      {badge && (
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          badgeVariant === 'muted' ? 'text-warm-600 bg-warm-200' : 'text-terra-600 bg-terra-100'
        }`}>
          {badge}
        </span>
      )}
      <ChevronRight size={16} className="text-warm-500" />
    </button>
  )
}
