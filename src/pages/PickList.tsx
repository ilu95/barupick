import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Thermometer } from 'lucide-react'
import CharacterCanvas from '@/components/mannequin/CharacterCanvas'
import { COLORS_60, getColorName } from '@/lib/colors'
import { charSex, DEFAULT_HAIR, DEFAULT_HAIR_COLOR, type CharScene } from '@/lib/char/map'
import { useWeather } from '@/hooks/useWeather'
import { SITU, PARTS, STYLE_KEY, ranked, reasons, plateName, styleName, loadPrefs, loadRecent, defaultSitu, type Ctx, type Entry, type Situ } from '@/lib/outfits'
import { STYLE_GUIDE, MOOD_GROUPS } from '@/lib/styles'
import { colorKeyOf, colorKeysOf, stashPick } from '@/lib/pickPayload'
import { trackEvent } from '@/lib/analytics'

// ═══════════════════════════════════════════════════════
// 조합 목록 — 한 가지 니즈로 거른 후보들 (홈의 "레이어드 조합 추천받기" 등)
// layered: 겹쳐 입는 조합만 · outer: 아우터가 있는 조합만 · style: 한 스타일의 코디 조합만.
// 누르면 그 조합으로 색 고르기.
// ═══════════════════════════════════════════════════════

const KINDS: Record<string, (e: Entry) => boolean> = {
  layered: e => !!e.p.layer,
  outer: e => !!e.p.outer,
}
const TEMP_STEPS = [10, 15, 21, 26]
const MIN_STYLE_CARDS = 8

const sigOf = (e: Entry) => PARTS.map(k => e.p[k] || '').join('|')

