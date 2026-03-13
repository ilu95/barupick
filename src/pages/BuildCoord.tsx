// @ts-nocheck
import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Bookmark, Share, Users, Palette, Scissors, ChevronRight, Sparkles, Check, ThumbsUp, ThumbsDown, Minus, RefreshCw, Wind, Thermometer, Plus, X } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import { useToast } from '@/components/ui/Toast'
import ColorPicker from '@/components/ui/ColorPicker'
import { COLORS_60 } from '@/lib/colors'
import { MOOD_GROUPS, STYLE_GUIDE, STYLE_ICONS, ITEMS_CATALOG } from '@/lib/styles'
import { CATEGORY_NAMES, FABRIC_ITEMS, FABRIC_SEASONS, FABRIC_COMPAT_RULES, getFabricCompat, evaluateFabricCombo } from '@/lib/categories'
import { useBuild, type BuildStep, type BuildHook, type EditMode, upperToOutfit, getFilledOutfit, getSlotKey, getSlotLabel, sortUpper, getOuterType, getMidType } from '@/hooks/useBuild'
import { profile } from '@/lib/profile'
import { trackSave, trackClick } from '@/lib/analytics'
import { useWeather, weatherEmoji, getLayerAdvice } from '@/hooks/useWeather'
import { getScorePercentile } from '@/hooks/useWardrobe'

type BH = BuildHook

