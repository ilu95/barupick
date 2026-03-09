// @ts-nocheck
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Camera, Check, AlertTriangle } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import CropOverlay from '@/components/ui/CropOverlay'
import ColorPicker from '@/components/ui/ColorPicker'
import { COLORS_60 } from '@/lib/colors'
import { STYLE_GUIDE } from '@/lib/styles'
import { CATEGORY_NAMES } from '@/lib/categories'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const PARTS = ['outer', 'top', 'middleware', 'bottom', 'shoes'] as const

export default function EventSubmit() {
  const navigate = useNavigate()
  const { eventId } = useParams<{ eventId: string }>()
  const { user, profile } = useAuth()

  const [event, setEvent] = useState<any>(null)
  const [colors, setColors] = useState<Record<string, string | null>>({ outer: null, top: null, middleware: null, bottom: null, shoes: null })
  const [photos, setPhotos] = useState<string[]>([])
  const [style, setStyle] = useState<string | null>(null)
  const [instagramId, setInstagramId] = useState(profile?.instagram_id || '')
  const [openPicker, setOpenPicker] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) return
    supabase.from('events').select('*').eq('id', eventId).single()
      .then(({ data }) => setEvent(data))
  }, [eventId])

  const filledCount = Object.values(colors).filter(Boolean).length
  const canSubmit = filledCount >= 2 && photos.length > 0 && instagramId.trim().length > 0

  const outfitHex: Record<string, string> = {}
  PARTS.forEach(p => { if (colors[p]) { const c = COLORS_60[colors[p]!]; if (c) outfitHex[p] = c.hex } })

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || photos.length >= 2) return
    const reader = new FileReader()
    reader.onload = () => { if (typeof reader.result === 'string') setCropSrc(reader.result) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSubmit = async () => {
    if (!user || !canSubmit || !eventId) return
    setSubmitting(true)
    try {
      // 사진 업로드
      const photoUrls: string[] = []
      for (const photo of photos) {
        const blob = await fetch(photo).then(r => r.blob())
        const path = `events/${eventId}/${user.id}_${Date.now()}.webp`
        const { error: upErr } = await supabase.storage.from('community').upload(path, blob, { contentType: 'image/webp' })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('community').getPublicUrl(path)
          photoUrls.push(urlData.publicUrl)
        }
      }

      const outfit: Record<string, string> = {}
      Object.entries(colors).forEach(([k, v]) => { if (v) outfit[k] = v })

      // 간이 점수 계산
      const score = 50 + Object.keys(outfit).length * 8

      const { error } = await supabase.from('event_submissions').insert({
        event_id: eventId,
        user_id: user.id,
        outfit,
        score,
        photo_urls: photoUrls,
        style: style || null,
        instagram_id: instagramId.trim(),
      })
      if (error) throw error

      setDone(true)
      setTimeout(() => navigate(`/community/event/${eventId}`, { replace: true }), 2000)
    } catch (e: any) {
      if (e.code === '23505') alert('이미 이 이벤트에 참여했어요')
      else alert('제출 실패: ' + (e.message || ''))
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return <div className="animate-screen-fade px-5 pt-6 text-center py-20 text-sm text-warm-600">로그인이 필요합니다</div>

  if (done) {
    return (
      <div className="animate-screen-fade flex items-center justify-center py-32">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-sage/20 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-sage" />
          </div>
          <div className="font-display text-lg font-bold text-warm-900">참여 완료!</div>
          <div className="text-sm text-warm-600 mt-1">결과 발표를 기다려주세요</div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      {/* 이벤트 정보 */}
      {event && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
          <div className="text-sm font-bold text-warm-900 mb-1">{event.title}</div>
          {event.reward && <div className="text-xs text-amber-700">🎁 {event.reward}</div>}
        </div>
      )}

      {/* 경고 */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5 text-xs text-red-700 leading-relaxed flex items-start gap-2">
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
        <span><b>얼굴이 보이지 않는 사진만</b> 제출해주세요. 제출 후에는 수정/삭제가 불가합니다.</span>
      </div>

      {/* 마네킹 미리보기 */}
      {filledCount > 0 && (
        <div className="flex justify-center mb-4">
          <MannequinSVG outfit={outfitHex} size={100} />
        </div>
      )}

      {/* 코디 색상 */}
      <div className="text-sm font-bold text-warm-800 mb-1">🎨 코디 색상</div>
      <div className="text-xs text-warm-500 mb-3">
        최소 2색 이상 선택해주세요{' '}
        <span className="px-1.5 py-0.5 rounded-full bg-terra-100 text-terra-600 text-[10px] font-semibold">{filledCount}/5</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2">
        {PARTS.map(part => {
          const colorKey = colors[part]
          const c = colorKey ? COLORS_60[colorKey] : null
          const isOpen = openPicker === part
          return (
            <button
              key={part}
              onClick={() => setOpenPicker(isOpen ? null : part)}
              className={`flex flex-col items-center gap-1.5 p-2.5 bg-white border ${isOpen ? 'border-terra-400 shadow-warm' : 'border-warm-400 shadow-warm-sm'} rounded-xl active:scale-95 transition-all relative`}
            >
              <div className="w-8 h-8 rounded-lg border border-warm-300 flex items-center justify-center" style={c ? { background: c.hex } : {}}>
                {!c && <span className="text-warm-400 text-xs">+</span>}
              </div>
              <div className={`text-[11px] font-semibold ${c ? 'text-terra-600' : 'text-warm-500'}`}>
                {c ? c.name : (CATEGORY_NAMES as any)[part]}
              </div>
              {c && (
                <span onClick={(e) => { e.stopPropagation(); setColors(prev => ({ ...prev, [part]: null })) }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-warm-400 text-white text-[10px] flex items-center justify-center">✕</span>
              )}
            </button>
          )
        })}
      </div>

      {openPicker && (
        <ColorPicker
          inline
          selected={colors[openPicker]}
          onSelect={(k) => { setColors(prev => ({ ...prev, [openPicker!]: k })); setOpenPicker(null) }}
        />
      )}

      {/* 착용샷 */}
      <div className="text-sm font-bold text-warm-800 mb-1 mt-5">
        📷 착용샷 <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-semibold">필수</span>
      </div>
      <div className="text-xs text-warm-500 mb-3">얼굴이 보이지 않도록 촬영해주세요 (최대 2장)</div>
      <div className="flex gap-2 mb-5">
        {photos.map((p, i) => (
          <div key={i} className="relative w-20 h-24 rounded-xl overflow-hidden flex-shrink-0 border border-warm-300">
            <img src={p} className="w-full h-full object-cover" alt="" />
            <button onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/50 text-white text-[9px] flex items-center justify-center">✕</button>
          </div>
        ))}
        {photos.length < 2 && (
          <label className="flex items-center justify-center gap-2 py-3 px-4 bg-warm-100 border border-warm-300 rounded-xl text-xs text-warm-600 cursor-pointer active:scale-95 transition-all">
            <Camera size={16} /> 사진 추가
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoAdd} />
          </label>
        )}
      </div>

      {/* 스타일 */}
      <div className="text-sm font-bold text-warm-800 mb-2">👔 스타일 <span className="text-[10px] font-normal text-warm-400">(선택)</span></div>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {Object.entries(STYLE_GUIDE).map(([k, v]) => (
          <button key={k} onClick={() => setStyle(style === k ? null : k)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${style === k ? 'bg-warm-800 text-white' : 'bg-warm-100 text-warm-600 active:scale-95'}`}>
            {v.name.replace(/ 룩$/, '')}
          </button>
        ))}
      </div>

      {/* 인스타그램 ID (필수) */}
      <div className="text-sm font-bold text-warm-800 mb-1">📸 인스타그램 ID <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-semibold">필수</span></div>
      <div className="text-xs text-warm-500 mb-2">당첨 시 연락을 위해 필요해요</div>
      <input
        type="text"
        value={instagramId}
        onChange={e => setInstagramId(e.target.value.replace(/[^a-zA-Z0-9._]/g, ''))}
        placeholder="인스타그램 ID (@제외)"
        className="w-full px-4 py-3 bg-white border border-warm-400 rounded-2xl text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:border-terra-400 transition-all mb-5"
      />

      {/* CTA */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className={`w-full py-3.5 ${canSubmit ? 'bg-terra-500 shadow-terra' : 'bg-warm-400'} text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50`}
      >
        {submitting ? '제출 중...' : '🎨 참여하기'}
      </button>

      {!canSubmit && (
        <div className="text-center text-[11px] text-warm-500 mt-2">
          {filledCount < 2 ? '색상 2개 이상' : ''}{' '}
          {photos.length === 0 ? '착용샷 필수' : ''}{' '}
          {!instagramId.trim() ? '인스타 ID 필수' : ''}
        </div>
      )}

      {/* 4:5 크롭 UI */}
      {cropSrc && <CropOverlay src={cropSrc} ratio={4/5} onDone={(url) => { setPhotos(prev => [...prev, url]); setCropSrc(null) }} onCancel={() => setCropSrc(null)} />}
    </div>
  )
}