export default function PickList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { kind: rawKind, style: rawStyle } = useParams()
  const style = rawStyle && STYLE_GUIDE[rawStyle] ? rawStyle : null
  const kind = style ? 'style' : (rawKind && KINDS[rawKind] ? rawKind : 'layered')
  const { weather } = useWeather()
  const sex = charSex()
  const [situ, setSitu] = useState<Situ>(defaultSitu)
  const [tempOverride, setTempOverride] = useState<number | null>(null)
  const temp = tempOverride ?? (weather?.feels ?? 21)
  const ctx: Ctx = useMemo(() => ({ sex, situ, temp, prefs: loadPrefs(), recent: loadRecent() }), [sex, situ, temp])
  const list = useMemo(() => {
    if (style) return []
    const seen = new Set<string>(); const out: Entry[] = []
    for (const e of ranked(ctx).filter(KINDS[kind])) {
      const sig = sigOf(e); if (seen.has(sig)) continue
      seen.add(sig); out.push(e); if (out.length >= 12) break
    }
    return out
  }, [ctx, kind, style])
  const { styleList, neighborList } = useMemo(() => {
    if (!style) return { styleList: [] as Entry[], neighborList: [] as Entry[] }
    const seen = new Set<string>(); const primary: Entry[] = []
    for (const e of ranked(ctx)) {
      if (STYLE_KEY[e.c.st] !== style) continue
      const sig = sigOf(e); if (seen.has(sig)) continue
      seen.add(sig); primary.push(e)
    }
    const neighbors: Entry[] = []
    if (primary.length < MIN_STYLE_CARDS) {
      const group = Object.values(MOOD_GROUPS).find(g => g.styles.includes(style))
      for (const ns of (group?.styles || []).filter(s => s !== style)) {
        if (primary.length + neighbors.length >= MIN_STYLE_CARDS) break
        for (const e of ranked(ctx)) {
          if (STYLE_KEY[e.c.st] !== ns) continue
          const sig = sigOf(e); if (seen.has(sig)) continue
          seen.add(sig); neighbors.push(e)
          if (primary.length + neighbors.length >= MIN_STYLE_CARDS) break
        }
      }
    }
    return { styleList: primary, neighborList: neighbors }
  }, [ctx, style])

  const scene = (e: Entry): CharScene => ({
    items: PARTS.filter(k => e.p[k]).map(k => ({ id: e.p[k]!, color: COLORS_60[colorKeyOf(e, k)]?.hex || '#ccc' })),
    body: { sex, hair: DEFAULT_HAIR[sex], hairColor: DEFAULT_HAIR_COLOR },
  })
  const pick = (e: Entry, i: number) => {
    stashPick(e, situ, 'builder')
    trackEvent('picks_pick', { kind, id: e.c.id, rank: i + 1, situ, temp, ...(style ? { style } : {}) })
    navigate('/home/build')
  }
  const cycleTemp = () => { const i = TEMP_STEPS.indexOf(temp); setTempOverride(i < 0 ? TEMP_STEPS[0] : i === TEMP_STEPS.length - 1 ? (weather ? null : TEMP_STEPS[0]) : TEMP_STEPS[i + 1]) }
  const chip = (on: boolean) => `flex-none h-7 px-3 rounded-full text-[12px] font-semibold border transition-all ${on ? 'bg-warm-900 text-white border-warm-900 dark:bg-warm-100 dark:text-warm-900 dark:border-warm-100' : 'bg-white dark:bg-warm-800 border-warm-300 dark:border-warm-600 text-warm-600 dark:text-warm-300'}`
  const title = style ? t(`styles:guide.${style}.name`) : t(`picks.${kind}.title`)
  const subtitle = style ? t(`styles:guide.${style}.subtitle`) : t(`picks.${kind}.sub`)

  const card = (e: Entry, i: number) => (
    <button key={e.c.id} onClick={() => pick(e, i)} className="text-left bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl p-2.5 shadow-warm-sm active:scale-[0.98] transition-all">
      <div className="flex justify-center mb-1"><CharacterCanvas {...scene(e)} width={104} /></div>
      <div className="text-[10.5px] font-semibold text-warm-500">{styleName(e.c.st)}</div>
      <div className="text-[12px] font-bold text-warm-900 dark:text-warm-100 leading-tight mt-0.5">{PARTS.filter(k => e.p[k]).map(k => plateName(e.p[k]!)).join(' · ')}</div>
      <div className="flex items-center gap-1 mt-1.5">
        {colorKeysOf(e).map((k, j) => <i key={j} title={getColorName(k)} className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ background: COLORS_60[k]?.hex }} />)}
      </div>
      <div className="text-[10.5px] text-warm-500 leading-snug line-clamp-2 mt-1.5">{reasons(e, ctx)}</div>
    </button>
  )

  return (
    <div className="animate-screen-fade px-5 pt-3 pb-10">
      <div className="flex items-center gap-2 mb-1">
        <button onClick={() => navigate(-1)} aria-label={t('common.back')} className="w-9 h-9 rounded-full bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 flex items-center justify-center active:scale-90"><ArrowLeft size={16} /></button>
        <h1 className="font-display text-[20px] font-bold tracking-tight text-warm-900 dark:text-warm-100 flex-1">{title}</h1>
        <button onClick={cycleTemp} className="h-8 px-2.5 rounded-full bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-[12px] font-bold text-warm-800 dark:text-warm-200 flex items-center gap-1 active:scale-95"><Thermometer size={13} />{temp}°</button>
      </div>
      <p className="text-[12.5px] text-warm-600 dark:text-warm-400 mb-2">{subtitle}</p>
      {style && <p className="text-[12px] text-warm-500 dark:text-warm-400 mb-2 -mt-1">{t(`picks.styleWhy.${style}`)}</p>}
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] -mx-5 px-5 mb-3">
        {SITU.map(s => <button key={s.id} onClick={() => setSitu(s.id)} className={chip(situ === s.id)}>{t('outfit.situ.' + s.id)}</button>)}
      </div>

      {style ? (
        styleList.length + neighborList.length === 0 ? (
          <div className="text-center py-14 text-[13px] text-warm-500">{t('picks.empty')}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">{styleList.map((e, i) => card(e, i))}</div>
            {neighborList.length > 0 && (
              <>
                <div className="text-[11px] font-semibold text-warm-500 mt-4 mb-2">{t('picks.styleNeighbor')}</div>
                <div className="grid grid-cols-2 gap-2">{neighborList.map((e, i) => card(e, styleList.length + i))}</div>
              </>
            )}
          </>
        )
      ) : list.length === 0 ? (
        <div className="text-center py-14 text-[13px] text-warm-500">{t('picks.empty')}</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">{list.map((e, i) => card(e, i))}</div>
      )}
    </div>
  )
}
