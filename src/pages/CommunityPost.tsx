import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Image, Globe, Users, Lock, Camera, Check } from 'lucide-react'
import CharacterCanvas from '@/components/mannequin/CharacterCanvas'
import { sceneFromColors } from '@/lib/char/scene'
import CropOverlay from '@/components/ui/CropOverlay'
import { COLORS_60, getColorName } from '@/lib/colors'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { trackCommunityPost } from '@/lib/analytics'
import { useToast } from '@/components/ui/Toast'

export default function CommunityPost() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const toast = useToast()
  const [caption, setCaption] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [visibility, setVisibility] = useState<'public' | 'friends'>('public')
  const [showInstagram, setShowInstagram] = useState(false)
  const [posting, setPosting] = useState(false)
  const [done, setDone] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  // 전달받은 outfit 데이터 (localStorage에서)
  const savedOutfit = (() => {
    try {
      return JSON.parse(localStorage.getItem('_pending_post_outfit') || '{}')
    } catch { return {} }
  })()

  const outfitParts = Object.entries(savedOutfit).filter(([, v]) => v && COLORS_60[v as string]) as [string, string][]
  const hasOutfit = outfitParts.length > 0
  const scene = sceneFromColors(savedOutfit)

  if (!user) {
    return (
      <div className="animate-screen-fade px-5 pt-6 pb-10 text-center py-20">
        <div className="text-4xl mb-3">🔐</div>
        <div className="text-sm text-warm-600 dark:text-warm-400 mb-4">{t('common.loginRequired')}</div>
        <button onClick={() => navigate('/auth/login')} className="px-5 py-2 bg-terra-500 text-white rounded-full text-sm font-semibold active:scale-95 transition-all shadow-terra">
          {t('auth.loginButton')}
        </button>
      </div>
    )
  }

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || photos.length >= 4) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setCropSrc(reader.result)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handlePost = async () => {
    if (!user) return
    setPosting(true)
    try {
      // 사진 업로드 (있으면)
      const photoUrls: string[] = []
      for (const photo of photos) {
        const blob = await fetch(photo).then(r => r.blob())
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.webp`
        const { error: upErr } = await supabase.storage.from('community').upload(path, blob, { contentType: 'image/webp', upsert: false })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('community').getPublicUrl(path)
          photoUrls.push(urlData.publicUrl)
        }
      }

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        title: caption.slice(0, 100),
        outfit: savedOutfit,
        score: 0,
        style: null,
        layer_type: 'basic',
        caption: caption.slice(0, 200) || null,
        photo_urls: photoUrls.length > 0 ? photoUrls : null,
        status: 'approved',
        tags: [],
        visibility,
        show_instagram: !!(showInstagram && profile?.instagram_id),
        hide_counts: false,
      })
      if (error) throw error

      localStorage.removeItem('_pending_post_outfit')
      trackCommunityPost()
      setDone(true)
      setTimeout(() => navigate('/community', { replace: true }), 1500)
    } catch (e: any) {
      toast.error(t('communityPost.postFailed', { error: e.message || '' }))
    } finally {
      setPosting(false)
    }
  }

  if (done) {
    return (
      <div className="animate-screen-fade flex items-center justify-center py-32">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-sage/20 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-sage" />
          </div>
          <div className="font-display text-lg font-bold text-warm-900 dark:text-warm-100">{t('communityPost.postSuccess')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-5">{t('communityPost.title')}</h2>

      {/* 코디 미리보기 */}
      {hasOutfit && (
        <div className="bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-3xl p-4 mb-5 shadow-warm-sm">
          <div className="flex justify-center mb-3">
            <CharacterCanvas items={scene.items} body={scene.body} width={120} />
          </div>
          <div className="flex gap-x-3 gap-y-1.5 flex-wrap justify-center">
            {outfitParts.map(([part, ck]) => (
              <div key={part} className="flex items-center gap-1.5 text-xs">
                <span className="w-3.5 h-3.5 rounded-full border border-warm-400 dark:border-warm-600" style={{ background: COLORS_60[ck].hex }} />
                <span className="text-warm-500 dark:text-warm-400">{t('categories:names.' + part)}</span>
                <span className="text-warm-800 dark:text-warm-200">{getColorName(ck)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 캡션 */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-widest uppercase mb-2 block">{t('communityPost.caption')}</label>
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder={t('communityPost.captionPlaceholder')}
          maxLength={200}
          className="w-full h-24 px-4 py-3 bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl text-sm text-warm-900 dark:text-warm-100 placeholder-warm-500 dark:placeholder-warm-400 focus:outline-none focus:border-terra-400 resize-none"
        />
        <div className="text-right text-[11px] text-warm-500 dark:text-warm-400 mt-1">{caption.length}/200</div>
      </div>

      {/* 사진 */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-widest uppercase mb-2 block flex items-center gap-1">
          <Image size={12} /> {t('communityPost.photos')} <span className="text-warm-400 dark:text-warm-500 normal-case tracking-normal">(max 4)</span>
        </label>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {photos.map((p, i) => (
            <div key={i} className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative">
              <img src={p} className="w-full h-full object-cover" alt="" />
              <button onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/50 text-white text-[10px] flex items-center justify-center">✕</button>
            </div>
          ))}
          {photos.length < 4 && (
            <label className="w-16 h-16 rounded-2xl border-2 border-dashed border-warm-400 dark:border-warm-600 flex flex-col items-center justify-center cursor-pointer flex-shrink-0 active:scale-95 bg-warm-100 dark:bg-warm-700">
              <Camera size={18} className="text-warm-600 dark:text-warm-300" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoAdd} />
            </label>
          )}
        </div>
      </div>

      {/* 공개 범위 */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-widest uppercase mb-2 block">{t('communityPost.visibility.public')}</label>
        <div className="flex gap-2">
          {[
            { key: 'public', icon: <Globe size={13} />, label: t('communityPost.visibility.public') },
            { key: 'friends', icon: <Users size={13} />, label: t('communityPost.visibility.friends') },
          ].map(v => (
            <button
              key={v.key}
              onClick={() => setVisibility(v.key as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                visibility === v.key ? 'bg-terra-500 text-white shadow-terra' : 'bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-warm-700 dark:text-warm-200'
              }`}
            >{v.icon} {v.label}</button>
          ))}
        </div>
      </div>

      {/* 인스타 토글 */}
      {profile?.instagram_id && (
        <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200 dark:border-purple-700 rounded-2xl px-4 py-3 mb-5">
          <div>
            <div className="text-sm font-medium text-warm-900 dark:text-warm-100">{t('communityPost.instagramToggle')}</div>
            <div className="text-[10px] text-warm-500 dark:text-warm-400">@{profile.instagram_id}</div>
          </div>
          <button
            onClick={() => setShowInstagram(!showInstagram)}
            className={`w-11 h-6 rounded-full transition-all ${showInstagram ? 'bg-terra-500' : 'bg-warm-400 dark:bg-warm-600'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${showInstagram ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handlePost}
        disabled={posting}
        className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra disabled:opacity-50"
      >
        {posting ? t('communityPost.posting') : t('common.share')}
      </button>

      {/* 4:5 크롭 UI */}
      {cropSrc && <CropOverlay src={cropSrc} ratio={4/5} onDone={(url) => { setPhotos(prev => [...prev, url]); setCropSrc(null) }} onCancel={() => setCropSrc(null)} />}
    </div>
  )
}
