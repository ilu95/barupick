import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import CharacterCanvas from '@/components/mannequin/CharacterCanvas'
import { charSex, DEFAULT_HAIR, DEFAULT_HAIR_COLOR, type CharScene } from '@/lib/char/map'
import { useWeather, weatherEmoji } from '@/hooks/useWeather'
import { PARTS, NEU, PLATE_TO_ITEM, STYLE_KEY, ranked, reasons, nameOf, plateName, loadPrefs, loadRecent, defaultSitu, type Ctx, type Part } from '@/lib/outfits'
import { trackEvent } from '@/lib/analytics'

// ═══════════════════════════════════════════════════════
// 홈 — 오늘의 한 벌 / 내일의 한 벌 (루프 L5, 목업 1′)
// 알림을 열면 이미 한 벌이 놓여 있다: 1단계의 1위 조합을 캐릭터에 입혀 보여 주고,
// "이걸로 색 고르기"면 2단계로 바로 간다(만들기까지 두 번 탭). 아래는 이번 주 기록 스트릭.
// 17시 이후엔 내일 아침 체감으로 고른다.
// ═══════════════════════════════════════════════════════

const FALLBACK_PAL: Record<Part, string> = { outer: 'camel', layer: 'beige', top: 'white', bottom: 'charcoal', shoes: 'black' }

function weekDots(): { on: boolean[]; n: number; last: number } {
  let dates: string[] = []
  try { dates = (JSON.parse(localStorage.getItem('sp_ootd_records') || '[]') as { date?: string }[]).map(r => r.date || '').filter(Boolean) } catch {}
  const set = new Set(dates.map(d => d.slice(0, 10)))
  const now = new Date(); const dow = (now.getDay() + 6) % 7   // 월=0
  const mon = new Date(now); mon.setDate(now.getDate() - dow); mon.setHours(0, 0, 0, 0)
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const on: boolean[] = []; let last = 0
  for (let i = 0; i < 7; i++) { const d = new Date(mon); d.setDate(mon.getDate() + i); on.push(set.has(key(d))) }
  for (let i = 1; i <= 7; i++) { const d = new Date(mon); d.setDate(mon.getDate() - i); if (set.has(key(d))) last++ }
  return { on, n: on.filter(Boolean).length, last }
}

