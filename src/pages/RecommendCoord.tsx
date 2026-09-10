import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, RotateCcw, X, Check, ChevronDown, ChevronUp } from 'lucide-react'
import CharacterCanvas from '@/components/mannequin/CharacterCanvas'
import { COLORS_60, COLOR_TABS, getColorName } from '@/lib/colors'
import { MOOD_GROUPS, STYLE_ICONS } from '@/lib/styles'
import { charSex, DEFAULT_HAIR, DEFAULT_HAIR_COLOR, DEFAULT_BOTTOM, DEFAULT_SHOE, DEFAULT_SCARF, DEFAULT_HAT, type CharScene } from '@/lib/char/map'
import { typesFor, HAT_NAMES } from '@/lib/builderSlots'
import { PLATE_TO_ITEM, plateName as plateNameOf } from '@/lib/outfits'
import { useRecommend, type ComboResult } from '@/hooks/useRecommend'
import { trackEvent } from '@/lib/analytics'

// ═══════════════════════════════════════════════════════
// 코디 추천받기 — 새 디자인 (만들기 2단계와 같은 언어: 캐릭터 · 칩 · 이름 달린 색)
// 1) 느낌·스타일 한 화면  2) 꼭 입을 옷(판)  3) 색 조합 카드 30벌
// 카드를 누르면 만들기 2단계(캐릭터 + 레일)로 그대로 입혀 보낸다 — 색 바꾸기·카드·투표는 거기서.
// 추천 엔진(getDynamicCombos)과 세션 캐시는 그대로, 판(plate) 상태만 얹었다.
// ═══════════════════════════════════════════════════════

type Slot = 'outer' | 'middleware' | 'top' | 'bottom' | 'shoes' | 'scarf' | 'hat'
const SLOTS: { id: Slot; optional: boolean }[] = [
  { id: 'outer', optional: true }, { id: 'middleware', optional: true }, { id: 'top', optional: false },
  { id: 'bottom', optional: false }, { id: 'shoes', optional: false }, { id: 'scarf', optional: true }, { id: 'hat', optional: true },
]
const DEFAULT_TOP = '11_knit_crew'
const OUTER_BY_TYPE: Record<string, string> = { coat: '17_coat_long', jacket: '18_jacket_short', padding: '29_puffer' }
const MID_BY_TYPE: Record<string, string> = { cardigan: '15_cardigan', vest: '14_knit_vest', knit: '14_knit_vest' }
/** 1단계처럼 색 없는 중립색 — 옷 고르기 화면의 캐릭터 */
const NEU: Record<Slot, string> = { outer: '#9A948C', middleware: '#C4BDB3', top: '#ECE7DF', bottom: '#4B4844', shoes: '#2A2825', scarf: '#B8AFA4', hat: '#6E6862' }

const plateName = (id: string) => HAT_NAMES[id] ? HAT_NAMES[id][(navigator.language || 'ko').startsWith('ko') ? 'ko' : 'en'] : plateNameOf(id)

/** 판 + 자리별 색 → 장면 */
function sceneOf(plates: Record<string, string>, hex: Partial<Record<Slot, string>>, types: { outerType: string; midType: string }, sex: 'm' | 'w'): CharScene {
  const items: CharScene['items'] = []
  if (hex.outer) items.push({ id: plates.outer || OUTER_BY_TYPE[types.outerType] || '17_coat_long', color: hex.outer })
  if (hex.middleware) items.push({ id: plates.middleware || MID_BY_TYPE[types.midType] || '15_cardigan', color: hex.middleware })
  if (hex.top) items.push({ id: plates.top || DEFAULT_TOP, color: hex.top })
  items.push({ id: plates.bottom || DEFAULT_BOTTOM, color: hex.bottom || NEU.bottom })
  items.push({ id: plates.shoes || DEFAULT_SHOE, color: hex.shoes || NEU.shoes })
  if (hex.scarf) items.push({ id: plates.scarf || DEFAULT_SCARF, color: hex.scarf })
  const body: CharScene['body'] = { sex, hair: DEFAULT_HAIR[sex], hairColor: DEFAULT_HAIR_COLOR }
  if (hex.hat) { body.hat = plates.hat || DEFAULT_HAT; body.hatColor = hex.hat }
  return { items, body }
}

