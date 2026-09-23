import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Pin, X } from 'lucide-react'
import CharacterCanvas from '@/components/mannequin/CharacterCanvas'
import SexToggle from '@/components/ui/SexToggle'
import { COLORS_60, COLOR_TABS, getColorName } from '@/lib/colors'
import { charSceneFromState } from '@/lib/char/map'
import { useCharSex } from '@/hooks/useCharSex'
import { uiSlotOf, typesFor } from '@/lib/builderSlots'
import { PARTS, SITU, TEMPLATES, partsOf, plateName, scoreOf, loadPrefs, loadRecent, defaultSitu, type Ctx, type Entry, type Situ } from '@/lib/outfits'
import { pickPayload } from '@/lib/pickPayload'
import { initialState, outfitToState, engineInputOf, type BuildState } from '@/hooks/useBuild'
import { catalogFor, scoreOutfit, type ComboCard, type EngineInput } from '@/lib/engine'
import { trackEvent } from '@/lib/analytics'

// ═══════════════════════════════════════════════════════
// 코디 카탈로그 — 고른 조합 한 벌의 색을 펼친다
// 조합 목록에서 "완성된 코디 카탈로그 보기"로 들어온다(?tpl=조합id). 옷 모양은 그 조합
// 그대로 두고 색만 바꿔 가며 늘어놓으며, 자리별 색을 못 박을수록 목록이 좁혀진다.
// 점수는 만들기와 같은 길(outfitToState → engineInputOf → engine)로 매기므로
// [이대로 만들기] 를 눌러 넘어간 결과 화면 점수가 카드 총점과 정확히 같다.
// 무작위는 없다 — 같은 조합·같은 고정이면 언제나 같은 목록이 나온다.
// ═══════════════════════════════════════════════════════

/** 자물쇠를 걸 수 있는 조합 자리 — 그 조합에 실제로 있는 것만 칩으로 뜬다 */
const COMBO_SLOTS = ['outer', 'middleware', 'top', 'bottom', 'shoes'] as const
/** 잠가야만 생기는 자리 — 자물쇠를 풀면 코디에서 사라진다 */
const ACC_SLOTS = ['hat', 'scarf'] as const
const LOCK_SLOTS = [...COMBO_SLOTS, ...ACC_SLOTS]
type LockSlot = typeof LOCK_SLOTS[number]

/** 한 번에 보여 주는 장수 — 더보기로 이만큼씩 늘어난다 */
const PAGE = 24
const MIN_CARDS = 6
const SAME_MAIN_MAX = 4
const OK_SCORE = 60
/** 바탕이 한 벌뿐이라 후보를 두 겹으로 펼친다 (engine.catalogFor) */
const DEPTH = 2
const N = 200
/** 조합 점수(Entry.s)는 카탈로그가 안 쓴다 — ctx 를 채우려고 한 번 매길 뿐 */
const CTX_TEMP = 21
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
/** 이 카드의 주색 — 못 박은 색은 빼고 본다 (카드마다 같으니 세면 전부 걸린다) */
const mainOf = (x: Card, locks: Locks) => LOCK_SLOTS.filter(s => !locks[s]).map(s => x.full[s]).find(Boolean) || ''

interface Base { e: Entry; state: BuildState; input: EngineInput }
interface Card { c: ComboCard; full: Record<string, string>; hard: boolean }

