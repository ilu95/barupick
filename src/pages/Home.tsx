import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, RefreshCw, Thermometer, ChevronRight } from 'lucide-react'
import CharacterCanvas from '@/components/mannequin/CharacterCanvas'
import { COLORS_60, getColorName } from '@/lib/colors'
import { charSex, DEFAULT_HAIR, DEFAULT_HAIR_COLOR, type CharScene } from '@/lib/char/map'
import { useWeather, weatherEmoji, feelsAt, codeAt, dayRange, isGood, permissionState } from '@/hooks/useWeather'
import { tempOf, nextTemp } from '@/hooks/useTemp'
import { SITU, PARTS, ranked, alternatives, reasons, plateName, loadPrefs, loadRecent, defaultSitu, type Ctx, type Entry, type Situ } from '@/lib/outfits'
import { colorKeyOf, colorKeysOf, stashPick } from '@/lib/pickPayload'
import { loadTaste } from '@/lib/taste'
import { myVotes } from '@/lib/votes'
import { loadBasket } from '@/lib/voteBasket'
import { loadWishlist } from '@/lib/closetAuto'
import { isEasy } from '@/lib/mode'
import { trackEvent } from '@/lib/analytics'

// ═══════════════════════════════════════════════════════
// 홈 — 유저의 니즈에서 시작하는 입구
// 위: "오늘 뭐 입을까요?" 한 벌(참고용 방향, 8벌 순환). 아래: 무엇을 도와드릴까요 —
// 하나씩 함께 골라보기 · 레이어드 조합 · 추가하면 좋을 아이템 · 내 옷으로 · 친구에게 물어보기 · 스타일로 30벌.
// 모드(골라 주는/직접 만드는)는 "이대로 할게요"가 결과로 가느냐 색 고르기로 가느냐만 가른다. 기능은 숨기지 않는다.
// ═══════════════════════════════════════════════════════