export default function RecommendCoord() {
  const rec = useRecommend()
  const step = rec.step === 'detail' ? 'results' : rec.step
  return (
    <div className="animate-screen-fade">
      {(step === 'mood' || step === 'style') && <StepMood rec={rec} />}
      {step === 'pick' && <StepPick rec={rec} />}
      {step === 'results' && <StepResults rec={rec} />}
    </div>
  )
}

type RecHook = ReturnType<typeof useRecommend>

const Head = ({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) => {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2 px-3 pt-2 pb-1">
      {onBack && <button onClick={onBack} aria-label={t('common.back')} className="w-9 h-9 rounded-full bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 flex items-center justify-center active:scale-90"><ArrowLeft size={16} /></button>}
      <div className="flex-1 font-display text-[17px] font-bold text-warm-900 dark:text-warm-100 truncate">{title}</div>
      {right}
    </div>
  )
}
const chipCls = (on: boolean) => `h-8 px-3 rounded-full text-[12.5px] font-semibold whitespace-nowrap border transition-all active:scale-95 ${on ? 'bg-warm-900 text-white border-warm-900 dark:bg-warm-100 dark:text-warm-900 dark:border-warm-100' : 'bg-white dark:bg-warm-800 border-warm-300 dark:border-warm-600 text-warm-700 dark:text-warm-300'}`

