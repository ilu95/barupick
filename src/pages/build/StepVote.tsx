import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, X, Send } from 'lucide-react'
import CharacterCanvas from '@/components/mannequin/CharacterCanvas'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useWeather } from '@/hooks/useWeather'
import { COLORS_60, getColorName } from '@/lib/colors'
import { charSceneFromState, charSex, DEFAULT_SCARF, type CharScene } from '@/lib/char/map'
import { uiSlotOf, layerOf, HAT_NAMES, type UpperSlot } from '@/lib/builderSlots'
import { PARTS, ranked, alternatives, loadPrefs, loadRecent, plateName, type Part, type Situ, type Ctx } from '@/lib/outfits'
import { ITEMS_CATALOG } from '@/lib/styles'
import { scoreTemplate } from '@/lib/engine'
import { createVote, type VoteSide } from '@/lib/votes'
import { loadBasket, removeFromBasket } from '@/lib/voteBasket'
import { drawVoteOg } from '@/lib/coordCard'
import { trackVote } from '@/lib/analytics'
import type { BuildHook, BuildState } from '@/hooks/useBuild'

// ═══════════════════════════════════════════════════════
// 친구에게 물어보기 — 후보 고르기 (루프 L3)
// 자동으로 두 벌이 뽑히던 것을, 유저가 2~4벌을 직접 고르는 화면으로 바꿨다.
// 후보 풀: 지금 코디 · 색 하나 바꾼 것(엔진의 한 수) · 옷 하나 바꾼 것(1단계 대안) ·
// 담아 둔 코디(결과 화면의 "후보 담기") · 저장한 코디. 누른 순서가 A·B·C·D.
// ═══════════════════════════════════════════════════════

type Src = 'now' | 'move' | 'garment' | 'basket' | 'saved'
interface Cand { key: string; side: VoteSide; src: Src; sub: string; basketId?: string }
const UPPER: UpperSlot[] = ['outer', 'middleware', 'top', 'inner']
const LET = 'ABCD'
const MAX = 4

function colorsOf(s: BuildState): VoteSide['colors'] {
  const out: VoteSide['colors'] = []
  const push = (k?: string | null) => { if (k && COLORS_60[k]) out.push({ key: k, hex: COLORS_60[k].hex, name: getColorName(k) }) }
  for (const slot of UPPER) push(layerOf(s.upper, slot)?.colorKey)
  push(s.bottomColor); push(s.shoesColor); push(s.scarfColor); push(s.hatColor)
  return out
}
function withColor(s: BuildState, slot: string, key: string): BuildState {
  if ((UPPER as string[]).includes(slot)) return { ...s, upper: s.upper.map(l => uiSlotOf(l) === slot ? { ...l, colorKey: key } : l) }
  if (slot === 'bottom') return { ...s, bottomColor: key }
  if (slot === 'shoes') return { ...s, shoesColor: key }
  if (slot === 'scarf') return { ...s, scarfColor: key }
  if (slot === 'hat') return { ...s, hatColor: key }
  return s
}
const colorLabel = (c: VoteSide['colors']) => c.slice(0, 2).map(x => x.name).join(' + ')

