// @ts-nocheck
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Palette, Image, Tag, Smile, Eye, Calendar, Check, Camera, Lock, Users, Globe, X, Pencil, ChevronDown, Plus } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import ColorPicker from '@/components/ui/ColorPicker'
import ImageEditor from '@/components/ui/ImageEditor'
import CropOverlay from '@/components/ui/CropOverlay'
import { COLORS_60 } from '@/lib/colors'
import { ITEMS_CATALOG } from '@/lib/styles'
import { useOotd } from '@/hooks/useOotd'
import { useAuth } from '@/contexts/AuthContext'
import { trackOotdRecord } from '@/lib/analytics'

// 아이템 → 슬롯 매핑
function itemToSlot(itemId: string): string | null {
  const item = ITEMS_CATALOG.find(i => i.id === itemId)
  if (!item) return null
  if (item.outerType) return 'outer'
  if (item.midType) return 'middleware'
  if (item.slot === 'scarf') return 'scarf'
  if (item.slot === 'hat') return 'hat'
  return 'top'
}

// 슬롯 → 아이템 역매핑 (편집 시 기존 레코드에서 추정)
function slotToDefaultItem(slot: string): string | null {
  if (slot === 'outer') return 'jacket'
  if (slot === 'middleware') return 'knit'
  if (slot === 'scarf') return 'scarf'
  if (slot === 'hat') return 'hat'
  if (slot === 'top') return 'tshirt'
  return null
}

const SITUATIONS = ['출근', '데이트', '캐주얼', '면접', '여행', '운동']
const MOODS = [
  { emoji: '😊', text: '만족' },
  { emoji: '😐', text: '그저그럭' },
  { emoji: '😕', text: '아쉬움' },
]

