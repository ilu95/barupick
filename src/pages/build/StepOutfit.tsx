import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ThumbsUp, ThumbsDown, ArrowRight, RotateCcw, ChevronDown, ChevronUp, X, Thermometer } from 'lucide-react'
import CharacterCanvas from '@/components/mannequin/CharacterCanvas'
import { charSex, DEFAULT_HAIR, DEFAULT_HAIR_COLOR, type CharScene } from '@/lib/char/map'
import { useWeather } from '@/hooks/useWeather'
import type { BuildHook } from '@/hooks/useBuild'
import { useToast } from '@/components/ui/Toast'
import { trackOutfit } from '@/lib/analytics'
import {
  SITU, PARTS, NEU, CHG, PLATE_TO_ITEM, STYLE_KEY,
  ranked, direction, alternatives, reasons, nameOf, plateName, styleName, partOptions,
  loadPrefs, savePrefs, loadRecent, pushRecent, defaultSitu,
  type Entry, type Ctx, type Situ, type DirKind, type Part, type Parts, type Prefs,
} from '@/lib/outfits'

// ═══════════════════════════════════════════════════════
// 1단계 — 옷 조합 선택 ("한 벌 + 방향")
// 랜덤한 여섯 장이 아니라, 상황·기온·취향·최근으로 줄 세운 1위 한 벌을 보여 주고
// 거기서 옷 하나만 바꾼 방향 칩과 축이 다른 대안 3장으로 움직인다.
// 색은 여기서 고르지 않는다 — 카드의 색은 전부 중립색이다.
// ═══════════════════════════════════════════════════════

const FALLBACK_PAL: Record<Part, string> = { outer: 'camel', layer: 'beige', top: 'white', bottom: 'charcoal', shoes: 'black' }
const TEMP_STEPS = [15, 21, 26]

