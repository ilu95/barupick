// @ts-nocheck
import { setJSON } from '@/lib/storage'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Bookmark, Share, Users, Palette, Scissors, ChevronRight, Sparkles, Check, ThumbsUp, ThumbsDown, Minus, RefreshCw, Wind, Thermometer, Plus, X, Edit3 } from 'lucide-react'
import CharacterCanvas from '@/components/mannequin/CharacterCanvas'
import StepOutfit from '@/pages/build/StepOutfit'
import { charSceneFromBuild } from '@/lib/char/map'
import { useToast } from '@/components/ui/Toast'
import ColorPicker from '@/components/ui/ColorPicker'
import { COLORS_60, getColorName } from '@/lib/colors'
import { MOOD_GROUPS, STYLE_GUIDE, STYLE_ICONS, ITEMS_CATALOG } from '@/lib/styles'
import { CATEGORY_NAMES, FABRIC_ITEMS, FABRIC_SEASONS, FABRIC_COMPAT_RULES, getFabricCompat, evaluateFabricCombo } from '@/lib/categories'
import { useBuild, type BuildStep, type BuildHook, type EditMode, upperToOutfit, getFilledOutfit, getSlotKey, getSlotLabel, sortUpper, getOuterType, getMidType, predictSlot } from '@/hooks/useBuild'
import { profile } from '@/lib/profile'
import { trackSave, trackClick, trackColorPick, trackColorConfirm, trackBuildStep, trackBuildComplete, trackShare, trackGuide } from '@/lib/analytics'
import type { Move } from '@/lib/guide'
import { drawCoordCard, drawVoteOg, shareDataUrl, type CardRatio } from '@/lib/coordCard'
import { createVote, type VoteSide } from '@/lib/votes'
import { trackVote } from '@/lib/analytics'
import { useAuth } from '@/contexts/AuthContext'
import { ENGINE_VERSION, PALETTE_VERSION } from '@/lib/versions'
import { useWeather, weatherEmoji, getLayerAdvice } from '@/hooks/useWeather'
import { getScorePercentile } from '@/hooks/useWardrobe'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'

type BH = BuildHook

