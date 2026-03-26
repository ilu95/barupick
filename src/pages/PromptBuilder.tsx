// @ts-nocheck
// ================================================================
// PromptBuilder.tsx — 코디 추천 + 이미지 프롬프트 생성기
// 바루픽의 추천 엔진을 그대로 사용하여 코디를 추천받고,
// 해당 코디를 이미지 생성 AI용 프롬프트로 변환하는 페이지
// ================================================================

import { useState, useCallback, useMemo } from 'react'
import { COLORS_60, hex } from '@/lib/colors'
import { STYLE_MOODS } from '@/lib/styleMoods'
import { MOOD_GROUPS, STYLE_GUIDE, LAYER_LEVELS, ITEMS_CATALOG, STYLE_ICONS } from '@/lib/styles'
import { getDynamicCombos, generateOutfitsWithPins } from '@/lib/recommend'
import { itemsToLayerInfo } from '@/hooks/useRecommend'

// ═══════════════════════════════════════════════
// 컬러 탭 (ColorPicker용)
// ═══════════════════════════════════════════════
const COLOR_TABS = [
  { id: 'achromatic', label: '무채색', keys: ['white','off_white','ivory','cream','silver','lightgray','warm_gray','cool_gray','ash_gray','gray','pewter','slate','charcoal','graphite','gunmetal','black'] },
  { id: 'beige_brown', label: '베이지/브라운', keys: ['linen','ecru','champagne','bone','beige','sand','wheat','oatmeal','stone','mushroom','greige','khaki','tan','camel','fawn','honey','caramel','cognac','copper','cinnamon','sienna','brown','walnut','mocha','cocoa','chestnut','taupe','chocolate','espresso'] },
  { id: 'red_pink', label: '레드/핑크', keys: ['shell_pink','pastel_pink','nude_pink','rose_pink','blush','old_rose','dusty_rose','rose_gold','salmon','carnation','flamingo','coral','hot_pink','pink','fuchsia','raspberry','scarlet','red','cherry','crimson','cardinal','ruby','dark_red','burgundy','wine','oxblood','maroon'] },
  { id: 'orange_yellow', label: '오렌지/옐로', keys: ['lemon','pastel_yellow','butter','canary','yellow','saffron','gold','mustard','marigold','amber','peach','apricot','nectarine','orange','tangerine','pumpkin','burnt_orange','terracotta','rust','brick'] },
  { id: 'green', label: '그린', keys: ['pastel_mint','pastel_green','mint','seafoam','pistachio','apple_green','lime','chartreuse','kelly_green','green','sage','pastel_sage','fern','moss','olive','dark_olive','avocado','army_green','jade','emerald','teal','turquoise','peacock','hunter_green','forest','pine','bottle_green','dark_green'] },
  { id: 'blue', label: '블루', keys: ['ice_blue','pastel_sky','pastel_blue','baby_blue','sky_blue','powder_blue','dusty_blue','steel_blue','cornflower','denim','azure','blue','cobalt','royal_blue','sapphire','petrol','prussian_blue','navy','midnight'] },
  { id: 'purple', label: '퍼플', keys: ['pastel_lavender','lavender','pastel_lilac','lilac','periwinkle','wisteria','heather','pastel_purple','orchid','mauve','amethyst','purple','violet','plum','mulberry','grape','eggplant','indigo'] },
]

// ═══════════════════════════════════════════════
// 의류 영문 매핑 (프롬프트용)
// ═══════════════════════════════════════════════
const PART_EN: Record<string, string> = {
  outer: 'outer jacket/coat',
  middleware: 'mid-layer',
  top: 'top',
  bottom: 'bottom',
  shoes: 'shoes',
  scarf: 'scarf',
  hat: 'hat',
}

const PART_KO: Record<string, string> = {
  outer: '아우터',
  middleware: '미들웨어',
  top: '상의',
  bottom: '하의',
  shoes: '신발',
  scarf: '목도리',
  hat: '모자',
}