const TIME_CHIPS: { key: string; hour: number | 'now' }[] = [
  { key: 'now', hour: 'now' },
  { key: 'morning', hour: 8 },
  { key: 'noon', hour: 12 },
  { key: 'evening', hour: 18 },
  { key: 'night', hour: 21 },
]
const readLen = (k: string) => { try { return (JSON.parse(localStorage.getItem(k) || '[]') as unknown[]).length } catch { return 0 } }

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { weather, status, denied, refresh } = useWeather({ auto: false })
  const sex = charSex()
  const easy = isEasy()
  const taste = useMemo(loadTaste, [])
  const lastVote = useMemo(() => myVotes()[0] || null, [])
  const counts = useMemo(() => ({ wardrobe: readLen('sp_wardrobe'), wish: loadWishlist().length, basket: loadBasket().length, saved: readLen('cs_saved') }), [])
  const [situ, setSitu] = useState<Situ>(defaultSitu)
  const [day, setDay] = useState<'today' | 'tomorrow'>(() => (new Date().getHours() >= 17 ? 'tomorrow' : 'today'))
  const [hour, setHour] = useState<number | 'now'>(() => (new Date().getHours() >= 17 ? 8 : 'now'))
  const [tempOverride, setTempOverride] = useState<number | null>(null)
  const [idx, setIdx] = useState(0)

  useEffect(() => { if (!localStorage.getItem('sp_onboarded')) navigate('/onboarding', { replace: true }) }, [])

  // 마운트 시 캐시가 못 쓰는 자료(옛 모양·날짜 지남)면 조용히 갱신 — 단, 위치 권한이 이미 허용된
  // 경우에만. 'prompt' 상태에서 부르면 #95 이전의 "들어오자마자 뜨는 위치 팝업"이 되살아난다.
  const retriedRef = useRef<string | null>(null)
  useEffect(() => {
    if (isGood()) return
    permissionState().then(p => { if (p === 'granted') refresh() })
  }, [])

  const ensureWeather = () => {
    if (!weather || !isGood()) { refresh(); return }
    const key = `${day}|${hour}`
    if (feelsAt(weather, day, hour) == null && retriedRef.current !== key) {
      retriedRef.current = key
      refresh()
    }
  }
  const selectDay = (d: 'today' | 'tomorrow') => { setDay(d); setHour(d === 'tomorrow' ? 8 : 'now'); ensureWeather() }
  const selectHour = (h: number | 'now') => { setHour(h); ensureWeather() }

  const nowHour = new Date().getHours()
  const timeChips = day === 'today' ? TIME_CHIPS.filter(c => c.hour === 'now' || (c.hour as number) >= nowHour) : TIME_CHIPS.filter(c => c.hour !== 'now')

  const realTemp = feelsAt(weather, day, hour)
  const temp = tempOf(realTemp, tempOverride)
  const range = dayRange(weather, day)
  const ctx: Ctx = useMemo(() => ({ sex, situ, temp, prefs: loadPrefs(), recent: loadRecent() }), [sex, situ, temp])
  // 후보 8벌: 1위 → 다른 방향 3 → 나머지 순위. "다른 거"는 1/8 → 8/8 → 1/8 로 돈다
  const cands: Entry[] = useMemo(() => {
    const list = ranked(ctx); if (!list.length) return []
    const out: Entry[] = [list[0]]; const seen = new Set([list[0].c.id])
    for (const e of [...alternatives(list[0], ctx), ...list.slice(1)]) { if (seen.has(e.c.id)) continue; seen.add(e.c.id); out.push(e); if (out.length >= 8) break }
    return out
  }, [ctx])
  useEffect(() => { setIdx(0) }, [situ, temp, sex, day, hour])
  const hero = cands.length ? cands[idx % cands.length] : null
  useEffect(() => { if (hero) trackEvent('home_view', { id: hero.c.id, idx, situ, temp, day, hour }) }, [hero?.c.id])

  const scene: CharScene | null = hero ? {
    items: PARTS.filter(k => hero.p[k]).map(k => ({ id: hero.p[k]!, color: COLORS_60[colorKeyOf(hero, k)]?.hex || '#ccc' })),
    body: { sex, hair: DEFAULT_HAIR[sex], hairColor: DEFAULT_HAIR_COLOR },
  } : null
  const garments = hero ? PARTS.filter(k => hero.p[k]).map(k => plateName(hero.p[k]!)).join(' · ') : ''
  const colors = hero ? colorKeysOf(hero) : []
  const why = !hero ? '' : idx === 0 && day === 'tomorrow' && weather?.tomorrow
    ? (weather.tomorrow.rain >= 50 ? t('home.pick.rain', { p: weather.tomorrow.rain })
      : Math.abs(weather.tomorrow.feels - weather.tomorrow.todayMin) >= 5
        ? (weather.tomorrow.feels < weather.tomorrow.todayMin ? t('home.pick.colder', { d: weather.tomorrow.todayMin - weather.tomorrow.feels }) : t('home.pick.warmer', { d: weather.tomorrow.feels - weather.tomorrow.todayMin }))
        : reasons(hero, ctx))
    : reasons(hero, ctx)

  const go = (goto: 'result' | 'builder') => {
    if (!hero) return
    stashPick(hero, situ, goto)
    trackEvent('home_pick', { id: hero.c.id, idx, goto, situ, temp, day, hour })
    navigate('/home/build')
  }
  const next = () => { if (!cands.length) return; const n = (idx + 1) % cands.length; setIdx(n); trackEvent('home_next', { idx: n }) }
  const cycleTemp = () => setTempOverride(nextTemp(temp))
  const openStep = (key: 'sp_guided' | 'sp_open_step', val: string, need: string) => {
    trackEvent('home_need', { key: need })
    try { sessionStorage.setItem(key, val) } catch {}
    navigate('/home/build')
  }

  // 니즈 카드: 각 기능이 유저에게 주는 것 한 줄씩
  const needs: { key: string; icon: string; badge?: string; go: () => void }[] = [
    { key: 'guided', icon: '🧩', go: () => openStep('sp_guided', '1', 'guided') },
    { key: 'layered', icon: '🧶', go: () => { trackEvent('home_need', { key: 'layered' }); navigate('/home/picks/layered') } },
    { key: 'items', icon: '🛍', badge: counts.wish ? t('home.needs.items.wish', { n: counts.wish }) : undefined, go: () => { trackEvent('home_need', { key: 'items' }); navigate('/closet/simulate') } },
    { key: 'mine', icon: '👕', badge: counts.wardrobe ? t('home.needs.mine.count', { n: counts.wardrobe }) : undefined, go: () => { trackEvent('home_need', { key: 'mine' }); navigate(counts.wardrobe ? '/closet/combos' : '/closet') } },
    { key: 'vote', icon: '🗳', badge: counts.basket ? t('home.needs.vote.basket', { n: counts.basket }) : undefined, go: () => openStep('sp_open_step', 'vote', 'vote') },
    { key: 'styles', icon: '🎨', go: () => { trackEvent('home_need', { key: 'styles' }); navigate('/home/recommend') } },
  ]
  const links: { key: string; label: string; go: () => void }[] = [
    { key: 'taste', label: taste ? t('outfit.tasteChip', { name: taste.name }) : t('outfit.tasteCta'), go: () => navigate('/home/taste') },
    { key: 'record', label: t('home.links.record'), go: () => navigate('/record') },
    { key: 'saved', label: counts.saved ? t('home.links.savedN', { n: counts.saved }) : t('home.links.saved'), go: () => navigate('/home/saved') },
    { key: 'evaluate', label: t('home.links.evaluate'), go: () => navigate('/home/evaluate') },
    { key: 'outer', label: t('home.links.outer'), go: () => navigate('/home/picks/outer') },
  ]

  const chip = (on: boolean) => `flex-none h-7 px-3 rounded-full text-[12px] font-semibold border transition-all ${on ? 'bg-warm-900 text-white border-warm-900 dark:bg-warm-100 dark:text-warm-900 dark:border-warm-100' : 'bg-white dark:bg-warm-800 border-warm-300 dark:border-warm-600 text-warm-600 dark:text-warm-300'}`

  return (
    <div className="animate-screen-fade px-5 pt-3 pb-8">
      {/* 머리: 질문 + 기온 */}
      <div className="flex items-center gap-2 mb-2">
        <h1 className="font-display text-[22px] font-bold tracking-tight text-warm-900 dark:text-warm-100 flex-1">{day === 'tomorrow' ? t('home.easy.titleTomorrow') : t('home.easy.title')}</h1>
        {weather ? (
          <div title={t('outfit.weatherTap')} className="h-8 px-2.5 rounded-full bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-[12px] font-bold text-warm-800 dark:text-warm-200 flex items-center gap-1">
            <span>{weatherEmoji(codeAt(weather, day, hour) ?? weather.code)}</span>{temp}°
          </div>
        ) : status === 'unavailable' || status === 'denied' ? (
          <button onClick={cycleTemp} title={t('outfit.weatherTap')} className="h-8 px-2.5 rounded-full bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-[12px] font-bold text-warm-800 dark:text-warm-200 flex items-center gap-1 active:scale-95">
            <Thermometer size={13} />{temp}°
          </button>
        ) : (
          <button onClick={() => refresh()} className="h-8 px-2.5 rounded-full bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-[12px] font-bold text-warm-800 dark:text-warm-200 flex items-center gap-1 active:scale-95">
            {t('home.when.seeWeather')}
          </button>
        )}
      </div>
      <div className="flex gap-1.5 mb-1.5">
        {(['today', 'tomorrow'] as const).map(d => <button key={d} onClick={() => selectDay(d)} className={chip(day === d)}>{t(`home.when.${d}`)}</button>)}
      </div>
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] -mx-5 px-5 mb-1.5">
        {timeChips.map(c => <button key={c.key} onClick={() => selectHour(c.hour)} className={chip(hour === c.hour)}>{t(`home.when.${c.key}`)}</button>)}
      </div>
      {range && range.hi - range.lo >= 5 && <div className="text-[11px] text-warm-500 mb-1.5">{t('home.when.range', { lo: range.lo, hi: range.hi })}</div>}
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] -mx-5 px-5 mb-2">
        {SITU.map(s => <button key={s.id} onClick={() => setSitu(s.id)} className={chip(situ === s.id)}>{t('outfit.situ.' + s.id)}</button>)}
      </div>
      {!weather && denied && <button onClick={() => refresh()} className="text-[11px] text-warm-500 underline mb-1">{t('home.easy.allowLocation')}</button>}

      {/* 오늘의 한 벌 — 방향을 보여 주는 참고. 옷·색은 다음 화면에서 전부 바꿀 수 있다 */}
      {hero && scene && (
        <div className="bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-3xl shadow-warm-sm overflow-hidden">
          <div className="grid grid-cols-[150px_1fr] gap-2 items-end">
            <div className="relative flex items-end justify-center" style={{ height: 232 }}>
              <div className="absolute left-1/2 bottom-3 -translate-x-1/2 w-24 h-3 rounded-full" style={{ background: 'radial-gradient(ellipse at center, rgba(28,25,23,.16), rgba(28,25,23,0) 70%)' }} />
              <CharacterCanvas {...scene} width={150} />
              <span className="absolute left-2.5 top-2.5 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-300 tabular-nums">{(idx % cands.length) + 1}/{cands.length}</span>
            </div>
            <div className="pr-3.5 pb-3.5 pt-3 min-w-0 self-center">
              <div className="flex items-start gap-1.5">
                <div className="text-[15px] font-extrabold text-warm-900 dark:text-warm-100 leading-tight flex-1">{garments}</div>
                <button onClick={next} aria-label={t('home.easy.other')} className="flex-none w-8 h-8 rounded-full bg-white dark:bg-warm-700 border border-warm-300 dark:border-warm-600 flex items-center justify-center active:rotate-180 transition-transform"><RefreshCw size={14} /></button>
              </div>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-1.5">
                {colors.map((k, i) => <span key={i} className="flex items-center gap-1 text-[10.5px] text-warm-600 dark:text-warm-300"><i className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ background: COLORS_60[k]?.hex }} />{getColorName(k)}</span>)}
              </div>
              <div className="text-[12px] text-warm-600 dark:text-warm-400 leading-snug mt-2">{why}</div>
              <div className="text-[11px] text-warm-500 leading-snug mt-1.5">{t('home.easy.note')}</div>
            </div>
          </div>
          <div className="px-3 pb-3 grid grid-cols-[1fr_auto] gap-2">
            <button onClick={() => go(easy ? 'result' : 'builder')} className="h-11 rounded-2xl bg-terra-500 text-white font-bold text-[14px] flex items-center justify-center gap-1.5 active:scale-[0.98] shadow-terra">{easy ? t('home.easy.take') : t('outfit.pickColors')} <ArrowRight size={16} /></button>
            <button onClick={next} className="h-11 px-3.5 rounded-2xl bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-warm-800 dark:text-warm-200 font-semibold text-[13px] flex items-center justify-center gap-1.5 active:scale-[0.98]"><RefreshCw size={13} /> {t('home.pick.other')}</button>
          </div>
          <div className="px-3 pb-3 -mt-1 flex items-center gap-4 text-[12px] text-warm-500">
            {easy && <button onClick={() => go('builder')} className="underline underline-offset-2">{t('home.easy.colorsOnly')}</button>}
            <button onClick={() => { trackEvent('home_need', { key: 'all30' }); navigate('/home/build') }} className="underline underline-offset-2">{t('home.easy.more30')}</button>
          </div>
        </div>
      )}

      {/* 무엇을 도와드릴까요 */}
      <div className="mt-5 mb-2 text-[13px] font-bold text-warm-900 dark:text-warm-100">{t('home.needs.title')}</div>
      <div className="grid grid-cols-2 gap-2">
        {needs.map(n => (
          <button key={n.key} onClick={n.go} className="relative text-left bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl p-3.5 shadow-warm-sm active:scale-[0.98] transition-all min-h-[104px] flex flex-col">
            <span className="text-[22px] leading-none">{n.icon}</span>
            <span className="mt-2 text-[13.5px] font-extrabold text-warm-900 dark:text-warm-100 leading-tight">{t(`home.needs.${n.key}.title`)}</span>
            <span className="mt-1 text-[11px] text-warm-500 leading-snug">{t(`home.needs.${n.key}.sub`)}</span>
            {n.badge && <span className="mt-auto pt-2 text-[10.5px] font-bold text-terra-600">{n.badge}</span>}
          </button>
        ))}
      </div>

      {/* 나머지 입구 */}
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] -mx-5 px-5 mt-3">
        {links.map(l => <button key={l.key} onClick={l.go} className="flex-none h-8 px-3 rounded-full bg-warm-100 dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-[11.5px] font-semibold text-warm-700 dark:text-warm-300 active:scale-95">{l.label}</button>)}
      </div>

      {lastVote && (
        <button onClick={() => navigate('/v/' + lastVote.code)} className="w-full mt-4 text-left px-4 py-2.5 rounded-2xl bg-[#FEE500]/40 border border-[#E8D34A]/60 text-[12.5px] font-semibold text-warm-800 flex items-center justify-between active:scale-[0.98]">
          <span>🗳 {t('vote.homeLink')}</span><ChevronRight size={14} className="opacity-60" />
        </button>
      )}
    </div>
  )
}