// ═══════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════
export default function BuildCoord() {
  const navigate = useNavigate()
  const build = useBuild('coord')

  // 계측: 단계 진입 (퍼널 기준선)
  useEffect(() => { trackBuildStep(build.step, { mode: build.state.mode, style: build.state.style }) }, [build.step])

  // 취향 폭포(/home/taste)에서 고른 카드가 있으면 바로 2단계로
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('sp_taste_pick'); if (!raw) return
      sessionStorage.removeItem('sp_taste_pick')
      build.applyOutfit(JSON.parse(raw))
    } catch {}
  }, [])

  return (
    <div className="min-h-screen dark:bg-[#1C1917]">
      <div className="max-w-[480px] mx-auto px-5 py-4 pb-8">
        {build.step === 'outfit' && <StepOutfit build={build} />}
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
  const { t } = useTranslation()
  return (
    <div className="animate-screen-fade">
      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-2">{t('build.stepStyle')}</h2>
      <p className="text-sm text-warm-600 dark:text-warm-400 mb-5">{t('build.styleDesc')}</p>

      {Object.entries(MOOD_GROUPS).map(([key, group]) => (
        <div key={key} className="mb-5">
          <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-wide mb-2.5">{group.icon} {t('styles:moodGroups.' + key + '.name')}</div>
          <div className="flex flex-wrap gap-2">
            {group.styles.map((s: string) => {
              const sd = STYLE_GUIDE[s]
              const icon = (STYLE_ICONS as any)?.[s] || '🎨'
              return (
                <button key={s} onClick={() => build.selectStyle(s)}
                  className="px-4 py-2.5 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl text-sm font-medium text-warm-800 dark:text-warm-200 shadow-warm-sm active:scale-[0.97] transition-all">
                  {icon} {t('styles:guide.' + s + '.name')}
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
            <div className="text-sm font-semibold text-warm-900 dark:text-warm-100">{t('build.fabricToggle')}</div>
            <div className="text-[11px] text-warm-600 dark:text-warm-400">{t('build.fabricToggleDesc')}</div>
          </div>
        </div>
        <button onClick={() => build.update({ fabricMode: !build.state.fabricMode })} role="switch" aria-checked={build.state.fabricMode}
          className={`w-12 h-7 rounded-full p-0.5 transition-colors ${build.state.fabricMode ? 'bg-terra-500' : 'bg-warm-400'}`}>
          <div className={`w-6 h-6 rounded-full bg-white shadow transition-transform ${build.state.fabricMode ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      <button onClick={() => build.selectStyle(null)} className="text-sm text-terra-600 font-medium w-full text-center py-2 active:opacity-70">
        {t('build.startWithoutStyle')}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════
// Step 2: 빌더 (자유형 레이어)
// ═══════════════════════════════════════
function StepBuilder({ build, navigate }: { build: BH; navigate: any }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { weather } = useWeather()
  const [tmpItem, setTmpItem] = useState<string | null>(null)
  const [tmpColor, setTmpColor] = useState<string | null>(null)
  const [mannCollapsed, setMannCollapsed] = useState(false)
  const [previewHex, setPreviewHex] = useState<Record<string, string> | null>(null)
  const [moves, setMoves] = useState<Move[] | null>(null)          // "더 올리려면?" 패널
  const [undoMove, setUndoMove] = useState<(() => void) | null>(null)

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
    // edit_upper에서 tmpItem이 없으면 기존 아이템의 슬롯 사용
    const itemId = tmpItem || (editMode.type === 'edit_upper' ? upper[editMode.index]?.itemId : null)
    if (!itemId) return null
    if (editMode.type === 'edit_upper') return build.predictSlot(itemId, editMode.index)
    return build.predictSlot(itemId)
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

  // 안내 층: 이 자리의 ● 추천 / △ 주의. 퍼스널컬러·체형 배지가 붙은 추천은 ● 탭에 두 개까지 얹는다
  const guide = useMemo(() => (currentSlot && build.state.mode !== 'evaluate') ? build.getGuide(currentSlot) : null, [currentSlot, build.state])
  const guideRec = useMemo(() => {
    if (!guide) return undefined
    const extra = recommendations.filter(r => (r.badges?.pc || r.badges?.body) && !guide.rec.includes(r.key)).slice(0, 2).map(r => r.key)
    return [...guide.rec, ...extra]
  }, [guide, recommendations])

  // 실시간 마네킹 프리뷰
  const handleColorTap = useCallback((colorKey: string) => {
    setTmpColor(colorKey)
    const hex = { ...build.outfitHex }
    if (editMode.type === 'edit_simple') {
      const target = editMode.target
      const c = COLORS_60[colorKey]
      if (c) hex[target] = c.hex
    } else {
      const slot = predictedSlot
      if (slot && slot !== 'hidden' && slot !== 'inner') {
        const c = COLORS_60[colorKey]
        if (c) hex[slot] = c.hex
      }
    }
    setPreviewHex(hex)
  }, [editMode, predictedSlot, build.outfitHex])

  // 컬러 탭 → 프리뷰만 (확정은 handleConfirm)
  const handleColorSelect = useCallback((colorKey: string) => {
    handleColorTap(colorKey)
  }, [handleColorTap])

  // 확정 버튼
  const handleConfirm = useCallback(() => {
    if (!tmpColor) return
    if (editMode.type === 'edit_simple') {
      trackColorConfirm({ slot: editMode.target, item: null, color: tmpColor, action: 'simple', score_before: score })
      build.setSimpleColor(editMode.target, tmpColor)
    } else if (editMode.type === 'edit_upper') {
      const idx = editMode.index
      const itemId = tmpItem || upper[idx]?.itemId
      if (itemId) {
        trackColorConfirm({ slot: predictedSlot, item: itemId, color: tmpColor, action: 'edit', score_before: score })
        build.editUpper(idx, itemId, tmpColor)
      }
    } else if (tmpItem) {
      if (upper.length >= 4) { toast.warning(t('build.maxLayerWarning')); return }
      if (usedItemIds.has(tmpItem)) { toast.warning(t('build.duplicateWarning')); return }
      trackColorConfirm({ slot: predictedSlot, item: tmpItem, color: tmpColor, action: 'add', score_before: score })
      build.addUpper(tmpItem, tmpColor)
    }
    setTmpItem(null); setTmpColor(null); setPreviewHex(null)
    build.setEditMode({ type: 'idle' })
  }, [editMode, tmpItem, tmpColor, upper, usedItemIds, build, toast, predictedSlot, score])

  // 아이템 탭 → 아이템 그리드 숨기고 컬러 피커 보이기
  const handleItemTap = useCallback((itemId: string) => {
    if (usedItemIds.has(itemId)) return
    setTmpItem(itemId)
    setTmpColor(null)
    setPreviewHex(null)
  }, [usedItemIds])

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
    if (count === 0) { comment = feels <= 10 ? t('build.weather.needOuter', { feels }) : t('build.weather.feelsLike', { feels }) }
    else if (count === 1 && !hasOuter && feels <= 10) comment = t('build.weather.tooThin')
    else if (count === 1 && hasOuter) comment = t('build.weather.outerReady')
    else if (count === 2 && hasOuter && feels <= 5) comment = t('build.weather.addLayer', { feels })
    else if (count === 2 && hasOuter) comment = t('build.weather.justRight')
    else if (count >= 3) comment = t('build.weather.warm')
    else if (count === 2 && !hasOuter && feels <= 10) comment = t('build.weather.suggestOuter')
    else comment = t('build.weather.feelsTemp', { feels })
    return { temp: weather.temp, feels, wind, comment }
  }, [weather, upper])

  // 하단 버튼 상태
  const isEditing = editMode.type !== 'idle'
  const isSimpleEdit = editMode.type === 'edit_simple'

  // 결과 보기
  const goToResult = () => {
    if (build.state.fabricMode) build.pushStep('fabric')
    else build.pushStep('result')
  }

  // 점수 색상
  const scoreColor = score >= 84 ? 'bg-green-100 text-green-600' : score >= 72 ? 'bg-yellow-100 text-yellow-600' : score > 0 ? 'bg-red-100 text-red-500' : 'bg-warm-200 text-warm-500'

  return (
    <div className="animate-screen-enter -mx-5 -my-4">

      {/* 마네킹 영역: 가로 3등분 */}
      {!mannCollapsed && (
        <div className="px-3 py-2">
          <div className="flex gap-1" style={{ minHeight: 200 }}>
            {/* 좌: 마네킹 */}
            <div className="flex flex-col items-center justify-center" style={{ width: 120 }}>
              <CharacterCanvas {...charSceneFromBuild(upper, previewHex || build.outfitHex, { bottomItem: build.state.bottomItem, shoesItem: build.state.shoesItem })} width={114} />
            </div>

            {/* 우: 안내+점수 → 상체+하체 */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* 안내 + 점수 — 같은 줄 */}
              <div className="flex items-center justify-between mb-1.5 px-1">
                {(sorted.length > 0 || build.state.bottomColor || build.state.shoesColor) && editMode.type === 'idle'
                  ? <div className="text-[9px] text-warm-400 dark:text-warm-500">{t('build.tapToEdit')}</div>
                  : <div />}
                <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-display flex-shrink-0 ${scoreColor}`}>
                  {score > 0 ? t('common.score', { score }) : '--'}
                </div>
              </div>

              {/* 상체 + 하체 2열 */}
              <div className="flex gap-1 flex-1">
                {/* 상체 */}
                <div className="flex-1 flex flex-col gap-1 justify-center min-w-0">
                  <div className="text-[9px] font-semibold text-warm-500 dark:text-warm-400 px-1 mb-0.5">{t('build.upperBody')}</div>
              {sorted.length === 0 ? (
                <div className="text-[11px] text-warm-500 dark:text-warm-400 px-1">{t('build.addItemPlease')}</div>
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
                      <div className="text-[11px] font-semibold text-warm-800 dark:text-warm-200 truncate">{item?.emoji} {layer.colorKey ? getColorName(layer.colorKey) : ''}</div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* 우: 하의 + 신발 + 악세서리 */}
            <div className="flex-1 flex flex-col gap-1 justify-center min-w-0">
              <div className="text-[9px] font-semibold text-warm-500 dark:text-warm-400 px-1 mb-0.5">{t('build.lowerBody')}</div>
              {[
                { key: 'bottom', emoji: '👖', label: t('categories.bottom'), color: build.state.bottomColor },
                { key: 'shoes', emoji: '👞', label: t('categories.shoes'), color: build.state.shoesColor },
                { key: 'scarf', emoji: '🧣', label: t('categories.scarf'), color: build.state.scarfColor },
                { key: 'hat', emoji: '🎩', label: t('categories.hat'), color: build.state.hatColor },
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
                    <div className="text-[11px] text-warm-700 dark:text-warm-300 truncate">{sec.emoji} {sec.color ? getColorName(sec.color) : sec.label}</div>
                  </button>
                )
              })}
            </div>
              </div>{/* inner flex: 상체+하체 */}
            </div>{/* right area wrapper */}
          </div>{/* outer flex: mannequin row */}

          {/* 날씨 바 — 가로 전체 */}
          {weatherComment && (
            <div className="mt-2 px-1 py-1.5 bg-sky-50 dark:bg-sky-900/20 rounded-lg text-[11px] text-sky-700 dark:text-sky-300 text-center">
              {weatherEmoji(weather?.code || 0)} {weatherComment.temp}°C {t('build.feelsLabel')} {weatherComment.feels}°C · 💨 {weatherComment.wind}km/h{weatherComment.comment ? ` · ${weatherComment.comment}` : ''}
            </div>
          )}
        </div>
      )}

      {/* 접기/펴기 */}
      <button onClick={() => setMannCollapsed(!mannCollapsed)}
        className="w-full text-center text-[11px] text-warm-500 dark:text-warm-400 py-1.5 border-b border-warm-300 dark:border-warm-700 active:opacity-70">
        {mannCollapsed ? t('build.showMannequinCollapse') : t('build.collapse')}
      </button>

      {/* 선택 영역 */}
      <div className="px-5 pt-3 pb-24">
        {/* 편집 모드 안내 */}
        {editMode.type === 'add' && (
          <div className="flex items-center justify-between bg-terra-50 dark:bg-terra-900/20 border border-terra-200 dark:border-terra-800 rounded-xl px-3 py-2 mb-3">
            <span className="text-[12px] font-semibold text-terra-700 dark:text-terra-300">{t('build.addClothes')}</span>
            <button onClick={cancelEdit} className="text-[11px] text-terra-600 underline">{t('common.cancel')}</button>
          </div>
        )}
        {editMode.type === 'edit_upper' && (
          <div className="flex items-center justify-between bg-terra-50 dark:bg-terra-900/20 border border-terra-200 dark:border-terra-800 rounded-xl px-3 py-2 mb-3">
            <span className="text-[12px] font-semibold text-terra-700 dark:text-terra-300">{upper[editMode.index]?.emoji} {t('build.editing')}</span>
            <div className="flex items-center gap-3">
              <button onClick={() => { build.removeUpper(editMode.index); cancelEdit() }} className="text-[11px] text-red-500">{t('common.delete')}</button>
              <button onClick={cancelEdit} className="text-[11px] text-terra-600 underline">{t('common.cancel')}</button>
            </div>
          </div>
        )}
        {editMode.type === 'edit_simple' && (
          <div className="flex items-center justify-between bg-terra-50 dark:bg-terra-900/20 border border-terra-200 dark:border-terra-800 rounded-xl px-3 py-2 mb-3">
            <span className="text-[12px] font-semibold text-terra-700 dark:text-terra-300">
              {t('build.simpleEditColor', { part: t('categories:names.' + editMode.target) })}
            </span>
            <button onClick={cancelEdit} className="text-[11px] text-terra-600 underline">{t('common.cancel')}</button>
          </div>
        )}

        {/* 아이템 그리드 — 새로 추가할 때만 (편집 시에는 바로 컬러 피커) */}
        {(editMode.type === 'add' || (editMode.type === 'idle' && upper.length === 0)) && !tmpItem && (
          <>
            <div className="text-[11px] font-semibold text-warm-500 dark:text-warm-400 mb-2">{t('build.items')}</div>
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              {ITEMS_CATALOG.filter(i => !i.slot).map(item => {
                const used = usedItemIds.has(item.id)
                const selected = editMode.type === 'edit_upper' && upper[editMode.index]?.itemId === item.id
                return (
                  <button key={item.id} disabled={used}
                    onClick={() => handleItemTap(item.id)}
                    className={`flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl text-center transition-all active:scale-93 ${
                      selected ? 'bg-terra-100 dark:bg-terra-900/30 border-terra-400 border-1.5' : used ? 'opacity-30 border border-warm-200' : 'bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600'
                    }`}>
                    <span className="text-lg">{item.emoji}</span>
                    <span className="text-[10px] font-semibold text-warm-700 dark:text-warm-300">{t('categories:itemsCatalog.' + item.id)}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* 컬러 피커 — 아이템 선택 후 or 하체 편집 시 */}
        {(tmpItem || isSimpleEdit || (editMode.type === 'edit_upper' && (tmpItem || upper[editMode.index]))) && (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-semibold text-warm-500 dark:text-warm-400">
                {tmpItem ? t('build.itemColor', { item: t('categories:itemsCatalog.' + tmpItem) }) :
                 isSimpleEdit ? t('build.simpleEditColor', { part: t('categories:names.' + editMode.target) }) :
                 editMode.type === 'edit_upper' ? t('build.itemColorChange', { item: t('categories:itemsCatalog.' + upper[editMode.index]?.itemId) }) :
                 t('build.colorLabel')}
              </div>
              {(tmpItem || (editMode.type === 'edit_upper' && !tmpItem)) && (
                <button onClick={() => {
                  setTmpItem(null); setTmpColor(null); setPreviewHex(null)
                  if (editMode.type !== 'edit_upper') return
                  // edit_upper에서는 아이템 변경 모드로 전환
                  build.setEditMode({ type: 'add' })
                }}
                  className="text-[10px] text-warm-500 dark:text-warm-400 underline">{t('build.changeItem')}</button>
              )}
            </div>

            {/* 추천 색상 스트립은 피커의 "● 추천" 탭으로 옮겼다 (안내 층) */}
            <div className="text-[10px] font-semibold text-warm-400 dark:text-warm-500 mb-2">{t('build.colors')}</div>
            <ColorPicker
              inline
              selected={tmpColor || (editMode.type === 'edit_upper' ? upper[editMode.index]?.colorKey : editMode.type === 'edit_simple' ? build.state[editMode.target + 'Color'] : null) || null}
              onSelect={(key) => handleColorSelect(key)}
              scoreDeltaFn={currentSlot ? (key) => build.calcScoreDelta(currentSlot, key) : undefined}
              ctx="build"
              slot={currentSlot}
              marks={guide?.marks}
              recommended={guideRec}
            />
          </>
        )}

        {/* 안내 층: 더 올리려면? — 옷 하나의 색만 바꿔 얻는 최선의 한 수 */}
        {editMode.type === 'idle' && build.isComplete && score > 0 && (
          <div className="mb-2">
            {moves === null ? (
              <div className="flex gap-2">
                <button onClick={() => { const m = build.getBestMoves(3); setMoves(m); trackGuide('moves_open', { score, n: m.length, best: m[0]?.gain ?? 0 }) }}
                  className="flex-1 py-2.5 rounded-xl bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 text-[12.5px] font-semibold text-warm-800 dark:text-warm-200 flex items-center justify-center gap-1.5 active:scale-[0.98]">
                  <Sparkles size={14} className="text-terra-500" /> {t('build.moves.title')}
                </button>
                {undoMove && (
                  <button onClick={() => { undoMove(); setUndoMove(null); trackGuide('move_undo', {}) }}
                    className="px-3 py-2.5 rounded-xl bg-warm-200 dark:bg-warm-700 text-[12px] font-medium text-warm-700 dark:text-warm-300 active:scale-[0.98]">{t('build.moves.undo')}</button>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[12px] font-semibold text-warm-800 dark:text-warm-200 flex items-center gap-1"><Sparkles size={13} className="text-terra-500" /> {t('build.moves.title')}</div>
                  <button onClick={() => setMoves(null)} className="text-[11px] text-warm-500">{t('common.close')}</button>
                </div>
                {moves.length === 0 ? (
                  <div className="text-[12px] text-warm-600 dark:text-warm-400 py-1">{t('build.moves.none')}</div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {moves.map(m => {
                      const from = COLORS_60[m.from], to = COLORS_60[m.to]
                      return (
                        <button key={m.slot} onClick={() => {
                            const undo = build.applyMove(m); setUndoMove(() => undo); setMoves(null)
                            trackGuide('move_apply', { slot: m.slot, from: m.from, to: m.to, gain: m.gain, score_before: score })
                            toast.success(t('build.moves.applied', { part: getBuildPartLabel(m.slot, upper), color: getColorName(m.to), n: m.gain }))
                          }}
                          className="flex items-center gap-2 px-2 py-2 rounded-xl bg-warm-50 dark:bg-warm-900/40 active:scale-[0.98] text-left">
                          <span className="text-[11.5px] font-semibold text-warm-800 dark:text-warm-200 w-16 truncate">{getBuildPartLabel(m.slot, upper)}</span>
                          <span className="w-4 h-4 rounded border border-black/10" style={{ background: from?.hex }} />
                          <span className="text-warm-400 text-[11px]">→</span>
                          <span className="w-4 h-4 rounded border border-black/10" style={{ background: to?.hex }} />
                          <span className="text-[11.5px] text-warm-800 dark:text-warm-200 flex-1 truncate">{getColorName(m.to)}</span>
                          <span className="text-[11.5px] font-bold text-green-600">+{m.gain}</span>
                        </button>
                      )
                    })}
                    <div className="text-[10px] text-warm-500 mt-0.5">{t('build.moves.hint')}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* idle 상태 + 아이템 있을 때: 안내 */}
        {editMode.type === 'idle' && upper.length > 0 && (
          <div className="text-center py-6">
            {!build.isComplete && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 mb-4 text-[13px] text-blue-800 dark:text-blue-300">
                💡 {(() => {
                  const missing = []
                  if (!build.state.bottomColor) missing.push(t('categories:names.bottom'))
                  if (!build.state.shoesColor) missing.push(t('categories:names.shoes'))
                  return missing.length > 0 ? t('build.missingParts', { parts: missing.join(', ') }) : t('build.readyToSee')
                })()}
                <div className="flex gap-2 mt-2 justify-center">
                  {!build.state.bottomColor && (
                    <button onClick={() => startEdit({ type: 'edit_simple', target: 'bottom' })}
                      className="px-3 py-1.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded-lg text-[11px] font-semibold active:scale-95">
                      {t('build.selectBottom')}
                    </button>
                  )}
                  {!build.state.shoesColor && (
                    <button onClick={() => startEdit({ type: 'edit_simple', target: 'shoes' })}
                      className="px-3 py-1.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded-lg text-[11px] font-semibold active:scale-95">
                      {t('build.selectShoes')}
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="text-[12px] text-warm-500 dark:text-warm-400" dangerouslySetInnerHTML={{ __html: t('build.editHint') }} />
          </div>
        )}

        {/* 완전 초기: 안내 */}
        {editMode.type === 'idle' && upper.length === 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 mb-4 text-[13px] text-blue-800 dark:text-blue-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: t('build.initialPrompt') }} />

        )}
      </div>

      {/* 하단 고정 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white/90 dark:bg-[#1C1917]/90 backdrop-blur-xl border-t border-warm-300 dark:border-warm-700 px-5 py-3 z-50"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
        {/* 컬러 선택됨 → 확정 버튼 */}
        {(isEditing || tmpItem) && tmpColor ? (
          <div className="flex gap-2">
            <button onClick={handleConfirm}
              className="flex-1 py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm shadow-terra active:scale-98 flex items-center justify-center gap-1.5">
              <Check size={15} />
              {editMode.type === 'edit_upper' ? t('build.confirmEdit') : isSimpleEdit ? t('build.confirmSelect') : t('build.confirmAdd')}
            </button>
            <button onClick={cancelEdit} className="px-5 py-3.5 bg-warm-200 dark:bg-warm-700 text-warm-600 dark:text-warm-400 rounded-2xl font-medium text-sm active:scale-98">
              {t('common.cancel')}
            </button>
          </div>
        ) : (isEditing || tmpItem) && !tmpColor ? (
          /* 편집 중이지만 컬러 미선택 */
          <div className="flex gap-2">
            <div className="flex-1 py-3.5 rounded-2xl font-semibold text-sm text-center text-warm-500 dark:text-warm-400 bg-warm-100 dark:bg-warm-800">
              {tmpItem && !tmpColor ? t('build.selectColor') :
               isSimpleEdit ? t('build.selectColor') :
               editMode.type === 'edit_upper' ? t('build.selectColor') : ''}
            </div>
            <button onClick={cancelEdit} className="px-5 py-3.5 bg-warm-200 dark:bg-warm-700 text-warm-600 dark:text-warm-400 rounded-2xl font-medium text-sm active:scale-98">
              {t('common.cancel')}
            </button>
          </div>
        ) : build.isComplete ? (
          <div className="flex gap-2">
            <button onClick={() => startEdit({ type: 'add' })}
              className="flex-1 py-3.5 bg-warm-200 dark:bg-warm-700 text-warm-700 dark:text-warm-300 rounded-2xl font-medium text-sm active:scale-98 flex items-center justify-center gap-1.5">
              <Plus size={15} /> {t('build.addClothes')}
            </button>
            <button onClick={goToResult}
              className="flex-1 py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm shadow-terra active:scale-98">
              {t('build.viewResults')}
            </button>
          </div>
        ) : (
          <button onClick={() => {
            if (upper.length > 0) startEdit({ type: 'add' })
          }}
            disabled={upper.length === 0}
            className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-98 ${
              upper.length > 0 ? 'bg-terra-500 text-white shadow-terra'
              : 'bg-warm-300 dark:bg-warm-700 text-warm-500'
            }`}>
            {upper.length === 0 ? t('build.selectItem') : t('build.addMore')}
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
  const { t } = useTranslation()
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
        <ArrowLeft size={16} /> {t('common.back')}
      </button>
      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-1">{t('build.stepFabric')}</h2>
      <p className="text-sm text-warm-600 dark:text-warm-400 mb-4">{t('build.fabricDesc')}</p>

      <div className="flex gap-1.5 mb-5">
        <button onClick={() => setSeasonFilter(null)} className={`px-3 py-1.5 rounded-full text-[11px] font-semibold ${!seasonFilter ? 'bg-terra-500 text-white' : 'bg-warm-200 dark:bg-warm-700 text-warm-600'}`}>{t('common.all')}</button>
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
        {t('build.viewResults')}
      </button>
    </div>
  )
}

// ─── 헬퍼: partKey → 유저가 선택한 아이템 라벨 (BuildCoord용) ───
function getBuildPartLabel(partKey: string, upper: any[]): string {
  const sorted = sortUpper(upper)
  for (let i = 0; i < sorted.length; i++) {
    const slot = getSlotKey(i, sorted.length, sorted[i])
    if (slot === partKey) {
      const item = ITEMS_CATALOG.find(x => x.id === sorted[i].itemId)
      if (item) return i18n.t('categories:itemsCatalog.' + item.id)
    }
  }
  const fallbacks: Record<string, string> = { top: i18n.t('categories.top'), bottom: i18n.t('categories.bottom'), shoes: i18n.t('categories.shoes'), outer: i18n.t('categories.outer'), middleware: i18n.t('categories.middleware'), scarf: i18n.t('categories.scarf'), hat: i18n.t('categories.hat') }
  return fallbacks[partKey] || partKey
}

// ═══════════════════════════════════════
// Step 4: 결과
// ═══════════════════════════════════════
function StepResult({ build, navigate }: { build: BH; navigate: any }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { user, profile: authProfile } = useAuth() as any
  const { weather } = useWeather()
  const [card, setCard] = useState<{ url: string; ratio: CardRatio } | null>(null)
  const [cardBusy, setCardBusy] = useState(false)
  const [askBusy, setAskBusy] = useState(false)
  const score = build.getScore()
  const evalResult = build.getEvalResult()
  const circumference = 2 * Math.PI * 52
  const offset = circumference * (1 - score / 100)
  const outfit = getFilledOutfit(build.state)
  const filledParts = Object.entries(outfit).filter(([_, v]) => v)

  // 계측: 결과 화면 도달 = 만들기 완료 (한 번만)
  useEffect(() => {
    trackBuildComplete({ score, n_upper: build.state.upper.length, colors: outfit, style: build.state.style, mode: build.state.mode, fabric: !!build.state.fabricMode })
  }, [])

  // 엔진 v7.1: 명도 구조 30 · 색 수·면적 20 · 조화 20 · 시선 정리 10 · 상황·계절 10 · 나에게 15(퍼스널컬러 있을 때)
  const scoreItems = evalResult ? evalResult.parts.map(p => ({ label: t('build.v7parts.' + p.key, { defaultValue: p.label }), value: p.value, max: p.max, desc: '' })) : []
  const reasonLines = evalResult && i18n.language.startsWith('ko')
    ? [...evalResult.reasons.filter(r => r.w < 0).slice(0, 2), ...evalResult.reasons.filter(r => r.w > 0).slice(0, 2)]
    : []

  const handleSave = () => {
    const name = build.state.style || t('common.coord')
    const saved = JSON.parse(localStorage.getItem('cs_saved') || '[]')
    saved.unshift({ id: Date.now().toString(36), outfit, score, name, createdAt: Date.now(), engine: ENGINE_VERSION, pal: PALETTE_VERSION, template: build.state.templateId || null })
    if (saved.length > 100) saved.length = 100
    setJSON('cs_saved', saved)
    trackSave('build', score)
    toast.success(t('recommend.saveSuccess'))
  }

  const handleCommunityShare = () => { trackShare('community', 'build', score); setJSON("_pending_post_outfit", outfit); navigate("/community/post") }

  // ── 루프 L1: 오늘의 코디 카드 ──
  const sceneNow = charSceneFromBuild(build.state.upper, build.outfitHex, { bottomItem: build.state.bottomItem, shoesItem: build.state.shoesItem })
  const colorsNow = filledParts.map(([, key]) => ({ key: key as string, hex: COLORS_60[key as string]?.hex || '#ccc', name: getColorName(key as string) }))
  const stampText = [weather?.feels != null ? `${weather.feels}°` : null, build.state.situ ? t('outfit.situ.' + build.state.situ) : null].filter(Boolean).join(' ')
  const makeCard = async (ratio: CardRatio) => {
    if (cardBusy) return
    setCardBusy(true)
    try {
      const tags = (evalResult ? evalResult.reasons.filter(r => r.w > 0).slice(0, 2).map(r => r.txt.split(/[,—]/)[0].trim()) : [])
      const url = await drawCoordCard({
        scene: sceneNow, score, grade: scoreGrade.label, tags, colors: colorsNow,
        dateText: new Date().toLocaleDateString(i18n.language.startsWith('ko') ? 'ko-KR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        stamp: stampText || undefined, handle: authProfile?.nickname ? '@' + authProfile.nickname : undefined,
        link: 'barupick.vercel.app', watermark: t('card.watermark'),
      }, ratio)
      setCard({ url, ratio })
      trackShare('card', 'build', score)
    } catch { toast.error(t('card.fail')) } finally { setCardBusy(false) }
  }
  const shareCard = async () => { if (!card) return; const r = await shareDataUrl(card.url, `barupick-${Date.now()}.png`, t('card.title')); if (r === 'downloaded') toast.success(t('card.saved')) }

  // ── 루프 L3: 친구에게 물어보기 (A = 지금, B = 한 수 바꾼 버전) ──
  const ask = async () => {
    if (askBusy) return
    setAskBusy(true)
    try {
      const a: VoteSide = { scene: sceneNow, colors: colorsNow, score, label: t('vote.labelA') }
      let bSide: VoteSide | null = null
      const m = build.getBestMoves(1)[0]
      if (m) {
        const hexB = { ...build.outfitHex, [m.slot]: COLORS_60[m.to]?.hex }
        const outfitB = { ...outfit, [m.slot]: m.to }
        bSide = {
          scene: charSceneFromBuild(build.state.upper, hexB, { bottomItem: build.state.bottomItem, shoesItem: build.state.shoesItem }),
          colors: Object.entries(outfitB).filter(([, v]) => v).map(([, key]) => ({ key: key as string, hex: COLORS_60[key as string]?.hex || '#ccc', name: getColorName(key as string) })),
          score: m.score, label: t('vote.labelB'),
        }
      }
      const sub = [weather?.feels != null ? `${weather.feels}°` : null, build.state.situ ? t('outfit.situ.' + build.state.situ) : null, bSide ? t('vote.twoSub') : t('vote.singleSub')].filter(Boolean).join(' · ')
      let ogDataUrl: string | null = null
      try { ogDataUrl = await drawVoteOg(a, bSide, t('vote.defaultQ'), sub); if (import.meta.env.DEV) (window as any).__bp_lastOg = ogDataUrl } catch (e: any) { ogDataUrl = null; trackVote('create', { og_draw_fail: String(e?.message || e).slice(0, 200) }) }
      const v = await createVote({ a, b: bSide, question: t('vote.defaultQ'), situ: build.state.situ || null, temp: weather?.feels ?? null, ownerId: user?.id || null, ogDataUrl })
      trackVote('create', { code: v.code, two: !!bSide, score })
      navigate('/v/' + v.code)
    } catch { toast.error(t('vote.failCreate')) } finally { setAskBusy(false) }
  }

  // 등급 기준은 v7.1 분포로 올렸다: 완벽 92 · 훌륭 84 · 좋음 72 · 괜찮 60 (연구 11장)
  const scoreGrade = score >= 92 ? { label: t('build.scoreGrade.perfect'), emoji: '🏆', color: 'text-amber-600' }
    : score >= 84 ? { label: t('build.scoreGrade.great'), emoji: '✨', color: 'text-terra-600' }
    : score >= 72 ? { label: t('build.scoreGrade.good'), emoji: '👍', color: 'text-sage' }
    : score >= 60 ? { label: t('build.scoreGrade.okay'), emoji: '🙂', color: 'text-warm-600' }
    : { label: t('build.scoreGrade.improve'), emoji: '💪', color: 'text-warm-500' }
  const isHighScore = score >= 84

  return (
    <div className="animate-screen-enter">
      <button onClick={() => build.setVizCollapsed(!build.vizCollapsed)} className="w-full text-center text-xs text-warm-600 py-2 mb-2 active:opacity-70">
        {build.vizCollapsed ? t('build.showMannequin') : t('build.hideMannequin')}
      </button>
      {!build.vizCollapsed && (
        <div className="flex justify-center mb-5 py-4 bg-warm-100 dark:bg-warm-800 rounded-2xl">
          <CharacterCanvas {...charSceneFromBuild(build.state.upper, build.outfitHex, { bottomItem: build.state.bottomItem, shoesItem: build.state.shoesItem })} width={180} />
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
          <div className="text-xs font-semibold text-warm-500 uppercase tracking-widest mb-3">{t('build.scoreAnalysis')}</div>
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
          {reasonLines.length > 0 && (
            <div className="mt-3 flex flex-col gap-1">
              {reasonLines.map((r, i) => (
                <div key={i} className={`text-[11px] font-medium leading-snug ${r.w < 0 ? 'text-amber-700 dark:text-amber-400' : 'text-terra-600'}`}>{r.w < 0 ? '△' : '●'} {r.txt}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 색상 칩 */}
      <div className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 mb-5 shadow-warm-sm">
        <div className="flex items-center gap-1.5 text-sm font-bold text-warm-900 dark:text-warm-100 mb-3">
          <Palette size={16} className="text-terra-500" /> {t('build.coordColors')}
        </div>
        <div className="flex gap-2 flex-wrap justify-center py-1">
          {filledParts.map(([cat, colorKey]) => {
            const c = COLORS_60[colorKey]; if (!c) return null
            return (
              <div key={cat} className="flex flex-col items-center gap-1">
                <div className="w-[52px] h-[52px] rounded-xl flex items-center justify-center text-[9px] font-semibold border border-warm-400/30"
                  style={{ background: c.hex, color: c.hcl[2] > 60 ? '#1C1917' : '#fff' }}>{getColorName(colorKey)}</div>
                <div className="text-[10px] text-warm-700 dark:text-warm-300">{getBuildPartLabel(cat, build.state.upper)}</div>
              </div>
            )
          })}
        </div>
      </div>

      <button onClick={() => build.goBack()} className="w-full py-3 border border-terra-400 dark:border-terra-600 text-terra-600 dark:text-terra-400 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-98 mb-2">
        <Edit3 size={16} /> {t('build.editColors')}
      </button>
      <button onClick={handleSave} className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-98 shadow-terra mb-2">
        <Bookmark size={18} /> {t('build.saveCoord')}
      </button>
      <button onClick={ask} disabled={askBusy} className="w-full py-3.5 bg-[#FEE500] text-[#1C1917] rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-98 mb-3 disabled:opacity-60">
        <Users size={18} /> {askBusy ? t('vote.asking') : t('vote.ask')}
      </button>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button onClick={() => makeCard('story')} disabled={cardBusy} className="flex flex-col items-center gap-1.5 py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl active:scale-97 shadow-warm-sm disabled:opacity-60">
          <Share size={18} className="text-warm-700 dark:text-warm-300" /><span className="text-[11px] text-warm-600 font-medium">{cardBusy ? t('card.making') : t('card.btn')}</span>
        </button>
        <button onClick={handleCommunityShare} className="flex flex-col items-center gap-1.5 py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl active:scale-97 shadow-warm-sm">
          <Users size={18} className="text-warm-700 dark:text-warm-300" /><span className="text-[11px] text-warm-600 font-medium">{t('build.communityBtn')}</span>
        </button>
        <button onClick={() => build.pushStep('improve')} className="flex flex-col items-center gap-1.5 py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl active:scale-97 shadow-warm-sm">
          <RefreshCw size={18} className="text-warm-700 dark:text-warm-300" /><span className="text-[11px] text-warm-600 font-medium">{t('build.similarCoords')}</span>
        </button>
      </div>
      <button onClick={() => navigate('/home')} className="w-full py-2 text-sm text-warm-600 text-center active:opacity-70 mb-6">{t('build.goHome')}</button>

      {/* 오늘의 코디 카드 미리보기 */}
      {card && (
        <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center px-6" onClick={() => setCard(null)}>
          <div className="w-full max-w-[360px] bg-white dark:bg-warm-800 rounded-3xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold text-warm-900 dark:text-warm-100">{t('card.title')}</div>
              <div className="flex bg-warm-100 dark:bg-warm-700 rounded-full p-0.5">
                {(['story', 'feed'] as CardRatio[]).map(r => (
                  <button key={r} onClick={() => card.ratio !== r && makeCard(r)} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${card.ratio === r ? 'bg-warm-900 text-white' : 'text-warm-600'}`}>{r === 'story' ? '9:16' : '4:5'}</button>
                ))}
              </div>
              <button onClick={() => setCard(null)} aria-label={t('common.close')} className="w-8 h-8 rounded-full bg-warm-200 dark:bg-warm-700 flex items-center justify-center"><X size={14} /></button>
            </div>
            <img src={card.url} alt="" className={`w-full rounded-2xl border border-warm-300 dark:border-warm-600 object-contain ${card.ratio === 'story' ? 'max-h-[60vh]' : ''}`} />
            <button onClick={shareCard} className="mt-3 w-full py-3 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"><Share size={15} /> {t('card.share')}</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════
// Step 5: 비슷한 코디
// ═══════════════════════════════════════
function StepImprove({ build }: { build: BH }) {
  const { t } = useTranslation()
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
        <ArrowLeft size={16} /> {t('build.backToResult')}
      </button>
      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-2">{t('build.similarTitle')}</h2>
      <p className="text-sm text-warm-600 dark:text-warm-400 mb-5">{t('build.similarDesc')}</p>

      {topImprovements.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {topImprovements.map((imp, idx) => {
            const origC = COLORS_60[imp.original]; const newC = COLORS_60[imp.replacement]
            if (!origC || !newC) return null
            const newOutfitHex = { ...build.outfitHex, [imp.part]: newC.hex }
            return (
              <div key={idx} className="flex items-center gap-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-3 shadow-warm-sm">
                <CharacterCanvas {...charSceneFromBuild(build.state.upper, newOutfitHex, { bottomItem: build.state.bottomItem, shoesItem: build.state.shoesItem })} width={60} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] text-warm-600">{getBuildPartLabel(imp.part, build.state.upper)}</span>
                    <div className="flex items-center gap-1">
                      <span className="w-4 h-4 rounded border border-warm-400" style={{ background: origC.hex }} />
                      <span className="text-warm-400">→</span>
                      <span className="w-4 h-4 rounded border border-warm-400" style={{ background: newC.hex }} />
                    </div>
                  </div>
                  <div className="text-xs text-warm-800 dark:text-warm-200">{getColorName(imp.original)} → <span className="font-semibold text-terra-600">{getColorName(imp.replacement)}</span></div>
                </div>
                <span className="text-sm font-bold text-sage">+{imp.scoreDiff}{t('build.points')}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">✨</div>
          <div className="text-sm text-warm-600 dark:text-warm-400">{t('build.alreadyGood')}</div>
        </div>
      )}
    </div>
  )
}
