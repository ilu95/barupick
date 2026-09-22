import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Pin, X } from 'lucide-react'
import CharacterCanvas from '@/components/mannequin/CharacterCanvas'
import { COLORS_60, COLOR_TABS, getColorName } from '@/lib/colors'
import { charSex, charSceneFromState } from '@/lib/char/map'
import { uiSlotOf, typesFor } from '@/lib/builderSlots'
import { SITU, ranked, sig, loadPrefs, loadRecent, defaultSitu, type Ctx, type Entry, type Situ } from '@/lib/outfits'
import { pickPayload } from '@/lib/pickPayload'
import { initialState, outfitToState, engineInputOf, type BuildState } from '@/hooks/useBuild'
import { catalogFor, scoreOutfit, type ComboCard, type EngineInput } from '@/lib/engine'
import { useWeather } from '@/hooks/useWeather'
import { TEMP_STEPS, DEFAULT_TEMP, nowTemp } from '@/hooks/useTemp'
import { trackEvent } from '@/lib/analytics'

// ═══════════════════════════════════════════════════════
// 코디 카탈로그 — 자리별 색을 고정할수록 코디가 좁혀진다
// 자물쇠를 하나도 안 걸면 오늘 입을 만한 코디 전부, "상의는 네이비"를 걸면 그 조건에
// 맞는 것만 남는다. 점수는 만들기와 같은 길(outfitToState → engineInputOf → engine)로
// 매기므로 [이대로 만들기] 를 눌러 넘어간 결과 화면 점수가 카드 총점과 정확히 같다.
// 무작위는 없다 — 같은 고정·같은 상황이면 언제나 같은 목록이 나온다.
//
// v2: 옷 모양은 지금 기온을 따르고(기온 칩), 92점 동점은 원점수로 갈라 바탕 코디를
// 번갈아 보여 주며, 모자·머플러도 잠글 수 있다(잠갔을 때만 입는다).
// ═══════════════════════════════════════════════════════

/** 자물쇠를 걸 수 있는 자리. hat·scarf 는 바탕 코디에 원래 없어서 잠근 그때만 입는다 */
const LOCK_SLOTS = ['outer', 'top', 'bottom', 'shoes', 'hat', 'scarf'] as const
type LockSlot = typeof LOCK_SLOTS[number]
/** 잠가야만 생기는 자리 — 자물쇠를 풀면 코디에서 사라진다 */
const ACC_SLOTS = ['hat', 'scarf'] as const

const MAX_CARDS = 24
const MIN_CARDS = 6
const SAME_MAIN_MAX = 4
const HEAD = 8
const HEAD_BASE_MAX = 4
const OK_SCORE = 60
const WARM = 26
/** 완전 동점일 때의 마지막 갈림 — 무난한 것부터 */
const KINDS = ['safe', 'point', 'two', 'tone', 'taste']

type Locks = Partial<Record<LockSlot, string>>

const parseLocks = (raw: string | null): Locks => {
  const out: Locks = {}
  for (const part of (raw || '').split(',')) {
    const [slot, key] = part.split(':')
    if (LOCK_SLOTS.includes(slot as LockSlot) && COLORS_60[key]) out[slot as LockSlot] = key
  }
  return out
}
const formatLocks = (l: Locks) => LOCK_SLOTS.filter(s => l[s]).map(s => `${s}:${l[s]}`).join(',')

const rawOf = (c: ComboCard) => c.rawTotal ?? c.total
const tieKey = (c: ComboCard) => `${c.total}|${rawOf(c)}`
/** 이 카드의 주색 — 못 박은 색은 빼고 본다 (카드마다 같으니 세면 전부 걸린다) */
const mainOf = (x: Card, locks: Locks) => LOCK_SLOTS.filter(s => !locks[s]).map(s => x.full[s]).find(Boolean) || ''

interface Base { e: Entry; state: BuildState; input: EngineInput }
interface Card { c: ComboCard; base: Base; full: Record<string, string>; hard: boolean }

