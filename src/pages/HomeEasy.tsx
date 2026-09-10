import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, RefreshCw, Thermometer, ChevronRight } from 'lucide-react'
import CharacterCanvas from '@/components/mannequin/CharacterCanvas'
import { COLORS_60, getColorName } from '@/lib/colors'
import { charSex, DEFAULT_HAIR, DEFAULT_HAIR_COLOR, type CharScene } from '@/lib/char/map'
import { useWeather, weatherEmoji } from '@/hooks/useWeather'
import { SITU, PARTS, PLATE_TO_ITEM, STYLE_KEY, ranked, alternatives, reasons, plateName, loadPrefs, loadRecent, defaultSitu, type Ctx, type Entry, type Part, type Situ } from '@/lib/outfits'
import { loadTaste } from '@/lib/taste'
import { myVotes } from '@/lib/votes'
import { trackEvent } from '@/lib/analytics'

// ═══════════════════════════════════════════════════════
// 초보 앞문 — 홈이 곧 한 벌 (골라 주는 모드)
// 열면 캐릭터가 이미 색까지 입고 있다. 버튼은 둘: "이대로 할게요"(→ 결과) · "다른 거".
// 상황·기온은 앱이 정하고, 바꾸고 싶으면 칩 한 줄. 설명·용어·목록 없음.
// 색을 만지고 싶으면 "색만 바꿀래요"(작은 글자)로 축약된 색 고르기.
// ═══════════════════════════════════════════════════════

const FALLBACK_PAL: Record<Part, string> = { outer: 'camel', layer: 'beige', top: 'white', bottom: 'charcoal', shoes: 'black' }
const TEMP_STEPS = [15, 21, 26]

