// @ts-nocheck
// ================================================================
// RemainingPages.tsx — 나머지 페이지 모음
// ================================================================
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CloudSun, Thermometer, Droplets, Wind, HelpCircle, Scissors, Ruler, ShoppingBag, ExternalLink, Trophy, ChevronRight, Palette, ArrowRight, ArrowLeft, Check, ThumbsUp, ThumbsDown, Minus, CheckCircle, XCircle, Sparkles } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import { COLORS_60 } from '@/lib/colors'
import { STYLE_GUIDE, MOOD_GROUPS, LAYER_LEVELS, STYLE_ICONS } from '@/lib/styles'
import { STYLE_MOODS } from '@/lib/styleMoods'
import { PERSONAL_COLOR_12, PERSONAL_COLOR_DIAGNOSIS } from '@/lib/personalColor'
import { BODY_GUIDE_DATA, BODY_TYPE_DIAGNOSIS, BODY_QUIZ_QUESTIONS } from '@/lib/bodyType'
import { CATEGORY_NAMES, FABRIC_ITEMS, FABRIC_SEASONS, FABRIC_COMPAT_RULES, evaluateFabricCombo, getFabricCompat } from '@/lib/categories'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { profile } from '@/lib/profile'

// ─── 날씨 코디 ───
export function Weather() {
  const navigate = useNavigate()
  const [weather, setWeather] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // sessionStorage 캐시 먼저 확인
    try {
      const cached = JSON.parse(sessionStorage.getItem('_weather') || 'null')
      if (cached) { setWeather(cached); setLoading(false); return }
    } catch {}

    navigator.geolocation?.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`)
        const data = await res.json()
        const c = data.current
        const w = { temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature), humidity: c.relative_humidity_2m, wind: Math.round(c.wind_speed_10m), code: c.weather_code }
        setWeather(w)
        sessionStorage.setItem('_weather', JSON.stringify(w))
      } catch { setWeather(null) } finally { setLoading(false) }
    }, () => { setLoading(false) })
  }, [])

  const getAdvice = (feels: number) => {
    if (feels >= 28) return { layer: 'simple', title: '한여름 코디', desc: '반팔 + 반바지 or 린넨 팬츠', emoji: '☀️', detail: '얇고 통기성 좋은 소재를 선택하세요. 린넨, 코튼 저지, 시어서커가 좋아요.', items: ['반팔 티셔츠', '린넨 셔츠', '숏팬츠', '린넨 팬츠', '샌들/슬리퍼'], colorTip: '화이트, 아이보리, 파스텔 톤으로 시원한 인상을' }
    if (feels >= 23) return { layer: 'simple', title: '초여름 코디', desc: '반팔 + 면바지 · 가벼운 원피스', emoji: '🌤️', detail: '낮에는 반팔, 실내 냉방 대비 얇은 가디건 하나 챙기면 완벽해요.', items: ['반팔 셔츠', '얇은 가디건', '코튼 치노', '면바지', '스니커즈/로퍼'], colorTip: '베이지 + 네이비, 화이트 + 카키 조합 추천' }
    if (feels >= 17) return { layer: 'basic', title: '간절기 코디', desc: '긴팔 + 긴바지 · 가벼운 아우터', emoji: '⛅', detail: '일교차가 큰 시기. 레이어드하기 좋은 셔츠 + 니트 조합이 활용도 높아요.', items: ['옥스포드 셔츠', '얇은 니트', '면바지/데님', '라이트 자켓', '로퍼/더비슈즈'], colorTip: '어스톤 계열 — 베이지, 카키, 올리브가 계절감에 맞아요' }
    if (feels >= 12) return { layer: 'basic', title: '초가을 코디', desc: '자켓 or 가디건 + 긴바지', emoji: '🍂', detail: '바람막이 역할을 하는 아우터가 필요해요. 맨투맨 위에 자켓을 걸치면 깔끔해요.', items: ['블레이저/치노 자켓', '가디건', '맨투맨', '울 팬츠', '첼시 부츠'], colorTip: '브라운, 테라코타, 머스타드로 가을 무드를' }
    if (feels >= 5) return { layer: 'mid_inner', title: '겨울 코디', desc: '코트 + 니트 · 머플러 추천', emoji: '🧥', detail: '보온이 중요해요. 이너는 얇게 여러 겹, 아우터는 방풍 기능 있는 걸로 선택하세요.', items: ['울 코트', '두꺼운 니트', '기모 팬츠', '머플러', '워커/부츠'], colorTip: '차콜, 네이비, 캐멀 — 겨울 클래식 3색' }
    if (feels >= -5) return { layer: 'layered', title: '한겨울 코디', desc: '패딩 + 기모 · 방한 필수', emoji: '❄️', detail: '발열 내의 → 니트/맨투맨 → 패딩의 3단 레이어링이 기본. 목, 손, 발 보온에 신경 쓰세요.', items: ['롱패딩/숏패딩', '기모 맨투맨', '기모 팬츠', '비니/장갑', '방한 부츠'], colorTip: '블랙, 네이비 베이스에 머플러로 포인트' }
    return { layer: 'layered', title: '극한 방한', desc: '완전무장 · 노출 최소화', emoji: '🥶', detail: '야외 활동을 최소화하세요. 방풍 + 방수 소재 필수.', items: ['헤비 패딩', '기모 내의', '방풍 바지', '넥워머', '방한화'], colorTip: '기능성 우선' }
  }

  const weatherEmojiLocal = (code: number) => code === 0 ? '☀️' : code <= 3 ? '⛅' : code <= 48 ? '🌫️' : code <= 67 ? '🌧️' : code <= 77 ? '❄️' : code <= 82 ? '🌧️' : '⛈️'
  const weatherTextLocal = (code: number) => code === 0 ? '맑음' : code <= 3 ? '구름 조금' : code <= 48 ? '안개' : code <= 57 ? '이슬비' : code <= 67 ? '비' : code <= 77 ? '눈' : code <= 82 ? '소나기' : '뇌우'

  if (loading) return <div className="animate-screen-fade px-5 pt-6 text-center py-20 text-sm text-warm-400">날씨를 불러오는 중...</div>

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-5">오늘 뭐 입지?</h2>
      {weather ? (() => {
        const advice = getAdvice(weather.feels)
        return (
          <>
            {/* 날씨 헤더 */}
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/30 dark:to-blue-900/30 border border-sky-200 dark:border-sky-800 rounded-2xl p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{weatherEmojiLocal(weather.code)}</span>
                  <div>
                    <div className="font-display text-3xl font-bold text-warm-900 dark:text-warm-100">{weather.temp}°C</div>
                    <div className="text-sm text-warm-600 dark:text-warm-400">체감 {weather.feels}°C · {weatherTextLocal(weather.code)}</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-warm-600 dark:text-warm-400">
                <span className="flex items-center gap-1"><Droplets size={12} /> 습도 {weather.humidity}%</span>
                <span className="flex items-center gap-1"><Wind size={12} /> 바람 {weather.wind}km/h</span>
              </div>
            </div>

            {/* 추천 레이어 */}
            <div className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-5 shadow-warm-sm mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{advice.emoji}</span>
                <div>
                  <div className="text-base font-bold text-warm-900 dark:text-warm-100">{advice.title}</div>
                  <div className="text-sm text-terra-600 dark:text-terra-400 font-medium">{advice.desc}</div>
                </div>
              </div>
              <p className="text-sm text-warm-600 dark:text-warm-400 leading-relaxed mb-4">{advice.detail}</p>

              {/* 추천 아이템 */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-warm-500 dark:text-warm-400 uppercase tracking-widest mb-2">추천 아이템</div>
                <div className="flex flex-wrap gap-1.5">
                  {advice.items.map((item: string) => (
                    <span key={item} className="px-2.5 py-1.5 bg-warm-100 dark:bg-warm-700 text-warm-700 dark:text-warm-300 rounded-full text-xs font-medium">{item}</span>
                  ))}
                </div>
              </div>

              {/* 컬러 팁 */}
              <div className="bg-terra-50 dark:bg-terra-900/30 border border-terra-200 dark:border-terra-800 rounded-xl px-3.5 py-2.5">
                <div className="text-xs font-semibold text-terra-700 dark:text-terra-400 mb-0.5">컬러 팁</div>
                <div className="text-xs text-terra-600 dark:text-terra-400">{advice.colorTip}</div>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => navigate('/home/recommend')}
              className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra"
            >
              <Palette size={16} /> 이 날씨에 맞는 코디 추천받기
            </button>
          </>
        )
      })() : (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📍</div>
          <div className="text-sm text-warm-600 dark:text-warm-400 mb-1">위치 정보를 허용해주세요</div>
          <div className="text-xs text-warm-500 dark:text-warm-500">날씨 기반으로 오늘의 코디를 추천해 드릴게요</div>
        </div>
      )}
    </div>
  )
}

// ─── 스타일 퀴즈 ───
export function Quiz() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const questions = [
    { q: '주말에 주로 뭘 하시나요?', a: ['카페 탐방 ☕', '운동/하이킹 🏃', '쇼핑/전시 🛍️', '집에서 휴식 🏠'] },
    { q: '선호하는 컬러 톤은?', a: ['뉴트럴/베이지 계열', '네이비/차콜 계열', '파스텔/밝은 톤', '다크/무채색'] },
    { q: '옷 고를 때 가장 중요한 건?', a: ['편안함', '세련됨', '개성', '가성비'] },
    { q: '자주 신는 신발은?', a: ['스니커즈 👟', '로퍼/구두 👞', '부츠 🥾', '슬리퍼/샌들 🩴'] },
  ]
  const done = step >= questions.length

  // 답변 기반 스타일 매핑
  const calcResult = (ans: number[]) => {
    // [활동, 컬러, 가치, 신발] 각 답변 인덱스
    const scoreMap: Record<string, number> = {}
    const add = (s: string, v: number) => { scoreMap[s] = (scoreMap[s] || 0) + v }
    // 활동
    if (ans[0] === 0) { add('casual', 3); add('minimal', 2); add('cityboy', 2) }       // 카페
    if (ans[0] === 1) { add('athleisure', 3); add('gorpcore', 3); add('workwear', 1) }  // 운동
    if (ans[0] === 2) { add('preppy', 2); add('dandy', 2); add('contemporary', 2) }     // 쇼핑/전시
    if (ans[0] === 3) { add('normcore', 3); add('casual', 2); add('minimal', 1) }       // 집
    // 컬러
    if (ans[1] === 0) { add('minimal', 3); add('oldmoney', 2); add('normcore', 1) }     // 뉴트럴
    if (ans[1] === 1) { add('preppy', 2); add('british', 2); add('ivy', 2) }            // 네이비
    if (ans[1] === 2) { add('casual', 2); add('cityboy', 2); add('genderless', 1) }     // 파스텔
    if (ans[1] === 3) { add('street', 2); add('techwear', 3); add('grunge', 2) }        // 다크
    // 가치
    if (ans[2] === 0) { add('normcore', 3); add('casual', 2); add('athleisure', 1) }    // 편안함
    if (ans[2] === 1) { add('dandy', 3); add('oldmoney', 2); add('minimal', 2) }       // 세련됨
    if (ans[2] === 2) { add('street', 3); add('grunge', 2); add('contemporary', 2) }   // 개성
    if (ans[2] === 3) { add('amekaji', 2); add('workwear', 2); add('casual', 2) }      // 가성비
    // 신발
    if (ans[3] === 0) { add('casual', 2); add('street', 2); add('athleisure', 1) }     // 스니커즈
    if (ans[3] === 1) { add('preppy', 3); add('dandy', 2); add('oldmoney', 2) }        // 로퍼
    if (ans[3] === 2) { add('military', 2); add('workwear', 2); add('gorpcore', 2) }   // 부츠
    if (ans[3] === 3) { add('normcore', 2); add('casual', 1); add('minimal', 1) }      // 슬리퍼

    const sorted = Object.entries(scoreMap).sort((a, b) => b[1] - a[1])
    return sorted.slice(0, 3).map(([s]) => s)
  }

  const resultStyles = done ? calcResult(answers) : []
  const topStyle = resultStyles[0] || 'casual'
  const topData = STYLE_GUIDE[topStyle] || null
  const topIcon = (STYLE_ICONS as any)?.[topStyle] || '🎨'

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      {!done ? (
        <>
          <div className="h-1 bg-warm-300 dark:bg-warm-700 rounded-full mb-5"><div className="h-full bg-terra-500 rounded-full transition-all" style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div>
          <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-2">{questions[step].q}</h2>
          <p className="text-sm text-warm-600 dark:text-warm-400 mb-5">{step + 1} / {questions.length}</p>
          <div className="flex flex-col gap-2.5">
            {questions[step].a.map((a, idx) => (
              <button key={a} onClick={() => { setAnswers([...answers, idx]); setStep(step + 1) }}
                className="w-full py-3.5 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl text-sm font-medium text-warm-800 dark:text-warm-200 shadow-warm-sm active:scale-[0.98] transition-all hover:border-terra-300 text-left px-4">{a}</button>
            ))}
          </div>
          {step > 0 && <button onClick={() => { setStep(step - 1); setAnswers(answers.slice(0, -1)) }} className="w-full text-center text-sm text-warm-500 mt-4 active:opacity-70">이전 질문</button>}
        </>
      ) : (
        <div className="py-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 mb-1">분석 완료!</h2>
            <p className="text-sm text-warm-600 dark:text-warm-400">당신에게 어울리는 스타일을 찾았어요</p>
          </div>

          {/* Top 3 스타일 결과 */}
          <div className="flex flex-col gap-3 mb-5">
            {resultStyles.map((styleKey, rank) => {
              const sd = STYLE_GUIDE[styleKey]
              if (!sd) return null
              const icon = (STYLE_ICONS as any)?.[styleKey] || '🎨'
              const isTop = rank === 0
              // 스타일 무드에서 대표 컬러 추출
              const moods = (STYLE_MOODS as any)?.[styleKey]
              const sampleColors = moods ? Object.values(moods).flatMap((m: any) => [...(m.darks || []), ...(m.mids || []), ...(m.lights || [])].slice(0, 3)).filter((v, i, a) => a.indexOf(v) === i).slice(0, 6) : []

              return (
                <button key={styleKey} onClick={() => navigate(`/home/recommend?style=${styleKey}`)}
                  className={`w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98] ${
                    isTop ? 'bg-terra-100 dark:bg-terra-900/30 border-[1.5px] border-terra-300 dark:border-terra-700 shadow-warm' : 'bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 shadow-warm-sm'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[15px] font-bold ${isTop ? 'text-terra-700 dark:text-terra-400' : 'text-warm-900 dark:text-warm-100'}`}>{sd.name}</span>
                        {isTop && <span className="text-[10px] font-bold bg-terra-500 text-white px-2 py-0.5 rounded-full">BEST</span>}
                        {rank === 1 && <span className="text-[10px] font-medium text-warm-500">2nd</span>}
                        {rank === 2 && <span className="text-[10px] font-medium text-warm-500">3rd</span>}
                      </div>
                      <div className="text-xs text-warm-600 dark:text-warm-400 mt-0.5">{sd.subtitle}</div>
                    </div>
                    <ChevronRight size={16} className="text-warm-400 flex-shrink-0" />
                  </div>
                  {/* 대표 컬러 팔레트 */}
                  {sampleColors.length > 0 && (
                    <div className="flex gap-1.5 ml-10">
                      {sampleColors.map((ck: string) => {
                        const c = COLORS_60[ck]
                        return c ? <div key={ck} className="w-5 h-5 rounded-full border border-warm-300/50" style={{ background: c.hex }} /> : null
                      })}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <button onClick={() => { setStep(0); setAnswers([]) }} className="w-full text-center text-sm text-warm-500 dark:text-warm-400 py-2 active:opacity-70">다시 할래요</button>
        </div>
      )}
    </div>
  )
}

// ─── 소재 가이드 — 실전 궁합 체크 ───
export function FabricGuide() {
  const navigate = useNavigate()
  const [slots, setSlots] = useState<(any | null)[]>([null, null])
  const [editingSlot, setEditingSlot] = useState<number | null>(null)
  const [editCat, setEditCat] = useState<string | null>(null)

  const currentSeason = (() => {
    const m = new Date().getMonth()
    if (m >= 2 && m <= 4) return 'spring'
    if (m >= 5 && m <= 7) return 'summer'
    if (m >= 8 && m <= 10) return 'fall'
    return 'winter'
  })()
  const [seasonFilter, setSeasonFilter] = useState<string | null>(currentSeason)

  const filledSlots = slots.filter(Boolean)
  const ratingLabels = { great: '추천', ok: '무난', bad: '비추' }
  const ratingEmojis = { great: '✅', ok: '➖', bad: '⚠️' }
  const ratingStyles = {
    great: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
    ok: 'bg-warm-50 dark:bg-warm-800 border-warm-300 dark:border-warm-600 text-warm-600 dark:text-warm-400',
    bad: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400',
  }

  // 궁합 계산 (선택된 모든 아이템 쌍)
  const allPairs = useMemo(() => {
    const filled = slots.map((s, i) => s ? { idx: i, item: s } : null).filter(Boolean)
    const pairs = []
    for (let i = 0; i < filled.length; i++) {
      for (let j = i + 1; j < filled.length; j++) {
        const compat = getFabricCompat(filled[i].item, filled[j].item)
        pairs.push({
          a: filled[i], b: filled[j],
          rating: compat?.rating || 'ok',
          reason: compat?.reason || '특별한 궁합 규칙 없음 — 무난한 조합',
        })
      }
    }
    return pairs
  }, [slots])

  const selectItem = (item: any) => {
    if (editingSlot === null) return
    setSlots(prev => { const next = [...prev]; next[editingSlot] = { ...item, _part: editCat }; return next })
    setEditingSlot(null)
    setEditCat(null)
  }

  const removeSlot = (idx: number) => {
    setSlots(prev => {
      const next = prev.filter((_, i) => i !== idx)
      if (next.length < 2) next.push(null)
      return next
    })
  }

  const addSlot = () => {
    if (slots.length >= 6) return
    setSlots(prev => [...prev, null])
  }

  const parts = Object.keys(FABRIC_ITEMS).filter(k => FABRIC_ITEMS[k]?.length > 0)

  // ─── 아이템 선택 모드 ───
  if (editingSlot !== null) {
    const items = editCat ? (FABRIC_ITEMS[editCat] || []) : []
    const filtered = editCat && seasonFilter ? items.filter(i => i.seasons.includes(seasonFilter)) : items

    return (
      <div className="animate-screen-enter px-5 pt-2 pb-10">
        <button onClick={() => { setEditingSlot(null); setEditCat(null) }} className="flex items-center gap-1 text-sm text-warm-600 dark:text-warm-400 mb-4 active:opacity-70"><ArrowLeft size={16} /> 돌아가기</button>

        {!editCat ? (
          <>
            <h2 className="font-display text-lg font-bold text-warm-900 dark:text-warm-100 mb-1">어떤 부위인가요?</h2>
            <p className="text-sm text-warm-600 dark:text-warm-400 mb-4">{editingSlot === 0 ? '입고 있는' : '함께 입을'} 아이템의 부위를 선택하세요</p>
            <div className="grid grid-cols-3 gap-2.5">
              {parts.map(part => (
                <button key={part} onClick={() => setEditCat(part)} className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl py-5 px-2 text-center shadow-warm-sm active:scale-[0.97] transition-all">
                  <div className="text-2xl mb-1.5">{FABRIC_ITEMS[part]?.[0]?.icon || '👔'}</div>
                  <div className="text-[13px] font-medium text-warm-800 dark:text-warm-200">{(CATEGORY_NAMES as any)?.[part]}</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="font-display text-lg font-bold text-warm-900 dark:text-warm-100 mb-1">{(CATEGORY_NAMES as any)?.[editCat]} 아이템</h2>
            <p className="text-sm text-warm-600 dark:text-warm-400 mb-3">소재를 선택하세요</p>

            <div className="flex gap-1.5 mb-4 overflow-x-auto hide-scrollbar">
              <button onClick={() => setSeasonFilter(null)} className={`px-3 py-1.5 rounded-full text-[11px] font-semibold flex-shrink-0 transition-all ${!seasonFilter ? 'bg-terra-500 text-white' : 'bg-warm-200 dark:bg-warm-700 text-warm-600 dark:text-warm-400'}`}>전체</button>
              {Object.entries(FABRIC_SEASONS).map(([k, s]) => (
                <button key={k} onClick={() => setSeasonFilter(seasonFilter === k ? null : k)} className={`px-3 py-1.5 rounded-full text-[11px] font-semibold flex-shrink-0 transition-all ${seasonFilter === k ? 'bg-terra-500 text-white' : 'bg-warm-200 dark:bg-warm-700 text-warm-600 dark:text-warm-400'}`}>{s.emoji} {s.name}</button>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              {filtered.map(item => (
                <button key={item.id} onClick={() => selectItem(item)} className="w-full flex items-center gap-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-xl p-3 text-left shadow-warm-sm active:scale-[0.98] transition-all">
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-warm-900 dark:text-warm-100">{item.name}</div>
                    <div className="text-[11px] text-warm-500 dark:text-warm-400">{item.desc}</div>
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0">{item.seasons.map(s => <span key={s} className="text-[9px]">{FABRIC_SEASONS[s]?.emoji}</span>)}</div>
                </button>
              ))}
              {filtered.length === 0 && <div className="text-center py-8 text-sm text-warm-500 dark:text-warm-400">이 계절에 해당하는 아이템이 없어요</div>}
            </div>

            <button onClick={() => setEditCat(null)} className="w-full text-center text-sm text-warm-500 dark:text-warm-400 mt-4 active:opacity-70">← 다른 부위 선택</button>
          </>
        )}
      </div>
    )
  }

  // ─── 메인 화면: 슬롯 + 실시간 궁합 ───
  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-1">소재 궁합 체크</h2>
      <p className="text-sm text-warm-600 dark:text-warm-400 mb-5">입고 싶은 아이템을 선택하면 소재 궁합을 바로 알려드려요</p>

      {/* 아이템 슬롯 */}
      <div className="flex flex-col gap-2.5 mb-5">
        {slots.map((slot, idx) => (
          <div key={idx} className="flex items-center gap-2.5">
            {slot ? (
              <button onClick={() => { setEditingSlot(idx); setEditCat(slot._part || null) }} className="flex-1 flex items-center gap-3 bg-terra-50 dark:bg-terra-900/30 border border-terra-200 dark:border-terra-800 rounded-2xl px-4 py-3 text-left active:scale-[0.98] transition-all">
                <span className="text-xl flex-shrink-0">{slot.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-terra-700 dark:text-terra-400">{slot.name}</div>
                  <div className="text-[11px] text-warm-600 dark:text-warm-400">{(CATEGORY_NAMES as any)?.[slot._part]} · {slot.desc}</div>
                </div>
              </button>
            ) : (
              <button onClick={() => { setEditingSlot(idx); setEditCat(null) }} className="flex-1 flex items-center gap-3 bg-white dark:bg-warm-800 border-2 border-dashed border-warm-400 dark:border-warm-600 rounded-2xl px-4 py-4 text-left active:scale-[0.98] transition-all">
                <span className="text-xl text-warm-400">+</span>
                <span className="text-sm text-warm-500 dark:text-warm-400">{idx === 0 ? '입고 있는 아이템 선택' : '함께 입을 아이템 선택'}</span>
              </button>
            )}
            {slot && slots.length > 2 && (
              <button onClick={() => removeSlot(idx)} className="w-8 h-8 rounded-full bg-warm-200 dark:bg-warm-700 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform text-warm-500 text-xs">✕</button>
            )}
          </div>
        ))}

        {slots.length < 6 && filledSlots.length >= 2 && (
          <button onClick={addSlot} className="w-full py-2.5 border border-dashed border-warm-400 dark:border-warm-600 rounded-xl text-xs text-warm-500 dark:text-warm-400 font-medium active:scale-[0.98] transition-all">
            + 아이템 추가 (최대 6개)
          </button>
        )}
      </div>

      {/* 실시간 궁합 결과 */}
      {allPairs.length > 0 && (
        <div className="mb-5">
          <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-widest uppercase mb-3">궁합 결과</div>
          <div className="flex flex-col gap-2">
            {allPairs.map((pair, idx) => (
              <div key={idx} className={`flex items-start gap-2.5 border rounded-xl px-3.5 py-3 ${ratingStyles[pair.rating]}`}>
                <span className="text-lg flex-shrink-0 mt-0.5">{ratingEmojis[pair.rating]}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                    {pair.a.item.name}
                    <span className="text-warm-400 font-normal">×</span>
                    {pair.b.item.name}
                    <span className={`ml-auto text-[11px] font-bold`}>{ratingLabels[pair.rating]}</span>
                  </div>
                  <div className="text-[11px] opacity-80 leading-relaxed mt-0.5">{pair.reason}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 안내 */}
      {filledSlots.length < 2 && (
        <div className="text-center py-6">
          <div className="text-3xl mb-3">👆</div>
          <div className="text-sm text-warm-600 dark:text-warm-400 leading-relaxed">
            2개 이상 아이템을 선택하면<br />소재 궁합을 바로 확인할 수 있어요
          </div>
          <div className="text-xs text-warm-500 dark:text-warm-400 mt-3 leading-relaxed">
            예) 데님 자켓 + 울 니트 → 추천 조합!<br />
            실크 블라우스 + 플리스 → 격식 차이 충돌
          </div>
        </div>
      )}

      {/* 전체 초기화 */}
      {filledSlots.length > 0 && (
        <button onClick={() => setSlots([null, null])} className="w-full py-2.5 text-sm text-warm-500 dark:text-warm-400 text-center active:opacity-70">초기화</button>
      )}
    </div>
  )
}

// ─── 체형별 코디 4단계 ───
export function BodyGuide() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'list' | 'quiz' | 'select' | 'result'>('list')
  const [quizStep, setQuizStep] = useState(0)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [resultType, setResultType] = useState<string | null>(null)
  const [gender, setGender] = useState<'male' | 'female'>(profile.getGender() === 'female' ? 'female' : 'male')

  const bodyTypes = Object.entries(BODY_GUIDE_DATA || {})
  const savedType = profile.getBodyType()

  const handleQuizAnswer = (optScores: Record<string, number>) => {
    const newScores = { ...scores }
    Object.entries(optScores).forEach(([k, v]) => { newScores[k] = (newScores[k] || 0) + v })
    setScores(newScores)

    if (quizStep < BODY_QUIZ_QUESTIONS.length - 1) {
      setQuizStep(quizStep + 1)
    } else {
      // 채점 → 가장 높은 점수의 체형
      const sorted = Object.entries(newScores).sort((a, b) => b[1] - a[1])
      const best = sorted[0]?.[0] || 'rectangle'
      setResultType(best)
      setStep('result')
    }
  }

  const handleSave = () => {
    if (!resultType) return
    profile.setBodyType(resultType)
    const effect = BODY_GUIDE_DATA[resultType]?.bodyEffect
    if (effect) profile.setBodyEffect(effect)
  }

  // 1단계: 체형 목록 + 진단 시작
  if (step === 'list') {
    return (
      <div className="animate-screen-fade px-5 pt-2 pb-10">
        <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-1">체형별 코디 가이드</h2>
        <p className="text-sm text-warm-600 dark:text-warm-400 mb-5">내 체형에 맞는 컬러 배치와 스타일링 팁을 확인하세요</p>

        {savedType && BODY_GUIDE_DATA[savedType] && (
          <button onClick={() => { setResultType(savedType); setStep('result') }} className="w-full flex items-center gap-3 bg-terra-50 dark:bg-terra-900/30 border border-terra-200 dark:border-terra-800 rounded-2xl px-4 py-3.5 mb-4 text-left active:scale-[0.98] transition-all">
            <span className="text-2xl">{BODY_GUIDE_DATA[savedType].emoji}</span>
            <div className="flex-1">
              <div className="text-sm font-semibold text-terra-700 dark:text-terra-400">내 체형: {BODY_GUIDE_DATA[savedType].name}</div>
              <div className="text-[11px] text-warm-600 dark:text-warm-400">탭하여 가이드 보기</div>
            </div>
            <ChevronRight size={16} className="text-terra-500" />
          </button>
        )}

        <div className="flex gap-2.5 mb-5">
          <button onClick={() => { setQuizStep(0); setScores({}); setStep('quiz') }} className="flex-1 py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all shadow-terra">
            체형 진단하기
          </button>
          <button onClick={() => setStep('select')} className="flex-1 py-3.5 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 text-warm-800 dark:text-warm-200 rounded-2xl font-medium text-sm active:scale-[0.98] transition-all">
            직접 선택
          </button>
        </div>

        <div className="text-xs font-semibold text-warm-500 dark:text-warm-400 uppercase tracking-widest mb-3">체형 유형</div>
        <div className="flex flex-col gap-2.5">
          {bodyTypes.map(([key, data]: [string, any]) => (
            <button key={key} onClick={() => { setResultType(key); setStep('result') }} className="flex items-center gap-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 shadow-warm-sm text-left active:scale-[0.98] transition-all">
              <span className="text-2xl flex-shrink-0">{data.emoji}</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-warm-900 dark:text-warm-100">{data.name}</div>
                <div className="text-[11px] text-warm-500 dark:text-warm-400 mt-0.5">{data.subtitle}</div>
              </div>
              <ChevronRight size={16} className="text-warm-400" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  // 2단계: 체형 진단 퀴즈
  if (step === 'quiz') {
    const q = BODY_QUIZ_QUESTIONS[quizStep]
    const progress = ((quizStep + 1) / BODY_QUIZ_QUESTIONS.length) * 100

    return (
      <div className="animate-screen-enter px-5 pt-2 pb-10">
        <button onClick={() => { if (quizStep > 0) { setQuizStep(quizStep - 1) } else setStep('list') }} className="flex items-center gap-1 text-sm text-warm-600 dark:text-warm-400 mb-4 active:opacity-70"><ArrowLeft size={16} /> {quizStep > 0 ? '이전 질문' : '뒤로'}</button>

        <div className="h-1.5 bg-warm-300 dark:bg-warm-700 rounded-full mb-5">
          <div className="h-full bg-terra-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="text-xs text-warm-500 dark:text-warm-400 font-display font-semibold mb-3">{quizStep + 1} / {BODY_QUIZ_QUESTIONS.length}</div>
        <h2 className="font-display text-lg font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-5 leading-snug">{q.question}</h2>

        <div className="flex flex-col gap-2.5">
          {q.options.map((opt, idx) => (
            <button key={idx} onClick={() => handleQuizAnswer(opt.scores)} className="w-full bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 text-left text-sm text-warm-800 dark:text-warm-200 font-medium shadow-warm-sm active:scale-[0.98] transition-all hover:border-terra-300">
              {opt.text}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // 3단계: 직접 선택
  if (step === 'select') {
    return (
      <div className="animate-screen-enter px-5 pt-2 pb-10">
        <button onClick={() => setStep('list')} className="flex items-center gap-1 text-sm text-warm-600 dark:text-warm-400 mb-4 active:opacity-70"><ArrowLeft size={16} /> 뒤로</button>
        <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-2">체형 직접 선택</h2>
        <p className="text-sm text-warm-600 dark:text-warm-400 mb-5">가장 비슷한 체형을 선택하세요</p>

        <div className="grid grid-cols-2 gap-2.5">
          {bodyTypes.map(([key, data]: [string, any]) => (
            <button key={key} onClick={() => { setResultType(key); setStep('result') }} className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 text-center shadow-warm-sm active:scale-[0.97] transition-all hover:border-terra-300">
              <div className="text-3xl mb-2">{data.emoji}</div>
              <div className="text-sm font-semibold text-warm-900 dark:text-warm-100">{data.name}</div>
              <div className="text-[11px] text-warm-500 dark:text-warm-400 mt-1 leading-snug">{data.subtitle}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // 4단계: 결과 상세
  const data = resultType ? BODY_GUIDE_DATA[resultType] : null
  if (!data) return null
  const genderData = gender === 'female' ? data.female : data.male

  return (
    <div className="animate-screen-enter px-5 pt-2 pb-10">
      <button onClick={() => setStep('list')} className="flex items-center gap-1 text-sm text-warm-600 dark:text-warm-400 mb-4 active:opacity-70"><ArrowLeft size={16} /> 목록으로</button>

      {/* 헤더 */}
      <div className="text-center mb-5">
        <div className="text-4xl mb-2">{data.emoji}</div>
        <h2 className="font-display text-2xl font-bold text-warm-900 dark:text-warm-100">{data.name}</h2>
        <div className="text-sm text-warm-600 dark:text-warm-400 mt-1">{data.subtitle}</div>
      </div>

      {/* 성별 토글 */}
      <div className="flex gap-2 justify-center mb-5">
        {(['male', 'female'] as const).map(g => (
          <button key={g} onClick={() => setGender(g)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${gender === g ? 'bg-terra-500 text-white shadow-terra' : 'bg-warm-200 dark:bg-warm-700 text-warm-600 dark:text-warm-400'}`}>
            {g === 'male' ? '👔 남성' : '👗 여성'}
          </button>
        ))}
      </div>

      {/* 설명 */}
      <div className="bg-terra-50 dark:bg-terra-900/30 border border-terra-200 dark:border-terra-800 rounded-2xl p-4 mb-4">
        <div className="text-sm text-warm-800 dark:text-warm-200 leading-relaxed">{genderData.desc}</div>
      </div>

      {/* 컬러 배치 규칙 */}
      <div className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 mb-4 shadow-warm-sm">
        <div className="text-xs font-semibold text-warm-500 dark:text-warm-400 uppercase tracking-widest mb-2">컬러 배치</div>
        <div className="text-sm text-warm-800 dark:text-warm-200 font-medium">{data.colorRules?.summary}</div>
        <div className="flex flex-wrap gap-2 mt-2.5">
          {Object.entries(data.colorRules || {}).filter(([k]) => k !== 'summary').map(([part, rule]) => (
            <div key={part} className="flex items-center gap-1.5 bg-warm-100 dark:bg-warm-700 rounded-full px-2.5 py-1 text-[11px]">
              <span className="font-semibold text-warm-700 dark:text-warm-300">{(CATEGORY_NAMES as any)?.[part] || part}</span>
              <span className="text-warm-500 dark:text-warm-400">{rule === 'light' ? '밝게' : rule === 'dark' ? '어둡게' : rule === 'any' ? '자유' : rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 추천 (DO) */}
      <div className="bg-white dark:bg-warm-800 border border-green-200 dark:border-green-800 rounded-2xl p-4 mb-3 shadow-warm-sm">
        <div className="flex items-center gap-1.5 text-sm font-bold text-green-700 dark:text-green-400 mb-3">
          <CheckCircle size={16} /> 이렇게 입으세요
        </div>
        <div className="flex flex-col gap-2">
          {genderData.doList.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 text-[12px] text-warm-700 dark:text-warm-300 leading-relaxed">
              <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 피하세요 (DON'T) */}
      <div className="bg-white dark:bg-warm-800 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-5 shadow-warm-sm">
        <div className="flex items-center gap-1.5 text-sm font-bold text-red-600 dark:text-red-400 mb-3">
          <XCircle size={16} /> 피해주세요
        </div>
        <div className="flex flex-col gap-2">
          {genderData.dontList.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 text-[12px] text-warm-700 dark:text-warm-300 leading-relaxed">
              <span className="text-red-400 mt-0.5 flex-shrink-0">✕</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 저장 + 코디 추천 */}
      <div className="flex flex-col gap-2.5">
        <button onClick={() => { handleSave(); alert('체형이 저장되었어요! 코디 추천에 반영됩니다.') }} className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all shadow-terra">
          내 체형으로 저장하기
        </button>
        <button onClick={() => navigate('/home/recommend')} className="w-full py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 text-warm-800 dark:text-warm-200 rounded-2xl font-medium text-sm active:scale-[0.98] transition-all">
          이 체형으로 코디 추천받기
        </button>
      </div>
    </div>
  )
}

// ─── 샵 ───
export function Shop() {
  const SHOP_INSTA_IMG = 'https://storage.googleapis.com/barupick-stocks/barusa_vintage.jpg'

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">

      {/* 히어로 배너 */}
      <div className="relative overflow-hidden rounded-3xl mb-5 bg-gradient-to-br from-warm-900 via-[#2D2926] to-[#1C1917] text-white p-7 pb-8">
        <div className="absolute top-0 right-0 w-40 h-40 bg-terra-500 opacity-10 rounded-full -translate-y-12 translate-x-12" />
        <div className="relative z-10">
          <div className="font-display text-[10px] font-semibold tracking-[3px] uppercase text-terra-400 mb-3">Vintage Shop</div>
          <div className="font-display text-3xl font-bold tracking-tight mb-1">BARUSA</div>
          <div className="text-warm-500 text-sm">프레피 &amp; 올드머니 빈티지샵</div>
        </div>
      </div>

      {/* 추천 배지 */}
      <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-sm font-medium bg-terra-100 border border-terra-200 text-terra-600">
        <Sparkles size={16} className="flex-shrink-0" />
        <span>바루픽 개발자가 운영중인 빈티지샵</span>
      </div>

      {/* 인스타그램 프로필 이미지 */}
      <div className="mb-5">
        <button
          onClick={() => window.open('https://www.instagram.com/barusa_vintage', '_blank')}
          className="w-full text-left active:scale-[0.99] transition-all"
        >
          <div className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl overflow-hidden shadow-warm-sm">
            {SHOP_INSTA_IMG ? (
              <img
                src={SHOP_INSTA_IMG}
                alt="BARUSA Instagram"
                className="w-full rounded-t-2xl"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-6 bg-gradient-to-b from-warm-200 to-warm-300 dark:from-warm-700 dark:to-warm-800">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-[2.5px] mb-3">
                  <div className="w-full h-full rounded-full bg-warm-900 flex items-center justify-center text-white font-display font-bold text-2xl">B</div>
                </div>
                <div className="font-bold text-warm-900 dark:text-warm-100 mb-0.5">@barusa_vintage</div>
                <div className="text-xs text-warm-600 dark:text-warm-400 mb-3">BARUSA · 프레피 & 올드머니 빈티지</div>
                <div className="flex gap-6 text-center">
                  <div><div className="font-bold text-sm text-warm-900 dark:text-warm-100">3,000+</div><div className="text-[10px] text-warm-500">게시물</div></div>
                  <div><div className="font-bold text-sm text-warm-900 dark:text-warm-100">30K</div><div className="text-[10px] text-warm-500">팔로워</div></div>
                </div>
              </div>
            )}
            <div className="text-center py-2.5 text-xs text-warm-500 border-t border-warm-300 dark:border-warm-600 flex items-center justify-center gap-1">
              📸 인스타그램에서 보기 →
            </div>
          </div>
        </button>
      </div>

      {/* CTA 버튼 */}
      <div className="flex flex-col gap-2.5 mb-6">
        <button
          onClick={() => window.open('https://barusa.co.kr', '_blank')}
          className="w-full py-4 bg-warm-900 dark:bg-warm-100 text-white dark:text-warm-900 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-warm"
        >
          <ExternalLink size={18} /> BARUSA 스토어 방문하기
        </button>
      </div>

      {/* 입점 안내 */}
      <div className="bg-warm-300 dark:bg-warm-700 rounded-2xl p-5 text-center">
        <div className="flex items-center justify-center gap-1.5 font-semibold text-warm-900 dark:text-warm-100 text-sm mb-2">
          <ShoppingBag size={16} /> 빈티지샵 입점 안내
        </div>
        <div className="text-xs text-warm-700 dark:text-warm-300 leading-relaxed mb-3">
          바루픽에 샵을 등록하고 싶으신가요?<br />입점 문의는 아래 버튼으로 연락주세요.
        </div>
        <button
          onClick={() => window.open('https://forms.gle/placeholder', '_blank')}
          className="px-5 py-2.5 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-full text-xs font-semibold text-warm-800 dark:text-warm-200 active:scale-95 transition-all"
        >
          입점 문의하기
        </button>
      </div>
    </div>
  )
}

// ─── 이용약관 ───
export function Terms() {
  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-5">이용약관</h2>
      <div className="bg-white border border-warm-400 rounded-2xl p-5 shadow-warm-sm text-sm text-warm-700 leading-relaxed space-y-3">
        <p><strong>제1조 (목적)</strong> 이 약관은 바루픽(이하 "서비스")의 이용 조건 및 절차를 규정합니다.</p>
        <p><strong>제2조 (서비스 내용)</strong> 서비스는 AI 기반 컬러 코디네이션 추천, OOTD 기록, 커뮤니티 기능을 제공합니다.</p>
        <p><strong>제3조 (이용자 의무)</strong> 이용자는 타인의 권리를 침해하거나 부적절한 콘텐츠를 게시해서는 안 됩니다.</p>
        <p><strong>제4조 (면책조항)</strong> 서비스에서 제공하는 코디 추천은 참고용이며, 서비스는 추천 결과에 대한 책임을 지지 않습니다.</p>
      </div>
    </div>
  )
}

// ─── 개인정보처리방침 ───
export function Privacy() {
  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-5">개인정보처리방침</h2>
      <div className="bg-white border border-warm-400 rounded-2xl p-5 shadow-warm-sm text-sm text-warm-700 leading-relaxed space-y-3">
        <p><strong>1. 수집하는 개인정보</strong> 이메일, 닉네임, 프로필 사진(선택), 코디 기록</p>
        <p><strong>2. 수집 목적</strong> 서비스 제공, 커뮤니티 기능, 맞춤 추천</p>
        <p><strong>3. 보유 기간</strong> 회원 탈퇴 시 즉시 삭제</p>
        <p><strong>4. 제3자 제공</strong> 제3자에게 개인정보를 제공하지 않습니다.</p>
        <p><strong>5. 문의</strong> barusa.official@gmail.com</p>
      </div>
    </div>
  )
}

