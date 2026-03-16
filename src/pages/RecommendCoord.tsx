// @ts-nocheck
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, RefreshCw, Pin, Bookmark, Share, Users, ChevronRight, Palette, X, ChevronDown } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import ColorPicker from '@/components/ui/ColorPicker'
import { COLORS_60 } from '@/lib/colors'
import { MOOD_GROUPS, LAYER_LEVELS, STYLE_GUIDE, STYLE_ICONS, ITEMS_CATALOG } from '@/lib/styles'
import { CATEGORY_NAMES } from '@/lib/categories'
import { evaluationSystem } from '@/lib/evaluation'
import { profile } from '@/lib/profile'
import { trackRecommendComplete, trackSave, trackClick } from '@/lib/analytics'
import { useRecommend, itemsToLayerInfo, type RecStep } from '@/hooks/useRecommend'
import { useToast } from '@/components/ui/Toast'

// ─── 헬퍼: partKey → 유저가 선택한 아이템 라벨 ───
function getPickedPartLabel(partKey: string, pickedItems: string[]): string {
  for (const id of pickedItems) {
    const item = ITEMS_CATALOG.find(i => i.id === id)
    if (!item) continue
    if (partKey === 'outer' && item.outerType) return item.label
    if (partKey === 'middleware' && item.midType) return item.label
    if (partKey === 'scarf' && item.slot === 'scarf') return item.label
    if (partKey === 'hat' && item.slot === 'hat') return item.label
    if (partKey === 'top' && !item.outerType && !item.midType && !item.slot) return item.label
  }
  const fallbacks: Record<string, string> = { top: '이너', bottom: '하의', shoes: '신발', outer: '아우터', middleware: '미들웨어', scarf: '목도리', hat: '모자' }
  return fallbacks[partKey] || partKey
}

export default function RecommendCoord() {
  const navigate = useNavigate()
  const rec = useRecommend()

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      {rec.step === 'mood' && <StepMood rec={rec} />}
      {rec.step === 'style' && <StepStyle rec={rec} />}
      {rec.step === 'pick' && <StepPick rec={rec} />}
      {rec.step === 'results' && <StepResults rec={rec} navigate={navigate} />}
      {rec.step === 'detail' && <StepDetail rec={rec} navigate={navigate} />}
    </div>
  )
}

type RecHook = ReturnType<typeof useRecommend>

// ═══════════════════════════════════════
// Step 1: 무드 선택
// ═══════════════════════════════════════
function StepMood({ rec }: { rec: RecHook }) {
  return (
    <div className="animate-screen-fade">
      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-2">어떤 분위기를 원하세요?</h2>
      <p className="text-sm text-warm-600 dark:text-warm-400 mb-5">무드를 선택하면 해당 스타일의 코디를 추천해 드려요.</p>

      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {Object.entries(MOOD_GROUPS).map(([key, group]) => (
          <button key={key} onClick={() => rec.selectMood(key)}
            className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-5 text-center shadow-warm-sm active:scale-[0.97] transition-all">
            <div className="text-2xl mb-2">{group.icon}</div>
            <div className="text-sm font-semibold text-warm-900 dark:text-warm-100">{group.name}</div>
            <div className="text-[11px] text-warm-600 dark:text-warm-400 mt-1 leading-snug">{group.description}</div>
          </button>
        ))}
      </div>
      <button onClick={() => rec.selectMood(null)}
        className="text-sm text-terra-600 font-medium w-full text-center py-2 active:opacity-70">
        전체 스타일에서 추천 →
      </button>
    </div>
  )
}