// ═══════════════════════════════════════════════
// 프롬프트 빌더
// ═══════════════════════════════════════════════
function buildPrompt(
  outfit: Record<string, string>,
  partKeys: string[],
  promptStyle: string,
  gender: string,
): string {
  const modelDesc =
    gender === 'male' ? 'a young Korean man in his 20s'
    : gender === 'female' ? 'a young Korean woman in her 20s'
    : 'a young Korean person with an androgynous look'

  const allParts: string[] = []
  for (const k of partKeys) {
    const colorKey = outfit[k]
    if (!colorKey) continue
    const c = COLORS_60[colorKey]
    if (!c) continue
    const partLabel = PART_EN[k] || k
    allParts.push(`a ${c.nameEn.toLowerCase()} (${c.hex}) ${partLabel}`)
  }
  const outfitDesc = allParts.join(', ')

  if (promptStyle === 'fullbody') {
    return `Fashion outfit coordination photo, full body shot of ${modelDesc} wearing ${outfitDesc}. Natural relaxed standing pose showing the complete outfit. Clean neutral background, soft natural lighting, high-end Korean fashion magazine editorial style. Focus on color harmony between garments, fabric textures visible, 4:5 aspect ratio for Instagram. Photorealistic, no text.`
  } else if (promptStyle === 'street') {
    return `Street style outfit coordination photo, full body shot of ${modelDesc} wearing ${outfitDesc}. Casual walking pose on a clean urban sidewalk with soft blurred city background. Natural daylight, warm tones, Korean street fashion editorial look. Emphasis on how the colors coordinate together as a complete outfit, 4:5 aspect ratio for Instagram. Photorealistic, no text.`
  } else {
    return `Minimal studio outfit coordination photo, full body shot of ${modelDesc} wearing ${outfitDesc}. Relaxed standing pose against a plain white or light cream backdrop. Even studio lighting, zero distractions, sharp focus on garment colors and silhouette. Clean Korean fashion lookbook aesthetic, 4:5 aspect ratio for Instagram. Photorealistic, no text.`
  }
}

// ═══════════════════════════════════════════════
// 밝기 판단
// ═══════════════════════════════════════════════
function isDarkHex(hexStr: string): boolean {
  const r = parseInt(hexStr.slice(1, 3), 16)
  const g = parseInt(hexStr.slice(3, 5), 16)
  const b = parseInt(hexStr.slice(5, 7), 16)
  return (r * 0.299 + g * 0.587 + b * 0.114) < 140
}

const LIGHT_HEX = new Set(['#FFFFFF','#FFFFF0','#FFFDD0','#F5F5F0','#F5F5DC','#FAF0E6','#F5E6CC','#F7E7CE','#FFFACD','#FDFD96','#E0F0FF','#E6E6FA','#E8DFF5','#FFE4E1','#FFD1DC'])