// 하의/신발 전용 라벨
const FIXED_PARTS = [
  { slot: 'bottom', label: '하의', emoji: '👖' },
  { slot: 'shoes', label: '신발', emoji: '👟' },
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
        // 기존 레코드에서 선택된 아이템 복원
        const restored: string[] = []
        Object.entries(rec.colors || {}).forEach(([slot, v]) => {
          if (v && slot !== 'bottom' && slot !== 'shoes') {
            const defItem = slotToDefaultItem(slot)
            if (defItem) restored.push(defItem)
          }
        })
        if (restored.length > 0) setPickedItems(restored)
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

  // ─── 아이템 선택 상태 ───
  const [pickedItems, setPickedItems] = useState<string[]>([])
  const [activeSlot, setActiveSlot] = useState<string | null>(null)

  // 선택된 아이템에서 활성 슬롯 목록 산출
  const upperSlots: { slot: string; itemId: string; label: string; emoji: string }[] = []
  const usedSlots = new Set<string>()
  pickedItems.forEach(itemId => {
    const item = ITEMS_CATALOG.find(i => i.id === itemId)
    if (!item) return
    const slot = itemToSlot(itemId)
    if (!slot || usedSlots.has(slot)) return
    usedSlots.add(slot)
    upperSlots.push({ slot, itemId, label: item.label, emoji: item.emoji })
  })

  // 마네킹 hex
  const outfitHex: Record<string, string> = {}
  const allSlots = [...upperSlots.map(u => u.slot), 'bottom', 'shoes']
  allSlots.forEach(s => {
    const colorKey = ootd.colors[s]
    if (colorKey) {
      const c = COLORS_60[colorKey]
      if (c) outfitHex[s] = c.hex
    }
  })

  // 아이템 토글
  const toggleItem = (itemId: string) => {
    const slot = itemToSlot(itemId)
    if (!slot) return

    if (pickedItems.includes(itemId)) {
      // 제거
      setPickedItems(prev => prev.filter(id => id !== itemId))
      ootd.clearColor(slot)
      if (activeSlot === slot) setActiveSlot(null)
    } else {
      // 같은 슬롯의 기존 아이템 교체
      setPickedItems(prev => {
        const without = prev.filter(id => itemToSlot(id) !== slot)
        return [...without, itemId]
      })
      // 슬롯이 바뀌면 기존 컬러 유지 (같은 슬롯이면)
      setActiveSlot(slot)
    }
  }

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
        trackOotdRecord(ootd.photos.length > 0, ootd.visibility)
        setSaved(true)
        setTimeout(() => {
          setSaved(false)
          ootd.resetForm()
          setPickedItems([])
          setActiveSlot(null)
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
    reader.onload = () => { if (typeof reader.result === 'string') setCropSrc(reader.result) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleCropDone = (croppedDataUrl: string) => {
    ootd.addPhoto(croppedDataUrl)
    setCropSrc(null)
  }

  // ─── 저장 완료 ───
  if (saved) {
    let streakMsg = ''
    try {
      const records = JSON.parse(localStorage.getItem('sp_ootd_records') || '[]')
      if (records.length >= 7) streakMsg = `${records.length}일째 기록 중! 🔥`
      else if (records.length >= 3) streakMsg = `${records.length}일 연속 기록!`
    } catch {}
    return (
      <div className="animate-screen-fade flex items-center justify-center py-28">
        <div className="text-center relative">
          <div className="absolute inset-0 pointer-events-none overflow-hidden -top-8">
            {['✨', '🎉', '⭐', '💫'].map((emoji, i) => (
              <span key={i} className="absolute text-xl animate-confetti"
                style={{ left: `${10 + i * 22}%`, animationDelay: `${i * 0.2}s`, animationDuration: `${1.3 + i * 0.15}s` }}>
                {emoji}
              </span>
            ))}
          </div>
          <div className="w-20 h-20 rounded-full bg-sage/20 flex items-center justify-center mx-auto mb-4 animate-score-count">
            <Check size={36} className="text-sage" />
          </div>
          <div className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 mb-1">기록 완료!</div>
          <div className="text-sm text-warm-600 dark:text-warm-400">오늘의 코디가 저장되었어요</div>
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
  const showOptions = isReady && (optionsExpanded || !!ootd.editId)

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">

      {/* 마네킹 미리보기 */}
      {ootd.filledCount > 0 && (
        <div className="flex justify-center mb-3">
          <MannequinSVG outfit={outfitHex} size={90} />
        </div>
      )}

      {/* 날씨 */}
      {ootd.weatherData && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl text-sm">
          <span>{ootd.weatherData.code !== undefined ? (ootd.weatherData.code === 0 ? '☀️' : ootd.weatherData.code <= 3 ? '⛅' : ootd.weatherData.code <= 67 ? '🌧️' : '❄️') : '🌤️'}</span>
          <span className="text-warm-800 dark:text-warm-200">{ootd.weatherData.temp}°C</span>
          <span className="text-warm-500 text-xs">체감 {ootd.weatherData.feels}°C</span>
        </div>
      )}

      {/* ═══ 오늘 뭘 입었나요? — 아이템 선택 ═══ */}
      <Section icon={<Palette size={13} />} label="오늘 뭘 입었나요?" badge="필수">

        {/* 의류 아이템 그리드 */}
        <div className="text-[10px] font-semibold text-warm-500 dark:text-warm-400 mb-1.5">의류</div>
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {ITEMS_CATALOG.filter(i => !i.slot).map(item => {
            const selected = pickedItems.includes(item.id)
            // 같은 슬롯에 다른 아이템이 선택되어 있으면 disabled
            const slot = itemToSlot(item.id)
            const slotTaken = slot && usedSlots.has(slot) && !selected
            return (
              <button key={item.id} onClick={() => toggleItem(item.id)} disabled={false}
                className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl text-center transition-all active:scale-93 ${
                  selected
                    ? 'bg-terra-50 dark:bg-terra-900/30 border-[1.5px] border-terra-400 shadow-warm'
                    : slotTaken
                      ? 'bg-warm-50 dark:bg-warm-800 border border-warm-200 dark:border-warm-700 opacity-40'
                      : 'bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600'
                }`}>
                <span className="text-lg">{item.emoji}</span>
                <span className={`text-[9px] font-semibold ${selected ? 'text-terra-700 dark:text-terra-400' : 'text-warm-700 dark:text-warm-300'}`}>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* 악세서리 */}
        <div className="text-[10px] font-semibold text-warm-500 dark:text-warm-400 mb-1.5">악세서리</div>
        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {ITEMS_CATALOG.filter(i => i.slot).map(item => {
            const selected = pickedItems.includes(item.id)
            return (
              <button key={item.id} onClick={() => toggleItem(item.id)}
                className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl text-center transition-all active:scale-93 ${
                  selected
                    ? 'bg-terra-50 dark:bg-terra-900/30 border-[1.5px] border-terra-400 shadow-warm'
                    : 'bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600'
                }`}>
                <span className="text-lg">{item.emoji}</span>
                <span className={`text-[9px] font-semibold ${selected ? 'text-terra-700 dark:text-terra-400' : 'text-warm-700 dark:text-warm-300'}`}>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* ═══ 컬러 선택 — 선택된 아이템 + 하의 + 신발 ═══ */}
        {(upperSlots.length > 0 || ootd.colors.bottom || ootd.colors.shoes) && (
          <div className="text-[10px] font-semibold text-warm-500 dark:text-warm-400 mb-1.5 mt-2">컬러를 골라주세요</div>
        )}

        <div className="flex flex-wrap gap-1.5 mb-2">
          {/* 선택된 상체 아이템 */}
          {upperSlots.map(({ slot, label, emoji }) => {
            const colorKey = ootd.colors[slot]
            const c = colorKey ? COLORS_60[colorKey] : null
            const isOpen = activeSlot === slot
            return (
              <button key={slot} onClick={() => setActiveSlot(isOpen ? null : slot)}
                className={`flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-warm-800 border ${
                  isOpen ? 'border-terra-400 shadow-warm' : 'border-warm-400 dark:border-warm-600'
                } rounded-xl active:scale-95 transition-all relative`}>
                {c ? (
                  <span className="w-6 h-6 rounded-lg border border-warm-300" style={{ background: c.hex }} />
                ) : (
                  <span className="w-6 h-6 rounded-lg border border-warm-300 dark:border-warm-500 flex items-center justify-center text-warm-400 text-[10px]">+</span>
                )}
                <span className={`text-[11px] font-semibold ${c ? 'text-terra-600 dark:text-terra-400' : 'text-warm-500'}`}>
                  {c ? c.name : label}
                </span>
                {c && (
                  <span onClick={(e) => { e.stopPropagation(); ootd.clearColor(slot); setActiveSlot(null) }}
                    className="ml-0.5 w-4 h-4 rounded-full bg-warm-400 text-white text-[8px] flex items-center justify-center">✕</span>
                )}
              </button>
            )
          })}

          {/* 하의 + 신발 (항상 표시) */}
          {FIXED_PARTS.map(({ slot, label, emoji }) => {
            const colorKey = ootd.colors[slot]
            const c = colorKey ? COLORS_60[colorKey] : null
            const isOpen = activeSlot === slot
            return (
              <button key={slot} onClick={() => setActiveSlot(isOpen ? null : slot)}
                className={`flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-warm-800 border ${
                  isOpen ? 'border-terra-400 shadow-warm' : 'border-warm-400 dark:border-warm-600'
                } rounded-xl active:scale-95 transition-all relative`}>
                {c ? (
                  <span className="w-6 h-6 rounded-lg border border-warm-300" style={{ background: c.hex }} />
                ) : (
                  <span className="w-6 h-6 rounded-lg border border-warm-300 dark:border-warm-500 flex items-center justify-center text-warm-400 text-[10px]">{emoji}</span>
                )}
                <span className={`text-[11px] font-semibold ${c ? 'text-terra-600 dark:text-terra-400' : 'text-warm-500'}`}>
                  {c ? c.name : label}
                </span>
                {c && (
                  <span onClick={(e) => { e.stopPropagation(); ootd.clearColor(slot); setActiveSlot(null) }}
                    className="ml-0.5 w-4 h-4 rounded-full bg-warm-400 text-white text-[8px] flex items-center justify-center">✕</span>
                )}
              </button>
            )
          })}
        </div>

        {/* 컬러 피커 */}
        {activeSlot && (
          <ColorPicker
            inline
            selected={ootd.colors[activeSlot]}
            onSelect={(k) => { ootd.selectColor(activeSlot, k); setActiveSlot(null) }}
            onClear={() => { ootd.clearColor(activeSlot); setActiveSlot(null) }}
          />
        )}
      </Section>

      {/* 안내 */}
      {!isReady && (
        <div className="mb-4 text-center text-[12px] text-warm-500 dark:text-warm-400 bg-warm-100 dark:bg-warm-800 rounded-xl py-3">
          {pickedItems.length === 0
            ? '위에서 오늘 입은 옷을 골라주세요'
            : <>컬러를 <span className="font-bold text-terra-500">{2 - ootd.filledCount}개</span> 더 선택하면 기록할 수 있어요</>
          }
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

      {/* ═══ 선택 섹션들 ═══ */}
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
                  <button onClick={() => setEditingPhotoIdx(idx)}
                    className="absolute bottom-0.5 left-0.5 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center">
                    <Pencil size={9} />
                  </button>
                  <button onClick={() => ootd.removePhoto(idx)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/50 text-white text-[10px] flex items-center justify-center">✕</button>
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
                <button key={s} onClick={() => { setCustomSit(false); ootd.setSituation(ootd.situation === s ? null : s) }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    ootd.situation === s ? 'bg-terra-500 text-white shadow-terra' : 'bg-white border border-warm-400 text-warm-700 active:scale-95'
                  }`}>{s}</button>
              ))}
              <button onClick={() => { setCustomSit(!customSit); ootd.setSituation(null) }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  customSit ? 'bg-terra-500 text-white shadow-terra' : 'bg-white border border-warm-400 text-warm-700 active:scale-95'
                }`}>✏️ 직접 입력</button>
            </div>
            {customSit && (
              <input autoFocus type="text" placeholder="직접 입력 (예: 소개팅, 결혼식...)" maxLength={20}
                className="w-full mt-2 bg-white border border-warm-400 rounded-xl px-3 py-2 text-xs text-warm-900 placeholder-warm-500 outline-none focus:border-terra-400 transition-all"
                onChange={e => ootd.setSituation(e.target.value || null)} />
            )}
          </Section>

          {/* 기분 */}
          <Section icon={<Smile size={13} />} label="기분">
            <div className="flex flex-wrap gap-1.5">
              {MOODS.map(m => {
                const val = m.emoji + ' ' + m.text
                return (
                  <button key={val} onClick={() => ootd.setMood(ootd.mood === val ? null : val)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      ootd.mood === val ? 'bg-terra-500 text-white shadow-terra' : 'bg-white border border-warm-400 text-warm-700 active:scale-95'
                    }`}>{val}</button>
                )
              })}
            </div>
          </Section>

          {/* 메모 */}
          <div className="mb-4">
            <input type="text" placeholder="💬 한줄 메모 (선택)" maxLength={100}
              value={ootd.memo} onChange={e => ootd.setMemo(e.target.value)}
              className="w-full bg-white border border-warm-400 rounded-xl px-3 py-2.5 text-xs text-warm-900 placeholder-warm-500 outline-none focus:border-terra-400 transition-all" />
          </div>

          {/* 공개 범위 */}
          <Section icon={<Eye size={13} />} label="공개 범위">
            <div className="flex gap-2">
              {[
                { key: 'private', icon: <Lock size={13} />, label: '비공개' },
                { key: 'friends', icon: <Users size={13} />, label: '친구 공개' },
                { key: 'public', icon: <Globe size={13} />, label: '전체 공개' },
              ].map(v => (
                <button key={v.key} onClick={() => ootd.setVisibility(v.key as any)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    ootd.visibility === v.key ? 'bg-terra-500 text-white shadow-terra' : 'bg-white border border-warm-400 text-warm-700'
                  }`}>{v.icon} {v.label}</button>
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
                <button onClick={() => ootd.setShowInstagram(!ootd.showInstagram)}
                  role="switch" aria-checked={ootd.showInstagram} aria-label="인스타그램 홍보"
                  className={`w-11 h-6 rounded-full transition-all ${ootd.showInstagram ? 'bg-terra-500' : 'bg-warm-400'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${ootd.showInstagram ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* 이미지 편집기 */}
      {editingPhotoIdx !== null && ootd.photos[editingPhotoIdx] && (
        <ImageEditor src={ootd.photos[editingPhotoIdx]}
          onSave={(dataUrl) => { ootd.replacePhoto(editingPhotoIdx, dataUrl); setEditingPhotoIdx(null) }}
          onCancel={() => setEditingPhotoIdx(null)} />
      )}

      {/* 4:5 크롭 */}
      {cropSrc && <CropOverlay src={cropSrc} ratio={4/5} onDone={handleCropDone} onCancel={() => setCropSrc(null)} />}

      {/* 필수 사진 경고 */}
      {ootd.needsPhoto && (
        <div className="mb-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
          <div className="text-xs font-semibold text-red-700">📸 전체 공개는 착용샷이 필수예요</div>
          <div className="text-[10px] text-red-600">사진을 추가하거나 공개 범위를 변경해주세요</div>
        </div>
      )}

      {/* 에러 */}
      {saveError && (
        <div className="mb-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3.5 py-2.5 animate-screen-fade">
          <div className="text-xs font-semibold text-red-700 dark:text-red-400">{saveError}</div>
        </div>
      )}

      {/* CTA */}
      <button onClick={handleSave}
        className={`w-full py-3.5 ${ootd.canSave && !ootd.needsPhoto ? 'bg-terra-500 shadow-terra active:scale-[0.98]' : 'bg-warm-400 dark:bg-warm-600 opacity-60 cursor-not-allowed'} text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all mb-2`}>
        <Check size={16} /> {ootd.editId ? '수정 완료' : '기록하기'}
      </button>

      <button onClick={() => navigate('/closet')}
        className="w-full py-3 bg-white border border-warm-400 text-warm-800 rounded-2xl font-medium text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
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