// ═══════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════
export default function BuildCoord() {
  const navigate = useNavigate()
  const build = useBuild('coord')

  return (
    <div className="min-h-screen dark:bg-[#1C1917]">
      <div className="max-w-[480px] mx-auto px-5 py-4 pb-8">
        {build.step === 'style' && <StepStyle build={build} />}
        {build.step === 'builder' && <StepBuilder build={build} navigate={navigate} />}
        {build.step === 'fabric' && <StepFabric build={build} />}
        {build.step === 'result' && <StepResult build={build} navigate={navigate} />}
        {build.step === 'improve' && <StepImprove build={build} />}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// Step 1: 스타일 선택
// ═══════════════════════════════════════
function StepStyle({ build }: { build: BH }) {
  return (
    <div className="animate-screen-fade">
      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-2">스타일 선택</h2>
      <p className="text-sm text-warm-600 dark:text-warm-400 mb-5">스타일에 맞는 컬러를 추천해 드려요. 건너뛰기도 가능합니다.</p>

      {Object.entries(MOOD_GROUPS).map(([key, group]) => (
        <div key={key} className="mb-5">
          <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-wide mb-2.5">{group.icon} {group.name}</div>
          <div className="flex flex-wrap gap-2">
            {group.styles.map((s: string) => {
              const sd = STYLE_GUIDE[s]
              const icon = (STYLE_ICONS as any)?.[s] || '🎨'
              return (
                <button key={s} onClick={() => build.selectStyle(s)}
                  className="px-4 py-2.5 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl text-sm font-medium text-warm-800 dark:text-warm-200 shadow-warm-sm active:scale-[0.97] transition-all">
                  {icon} {sd?.name || s}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <div className="h-px bg-warm-400 dark:bg-warm-600 my-4" />
      <div className="flex items-center justify-between py-2 mb-4">
        <div className="flex items-center gap-2.5">
          <Scissors size={18} className="text-warm-600" />
          <div>
            <div className="text-sm font-semibold text-warm-900 dark:text-warm-100">소재도 함께 고르기</div>
            <div className="text-[11px] text-warm-600 dark:text-warm-400">부위별 색상 선택 후 소재를 골라 궁합 체크</div>
          </div>
        </div>
        <button onClick={() => build.update({ fabricMode: !build.state.fabricMode })} role="switch" aria-checked={build.state.fabricMode}
          className={`w-12 h-7 rounded-full p-0.5 transition-colors ${build.state.fabricMode ? 'bg-terra-500' : 'bg-warm-400'}`}>
          <div className={`w-6 h-6 rounded-full bg-white shadow transition-transform ${build.state.fabricMode ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      <button onClick={() => build.selectStyle(null)} className="text-sm text-terra-600 font-medium w-full text-center py-2 active:opacity-70">
        스타일 없이 시작 →
      </button>
    </div>
  )
}

// ═══════════════════════════════════════
// Step 2: 빌더 (자유형 레이어)
// ═══════════════════════════════════════
function StepBuilder({ build, navigate }: { build: BH; navigate: any }) {
  const toast = useToast()
  const { weather } = useWeather()
  const [tmpItem, setTmpItem] = useState<string | null>(null)
  const [tmpColor, setTmpColor] = useState<string | null>(null)
  const [mannCollapsed, setMannCollapsed] = useState(false)
  const [previewHex, setPreviewHex] = useState<Record<string, string> | null>(null)

  const editMode = build.editMode
  const upper = build.state.upper
  const sorted = sortUpper(upper)
  const outfit = useMemo(() => upperToOutfit(build.state), [build.state])
  const score = build.getScore()

  // 아이템 중복 체크
  const usedItemIds = useMemo(() => {
    const editIdx = editMode.type === 'edit_upper' ? editMode.index : -1
    return new Set(upper.filter((_, i) => i !== editIdx).map(l => l.itemId))
  }, [upper, editMode])

  // 현재 슬롯 예측 (추천/delta용)
  const predictedSlot = useMemo(() => {
    if (!tmpItem) return null
    if (editMode.type === 'edit_upper') return build.predictSlot(tmpItem, editMode.index)
    if (editMode.type === 'add' || editMode.type === 'idle') return build.predictSlot(tmpItem)
    return null
  }, [tmpItem, editMode, upper])

  // 현재 편집 중인 슬롯 (상체 + 하체/악세서리 모두 포함)
  const currentSlot = useMemo(() => {
    if (editMode.type === 'edit_simple') return editMode.target
    return predictedSlot
  }, [editMode, predictedSlot])

  // 색상 추천
  const recommendations = useMemo(() => {
    if (!currentSlot || build.state.mode === 'evaluate') return []
    return build.getColorRecommendations(currentSlot)
  }, [currentSlot, build.state])

  const recKeys = useMemo(() => new Set(recommendations.slice(0, 10).map(r => r.key)), [recommendations])

  // 실시간 마네킹 프리뷰
  const handleColorTap = useCallback((colorKey: string) => {
    setTmpColor(colorKey)
    const hex = { ...build.outfitHex }
    if (editMode.type === 'edit_simple') {
      const target = editMode.target
      const c = COLORS_60[colorKey]
      if (c) hex[target] = c.hex
    } else if (tmpItem) {
      const slot = predictedSlot
      if (slot && slot !== 'hidden' && slot !== 'inner') {
        const c = COLORS_60[colorKey]
        if (c) hex[slot] = c.hex
      }
    }
    setPreviewHex(hex)
  }, [editMode, tmpItem, predictedSlot, build.outfitHex])

  // 추가/수정 확인
  const handleConfirm = () => {
    if (editMode.type === 'edit_simple') {
      if (tmpColor) build.setSimpleColor(editMode.target, tmpColor)
    } else if (editMode.type === 'edit_upper') {
      const idx = editMode.index
      const itemId = tmpItem || upper[idx]?.itemId
      const colorKey = tmpColor || upper[idx]?.colorKey
      if (itemId && colorKey) build.editUpper(idx, itemId, colorKey)
    } else if (tmpItem && tmpColor) {
      if (upper.length >= 4) { toast.warning('상체는 최대 4겹까지 가능해요'); return }
      if (usedItemIds.has(tmpItem)) { toast.warning('이미 추가된 아이템이에요'); return }
      build.addUpper(tmpItem, tmpColor)
    }
    setTmpItem(null); setTmpColor(null); setPreviewHex(null)
  }

  const startEdit = (mode: EditMode) => {
    build.setEditMode(mode)
    setTmpItem(null); setTmpColor(null); setPreviewHex(null)
  }

  const cancelEdit = () => {
    build.setEditMode({ type: 'idle' })
    setTmpItem(null); setTmpColor(null); setPreviewHex(null)
  }

  // 날씨 코멘트
  const weatherComment = useMemo(() => {
    if (!weather) return null
    const { feels, wind } = weather
    const hasOuter = upper.some(l => l.outerness >= 90)
    const count = upper.length
    let comment = ''
    if (count === 0) { comment = feels <= 10 ? `체감 ${feels}°C예요. 겉옷이 필요한 날씨입니다.` : `체감 ${feels}°C예요.` }
    else if (count === 1 && !hasOuter && feels <= 10) comment = `이것만으로는 추울 수 있어요. 겉옷을 추가해보세요.`
    else if (count === 1 && hasOuter) comment = `겉옷 준비 완료! 안에 한 겹 더 입으면 좋아요.`
    else if (count === 2 && hasOuter && feels <= 5) comment = `${feels}°C에는 한 겹 더 추천해요.`
    else if (count === 2 && hasOuter) comment = `이 정도면 적당해요! 👍`
    else if (count >= 3) comment = `따뜻하게 입었네요! 🔥`
    else if (count === 2 && !hasOuter && feels <= 10) comment = `겉옷을 추가하면 좋겠어요.`
    else comment = `체감 ${feels}°C`
    return { temp: weather.temp, feels, wind, comment }
  }, [weather, upper])

  // 하단 버튼 상태
  const isEditing = editMode.type !== 'idle'
  const isUpperEdit = editMode.type === 'add' || editMode.type === 'edit_upper'
  const isSimpleEdit = editMode.type === 'edit_simple'
  const canConfirm = isSimpleEdit ? !!tmpColor : (!!tmpItem && !!tmpColor)
  const btnLabel = editMode.type === 'edit_upper' ? '수정' : editMode.type === 'edit_simple' ? '선택' : editMode.type === 'add' ? '추가하기' : build.isComplete ? '결과 보기 →' : '아이템을 선택해주세요'

  // 결과 보기
  const goToResult = () => {
    if (build.state.fabricMode) build.pushStep('fabric')
    else build.pushStep('result')
  }

  // 점수 색상
  const scoreColor = score >= 85 ? 'bg-green-100 text-green-600' : score >= 70 ? 'bg-yellow-100 text-yellow-600' : score > 0 ? 'bg-red-100 text-red-500' : 'bg-warm-200 text-warm-500'

  return (
    <div className="animate-screen-enter -mx-5 -my-4">

      {/* 마네킹 영역: 가로 3등분 */}
      {!mannCollapsed && (
        <div className="px-3 py-2">
          <div className="flex gap-1" style={{ minHeight: 200 }}>
            {/* 좌: 마네킹 */}
            <div className="flex flex-col items-center justify-center" style={{ width: 120 }}>
              <MannequinSVG outfit={previewHex || build.outfitHex} options={{ outerType: build.outerType, midType: build.midType }} size={110} />
            </div>

            {/* 중: 상체 레이어 */}
            <div className="flex-1 flex flex-col gap-1 justify-center min-w-0">
              <div className="text-[9px] font-semibold text-warm-500 dark:text-warm-400 px-1 mb-0.5">상체</div>
              {sorted.length === 0 ? (
                <div className="text-[11px] text-warm-500 dark:text-warm-400 px-1">아이템을 추가해주세요</div>
              ) : sorted.map((layer, idx) => {
                const item = ITEMS_CATALOG.find(i => i.id === layer.itemId)
                const color = COLORS_60[layer.colorKey]
                const active = editMode.type === 'edit_upper' && editMode.index === idx
                return (
                  <button key={layer.uid} onClick={() => startEdit({ type: 'edit_upper', index: idx })}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left active:scale-95 transition-all min-h-[32px] ${
                      active ? 'bg-terra-100 dark:bg-terra-900/30' : 'bg-white/60 dark:bg-warm-800/40'
                    }`}>
                    <div className="w-4 h-4 rounded flex-shrink-0 border border-black/5" style={{ background: color?.hex || '#ccc' }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-warm-800 dark:text-warm-200 truncate">{item?.emoji} {color?.name || ''}</div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* 우: 점수 + 하의 + 신발 + 악세서리 */}
            <div className="flex-1 flex flex-col gap-1 justify-center min-w-0">
              <div className={`self-end px-2.5 py-0.5 rounded-full text-[10px] font-bold font-display mb-1 ${scoreColor}`}>
                {score > 0 ? `${score}점` : '--점'}
              </div>
              <div className="text-[9px] font-semibold text-warm-500 dark:text-warm-400 px-1 mb-0.5">하체·악세서리</div>
              {[
                { key: 'bottom', emoji: '👖', label: '하의', color: build.state.bottomColor },
                { key: 'shoes', emoji: '👞', label: '신발', color: build.state.shoesColor },
                { key: 'scarf', emoji: '🧣', label: '목도리', color: build.state.scarfColor },
                { key: 'hat', emoji: '🎩', label: '모자', color: build.state.hatColor },
              ].map(sec => {
                const c = sec.color ? COLORS_60[sec.color] : null
                const active = editMode.type === 'edit_simple' && editMode.target === sec.key
                return (
                  <button key={sec.key} onClick={() => startEdit({ type: 'edit_simple', target: sec.key as any })}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left active:scale-95 transition-all min-h-[32px] ${
                      active ? 'bg-terra-100 dark:bg-terra-900/30' : 'bg-white/60 dark:bg-warm-800/40'
                    }`}>
                    {c ? (
                      <div className="w-4 h-4 rounded flex-shrink-0 border border-black/5" style={{ background: c.hex }} />
                    ) : (
                      <div className="w-4 h-4 rounded flex-shrink-0 bg-warm-300 dark:bg-warm-600 border border-dashed border-warm-400" />
                    )}
                    <div className="text-[11px] text-warm-700 dark:text-warm-300 truncate">{sec.emoji} {c ? c.name : sec.label}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 날씨 바 — 가로 전체 */}
          {weatherComment && (
            <div className="mt-2 px-1 py-1.5 bg-sky-50 dark:bg-sky-900/20 rounded-lg text-[11px] text-sky-700 dark:text-sky-300 text-center">
              {weatherEmoji(weather?.code || 0)} {weatherComment.temp}°C 체감 {weatherComment.feels}°C · 💨 {weatherComment.wind}km/h{weatherComment.comment ? ` · ${weatherComment.comment}` : ''}
            </div>
          )}
        </div>
      )}

      {/* 접기/펴기 */}
      <button onClick={() => setMannCollapsed(!mannCollapsed)}
        className="w-full text-center text-[11px] text-warm-500 dark:text-warm-400 py-1.5 border-b border-warm-300 dark:border-warm-700 active:opacity-70">
        {mannCollapsed ? '👤 마네킹 보기 ▽' : '접기 △'}
      </button>

      {/* 선택 영역 */}
      <div className="px-5 pt-3 pb-24">
        {/* 편집 모드 안내 */}
        {editMode.type === 'add' && (
          <div className="flex items-center justify-between bg-terra-50 dark:bg-terra-900/20 border border-terra-200 dark:border-terra-800 rounded-xl px-3 py-2 mb-3">
            <span className="text-[12px] font-semibold text-terra-700 dark:text-terra-300">+ 옷 추가</span>
            <button onClick={cancelEdit} className="text-[11px] text-terra-600 underline">취소</button>
          </div>
        )}
        {editMode.type === 'edit_upper' && (
          <div className="flex items-center justify-between bg-terra-50 dark:bg-terra-900/20 border border-terra-200 dark:border-terra-800 rounded-xl px-3 py-2 mb-3">
            <span className="text-[12px] font-semibold text-terra-700 dark:text-terra-300">{upper[editMode.index]?.emoji} 수정 중</span>
            <div className="flex items-center gap-3">
              <button onClick={() => { build.removeUpper(editMode.index); cancelEdit() }} className="text-[11px] text-red-500">삭제</button>
              <button onClick={cancelEdit} className="text-[11px] text-terra-600 underline">취소</button>
            </div>
          </div>
        )}
        {editMode.type === 'edit_simple' && (
          <div className="flex items-center justify-between bg-terra-50 dark:bg-terra-900/20 border border-terra-200 dark:border-terra-800 rounded-xl px-3 py-2 mb-3">
            <span className="text-[12px] font-semibold text-terra-700 dark:text-terra-300">
              {{ bottom: '👖 하의', shoes: '👞 신발', scarf: '🧣 목도리', hat: '🎩 모자' }[editMode.target]} 색상
            </span>
            <button onClick={cancelEdit} className="text-[11px] text-terra-600 underline">취소</button>
          </div>
        )}

        {/* 아이템 그리드 (상체 추가/수정 시만) */}
        {(editMode.type === 'add' || editMode.type === 'edit_upper' || editMode.type === 'idle') && (editMode.type !== 'idle' || upper.length === 0) && (
          <>
            <div className="text-[11px] font-semibold text-warm-500 dark:text-warm-400 mb-2">아이템</div>
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              {ITEMS_CATALOG.map(item => {
                const used = usedItemIds.has(item.id)
                const selected = tmpItem === item.id || (editMode.type === 'edit_upper' && !tmpItem && upper[editMode.index]?.itemId === item.id)
                return (
                  <button key={item.id} disabled={used}
                    onClick={() => { if (!used) setTmpItem(item.id) }}
                    className={`flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl text-center transition-all active:scale-93 ${
                      selected ? 'bg-terra-100 dark:bg-terra-900/30 border-terra-400 border-1.5' : used ? 'opacity-30 border border-warm-200' : 'bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600'
                    }`}>
                    <span className="text-lg">{item.emoji}</span>
                    <span className="text-[10px] font-semibold text-warm-700 dark:text-warm-300">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* 색상 그리드 */}
        {(isEditing || upper.length === 0) && (tmpItem || isSimpleEdit || (editMode.type === 'edit_upper')) && (
          <>
            {/* 추천 색상 */}
            {recommendations.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-semibold text-warm-500 dark:text-warm-400">추천 색상</div>
                  {recommendations.some(r => r.badges?.pc || r.badges?.body) && (
                    <div className="flex items-center gap-2 text-[9px] text-warm-500 dark:text-warm-400">
                      {recommendations.some(r => r.badges?.pc) && <span>👤 퍼스널컬러</span>}
                      {recommendations.some(r => r.badges?.body) && <span>📐 체형</span>}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {recommendations.slice(0, 10).map(rec => {
                    const c = COLORS_60[rec.key]
                    if (!c) return null
                    const light = (c.hcl[2] > 60)
                    const selected = tmpColor === rec.key || (!tmpColor && editMode.type === 'edit_upper' && upper[editMode.index]?.colorKey === rec.key)
                      || (!tmpColor && editMode.type === 'edit_simple' && build.state[editMode.target + 'Color'] === rec.key)
                    const delta = currentSlot ? build.calcScoreDelta(currentSlot, rec.key) : 0
                    return (
                      <button key={rec.key} onClick={() => handleColorTap(rec.key)}
                        className={`h-11 rounded-lg flex items-center justify-center text-[9px] font-semibold relative transition-all active:scale-90 ${
                          selected ? 'ring-2 ring-terra-500 scale-105' : ''
                        }`} style={{ background: c.hex, color: light ? '#1C1917' : '#fff' }}>
                        {c.name}
                        {delta > 0 && <span className="absolute -top-1 -right-1 bg-green-100 text-green-600 text-[7px] font-bold px-1 rounded">+{delta}</span>}
                        {delta < -1 && <span className="absolute -top-1 -right-1 bg-red-100 text-red-500 text-[7px] font-bold px-1 rounded">{delta}</span>}
                        {(rec.badges?.pc || rec.badges?.body) && (
                          <span className="absolute -bottom-1 -left-1 flex gap-px">
                            {rec.badges.pc && <span className="bg-purple-100 text-purple-600 text-[6px] font-bold px-0.5 rounded leading-none py-px">👤</span>}
                            {rec.badges.body && <span className="bg-blue-100 text-blue-600 text-[6px] font-bold px-0.5 rounded leading-none py-px">📐</span>}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            <div className="text-[11px] font-semibold text-warm-500 dark:text-warm-400 mb-2">{recommendations.length > 0 ? '전체 색상' : '색상'}</div>
            <ColorPicker
              inline
              selected={tmpColor || (editMode.type === 'edit_upper' ? upper[editMode.index]?.colorKey : editMode.type === 'edit_simple' ? build.state[editMode.target + 'Color'] : null) || null}
              onSelect={(key) => handleColorTap(key)}
              scoreDeltaFn={currentSlot ? (key) => build.calcScoreDelta(currentSlot, key) : undefined}
            />
          </>
        )}

        {/* idle 상태 + 아이템 있을 때: 안내 */}
        {editMode.type === 'idle' && upper.length > 0 && (
          <div className="text-center py-6">
            {!build.isComplete && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 mb-4 text-[13px] text-blue-800 dark:text-blue-300">
                💡 {(() => {
                  const missing = []
                  if (!build.state.bottomColor) missing.push('하의')
                  if (!build.state.shoesColor) missing.push('신발')
                  return missing.length > 0 ? `${missing.join(', ')}까지 선택하면 결과를 볼 수 있어요` : '결과를 볼 수 있어요'
                })()}
                <div className="flex gap-2 mt-2 justify-center">
                  {!build.state.bottomColor && (
                    <button onClick={() => startEdit({ type: 'edit_simple', target: 'bottom' })}
                      className="px-3 py-1.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded-lg text-[11px] font-semibold active:scale-95">
                      👖 하의 선택
                    </button>
                  )}
                  {!build.state.shoesColor && (
                    <button onClick={() => startEdit({ type: 'edit_simple', target: 'shoes' })}
                      className="px-3 py-1.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded-lg text-[11px] font-semibold active:scale-95">
                      👞 신발 선택
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="text-[12px] text-warm-500 dark:text-warm-400">마네킹 옆 아이템을 탭해서 수정하거나<br/><b>+ 옷 추가</b>를 눌러주세요</div>
          </div>
        )}

        {/* 완전 초기: 안내 */}
        {editMode.type === 'idle' && upper.length === 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 mb-4 text-[13px] text-blue-800 dark:text-blue-300 leading-relaxed">
            오늘 뭐 입으세요?<br/>가장 먼저 떠오르는 아이템을 골라주세요
          </div>
        )}
      </div>

      {/* 하단 고정 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white/90 dark:bg-[#1C1917]/90 backdrop-blur-xl border-t border-warm-300 dark:border-warm-700 px-5 py-3 z-50"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
        {isEditing ? (
          <div className="flex gap-2">
            <button onClick={handleConfirm} disabled={!canConfirm}
              className={`flex-1 py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-98 ${
                canConfirm ? 'bg-terra-500 text-white shadow-terra' : 'bg-warm-300 dark:bg-warm-700 text-warm-500'
              }`}>
              {editMode.type === 'edit_upper' ? '수정' : editMode.type === 'edit_simple' ? '선택' : '추가하기'}
            </button>
            <button onClick={cancelEdit} className="px-5 py-3.5 bg-warm-200 dark:bg-warm-700 text-warm-600 dark:text-warm-400 rounded-2xl font-medium text-sm active:scale-98">
              취소
            </button>
          </div>
        ) : (
          <button onClick={() => {
            if (build.isComplete) goToResult()
            else if (tmpItem && tmpColor) handleConfirm()
            else if (upper.length > 0 && !tmpItem) startEdit({ type: 'add' })
          }}
            disabled={upper.length === 0 && !(tmpItem && tmpColor)}
            className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-98 ${
              build.isComplete ? 'bg-terra-500 text-white shadow-terra'
              : (tmpItem && tmpColor) ? 'bg-terra-500 text-white shadow-terra'
              : upper.length > 0 ? 'bg-terra-500 text-white shadow-terra'
              : 'bg-warm-300 dark:bg-warm-700 text-warm-500'
            }`}>
            {build.isComplete ? '결과 보기 →' : (tmpItem && tmpColor) ? '추가하기' : upper.length === 0 ? '아이템과 색상을 선택해주세요' : '+ 옷 추가하기'}
          </button>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// Step 3: 소재 선택
// ═══════════════════════════════════════
function StepFabric({ build }: { build: BH }) {
  const outfit = getFilledOutfit(build.state)
  const filledParts = Object.entries(outfit).filter(([_, v]) => v)
  const [fabrics, setFabrics] = useState<Record<string, any>>(build.state.fabrics || {})
  const currentSeason = (() => { const m = new Date().getMonth(); if (m >= 2 && m <= 4) return 'spring'; if (m >= 5 && m <= 7) return 'summer'; if (m >= 8 && m <= 10) return 'fall'; return 'winter' })()
  const [seasonFilter, setSeasonFilter] = useState<string | null>(currentSeason)

  const handleSelect = (part: string, item: any) => {
    setFabrics(prev => { const next = { ...prev }; if (next[part]?.id === item.id) delete next[part]; else next[part] = item; return next })
  }
  const handleConfirm = () => { build.update({ fabrics }); build.pushStep('result') }
  const compatPairs = useMemo(() => evaluateFabricCombo(fabrics), [fabrics])

  return (
    <div className="animate-screen-enter">
      <button onClick={build.goBack} className="flex items-center gap-1 text-sm text-warm-600 dark:text-warm-400 mb-4 active:opacity-70">
        <ArrowLeft size={16} /> 뒤로
      </button>
      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-1">소재 선택</h2>
      <p className="text-sm text-warm-600 dark:text-warm-400 mb-4">각 부위의 소재를 골라 궁합을 확인하세요</p>

      <div className="flex gap-1.5 mb-5">
        <button onClick={() => setSeasonFilter(null)} className={`px-3 py-1.5 rounded-full text-[11px] font-semibold ${!seasonFilter ? 'bg-terra-500 text-white' : 'bg-warm-200 dark:bg-warm-700 text-warm-600'}`}>전체</button>
        {Object.entries(FABRIC_SEASONS).map(([key, s]) => (
          <button key={key} onClick={() => setSeasonFilter(seasonFilter === key ? null : key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold ${seasonFilter === key ? 'bg-terra-500 text-white' : 'bg-warm-200 dark:bg-warm-700 text-warm-600'}`}>
            {s.emoji} {s.name}
          </button>
        ))}
      </div>

      {filledParts.map(([part, colorKey]) => {
        const items = FABRIC_ITEMS[part]; if (!items?.length) return null
        const c = COLORS_60[colorKey]; const filtered = seasonFilter ? items.filter(i => i.seasons.includes(seasonFilter)) : items
        const selected = fabrics[part]
        return (
          <div key={part} className="mb-5">
            <div className="flex items-center gap-2 mb-2.5">
              {c && <span className="w-4 h-4 rounded border border-warm-400" style={{ background: c.hex }} />}
              <span className="text-xs font-semibold text-warm-600 dark:text-warm-400 uppercase tracking-widest">{(CATEGORY_NAMES as any)?.[part]}</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {filtered.map(item => (
                <button key={item.id} onClick={() => handleSelect(part, item)}
                  className={`flex-shrink-0 w-[120px] border rounded-xl p-2.5 text-left transition-all active:scale-97 ${
                    selected?.id === item.id ? 'bg-terra-50 border-terra-400 shadow-warm' : 'bg-white dark:bg-warm-800 border-warm-400'
                  }`}>
                  <div className="text-lg mb-1">{item.icon}</div>
                  <div className="text-[12px] font-semibold text-warm-900 dark:text-warm-100">{item.name}</div>
                  <div className="text-[10px] text-warm-500 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )
      })}

      <button onClick={handleConfirm} className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm shadow-terra active:scale-98 mt-4">
        결과 보기 →
      </button>
    </div>
  )
}

// ═══════════════════════════════════════
// Step 4: 결과
// ═══════════════════════════════════════
function StepResult({ build, navigate }: { build: BH; navigate: any }) {
  const toast = useToast()
  const score = build.getScore()
  const evalResult = build.getEvalResult()
  const circumference = 2 * Math.PI * 52
  const offset = circumference * (1 - score / 100)
  const outfit = getFilledOutfit(build.state)
  const filledParts = Object.entries(outfit).filter(([_, v]) => v)

  const scoreItems = evalResult ? [
    { label: '컬러 배치', value: evalResult.goldilocks, max: 33, desc: '인접 부위 연결 + 역할 명확성' },
    { label: '비율', value: evalResult.ratio, max: 17, desc: '60-30-10 배분' },
    { label: '조화도', value: evalResult.harmony, max: 17, desc: 'HCL 색상 조화' },
    { label: '색온도', value: evalResult.season, max: 17, desc: '웜/쿨 일관성' },
    { label: '밸런스', value: evalResult.balance, max: 8, desc: '명도 분포' },
    ...(evalResult.hasPersonalColor ? [{ label: '퍼스널컬러', value: evalResult.personal, max: 17, desc: '얼굴 근처 컬러' }] : []),
    ...(evalResult.hasBodyFit ? [{ label: '체형 맞춤', value: evalResult.bodyFit, max: 8, desc: '체형별 컬러 배치' }] : []),
  ].filter(item => item.value > 0) : []

  const handleSave = () => {
    const name = build.state.style || '코디'
    const saved = JSON.parse(localStorage.getItem('cs_saved') || '[]')
    saved.unshift({ id: Date.now().toString(36), outfit, score, name, createdAt: Date.now() })
    if (saved.length > 100) saved.length = 100
    localStorage.setItem('cs_saved', JSON.stringify(saved))
    trackSave('build', score)
    toast.success('코디를 저장했어요!')
  }

  const handleShare = () => { navigator.share?.({ title: "바루픽 코디", text: `코디 점수: ${score}점`, url: "https://barupick-react.vercel.app" }).catch(() => {}) }
  const handleCommunityShare = () => { localStorage.setItem("_pending_post_outfit", JSON.stringify(outfit)); navigate("/community/post") }

  const scoreGrade = score >= 90 ? { label: '완벽한 조합!', emoji: '🏆', color: 'text-amber-600' }
    : score >= 80 ? { label: '훌륭한 코디!', emoji: '✨', color: 'text-terra-600' }
    : score >= 65 ? { label: '좋은 조합이에요', emoji: '👍', color: 'text-sage' }
    : score >= 50 ? { label: '나쁘지 않아요', emoji: '🙂', color: 'text-warm-600' }
    : { label: '개선해볼까요?', emoji: '💪', color: 'text-warm-500' }
  const isHighScore = score >= 80

  return (
    <div className="animate-screen-enter">
      <button onClick={() => build.setVizCollapsed(!build.vizCollapsed)} className="w-full text-center text-xs text-warm-600 py-2 mb-2 active:opacity-70">
        {build.vizCollapsed ? '👤 마네킹 보기 ▼' : '👤 마네킹 접기 ▲'}
      </button>
      {!build.vizCollapsed && (
        <div className="flex justify-center mb-5 py-4 bg-warm-100 dark:bg-warm-800 rounded-2xl">
          <MannequinSVG outfit={build.outfitHex} options={{ outerType: build.outerType, midType: build.midType }} size={200} />
        </div>
      )}

      <div className="flex flex-col items-center mb-5 relative">
        {isHighScore && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {['🎉', '⭐', '✨', '🌟', '💫', '🎊'].map((emoji, i) => (
              <span key={i} className="absolute text-lg animate-confetti" style={{ left: `${15 + i * 13}%`, animationDelay: `${i * 0.15}s`, animationDuration: `${1.2 + i * 0.2}s` }}>{emoji}</span>
            ))}
          </div>
        )}
        <div className="relative w-[120px] h-[120px]">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx={60} cy={60} r={52} fill="none" stroke="#E7E5E4" strokeWidth={8} />
            <circle cx={60} cy={60} r={52} fill="none" stroke={isHighScore ? '#6B9E76' : '#C2785C'} strokeWidth={8} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-bold text-warm-900 dark:text-warm-100">{score}</span>
            <span className="text-[10px] text-warm-600">/ 100</span>
          </div>
        </div>
        <div className={`mt-3 text-sm font-bold ${scoreGrade.color} flex items-center gap-1.5`}>
          <span>{scoreGrade.emoji}</span><span>{scoreGrade.label}</span>
          {(() => { const p = getScorePercentile(score); return p ? <span className="ml-1.5 text-[10px] font-semibold bg-terra-100 text-terra-600 dark:bg-terra-900/30 dark:text-terra-400 px-2 py-0.5 rounded-full">{p.label}</span> : null })()}
        </div>
      </div>

      {/* 점수 분해도 */}
      {scoreItems.length > 0 && (
        <div className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 mb-4 shadow-warm-sm">
          <div className="text-xs font-semibold text-warm-500 uppercase tracking-widest mb-3">점수 분석</div>
          <div className="flex flex-col gap-2">
            {scoreItems.map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-[11px] text-warm-600 w-16 flex-shrink-0">{item.label}</span>
                <div className="flex-1 h-2 bg-warm-200 dark:bg-warm-700 rounded-full overflow-hidden">
                  <div className="h-full bg-terra-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }} />
                </div>
                <span className="text-[11px] font-display font-bold text-warm-700 w-8 text-right">{Math.round(item.value)}</span>
              </div>
            ))}
          </div>
          {evalResult?.theory && Array.isArray(evalResult.theory) && (
            <div className="mt-3 text-[11px] text-terra-600 font-medium">💡 {evalResult.theory.join(' · ')}</div>
          )}
        </div>
      )}

      {/* 색상 칩 */}
      <div className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 mb-5 shadow-warm-sm">
        <div className="flex items-center gap-1.5 text-sm font-bold text-warm-900 dark:text-warm-100 mb-3">
          <Palette size={16} className="text-terra-500" /> 코디 색상
        </div>
        <div className="flex gap-2 flex-wrap justify-center py-1">
          {filledParts.map(([cat, colorKey]) => {
            const c = COLORS_60[colorKey]; if (!c) return null
            return (
              <div key={cat} className="flex flex-col items-center gap-1">
                <div className="w-[52px] h-[52px] rounded-xl flex items-center justify-center text-[9px] font-semibold border border-warm-400/30"
                  style={{ background: c.hex, color: c.hcl[2] > 60 ? '#1C1917' : '#fff' }}>{c.name}</div>
                <div className="text-[10px] text-warm-700 dark:text-warm-300">{(CATEGORY_NAMES as any)?.[cat]}</div>
              </div>
            )
          })}
        </div>
      </div>

      <button onClick={handleSave} className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-98 shadow-terra mb-3">
        <Bookmark size={18} /> 이 코디 저장하기
      </button>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button onClick={handleShare} className="flex flex-col items-center gap-1.5 py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl active:scale-97 shadow-warm-sm">
          <Share size={18} className="text-warm-700 dark:text-warm-300" /><span className="text-[11px] text-warm-600 font-medium">공유</span>
        </button>
        <button onClick={handleCommunityShare} className="flex flex-col items-center gap-1.5 py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl active:scale-97 shadow-warm-sm">
          <Users size={18} className="text-warm-700 dark:text-warm-300" /><span className="text-[11px] text-warm-600 font-medium">커뮤니티</span>
        </button>
        <button onClick={() => build.pushStep('improve')} className="flex flex-col items-center gap-1.5 py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl active:scale-97 shadow-warm-sm">
          <RefreshCw size={18} className="text-warm-700 dark:text-warm-300" /><span className="text-[11px] text-warm-600 font-medium">비슷한 코디</span>
        </button>
      </div>
      <button onClick={() => navigate('/home')} className="w-full py-2 text-sm text-warm-600 text-center active:opacity-70 mb-6">처음으로 돌아가기</button>
    </div>
  )
}

// ═══════════════════════════════════════
// Step 5: 비슷한 코디
// ═══════════════════════════════════════
function StepImprove({ build }: { build: BH }) {
  const outfit = getFilledOutfit(build.state)
  const filledParts = Object.entries(outfit).filter(([_, v]) => v)
  const currentScore = build.getScore()

  const improvements: { part: string; original: string; replacement: string; scoreDiff: number }[] = []
  filledParts.forEach(([part, colorKey]) => {
    if (!colorKey) return
    const c = COLORS_60[colorKey]; if (!c) return
    const [h, ch, l] = c.hcl
    const candidates = Object.keys(COLORS_60).filter(k => k !== colorKey && COLORS_60[k]).map(k => {
      const tc = COLORS_60[k]; const [th, tch, tl] = tc.hcl
      const dist = Math.min(Math.abs(h - th), 360 - Math.abs(h - th)) * 0.5 + Math.abs(l - tl) * 0.3 + Math.abs(ch - tch) * 0.2
      return { key: k, dist }
    }).sort((a, b) => a.dist - b.dist).slice(0, 12)

    candidates.forEach(({ key: alt }) => {
      const diff = build.calcScoreDelta(part, alt)
      if (diff > 0) improvements.push({ part, original: colorKey, replacement: alt, scoreDiff: diff })
    })
  })
  improvements.sort((a, b) => b.scoreDiff - a.scoreDiff)
  const topImprovements = improvements.slice(0, 8)

  return (
    <div className="animate-screen-enter">
      <button onClick={build.goBack} className="flex items-center gap-1 text-sm text-warm-600 dark:text-warm-400 mb-4 active:opacity-70">
        <ArrowLeft size={16} /> 결과로
      </button>
      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-2">비슷한 코디</h2>
      <p className="text-sm text-warm-600 dark:text-warm-400 mb-5">현재 코디에서 색상을 하나씩 바꿔봤어요</p>

      {topImprovements.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {topImprovements.map((imp, idx) => {
            const origC = COLORS_60[imp.original]; const newC = COLORS_60[imp.replacement]
            if (!origC || !newC) return null
            const newOutfitHex = { ...build.outfitHex, [imp.part]: newC.hex }
            return (
              <div key={idx} className="flex items-center gap-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-3 shadow-warm-sm">
                <MannequinSVG outfit={newOutfitHex} options={{ outerType: build.outerType, midType: build.midType }} size={60} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] text-warm-600">{(CATEGORY_NAMES as any)?.[imp.part]}</span>
                    <div className="flex items-center gap-1">
                      <span className="w-4 h-4 rounded border border-warm-400" style={{ background: origC.hex }} />
                      <span className="text-warm-400">→</span>
                      <span className="w-4 h-4 rounded border border-warm-400" style={{ background: newC.hex }} />
                    </div>
                  </div>
                  <div className="text-xs text-warm-800 dark:text-warm-200">{origC.name} → <span className="font-semibold text-terra-600">{newC.name}</span></div>
                </div>
                <span className="text-sm font-bold text-sage">+{imp.scoreDiff}점</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">✨</div>
          <div className="text-sm text-warm-600 dark:text-warm-400">이미 좋은 조합이에요!</div>
        </div>
      )}
    </div>
  )
}