// ═══════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════
export default function PromptBuilder() {
  // Flow step: 'mood' | 'style' | 'pick' | 'results'
  const [step, setStep] = useState<string>('mood')
  const [mood, setMood] = useState<string | null>(null)
  const [style, setStyle] = useState<string | null>(null)
  const [pickedItems, setPickedItems] = useState<string[]>([])
  const [results, setResults] = useState<any[]>([])
  const [layerType, setLayerType] = useState('basic')
  const [partKeys, setPartKeys] = useState<string[]>(['outer', 'top', 'bottom', 'shoes'])

  // Prompt options
  const [promptStyle, setPromptStyle] = useState('fullbody')
  const [gender, setGender] = useState('neutral')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [copied, setCopied] = useState(false)

  // History for back navigation
  const [history, setHistory] = useState<string[]>([])

  const pushStep = useCallback((s: string) => {
    setHistory(prev => [...prev, step])
    setStep(s)
  }, [step])

  const goBack = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev
      const copy = [...prev]
      const last = copy.pop()!
      setStep(last)
      return copy
    })
  }, [])

  // ── 무드 선택 ──
  const handleMood = useCallback((m: string | null) => {
    setMood(m)
    if (m) {
      pushStep('style')
    } else {
      setStyle(null)
      pushStep('pick')
    }
  }, [pushStep])

  // ── 스타일 선택 ──
  const handleStyle = useCallback((s: string | null) => {
    setStyle(s)
    pushStep('pick')
  }, [pushStep])

  // ── 아이템 토글 ──
  const toggleItem = useCallback((itemId: string) => {
    setPickedItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    )
  }, [])

  // ── 추천 생성 ──
  const generate = useCallback(() => {
    const info = itemsToLayerInfo(pickedItems)
    const lt = info.layerType
    setLayerType(lt)
    setPartKeys(info.partKeys)

    // style이 null이면 모든 스타일에서 랜덤 선택
    const allStyles = Object.keys(STYLE_MOODS)
    const finalStyle = style || allStyles[Math.floor(Math.random() * allStyles.length)]

    const combos = getDynamicCombos(finalStyle, lt, 30, {})
    setResults(combos)
    setSelectedIdx(0)
    pushStep('results')
  }, [pickedItems, style, pushStep])

  // ── 셔플 ──
  const regenerate = useCallback(() => {
    const allStyles = Object.keys(STYLE_MOODS)
    const finalStyle = style || allStyles[Math.floor(Math.random() * allStyles.length)]
    const combos = getDynamicCombos(finalStyle, layerType, 30, {})
    setResults(combos)
    setSelectedIdx(0)
  }, [style, layerType])

  // ── 현재 선택 코디 ──
  const currentOutfit = results[selectedIdx]?.outfit || null
  const currentScore = results[selectedIdx]?.score || 0
  const currentName = results[selectedIdx]?.name || ''

  // ── 프롬프트 ──
  const prompt = useMemo(() => {
    if (!currentOutfit) return ''
    return buildPrompt(currentOutfit, partKeys, promptStyle, gender)
  }, [currentOutfit, partKeys, promptStyle, gender])

  // ── 복사 ──
  const handleCopy = useCallback(() => {
    if (!prompt) return
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [prompt])

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════
  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(165deg, #F7F3EE 0%, #EDE7DF 50%, #E8E0D6 100%)' }}>
      <div className="max-w-[520px] mx-auto px-4">
        {/* Header */}
        <div className="pt-6 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#C4622D' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L3 6V14H6V10H10V14H13V6L8 2Z" fill="white"/></svg>
            </div>
            <span className="text-lg font-bold tracking-wider" style={{ color: '#C4622D', fontFamily: "'Playfair Display', serif" }}>BARUPICK</span>
            <span className="text-[10px] tracking-[0.2em] font-medium" style={{ color: '#a8a29e' }}>PROMPT BUILDER</span>
          </div>
          <div className="text-xs ml-9" style={{ color: '#78716c' }}>코디 추천 + 이미지 프롬프트 생성기</div>
        </div>

        {/* Back button */}
        {step !== 'mood' && (
          <button onClick={goBack} className="flex items-center gap-1 mb-3 text-sm font-medium" style={{ color: '#78716c' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            뒤로
          </button>
        )}

        {/* ═══ STEP: MOOD ═══ */}
        {step === 'mood' && (
          <div className="card-wrap">
            <Card title="어떤 분위기를 원하세요?" desc="무드를 선택하면 맞춤 스타일을 추천해드려요">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(MOOD_GROUPS).map(([key, mg]) => (
                  <button key={key} onClick={() => handleMood(key)}
                    className="flex flex-col items-center gap-1 p-4 rounded-2xl border transition-all hover:shadow-md"
                    style={{ background: 'rgba(255,255,255,0.7)', borderColor: 'rgba(231,229,228,0.8)' }}>
                    <span className="text-2xl">{mg.icon}</span>
                    <span className="text-sm font-bold" style={{ color: '#292524' }}>{mg.name}</span>
                    <span className="text-[10px]" style={{ color: '#a8a29e' }}>{mg.description}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => handleMood(null)}
                className="w-full mt-3 p-3 rounded-xl text-sm font-bold transition-all"
                style={{ background: '#292524', color: '#fff' }}>
                전체 스타일에서 추천받기
              </button>
            </Card>
          </div>
        )}

        {/* ═══ STEP: STYLE ═══ */}
        {step === 'style' && mood && (
          <div className="card-wrap">
            <Card title={`${MOOD_GROUPS[mood].icon} ${MOOD_GROUPS[mood].name} 스타일`} desc="원하는 스타일을 선택하세요">
              <div className="space-y-2">
                {MOOD_GROUPS[mood].styles.map(sKey => {
                  const sg = STYLE_GUIDE[sKey]
                  const icon = STYLE_ICONS[sKey] || ''
                  return (
                    <button key={sKey} onClick={() => handleStyle(sKey)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm text-left"
                      style={{ background: 'rgba(255,255,255,0.7)', borderColor: 'rgba(231,229,228,0.8)' }}>
                      <span className="text-xl">{icon}</span>
                      <div>
                        <div className="text-sm font-bold" style={{ color: '#292524' }}>{sg.name}</div>
                        <div className="text-[10px]" style={{ color: '#a8a29e' }}>{sg.subtitle}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
              <button onClick={() => handleStyle(null)}
                className="w-full mt-3 p-3 rounded-xl text-sm font-bold transition-all"
                style={{ background: '#292524', color: '#fff' }}>
                {MOOD_GROUPS[mood].name} 전체에서 추천받기
              </button>
            </Card>
          </div>
        )}

        {/* ═══ STEP: PICK ITEMS ═══ */}
        {step === 'pick' && (
          <div className="card-wrap">
            <Card title="꼭 입고 싶은 옷을 선택하세요" desc="선택한 아이템을 기준으로 코디를 추천합니다">
              {/* 의류 */}
              <div className="mb-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#a8a29e' }}>의류</div>
                <div className="flex flex-wrap gap-2">
                  {ITEMS_CATALOG.filter(i => !i.slot).map(item => {
                    const on = pickedItems.includes(item.id)
                    return (
                      <button key={item.id} onClick={() => toggleItem(item.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={on ? { background: '#C4622D', color: '#fff', boxShadow: '0 1px 4px rgba(196,98,45,0.3)' }
                          : { background: '#f5f5f4', color: '#57534e' }}>
                        {item.emoji} {item.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* 소품 */}
              <div className="mb-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#a8a29e' }}>소품</div>
                <div className="flex flex-wrap gap-2">
                  {ITEMS_CATALOG.filter(i => i.slot).map(item => {
                    const on = pickedItems.includes(item.id)
                    return (
                      <button key={item.id} onClick={() => toggleItem(item.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={on ? { background: '#C4622D', color: '#fff', boxShadow: '0 1px 4px rgba(196,98,45,0.3)' }
                          : { background: '#f5f5f4', color: '#57534e' }}>
                        {item.emoji} {item.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* 선택 요약 */}
              {pickedItems.length > 0 && (
                <div className="text-xs mb-3 p-2 rounded-lg" style={{ background: 'rgba(196,98,45,0.08)', color: '#C4622D' }}>
                  선택: {pickedItems.map(id => ITEMS_CATALOG.find(i => i.id === id)?.label).filter(Boolean).join(', ')}
                  {' + 기본(상의, 하의, 신발)'}
                </div>
              )}
              <button onClick={generate}
                className="w-full p-3 rounded-xl text-sm font-bold transition-all"
                style={{ background: '#C4622D', color: '#fff' }}>
                {pickedItems.length > 0 ? '이 아이템으로 추천받기' : '기본 구성으로 추천받기'}
              </button>
            </Card>
          </div>
        )}

        {/* ═══ STEP: RESULTS ═══ */}
        {step === 'results' && results.length > 0 && (
          <>
            {/* 코디 결과 카드 */}
            <Card title="추천 코디" desc={`${results.length}개의 코디가 생성되었습니다`}>
              {/* 코디 캐러셀 */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold" style={{ color: '#292524' }}>
                    {selectedIdx + 1} / {results.length}
                  </span>
                  <button onClick={regenerate}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all"
                    style={{ background: '#f5f5f4', color: '#57534e' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
                    새로 생성
                  </button>
                </div>

                {/* 코디 이름 & 점수 */}
                <div className="text-center mb-3">
                  <div className="text-sm font-bold" style={{ color: '#292524' }}>{currentName}</div>
                  <div className="text-[11px]" style={{ color: '#a8a29e' }}>조화점수 {currentScore}점</div>
                </div>

                {/* 컬러 블록들 */}
                {currentOutfit && (
                  <div className="flex flex-col gap-1.5 mb-3">
                    {partKeys.map(k => {
                      const colorKey = currentOutfit[k]
                      if (!colorKey) return null
                      const c = COLORS_60[colorKey]
                      if (!c) return null
                      const dark = isDarkHex(c.hex)
                      return (
                        <div key={k} className="flex items-center gap-2 p-2 rounded-xl"
                          style={{ background: c.hex, border: LIGHT_HEX.has(c.hex) ? '1px solid #d1d1d1' : '1px solid transparent' }}>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{ background: 'rgba(0,0,0,0.15)', color: dark ? '#fff' : '#333' }}>
                            {PART_KO[k] || k}
                          </span>
                          <span className="text-xs font-semibold" style={{ color: dark ? '#fff' : '#292524' }}>
                            {c.name}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* 네비게이션 */}
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => setSelectedIdx(Math.max(0, selectedIdx - 1))}
                    disabled={selectedIdx === 0}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                    style={{ background: '#f5f5f4' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                  {/* 도트 인디케이터 (최대 10개) */}
                  <div className="flex gap-1">
                    {results.slice(0, 10).map((_, i) => (
                      <button key={i} onClick={() => setSelectedIdx(i)}
                        className="w-2 h-2 rounded-full transition-all"
                        style={{ background: i === selectedIdx ? '#C4622D' : '#d6d3d1' }} />
                    ))}
                    {results.length > 10 && <span className="text-[10px]" style={{ color: '#a8a29e' }}>+{results.length - 10}</span>}
                  </div>
                  <button onClick={() => setSelectedIdx(Math.min(results.length - 1, selectedIdx + 1))}
                    disabled={selectedIdx === results.length - 1}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                    style={{ background: '#f5f5f4' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                </div>
              </div>
            </Card>

            {/* 코디샷 스타일 */}
            <Card title="코디샷 스타일">
              <div className="flex gap-2">
                {[
                  { key: 'fullbody', label: '전신 코디', desc: '풀바디 스타일링' },
                  { key: 'street', label: '스트릿', desc: '야외 배경 코디' },
                  { key: 'minimal', label: '미니멀', desc: '클린 스튜디오' },
                ].map(s => {
                  const on = promptStyle === s.key
                  return (
                    <button key={s.key} onClick={() => setPromptStyle(s.key)}
                      className="flex-1 p-2.5 rounded-xl text-center border transition-all"
                      style={on
                        ? { background: '#C4622D', color: '#fff', borderColor: '#C4622D', boxShadow: '0 2px 8px rgba(196,98,45,0.25)' }
                        : { background: 'rgba(255,255,255,0.7)', borderColor: 'rgba(231,229,228,0.8)', color: '#57534e' }
                      }>
                      <div className="text-xs font-bold">{s.label}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: on ? 'rgba(255,255,255,0.7)' : '#a8a29e' }}>{s.desc}</div>
                    </button>
                  )
                })}
              </div>
            </Card>

            {/* 모델 */}
            <Card title="모델">
              <div className="flex gap-2">
                {[
                  { key: 'male', label: '남성', desc: '한국인 남성' },
                  { key: 'neutral', label: '젠더리스', desc: '성별 무관' },
                  { key: 'female', label: '여성', desc: '한국인 여성' },
                ].map(g => {
                  const on = gender === g.key
                  return (
                    <button key={g.key} onClick={() => setGender(g.key)}
                      className="flex-1 p-2.5 rounded-xl text-center border transition-all"
                      style={on
                        ? { background: '#C4622D', color: '#fff', borderColor: '#C4622D', boxShadow: '0 2px 8px rgba(196,98,45,0.25)' }
                        : { background: 'rgba(255,255,255,0.7)', borderColor: 'rgba(231,229,228,0.8)', color: '#57534e' }
                      }>
                      <div className="text-xs font-bold">{g.label}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: on ? 'rgba(255,255,255,0.7)' : '#a8a29e' }}>{g.desc}</div>
                    </button>
                  )
                })}
              </div>
            </Card>

            {/* 프롬프트 출력 */}
            {prompt && (
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold" style={{ color: '#44403c' }}>생성된 프롬프트</span>
                  <button onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={copied
                      ? { background: '#22c55e', color: '#fff' }
                      : { background: '#C4622D', color: '#fff' }
                    }>
                    {copied ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5L4.5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        복사됨
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M8 4V2.5C8 1.95 7.55 1.5 7 1.5H2.5C1.95 1.5 1.5 1.95 1.5 2.5V7C1.5 7.55 1.95 8 2.5 8H4" stroke="currentColor" strokeWidth="1.2"/></svg>
                        복사
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3 rounded-xl text-xs leading-7 break-all select-all"
                  style={{ background: '#fafaf9', border: '1px solid rgba(231,229,228,0.8)', color: '#44403c' }}>
                  {prompt}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[10px]" style={{ color: '#a8a29e' }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1"/><path d="M6 3.5V6.5L8 7.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
                  이미지 생성 AI에 붙여넣어서 코디샷을 생성하세요
                </div>
              </Card>
            )}
          </>
        )}

        {/* 결과 없음 */}
        {step === 'results' && results.length === 0 && (
          <Card title="결과 없음">
            <p className="text-sm" style={{ color: '#78716c' }}>
              추천 결과를 생성하지 못했습니다. 다른 스타일이나 아이템 조합을 시도해보세요.
            </p>
            <button onClick={goBack}
              className="w-full mt-3 p-3 rounded-xl text-sm font-bold"
              style={{ background: '#C4622D', color: '#fff' }}>
              다시 선택하기
            </button>
          </Card>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// Card 컴포넌트
// ═══════════════════════════════════════════════
function Card({ title, desc, children }: { title?: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 mb-4" style={{
      background: 'rgba(255,255,255,0.4)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.6)',
    }}>
      {title && <div className="text-sm font-bold mb-1" style={{ color: '#44403c' }}>{title}</div>}
      {desc && <div className="text-[11px] mb-3" style={{ color: '#a8a29e' }}>{desc}</div>}
      {children}
    </div>
  )
}