export default function TodayPick() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { weather } = useWeather()
  const sex = charSex()
  const evening = new Date().getHours() >= 17 && !!weather?.tomorrow
  const temp = evening ? weather!.tomorrow!.feels : (weather?.feels ?? 21)
  const situ = defaultSitu()
  const ctx: Ctx = useMemo(() => ({ sex, situ, temp, prefs: loadPrefs(), recent: loadRecent() }), [sex, situ, temp])
  const hero = useMemo(() => ranked(ctx)[0] || null, [ctx])
  const dots = useMemo(weekDots, [])
  if (!hero) return null

  const scene: CharScene = { items: PARTS.filter(k => hero.p[k]).map(k => ({ id: hero.p[k]!, color: NEU[k] })), body: { sex, hair: DEFAULT_HAIR[sex], hairColor: DEFAULT_HAIR_COLOR } }
  const garments = PARTS.filter(k => hero.p[k]).map(k => plateName(hero.p[k]!)).join(' · ')
  const tm = weather?.tomorrow
  const diff = tm ? tm.feels - tm.todayMin : 0
  const why = evening && tm && tm.rain >= 50 ? t('home.pick.rain', { p: tm.rain })
    : evening && diff <= -5 ? t('home.pick.colder', { d: -diff })
    : evening && diff >= 5 ? t('home.pick.warmer', { d: diff })
    : reasons(hero, ctx)
  const days: string[] = t('home.pick.days', { returnObjects: true }) as string[]

  const go = () => {
    const p = hero.p, pal = hero.c.pal
    const layers: { itemId: string; plate: string; colorKey: string }[] = []
    const seen = new Set<string>()
    for (const k of ['outer', 'layer', 'top'] as Part[]) {
      const plate = p[k]; if (!plate) continue
      const itemId = PLATE_TO_ITEM[plate]; if (!itemId || seen.has(itemId)) continue
      seen.add(itemId); layers.push({ itemId, plate, colorKey: pal[k] || FALLBACK_PAL[k] })
    }
    const payload = {
      layers,
      bottom: p.bottom ? { plate: p.bottom, colorKey: pal.bottom || FALLBACK_PAL.bottom } : undefined,
      shoes: p.shoes ? { plate: p.shoes, colorKey: pal.shoes || FALLBACK_PAL.shoes } : undefined,
      style: STYLE_KEY[hero.c.st] ?? null, templateId: hero.c.id, situ,
    }
    try { sessionStorage.setItem('sp_rec_pick', JSON.stringify(payload)) } catch {}
    trackEvent('home_pick', { id: hero.c.id, evening, temp, situ })
    navigate('/home/build')
  }

  return (
    <div className="mb-3">
      <div className="bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-3xl p-3 grid grid-cols-[96px_1fr] gap-3 shadow-warm-sm">
        <div className="relative flex items-end justify-center overflow-hidden" style={{ height: 136 }}>
          <div className="absolute left-1/2 bottom-1 -translate-x-1/2 w-16 h-2 rounded-full" style={{ background: 'radial-gradient(ellipse at center, rgba(28,25,23,.16), rgba(28,25,23,0) 70%)' }} />
          <CharacterCanvas {...scene} width={96} />
        </div>
        <div className="min-w-0 flex flex-col">
          <div className="text-[10.5px] font-bold text-warm-500 truncate">{evening ? t('home.pick.tomorrow') : t('home.pick.today')} · {t('outfit.situ.' + situ)} · {weather ? `${weatherEmoji(evening ? tm!.code : weather.code)} ` : ''}{temp}° · {nameOf(hero)}</div>
          <div className="text-[15px] font-extrabold text-warm-900 dark:text-warm-100 leading-tight mt-0.5 truncate">{garments}</div>
          <div className="text-[11.5px] text-warm-600 dark:text-warm-400 leading-snug mt-1 line-clamp-2">{why}</div>
          <div className="flex gap-1.5 mt-auto pt-2">
            <button onClick={go} className="flex-1 h-9 rounded-full bg-terra-500 text-white text-[12.5px] font-bold flex items-center justify-center gap-1 active:scale-[0.98] shadow-terra">{t('home.pick.go')} <ArrowRight size={13} /></button>
            <button onClick={() => { trackEvent('home_pick_other', {}); navigate('/home/build') }} className="h-9 px-3 rounded-full bg-white dark:bg-warm-900/40 border border-warm-300 dark:border-warm-600 text-[12px] font-semibold text-warm-700 dark:text-warm-300 active:scale-[0.98]">{t('home.pick.other')}</button>
          </div>
        </div>
      </div>
      <button onClick={() => navigate('/closet/calendar')} className="w-full mt-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 flex items-center gap-2 active:scale-[0.99]">
        <span className="text-[12px] font-bold text-warm-900 dark:text-warm-100 whitespace-nowrap">{t('home.pick.streak', { n: dots.n })}</span>
        <span className="flex gap-1">
          {dots.on.map((on, i) => <i key={i} className={`w-5 h-5 rounded-full text-[9.5px] not-italic font-bold flex items-center justify-center ${on ? 'bg-warm-900 text-white dark:bg-warm-100 dark:text-warm-900' : 'bg-warm-100 dark:bg-warm-700 text-warm-400'}`}>{days[i]}</i>)}
        </span>
        <span className="ml-auto text-[11px] text-warm-500 whitespace-nowrap">{t('home.pick.lastWeek', { n: dots.last })}</span>
      </button>
    </div>
  )
}