// ═══════════════════════════════════════
// 1. 느낌 → 스타일 (한 화면)
// ═══════════════════════════════════════
function StepMood({ rec }: { rec: RecHook }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const mood = rec.state.mood
  const group = mood ? MOOD_GROUPS[mood] : null
  return (
    <div className="pb-8">
      <Head title={t('recommend.v2Title')} onBack={() => navigate('/home')} />
      <div className="px-4 text-[11.5px] text-warm-500 dark:text-warm-400">{t('recommend.v2Hint')}</div>

      <div className="px-4 mt-3 grid grid-cols-3 gap-2">
        {Object.entries(MOOD_GROUPS).map(([key, g]) => {
          const on = mood === key
          return (
            <button key={key} onClick={() => { rec.update({ mood: key, style: null }); trackEvent('rec_mood', { mood: key }) }}
              className={`rounded-2xl border px-2 py-3 flex flex-col items-center gap-1 transition-all active:scale-[0.97] ${on ? 'bg-white dark:bg-warm-800 border-warm-900 dark:border-warm-100 shadow-warm' : 'bg-white dark:bg-warm-800 border-warm-300 dark:border-warm-600'}`}>
              <span className="text-[22px] leading-none">{g.icon}</span>
              <span className={`text-[12px] font-bold ${on ? 'text-warm-900 dark:text-warm-100' : 'text-warm-700 dark:text-warm-300'}`}>{t('styles:moodGroups.' + key + '.name')}</span>
            </button>
          )
        })}
      </div>

      {group && (
        <div className="px-4 mt-4 animate-screen-fade">
          <div className="text-[11px] font-bold text-warm-500 dark:text-warm-400 mb-1.5">{group.icon} {t('styles:moodGroups.' + mood + '.name')} · {t('recommend.styleTitle')}</div>
          <div className="flex flex-col gap-1.5">
            {group.styles.map((s: string) => (
              <button key={s} onClick={() => { rec.selectStyle(s); trackEvent('rec_style', { style: s }) }}
                className="w-full flex items-center gap-2.5 bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl px-3.5 py-2.5 text-left active:scale-[0.98] transition-all">
                <span className="text-[18px]">{(STYLE_ICONS as any)?.[s] || '🎨'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-bold text-warm-900 dark:text-warm-100">{t('styles:guide.' + s + '.name')}</div>
                  <div className="text-[11px] text-warm-500 truncate">{t('styles:guide.' + s + '.subtitle')}</div>
                </div>
                <ArrowRight size={15} className="text-warm-400" />
              </button>
            ))}
            <button onClick={() => rec.selectStyle(null)} className="w-full py-2.5 rounded-2xl border border-dashed border-warm-400 text-[12.5px] font-semibold text-warm-600 dark:text-warm-300 active:scale-[0.98]">{t('recommend.allRecommend')}</button>
          </div>
        </div>
      )}

      <div className="px-4 mt-4">
        <button onClick={() => { rec.selectMood(null); trackEvent('rec_mood', { mood: null }) }} className="w-full rounded-2xl bg-warm-100 dark:bg-warm-800 border border-warm-300 dark:border-warm-600 px-4 py-3 flex items-center justify-between active:scale-[0.98]">
          <span className="text-[13px] font-bold text-warm-800 dark:text-warm-200">{t('recommend.v2All')}</span>
          <span className="text-[11px] text-warm-500">{t('recommend.v2AllHint')}</span>
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// 2. 꼭 입을 옷 (판 고르기)
// ═══════════════════════════════════════
function StepPick({ rec }: { rec: RecHook }) {
  const { t } = useTranslation()
  const sex = charSex()
  const plates = rec.state.plates
  const shown = (slot: Slot) => plates[slot] || (slot === 'top' ? DEFAULT_TOP : slot === 'bottom' ? DEFAULT_BOTTOM : slot === 'shoes' ? DEFAULT_SHOE : null)
  const scene = useMemo(() => {
    const hex: Partial<Record<Slot, string>> = { top: NEU.top, bottom: NEU.bottom, shoes: NEU.shoes }
    if (plates.outer) hex.outer = NEU.outer
    if (plates.middleware) hex.middleware = NEU.middleware
    if (plates.scarf) hex.scarf = NEU.scarf
    if (plates.hat) hex.hat = NEU.hat
    return sceneOf(plates, hex, rec.state, sex)
  }, [plates, sex])
  const picked = SLOTS.filter(s => plates[s.id]).length

  return (
    <div className="pb-24">
      <Head title={t('recommend.pickTitle')} onBack={rec.goBack} right={rec.state.style ? <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-warm-200 dark:bg-warm-700 text-warm-700 dark:text-warm-200">{(STYLE_ICONS as any)?.[rec.state.style] || ''} {t('styles:guide.' + rec.state.style + '.name')}</span> : null} />
      <div className="px-4 text-[11.5px] text-warm-500 dark:text-warm-400 flex items-center gap-2">
        {t('recommend.pickHint')}
        {rec.state.weatherLayerLocked && <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">{t('recommend.weatherLock')}</span>}
      </div>

      {/* 무대 (높이 고정) */}
      <div className="relative flex items-end justify-center overflow-hidden" style={{ height: 220 }}>
        <div className="absolute left-1/2 bottom-2 -translate-x-1/2 w-24 h-3 rounded-full" style={{ background: 'radial-gradient(ellipse at center, rgba(28,25,23,.16), rgba(28,25,23,0) 70%)' }} />
        <CharacterCanvas {...scene} width={150} />
      </div>

      {/* 자리별 옷 종류 */}
      <div className="bg-white dark:bg-warm-800 border-t border-warm-300 dark:border-warm-700 pt-2">
        {SLOTS.map(s => {
          const cur = shown(s.id)
          const types = typesFor(s.id, sex)
          return (
            <div key={s.id} className="py-1.5">
              <div className="px-4 flex items-baseline gap-1.5">
                <span className="text-[12px] font-bold text-warm-900 dark:text-warm-100">{t('builder.slot.' + s.id)}</span>
                <span className="text-[10.5px] text-warm-500 truncate">{cur ? plateName(cur) : t('recommend.pickNone')}</span>
              </div>
              <div className="mt-1 px-4 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
                {s.optional && <button onClick={() => rec.setPlate(s.id, null)} className={`flex-none ${chipCls(!plates[s.id])} border-dashed`}>{t('recommend.pickNone')}</button>}
                {types.map(id => <button key={id} onClick={() => { rec.setPlate(s.id, id); trackEvent('rec_plate', { slot: s.id, plate: id }) }} className={`flex-none ${chipCls(cur === id)}`}>{plateName(id)}</button>)}
              </div>
            </div>
          )
        })}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white/95 dark:bg-[#1C1917]/95 backdrop-blur-xl border-t border-warm-300 dark:border-warm-700 px-4 py-2.5 z-50" style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}>
        <button onClick={() => { trackEvent('rec_generate', { n_plates: picked, style: rec.state.style, layer: rec.state.layerType }); rec.generateFromPick() }} className="w-full h-11 rounded-full bg-terra-500 text-white font-bold text-[14px] flex items-center justify-center gap-1.5 active:scale-[0.98] shadow-terra">
          {picked ? t('recommend.pickCta') : t('recommend.pickCtaAll')} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// 3. 색 조합 카드
// ═══════════════════════════════════════
function StepResults({ rec }: { rec: RecHook }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const sex = charSex()
  const s = rec.state
  const results = s.results
  const [all, setAll] = useState(false)
  const [pinSlot, setPinSlot] = useState<string | null>(null)
  const [tab, setTab] = useState<string>(COLOR_TABS[0].id)
  const partKeys: string[] = useMemo(() => {
    const keys = Object.keys(results[0]?.outfit || { top: 1, bottom: 1, shoes: 1 })
    return (['outer', 'middleware', 'top', 'bottom', 'shoes', 'scarf', 'hat'] as string[]).filter(k => keys.includes(k))
  }, [results])
  const pinned = s.pinned || {}
  const garmentChips = SLOTS.filter(x => s.plates[x.id]).map(x => plateName(s.plates[x.id]))

  const hexOf = (o: Record<string, string>): Partial<Record<Slot, string>> => {
    const h: Partial<Record<Slot, string>> = {}
    for (const k of Object.keys(o)) { const c = COLORS_60[o[k]]; if (c) (h as any)[k] = c.hex }
    return h
  }

  // 카드 → 만들기 2단계로 입혀 보내기
  const tryOn = (combo: ComboResult, idx: number) => {
    const o = combo.outfit
    const plate = (slot: Slot, fallback: string) => s.plates[slot] || fallback
    const layers: { itemId: string; plate: string; colorKey: string }[] = []
    if (o.outer) { const p = plate('outer', OUTER_BY_TYPE[s.outerType] || '17_coat_long'); layers.push({ itemId: PLATE_TO_ITEM[p] || 'coat', plate: p, colorKey: o.outer }) }
    if (o.middleware) { const p = plate('middleware', MID_BY_TYPE[s.midType] || '15_cardigan'); layers.push({ itemId: PLATE_TO_ITEM[p] || 'cardigan', plate: p, colorKey: o.middleware }) }
    if (o.top) { const p = plate('top', DEFAULT_TOP); layers.push({ itemId: PLATE_TO_ITEM[p] || 'knit', plate: p, colorKey: o.top }) }
    const pick = {
      layers,
      bottom: { plate: plate('bottom', DEFAULT_BOTTOM), colorKey: o.bottom || 'charcoal' },
      shoes: { plate: plate('shoes', DEFAULT_SHOE), colorKey: o.shoes || 'black' },
      scarf: o.scarf ? { plate: plate('scarf', DEFAULT_SCARF), colorKey: o.scarf } : null,
      hat: o.hat ? { plate: plate('hat', DEFAULT_HAT), colorKey: o.hat } : null,
      style: s.style || combo.style || null,
    }
    try { sessionStorage.setItem('sp_rec_pick', JSON.stringify(pick)) } catch {}
    trackEvent('rec_tryon', { idx, score: combo.score, style: s.style, layer: s.layerType })
    navigate('/home/build')
  }

  const list = all ? results : results.slice(0, 10)
  const tabKeys = COLOR_TABS.find(x => x.id === tab)?.keys || []

  return (
    <div className="pb-10">
      <Head title={`${t('recommend.resTitle')} ${results.length}`} onBack={rec.goBack}
        right={<button onClick={() => { rec.regenerate(); trackEvent('rec_shuffle', {}) }} className="h-8 px-3 rounded-full bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-[12px] font-semibold text-warm-700 dark:text-warm-300 flex items-center gap-1 active:scale-95"><RotateCcw size={13} /> {t('recommend.shuffle')}</button>} />
      <div className="px-4 text-[11.5px] text-warm-500 dark:text-warm-400">{t('recommend.resHint')}</div>

      {/* 조건 칩 */}
      <div className="px-4 mt-2.5 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
        {s.style && <span className="flex-none h-7 px-2.5 rounded-full bg-warm-900 text-white dark:bg-warm-100 dark:text-warm-900 text-[11px] font-bold flex items-center gap-1">{(STYLE_ICONS as any)?.[s.style] || ''} {t('styles:guide.' + s.style + '.name')}</span>}
        {garmentChips.map(g => <span key={g} className="flex-none h-7 px-2.5 rounded-full bg-warm-200 dark:bg-warm-700 text-warm-800 dark:text-warm-200 text-[11px] font-semibold flex items-center">{g}</span>)}
        {Object.entries(pinned).map(([part, key]) => COLORS_60[key] ? (
          <button key={part} onClick={() => rec.clearPin(part)} className="flex-none h-7 pl-1.5 pr-2 rounded-full bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-[11px] font-semibold text-warm-800 dark:text-warm-200 flex items-center gap-1">
            <i className="w-4 h-4 rounded-full border border-black/10" style={{ background: COLORS_60[key].hex }} />{t('builder.slot.' + part)} {getColorName(key)} <X size={10} />
          </button>) : null)}
        <button onClick={() => setPinSlot(pinSlot ? null : partKeys[0])} className={`flex-none h-7 px-2.5 rounded-full border border-dashed text-[11px] font-semibold ${pinSlot ? 'bg-warm-900 text-white border-warm-900' : 'border-warm-400 text-warm-600 dark:text-warm-300'}`}>{t('recommend.pinBtn')}</button>
      </div>

      {/* 색 고정 서랍 */}
      {pinSlot && (
        <div className="mx-4 mt-2 bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl py-2.5 animate-screen-fade">
          <div className="px-3 flex items-center gap-2">
            <span className="text-[12px] font-bold text-warm-900 dark:text-warm-100">{t('recommend.pinTitle')}</span>
            <button onClick={() => setPinSlot(null)} className="ml-auto text-[11px] font-semibold text-warm-500 px-2 py-0.5">{t('recommend.pinDone')}</button>
          </div>
          <div className="mt-1.5 px-3 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {partKeys.map(k => <button key={k} onClick={() => setPinSlot(k)} className={`flex-none h-7 px-2.5 rounded-full text-[11px] font-semibold flex items-center gap-1 ${pinSlot === k ? 'bg-warm-900 text-white dark:bg-warm-100 dark:text-warm-900' : 'bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-300'}`}>{pinned[k] && <i className="w-2 h-2 rounded-full border border-white/60" style={{ background: COLORS_60[pinned[k]]?.hex }} />}{t('builder.slot.' + k)}</button>)}
          </div>
          <div className="mt-2.5 px-3 flex gap-3.5 overflow-x-auto [scrollbar-width:none]">
            {COLOR_TABS.map(x => <button key={x.id} onClick={() => setTab(x.id)} className={`flex-none text-[12px] font-semibold pb-0.5 border-b-2 whitespace-nowrap ${tab === x.id ? 'text-warm-900 dark:text-warm-100 border-warm-900 dark:border-warm-100' : 'text-warm-500 border-transparent'}`}>{x.label}</button>)}
          </div>
          <div className="mt-2 px-2 overflow-x-auto [scrollbar-width:none]">
            <div className="grid grid-flow-col gap-1.5" style={{ gridTemplateRows: 'repeat(2, 56px)', gridAutoColumns: '54px' }}>
              {tabKeys.map(k => {
                const c = COLORS_60[k]; if (!c) return null
                const on = pinned[pinSlot] === k
                return (
                  <button key={k} onClick={() => { rec.togglePin(pinSlot, k); trackEvent('rec_pin', { slot: pinSlot, color: k, on: !on }) }} className="w-[54px] flex flex-col items-center gap-1 active:scale-95 transition-transform">
                    <span className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center" style={{ background: c.hex, boxShadow: on ? '0 0 0 2px #1C1917' : '0 0 0 1px rgba(28,25,23,.15)' }}>{on && <Check size={14} className={c.hcl[2] > 60 ? 'text-warm-900' : 'text-white'} />}</span>
                    <span className={`text-[10px] leading-none max-w-[54px] truncate ${on ? 'font-semibold text-warm-900 dark:text-warm-100' : 'text-warm-500'}`}>{getColorName(k)}</span>
                  </button>
                )
              })}
            </div>
          </div>
          {pinned[pinSlot] && <div className="px-3 mt-1"><button onClick={() => rec.clearPin(pinSlot)} className="text-[11px] font-semibold text-warm-500">{t('recommend.pinClear')}</button></div>}
        </div>
      )}

      {/* 카드 */}
      <div className="px-4 mt-3 flex flex-col gap-2">
        {list.map((combo, idx) => {
          const o = combo.outfit
          const keys = partKeys.filter(k => o[k] && COLORS_60[o[k]])
          return (
            <button key={(combo as any).id || idx} onClick={() => tryOn(combo, idx)} className="w-full flex items-center gap-3 bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl p-2.5 text-left active:scale-[0.98] transition-all">
              <div className="flex-none w-[64px] flex justify-center"><CharacterCanvas {...sceneOf(s.plates, hexOf(o), s, sex)} width={60} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[20px] font-extrabold text-warm-900 dark:text-warm-100 tabular-nums leading-none">{combo.score}</span><span className="text-[11px] text-warm-500">{t('builder.pt')}</span>
                  {combo.tags?.[0] && <span className="ml-1 text-[10.5px] font-semibold text-warm-600 dark:text-warm-300 truncate">{combo.tags[0]}</span>}
                </div>
                <div className="mt-1.5 flex gap-1.5 overflow-hidden">
                  {keys.slice(0, 5).map(k => (
                    <span key={k} className="flex flex-col items-center gap-0.5 w-[44px]">
                      <i className="w-6 h-6 rounded-full border border-black/10" style={{ background: COLORS_60[o[k]].hex }} />
                      <span className="text-[9.5px] text-warm-500 leading-none max-w-[44px] truncate">{getColorName(o[k])}</span>
                    </span>
                  ))}
                </div>
              </div>
              <span className="flex-none text-[11px] font-bold text-terra-600 flex items-center gap-0.5">{t('recommend.tryOn')} <ArrowRight size={12} /></span>
            </button>
          )
        })}
        {results.length === 0 && (
          <div className="text-center py-16"><div className="text-3xl mb-3">🤔</div><div className="text-sm text-warm-600 dark:text-warm-400">{t('recommend.noResults')}</div></div>
        )}
        {results.length > 10 && (
          <button onClick={() => setAll(!all)} className="w-full py-2.5 text-[12.5px] font-semibold text-warm-600 dark:text-warm-300 flex items-center justify-center gap-1">
            {all ? <><ChevronUp size={14} /> {t('recommend.less')}</> : <><ChevronDown size={14} /> {t('recommend.more', { n: results.length - 10 })}</>}
          </button>
        )}
      </div>
    </div>
  )
}