export default function StepOutfit({ build }: { build: BuildHook }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { weather } = useWeather()
  const sex = charSex()

  const [situ, setSitu] = useState<Situ>(defaultSitu)
  const [tempOverride, setTempOverride] = useState<number | null>(null)
  const [anchor, setAnchor] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [recent] = useState(loadRecent)
  const [cur, setCur] = useState<Entry | null>(null)
  const [lastDiff, setLastDiff] = useState<string | null>(null)
  const [more, setMore] = useState(false)
  const [anchorOpen, setAnchorOpen] = useState(false)

  const temp = tempOverride ?? weather?.feels ?? 21
  const ctx: Ctx = useMemo(() => ({ sex, situ, temp, prefs, recent, anchor }), [sex, situ, temp, prefs, recent, anchor])
  const list = useMemo(() => ranked(ctx), [ctx])
  const baseTop = list[0] || null

  // 조건이 바뀌면 1위로 돌아간다 (👍👎는 조건이 아니라 현재 카드를 유지)
  const condKey = `${situ}|${temp}|${anchor}|${sex}`
  const lastCond = useRef(condKey)
  useEffect(() => {
    if (lastCond.current !== condKey) { lastCond.current = condKey; setCur(null); setLastDiff(null) }
  }, [condKey])

  const hero = cur || baseTop
  useEffect(() => { if (hero) trackOutfit('view', { id: hero.c.id, situ, temp, top: baseTop?.c.id, changed: hero !== baseTop }) }, [hero?.c.id, condKey])

  const cool = temp >= 24
  const dirs = useMemo(() => hero ? ({
    formal: direction(hero, 'formal', ctx),
    relax: direction(hero, 'relax', ctx),
    temp: direction(hero, cool ? 'cool' : 'warm', ctx),
    twist: direction(hero, 'twist', ctx),
  }) : null, [hero, ctx, cool])
  const alts = useMemo(() => hero ? alternatives(hero, ctx) : [], [hero, ctx])
  const moreList = useMemo(() => hero ? list.filter(e => e.c.id !== hero.c.id && !alts.some(a => a.c.id === e.c.id)).slice(0, 6) : [], [list, hero, alts])

  const scene = (p: Parts, chg?: Part): CharScene => ({
    items: PARTS.filter(k => p[k]).map(k => ({ id: p[k]!, color: k === chg ? CHG : NEU[k] })),
    body: { sex, hair: DEFAULT_HAIR[sex], hairColor: DEFAULT_HAIR_COLOR },
  })
  const garments = (p: Parts) => PARTS.filter(k => p[k]).map(k => plateName(p[k]!)).join(' · ')

  const adopt = (e: Entry, via: string, diff?: string | null) => {
    setCur(e); setLastDiff(diff || null)
    trackOutfit('adopt', { id: e.c.id, via, situ, temp })
  }
  const onDir = (kind: DirKind, key: string) => {
    const v = dirs?.[key as keyof typeof dirs]
    if (!v || !hero) return
    const from = v.from ? plateName(v.from) : t('outfit.none')
    const to = v.to ? plateName(v.to) : t('outfit.remove')
    v.name = t('outfit.dirName.' + kind)
    adopt(v, 'dir:' + kind, `${from} → ${to} · ${t('outfit.dirLabel.' + kind)}`)
  }
  const like = () => {
    if (!hero) return
    const p: Prefs = { ...prefs, likes: { ...prefs.likes }, likedStyles: { ...prefs.likedStyles } }
    for (const k of PARTS) if (hero.p[k]) p.likes[hero.p[k]!] = (p.likes[hero.p[k]!] || 0) + 2
    p.likedStyles[hero.c.st] = (p.likedStyles[hero.c.st] || 0) + 3
    p.dislikes = p.dislikes.filter(id => id !== hero.c.id)
    setPrefs(p); savePrefs(p); toast.success(t('outfit.likedToast'))
    trackOutfit('feedback', { kind: 'like', id: hero.c.id })
  }
  const dislike = () => {
    if (!hero) return
    const p: Prefs = { ...prefs, dislikes: [...prefs.dislikes.filter(id => id !== hero.c.id), hero.c.id] }
    setPrefs(p); savePrefs(p); toast.success(t('outfit.dislikedToast'))
    trackOutfit('feedback', { kind: 'dislike', id: hero.c.id })
    const next = ranked({ ...ctx, prefs: p }).find(e => e.c.id !== hero.c.id)
    if (next) { setCur(next); setLastDiff(null) }
  }
  const cycleTemp = () => {
    const i = TEMP_STEPS.indexOf(temp)
    const next = i < 0 ? TEMP_STEPS[0] : i === TEMP_STEPS.length - 1 ? (weather ? null : TEMP_STEPS[0]) : TEMP_STEPS[i + 1]
    setTempOverride(next)
  }
  const go = () => {
    if (!hero) return
    const p = hero.p, pal = hero.c.pal
    const layers: { itemId: string; plate: string; colorKey: string }[] = []
    const seen = new Set<string>()
    for (const k of ['outer', 'layer', 'top'] as Part[]) {
      const plate = p[k]; if (!plate) continue
      const itemId = PLATE_TO_ITEM[plate]; if (!itemId || seen.has(itemId)) continue
      seen.add(itemId)
      layers.push({ itemId, plate, colorKey: pal[k] || FALLBACK_PAL[k] })
    }
    pushRecent(hero.c.id)
    trackOutfit('pick', { id: hero.c.id, via: hero === baseTop ? 'top' : 'changed', situ, temp, rank: list.findIndex(e => e.c.id === hero.c.id) + 1, n_layers: layers.length })
    build.applyOutfit({
      layers,
      bottom: p.bottom ? { plate: p.bottom, colorKey: pal.bottom || FALLBACK_PAL.bottom } : undefined,
      shoes: p.shoes ? { plate: p.shoes, colorKey: pal.shoes || FALLBACK_PAL.shoes } : undefined,
      style: STYLE_KEY[hero.c.st] ?? null,
      templateId: hero.c.id,
    })
  }

  const isLiked = !!hero && PARTS.some(k => hero.p[k] && prefs.likes[hero.p[k]!] > 0) && !!prefs.likedStyles[hero.c.st]
  const isDisliked = !!hero && prefs.dislikes.includes(hero.c.id)
  const chip = 'px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all active:scale-95'
  const chipOn = 'bg-terra-500 text-white'
  const chipOff = 'bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 text-warm-700 dark:text-warm-300'

  if (!hero) return null

  return (
    <div className="animate-screen-fade">
      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-1">{t('outfit.title')}</h2>
      <p className="text-sm text-warm-600 dark:text-warm-400 mb-4">{t('outfit.subtitle')}</p>

      {/* 상황 · 기온 */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-5 px-5 mb-3 [scrollbar-width:none]">
        {SITU.map(s => (
          <button key={s.id} onClick={() => setSitu(s.id)} className={`${chip} ${situ === s.id ? chipOn : chipOff}`}>{t('outfit.situ.' + s.id)}</button>
        ))}
        <button onClick={cycleTemp} title={t('outfit.weatherTap')} className={`${chip} ${chipOff} flex items-center gap-1 ml-1`}>
          <Thermometer size={12} /> {temp}°{tempOverride !== null && <span className="text-warm-400">·{t('outfit.manual')}</span>}
        </button>
      </div>

      {/* 1위 한 벌 */}
      <div className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-3xl shadow-warm-sm p-4 mb-3">
        <div className="grid grid-cols-[132px_1fr] gap-3 items-center">
          <div className="relative flex justify-center">
            {anchor && <span className="absolute top-0 left-0 text-[10px] font-bold bg-warm-900 text-white px-2 py-0.5 rounded-full">{plateName(anchor)}</span>}
            <CharacterCanvas {...scene(hero.p, hero.chg)} width={132} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="text-[11px] font-semibold text-warm-500 truncate">{t('outfit.situ.' + situ)} · {temp}° · {styleName(hero.c.st)}</div>
              <div className="flex gap-1 flex-none">
                <button onClick={like} aria-label={t('outfit.like')} className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all active:scale-90 ${isLiked ? 'bg-terra-500 border-terra-500 text-white' : 'border-warm-400 dark:border-warm-600 text-warm-600'}`}><ThumbsUp size={13} /></button>
                <button onClick={dislike} aria-label={t('outfit.dislike')} className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all active:scale-90 ${isDisliked ? 'bg-warm-900 border-warm-900 text-white' : 'border-warm-400 dark:border-warm-600 text-warm-600'}`}><ThumbsDown size={13} /></button>
              </div>
            </div>
            <div className="font-display text-lg font-bold text-warm-900 dark:text-warm-100 leading-tight mb-1">{nameOf(hero)}</div>
            <div className="text-[12.5px] text-warm-700 dark:text-warm-300 leading-snug mb-2">{hero.why || reasons(hero, ctx)}</div>
            <div className="text-[11.5px] text-warm-500 leading-snug">{garments(hero.p)}</div>
            {lastDiff && <div className="text-[11.5px] text-warm-900 dark:text-warm-100 font-semibold mt-1">{lastDiff}</div>}
          </div>
        </div>
        <button onClick={go} className="mt-3 w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra">
          {t('outfit.pickColors')} <ArrowRight size={16} />
        </button>
      </div>

      {/* 방향 칩 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {([['formal', 'formal'], ['relax', 'relax'], ['temp', cool ? 'cool' : 'warm'], ['twist', 'twist']] as [string, DirKind][]).map(([key, kind]) => {
          const v = dirs?.[key as keyof typeof dirs]
          return (
            <button key={key} disabled={!v} onClick={() => onDir(kind, key)}
              className="text-left px-3 py-2.5 rounded-2xl bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 disabled:opacity-40 active:scale-[0.98] transition-all">
              <div className="text-[12.5px] font-semibold text-warm-900 dark:text-warm-100">{t('outfit.dirs.' + kind)}</div>
              {v && <div className="text-[11px] text-warm-500 truncate">→ {v.to ? plateName(v.to) : `${plateName(v.from!)} ${t('outfit.remove')}`}</div>}
            </button>
          )
        })}
        {hero !== baseTop && (
          <button onClick={() => { setCur(null); setLastDiff(null) }} className="col-span-2 text-[12px] text-terra-600 font-medium py-1 flex items-center justify-center gap-1 active:opacity-70"><RotateCcw size={12} /> {t('outfit.reset')}</button>
        )}
      </div>

      {/* 대안 3장 */}
      <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-wide mb-2">{t('outfit.altsTitle')}</div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {alts.map(e => (
          <button key={e.c.id} onClick={() => adopt(e, 'alt')} className="text-left bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-2 active:scale-[0.98] transition-all">
            <div className="flex justify-center mb-1"><CharacterCanvas {...scene(e.p)} width={78} /></div>
            <div className="text-[11.5px] font-bold text-warm-900 dark:text-warm-100 leading-tight">{e.name}</div>
            <div className="text-[10px] text-warm-500 leading-snug line-clamp-2 mt-0.5">{e.why}</div>
          </button>
        ))}
      </div>
      <button onClick={() => setMore(m => !m)} className="w-full text-[12px] text-warm-600 dark:text-warm-400 py-2 flex items-center justify-center gap-1 active:opacity-70">
        {more ? <><ChevronUp size={13} /> {t('outfit.less')}</> : <><ChevronDown size={13} /> {t('outfit.more')}</>}
      </button>
      {more && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {moreList.map((e, i) => (
            <button key={e.c.id} onClick={() => adopt(e, 'more')} className="text-left bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-2 active:scale-[0.98] transition-all">
              <div className="flex justify-center mb-1"><CharacterCanvas {...scene(e.p)} width={78} /></div>
              <div className="text-[11px] font-bold text-warm-900 dark:text-warm-100 leading-tight">{styleName(e.c.st)}</div>
              <div className="text-[10px] text-warm-500 leading-snug line-clamp-2">{garments(e.p)}</div>
            </button>
          ))}
        </div>
      )}

      {/* 입을 옷이 정해져 있을 때 */}
      <div className="h-px bg-warm-400 dark:bg-warm-600 my-4" />
      <button onClick={() => setAnchorOpen(o => !o)} className="w-full flex items-center justify-between py-1 active:opacity-70">
        <div className="text-left">
          <div className="text-sm font-semibold text-warm-900 dark:text-warm-100">{t('outfit.anchorTitle')}</div>
          <div className="text-[11px] text-warm-600 dark:text-warm-400">{anchor ? plateName(anchor) : t('outfit.anchorHint')}</div>
        </div>
        {anchor ? <span onClick={e => { e.stopPropagation(); setAnchor(null) }} className="text-[11px] text-terra-600 font-medium flex items-center gap-0.5"><X size={12} /> {t('outfit.anchorClear')}</span> : (anchorOpen ? <ChevronUp size={16} className="text-warm-500" /> : <ChevronDown size={16} className="text-warm-500" />)}
      </button>
      {anchorOpen && (
        <div className="mt-2 flex flex-col gap-2">
          {PARTS.map(part => (
            <div key={part} className="flex gap-1.5 overflow-x-auto -mx-5 px-5 pb-1 [scrollbar-width:none]">
              {partOptions(part, sex).filter((id): id is string => !!id).map(id => (
                <button key={id} onClick={() => { setAnchor(anchor === id ? null : id); setAnchorOpen(false); trackOutfit('anchor', { id }) }} className={`${chip} ${anchor === id ? chipOn : chipOff}`}>{plateName(id)}</button>
              ))}
            </div>
          ))}
        </div>
      )}

      <button onClick={() => build.pushStep('style')} className="text-sm text-terra-600 font-medium w-full text-center py-3 mt-2 active:opacity-70">
        {t('outfit.styleFirst')} →
      </button>
    </div>
  )
}
