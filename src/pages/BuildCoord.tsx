// @ts-nocheck
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Bookmark, Share, Users, Palette, Scissors, ChevronRight, Sparkles, Check, ThumbsUp, ThumbsDown, Minus, RefreshCw } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import ColorPicker from '@/components/ui/ColorPicker'
import { useToast } from '@/components/ui/Toast'
import { COLORS_60 } from '@/lib/colors'
import { MOOD_GROUPS, STYLE_GUIDE, STYLE_ICONS } from '@/lib/styles'
import { CATEGORY_NAMES, FABRIC_ITEMS, FABRIC_SEASONS, FABRIC_COMPAT_RULES, getFabricCompat, evaluateFabricCombo } from '@/lib/categories'
import { useBuild, type BuildStep } from '@/hooks/useBuild'
import { profile } from '@/lib/profile'

// ─── 스텝 인디케이터 ───
const STEP_LABELS: Partial<Record<BuildStep, string>> = {
  style: '스타일',
  item: '부위',
  garment: '형태',
  color: '색상',
  ask: '추가',
  fabric: '소재',
  result: '결과',
  improve: '개선',
}
// 표시할 핵심 단계 순서 (ask는 중간 질문이라 표시하지 않음)
const STEP_ORDER: BuildStep[] = ['style', 'item', 'color', 'result']