// ═══════════════════════════════════════
// Step 2: 스타일 선택
// ═══════════════════════════════════════
function StepStyle({ rec }: { rec: RecHook }) {
  const group = rec.state.mood ? MOOD_GROUPS[rec.state.mood] : null
  if (!group) return null
  return (
    <div className="animate-screen-enter">
      <button onClick={rec.goBack} className="flex items-center gap-1 text-sm text-warm-600 dark:text-warm-400 mb-4 active:opacity-70">
        <ArrowLeft size={16} /> 뒤로
      </button>
      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-2">{group.icon} {group.name}</h2>
      <p className="text-sm text-warm-600 dark:text-warm-400 mb-5">스타일을 선택하세요.</p>
      <div className="flex flex-col gap-2.5 mb-5">
        {group.styles.map((s: string) => {
          const sd = STYLE_GUIDE[s]
          const icon = (STYLE_ICONS as any)?.[s] || '🎨'
          return (
            <button key={s} onClick={() => rec.selectStyle(s)}
              className="w-full flex items-center gap-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 text-left shadow-warm-sm active:scale-[0.98] transition-all">
              <span className="text-xl flex-shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold text-warm-900 dark:text-warm-100">{sd?.name || s}</div>
                <div className="text-xs text-warm-600 dark:text-warm-400 mt-0.5">{sd?.subtitle || ''}</div>
              </div>
              <ChevronRight size={16} className="text-warm-500 flex-shrink-0" />
            </button>
          )
        })}
      </div>
      <button onClick={() => rec.selectStyle(null)}
        className="text-sm text-terra-600 font-medium w-full text-center py-2 active:opacity-70">
        전체에서 추천 →
      </button>
    </div>
  )
}