// ─── 이벤트 상세 ───
export function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const [event, setEvent] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId) return
    Promise.all([
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase.from('event_submissions').select('*').eq('event_id', eventId).order('created_at', { ascending: true }),
    ]).then(([evRes, subRes]) => {
      setEvent(evRes.data)
      setSubmissions(subRes.data || [])
      setLoading(false)
    })
  }, [eventId])

  if (loading) return <div className="animate-screen-fade px-5 pt-6 text-center py-20 text-sm text-warm-400">불러오는 중...</div>
  if (!event) return <div className="animate-screen-fade px-5 pt-6 text-center py-20 text-sm text-warm-600">이벤트를 찾을 수 없어요</div>

  const now = new Date(), start = new Date(event.start_date), end = new Date(event.end_date)
  const isActive = now >= start && now <= end

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <div className="bg-gradient-to-br from-terra-500 to-amber-500 rounded-2xl p-5 text-white mb-5">
        <div className="text-[10px] uppercase tracking-wider opacity-80 mb-1">{isActive ? '🔥 진행중' : '⏳ 종료'}</div>
        <h2 className="font-display text-xl font-bold tracking-tight mb-1">{event.title}</h2>
        {event.description && <div className="text-sm opacity-90 mb-2">{event.description}</div>}
        {event.reward && <div className="text-sm font-semibold">🎁 {event.reward}</div>}
      </div>

      <div className="text-xs font-semibold text-warm-600 uppercase tracking-wider mb-3">참가작 ({submissions.length})</div>
      {submissions.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5">
          {submissions.map((sub, idx) => {
            const outfitHex: Record<string, string> = {}
            Object.entries(sub.outfit || {}).forEach(([k, v]) => { if (v) outfitHex[k] = COLORS_60[v as string]?.hex || (v as string) })
            return (
              <div key={sub.id} className="bg-white border border-warm-400 rounded-2xl p-3 shadow-warm-sm text-center">
                {idx < 3 && <div className="text-lg mb-1">{['🥇', '🥈', '🥉'][idx]}</div>}
                {sub.photo_urls?.[0] ? <img src={sub.photo_urls[0]} className="w-full aspect-square rounded-xl object-cover mb-2" alt="" />
                : <div className="flex justify-center mb-2"><MannequinSVG outfit={outfitHex} size={80} /></div>}
                <div className="text-xs font-semibold text-terra-600">{sub.score}점</div>
              </div>
            )
          })}
        </div>
      ) : <div className="text-center py-10 text-warm-400 text-sm">아직 참가작이 없어요</div>}

      {isActive && (
        <button onClick={() => navigate(`/community/event/${eventId}/submit`)}
          className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra mt-5">
          🎨 참여하기
        </button>
      )}
    </div>
  )
}