export default function HomeEasy() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { weather, denied, refresh } = useWeather()
  const sex = charSex()
  const taste = useMemo(loadTaste, [])
  const lastVote = useMemo(() => myVotes()[0] || null, [])
  const [situ, setSitu] = useState<Situ>(defaultSitu)
  const [tempOverride, setTempOverride] = useState<number | null>(null)
  const [idx, setIdx] = useState(0)

  useEffect(() => { if (!localStorage.getItem('sp_onboarded')) navigate('/onboarding', { replace: true }) }, [])

  const evening = new Date().getHours() >= 17 && !!weather?.tomorrow
  const temp = tempOverride ?? (evening ? weather!.tomorrow!.feels : (weather?.feels ?? 21))
  const ctx: Ctx = useMemo(() => ({ sex, situ, temp, prefs: loadPrefs(), recent: loadRecent() }), [sex, situ, temp])
  // 후보: 1위 → 다른 방향 3 → 나머지 순위. "다른 거"를 누를 때마다 다음
  const cands: Entry[] = useMemo(() => {
    const list = ranked(ctx); if (!list.length) return []
    const out: Entry[] = [list[0]]; const seen = new Set([list[0].c.id])
    for (const e of [...alternatives(list[0], ctx), ...list.slice(1)]) { if (seen.has(e.c.id)) continue; seen.add(e.c.id); out.push(e); if (out.length >= 8) break }
    return out
  }, [ctx])
  useEffect(() => { setIdx(0) }, [situ, temp, sex])
  const hero = cands[idx % Math.max(1, cands.length)] || null
  useEffect(() => { if (hero) trackEvent('easy_view', { id: hero.c.id, idx, situ, temp }) }, [hero?.c.id])
  if (!hero) return null

  const pal = hero.c.pal
  const keyOf = (k: Part) => pal[k] || FALLBACK_PAL[k]
  const scene: CharScene = {
    items: PARTS.filter(k => hero.p[k]).map(k => ({ id: hero.p[k]!, color: COLORS_60[keyOf(k)]?.hex || '#ccc' })),
    body: { sex, hair: DEFAULT_HAIR[sex], hairColor: DEFAULT_HAIR_COLOR },
  }
  const garments = PARTS.filter(k => hero.p[k]).map(k => plateName(hero.p[k]!)).join(' · ')
  const colors = PARTS.filter(k => hero.p[k]).map(k => keyOf(k))
  const why = idx === 0 && evening && weather?.tomorrow ? (weather.tomorrow.rain >= 50 ? t('home.pick.rain', { p: weather.tomorrow.rain }) : Math.abs(weather.tomorrow.feels - weather.tomorrow.todayMin) >= 5 ? (weather.tomorrow.feels < weather.tomorrow.todayMin ? t('home.pick.colder', { d: weather.tomorrow.todayMin - weather.tomorrow.feels }) : t('home.pick.warmer', { d: weather.tomorrow.feels - weather.tomorrow.todayMin })) : reasons(hero, ctx)) : reasons(hero, ctx)

  const payload = () => {
    const p = hero.p
    const layers: { itemId: string; plate: string; colorKey: string }[] = []
    const seen = new Set<string>()
    for (const k of ['outer', 'layer', 'top'] as Part[]) {
      const plate = p[k]; if (!plate) continue
      const itemId = PLATE_TO_ITEM[plate]; if (!itemId || seen.has(itemId)) continue
      seen.add(itemId); layers.push({ itemId, plate, colorKey: keyOf(k) })
    }
    return {
      layers,
      bottom: p.bottom ? { plate: p.bottom, colorKey: keyOf('bottom') } : undefined,
      shoes: p.shoes ? { plate: p.shoes, colorKey: keyOf('shoes') } : undefined,
      style: STYLE_KEY[hero.c.st] ?? null, templateId: hero.c.id, situ,
    }
  }
  const go = (goto: 'result' | 'builder') => {
    try { sessionStorage.setItem('sp_rec_pick', JSON.stringify({ ...payload(), goto })) } catch {}
    trackEvent('easy_pick', { id: hero.c.id, idx, goto, situ, temp })
    navigate('/home/build')
  }
  const next = () => { setIdx(i => i + 1); trackEvent('easy_next', { idx: idx + 1 }) }
  const cycleTemp = () => { const i = TEMP_STEPS.indexOf(temp); setTempOverride(i < 0 ? TEMP_STEPS[0] : i === TEMP_STEPS.length - 1 ? (weather ? null : TEMP_STEPS[0]) : TEMP_STEPS[i + 1]) }

  return (
    <div className="animate-screen-fade px-5 pt-3 pb-8">
      {/* 머리: 질문 + 기온 */}
      <div className="flex items-center gap-2 mb-2">
        <h1 className="font-display text-[22px] font-bold tracking-tight text-warm-900 dark:text-warm-100 flex-1">{evening ? t('home.easy.titleTomorrow') : t('home.easy.title')}</h1>
        <button onClick={cycleTemp} className="h-8 px-2.5 rounded-full bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-[12px] font-bold text-warm-800 dark:text-warm-200 flex items-center gap-1 active:scale-95">
          {weather && tempOverride == null ? <span>{weatherEmoji(evening ? weather.tomorrow!.code : weather.code)}</span> : <Thermometer size={13} />}{temp}°
        </button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] -mx-5 px-5 mb-2">
        {SITU.map(s => <button key={s.id} onClick={() => setSitu(s.id)} className={`flex-none h-7 px-3 rounded-full text-[12px] font-semibold border transition-all ${situ === s.id ? 'bg-warm-900 text-white border-warm-900 dark:bg-warm-100 dark:text-warm-900 dark:border-warm-100' : 'bg-white dark:bg-warm-800 border-warm-300 dark:border-warm-600 text-warm-600 dark:text-warm-300'}`}>{t('outfit.situ.' + s.id)}</button>)}
      </div>
      {!weather && denied && <button onClick={() => refresh()} className="text-[11px] text-warm-500 underline mb-1">{t('home.easy.allowLocation')}</button>}

      {/* 무대 */}
      <div className="bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-3xl shadow-warm-sm overflow-hidden">
        <div className="relative flex items-end justify-center" style={{ height: 320 }}>
          <div className="absolute left-1/2 bottom-4 -translate-x-1/2 w-36 h-4 rounded-full" style={{ background: 'radial-gradient(ellipse at center, rgba(28,25,23,.16), rgba(28,25,23,0) 70%)' }} />
          <CharacterCanvas {...scene} width={224} />
          <button onClick={next} aria-label={t('home.easy.other')} className="absolute right-3 top-3 w-9 h-9 rounded-full bg-white/90 dark:bg-warm-700 border border-warm-300 dark:border-warm-600 flex items-center justify-center active:rotate-180 transition-transform"><RefreshCw size={15} /></button>
          <span className="absolute left-3 top-3 text-[11px] font-bold px-2 py-1 rounded-full bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-300">{idx + 1}/{cands.length}</span>
        </div>
        <div className="px-4 pb-4">
          <div className="text-[16px] font-extrabold text-warm-900 dark:text-warm-100 leading-tight">{garments}</div>
          <div className="flex items-center gap-1.5 mt-1.5">
            {colors.map((k, i) => <span key={i} className="flex items-center gap-1 text-[10.5px] text-warm-600 dark:text-warm-300"><i className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ background: COLORS_60[k]?.hex }} />{getColorName(k)}</span>)}
          </div>
          <div className="text-[12.5px] text-warm-600 dark:text-warm-400 leading-snug mt-2">{why}</div>
        </div>
      </div>

      {/* 버튼 둘 */}
      <button onClick={() => go('result')} className="w-full mt-3 h-12 rounded-2xl bg-terra-500 text-white font-bold text-[15px] flex items-center justify-center gap-1.5 active:scale-[0.98] shadow-terra">{t('home.easy.take')} <ArrowRight size={17} /></button>
      <button onClick={next} className="w-full mt-2 h-11 rounded-2xl bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-warm-800 dark:text-warm-200 font-semibold text-[14px] flex items-center justify-center gap-1.5 active:scale-[0.98]"><RefreshCw size={14} /> {t('home.easy.other')}</button>
      <div className="flex items-center justify-center gap-4 mt-3 text-[12px] text-warm-500">
        <button onClick={() => go('builder')} className="underline underline-offset-2">{t('home.easy.colorsOnly')}</button>
        <button onClick={() => navigate('/home/taste')} className="underline underline-offset-2">{taste ? t('outfit.tasteChip', { name: taste.name }) : t('outfit.tasteCta')}</button>
      </div>

      {lastVote && (
        <button onClick={() => navigate('/v/' + lastVote.code)} className="w-full mt-4 text-left px-4 py-2.5 rounded-2xl bg-[#FEE500]/40 border border-[#E8D34A]/60 text-[12.5px] font-semibold text-warm-800 flex items-center justify-between active:scale-[0.98]">
          <span>🗳 {t('vote.homeLink')}</span><ChevronRight size={14} className="opacity-60" />
        </button>
      )}
    </div>
  )
}