// ═══════════════════════════════════════
// Step 3: 아이템 선택 (꼭 입고 싶은 옷)
// ═══════════════════════════════════════
function StepPick({ rec }: { rec: RecHook }) {
  const picked = rec.state.pickedItems
  const info = itemsToLayerInfo(picked)

  // 마네킹 미리보기
  const sampleOutfit: Record<string, string> = { top: '#E7E5E4', bottom: '#44403C', shoes: '#78716C' }
  if (info.hasOuter) sampleOutfit.outer = '#57534E'
  if (info.hasMid) sampleOutfit.middleware = '#A8A29E'
  if (info.hasScarf) sampleOutfit.scarf = '#D6D3D1'
  if (info.hasHat) sampleOutfit.hat = '#78716C'

  return (
    <div className="animate-screen-enter">
      <button onClick={rec.goBack} className="flex items-center gap-1 text-sm text-warm-600 dark:text-warm-400 mb-4 active:opacity-70">
        <ArrowLeft size={16} /> 뒤로
      </button>

      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-1">
        이건 꼭 입고 싶다!
      </h2>
      <p className="text-sm text-warm-600 dark:text-warm-400 mb-5">
        하는 옷이 있으면 골라주세요. 없으면 바로 넘어가도 돼요.
      </p>

      {/* 마네킹 미리보기 */}
      <div className="flex justify-center mb-5 py-4 bg-warm-100 dark:bg-warm-800 rounded-2xl">
        <MannequinSVG outfit={sampleOutfit} options={{ outerType: info.outerType, midType: info.midType }} size={120} />
      </div>

      {/* 기본 포함 안내 */}
      <div className="flex items-center gap-2 mb-3 text-[11px] text-warm-500 dark:text-warm-400 bg-warm-50 dark:bg-warm-800 rounded-xl px-3 py-2">
        <span>👕 이너 + 👖 하의 + 👟 신발은 항상 포함돼요</span>
      </div>

      {/* 아이템 그리드 — 의류 */}
      <div className="text-[11px] font-semibold text-warm-500 dark:text-warm-400 mb-2">의류</div>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {ITEMS_CATALOG.filter(i => !i.slot).map(item => {
          const selected = picked.includes(item.id)
          return (
            <button key={item.id} onClick={() => rec.toggleItem(item.id)}
              className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl text-center transition-all active:scale-93 ${
                selected
                  ? 'bg-terra-50 dark:bg-terra-900/30 border-[1.5px] border-terra-400 shadow-warm'
                  : 'bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600'
              }`}>
              <span className="text-xl">{item.emoji}</span>
              <span className={`text-[10px] font-semibold ${selected ? 'text-terra-700 dark:text-terra-400' : 'text-warm-700 dark:text-warm-300'}`}>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* 아이템 그리드 — 악세서리 */}
      <div className="text-[11px] font-semibold text-warm-500 dark:text-warm-400 mb-2">악세서리</div>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {ITEMS_CATALOG.filter(i => i.slot).map(item => {
          const selected = picked.includes(item.id)
          return (
            <button key={item.id} onClick={() => rec.toggleItem(item.id)}
              className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl text-center transition-all active:scale-93 ${
                selected
                  ? 'bg-terra-50 dark:bg-terra-900/30 border-[1.5px] border-terra-400 shadow-warm'
                  : 'bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600'
              }`}>
              <span className="text-xl">{item.emoji}</span>
              <span className={`text-[10px] font-semibold ${selected ? 'text-terra-700 dark:text-terra-400' : 'text-warm-700 dark:text-warm-300'}`}>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* 선택된 구성 요약 */}
      {picked.length > 0 && (
        <div className="mb-4 text-center text-xs text-warm-600 dark:text-warm-400">
          {picked.map(id => ITEMS_CATALOG.find(i => i.id === id)?.label).filter(Boolean).join(' + ')} + 이너 + 하의 + 신발
        </div>
      )}

      {/* CTA */}
      <button onClick={rec.generateFromPick}
        className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra">
        {picked.length === 0 ? '전체 추천받기' : '이 옷으로 추천받기'} <ArrowRight size={18} />
      </button>
    </div>
  )
}

// ═══════════════════════════════════════
// Step 4: 결과 리스트
// ═══════════════════════════════════════
function StepResults({ rec, navigate }: { rec: RecHook; navigate: any }) {
  const toast = useToast()
  const [showItemPicker, setShowItemPicker] = useState(false)
  const [pinPart, setPinPart] = useState<string | null>(null)

  const results = rec.state.results
  const layerData = LAYER_LEVELS[rec.state.layerType]
  const partKeys = layerData?.partKeys || ['top', 'bottom', 'shoes']
  const picked = rec.state.pickedItems
  const pinned = rec.state.pinned || {}

  return (
    <div className="animate-screen-enter">
      <button onClick={rec.goBack} className="flex items-center gap-1 text-sm text-warm-600 dark:text-warm-400 mb-4 active:opacity-70">
        <ArrowLeft size={16} /> 뒤로
      </button>

      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-2">
        추천 코디 {results.length}개
      </h2>

      {/* ─── 현재 조건 칩 ─── */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {/* 선택된 아이템 칩 */}
        {picked.map(id => {
          const item = ITEMS_CATALOG.find(i => i.id === id)
          if (!item) return null
          return (
            <button key={id} onClick={() => rec.toggleItemInResults(id)}
              className="flex items-center gap-1 bg-terra-50 dark:bg-terra-900/30 border border-terra-300 dark:border-terra-700 rounded-full px-2.5 py-1 text-[11px] font-semibold text-terra-700 dark:text-terra-400 active:scale-95">
              {item.emoji} {item.label} <X size={10} />
            </button>
          )
        })}

        {/* 고정된 컬러 칩 */}
        {Object.entries(pinned).map(([part, colorKey]) => {
          const c = COLORS_60[colorKey]
          if (!c) return null
          const partName = (CATEGORY_NAMES as any)?.[part] || part
          return (
            <button key={part} onClick={() => rec.clearPin(part)}
              className="flex items-center gap-1 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-full px-2.5 py-1 text-[11px] font-semibold text-warm-700 dark:text-warm-300 active:scale-95">
              <span className="w-3 h-3 rounded-full border border-warm-300" style={{ background: c.hex }} />
              {partName} 고정 <X size={10} />
            </button>
          )
        })}

        {/* 옷 추가 버튼 */}
        <button onClick={() => setShowItemPicker(!showItemPicker)}
          className="flex items-center gap-1 bg-warm-100 dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-full px-2.5 py-1 text-[11px] font-medium text-warm-600 dark:text-warm-400 active:scale-95">
          + 옷 변경
        </button>

        {/* 컬러 고정 버튼 */}
        <button onClick={() => setPinPart(pinPart ? null : partKeys[0])}
          className="flex items-center gap-1 bg-warm-100 dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-full px-2.5 py-1 text-[11px] font-medium text-warm-600 dark:text-warm-400 active:scale-95">
          <Pin size={10} /> 컬러 고정
        </button>
      </div>

      {/* ─── 인라인 아이템 피커 ─── */}
      {showItemPicker && (
        <div className="mb-4 bg-warm-50 dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl p-3 animate-screen-fade">
          <div className="text-[11px] font-semibold text-warm-600 dark:text-warm-400 mb-2">옷 추가/제거 (탭하면 바로 반영)</div>
          <div className="grid grid-cols-4 gap-1.5">
            {ITEMS_CATALOG.map(item => {
              const sel = picked.includes(item.id)
              return (
                <button key={item.id} onClick={() => rec.toggleItemInResults(item.id)}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-xl text-center transition-all active:scale-93 ${
                    sel ? 'bg-terra-100 dark:bg-terra-900/30 border-terra-400 border-[1.5px]' : 'bg-white dark:bg-warm-700 border border-warm-300 dark:border-warm-600'
                  }`}>
                  <span className="text-base">{item.emoji}</span>
                  <span className="text-[9px] font-semibold text-warm-700 dark:text-warm-300">{item.label}</span>
                </button>
              )
            })}
          </div>
          <button onClick={() => setShowItemPicker(false)} className="w-full mt-2 text-center text-[11px] text-warm-500 dark:text-warm-400 py-1">닫기</button>
        </div>
      )}

      {/* ─── 인라인 컬러 고정 ─── */}
      {pinPart && (
        <div className="mb-4 bg-warm-50 dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl p-3 animate-screen-fade">
          <div className="text-[11px] font-semibold text-warm-600 dark:text-warm-400 mb-2">고정할 부위를 선택하세요</div>
          <div className="flex gap-1.5 mb-3">
            {partKeys.map((pk: string) => {
              // 유저가 선택한 아이템명으로 표시 (코트, 니트 등)
              const pickedLabel = (() => {
                for (const id of picked) {
                  const item = ITEMS_CATALOG.find(i => i.id === id)
                  if (!item) continue
                  if (pk === 'outer' && item.outerType) return item.label
                  if (pk === 'middleware' && item.midType) return item.label
                  if (pk === 'scarf' && item.slot === 'scarf') return item.label
                  if (pk === 'hat' && item.slot === 'hat') return item.label
                  if (pk === 'top' && !item.outerType && !item.midType && !item.slot) return item.label
                }
                const fallbacks: Record<string, string> = { top: '이너', bottom: '하의', shoes: '신발', outer: '아우터', middleware: '미들웨어', scarf: '목도리', hat: '모자' }
                return fallbacks[pk] || pk
              })()
              return (
              <button key={pk} onClick={() => setPinPart(pk)}
                className={`flex-1 py-2 rounded-xl text-[11px] font-semibold text-center transition-all ${
                  pinPart === pk ? 'bg-terra-500 text-white' : 'bg-white dark:bg-warm-700 border border-warm-300 dark:border-warm-600 text-warm-600 dark:text-warm-400'
                }`}>
                {pickedLabel}
                {pinned[pk] && <span className="ml-1">📌</span>}
              </button>
              )
            })}
          </div>
          <ColorPicker
            inline
            selected={pinned[pinPart]}
            onSelect={(k) => rec.togglePin(pinPart, k)}
            onClear={() => rec.clearPin(pinPart)}
          />
          <div className="flex gap-2 mt-2">
            <button onClick={() => setPinPart(null)} className="flex-1 text-center text-[11px] text-warm-500 dark:text-warm-400 py-1">닫기</button>
            {Object.keys(pinned).length > 0 && (
              <button onClick={() => { rec.clearAllPins(); setPinPart(null) }} className="text-[11px] text-red-500 py-1">전체 해제</button>
            )}
          </div>
        </div>
      )}

      {/* ─── 셔플 ─── */}
      <div className="flex justify-end mb-3">
        <button onClick={rec.regenerate} className="flex items-center gap-1 text-xs text-terra-600 dark:text-terra-400 font-medium active:opacity-70">
          <RefreshCw size={13} /> 다시 섞기
        </button>
      </div>

      {/* ─── 결과 카드 ─── */}
      <div className="flex flex-col gap-3">
        {results.map((combo, idx) => {
          const outfitHex = outfitToHex(combo.outfit)
          const parts = Object.keys(combo.outfit).filter(k => combo.outfit[k])
          return (
            <button key={idx} onClick={() => rec.openDetail(idx)}
              className="w-full flex items-center gap-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-3 shadow-warm-sm active:scale-[0.98] transition-all text-left">
              <MannequinSVG outfit={outfitHex} options={{ outerType: rec.state.outerType, midType: rec.state.midType }} size={70} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-display text-lg font-bold ${
                    combo.score >= 85 ? 'text-green-600 dark:text-green-400' : combo.score >= 70 ? 'text-warm-800 dark:text-warm-200' : 'text-warm-500'
                  }`}>{combo.score}점</span>
                  {combo.tags?.[0] && <span className="text-[9px] bg-warm-200 dark:bg-warm-700 text-warm-600 dark:text-warm-400 px-1.5 py-0.5 rounded-full">{combo.tags[0]}</span>}
                </div>
                <div className="flex gap-1">
                  {parts.slice(0, 5).map(k => {
                    const c = COLORS_60[combo.outfit[k]]
                    return c ? <div key={k} className="w-5 h-5 rounded border border-warm-300 dark:border-warm-500" style={{ background: c.hex }} /> : null
                  })}
                </div>
              </div>
              <ChevronRight size={16} className="text-warm-400 flex-shrink-0" />
            </button>
          )
        })}
      </div>

      {results.length === 0 && (
        <div className="text-center py-16">
          <div className="text-3xl mb-3">🤔</div>
          <div className="text-sm text-warm-600 dark:text-warm-400">추천 결과가 없어요. 조건을 바꿔보세요.</div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════
// Step 5: 상세 보기
// ═══════════════════════════════════════
function StepDetail({ rec, navigate }: { rec: RecHook; navigate: any }) {
  const toast = useToast()
  const combo = rec.state.results[rec.state.detailIdx]
  const [saveModal, setSaveModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [vizCollapsed, setVizCollapsed] = useState(false)
  const [editingPart, setEditingPart] = useState<string | null>(null)
  const [editedOutfit, setEditedOutfit] = useState<Record<string, string> | null>(null)

  if (!combo) return <div className="text-center py-16 text-warm-500 dark:text-warm-400">결과를 불러올 수 없어요</div>

  const currentOutfit = editedOutfit || combo.outfit
  const outfitHex = outfitToHex(currentOutfit)
  const parts = Object.keys(currentOutfit).filter(k => currentOutfit[k])

  let evalResult: any = null
  let finalScore = combo.score
  try {
    const pc = profile.getPersonalColor()
    evalResult = evaluationSystem.evaluate(currentOutfit, pc)
    finalScore = evalResult?.total || combo.score
  } catch {}

  const circumference = 2 * Math.PI * 52
  const offset = circumference * (1 - finalScore / 100)

  const scoreItems = evalResult ? [
    { label: '컬러 배치', value: evalResult.goldilocks, max: 33, desc: '인접 부위 연결' },
    { label: '색상 비율', value: evalResult.ratio, max: 17, desc: '주색·보조색 밸런스' },
    { label: '색상 조화', value: evalResult.harmony, max: 17, desc: '전체 조화' },
    { label: '계절감', value: evalResult.season, max: 8, desc: '컬러 온도' },
    { label: '밸런스', value: evalResult.balance, max: 8, desc: '명도·채도 균형' },
    ...(evalResult.hasPersonalColor ? [{ label: '퍼스널컬러', value: evalResult.personal, max: 17, desc: '얼굴 근처 컬러' }] : []),
    ...(evalResult.hasBodyFit ? [{ label: '체형 맞춤', value: evalResult.bodyFit, max: 8, desc: '체형별 컬러 배치' }] : []),
  ] : []

  const handleSave = () => {
    const name = saveName.trim() || combo.name
    const saved = JSON.parse(localStorage.getItem('cs_saved') || '[]')
    saved.unshift({ id: Date.now().toString(36), outfit: currentOutfit, score: finalScore, name, createdAt: Date.now() })
    if (saved.length > 100) saved.length = 100
    localStorage.setItem('cs_saved', JSON.stringify(saved))
    setSaveModal(false)
    setSaveName('')
    trackSave('recommend', finalScore)
    toast.success('저장했어요!')
  }

  return (
    <div className="animate-screen-enter">
      <button onClick={() => setVizCollapsed(!vizCollapsed)} className="w-full text-center text-xs text-warm-600 dark:text-warm-400 py-2 mb-2 active:opacity-70">
        {vizCollapsed ? '👤 마네킹 보기 ▼' : '👤 마네킹 접기 ▲'}
      </button>

      {!vizCollapsed && (
        <div className="flex justify-center mb-5 py-4 bg-warm-100 dark:bg-warm-800 rounded-2xl">
          <MannequinSVG outfit={outfitHex} options={{ outerType: rec.state.outerType, midType: rec.state.midType }} size={200} />
        </div>
      )}

      {/* 태그 */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-terra-100 dark:bg-terra-900/30 text-terra-700 dark:text-terra-400">{combo.name}</span>
        {combo.tags?.[0] && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-warm-300 dark:bg-warm-700 text-warm-700 dark:text-warm-300">{combo.tags[0]}</span>}
        {evalResult?.hasPersonalColor && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400">퍼스널컬러✓</span>}
      </div>

      {/* 점수 원형 + 부위 컬러 */}
      <div className="flex items-center gap-5 mb-5">
        <div className="relative w-[120px] h-[120px] flex-shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx={60} cy={60} r={52} fill="none" stroke="#E7E5E4" strokeWidth={8} />
            <circle cx={60} cy={60} r={52} fill="none" stroke="#C2785C" strokeWidth={8}
              strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-bold text-warm-900 dark:text-warm-100">{finalScore}</span>
            <span className="text-[10px] text-warm-600 dark:text-warm-400">/ 100</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          {parts.map((k: string) => {
            const colorKey = combo.outfit[k]; const c = COLORS_60[colorKey]
            return (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span className="w-4 h-4 rounded flex-shrink-0 border border-warm-400 dark:border-warm-500" style={{ background: c?.hex || '#ccc' }} />
                <span className="text-warm-500 dark:text-warm-400 w-10">{getPickedPartLabel(k, rec.state.pickedItems)}</span>
                <span className="text-warm-800 dark:text-warm-200 font-medium">{c?.name || ''}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 배색 이론 태그 */}
      {evalResult?.theory && evalResult.theory.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 mb-4">
          {evalResult.theory.map((t: string, i: number) => (
            <span key={i} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-warm-300 dark:bg-warm-700 text-warm-700 dark:text-warm-300">{t}</span>
          ))}
        </div>
      )}

      {/* 피드백 */}
      {evalResult?.feedback && (
        <div className="bg-warm-200 dark:bg-warm-700 rounded-2xl p-4 text-sm text-warm-800 dark:text-warm-200 leading-relaxed mb-5">{evalResult.feedback}</div>
      )}

      {/* 점수 분해도 */}
      {scoreItems.length > 0 && (
        <div className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 mb-5 shadow-warm-sm">
          {scoreItems.map((item, idx) => (
            <div key={idx} className="mb-2.5 last:mb-0">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-warm-700 dark:text-warm-300 font-medium">{item.label}</span>
                <span className="text-warm-500 dark:text-warm-400">{Math.round(item.value)} / {item.max}</span>
              </div>
              <div className="h-1.5 bg-warm-300 dark:bg-warm-600 rounded-full overflow-hidden">
                <div className="h-full bg-terra-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 액션 */}
      <div className="flex flex-col gap-2.5 mb-5">
        <button onClick={() => { setSaveName(combo.name); setSaveModal(true) }}
          className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra">
          <Bookmark size={18} /> 이 코디 저장하기
        </button>
        <button onClick={() => { navigator.share?.({ title: '바루픽 코디', text: combo?.name + ' ' + finalScore + '점', url: 'https://barupick.vercel.app' }).catch(() => {}) }}
          className="w-full py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 text-warm-800 dark:text-warm-200 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
          <Share size={16} /> 이 조합 공유하기
        </button>
        <button onClick={() => { localStorage.setItem('_pending_post_outfit', JSON.stringify(combo.outfit)); window.location.href = '/community/post' }}
          className="w-full py-3 bg-warm-900 dark:bg-warm-100 text-white dark:text-warm-900 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
          <Users size={16} /> 커뮤니티에 공유
        </button>
      </div>

      {/* 저장 모달 */}
      {saveModal && (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center px-8" onClick={() => setSaveModal(false)}>
          <div className="bg-white dark:bg-warm-800 rounded-2xl p-5 w-full max-w-sm shadow-warm-lg" onClick={e => e.stopPropagation()}>
            <div className="text-lg font-bold text-warm-900 dark:text-warm-100 mb-3">코디 저장</div>
            <input type="text" value={saveName} onChange={e => setSaveName(e.target.value)} maxLength={30} autoFocus
              placeholder="코디 이름을 입력하세요"
              className="w-full px-4 py-3 bg-warm-100 dark:bg-warm-700 border border-warm-400 dark:border-warm-600 rounded-xl text-sm text-warm-900 dark:text-warm-100 placeholder-warm-500 focus:outline-none focus:border-terra-400 mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setSaveModal(false)} className="flex-1 py-2.5 bg-warm-200 dark:bg-warm-700 text-warm-700 dark:text-warm-300 rounded-xl text-sm font-medium active:scale-[0.98]">취소</button>
              <button onClick={handleSave} className="flex-1 py-2.5 bg-terra-500 text-white rounded-xl text-sm font-semibold active:scale-[0.98] shadow-terra">저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 색상 개선 */}
      <div className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 mb-5 shadow-warm-sm">
        <div className="flex items-center gap-1.5 text-sm font-bold text-warm-900 dark:text-warm-100 mb-1">
          <Palette size={16} className="text-terra-500" /> 색상 개선하기
        </div>
        <div className="text-xs text-warm-600 dark:text-warm-400 mb-3">부위를 탭하면 색상을 교체할 수 있어요</div>
        <div className="flex gap-2 flex-wrap justify-center py-1 pb-2">
          {Object.entries(currentOutfit).filter(([_, v]) => v).map(([cat, colorKey]) => {
            const c = COLORS_60[colorKey as string]
            if (!c) return null
            const isEditing = editingPart === cat
            return (
              <button key={cat} onClick={() => setEditingPart(isEditing ? null : cat)}
                className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className={`w-[52px] h-[52px] rounded-xl flex items-center justify-center text-[9px] font-semibold active:scale-90 transition-transform border ${isEditing ? 'border-terra-500 border-2 ring-2 ring-terra-300' : 'border-warm-400/30'}`}
                  style={{ background: c.hex }}>
                  <span style={{ color: c.hcl[2] > 60 ? '#1C1917' : '#ffffff' }}>{c.name}</span>
                </div>
                <div className={`text-[10px] whitespace-nowrap ${isEditing ? 'text-terra-600 dark:text-terra-400 font-semibold' : 'text-warm-700 dark:text-warm-300'}`}>
                  {getPickedPartLabel(cat, rec.state.pickedItems)}
                </div>
              </button>
            )
          })}
        </div>
        {editingPart && (() => {
          const scoredColors = Object.keys(COLORS_60)
            .filter(k => k !== currentOutfit[editingPart])
            .map(k => {
              try {
                const testOutfit = { ...currentOutfit, [editingPart]: k }
                const pc = profile.getPersonalColor()
                const newScore = evaluationSystem.evaluate(testOutfit, pc).total
                return { key: k, delta: Math.round(newScore - finalScore) }
              } catch { return { key: k, delta: 0 } }
            })
            .sort((a, b) => b.delta - a.delta)
          const topColors = scoredColors.slice(0, 10)

          return (
          <div className="mt-2 animate-screen-fade">
            <div className="text-[11px] font-semibold text-warm-600 dark:text-warm-400 mb-2">
              {getPickedPartLabel(editingPart, rec.state.pickedItems)} 색상 변경
            </div>

            {/* 추천 색상 */}
            {topColors.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-semibold text-warm-400 dark:text-warm-500">추천 색상</div>
                </div>
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {topColors.map(rec => {
                    const c = COLORS_60[rec.key]
                    if (!c) return null
                    const light = c.hcl[2] > 55
                    return (
                      <button key={rec.key} onClick={() => {
                          setEditedOutfit(prev => ({ ...(prev || combo.outfit), [editingPart]: rec.key }))
                        }}
                        className={`h-11 rounded-lg flex items-center justify-center text-[9px] font-semibold relative transition-all active:scale-90 ${
                          currentOutfit[editingPart] === rec.key ? 'ring-2 ring-terra-500 ring-offset-1 scale-105' : ''
                        }`}
                        style={{ background: c.hex, color: light ? '#1C1917' : '#fff' }}>
                        {c.name}
                        {rec.delta > 0 && <span className="absolute -top-1 -right-1 bg-green-100 text-green-600 text-[7px] font-bold px-1 rounded">+{rec.delta}</span>}
                        {rec.delta < -1 && <span className="absolute -top-1 -right-1 bg-red-100 text-red-500 text-[7px] font-bold px-1 rounded">{rec.delta}</span>}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            <div className="text-[10px] font-semibold text-warm-400 dark:text-warm-500 mb-2">{topColors.length > 0 ? '전체 색상' : '색상'}</div>
            <ColorPicker
              inline
              selected={currentOutfit[editingPart]}
              onSelect={(k) => {
                setEditedOutfit(prev => ({ ...(prev || combo.outfit), [editingPart]: k }))
              }}
              onClear={() => setEditingPart(null)}
              scoreDeltaFn={(k) => {
                try {
                  const testOutfit = { ...currentOutfit, [editingPart]: k }
                  const pc = profile.getPersonalColor()
                  const newScore = evaluationSystem.evaluate(testOutfit, pc).total
                  return Math.round(newScore - finalScore)
                } catch { return 0 }
              }}
            />
            {editedOutfit && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => { setEditedOutfit(null); setEditingPart(null) }}
                  className="flex-1 py-2 text-[11px] text-warm-500 dark:text-warm-400 bg-warm-100 dark:bg-warm-700 rounded-xl active:scale-[0.98]">원래대로</button>
                <button onClick={() => setEditingPart(null)}
                  className="flex-1 py-2 text-[11px] text-white bg-terra-500 rounded-xl font-semibold active:scale-[0.98]">적용</button>
              </div>
            )}
          </div>
          )
        })()}
      </div>

      {/* 뒤로 */}
      <button onClick={rec.goBack}
        className="w-full py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 text-warm-700 dark:text-warm-300 rounded-2xl font-medium text-sm flex items-center justify-center gap-1.5 mb-12 active:scale-[0.98] transition-all">
        <ArrowLeft size={16} /> 목록으로
      </button>
    </div>
  )
}

// ─── 헬퍼: outfit colorKey → hex 변환 ───
function outfitToHex(outfit: Record<string, string>): Record<string, string> {
  const hex: Record<string, string> = {}
  Object.entries(outfit).forEach(([k, v]) => { if (v) hex[k] = COLORS_60[v]?.hex || v })
  return hex
}