export default function ColorCatalog() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const sex = charSex()
  const { weather } = useWeather({ auto: false })
  const [sp, setSp] = useSearchParams()
  const [sheet, setSheet] = useState<LockSlot | null>(null)
  const [open, setOpen] = useState<Card | null>(null)
  const [tab, setTab] = useState(COLOR_TABS[0].id)

  const situ = (SITU.find(s => s.id === sp.get('situ'))?.id ?? defaultSitu()) as Situ
  const lockRaw = sp.get('lock')
  const locks = useMemo(() => parseLocks(lockRaw), [lockRaw])
  const lockKey = useMemo(() => formatLocks(locks), [locks])
  const lockedSlots = useMemo(() => LOCK_SLOTS.filter(s => locks[s]), [locks])

  // ── 기온: 날씨가 있으면 지금 체감, 유저가 칩을 고르면 그게 이긴다 (URL 에 남아 재진입해도 같다) ──
  const now = nowTemp(weather)
  const rawTemp = Number(sp.get('temp'))
  const picked = TEMP_STEPS.includes(rawTemp) ? rawTemp : null
  const temp = picked ?? now ?? DEFAULT_TEMP
  const selTemp: number | 'now' = picked ?? (now != null ? 'now' : DEFAULT_TEMP)

  const setParams = (next: { lock?: Locks; situ?: Situ; temp?: number | null }) => {
    const lock = formatLocks(next.lock ?? locks)
    const q: Record<string, string> = { situ: next.situ ?? situ }
    if (lock) q.lock = lock
    const tp = next.temp === undefined ? picked : next.temp
    if (tp != null) q.temp = String(tp)
    setSp(q, { replace: true })
  }

  // 잠근 모자·머플러는 바탕 코디에 얹어서 입힌다 (안 잠갔으면 null — 코디에 원래 없다)
  const accs = useMemo(() => ({
    hat: locks.hat ? { plate: typesFor('hat', sex)[0], colorKey: locks.hat } : null,
    scarf: locks.scarf ? { plate: typesFor('scarf', sex)[0], colorKey: locks.scarf } : null,
  }), [locks.hat, locks.scarf, sex])

  // ── 바탕 코디: 이 기온 순위에서 판이 서로 다른 것 4벌. 잠근 자리가 없는 코디는 뺀다 ──
  // (아우터를 잠갔는데 아우터가 없는 코디를 보여 주면 자물쇠가 거짓말이 된다)
  const bases = useMemo<Base[]>(() => {
    const ctx: Ctx = { sex, situ, temp, prefs: loadPrefs(), recent: loadRecent() }
    const seen = new Set<string>()
    const out: Base[] = []
    for (const e of ranked(ctx)) {
      const s = sig(e.p)
      if (seen.has(s)) continue
      seen.add(s)
      const state = outfitToState(initialState('coord'), { ...pickPayload(e, situ, 'result'), ...accs })
      const input = engineInputOf(state)
      if (lockedSlots.some(k => !input.outfit[k])) continue
      out.push({ e, state, input })
      if (out.length >= 4) break
    }
    return out
  }, [sex, situ, temp, lockKey, accs])

  // ── 카드: 바탕마다 자물쇠 밖의 자리를 카탈로그로 펼치고 합쳐 줄 세운다 ──
  const cards = useMemo<Card[]>(() => {
    const locked = new Set<string>(lockedSlots)
    const all: Card[] = []
    for (const base of bases) {
      const input = { ...base.input, outfit: { ...base.input.outfit, ...locks } }
      const list = catalogFor(input, locked, 12)
      // 고를 자리가 하나도 안 남았으면(네 자리를 다 박았다) 못 박은 그 한 벌이 답이다
      if (!list.length) {
        const r = scoreOutfit(input)
        list.push({ outfit: {}, total: r.total, why: (r.reasons.find(x => x.w > 0) || { txt: '' }).txt || '', kind: 'safe', mine: 0 })
      }
      for (const c of list) all.push({ c, base, full: { ...input.outfit, ...c.outfit }, hard: false })
    }
    // 점수 → 원점수(보정 전) → 종류 순. 표시 점수는 92에서 천장을 치니 그 안을 원점수가 가른다
    all.sort((a, b) => b.c.total - a.c.total || rawOf(b.c) - rawOf(a.c) || KINDS.indexOf(a.c.kind) - KINDS.indexOf(b.c.kind))
    // 완전 동점 묶음은 바탕 코디를 번갈아 — 첫 줄부터 여러 벌이 섞여 보이게
    const sorted: Card[] = []
    for (let i = 0; i < all.length;) {
      let j = i
      while (j < all.length && tieKey(all[j].c) === tieKey(all[i].c)) j++
      const lanes = bases.map(b => all.slice(i, j).filter(x => x.base === b))
      const depth = Math.max(0, ...lanes.map(l => l.length))
      for (let k = 0; k < depth; k++) for (const lane of lanes) if (lane[k]) sorted.push(lane[k])
      i = j
    }
    const bySig = new Set<string>()
    const mainCount: Record<string, number> = {}
    const baseCount: Record<string, number> = {}
    const kept: Card[] = []
    const spare: Card[] = []
    const take = (x: Card) => {
      mainCount[mainOf(x, locks)] = (mainCount[mainOf(x, locks)] || 0) + 1
      baseCount[x.base.e.c.id] = (baseCount[x.base.e.c.id] || 0) + 1
      kept.push(x)
    }
    for (const x of sorted) {
      const key = Object.keys(x.full).sort().map(s => s + ':' + x.full[s]).join('|')
      if (bySig.has(key)) continue
      bySig.add(key)
      // 한 가지 주색이 목록을 덮지 않게. 단 못 박은 색은 세지 않는다 — 카드마다 같으니 세면 전부 걸린다
      const main = mainOf(x, locks)
      if (main && (mainCount[main] || 0) >= SAME_MAIN_MAX) continue
      // 첫 줄부터 여러 벌이 보이게 — 머리 8장은 한 바탕 코디가 절반을 넘기지 않는다.
      // 밀어 둔 카드는 머리가 차는 즉시 도로 넣는다(바탕이 하나뿐이면 그대로 원래 순서가 된다)
      if (kept.length < HEAD && (baseCount[x.base.e.c.id] || 0) >= HEAD_BASE_MAX) { spare.push(x); continue }
      take(x)
      if (kept.length >= MAX_CARDS) break
      if (kept.length === HEAD) while (spare.length && kept.length < MAX_CARDS) take(spare.shift()!)
    }
    for (const x of spare) { if (kept.length >= MAX_CARDS) break; take(x) }
    // 60점 미만은 내리되, 너무 적으면 △ 를 달아서라도 보여 준다 (0장은 없다)
    const good = kept.filter(x => x.c.total >= OK_SCORE)
    return (good.length >= MIN_CARDS ? good : kept.slice(0, Math.max(MIN_CARDS, good.length)))
      .map(x => ({ ...x, hard: x.c.total < OK_SCORE }))
  }, [bases, lockKey])

  useEffect(() => { trackEvent('catalog_view', { locks: lockedSlots.length, situ, temp, n: cards.length }) }, [lockKey, situ, temp])
  useEffect(() => { setOpen(null) }, [lockKey, situ, temp])

  const sceneOf = (x: Card) => charSceneFromState({
    ...x.base.state,
    upper: x.base.state.upper.map(l => { const s = uiSlotOf(l); return x.full[s] ? { ...l, colorKey: x.full[s] } : l }),
    bottomColor: x.full.bottom || x.base.state.bottomColor,
    shoesColor: x.full.shoes || x.base.state.shoesColor,
    scarfColor: x.full.scarf || x.base.state.scarfColor,
    hatColor: x.full.hat || x.base.state.hatColor,
    tieColor: x.full.tie || x.base.state.tieColor,
  }, sex)

  const lock = (slot: LockSlot, key: string | null) => {
    const next = { ...locks }
    if (key) next[slot] = key; else delete next[slot]
    trackEvent(key ? 'catalog_lock' : 'catalog_unlock', { slot, key: key || '' })
    setParams({ lock: next })
    setSheet(null)
  }

  // ── [이대로 만들기]: 바탕 코디의 판은 그대로, 색만 이 카드 것으로 바꿔 만들기로 넘긴다 ──
  const make = (x: Card) => {
    const p = pickPayload(x.base.e, situ, 'result')
    const slotOf = new Map(x.base.state.upper.map(l => [l.itemId, uiSlotOf(l)]))
    const recolor = <T extends { colorKey: string } | undefined>(part: T, slot: string): T =>
      part && x.full[slot] ? { ...part, colorKey: x.full[slot] } : part
    const payload = {
      ...p,
      layers: p.layers.map(l => { const s = slotOf.get(l.itemId); return s && x.full[s] ? { ...l, colorKey: x.full[s] } : l }),
      bottom: recolor(p.bottom, 'bottom'),
      shoes: recolor(p.shoes, 'shoes'),
      tie: recolor(p.tie, 'tie'),
      // 잠근 모자·머플러도 같이 넘겨야 결과 화면이 카드와 같은 한 벌이 된다 (색은 잠근 색 그대로)
      ...accs,
    }
    trackEvent('catalog_make', { id: x.base.e.c.id, total: x.c.total, kind: x.c.kind, locks: lockedSlots.length, temp })
    try { sessionStorage.setItem('sp_rec_pick', JSON.stringify(payload)) } catch { /* 세션이 막혀 있으면 그냥 빈손으로 간다 */ }
    navigate('/home/build')
  }

  const chip = (on: boolean) => `flex-none h-7 px-3 rounded-full text-[12px] font-semibold border transition-all ${on ? 'bg-warm-900 text-white border-warm-900 dark:bg-warm-100 dark:text-warm-900 dark:border-warm-100' : 'bg-white dark:bg-warm-800 border-warm-300 dark:border-warm-600 text-warm-600 dark:text-warm-300'}`
  const dots = (x: Card, big?: boolean) => LOCK_SLOTS.filter(s => x.full[s]).map(s => (
    <span key={s} className="relative flex-none" title={getColorName(x.full[s]!)}>
      <i className={`block rounded-full border border-black/10 ${big ? 'w-5 h-5' : 'w-3.5 h-3.5'}`} style={{ background: COLORS_60[x.full[s]!]?.hex }} />
      {locks[s] === x.full[s] && <i className="absolute -top-1 -right-1 text-[8px] leading-none not-italic">📌</i>}
    </span>
  ))

  return (
    <div className="animate-screen-fade px-5 pt-3 pb-8">
      <div className="text-[12px] text-warm-500 leading-snug mb-2">{t('catalog.hint')}</div>

      {/* 상황 */}
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] -mx-5 px-5 mb-2">
        {SITU.map(s => <button key={s.id} onClick={() => setParams({ situ: s.id })} className={chip(situ === s.id)}>{t('outfit.situ.' + s.id)}</button>)}
      </div>

      {/* 기온 — 옷 모양이 여기를 따른다. 날씨가 있으면 [지금 t°] 가 기본 */}
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] -mx-5 px-5 mb-2">
        {now != null && (
          <button onClick={() => { setParams({ temp: null }); trackEvent('catalog_temp', { t: now, src: 'weather' }) }} className={chip(selTemp === 'now')}>{t('catalog.tempNow', { t: now })}</button>
        )}
        {TEMP_STEPS.map(x => (
          <button key={x} onClick={() => { setParams({ temp: x }); trackEvent('catalog_temp', { t: x, src: 'chip' }) }} className={chip(selTemp === x)}>{t('catalog.tempStep', { t: x })}</button>
        ))}
      </div>

      {/* 자물쇠 줄 — 자리마다 색 하나를 못 박는다 (모자·머플러는 잠가야 입는다) */}
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] -mx-5 px-5">
        {LOCK_SLOTS.map(s => (
          <button key={s} onClick={() => { setSheet(s); setTab(COLOR_TABS[0].id) }} className={`flex-none w-[72px] rounded-2xl border p-2 flex flex-col items-center gap-1 active:scale-[0.97] transition-all ${locks[s] ? 'border-warm-900 dark:border-warm-100 bg-white dark:bg-warm-800' : 'border-warm-300 dark:border-warm-600 bg-warm-50 dark:bg-warm-800/50'}`}>
            <span className="relative w-7 h-7 rounded-full border-2 border-white flex items-center justify-center" style={{ background: locks[s] ? COLORS_60[locks[s]!]?.hex : 'repeating-linear-gradient(45deg, #E7E5E4 0 4px, #FAFAF9 4px 8px)', boxShadow: '0 0 0 1px rgba(28,25,23,.15)' }}>
              {locks[s] && <Pin size={11} className={COLORS_60[locks[s]!]?.hcl[2] > 60 ? 'text-warm-900' : 'text-white'} />}
            </span>
            <span className="text-[10.5px] font-bold text-warm-900 dark:text-warm-100 leading-none">{t('builder.slot.' + s)}</span>
            <span className="text-[9.5px] text-warm-500 leading-none truncate max-w-full">{locks[s] ? getColorName(locks[s]!) : t(ACC_SLOTS.includes(s as typeof ACC_SLOTS[number]) ? 'catalog.none' : 'catalog.any')}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 mb-2 flex items-center gap-2">
        <span className="text-[13px] font-bold text-warm-900 dark:text-warm-100">
          {lockedSlots.length ? t('catalog.count', { n: cards.length }) : t('catalog.countAll', { n: cards.length })}
        </span>
        {!!lockedSlots.length && <button onClick={() => setParams({ lock: {} })} className="ml-auto text-[11.5px] font-semibold text-warm-500 underline underline-offset-2">{t('catalog.unlockAll')}</button>}
      </div>

      {!!locks.scarf && temp >= WARM && <div className="mb-2 text-[11.5px] text-warm-500 leading-snug">{t('catalog.scarfWarm')}</div>}

      {!cards.length && (
        <div className="rounded-2xl border border-warm-300 dark:border-warm-600 bg-warm-50 dark:bg-warm-800/50 p-4 text-[12.5px] text-warm-600 dark:text-warm-400 leading-snug">
          {t(locks.outer ? 'catalog.noOuterWarm' : 'catalog.noneFound')}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {cards.map((x, i) => (
          <button key={i} onClick={() => { setOpen(x); trackEvent('catalog_card_open', { idx: i, total: x.c.total, kind: x.c.kind }) }} className="bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl p-2 shadow-warm-sm active:scale-[0.98] transition-all flex flex-col items-center">
            <CharacterCanvas {...sceneOf(x)} width={116} style={{ contentVisibility: 'auto' } as React.CSSProperties} />
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[13px] font-extrabold tabular-nums text-warm-900 dark:text-warm-100">{x.c.total}{t('builder.pt')}</span>
              <span className="text-[10px] text-warm-500 truncate">{t('builder.combos.kind.' + x.c.kind)}</span>
            </div>
            <div className="flex items-center gap-1 mt-1">{dots(x)}</div>
            {x.hard && <span className="mt-1 text-[10px] text-warm-500 leading-snug">{t('catalog.hard')}</span>}
          </button>
        ))}
      </div>

      <div className="mt-3 text-[11px] text-warm-500 leading-snug">{t('catalog.weatherNote', { t: temp })}</div>

      {/* 색 고르기 시트 */}
      {sheet && (
        <div className="fixed inset-0 bg-black/40 z-[300] flex items-end justify-center" onClick={() => setSheet(null)}>
          <div className="w-full max-w-[480px] max-h-[76vh] overflow-y-auto bg-white dark:bg-warm-800 rounded-t-3xl p-4 pb-8 animate-screen-enter" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[14px] font-extrabold text-warm-900 dark:text-warm-100">{t('builder.slot.' + sheet)}</span>
              <button onClick={() => setSheet(null)} className="ml-auto w-8 h-8 rounded-full bg-warm-100 dark:bg-warm-800 flex items-center justify-center"><X size={15} /></button>
            </div>
            <button onClick={() => lock(sheet, null)} className="w-full h-10 mb-2 rounded-2xl border border-warm-300 dark:border-warm-600 text-[13px] font-semibold text-warm-700 dark:text-warm-300 active:scale-[0.98]">{t('catalog.unlock')}</button>
            <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] -mx-4 px-4 mb-2">
              {COLOR_TABS.map(x => <button key={x.id} onClick={() => setTab(x.id)} className={chip(tab === x.id)}>{x.label}</button>)}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(COLOR_TABS.find(x => x.id === tab)?.keys || []).map(k => (
                <button key={k} onClick={() => lock(sheet, k)} className="w-[54px] flex-none flex flex-col items-center gap-1 active:scale-95 transition-transform">
                  <span className="w-9 h-9 rounded-full border-2 border-white" style={{ background: COLORS_60[k]?.hex, boxShadow: locks[sheet] === k ? '0 0 0 2px #1C1917' : '0 0 0 1px rgba(28,25,23,.15)' }} />
                  <span className="text-[10px] leading-none max-w-[54px] truncate text-warm-500">{getColorName(k)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 카드 펼쳐 보기 */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-[300] flex items-end justify-center" onClick={() => setOpen(null)}>
          <div className="w-full max-w-[480px] max-h-[86vh] overflow-y-auto bg-white dark:bg-warm-800 rounded-t-3xl p-4 pb-8 animate-screen-enter" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <CharacterCanvas {...sceneOf(open)} width={140} />
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[22px] font-extrabold tabular-nums text-warm-900 dark:text-warm-100">{open.c.total}</span>
                  <span className="text-[12px] text-warm-500">{t('builder.combos.kind.' + open.c.kind)}</span>
                  <button onClick={() => setOpen(null)} className="ml-auto w-8 h-8 rounded-full bg-warm-100 dark:bg-warm-800 flex items-center justify-center"><X size={15} /></button>
                </div>
                {open.c.why && <div className="text-[12px] text-warm-600 dark:text-warm-400 leading-snug mt-1">{open.c.why}</div>}
                {open.hard && <div className="text-[11.5px] text-warm-500 leading-snug mt-1">{t('catalog.hard')}</div>}
                <div className="flex items-center gap-1.5 mt-2">{dots(open, true)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-3">
              {/* 이미 잠근 자리는 뺀다 — 모자·머플러는 잠가야만 있으니 여기 안 뜬다 */}
              {LOCK_SLOTS.filter(s => open.full[s] && locks[s] !== open.full[s]).map(s => (
                <button key={s} onClick={() => lock(s, open.full[s]!)} className="h-10 rounded-2xl border border-warm-300 dark:border-warm-600 text-[12px] font-semibold text-warm-700 dark:text-warm-300 flex items-center justify-center gap-1.5 active:scale-[0.98]">
                  <i className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ background: COLORS_60[open.full[s]!]?.hex }} />
                  {t('catalog.lockThis', { slot: t('builder.slot.' + s) })}
                </button>
              ))}
            </div>
            <button onClick={() => make(open)} className="w-full h-12 mt-3 rounded-2xl bg-terra-500 text-white font-bold text-[14px] flex items-center justify-center gap-1.5 active:scale-[0.98] shadow-terra">
              {t('catalog.make')} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
