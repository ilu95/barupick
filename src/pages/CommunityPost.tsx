import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Image, Globe, Users, Lock, Camera, Check } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import CropOverlay from '@/components/ui/CropOverlay'
import { COLORS_60 } from '@/lib/colors'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function CommunityPost() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
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

  const outfitHex: Record<string, string> = {}
  Object.entries(savedOutfit).forEach(([k, v]) => {
    if (v) outfitHex[k] = COLORS_60[v as string]?.hex || (v as string)
  })

  const hasOutfit = Object.keys(outfitHex).length > 0

  if (!user) {
    return (
      <div className="animate-screen-fade px-5 pt-6 pb-10 text-center py-20">
        <div className="text-4xl mb-3">🔐</div>
        <div className="text-sm text-warm-600 mb-4">로그인 후 공유할 수 있어요</div>
        <button onClick={() => navigate('/auth/login')} className="px-5 py-2 bg-terra-500 text-white rounded-full text-sm font-semibold active:scale-95 transition-all shadow-terra">
          로그인하기
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
      setDone(true)
      setTimeout(() => navigate('/community', { replace: true }), 1500)
    } catch (e: any) {
      alert('공유 실패: ' + (e.message || ''))
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
          <div className="font-display text-lg font-bold text-warm-900">커뮤니티에 공유했어요!</div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-5">커뮤니티에 공유</h2>

      {/* 마네킹 미리보기 */}
      {hasOutfit && (
        <div className="flex justify-center mb-5 py-4 bg-warm-100 rounded-2xl">
          <MannequinSVG outfit={outfitHex} size={120} />
        </div>
      )}

      {/* 캡션 */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-warm-600 tracking-widest uppercase mb-2 block">캡션</label>
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="오늘의 코디를 소개해보세요"
          maxLength={200}
          className="w-full h-24 px-4 py-3 bg-white border border-warm-400 rounded-2xl text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:border-terra-400 resize-none"
        />
        <div className="text-right text-[11px] text-warm-500 mt-1">{caption.length}/200</div>
      </div>

      {/* 사진 */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-warm-600 tracking-widest uppercase mb-2 block flex items-center gap-1">
          <Image size={12} /> 사진 <span className="text-warm-400 normal-case tracking-normal">(선택, 최대 4장)</span>
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
            <label className="w-16 h-16 rounded-xl border-2 border-dashed border-warm-400 flex flex-col items-center justify-center cursor-pointer flex-shrink-0 active:scale-95 bg-warm-100">
              <Camera size={18} className="text-warm-600" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoAdd} />
            </label>
          )}
        </div>
      </div>

      {/* 공개 범위 */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-warm-600 tracking-widest uppercase mb-2 block">공개 범위</label>
        <div className="flex gap-2">
          {[
            { key: 'public', icon: <Globe size={13} />, label: '전체 공개' },
            { key: 'friends', icon: <Users size={13} />, label: '친구 공개' },
          ].map(v => (
            <button
              key={v.key}
              onClick={() => setVisibility(v.key as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                visibility === v.key ? 'bg-terra-500 text-white shadow-terra' : 'bg-white border border-warm-400 text-warm-700'
              }`}
            >{v.icon} {v.label}</button>
          ))}
        </div>
      </div>

      {/* 인스타 토글 */}
      {profile?.instagram_id && (
        <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl px-4 py-3 mb-5">
          <div>
            <div className="text-sm font-medium text-warm-900">📸 인스타그램 표시</div>
            <div className="text-[10px] text-warm-500">@{profile.instagram_id}</div>
          </div>
          <button
            onClick={() => setShowInstagram(!showInstagram)}
            className={`w-11 h-6 rounded-full transition-all ${showInstagram ? 'bg-terra-500' : 'bg-warm-400'}`}
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
        {posting ? '공유 중...' : '🌐 커뮤니티에 공유하기'}
      </button>

      {/* 4:5 크롭 UI */}
      {cropSrc && <CropOverlay src={cropSrc} ratio={4/5} onDone={(url) => { setPhotos(prev => [...prev, url]); setCropSrc(null) }} onCancel={() => setCropSrc(null)} />}
    </div>
  )
}