function StepIndicator({ current, fabricMode }: { current: BuildStep; fabricMode: boolean }) {
  // 실제 표시할 단계: fabric 모드면 '소재' 단계 추가
  const steps = fabricMode
    ? ['style', 'item', 'color', 'fabric', 'result'] as BuildStep[]
    : STEP_ORDER

  // garment/ask는 item/color의 하위 단계로 취급
  const mappedCurrent = (current === 'garment' || current === 'ask') ? 'item'
    : current === 'improve' ? 'result'
    : current

  const currentIdx = steps.indexOf(mappedCurrent as BuildStep)

  return (
    <div className="flex items-center gap-1.5 mb-4 px-1">
      {steps.map((step, i) => {
        const isActive = i === currentIdx
        const isDone = i < currentIdx
        return (
          <div key={step} className="flex items-center gap-1.5 flex-1">
            {/* 도트 + 라벨 */}
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className={`h-1 w-full rounded-full transition-all duration-300 ${
                isDone ? 'bg-terra-500' : isActive ? 'bg-terra-400' : 'bg-warm-400'
              }`} />
              <span className={`text-[10px] font-medium transition-colors ${
                isActive ? 'text-terra-600 font-semibold' : isDone ? 'text-terra-500' : 'text-warm-500'
              }`}>
                {STEP_LABELS[step]}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function BuildCoord() {
  const navigate = useNavigate()
  const build = useBuild('coord')

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-6">
      {/* 스텝 인디케이터 — result/improve에서는 숨김 */}
      {build.step !== 'result' && build.step !== 'improve' && (
        <StepIndicator current={build.step} fabricMode={build.state.fabricMode} />
      )}

      {build.step === 'style' && <StepStyle build={build} />}
      {build.step === 'item' && <StepItem build={build} />}
      {build.step === 'garment' && <StepGarment build={build} />}
      {build.step === 'color' && <StepColor build={build} />}
      {build.step === 'ask' && <StepAsk build={build} />}
      {build.step === 'fabric' && <StepFabric build={build} />}
      {build.step === 'result' && <StepResult build={build} navigate={navigate} />}
      {build.step === 'improve' && <StepImprove build={build} />}
    </div>
  )
}

type BH = ReturnType<typeof useBuild>

// ═══════════════════════════════════════
// Step 1: 스타일 선택
// ═══════════════════════════════════════
function StepStyle({ build }: { build: BH }) {
  return (
    <div className="animate-screen-fade">
      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-2">스타일 선택</h2>
      <p className="text-sm text-warm-600 mb-5">스타일에 맞는 컬러를 추천해 드려요. 건너뛰기도 가능합니다.</p>

      {Object.entries(MOOD_GROUPS).map(([key, group]) => (
        <div key={key} className="mb-5">
          <div className="text-xs font-semibold text-warm-600 tracking-wide mb-2.5">
            {group.icon} {group.name}
          </div>
          <div className="flex flex-wrap gap-2">
            {group.styles.map((s: string) => {
              const sd = STYLE_GUIDE[s]
              const icon = (STYLE_ICONS as any)?.[s] || '🎨'
              return (
                <button
                  key={s}
                  onClick={() => build.selectStyle(s)}
                  className="px-4 py-2.5 bg-white border border-warm-400 rounded-2xl text-sm font-medium text-warm-800 shadow-warm-sm active:scale-[0.97] transition-all hover:border-terra-300"
                >
                  {icon} {sd?.name || s}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* 소재 토글 */}
      <div className="h-px bg-warm-400 my-4" />
      <div className="flex items-center justify-between py-2 mb-4">
        <div className="flex items-center gap-2.5">
          <Scissors size={18} className="text-warm-600" />
          <div>
            <div className="text-sm font-semibold text-warm-900">소재도 함께 고르기</div>
            <div className="text-[11px] text-warm-600">부위별 색상 선택 후 소재를 골라 궁합 체크</div>
          </div>
        </div>
        <button
          onClick={() => build.update({ fabricMode: !build.state.fabricMode })}
          role="switch"
          aria-checked={build.state.fabricMode}
          aria-label="소재도 함께 고르기"
          className={`w-12 h-7 rounded-full p-0.5 transition-colors ${build.state.fabricMode ? 'bg-terra-500' : 'bg-warm-400'}`}
        >
          <div className={`w-6 h-6 rounded-full bg-white shadow transition-transform ${build.state.fabricMode ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      <button
        onClick={() => build.selectStyle(null)}
        className="text-sm text-terra-600 font-medium w-full text-center py-2 active:opacity-70 transition-opacity"
      >
        스타일 없이 시작 →
      </button>
    </div>
  )
}

// ═══════════════════════════════════════
// Step 2: 시작 부위 선택
// ═══════════════════════════════════════
function StepItem({ build }: { build: BH }) {
  const items = ['top', 'bottom', 'outer', 'middleware', 'scarf', 'shoes']
  const title = build.state.mode === 'coord' ? '어떤 부위부터 시작할까요?' : '부위별 색상을 입력해주세요'

  return (
    <div className="animate-screen-enter">
      <button onClick={build.goBack} className="flex items-center gap-1 text-sm text-warm-600 mb-4 active:opacity-70">
        <ArrowLeft size={16} /> 뒤로
      </button>

      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-2">{title}</h2>
      <p className="text-sm text-warm-600 mb-5">가장 먼저 정하고 싶은 부위를 선택하세요</p>

      <div className="grid grid-cols-3 gap-2.5">
        {items.map(item => (
          <button
            key={item}
            onClick={() => build.selectStartItem(item)}
            className="bg-white border border-warm-400 rounded-2xl py-5 px-2 text-center shadow-warm-sm active:scale-[0.97] transition-all hover:shadow-warm hover:border-terra-300"
          >
            <div className="text-2xl mb-2">
              {item === 'top' ? '👕' : item === 'bottom' ? '👖' : item === 'outer' ? '🧥' : item === 'middleware' ? '🧶' : item === 'scarf' ? '🧣' : '👞'}
            </div>
            <div className="text-[13px] font-medium text-warm-800">{(CATEGORY_NAMES as any)?.[item] || item}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// Step 3: 옷 종류 선택 (아우터/미들웨어)
// ═══════════════════════════════════════
function StepGarment({ build }: { build: BH }) {
  const item = build.state.currentItem
  const showOuter = !item || item === 'outer'
  const showMid = !item || item === 'middleware'

  const outerTypes = [
    { key: 'coat', label: '코트', sub: '긴 기장 · 라펠' },
    { key: 'jacket', label: '자켓', sub: '짧은 기장 · 라펠' },
    { key: 'padding', label: '패딩', sub: '볼륨 · 퀼팅' },
  ]
  const midTypes = [
    { key: 'knit', label: '니트/스웨터', sub: '크루넥 풀오버' },
    { key: 'cardigan', label: '가디건', sub: '오픈 프론트' },
    { key: 'vest', label: '조끼/베스트', sub: '소매 없음' },
  ]
  const sample: Record<string, string> = { top: '#ffffff', bottom: '#1e293b', shoes: '#8B4513' }

  return (
    <div className="animate-screen-enter">
      <button onClick={build.goBack} className="flex items-center gap-1 text-sm text-warm-600 mb-4 active:opacity-70">
        <ArrowLeft size={16} /> 뒤로
      </button>

      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-2">어떤 종류의 옷인가요?</h2>
      <p className="text-sm text-warm-600 mb-5">마네킹에 표시될 옷의 형태를 선택해주세요</p>

      {showOuter && (
        <GarmentGrid
          title="아우터 종류"
          types={outerTypes}
          selected={build.state.outerType}
          onSelect={(k) => build.setGarment('outerType', k)}
          sample={{ ...sample, outer: '#4a5568' }}
          outerType={build.state.outerType}
          midType={build.state.midType}
          garmentField="outerType"
        />
      )}

      {showMid && (
        <GarmentGrid
          title="이너웨어 종류"
          types={midTypes}
          selected={build.state.midType}
          onSelect={(k) => build.setGarment('midType', k)}
          sample={{ ...sample, middleware: '#a0aec0' }}
          outerType={build.state.outerType}
          midType={build.state.midType}
          garmentField="midType"
        />
      )}

      <button
        onClick={build.confirmGarment}
        className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra mt-3"
      >
        이 형태로 보기 <ArrowRight size={18} />
      </button>
    </div>
  )
}

function GarmentGrid({ title, types, selected, onSelect, sample, outerType, midType, garmentField }: any) {
  return (
    <div className="mb-5">
      <div className="text-xs font-semibold text-warm-600 tracking-widest uppercase mb-3">{title}</div>
      <div className="grid grid-cols-3 gap-2.5">
        {types.map((t: any) => {
          const sel = selected === t.key
          const opts = garmentField === 'outerType'
            ? { outerType: t.key, midType }
            : { outerType, midType: t.key }
          return (
            <button
              key={t.key}
              onClick={() => onSelect(t.key)}
              className={`rounded-2xl border-[1.5px] p-3 text-center transition-all active:scale-[0.97] ${
                sel ? 'bg-terra-50 border-terra-400 shadow-warm' : 'bg-white border-warm-400 shadow-warm-sm hover:border-terra-300'
              }`}
            >
              <div className="flex justify-center mb-2">
                <MannequinSVG outfit={sample} options={opts} size={70} />
              </div>
              <div className="text-[13px] font-semibold text-warm-900">{t.label}</div>
              <div className="text-[11px] text-warm-600 mt-0.5">{t.sub}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// Step 4: 색상 선택
// ═══════════════════════════════════════
function StepColor({ build }: { build: BH }) {
  const item = build.state.currentItem
  const recs = build.getColorRecommendations(item)
  const currentColor = build.state.colors[item]
  const filledCount = Object.values(build.state.colors).filter(Boolean).length

  // 점수 변화 미리보기용 — 이미 2색 이상 선택한 상태일 때만 표시
  const showDelta = filledCount >= 2

  const handleNext = () => {
    if (!currentColor) return
    const queue = [...build.state.itemQueue]
    queue.shift()
    if (queue.length === 0) {
      build.pushStep(build.state.fabricMode ? 'fabric' : 'result')
    } else {
      const next = queue[0]
      const nextItem = typeof next === 'string' ? next : (next as any).item
      build.update({ currentItem: nextItem, itemQueue: queue })
      if (typeof next !== 'string') {
        build.pushStep('ask')
      } else if (nextItem === 'outer' || nextItem === 'middleware') {
        build.pushStep('garment')
      } else {
        build.pushStep('color')
      }
    }
  }

  return (
    <div className="animate-screen-enter pb-[110px]">
      {/* 마네킹 토글 */}
      <button
        onClick={() => build.setVizCollapsed(!build.vizCollapsed)}
        aria-expanded={!build.vizCollapsed}
        aria-label="마네킹 미리보기"
        className="w-full text-center text-xs text-warm-600 py-2 mb-2 active:opacity-70"
      >
        {build.vizCollapsed ? '👤 마네킹 보기 ▼' : '👤 마네킹 접기 ▲'}
      </button>

      {!build.vizCollapsed && (
        <div className="flex justify-center mb-4 py-4 bg-warm-100 dark:bg-warm-800 rounded-2xl">
          <MannequinSVG
            outfit={build.outfitHex}
            options={{ outerType: build.state.outerType, midType: build.state.midType }}
            size={160}
          />
        </div>
      )}

      <h2 className="font-display text-lg font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-1 flex items-center gap-2">
        <Palette size={20} className="text-terra-500" />
        {(CATEGORY_NAMES as any)?.[item] || item} 색상 선택
      </h2>

      {/* 퍼스널컬러·체형 맞춤 토글 */}
      {profile.hasFitSettings() && (
        <div className="flex items-center justify-between bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-xl px-3 py-2 mb-3 shadow-warm-sm">
          <div className="text-xs text-warm-700 dark:text-warm-300 font-medium">🎨👤 퍼스널컬러·체형 맞춤</div>
          <button onClick={() => { const next = !profile.getFitMode(); profile.setFitMode(next) }}
            role="switch"
            aria-checked={profile.getFitMode()}
            aria-label="퍼스널컬러·체형 맞춤"
            className={`w-10 h-6 rounded-full p-0.5 transition-colors ${profile.getFitMode() ? 'bg-terra-500' : 'bg-warm-400'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${profile.getFitMode() ? 'translate-x-4' : ''}`} />
          </button>
        </div>
      )}

      {/* 추천 색상 + 점수 변화 + 뱃지 */}
      {recs.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-wide mb-2 flex items-center gap-1">
            <Sparkles size={12} className="text-terra-500" /> 추천 색상
            {recs[0]?.reason && <span className="text-[10px] text-warm-500 font-normal ml-1">{recs[0].reason}</span>}
          </div>
          <div className="flex gap-2 flex-wrap">
            {recs.slice(0, 12).map(r => {
              const c = COLORS_60[r.key]
              if (!c) return null
              const sel = currentColor === r.key
              const delta = showDelta ? build.calcScoreDelta(item, r.key) : 0
              return (
                <div key={r.key} className="relative">
                  <button
                    onClick={() => build.selectColor(r.key)}
                    className={`w-11 h-11 rounded-xl border-[1.5px] transition-all active:scale-90 ${
                      sel ? 'border-terra-500 ring-2 ring-terra-300 scale-110' : 'border-warm-400'
                    }`}
                    style={{ background: c.hex }}
                    title={`${c.name} (${r.score}점) ${r.reason || ''}`}
                  />
                  {/* PC/체형 뱃지 */}
                  {(r.badges?.pc || r.badges?.body) && (
                    <span className="absolute -top-1.5 -left-1.5 text-[8px] leading-none">
                      {r.badges.pc && '🎨'}{r.badges.body && '👤'}
                    </span>
                  )}
                  {showDelta && delta !== 0 && (
                    <span className={`absolute -top-2 -right-2 text-[9px] font-bold px-1 py-0.5 rounded-full ${
                      delta > 0 ? 'bg-green-500 text-white' : 'bg-red-400 text-white'
                    }`}>
                      {delta > 0 ? '+' : ''}{delta}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 전체 컬러 피커 */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-wide mb-2">전체 색상</div>
        <ColorPicker
          inline
          selected={currentColor}
          onSelect={(k) => build.selectColor(k)}
          onClear={() => build.update({ colors: { ...build.state.colors, [item]: null } })}
        />
      </div>

      {/* ═══ 하단 고정 CTA 바 ═══ */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white/95 dark:bg-[#1C1917]/95 backdrop-blur-[20px] border-t border-warm-400/60 dark:border-warm-600/60 z-[190] px-5 py-3"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* 선택된 색상 미리보기 */}
        {currentColor ? (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg border border-warm-400" style={{ background: COLORS_60[currentColor]?.hex }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-warm-900 dark:text-warm-100">{COLORS_60[currentColor]?.name}</div>
              <div className="text-[11px] text-warm-600 dark:text-warm-400">{(CATEGORY_NAMES as any)?.[item]}</div>
            </div>
            {showDelta && (() => {
              const delta = build.calcScoreDelta(item, currentColor)
              if (delta === 0) return <Check size={16} className="text-terra-500" />
              return (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  delta > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {delta > 0 ? '+' : ''}{delta}점
                </span>
              )
            })()}
          </div>
        ) : (
          <div className="text-center text-[12px] text-warm-500 mb-3">색상을 선택해주세요</div>
        )}

        {/* 버튼 행 */}
        <div className="flex gap-2">
          <button
            onClick={build.goBack}
            className="px-5 py-3 bg-warm-200 dark:bg-warm-700 text-warm-700 dark:text-warm-300 rounded-2xl text-sm font-medium active:scale-[0.98] transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <button
            onClick={handleNext}
            disabled={!currentColor}
            className={`flex-1 py-3 ${currentColor ? 'bg-terra-500 shadow-terra' : 'bg-warm-400'} text-white rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all`}
          >
            다음 <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// Step 5: 선택적 아이템 질문
// ═══════════════════════════════════════
function StepAsk({ build }: { build: BH }) {
  const item = build.state.currentItem
  const emoji = item === 'outer' ? '🧥' : item === 'middleware' ? '🧶' : item === 'scarf' ? '🧣' : item === 'hat' ? '🎩' : '👞'

  return (
    <div className="animate-screen-enter text-center py-8">
      <div className="w-16 h-16 rounded-full bg-terra-100 flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">{emoji}</span>
      </div>
      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-2">{(CATEGORY_NAMES as any)?.[item]}</h2>
      <p className="text-sm text-warm-600 mb-6">{(CATEGORY_NAMES as any)?.[item]}도 코디에 포함할까요?</p>
      <div className="flex gap-2.5 max-w-xs mx-auto">
        <button
          onClick={() => build.answerOptional(true)}
          className="flex-1 py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all shadow-terra"
        >
          네, 선택할게요
        </button>
        <button
          onClick={() => build.answerOptional(false)}
          className="flex-1 py-3.5 bg-white border border-warm-400 text-warm-700 rounded-2xl font-medium text-sm active:scale-[0.98] transition-all"
        >
          건너뛰기
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// Step 5.5: 소재 선택 (fabricMode ON일 때)
// ═══════════════════════════════════════
function StepFabric({ build }: { build: BH }) {
  const filledParts = Object.entries(build.state.colors).filter(([_, v]) => v)
  const [fabrics, setFabrics] = useState<Record<string, any>>(build.state.fabrics || {})

  // 현재 계절
  const currentSeason = (() => {
    const m = new Date().getMonth()
    if (m >= 2 && m <= 4) return 'spring'
    if (m >= 5 && m <= 7) return 'summer'
    if (m >= 8 && m <= 10) return 'fall'
    return 'winter'
  })()

  const [seasonFilter, setSeasonFilter] = useState<string | null>(currentSeason)

  const handleSelect = (part: string, item: any) => {
    setFabrics(prev => {
      const next = { ...prev }
      if (next[part]?.id === item.id) {
        delete next[part]
      } else {
        next[part] = item
      }
      return next
    })
  }

  const handleConfirm = () => {
    build.update({ fabrics })
    build.pushStep('result')
  }

  // 궁합 평가
  const compatPairs = useMemo(() => evaluateFabricCombo(fabrics), [fabrics])
  const badCount = compatPairs.filter(p => p.rating === 'bad').length
  const greatCount = compatPairs.filter(p => p.rating === 'great').length

  return (
    <div className="animate-screen-enter">
      <button onClick={build.goBack} className="flex items-center gap-1 text-sm text-warm-600 dark:text-warm-400 mb-4 active:opacity-70">
        <ArrowLeft size={16} /> 뒤로
      </button>

      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-1">소재 선택</h2>
      <p className="text-sm text-warm-600 dark:text-warm-400 mb-4">각 부위의 소재를 골라 궁합을 확인하세요</p>

      {/* 계절 필터 */}
      <div className="flex gap-1.5 mb-5">
        <button
          onClick={() => setSeasonFilter(null)}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
            !seasonFilter ? 'bg-terra-500 text-white' : 'bg-warm-200 dark:bg-warm-700 text-warm-600 dark:text-warm-400'
          }`}
        >전체</button>
        {Object.entries(FABRIC_SEASONS).map(([key, s]) => (
          <button
            key={key}
            onClick={() => setSeasonFilter(seasonFilter === key ? null : key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
              seasonFilter === key ? 'bg-terra-500 text-white' : 'bg-warm-200 dark:bg-warm-700 text-warm-600 dark:text-warm-400'
            }`}
          >{s.emoji} {s.name}</button>
        ))}
      </div>

      {/* 부위별 소재 선택 */}
      {filledParts.map(([part, colorKey]) => {
        const items = FABRIC_ITEMS[part]
        if (!items || items.length === 0) return null
        const c = COLORS_60[colorKey!]
        const filtered = seasonFilter ? items.filter(i => i.seasons.includes(seasonFilter)) : items
        const selected = fabrics[part]

        return (
          <div key={part} className="mb-5">
            <div className="flex items-center gap-2 mb-2.5">
              {c && <span className="w-4 h-4 rounded border border-warm-400" style={{ background: c.hex }} />}
              <span className="text-xs font-semibold text-warm-600 dark:text-warm-400 uppercase tracking-widest">{(CATEGORY_NAMES as any)?.[part]}</span>
              {selected && <span className="text-[10px] text-terra-600 dark:text-terra-400 font-medium ml-auto">{selected.name}</span>}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {filtered.map(item => {
                const sel = selected?.id === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(part, item)}
                    className={`flex-shrink-0 w-[120px] border rounded-xl p-2.5 text-left transition-all active:scale-[0.97] ${
                      sel
                        ? 'bg-terra-50 dark:bg-terra-900/30 border-terra-400 shadow-warm'
                        : 'bg-white dark:bg-warm-800 border-warm-400 dark:border-warm-600 shadow-warm-sm'
                    }`}
                  >
                    <div className="text-lg mb-1">{item.icon}</div>
                    <div className="text-[12px] font-semibold text-warm-900 dark:text-warm-100 leading-tight">{item.name}</div>
                    <div className="text-[10px] text-warm-500 dark:text-warm-400 mt-0.5 leading-snug">{item.desc}</div>
                    <div className="flex gap-0.5 mt-1.5">
                      {item.seasons.map(s => (
                        <span key={s} className="text-[9px]">{FABRIC_SEASONS[s]?.emoji}</span>
                      ))}
                    </div>
                  </button>
                )
              })}
              {filtered.length === 0 && (
                <div className="text-[11px] text-warm-500 dark:text-warm-400 py-3">이 계절에 해당하는 소재가 없어요</div>
              )}
            </div>
          </div>
        )
      })}

      {/* 실시간 궁합 표시 */}
      {compatPairs.length > 0 && (
        <FabricCompatSection pairs={compatPairs} badCount={badCount} greatCount={greatCount} />
      )}

      {/* 확인 */}
      <button
        onClick={handleConfirm}
        className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra mt-3"
      >
        {Object.keys(fabrics).length > 0 ? '소재 궁합 확인 완료' : '소재 선택 건너뛰기'} <ArrowRight size={18} />
      </button>
    </div>
  )
}

// ─── 소재 궁합 표시 공용 컴포넌트 ───
function FabricCompatSection({ pairs, badCount, greatCount }: { pairs: any[]; badCount: number; greatCount: number }) {
  const ratingIcons = { great: <ThumbsUp size={13} className="text-green-600" />, ok: <Minus size={13} className="text-warm-500" />, bad: <ThumbsDown size={13} className="text-red-500" /> }
  const ratingColors = { great: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800', ok: 'bg-warm-50 dark:bg-warm-800 border-warm-300 dark:border-warm-600', bad: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' }
  const ratingLabels = { great: '추천', ok: '무난', bad: '비추' }

  return (
    <div className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 shadow-warm-sm mb-4">
      <div className="flex items-center gap-1.5 text-sm font-bold text-warm-900 dark:text-warm-100 mb-1">
        <Scissors size={16} className="text-terra-500" /> 소재 궁합
      </div>
      <div className="flex gap-3 text-[11px] text-warm-600 dark:text-warm-400 mb-3">
        {greatCount > 0 && <span className="text-green-600 dark:text-green-400 font-medium">추천 {greatCount}쌍</span>}
        {badCount > 0 && <span className="text-red-500 dark:text-red-400 font-medium">비추 {badCount}쌍</span>}
        {greatCount === 0 && badCount === 0 && <span>모두 무난한 조합이에요</span>}
      </div>
      <div className="flex flex-col gap-1.5">
        {pairs.map((p, idx) => (
          <div key={idx} className={`flex items-start gap-2 border rounded-xl px-3 py-2 ${ratingColors[p.rating]}`}>
            <div className="flex-shrink-0 mt-0.5">{ratingIcons[p.rating]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-warm-800 dark:text-warm-200">
                <span>{(CATEGORY_NAMES as any)?.[p.partA]}</span>
                <span className="text-warm-400">×</span>
                <span>{(CATEGORY_NAMES as any)?.[p.partB]}</span>
                <span className={`ml-auto text-[10px] font-bold ${
                  p.rating === 'great' ? 'text-green-600 dark:text-green-400' : p.rating === 'bad' ? 'text-red-500 dark:text-red-400' : 'text-warm-500'
                }`}>{ratingLabels[p.rating]}</span>
              </div>
              <div className="text-[10px] text-warm-600 dark:text-warm-400 leading-relaxed mt-0.5">{p.reason}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// Step 6: 결과
// ═══════════════════════════════════════
function StepResult({ build, navigate }: { build: BH, navigate: any }) {
  const toast = useToast()
  const score = build.getScore()
  const evalResult = build.getEvalResult()
  const circumference = 2 * Math.PI * 52
  const offset = circumference * (1 - score / 100)
  const filledParts = Object.entries(build.state.colors).filter(([_, v]) => v)

  // 점수 분해도 항목
  const scoreItems = evalResult ? [
    { label: '컬러 배치', value: evalResult.goldilocks, max: 33, desc: '인접 부위 연결 + 역할 명확성' },
    { label: '비율', value: evalResult.ratio, max: 17, desc: '60-30-10 배분' },
    { label: '조화도', value: evalResult.harmony, max: 17, desc: 'HCL 색상 조화' },
    { label: '색온도', value: evalResult.season, max: 17, desc: '웜/쿨 일관성' },
    { label: '밸런스', value: evalResult.balance, max: 8, desc: '명도 분포' },
    ...(evalResult.hasPersonalColor ? [{ label: '퍼스널컬러', value: evalResult.personal, max: 17, desc: '얼굴 근처 컬러' }] : []),
    ...(evalResult.hasBodyFit ? [{ label: '체형 맞춤', value: evalResult.bodyFit, max: 8, desc: '체형별 컬러 배치' }] : []),
  ].filter(item => item.value > 0) : []

  // 저장 핸들러
  const handleSave = () => {
    const name = build.state.style || '코디'
    const outfit = {}; Object.entries(build.state.colors).forEach(([k,v]) => { if(v) outfit[k]=v })
    const saved = JSON.parse(localStorage.getItem('cs_saved') || '[]')
    saved.unshift({ id: Date.now().toString(36), outfit, score: build.getScore(), name, createdAt: Date.now() })
    if (saved.length > 100) saved.length = 100
    localStorage.setItem('cs_saved', JSON.stringify(saved))
    toast.success('코디를 저장했어요!')
  }

  // 공유 핸들러
  const handleShare = () => {
    navigator.share?.({ title: "바루픽 코디", text: "코디 점수: " + score + "점", url: "https://barupick-react.vercel.app" }).catch(() => {})
  }

  // 커뮤니티 공유 핸들러
  const handleCommunityShare = () => {
    const outfit = {}; Object.entries(build.state.colors).forEach(([k,v]) => { if(v) outfit[k]=v })
    localStorage.setItem("_pending_post_outfit", JSON.stringify(outfit))
    navigate("/community/post")
  }

  // 점수 등급
  const scoreGrade = score >= 90 ? { label: '완벽한 조합!', emoji: '🏆', color: 'text-amber-600' }
    : score >= 80 ? { label: '훌륭한 코디!', emoji: '✨', color: 'text-terra-600' }
    : score >= 65 ? { label: '좋은 조합이에요', emoji: '👍', color: 'text-sage' }
    : score >= 50 ? { label: '나쁘지 않아요', emoji: '🙂', color: 'text-warm-600' }
    : { label: '개선해볼까요?', emoji: '💪', color: 'text-warm-500' }

  const isHighScore = score >= 80

  return (
    <div className="animate-screen-enter">
      {/* 마네킹 토글 */}
      <button
        onClick={() => build.setVizCollapsed(!build.vizCollapsed)}
        aria-expanded={!build.vizCollapsed}
        aria-label="마네킹 미리보기"
        className="w-full text-center text-xs text-warm-600 py-2 mb-2 active:opacity-70"
      >
        {build.vizCollapsed ? '👤 마네킹 보기 ▼' : '👤 마네킹 접기 ▲'}
      </button>

      {!build.vizCollapsed && (
        <div className="flex justify-center mb-5 py-4 bg-warm-100 rounded-2xl">
          <MannequinSVG
            outfit={build.outfitHex}
            options={{ outerType: build.state.outerType, midType: build.state.midType }}
            size={200}
          />
        </div>
      )}

      {/* 점수 + 축하 */}
      <div className="flex flex-col items-center mb-5 relative">
        {/* 고득점 축하 파티클 */}
        {isHighScore && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {['🎉', '⭐', '✨', '🌟', '💫', '🎊'].map((emoji, i) => (
              <span
                key={i}
                className="absolute text-lg animate-confetti"
                style={{
                  left: `${15 + i * 13}%`,
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: `${1.2 + i * 0.2}s`,
                }}
              >
                {emoji}
              </span>
            ))}
          </div>
        )}

        <div className="relative w-[120px] h-[120px]">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx={60} cy={60} r={52} fill="none" stroke="#E7E5E4" strokeWidth={8} />
            <circle cx={60} cy={60} r={52} fill="none"
              stroke={isHighScore ? '#6B9E76' : '#C2785C'}
              strokeWidth={8}
              strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-bold text-warm-900 animate-score-count">{score}</span>
            <span className="text-[10px] text-warm-600">/ 100</span>
          </div>
        </div>

        {/* 등급 라벨 */}
        <div className={`mt-3 text-sm font-bold ${scoreGrade.color} animate-pop-in flex items-center gap-1.5`}>
          <span>{scoreGrade.emoji}</span>
          <span>{scoreGrade.label}</span>
        </div>
      </div>

      {/* 점수 분해도 */}
      {scoreItems.length > 0 && (
        <div className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 mb-4 shadow-warm-sm">
          <div className="text-xs font-semibold text-warm-500 uppercase tracking-widest mb-3">점수 분석</div>
          <div className="flex flex-col gap-2">
            {scoreItems.map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-[11px] text-warm-600 dark:text-warm-400 w-16 flex-shrink-0">{item.label}</span>
                <div className="flex-1 h-2 bg-warm-200 dark:bg-warm-700 rounded-full overflow-hidden">
                  <div className="h-full bg-terra-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }} />
                </div>
                <span className="text-[11px] font-display font-bold text-warm-700 dark:text-warm-300 w-8 text-right">{Math.round(item.value)}</span>
              </div>
            ))}
          </div>
          {evalResult?.theory && Array.isArray(evalResult.theory) && (
            <div className="mt-3 text-[11px] text-terra-600 dark:text-terra-400 font-medium">
              💡 {evalResult.theory.join(' · ')}
            </div>
          )}
          {evalResult?.feedback && typeof evalResult.feedback === 'string' && evalResult.feedback.length > 0 && (
            <div className="mt-2 text-[11px] text-warm-600 dark:text-warm-400 leading-relaxed">
              {evalResult.feedback.slice(0, 120)}{evalResult.feedback.length > 120 ? '...' : ''}
            </div>
          )}
        </div>
      )}

      {/* 소재 궁합 (fabricMode + 소재 선택됨일 때) */}
      {build.state.fabricMode && Object.keys(build.state.fabrics || {}).length > 0 && (() => {
        const pairs = evaluateFabricCombo(build.state.fabrics)
        const badCount = pairs.filter(p => p.rating === 'bad').length
        const greatCount = pairs.filter(p => p.rating === 'great').length
        return <FabricCompatSection pairs={pairs} badCount={badCount} greatCount={greatCount} />
      })()}

      {/* 색상 칩 */}
      <div className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 mb-5 shadow-warm-sm">
        <div className="flex items-center gap-1.5 text-sm font-bold text-warm-900 dark:text-warm-100 mb-3">
          <Palette size={16} className="text-terra-500" /> 색상 개선하기
        </div>
        <div className="flex gap-2 flex-wrap justify-center py-1">
          {filledParts.map(([cat, colorKey]) => {
            const c = COLORS_60[colorKey!]
            if (!c) return null
            return (
              <div key={cat} className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => build.editPart(cat)}>
                <div
                  className="w-[52px] h-[52px] rounded-xl flex items-center justify-center text-[9px] font-semibold active:scale-90 transition-transform border border-warm-400/30"
                  style={{ background: c.hex, color: c.hcl[2] > 60 ? '#1C1917' : '#fff' }}
                >
                  {c.name}
                </div>
                <div className="text-[10px] text-warm-700">{(CATEGORY_NAMES as any)?.[cat]}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══ 액션 영역 (정리됨) ═══ */}

      {/* Primary CTA: 저장 */}
      <button
        onClick={handleSave}
        className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra mb-3"
      >
        <Bookmark size={18} /> 이 코디 저장하기
      </button>

      {/* Secondary: 아이콘 버튼 3열 */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-1.5 py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl active:scale-[0.97] transition-all shadow-warm-sm"
        >
          <Share size={18} className="text-warm-700 dark:text-warm-300" />
          <span className="text-[11px] text-warm-600 dark:text-warm-400 font-medium">공유</span>
        </button>
        <button
          onClick={handleCommunityShare}
          className="flex flex-col items-center gap-1.5 py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl active:scale-[0.97] transition-all shadow-warm-sm"
        >
          <Users size={18} className="text-warm-700 dark:text-warm-300" />
          <span className="text-[11px] text-warm-600 dark:text-warm-400 font-medium">커뮤니티</span>
        </button>
        <button
          onClick={() => build.pushStep('improve')}
          className="flex flex-col items-center gap-1.5 py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl active:scale-[0.97] transition-all shadow-warm-sm"
        >
          <RefreshCw size={18} className="text-warm-700 dark:text-warm-300" />
          <span className="text-[11px] text-warm-600 dark:text-warm-400 font-medium">비슷한 코디</span>
        </button>
      </div>

      {/* Tertiary: 텍스트 링크 */}
      <button
        onClick={() => navigate('/home')}
        className="w-full py-2 text-sm text-warm-600 text-center active:opacity-70 transition-opacity mb-6"
      >
        처음으로 돌아가기
      </button>
    </div>
  )
}

// ═══════════════════════════════════════
// Step 7: 비슷한 코디
// ═══════════════════════════════════════
function StepImprove({ build }: { build: BH }) {
  const currentColors = build.state.colors
  const filledParts = Object.entries(currentColors).filter(([_, v]) => v)
  const currentScore = build.getScore()

  // 실제 evaluationSystem 기반 개선안 생성: 각 부위의 색상을 하나씩 교체
  const improvements: { part: string; original: string; replacement: string; scoreDiff: number }[] = []

  filledParts.forEach(([part, colorKey]) => {
    if (!colorKey) return
    // 같은 색상 그룹이나 유사 색상에서 대안 후보
    const c = COLORS_60[colorKey]
    if (!c) return
    const [h, ch, l] = c.hcl
    // 유사 색상 (색상환 근처 + 명도 유사) 우선, 나머지는 랜덤
    const candidates = Object.keys(COLORS_60)
      .filter(k => k !== colorKey && COLORS_60[k])
      .map(k => {
        const tc = COLORS_60[k]
        const [th, tch, tl] = tc.hcl
        const hueDist = Math.min(Math.abs(h - th), 360 - Math.abs(h - th))
        const dist = hueDist * 0.5 + Math.abs(l - tl) * 0.3 + Math.abs(ch - tch) * 0.2
        return { key: k, dist }
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 12)

    candidates.forEach(({ key: alt }) => {
      const diff = build.calcScoreDelta(part, alt)
      if (diff > 0) {
        improvements.push({ part, original: colorKey, replacement: alt, scoreDiff: diff })
      }
    })
  })

  improvements.sort((a, b) => b.scoreDiff - a.scoreDiff)
  const topImprovements = improvements.slice(0, 8)

  return (
    <div className="animate-screen-enter">
      <button onClick={build.goBack} className="flex items-center gap-1 text-sm text-warm-600 mb-4 active:opacity-70">
        <ArrowLeft size={16} /> 결과로
      </button>

      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-2">비슷한 코디</h2>
      <p className="text-sm text-warm-600 mb-5">현재 코디에서 색상을 하나씩 바꿔봤어요</p>

      {topImprovements.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {topImprovements.map((imp, idx) => {
            const origC = COLORS_60[imp.original]
            const newC = COLORS_60[imp.replacement]
            if (!origC || !newC) return null

            // 변경된 outfit으로 마네킹
            const newOutfitHex = { ...build.outfitHex, [imp.part]: newC.hex }

            return (
              <button
                key={idx}
                onClick={() => {
                  build.selectColor(imp.replacement)
                  build.update({ currentItem: imp.part, colors: { ...currentColors, [imp.part]: imp.replacement } })
                  build.goBack() // 결과로 돌아가기
                }}
                className="flex items-center gap-3 bg-white border border-warm-400 rounded-2xl p-3 shadow-warm-sm active:scale-[0.98] transition-all text-left"
              >
                <MannequinSVG outfit={newOutfitHex} options={{ outerType: build.state.outerType, midType: build.state.midType }} size={60} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] text-warm-600">{(CATEGORY_NAMES as any)?.[imp.part]}</span>
                    <div className="flex items-center gap-1">
                      <span className="w-4 h-4 rounded border border-warm-400" style={{ background: origC.hex }} />
                      <span className="text-warm-400">→</span>
                      <span className="w-4 h-4 rounded border border-warm-400" style={{ background: newC.hex }} />
                    </div>
                  </div>
                  <div className="text-xs text-warm-800">{origC.name} → <span className="font-semibold text-terra-600">{newC.name}</span></div>
                </div>
                <span className="text-sm font-bold text-sage">+{imp.scoreDiff}점</span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">✨</div>
          <div className="text-sm text-warm-600">이미 좋은 조합이에요!</div>
        </div>
      )}
    </div>
  )
}