export default function ColorCatalog() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [sex, setSex] = useCharSex()
  const [sp, setSp] = useSearchParams()
  const [sheet, setSheet] = useState<LockSlot | null>(null)
  const [open, setOpen] = useState<Card | null>(null)
  const [tab, setTab] = useState(COLOR_TABS[0].id)
  const [shown, setShown] = useState(PAGE)

  const tplId = sp.get('tpl')
  const tpl = useMemo(() => TEMPLATES.find(c => c.id === tplId) || null, [tplId])
  const situ = (SITU.find(s => s.id === sp.get('situ'))?.id ?? defaultSitu()) as Situ
  const lockRaw = sp.get('lock')
  const asked = useMemo(() => parseLocks(lockRaw), [lockRaw])

  // 잠근 모자·머플러는 조합에 얹어서 입힌다 (안 잠갔으면 null — 조합에 원래 없다)
  const accs = useMemo(() => ({
    hat: asked.hat ? { plate: typesFor('hat', sex)[0], colorKey: asked.hat } : null,
    scarf: asked.scarf ? { plate: typesFor('scarf', sex)[0], colorKey: asked.scarf } : null,
  }), [asked.hat, asked.scarf, sex])

  // ── 바탕은 유저가 고른 조합 한 벌. 카탈로그는 그 한 벌의 색만 펼친다 ──
  const base = useMemo<Base | null>(() => {
    if (!tpl) return null
    const p = partsOf(tpl, sex)
    const ctx: Ctx = { sex, situ, temp: CTX_TEMP, prefs: loadPrefs(), recent: loadRecent() }
    const e: Entry = { c: tpl, p, s: scoreOf(tpl, p, ctx) }
    const state = outfitToState(initialState('coord'), { ...pickPayload(e, situ, 'result'), ...accs })
    return { e, state, input: engineInputOf(state) }
  }, [tpl, sex, situ, accs])

  // 자물쇠 줄 = 이 조합에 있는 자리 + 모자·머플러. 조합에 없는 자리의 자물쇠는 버린다
  const lockSlots = useMemo(() => [...COMBO_SLOTS.filter(s => base?.input.outfit[s]), ...ACC_SLOTS] as LockSlot[], [base])
  const locks = useMemo(() => Object.fromEntries(lockSlots.filter(s => asked[s]).map(s => [s, asked[s]!])) as Locks, [lockSlots, asked])
  const lockedSlots = useMemo(() => lockSlots.filter(s => locks[s]), [lockSlots, locks])
  const lockKey = useMemo(() => formatLocks(locks), [locks])

  // ── 카드: 자물쇠 밖의 자리를 카탈로그로 펼쳐 줄 세운다 ──
  const cards = useMemo<Card[]>(() => {
    if (!base) return []
    const input = { ...base.input, outfit: { ...base.input.outfit, ...locks } }
    const list = catalogFor(input, new Set<string>(lockedSlots), N, DEPTH)
    // 고를 자리가 하나도 안 남았으면(자리를 다 박았다) 못 박은 그 한 벌이 답이다
    if (!list.length) {
      const r = scoreOutfit(input)
      list.push({ outfit: {}, total: r.total, rawTotal: r.raw?.total ?? r.total, why: (r.reasons.find(x => x.w > 0) || { txt: '' }).txt || '', kind: 'safe', mine: 0 })
    }
    const all: Card[] = list.map(c => ({ c, full: { ...input.outfit, ...c.outfit } as Record<string, string>, hard: false }))
    // 점수 → 원점수(보정 전) → 종류 순. 표시 점수는 92에서 천장을 치니 그 안을 원점수가 가른다
    all.sort((a, b) => b.c.total - a.c.total || rawOf(b.c) - rawOf(a.c) || KINDS.indexOf(a.c.kind) - KINDS.indexOf(b.c.kind))
    const bySig = new Set<string>()
    const mainCount: Record<string, number> = {}
    const kept: Card[] = []
    const spare: Card[] = []
    for (const x of all) {
      const key = Object.keys(x.full).sort().map(s => s + ':' + x.full[s]).join('|')
      if (bySig.has(key)) continue
      bySig.add(key)
      // 한 가지 주색이 첫 장들을 덮지 않게 — 밀린 카드는 버리지 않고 뒤(더보기)로 보낸다.
      // 못 박은 색은 세지 않는다 (카드마다 같으니 세면 전부 걸린다)
      const main = mainOf(x, locks)
      if (kept.length < PAGE && main && (mainCount[main] || 0) >= SAME_MAIN_MAX) { spare.push(x); continue }
      mainCount[main] = (mainCount[main] || 0) + 1
      kept.push(x)
    }
    kept.push(...spare)
    // 60점 미만은 내리되, 너무 적으면 △ 를 달아서라도 보여 준다 (0장은 없다)
    const good = kept.filter(x => x.c.total >= OK_SCORE)
    return (good.length >= MIN_CARDS ? good : kept.slice(0, Math.max(MIN_CARDS, good.length)))
      .map(x => ({ ...x, hard: x.c.total < OK_SCORE }))
  }, [base, lockKey])

  // 조합 없이 들어오면 고를 데가 없다 — 조합 목록으로 되돌린다
  useEffect(() => { if (!tpl) navigate('/home/picks/layered', { replace: true }) }, [tpl])
  useEffect(() => { setShown(PAGE); setOpen(null) }, [lockKey, tplId])
  useEffect(() => { trackEvent('catalog_view', { tpl: tplId, situ, locks: lockedSlots.length, n: cards.length }) }, [lockKey, tplId])

  const setLocks = (next: Locks) => {
    const q: Record<string, string> = { tpl: tplId || '', situ }
    const l = formatLocks(next)
    if (l) q.lock = l
    setSp(q, { replace: true })
  }

  const lock = (slot: LockSlot, key: string | null) => {
    const next = { ...locks }
    if (key) next[slot] = key; else delete next[slot]
    trackEvent(key ? 'catalog_lock' : 'catalog_unlock', { slot, key: key || '' })
    setLocks(next)
    setSheet(null)
  }

  const sceneOf = (x: Card) => charSceneFromState({
    ...base!.state,
    upper: base!.state.upper.map(l => { const s = uiSlotOf(l); return x.full[s] ? { ...l, colorKey: x.full[s] } : l }),
    bottomColor: x.full.bottom || base!.state.bottomColor,
    shoesColor: x.full.shoes || base!.state.shoesColor,
    scarfColor: x.full.scarf || base!.state.scarfColor,
    hatColor: x.full.hat || base!.state.hatColor,
    tieColor: x.full.tie || base!.state.tieColor,
  }, sex)

  // ── [이대로 만들기]: 조합의 판은 그대로, 색만 이 카드 것으로 바꿔 만들기로 넘긴다 ──
  const make = (x: Card) => {
    const p = pickPayload(base!.e, situ, 'result')
    const slotOf = new Map(base!.state.upper.map(l => [l.itemId, uiSlotOf(l)]))
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
    trackEvent('catalog_make', { id: base!.e.c.id, total: x.c.total, kind: x.c.kind, locks: lockedSlots.length })
    try { sessionStorage.setItem('sp_rec_pick', JSON.stringify(payload)) } catch { /* 세션이 막혀 있으면 그냥 빈손으로 간다 */ }
    navigate('/home/build')
  }

  if (!tpl || !base) return null

  const chip = (on: boolean) => `flex-none h-7 px-3 rounded-full text-[12px] font-semibold border transition-all ${on ? 'bg-warm-900 text-white border-warm-900 dark:bg-warm-100 dark:text-warm-900 dark:border-warm-100' : 'bg-white dark:bg-warm-800 border-warm-300 dark:border-warm-600 text-warm-600 dark:text-warm-300'}`
  const dots = (x: Card, big?: boolean) => lockSlots.filter(s => x.full[s]).map(s => (
    <span key={s} className="relative flex-none" title={getColorName(x.full[s]!)}>
      <i className={`block rounded-full border border-black/10 ${big ? 'w-5 h-5' : 'w-3.5 h-3.5'}`} style={{ background: COLORS_60[x.full[s]!]?.hex }} />
      {locks[s] === x.full[s] && <i className="absolute -top-1 -right-1 text-[8px] leading-none not-italic">📌</i>}
    </span>
  ))
  const baseName = PARTS.filter(k => base.e.p[k]).map(k => plateName(base.e.p[k]!)).join(' · ')
  const left = cards.length - shown

  return (
    <div className="animate-screen-fade px-5 pt-3 pb-8">
      {/* 어느 조합을 펼치고 있는지 */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] font-semibold text-warm-500 leading-none">{t('catalog.base')}</div>
          <div className="text-[13px] font-bold text-warm-900 dark:text-warm-100 leading-tight mt-1 truncate">{baseName}</div>
        </div>
        <SexToggle sex={sex} onChange={setSex} screen="catalog" />
        <button onClick={() => navigate(-1)} className="flex-none text-[11.5px] font-semibold text-warm-500 underline underline-offset-2">{t('catalog.changeBase')}</button>
      </div>

      <div className="text-[12px] text-warm-500 leading-snug mb-2">{t('catalog.hint')}</div>

      {/* 자물쇠 줄 — 이 조합의 자리마다 색 하나를 못 박는다 (모자·머플러는 잠가야 입는다) */}
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] -mx-5 px-5">
        {lockSlots.map(s => (
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
          {lockedSlots.length ? t('catalog.count', { n: cards.length }) : t('catalog.countBase', { n: cards.length })}
        </span>
        {!!lockedSlots.length && <button onClick={() => setLocks({})} className="ml-auto text-[11.5px] font-semibold text-warm-500 underline underline-offset-2">{t('catalog.unlockAll')}</button>}
      </div>

      {!cards.length && (
        <div className="rounded-2xl border border-warm-300 dark:border-warm-600 bg-warm-50 dark:bg-warm-800/50 p-4 text-[12.5px] text-warm-600 dark:text-warm-400 leading-snug">
          {t('catalog.noneFound')}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {cards.slice(0, shown).map((x, i) => (
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

      {/* 더보기 — 24장씩 늘린다. 24로 끊지 않는다 */}
      {!!cards.length && (left > 0 ? (
        <button onClick={() => { setShown(shown + PAGE); trackEvent('catalog_more', { shown: shown + PAGE, total: cards.length }) }} className="w-full h-11 mt-3 rounded-2xl border border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-800 text-[13px] font-bold text-warm-800 dark:text-warm-200 active:scale-[0.98]">
          {t('catalog.more', { n: left })}
        </button>
      ) : (
        <div className="mt-3 text-[11.5px] text-warm-500 leading-snug text-center">{t('catalog.end')}</div>
      ))}

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
              {lockSlots.filter(s => open.full[s] && locks[s] !== open.full[s]).map(s => (
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