export default function StepVote({ build }: { build: BuildHook }) {
  const { t, i18n } = useTranslation()
  const ko = (i18n.language || 'ko').startsWith('ko')
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth() as any
  const { weather } = useWeather()
  const s = build.state
  const sex = charSex()
  const score = build.getScore()
  const [sel, setSel] = useState<string[]>(['now'])
  const [q, setQ] = useState<string>(t('vote.defaultQ'))
  const [busy, setBusy] = useState(false)
  const [basketTick, setBasketTick] = useState(0)

  const garmentName = (id: string) => HAT_NAMES[id] ? HAT_NAMES[id][ko ? 'ko' : 'en'] : plateName(id)
  const garmentsOf = (st: BuildState): string[] => {
    const out: string[] = []
    for (const slot of UPPER) { const l = layerOf(st.upper, slot); if (!l) continue; out.push(l.plate ? garmentName(l.plate) : t('categories:itemsCatalog.' + l.itemId, { defaultValue: ITEMS_CATALOG.find(i => i.id === l.itemId)?.label || l.itemId })) }
    if (st.bottomItem) out.push(garmentName(st.bottomItem))
    if (st.shoesItem) out.push(garmentName(st.shoesItem))
    return out
  }

  // ── 후보 풀 ──
  const now: Cand = useMemo(() => {
    const colors = colorsOf(s)
    return { key: 'now', src: 'now', sub: garmentsOf(s).slice(0, 2).join(' · '), side: { scene: charSceneFromState(s, sex), colors, score, label: colorLabel(colors) } }
  }, [s, sex, score])

  const moves: Cand[] = useMemo(() => {
    const seen = new Set<string>(); const out: Cand[] = []
    for (const m of build.getBestMoves(5)) {
      if (seen.has(m.slot) || !COLORS_60[m.to]) continue
      seen.add(m.slot)
      const st = withColor(s, m.slot, m.to); const colors = colorsOf(st)
      const slotName = t('builder.slot.' + m.slot, { defaultValue: m.slot })
      out.push({ key: 'move:' + m.slot + ':' + m.to, src: 'move', sub: `${slotName} → ${getColorName(m.to)}`, side: { scene: charSceneFromState(st, sex), colors, score: m.score, label: `${slotName} ${getColorName(m.to)}` } })
      if (out.length >= 3) break
    }
    return out
  }, [s, sex])

  const garments: Cand[] = useMemo(() => {
    if (!s.templateId) return []
    try {
      const ctx: Ctx = { sex, situ: (s.situ as Situ) || 'daily', temp: weather?.feels ?? 21, prefs: loadPrefs(), recent: loadRecent() }
      const cur = ranked(ctx).find(e => e.c.id === s.templateId)
      if (!cur) return []
      const keyOf: Record<Part, string> = {
        outer: layerOf(s.upper, 'outer')?.colorKey || 'camel', layer: layerOf(s.upper, 'middleware')?.colorKey || 'beige',
        top: layerOf(s.upper, 'top')?.colorKey || layerOf(s.upper, 'inner')?.colorKey || 'white', bottom: s.bottomColor || 'charcoal', shoes: s.shoesColor || 'black',
      }
      const body = charSceneFromState(s, sex).body
      return alternatives(cur, ctx).slice(0, 3).map(e => {
        const parts = PARTS.filter(k => e.p[k])
        const items: CharScene['items'] = parts.map(k => ({ id: e.p[k]!, color: COLORS_60[keyOf[k]].hex }))
        if (s.scarfColor && COLORS_60[s.scarfColor]) items.push({ id: s.scarfItem || DEFAULT_SCARF, color: COLORS_60[s.scarfColor].hex })
        const colors = parts.map(k => ({ key: keyOf[k], hex: COLORS_60[keyOf[k]].hex, name: getColorName(keyOf[k]) }))
        const sc = scoreTemplate(Object.fromEntries(parts.map(k => [k, e.p[k]!])), Object.fromEntries(parts.map(k => [k, keyOf[k]])), s.situ)
        const main = e.p.outer || e.p.layer || e.p.top!
        return { key: 'garment:' + e.c.id, src: 'garment' as Src, sub: e.name || '', side: { scene: { items, body }, colors, score: Math.round(sc?.total || 0), label: plateName(main) } }
      })
    } catch { return [] }
  }, [s, sex, weather?.feels])

  const basket: Cand[] = useMemo(() => {
    const sig = JSON.stringify(now.side.scene.items)
    return loadBasket().filter(b => JSON.stringify(b.side.scene.items) !== sig).map(b => ({ key: 'basket:' + b.id, src: 'basket' as Src, sub: b.garments.map(garmentName).slice(0, 2).join(' · '), side: b.side, basketId: b.id }))
  }, [now, basketTick])

  const saved: Cand[] = useMemo(() => {
    try {
      const list = JSON.parse(localStorage.getItem('cs_saved') || '[]') as any[]
      return list.filter(x => x && x.scene && x.scene.items && x.outfit).slice(0, 4).map(x => {
        const colors = Object.values(x.outfit as Record<string, string>).filter(k => k && COLORS_60[k]).map(k => ({ key: k, hex: COLORS_60[k].hex, name: getColorName(k) }))
        return { key: 'saved:' + x.id, src: 'saved' as Src, sub: new Date(x.createdAt).toLocaleDateString(ko ? 'ko-KR' : 'en-US', { month: 'numeric', day: 'numeric' }), side: { scene: x.scene as CharScene, colors, score: x.score || 0, label: x.name || colorLabel(colors) } }
      })
    } catch { return [] }
  }, [])

  const all = useMemo(() => [now, ...moves, ...garments, ...basket, ...saved], [now, moves, garments, basket, saved])
  const chosen = sel.map(k => all.find(c => c.key === k)).filter(Boolean) as Cand[]

  const toggle = (key: string) => {
    setSel(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key)
      if (prev.length >= MAX) { toast.error(t('vote.maxFour')); return prev }
      return [...prev, key]
    })
  }
  const dropBasket = (id: string) => { removeFromBasket(id); setSel(prev => prev.filter(k => k !== 'basket:' + id)); setBasketTick(x => x + 1) }

  // ── 보내기 ──
  const send = async () => {
    if (chosen.length < 2 || busy) return
    setBusy(true)
    try {
      const n = chosen.length
      const sides = chosen.map(c => c.side)
      const question = q.trim() || t('vote.defaultQ')
      const sub = [weather?.feels != null ? `${weather.feels}°` : null, s.situ ? t('outfit.situ.' + s.situ) : null, n === 2 ? t('vote.twoSub') : t('vote.nSub', { n })].filter(Boolean).join(' · ')
      let ogDataUrl: string | null = null
      try { ogDataUrl = await drawVoteOg(sides, question, sub); if (import.meta.env.DEV) (window as any).__bp_lastOg = ogDataUrl } catch (e: any) { ogDataUrl = null; trackVote('create', { og_draw_fail: String(e?.message || e).slice(0, 200) }) }
      const v = await createVote({ sides, question, situ: s.situ || null, temp: weather?.feels ?? null, ownerId: user?.id || null, ogDataUrl })
      trackVote('create', { code: v.code, n, srcs: chosen.map(c => c.src).join(','), score: sides[0].score, custom_q: question !== t('vote.defaultQ') })
      navigate('/v/' + v.code)
    } catch { toast.error(t('vote.failCreate')) } finally { setBusy(false) }
  }

  const presets = [t('vote.defaultQ'), t('vote.q2'), t('vote.q3')]

  const card = (c: Cand) => {
    const idx = sel.indexOf(c.key)
    const on = idx >= 0
    const full = !on && sel.length >= MAX
    return (
      <button key={c.key} onClick={() => toggle(c.key)} className={`relative text-left rounded-2xl border p-1.5 transition-all active:scale-[0.97] ${on ? 'bg-white dark:bg-warm-800 border-warm-900 dark:border-warm-100 shadow-warm' : 'bg-white dark:bg-warm-800 border-warm-300 dark:border-warm-600'} ${full ? 'opacity-45' : ''}`}>
        {on && <span className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-warm-900 dark:bg-warm-100 text-white dark:text-warm-900 text-[11px] font-extrabold flex items-center justify-center z-10">{LET[idx]}</span>}
        {c.basketId && <span role="button" aria-label={t('vote.basketRemove')} onClick={e => { e.stopPropagation(); dropBasket(c.basketId!) }} className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white dark:bg-warm-700 border border-warm-400 dark:border-warm-500 text-warm-600 dark:text-warm-300 flex items-center justify-center z-10"><X size={11} /></span>}
        <div className="flex justify-center"><CharacterCanvas {...c.side.scene} width={84} /></div>
        <div className="mt-1 text-[11px] font-bold text-warm-900 dark:text-warm-100 truncate leading-tight">{c.side.label}</div>
        <div className="text-[10px] text-warm-500 truncate leading-tight">{c.sub || ' '}</div>
        <div className="mt-0.5 flex items-center gap-1">
          <span className="text-[10.5px] font-extrabold text-warm-800 dark:text-warm-200">{c.side.score}{t('builder.pt')}</span>
          <span className="flex gap-0.5">{c.side.colors.slice(0, 4).map((x, i) => <i key={i} className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ background: x.hex }} />)}</span>
        </div>
      </button>
    )
  }
  const sec = (title: string, list: Cand[], empty?: string) => (list.length || empty) ? (
    <div key={title} className="px-4 mt-3">
      <div className="text-[11px] font-bold text-warm-500 dark:text-warm-400 mb-1.5">{title}</div>
      {list.length ? <div className="grid grid-cols-3 gap-2">{list.map(card)}</div> : <div className="text-[11px] text-warm-500 bg-warm-100 dark:bg-warm-800 rounded-xl px-3 py-2">{empty}</div>}
    </div>
  ) : null

  return (
    <div className="-mx-5 -my-4 flex flex-col" style={{ minHeight: 'calc(100dvh - 60px)' }}>
      {/* 머리 */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
        <button onClick={() => build.goBack()} aria-label={t('common.back')} className="w-9 h-9 rounded-full bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 flex items-center justify-center active:scale-90"><ArrowLeft size={16} /></button>
        <div className="flex-1 font-display text-[17px] font-bold text-warm-900 dark:text-warm-100">{t('vote.pickTitle')}</div>
        <div className={`text-[12px] font-extrabold px-2.5 py-1 rounded-full ${chosen.length >= 2 ? 'bg-warm-900 text-white dark:bg-warm-100 dark:text-warm-900' : 'bg-warm-200 dark:bg-warm-700 text-warm-600 dark:text-warm-300'}`}>{chosen.length}/{MAX}</div>
      </div>
      <div className="px-4 text-[11.5px] text-warm-500 dark:text-warm-400">{t('vote.pickHint')}</div>

      {/* 질문 */}
      <div className="px-4 mt-3">
        <input value={q} onChange={e => setQ(e.target.value)} maxLength={40} placeholder={t('vote.defaultQ')}
          className="w-full px-3.5 py-2.5 bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-xl text-[14px] font-semibold text-warm-900 dark:text-warm-100 focus:outline-none focus:border-warm-900 dark:focus:border-warm-100" />
        <div className="flex gap-1.5 mt-1.5 overflow-x-auto">
          {presets.map(p => (
            <button key={p} onClick={() => setQ(p)} className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${q === p ? 'bg-warm-900 text-white border-warm-900 dark:bg-warm-100 dark:text-warm-900 dark:border-warm-100' : 'bg-white dark:bg-warm-800 text-warm-700 dark:text-warm-300 border-warm-300 dark:border-warm-600'}`}>{p}</button>
          ))}
        </div>
      </div>

      {sec(t('vote.secNow'), [now])}
      {sec(t('vote.secMove'), moves)}
      {sec(t('vote.secGarment'), garments)}
      {sec(t('vote.secBasket'), basket, t('vote.basketEmpty'))}
      {sec(t('vote.secSaved'), saved)}
      <div className="h-28" />

      {/* 발: 보내기 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white/95 dark:bg-[#1C1917]/95 backdrop-blur-xl border-t border-warm-300 dark:border-warm-700 px-4 py-2.5 z-50" style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="flex items-center gap-1.5 mb-1.5 h-5">
          {chosen.map((c, i) => <span key={c.key} className="flex items-center gap-1 text-[10.5px] font-semibold text-warm-700 dark:text-warm-300 truncate max-w-[30%]"><b className="w-4 h-4 rounded-full bg-warm-900 dark:bg-warm-100 text-white dark:text-warm-900 text-[9px] flex items-center justify-center shrink-0">{LET[i]}</b><span className="truncate">{c.side.label}</span></span>)}
          {chosen.length < 2 && <span className="text-[10.5px] text-warm-500">{t('vote.needTwo')}</span>}
        </div>
        <button onClick={send} disabled={chosen.length < 2 || busy} className="w-full py-3 bg-[#FEE500] text-[#1C1917] rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50">
          <Send size={16} /> {busy ? t('vote.asking') : t('vote.sendN', { n: chosen.length })}
        </button>
      </div>
    </div>
  )
}
