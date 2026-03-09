// @ts-nocheck
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, RefreshCw, Pin, Bookmark, Share, Users, ChevronRight, Palette } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import { COLORS_60 } from '@/lib/colors'
import { MOOD_GROUPS, LAYER_LEVELS, STYLE_GUIDE, STYLE_ICONS } from '@/lib/styles'
import { CATEGORY_NAMES } from '@/lib/categories'
import { evaluationSystem } from '@/lib/evaluation'
import { profile } from '@/lib/profile'
import { useRecommend, type RecStep } from '@/hooks/useRecommend'

export default function RecommendCoord() {
  const navigate = useNavigate()
  const rec = useRecommend()

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      {rec.step === 'mood' && <StepMood rec={rec} />}
      {rec.step === 'style' && <StepStyle rec={rec} />}
      {rec.step === 'layer' && <StepLayer rec={rec} />}
      {rec.step === 'garment' && <StepGarment rec={rec} />}
      {rec.step === 'pin' && <StepPin rec={rec} />}
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
      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-2">어떤 분위기를 원하세요?</h2>
      <p className="text-sm text-warm-600 mb-5">무드를 선택하면 해당 스타일의 코디를 추천해 드려요.</p>

      {/* 날씨 배너 (weatherLayerLocked 시) */}
      {rec.state.weatherLayerLocked && (
        <div className="flex items-center gap-3 bg-terra-100 border border-terra-200 rounded-2xl p-4 mb-5">
          <span className="text-2xl">☀️</span>
          <div>
            <div className="text-sm font-semibold text-warm-900">날씨 코디</div>
            <div className="text-xs text-warm-600 mt-0.5">레이어가 자동 설정되었어요. 스타일만 골라주세요!</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {Object.entries(MOOD_GROUPS).map(([key, group]) => (
          <button
            key={key}
            onClick={() => rec.selectMood(key)}
            className="bg-white border border-warm-400 rounded-2xl p-5 text-center shadow-warm-sm active:scale-[0.97] transition-all hover:shadow-warm hover:border-terra-300"
          >
            <div className="text-2xl mb-2">{group.icon}</div>
            <div className="text-sm font-semibold text-warm-900">{group.name}</div>
            <div className="text-[11px] text-warm-600 mt-1 leading-snug">{group.description}</div>
          </button>
        ))}
      </div>

      <button
        onClick={() => rec.selectMood(null)}
        className="text-sm text-terra-600 font-medium w-full text-center py-2 active:opacity-70 transition-opacity"
      >
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
      <button onClick={rec.goBack} className="flex items-center gap-1 text-sm text-warm-600 mb-4 active:opacity-70">
        <ArrowLeft size={16} /> 뒤로
      </button>

      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-2">
        {group.icon} {group.name}
      </h2>
      <p className="text-sm text-warm-600 mb-5">
        스타일을 선택하세요. 건너뛰면 {group.name} 전체에서 추천합니다.
      </p>

      <div className="flex flex-col gap-2.5 mb-5">
        {group.styles.map((s: string) => {
          const sd = STYLE_GUIDE[s]
          const icon = (STYLE_ICONS as any)?.[s] || '🎨'
          return (
            <button
              key={s}
              onClick={() => rec.selectStyle(s)}
              className="w-full flex items-center gap-3 bg-white border border-warm-400 rounded-2xl p-4 text-left shadow-warm-sm active:scale-[0.98] transition-all hover:border-terra-300"
            >
              <span className="text-xl flex-shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold text-warm-900">{sd?.name || s}</div>
                <div className="text-xs text-warm-600 mt-0.5">{sd?.subtitle || ''}</div>
              </div>
              <ChevronRight size={16} className="text-warm-500 flex-shrink-0" />
            </button>
          )
        })}
      </div>

      <button
        onClick={() => rec.selectStyle(null)}
        className="text-sm text-terra-600 font-medium w-full text-center py-2 active:opacity-70 transition-opacity"
      >
        전체에서 추천 →
      </button>
    </div>
  )
}

// ═══════════════════════════════════════
// Step 3: 레이어 선택
// ═══════════════════════════════════════
function StepLayer({ rec }: { rec: RecHook }) {
  return (
    <div className="animate-screen-enter">
      <button onClick={rec.goBack} className="flex items-center gap-1 text-sm text-warm-600 mb-4 active:opacity-70">
        <ArrowLeft size={16} /> 뒤로
      </button>

      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-2">
        몇 겹으로<br />입을까요?
      </h2>
      <p className="text-sm text-warm-600 mb-5">레이어드 수준을 선택하세요.</p>

      <div className="grid grid-cols-3 gap-2.5">
        {Object.entries(LAYER_LEVELS).map(([key, lvl]) => {
          // 샘플 마네킹용 기본 outfit
          const sampleOutfit: Record<string, string> = { top: '#ffffff', bottom: '#1e293b', shoes: '#8B4513' }
          if (lvl.partKeys.includes('outer')) sampleOutfit.outer = '#36454F'
          if (lvl.partKeys.includes('middleware')) sampleOutfit.middleware = '#C19A6B'

          return (
            <button
              key={key}
              onClick={() => rec.selectLayer(key)}
              className="bg-white border border-warm-400 rounded-2xl p-4 text-center shadow-warm-sm active:scale-[0.97] transition-all hover:shadow-warm hover:border-terra-300"
            >
              <div className="flex justify-center mb-3">
                <MannequinSVG outfit={sampleOutfit} size={80} />
              </div>
              <div className="text-[13px] font-semibold text-warm-900 mb-1">{lvl.name}</div>
              <div className="text-[10px] text-warm-600">{lvl.parts.join(' + ')}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// Step 4: 옷 종류 선택
// ═══════════════════════════════════════
function StepGarment({ rec }: { rec: RecHook }) {
  const pk = LAYER_LEVELS[rec.state.layerType]?.partKeys || []
  const hasOuter = pk.includes('outer')
  const hasMid = pk.includes('middleware')

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

  // 마네킹 미리보기용 샘플
  const sampleOutfit: Record<string, string> = { top: '#ffffff', bottom: '#1e293b', shoes: '#8B4513' }
  if (hasOuter) sampleOutfit.outer = '#36454F'
  if (hasMid) sampleOutfit.middleware = '#C19A6B'

  return (
    <div className="animate-screen-enter">
      <button onClick={rec.goBack} className="flex items-center gap-1 text-sm text-warm-600 mb-4 active:opacity-70">
        <ArrowLeft size={16} /> 뒤로
      </button>

      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-2">어떤 종류의 옷인가요?</h2>
      <p className="text-sm text-warm-600 mb-5">마네킹에 표시될 옷의 형태를 선택해주세요</p>

      {hasOuter && (
        <div className="mb-5">
          <div className="text-xs font-semibold text-warm-600 tracking-widest uppercase mb-3">아우터 종류</div>
          <div className="grid grid-cols-3 gap-2.5">
            {outerTypes.map(t => {
              const sel = rec.state.outerType === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => rec.setGarment('outerType', t.key)}
                  className={`rounded-2xl border-[1.5px] p-3 text-center transition-all active:scale-[0.97] ${
                    sel ? 'bg-terra-50 border-terra-400 shadow-warm' : 'bg-white border-warm-400 shadow-warm-sm hover:border-terra-300'
                  }`}
                >
                  <div className="flex justify-center mb-2">
                    <MannequinSVG
                      outfit={sampleOutfit}
                      options={{ outerType: t.key as any, midType: rec.state.midType }}
                      size={70}
                    />
                  </div>
                  <div className="text-[13px] font-semibold text-warm-900">{t.label}</div>
                  <div className="text-[11px] text-warm-600 mt-0.5">{t.sub}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {hasMid && (
        <div className="mb-5">
          <div className="text-xs font-semibold text-warm-600 tracking-widest uppercase mb-3">이너웨어 종류</div>
          <div className="grid grid-cols-3 gap-2.5">
            {midTypes.map(t => {
              const sel = rec.state.midType === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => rec.setGarment('midType', t.key)}
                  className={`rounded-2xl border-[1.5px] p-3 text-center transition-all active:scale-[0.97] ${
                    sel ? 'bg-terra-50 border-terra-400 shadow-warm' : 'bg-white border-warm-400 shadow-warm-sm hover:border-terra-300'
                  }`}
                >
                  <div className="flex justify-center mb-2">
                    <MannequinSVG
                      outfit={sampleOutfit}
                      options={{ outerType: rec.state.outerType, midType: t.key as any }}
                      size={70}
                    />
                  </div>
                  <div className="text-[13px] font-semibold text-warm-900">{t.label}</div>
                  <div className="text-[11px] text-warm-600 mt-0.5">{t.sub}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <button
        onClick={rec.confirmGarment}
        className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra mt-3"
      >
        이 형태로 보기 <ArrowRight size={18} />
      </button>
    </div>
  )
}

// ═══════════════════════════════════════
// Step 5: 부위별 색상 고정
// ═══════════════════════════════════════
function StepPin({ rec }: { rec: RecHook }) {
  const ld = LAYER_LEVELS[rec.state.layerType]
  const parts = ld?.partKeys || ['top', 'bottom', 'shoes']
  const pinned = rec.state.pinned || {}

  // 색상 그룹
  const colorGroups = [
    { label: '베이직', keys: ['white', 'ivory', 'beige', 'lightgray', 'gray', 'charcoal', 'black', 'brown', 'camel', 'navy', 'burgundy', 'olive', 'khaki', 'cream', 'taupe'] },
    { label: '파스텔', keys: ['pastel_pink', 'pastel_blue', 'pastel_green', 'pastel_yellow', 'pastel_purple', 'pastel_mint', 'pastel_peach', 'pastel_lavender'] },
    { label: '비비드', keys: ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'teal', 'coral', 'turquoise', 'royal_blue', 'emerald'] },
    { label: '다크', keys: ['dark_red', 'dark_blue', 'dark_green', 'dark_purple', 'dark_brown', 'wine', 'forest', 'midnight', 'chocolate', 'slate', 'maroon', 'indigo'] },
  ]

  return (
    <div className="animate-screen-enter">
      <button onClick={rec.goBack} className="flex items-center gap-1 text-sm text-warm-600 mb-4 active:opacity-70">
        <ArrowLeft size={16} /> 뒤로
      </button>

      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-2 flex items-center gap-2">
        <Pin size={20} className="text-terra-500" /> 부위별 색상 고정
      </h2>
      <p className="text-sm text-warm-600 mb-5">고정하고 싶은 부위를 선택하면 색상을 지정할 수 있어요.</p>

      <div className="flex flex-col gap-2.5 mb-5">
        {parts.map((part: string) => {
          const isPinned = pinned[part] != null
          const pinnedColor = isPinned ? COLORS_60[pinned[part]] : null

          return (
            <PinPartCard
              key={part}
              part={part}
              isPinned={isPinned}
              pinnedColor={pinnedColor}
              pinned={pinned}
              colorGroups={colorGroups}
              onPin={(colorKey) => rec.togglePin(part, colorKey)}
              onClear={() => rec.clearPin(part)}
            />
          )
        })}
      </div>

      <button
        onClick={rec.applyPinsAndGenerate}
        className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra"
      >
        이 설정으로 추천받기 <ArrowRight size={18} />
      </button>

      {Object.keys(pinned).length > 0 && (
        <button
          onClick={rec.clearAllPins}
          className="w-full py-3 mt-2.5 bg-white border border-warm-400 text-warm-700 rounded-2xl font-medium text-sm active:scale-[0.98] transition-all"
        >
          전체 해제
        </button>
      )}
    </div>
  )
}

// 핀 파트 카드 (색상 피커 펼치기)
function PinPartCard({ part, isPinned, pinnedColor, pinned, colorGroups, onPin, onClear }: any) {
  const [open, setOpen] = useState(false)
  const partName = (CATEGORY_NAMES as any)?.[part] || part

  return (
    <div className="bg-white border border-warm-400 rounded-2xl p-4 shadow-warm-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[15px] font-semibold text-warm-900">{partName}</span>
          {isPinned && pinnedColor && (
            <>
              <span className="w-5 h-5 rounded border border-warm-400" style={{ background: pinnedColor.hex }} />
              <span className="text-xs text-warm-600">{pinnedColor.name}</span>
            </>
          )}
        </div>
        <div className="flex gap-1.5">
          {isPinned && (
            <button onClick={onClear} className="px-3 py-1.5 rounded-full border border-warm-400 bg-white text-xs font-medium text-warm-600 active:scale-95 transition-all">
              해제
            </button>
          )}
          <button onClick={() => setOpen(!open)} className="px-3 py-1.5 rounded-full border border-terra-300 bg-terra-50 text-xs font-medium text-terra-700 active:scale-95 transition-all">
            {isPinned ? '변경' : '고정'}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          {colorGroups.map((g: any) => (
            <div key={g.label}>
              <div className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1.5">{g.label}</div>
              <div className="flex flex-wrap gap-1.5">
                {g.keys.map((k: string) => {
                  const c = COLORS_60[k]
                  if (!c) return null
                  const isSelected = pinned[part] === k
                  return (
                    <button
                      key={k}
                      onClick={() => { onPin(k); setOpen(false) }}
                      className={`w-8 h-8 rounded-lg border-[1.5px] transition-all active:scale-90 ${
                        isSelected ? 'border-terra-500 ring-2 ring-terra-300 scale-110' : 'border-warm-400'
                      }`}
                      style={{ background: c.hex }}
                      title={c.name}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// (useState imported at top)

// ═══════════════════════════════════════
// Step 6: 추천 결과
// ═══════════════════════════════════════
function StepResults({ rec, navigate }: { rec: RecHook, navigate: any }) {
  const results = rec.state.results
  const ld = LAYER_LEVELS[rec.state.layerType]
  const pinned = rec.state.pinned || {}
  const hasPins = Object.keys(pinned).length > 0

  if (results.length === 0) {
    return (
      <div className="animate-screen-fade text-center py-12">
        <div className="w-16 h-16 rounded-full bg-warm-300 flex items-center justify-center mx-auto mb-3">
          <Palette size={28} className="text-warm-600" />
        </div>
        <h2 className="font-display text-lg font-bold text-warm-900 mb-2">결과를 찾을 수 없어요</h2>
        <p className="text-sm text-warm-600 mb-5">다른 스타일이나 레이어를 선택해 보세요.</p>
        <button onClick={rec.goBack} className="px-6 py-3 bg-terra-500 text-white rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all shadow-terra">
          다시 선택
        </button>
      </div>
    )
  }

  return (
    <div className="animate-screen-enter">
      <button onClick={rec.goBack} className="flex items-center gap-1 text-sm text-warm-600 mb-4 active:opacity-70">
        <ArrowLeft size={16} /> 뒤로
      </button>

      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-1">
        추천 코디 {results.length}개
      </h2>
      <p className="text-sm text-warm-600 mb-3">마네킹을 탭하면 상세를 볼 수 있어요.</p>

      {/* 퍼스널컬러·체형 맞춤 토글 */}
      {profile.hasFitSettings() && (
        <div className="flex items-center justify-between bg-white border border-warm-400 rounded-2xl px-4 py-3 mb-4 shadow-warm-sm">
          <div>
            <div className="text-sm font-semibold text-warm-900">퍼스널컬러·체형 맞춤</div>
            <div className="text-[11px] text-warm-500 mt-0.5">내 퍼스널컬러와 체형에 맞춰 추천</div>
          </div>
          <button onClick={rec.toggleFitMode}
            className={`w-12 h-7 rounded-full p-0.5 transition-colors ${rec.state.fitMode ? 'bg-terra-500' : 'bg-warm-400'}`}>
            <div className={`w-6 h-6 rounded-full bg-white shadow transition-transform ${rec.state.fitMode ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      )}

      {/* 고정 칩 */}
      {hasPins && (
        <div className="flex flex-wrap gap-1.5 items-center mb-3">
          {Object.entries(pinned).map(([part, colorKey]) => {
            const c = COLORS_60[colorKey]
            return (
              <span key={part} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white border border-warm-400 text-xs">
                <span className="w-3.5 h-3.5 rounded-full border border-warm-400" style={{ background: c?.hex || '#ccc' }} />
                {(CATEGORY_NAMES as any)?.[part] || part} 고정
                <span className="cursor-pointer opacity-50 hover:opacity-100" onClick={() => rec.clearPin(part)}>✕</span>
              </span>
            )
          })}
          <button onClick={rec.clearAllPins} className="text-xs text-terra-600 font-medium ml-1 active:opacity-70">전체 해제</button>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-2.5 mb-5">
        <button
          onClick={rec.regenerate}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-white border border-warm-400 rounded-2xl text-sm font-medium text-warm-800 shadow-warm-sm active:scale-[0.98] transition-all"
        >
          <RefreshCw size={16} /> 새로 생성
        </button>
        <button
          onClick={rec.goToPin}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-white border border-warm-400 rounded-2xl text-sm font-medium text-warm-800 shadow-warm-sm active:scale-[0.98] transition-all"
        >
          <Pin size={16} /> 부위 고정
        </button>
      </div>

      {/* 결과 카드 리스트 */}
      <div className="flex flex-col gap-3">
        {results.map((combo, idx) => {
          const parts = ld?.partKeys || ['top', 'bottom', 'shoes']
          return (
            <button
              key={idx}
              onClick={() => rec.openDetail(idx)}
              className="w-full bg-white border border-warm-400 rounded-2xl p-4 text-left shadow-warm-sm active:scale-[0.99] transition-all hover:shadow-warm"
            >
              {/* 태그 + 점수 */}
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-terra-100 text-terra-700">{combo.name}</span>
                {combo.tags?.[0] && (
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-warm-300 text-warm-700">{combo.tags[0]}</span>
                )}
                <span className="font-display text-[11px] font-bold px-2.5 py-1 rounded-full bg-warm-900 text-white ml-auto">{combo.score}점</span>
              </div>

              {/* 마네킹 + 컬러 목록 */}
              <div className="flex items-center gap-3">
                <MannequinSVG
                  outfit={outfitToHex(combo.outfit)}
                  options={{ outerType: rec.state.outerType, midType: rec.state.midType }}
                  size={80}
                />
                <div className="flex-1 flex flex-col gap-1.5">
                  {parts.map((k: string) => {
                    const colorKey = combo.outfit[k]
                    const c = COLORS_60[colorKey]
                    const isPinned = pinned[k] === colorKey
                    return (
                      <div key={k} className="flex items-center gap-2 text-xs">
                        <span className="w-4 h-4 rounded flex-shrink-0 border border-warm-400" style={{ background: c?.hex || '#ccc' }} />
                        <span className="text-warm-500 w-8">{(CATEGORY_NAMES as any)?.[k] || k}</span>
                        <span className="text-warm-800">{c?.name || colorKey || ''}</span>
                        {isPinned && <Pin size={12} className="text-terra-500 flex-shrink-0" />}
                      </div>
                    )
                  })}
                </div>
              </div>

              {combo.tip && (
                <div className="mt-2.5 text-xs text-warm-600 bg-warm-200 rounded-xl px-3 py-2 leading-relaxed">{combo.tip}</div>
              )}
              <div className="mt-2 text-[11px] text-terra-500 text-center font-medium">탭하여 상세보기 · 색상 개선하기</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// Step 7: 상세
// ═══════════════════════════════════════
function StepDetail({ rec, navigate }: { rec: RecHook, navigate: any }) {
  const [vizCollapsed, setVizCollapsed] = useState(false)
  const [saveModal, setSaveModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const combo = rec.state.results[rec.state.detailIdx]
  if (!combo) return null

  const outfitHex = outfitToHex(combo.outfit)
  const parts = LAYER_LEVELS[rec.state.layerType]?.partKeys || ['top', 'bottom', 'shoes']

  // evaluationSystem으로 점수 분해도
  const pc = profile.getPersonalColor()
  const evalResult = combo.evalResult || evaluationSystem.evaluate(combo.outfit, pc)

  const circumference = 2 * Math.PI * 52
  const finalScore = evalResult?.total || combo.score
  const offset = circumference * (1 - finalScore / 100)

  // 점수 분해 항목
  const scoreItems = evalResult ? [
    { label: '컬러 배치', value: evalResult.goldilocks, max: 33, desc: '인접 부위 연결 + 역할 명확성' },
    { label: '비율', value: evalResult.ratio, max: 17, desc: '60-30-10 배분' },
    { label: '조화도', value: evalResult.harmony, max: 17, desc: 'HCL 색상 조화' },
    { label: '색온도', value: evalResult.season, max: 17, desc: '웜/쿨 일관성' },
    { label: '밸런스', value: evalResult.balance, max: 8, desc: '명도 분포' },
    ...(evalResult.hasPersonalColor ? [{ label: '퍼스널컬러', value: evalResult.personal, max: 17, desc: '얼굴 근처 컬러' }] : []),
    ...(evalResult.hasBodyFit ? [{ label: '체형 맞춤', value: evalResult.bodyFit, max: 8, desc: '체형별 컬러 배치' }] : []),
  ] : []

  const handleSave = () => {
    const name = saveName.trim() || combo.name
    const saved = JSON.parse(localStorage.getItem('cs_saved') || '[]')
    saved.unshift({ id: Date.now().toString(36), outfit: combo.outfit, score: finalScore, name, createdAt: Date.now() })
    if (saved.length > 100) saved.length = 100
    localStorage.setItem('cs_saved', JSON.stringify(saved))
    setSaveModal(false)
    setSaveName('')
    alert('저장했어요!')
  }

  return (
    <div className="animate-screen-enter">
      {/* 마네킹 접기/펼치기 */}
      <button onClick={() => setVizCollapsed(!vizCollapsed)} className="w-full text-center text-xs text-warm-600 py-2 mb-2 active:opacity-70">
        {vizCollapsed ? '👤 마네킹 보기 ▼' : '👤 마네킹 접기 ▲'}
      </button>

      {!vizCollapsed && (
        <div className="flex justify-center mb-5 py-4 bg-warm-100 rounded-2xl">
          <MannequinSVG outfit={outfitHex} options={{ outerType: rec.state.outerType, midType: rec.state.midType }} size={200} />
        </div>
      )}

      {/* 태그 */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-terra-100 text-terra-700">{combo.name}</span>
        {combo.tags?.[0] && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-warm-300 text-warm-700">{combo.tags[0]}</span>}
        {evalResult?.hasPersonalColor && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-pink-50 text-pink-700">퍼스널컬러✓</span>}
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
            <span className="font-display text-3xl font-bold text-warm-900">{finalScore}</span>
            <span className="text-[10px] text-warm-600">/ 100</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          {parts.map((k: string) => {
            const colorKey = combo.outfit[k]; const c = COLORS_60[colorKey]
            return (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span className="w-4 h-4 rounded flex-shrink-0 border border-warm-400" style={{ background: c?.hex || '#ccc' }} />
                <span className="text-warm-500 w-10">{(CATEGORY_NAMES as any)?.[k] || k}</span>
                <span className="text-warm-800 font-medium">{c?.name || ''}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 배색 이론 태그 */}
      {evalResult?.theory && evalResult.theory.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 mb-4">
          {evalResult.theory.map((t: string, i: number) => (
            <span key={i} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-warm-300 text-warm-700">{t}</span>
          ))}
        </div>
      )}

      {/* 피드백 */}
      {evalResult?.feedback && (
        <div className="bg-warm-200 rounded-2xl p-4 text-sm text-warm-800 leading-relaxed mb-5">{evalResult.feedback}</div>
      )}

      {/* 점수 분해도 */}
      {scoreItems.length > 0 && (
        <div className="bg-white border border-warm-400 rounded-2xl p-4 mb-5 shadow-warm-sm">
          {scoreItems.map((item, idx) => (
            <div key={idx} className="mb-2.5 last:mb-0">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-warm-700 font-medium">{item.label}</span>
                <span className="text-warm-500">{Math.round(item.value)} / {item.max}</span>
              </div>
              <div className="h-1.5 bg-warm-300 rounded-full overflow-hidden">
                <div className="h-full bg-terra-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex flex-col gap-2.5 mb-5">
        <button onClick={() => { setSaveName(combo.name); setSaveModal(true) }} className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra">
          <Bookmark size={18} /> 이 코디 저장하기
        </button>
        <button onClick={() => { navigator.share?.({ title: '바루픽 코디', text: combo?.name + ' ' + finalScore + '점', url: 'https://barupick-react.vercel.app' }).catch(() => {}) }} className="w-full py-3 bg-white border border-warm-400 text-warm-800 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
          <Share size={16} /> 이 조합 공유하기
        </button>
        <button onClick={() => {
            localStorage.setItem('_pending_post_outfit', JSON.stringify(combo.outfit)); window.location.href = '/community/post'
          }} className="w-full py-3 bg-warm-900 text-white rounded-2xl font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
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

      {/* 색상 개선하기 */}
      <div className="bg-white border border-warm-400 rounded-2xl p-4 mb-5 shadow-warm-sm">
        <div className="flex items-center gap-1.5 text-sm font-bold text-warm-900 mb-1">
          <Palette size={16} className="text-terra-500" /> 색상 개선하기
        </div>
        <div className="text-xs text-warm-600 mb-3">부위를 탭하면 색상을 교체할 수 있어요</div>
        <div className="flex gap-2 flex-wrap justify-center py-1 pb-2">
          {Object.entries(combo.outfit).filter(([_, v]) => v).map(([cat, colorKey]) => {
            const c = COLORS_60[colorKey as string]
            if (!c) return null
            return (
              <div key={cat} className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0">
                <div
                  className="w-[52px] h-[52px] rounded-xl flex items-center justify-center text-[9px] font-semibold active:scale-90 transition-transform border border-warm-400/30"
                  style={{ background: c.hex }}
                >
                  <span style={{ color: c.hcl[2] > 60 ? '#1C1917' : '#ffffff' }}>{c.name}</span>
                </div>
                <div className="text-[10px] text-warm-700 whitespace-nowrap">{(CATEGORY_NAMES as any)?.[cat] || cat}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 뒤로 */}
      <button
        onClick={rec.goBack}
        className="w-full py-3 bg-white border border-warm-400 text-warm-700 rounded-2xl font-medium text-sm flex items-center justify-center gap-1.5 mb-12 active:scale-[0.98] transition-all"
      >
        <ArrowLeft size={16} /> 목록으로
      </button>
    </div>
  )
}

// ─── 헬퍼: outfit colorKey → hex 변환 ───
function outfitToHex(outfit: Record<string, string>): Record<string, string> {
  const hex: Record<string, string> = {}
  Object.entries(outfit).forEach(([k, v]) => {
    if (v) hex[k] = COLORS_60[v]?.hex || v
  })
  return hex
}
