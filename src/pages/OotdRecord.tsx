import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Palette, Image, Tag, Smile, Eye, Calendar, Check, Camera, Lock, Users, Globe, X, Pencil, ChevronDown } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import ColorPicker from '@/components/ui/ColorPicker'
import ImageEditor from '@/components/ui/ImageEditor'
import CropOverlay from '@/components/ui/CropOverlay'
import { COLORS_60 } from '@/lib/colors'
import { useOotd } from '@/hooks/useOotd'
import { useAuth } from '@/contexts/AuthContext'

const PARTS = ['top', 'middleware', 'bottom', 'outer', 'shoes', 'scarf', 'hat'] as const
const PART_LABELS: Record<string, string> = {
  top: '상의(이너)', middleware: '미들웨어', bottom: '하의',
  outer: '아우터', shoes: '신발', scarf: '목도리', hat: '모자',
}
const SITUATIONS = ['출근', '데이트', '캐주얼', '면접', '여행', '운동']
const MOODS = [
  { emoji: '😊', text: '만족' },
  { emoji: '😐', text: '그저그럭' },
  { emoji: '😕', text: '아쉬움' },
]

export default function OotdRecord() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const ootd = useOotd()

  // 편집 모드 로드 (#10)
  useEffect(() => {
    const editData = localStorage.getItem("_ootd_edit")
    if (editData) {
      try {
        const rec = JSON.parse(editData)
        ootd.startEdit(rec)
        localStorage.removeItem("_ootd_edit")
      } catch {}
    }
  }, [])
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [customSit, setCustomSit] = useState(false)
  const [editingPhotoIdx, setEditingPhotoIdx] = useState<number | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [optionsExpanded, setOptionsExpanded] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // 마네킹 미리보기용 hex 변환
  const outfitHex: Record<string, string> = {}
  PARTS.forEach(p => {
    if (ootd.colors[p]) {
      const c = COLORS_60[ootd.colors[p]!]
      if (c) outfitHex[p] = c.hex
    }
  })

  const handleSave = () => {
    if (!ootd.canSave) {
      setSaveError('2색 이상 선택해주세요')
      setTimeout(() => setSaveError(''), 2000)
      return
    }
    if (ootd.needsPhoto) {
      setSaveError('전체 공개는 착용샷이 필수예요')
      setTimeout(() => setSaveError(''), 2000)
      return
    }
    try {
      const ok = ootd.saveRecord()
      if (ok) {
        setSaved(true)
        setTimeout(() => {
          setSaved(false)
          ootd.resetForm()
          navigate('/closet')
        }, 1500)
      } else {
        setSaveError('저장에 실패했어요. 다시 시도해주세요')
        setTimeout(() => setSaveError(''), 2000)
      }
    } catch (e) {
      console.error('Save error:', e)
      setSaveError('저장 중 오류가 발생했어요')
      setTimeout(() => setSaveError(''), 2000)
    }
  }

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setCropSrc(reader.result)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleCropDone = (croppedDataUrl: string) => {
    ootd.addPhoto(croppedDataUrl)
    setCropSrc(null)
  }

  if (saved) {
    // 연속 기록 정보
    let streakMsg = ''
    try {
      const records = JSON.parse(localStorage.getItem('sp_ootd_records') || '[]')
      if (records.length >= 7) streakMsg = `${records.length}일째 기록 중! 🔥`
      else if (records.length >= 3) streakMsg = `${records.length}일 연속 기록!`
    } catch {}

    return (
      <div className="animate-screen-fade flex items-center justify-center py-28">
        <div className="text-center relative">
          {/* 축하 파티클 */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden -top-8">
            {['✨', '🎉', '⭐', '💫'].map((emoji, i) => (
              <span
                key={i}
                className="absolute text-xl animate-confetti"
                style={{
                  left: `${10 + i * 22}%`,
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: `${1.3 + i * 0.15}s`,
                }}
              >
                {emoji}
              </span>
            ))}
          </div>

          <div className="w-20 h-20 rounded-full bg-sage/20 flex items-center justify-center mx-auto mb-4 animate-score-count">
            <Check size={36} className="text-sage" />
          </div>
          <div className="font-display text-xl font-bold text-warm-900 mb-1">기록 완료!</div>
          <div className="text-sm text-warm-600">오늘의 코디가 저장되었어요</div>
          {streakMsg && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-terra-50 border border-terra-200 rounded-full text-[13px] font-semibold text-terra-600 animate-pop-in">
              {streakMsg}
            </div>
          )}
        </div>
      </div>
    )
  }

  const isReady = ootd.filledCount >= 2
  // 편집 모드면 항상 확장
  const showOptions = isReady && (optionsExpanded || !!ootd.editId)

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">

      {/* 마네킹 미리보기 */}
      {ootd.filledCount > 0 && (
        <div className="flex justify-center mb-3">
          <MannequinSVG outfit={outfitHex} size={90} />
        </div>
      )}

      {/* 날씨 표시 */}
      {ootd.weatherData && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl text-sm">
          <span>{ootd.weatherData.code !== undefined ? (ootd.weatherData.code === 0 ? '☀️' : ootd.weatherData.code <= 3 ? '⛅' : ootd.weatherData.code <= 67 ? '🌧️' : '❄️') : '🌤️'}</span>
          <span className="text-warm-800 dark:text-warm-200">{ootd.weatherData.temp}°C</span>
          <span className="text-warm-500 text-xs">체감 {ootd.weatherData.feels}°C</span>
        </div>
      )}

      {/* ═══ 필수: 컬러 조합 ═══ */}
      <Section icon={<Palette size={13} />} label="컬러 조합" badge="필수">
        <div className="grid grid-cols-3 gap-2 mb-2">
          {PARTS.map(part => {
            const colorKey = ootd.colors[part]
            const c = colorKey ? COLORS_60[colorKey] : null
            const isOpen = ootd.openPicker === part
            return (
              <button
                key={part}
                onClick={() => ootd.setOpenPicker(isOpen ? null : part)}
                className={`flex flex-col items-center gap-1.5 p-2.5 bg-white dark:bg-warm-800 border ${
                  isOpen ? 'border-terra-400 shadow-warm' : 'border-warm-400 dark:border-warm-600 shadow-warm-sm'
                } rounded-xl active:scale-95 transition-all relative`}
              >
                <div
                  className="w-8 h-8 rounded-lg border border-warm-300 flex items-center justify-center"
                  style={c ? { background: c.hex } : {}}
                >
                  {!c && <span className="text-warm-500 text-[10px]">+</span>}
                </div>
                <div className={`text-[11px] font-semibold ${c ? 'text-terra-600' : 'text-warm-500'}`}>
                  {c ? c.name : PART_LABELS[part]}
                </div>
                {c && (
                  <span
                    onClick={(e) => { e.stopPropagation(); ootd.clearColor(part) }}
                    role="button"
                    aria-label={`${PART_LABELS[part]} 색상 제거`}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-warm-400 text-white text-[10px] flex items-center justify-center"
                  >✕</span>
                )}
              </button>
            )
          })}
        </div>

        {ootd.openPicker && (
          <ColorPicker
            inline
            selected={ootd.colors[ootd.openPicker]}
            onSelect={(k) => ootd.selectColor(ootd.openPicker!, k)}
            onClear={() => ootd.clearColor(ootd.openPicker!)}
          />
        )}
      </Section>

      {/* 선택 상태 안내 — 2색 미만 */}
      {!isReady && (
        <div className="mb-4 text-center text-[12px] text-warm-500 dark:text-warm-400 bg-warm-100 dark:bg-warm-800 rounded-xl py-3">
          컬러를 <span className="font-bold text-terra-500">{2 - ootd.filledCount}개</span> 더 선택하면 기록할 수 있어요
        </div>
      )}

      {/* ═══ 선택 섹션 게이트 ═══ */}
      {isReady && !showOptions && (
        <button
          onClick={() => setOptionsExpanded(true)}
          className="w-full flex items-center justify-center gap-2 py-3 mb-4 bg-warm-100 dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl text-[12px] text-warm-600 dark:text-warm-400 font-medium active:scale-[0.98] transition-all"
        >
          <ChevronDown size={14} />
          사진 · 상황 · 기분 · 공개범위 설정하기
        </button>
      )}

      {/* ═══ 선택 섹션들 (프로그레시브 디스클로저) ═══ */}
      {showOptions && (
        <div className="animate-screen-fade">
          {/* 코디 사진 */}
          <Section
            icon={<Image size={13} />}
            label="코디 사진"
            badge={ootd.visibility === 'public' ? '필수 (착용샷)' : '선택'}
            badgeColor={ootd.visibility === 'public' ? 'red' : 'default'}
            extra={ootd.photos.length > 0 ? `${ootd.photos.length}/4` : undefined}
          >
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {ootd.photos.map((photo, idx) => (
                <div key={idx} className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative group">
                  <img src={photo} className="w-full h-full object-cover" alt="" />
                  <button
                    onClick={() => setEditingPhotoIdx(idx)}
                    className="absolute bottom-0.5 left-0.5 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center"
                  ><Pencil size={9} /></button>
                  <button
                    onClick={() => ootd.removePhoto(idx)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/50 text-white text-[10px] flex items-center justify-center"
                  >✕</button>
                </div>
              ))}
              {ootd.photos.length < 4 && (
                <label className="w-16 h-16 rounded-xl border-2 border-dashed border-warm-400 dark:border-warm-600 flex flex-col items-center justify-center cursor-pointer flex-shrink-0 active:scale-95 transition-all bg-warm-100 dark:bg-warm-800">
                  <Camera size={18} className="text-warm-600 dark:text-warm-400" />
                  <span className="text-[9px] text-warm-500 mt-0.5">추가</span>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoAdd} />
                </label>
              )}
            </div>
          </Section>

          {/* 상황 */}
          <Section icon={<Tag size={13} />} label="상황">
            <div className="flex flex-wrap gap-1.5">
              {SITUATIONS.map(s => (
                <button
                  key={s}
                  onClick={() => { setCustomSit(false); ootd.setSituation(ootd.situation === s ? null : s) }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    ootd.situation === s ? 'bg-terra-500 text-white shadow-terra' : 'bg-white border border-warm-400 text-warm-700 active:scale-95'
                  }`}
                >{s}</button>
              ))}
              <button
                onClick={() => { setCustomSit(!customSit); ootd.setSituation(null) }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  customSit ? 'bg-terra-500 text-white shadow-terra' : 'bg-white border border-warm-400 text-warm-700 active:scale-95'
                }`}
              >✏️ 직접 입력</button>
            </div>
            {customSit && (
              <input
                autoFocus
                type="text"
                placeholder="직접 입력 (예: 소개팅, 결혼식...)"
                maxLength={20}
                className="w-full mt-2 bg-white border border-warm-400 rounded-xl px-3 py-2 text-xs text-warm-900 placeholder-warm-500 outline-none focus:border-terra-400 transition-all"
                onChange={e => ootd.setSituation(e.target.value || null)}
              />
            )}
          </Section>

          {/* 기분 */}
          <Section icon={<Smile size={13} />} label="기분">
            <div className="flex flex-wrap gap-1.5">
              {MOODS.map(m => {
                const val = m.emoji + ' ' + m.text
                return (
                  <button
                    key={val}
                    onClick={() => ootd.setMood(ootd.mood === val ? null : val)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      ootd.mood === val ? 'bg-terra-500 text-white shadow-terra' : 'bg-white border border-warm-400 text-warm-700 active:scale-95'
                    }`}
                  >{val}</button>
                )
              })}
            </div>
          </Section>

          {/* 메모 */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="💬 한줄 메모 (선택)"
              maxLength={100}
              value={ootd.memo}
              onChange={e => ootd.setMemo(e.target.value)}
              className="w-full bg-white border border-warm-400 rounded-xl px-3 py-2.5 text-xs text-warm-900 placeholder-warm-500 outline-none focus:border-terra-400 transition-all"
            />
          </div>

          {/* 공개 범위 */}
          <Section icon={<Eye size={13} />} label="공개 범위">
            <div className="flex gap-2">
              {[
                { key: 'private', icon: <Lock size={13} />, label: '비공개' },
                { key: 'friends', icon: <Users size={13} />, label: '친구 공개' },
                { key: 'public', icon: <Globe size={13} />, label: '전체 공개' },
              ].map(v => (
                <button
                  key={v.key}
                  onClick={() => ootd.setVisibility(v.key as any)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    ootd.visibility === v.key ? 'bg-terra-500 text-white shadow-terra' : 'bg-white border border-warm-400 text-warm-700'
                  }`}
                >{v.icon} {v.label}</button>
              ))}
            </div>

            {ootd.visibility === 'public' && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-3.5 py-2.5">
                <div className="text-xs font-semibold text-green-800 mb-0.5">🌐 전체 공개</div>
                <div className="text-[10px] text-green-700">기록 시 커뮤니티에 바로 공개돼요 · 착용샷 필수</div>
              </div>
            )}
            {ootd.visibility === 'friends' && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5">
                <div className="text-xs font-semibold text-blue-800 mb-0.5">👫 친구 공개</div>
                <div className="text-[10px] text-blue-700">서로 팔로우한 친구만 볼 수 있어요</div>
              </div>
            )}

            {(ootd.visibility === 'public' || ootd.visibility === 'friends') && profile?.instagram_id && (
              <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl px-4 py-3 mt-2.5">
                <div>
                  <div className="text-sm font-medium text-warm-900">📸 인스타그램 홍보</div>
                  <div className="text-[10px] text-warm-500">@{profile.instagram_id}</div>
                </div>
                <button
                  onClick={() => ootd.setShowInstagram(!ootd.showInstagram)}
                  role="switch"
                  aria-checked={ootd.showInstagram}
                  aria-label="인스타그램 홍보"
                  className={`w-11 h-6 rounded-full transition-all ${ootd.showInstagram ? 'bg-terra-500' : 'bg-warm-400'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${ootd.showInstagram ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* 이미지 편집기 오버레이 */}
      {editingPhotoIdx !== null && ootd.photos[editingPhotoIdx] && (
        <ImageEditor
          src={ootd.photos[editingPhotoIdx]}
          onSave={(dataUrl) => {
            ootd.replacePhoto(editingPhotoIdx, dataUrl)
            setEditingPhotoIdx(null)
          }}
          onCancel={() => setEditingPhotoIdx(null)}
        />
      )}

      {/* 4:5 크롭 UI */}
      {cropSrc && <CropOverlay src={cropSrc} ratio={4/5} onDone={handleCropDone} onCancel={() => setCropSrc(null)} />}

      {/* 필수 사진 경고 */}
      {ootd.needsPhoto && (
        <div className="mb-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
          <div className="text-xs font-semibold text-red-700">📸 전체 공개는 착용샷이 필수예요</div>
          <div className="text-[10px] text-red-600">사진을 추가하거나 공개 범위를 변경해주세요</div>
        </div>
      )}

      {/* 에러 피드백 */}
      {saveError && (
        <div className="mb-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3.5 py-2.5 animate-screen-fade">
          <div className="text-xs font-semibold text-red-700 dark:text-red-400">{saveError}</div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleSave}
        className={`w-full py-3.5 ${ootd.canSave && !ootd.needsPhoto ? 'bg-terra-500 shadow-terra active:scale-[0.98]' : 'bg-warm-400 dark:bg-warm-600 opacity-60 cursor-not-allowed'} text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all mb-2`}
      >
        <Check size={16} /> {ootd.editId ? '수정 완료' : '기록하기'}
      </button>

      <button
        onClick={() => navigate('/closet')}
        className="w-full py-3 bg-white border border-warm-400 text-warm-800 rounded-2xl font-medium text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
      >
        <Calendar size={14} /> 코디 캘린더 보기
      </button>
    </div>
  )
}

// ─── 섹션 래퍼 ───
function Section({ icon, label, badge, badgeColor, extra, children }: {
  icon: React.ReactNode, label: string, badge?: string, badgeColor?: string, extra?: string, children: React.ReactNode
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-warm-600 tracking-widest uppercase mb-2">
        {icon} {label}
        {badge && (
          <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            badgeColor === 'red' ? 'bg-red-100 text-red-600' : 'bg-terra-100 text-terra-600'
          }`}>{badge}</span>
        )}
        {extra && <span className="ml-auto text-[11px] text-warm-500 normal-case tracking-normal">{extra}</span>}
      </div>
      {children}
    </div>
  )
}