// ─── 퍼스널컬러 선택 ───
export function PcSelect() {
  const navigate = useNavigate()
  const current = profile.getPersonalColor()
  const currentData = current ? (PERSONAL_COLOR_12 as any)[current] : null
  const [mode, setMode] = useState<'menu' | 'quiz' | 'result' | 'select'>('menu')
  const [quizStep, setQuizStep] = useState(0)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [resultType, setResultType] = useState<string | null>(null)

  const diagnosis = PERSONAL_COLOR_DIAGNOSIS
  const questions = diagnosis?.questions || []

  const handleQuizAnswer = (optScore: Record<string, number>) => {
    const newScores = { ...scores }
    Object.entries(optScore).forEach(([k, v]) => { newScores[k] = (newScores[k] || 0) + v })
    setScores(newScores)

    if (quizStep < questions.length - 1) {
      setQuizStep(quizStep + 1)
    } else {
      // 결과 계산 — 원본 answerPCQuiz 로직 포팅
      const s = newScores
      const isWarm = (s.warm || 0) > (s.cool || 0)
      let season = isWarm
        ? ((s.spring || 0) > (s.autumn || 0) ? 'spring' : 'autumn')
        : ((s.summer || 0) > (s.winter || 0) ? 'summer' : 'winter')

      const lightS = s.light || 0, brightS = s.bright || 0, trueS = s.true || 0, mutedS = s.muted || 0, softS = s.soft || 0, deepS = s.deep || 0
      let subType
      if (season === 'spring') subType = lightS >= brightS && lightS >= trueS ? 'light' : brightS >= trueS ? 'bright' : 'true'
      else if (season === 'summer') subType = lightS >= mutedS && lightS >= trueS ? 'light' : mutedS >= trueS ? 'muted' : 'true'
      else if (season === 'autumn') subType = softS >= deepS && softS >= trueS ? 'soft' : deepS >= trueS ? 'deep' : 'true'
      else subType = brightS >= deepS && brightS >= trueS ? 'bright' : deepS >= trueS ? 'deep' : 'true'

      const result = `${season}_${subType}`
      setResultType(result)
      setMode('result')
    }
  }

  const setPC = (key: string) => {
    profile.setPersonalColor(key)
    navigate('/profile', { replace: true })
  }

  // 메인 메뉴
  if (mode === 'menu') {
    return (
      <div className="animate-screen-fade px-5 pt-2 pb-10">
        <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-2">퍼스널컬러</h2>

        {currentData && (
          <div className="bg-terra-100 dark:bg-terra-900/30 border border-terra-200 dark:border-terra-800 rounded-2xl p-4 mb-5">
            <div className="text-sm font-semibold text-terra-700 dark:text-terra-400 mb-0.5">현재 설정: {currentData.name}</div>
            <div className="text-[11px] text-warm-600 dark:text-warm-400">{currentData.description || ''}</div>
            {currentData.bestColors && (
              <div className="flex gap-1 mt-2">
                {currentData.bestColors.slice(0, 6).map((ck: string) => {
                  const c = COLORS_60[ck]; return c ? <div key={ck} className="w-5 h-5 rounded-full border border-warm-400/50" style={{ background: c.hex }} /> : null
                })}
              </div>
            )}
          </div>
        )}

        {!currentData && <p className="text-sm text-warm-600 dark:text-warm-400 mb-5">퍼스널컬러를 설정하면 맞춤 추천을 받을 수 있어요</p>}

        <div className="flex flex-col gap-3 mb-5">
          <button onClick={() => { setQuizStep(0); setScores({}); setMode('quiz') }} className="w-full flex items-center gap-4 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-5 text-left shadow-warm-sm active:scale-[0.98] transition-all">
            <div className="w-12 h-12 rounded-xl bg-terra-100 dark:bg-terra-900/30 flex items-center justify-center flex-shrink-0">
              <HelpCircle size={24} className="text-terra-600 dark:text-terra-400" />
            </div>
            <div>
              <div className="text-[15px] font-semibold text-warm-900 dark:text-warm-100">셀프 진단</div>
              <div className="text-xs text-warm-600 dark:text-warm-400 mt-0.5">{questions.length}개 질문으로 내 퍼스널컬러 찾기</div>
            </div>
          </button>

          <button onClick={() => navigate('/profile/personal-color/light')} className="w-full flex items-center gap-4 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-5 text-left shadow-warm-sm active:scale-[0.98] transition-all">
            <div className="w-12 h-12 rounded-xl bg-warm-200 dark:bg-warm-700 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">💡</span>
            </div>
            <div>
              <div className="text-[15px] font-semibold text-warm-900 dark:text-warm-100">빛 진단</div>
              <div className="text-xs text-warm-600 dark:text-warm-400 mt-0.5">자연광에서 직접 비교하는 정밀 진단</div>
            </div>
          </button>

          <button onClick={() => setMode('select')} className="w-full flex items-center gap-4 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-5 text-left shadow-warm-sm active:scale-[0.98] transition-all">
            <div className="w-12 h-12 rounded-xl bg-warm-200 dark:bg-warm-700 flex items-center justify-center flex-shrink-0">
              <Palette size={24} className="text-warm-700 dark:text-warm-300" />
            </div>
            <div>
              <div className="text-[15px] font-semibold text-warm-900 dark:text-warm-100">직접 선택</div>
              <div className="text-xs text-warm-600 dark:text-warm-400 mt-0.5">이미 알고 있다면 12계절 중 선택</div>
            </div>
          </button>
        </div>
      </div>
    )
  }

  // 셀프 진단 퀴즈
  if (mode === 'quiz') {
    const q = questions[quizStep]
    if (!q) return null
    const progress = ((quizStep + 1) / questions.length) * 100

    return (
      <div className="animate-screen-enter px-5 pt-2 pb-10">
        <button onClick={() => { if (quizStep > 0) setQuizStep(quizStep - 1); else setMode('menu') }} className="flex items-center gap-1 text-sm text-warm-600 dark:text-warm-400 mb-4 active:opacity-70">
          <ArrowLeft size={16} /> {quizStep > 0 ? '이전 질문' : '뒤로'}
        </button>

        <div className="h-1.5 bg-warm-300 dark:bg-warm-700 rounded-full mb-5">
          <div className="h-full bg-terra-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="text-xs text-warm-500 dark:text-warm-400 font-display font-semibold mb-3">{quizStep + 1} / {questions.length}</div>
        <h2 className="font-display text-lg font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-5 leading-snug">{q.question}</h2>

        <div className="flex flex-col gap-2.5">
          {q.options.map((opt, idx) => (
            <button key={idx} onClick={() => handleQuizAnswer(opt.score)} className="w-full bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 text-left text-sm text-warm-800 dark:text-warm-200 font-medium shadow-warm-sm active:scale-[0.98] transition-all hover:border-terra-300">
              {opt.text}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // 진단 결과
  if (mode === 'result') {
    const pcData = resultType ? (PERSONAL_COLOR_12 as any)[resultType] : null
    // 폴백: 4계절 간략 결과
    const fallbackData = resultType ? diagnosis.results?.[resultType.replace('_light','_warm').replace('_bright','_warm').replace('_true','_warm').replace('_muted','_cool').replace('_soft','_warm').replace('_deep','_cool')] : null
    const displayData = pcData || fallbackData

    return (
      <div className="animate-screen-enter px-5 pt-2 pb-10">
        <div className="text-center py-6">
          <div className="text-5xl mb-3">🎨</div>
          <h2 className="font-display text-2xl font-bold text-warm-900 dark:text-warm-100 mb-1">
            {displayData?.name || resultType}
          </h2>
          <p className="text-sm text-warm-600 dark:text-warm-400 leading-relaxed mt-2 px-4">
            {displayData?.description || ''}
          </p>
        </div>

        {/* 추천 컬러 팔레트 */}
        {(displayData?.bestColors || displayData?.colors) && (
          <div className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 mb-4 shadow-warm-sm">
            <div className="text-xs font-semibold text-warm-500 dark:text-warm-400 uppercase tracking-widest mb-3">추천 컬러</div>
            <div className="flex gap-2 flex-wrap">
              {(displayData.bestColors || displayData.colors || []).slice(0, 10).map((ck: string) => {
                const c = COLORS_60[ck]
                if (!c) return null
                return (
                  <div key={ck} className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-xl border border-warm-400/50" style={{ background: c.hex }} />
                    <span className="text-[9px] text-warm-600 dark:text-warm-400">{c.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 피해야 할 컬러 */}
        {displayData?.worstColors && (
          <div className="bg-white dark:bg-warm-800 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-5 shadow-warm-sm">
            <div className="text-xs font-semibold text-red-500 dark:text-red-400 uppercase tracking-widest mb-3">피해야 할 컬러</div>
            <div className="flex gap-2 flex-wrap">
              {displayData.worstColors.slice(0, 6).map((ck: string) => {
                const c = COLORS_60[ck]
                if (!c) return null
                return (
                  <div key={ck} className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-xl border border-warm-400/50 relative" style={{ background: c.hex }}>
                      <div className="absolute inset-0 flex items-center justify-center"><span className="text-white text-lg font-bold drop-shadow">✕</span></div>
                    </div>
                    <span className="text-[9px] text-warm-600 dark:text-warm-400">{c.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <button onClick={() => { if (resultType) setPC(resultType) }} className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all shadow-terra">
            이 결과로 설정하기
          </button>
          <button onClick={() => { setQuizStep(0); setScores({}); setMode('quiz') }} className="w-full py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 text-warm-800 dark:text-warm-200 rounded-2xl font-medium text-sm active:scale-[0.98] transition-all">
            다시 진단하기
          </button>
          <button onClick={() => setMode('select')} className="text-sm text-terra-600 dark:text-terra-400 text-center py-2 active:opacity-70">
            직접 선택할게요 →
          </button>
        </div>
      </div>
    )
  }

  // 12계절 직접 선택
  return (
    <div className="animate-screen-enter px-5 pt-2 pb-10">
      <button onClick={() => setMode('menu')} className="flex items-center gap-1 text-sm text-warm-600 dark:text-warm-400 mb-4 active:opacity-70">
        <ArrowLeft size={16} /> 뒤로
      </button>

      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-2">12계절 직접 선택</h2>
      <p className="text-sm text-warm-600 dark:text-warm-400 mb-5">이미 퍼스널컬러를 알고 있다면 선택하세요</p>

      <div className="grid grid-cols-2 gap-2.5">
        {Object.entries(PERSONAL_COLOR_12).filter(([k]) => !['spring', 'summer', 'autumn', 'winter'].includes(k)).map(([key, data]: [string, any]) => (
          <button key={key} onClick={() => setPC(key)}
            className={`bg-white dark:bg-warm-800 border rounded-2xl p-4 text-left shadow-warm-sm active:scale-[0.97] transition-all ${current === key ? 'border-terra-400 bg-terra-50 dark:bg-terra-900/30' : 'border-warm-400 dark:border-warm-600'}`}>
            <div className="text-sm font-semibold text-warm-900 dark:text-warm-100">{data.name}</div>
            <div className="text-[10px] text-warm-500 dark:text-warm-400 mt-0.5 line-clamp-2">{data.description || ''}</div>
            {data.bestColors && (
              <div className="flex gap-1 mt-2">
                {data.bestColors.slice(0, 5).map((ck: string) => {
                  const c = COLORS_60[ck]; return c ? <div key={ck} className="w-4 h-4 rounded-full border border-warm-400/50" style={{ background: c.hex }} /> : null
                })}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
