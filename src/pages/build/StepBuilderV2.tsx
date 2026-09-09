import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, RotateCcw, X, Check } from 'lucide-react'
import CharacterCanvas from '@/components/mannequin/CharacterCanvas'
import { COLORS_60, COLOR_TABS, getColorName } from '@/lib/colors'
import { charSceneFromState, charSex, setCharSex } from '@/lib/char/map'
import { PLATE_NAMES } from '@/lib/outfits'
import { RAIL, TYPES, typesFor, HAIR, HAIR_COLORS, HINTS, HAT_NAMES, DEFAULT_COLOR, layerOf, type RailSlot, type UpperSlot, type AccSlot } from '@/lib/builderSlots'
import type { BuildHook } from '@/hooks/useBuild'
import { trackColorPick, trackColorConfirm, trackColorTab, trackEvent } from '@/lib/analytics'

// ═══════════════════════════════════════════════════════
// 만들기 2단계 — 새 디자인 (목업 flow-v5 의 만들기 화면)
// 위: 캐릭터(3:4 고정) + 오른쪽 레일 8칸. 아래: 칸 이름·힌트 → 옷 종류 칩 →
// 색 탭(● 추천 먼저) → 색 칩(이름 아래, ●/△ 표시). 색은 누르는 즉시 입는다.
// 발: 점수 + 이유 한 줄 + 완성.
// ═══════════════════════════════════════════════════════

const UPPER: UpperSlot[] = ['outer', 'middleware', 'top', 'inner']
const isUpper = (s: RailSlot): s is UpperSlot => (UPPER as string[]).includes(s)

export default function StepBuilderV2({ build }: { build: BuildHook }) {
  const { t, i18n } = useTranslation()
  const ko = (i18n.language || 'ko').startsWith('ko')
  const [sex, setSex] = useState<'m' | 'w'>(charSex)
  const [focus, setFocus] = useState<RailSlot>(() => build.state.upper.length ? 'top' : 'top')
  const [acc, setAcc] = useState<AccSlot>('scarf')
  const [tab, setTab] = useState<string>('rec')
  const s = build.state

  // 하의·신발은 항상 입고 시작한다 (판은 1단계 것, 없으면 기본)
  useEffect(() => {
    if (!s.bottomColor) build.setSlotColor('bottom', DEFAULT_COLOR.bottom)
    if (!s.shoesColor) build.setSlotColor('shoes', DEFAULT_COLOR.shoes)
  }, [])

  const scene = useMemo(() => charSceneFromState(s, sex), [s, sex])
  const score = build.getScore()
  const ev = build.getEvalResult()

  // 지금 칸의 "옷 자리" 이름: 색·판이 붙는 자리 (acc 는 scarf/hat 로 푼다)
  const colorSlot: string = focus === 'acc' ? acc : focus
  const worn = (slot: RailSlot): boolean => {
    if (slot === 'hair') return true
    if (slot === 'acc') return !!(s.scarfColor || s.hatColor)
    if (isUpper(slot)) return !!layerOf(s.upper, slot)
    if (slot === 'bottom') return !!s.bottomColor
    return !!s.shoesColor
  }
  const colorOf = (slot: RailSlot): string | null => {
    if (slot === 'hair') return s.hairColor || HAIR_COLORS[0].hex
    if (slot === 'acc') return s.scarfColor ? COLORS_60[s.scarfColor]?.hex : s.hatColor ? COLORS_60[s.hatColor]?.hex : null
    if (isUpper(slot)) { const l = layerOf(s.upper, slot); return l ? COLORS_60[l.colorKey]?.hex || null : null }
    const k = slot === 'bottom' ? s.bottomColor : s.shoesColor
    return k ? COLORS_60[k]?.hex || null : null
  }
  const currentKey = (): string | null => {
    if (focus === 'hair') return null
    if (focus === 'acc') return acc === 'scarf' ? s.scarfColor : s.hatColor
    if (isUpper(focus)) return layerOf(s.upper, focus)?.colorKey || null
    return focus === 'bottom' ? s.bottomColor : s.shoesColor
  }
  const currentPlate = (): string | null => {
    if (focus === 'hair') return s.hair || null
    if (focus === 'acc') return acc === 'scarf' ? (s.scarfColor ? s.scarfItem || TYPES.scarf[0] : null) : (s.hatColor ? s.hatItem || TYPES.hat[0] : null)
    if (isUpper(focus)) return layerOf(s.upper, focus)?.plate || null
    return focus === 'bottom' ? (s.bottomItem || TYPES.bottom[0]) : (s.shoesItem || TYPES.shoes[0])
  }
  const plateName = (id: string) => focus === 'hair'
    ? (HAIR[sex].find(h => h.id === id) || { ko: id, en: id })[ko ? 'ko' : 'en']
    : HAT_NAMES[id] ? HAT_NAMES[id][ko ? 'ko' : 'en'] : (PLATE_NAMES[id] ? PLATE_NAMES[id][ko ? 'ko' : 'en'] : id)

  // 옷 종류 목록
  const types: string[] = focus === 'hair' ? HAIR[sex].map(h => h.id)
    : focus === 'acc' ? typesFor(acc, sex)
    : typesFor(focus as keyof typeof TYPES, sex)
  const optional = focus === 'acc' || (isUpper(focus) && focus !== 'top')

  const pickType = (plate: string) => {
    trackEvent('garment_pick', { slot: colorSlot, plate })
    if (focus === 'hair') { build.setHair(plate, s.hairColor || HAIR_COLORS[0].hex); return }
    if (focus === 'acc') { build.setAccItem(acc, plate, currentKey() || DEFAULT_COLOR[acc]); return }
    if (focus === 'bottom') { build.setBottomItem(plate); return }
    if (focus === 'shoes') { build.setShoesItem(plate); return }
    build.setSlotGarment(focus, plate, currentKey() || DEFAULT_COLOR[focus])
  }
  const takeOff = () => {
    if (focus === 'acc') { build.setAccItem(acc, null, null); return }
    if (isUpper(focus)) build.setSlotGarment(focus, null)
  }
  const pickColor = (key: string, src: 'grid' | 'rec', pos: number) => {
    if (focus === 'hair') { build.setHair(s.hair || HAIR[sex][0].id, key); return }
    const delta = build.calcScoreDelta(colorSlot, key)
    trackColorPick('build', { slot: colorSlot, color: key, src, tab, pos, delta })
    trackColorConfirm({ slot: colorSlot, item: currentPlate(), color: key, action: 'v2' as any, score_before: score })
    if (focus === 'acc') { build.setAccItem(acc, currentPlate() || TYPES[acc][0], key); return }
    if (isUpper(focus) && !layerOf(s.upper, focus)) { build.setSlotGarment(focus, types[0], key); return }
    build.setSlotColor(colorSlot, key)
  }

  // 안내 층: 이 자리의 ● / △
  const guide = useMemo(() => focus === 'hair' ? null : build.getGuide(colorSlot), [colorSlot, s])
  useEffect(() => { if (focus !== 'hair') trackColorTab('build', tab, tab === 'rec' ? (guide?.rec.length || 0) : (COLOR_TABS.find(x => x.id === tab)?.keys.length || 0)) }, [tab, focus])
  const tabs = [{ id: 'rec', label: t('colorPicker.recTab') }, ...COLOR_TABS.map(x => ({ id: x.id, label: x.label }))]
  const chipKeys: string[] = focus === 'hair' ? [] : tab === 'rec' ? (guide?.rec || []) : (COLOR_TABS.find(x => x.id === tab)?.keys || [])
  const cur = currentKey()

  // 발: 점수 + 이유
  // 태그 = 이유 문장의 앞 토막(쉼표·대시 앞)이 짧을 때만, 아니면 등급 이름. 이유 줄은 감점이 있으면 감점, 없으면 가점 문장 (태그와 같으면 생략)
  const good = ev?.reasons.find(r => r.w > 0)
  const bad = ev?.reasons.find(r => r.w < 0)
  const head = good && /[,—]/.test(good.txt) ? good.txt.split(/[,—]/)[0].trim() : ''
  const gradeKey = score >= 92 ? 'perfect' : score >= 84 ? 'great' : score >= 72 ? 'good' : score >= 60 ? 'okay' : 'improve'
  const tag = score > 0 ? (head && head.length <= 14 ? head : t('build.scoreGrade.' + gradeKey)) : ''
  const reasonRaw = (bad || good)?.txt || ''
  const reason = reasonRaw && reasonRaw !== tag ? reasonRaw : ''
  const complete = s.upper.length >= 1 && !!s.bottomColor && !!s.shoesColor

  const changeSex = (x: 'm' | 'w') => { setSex(x); setCharSex(x); const h = HAIR[x][0].id; build.setHair(h, s.hairColor || HAIR_COLORS[0].hex) }

  return (
    <div className="-mx-5 -my-4 flex flex-col" style={{ minHeight: 'calc(100dvh - 60px)' }}>
      {/* 머리: 뒤로 · 제목 · 리셋 · 남/여 */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
        <button onClick={() => build.goBack()} aria-label={t('common.back')} className="w-9 h-9 rounded-full bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 flex items-center justify-center active:scale-90"><ArrowLeft size={16} /></button>
        <div className="flex-1 font-display text-[17px] font-bold text-warm-900 dark:text-warm-100">{t('builder.title')}</div>
        <button onClick={() => build.reset()} aria-label={t('builder.reset')} className="w-9 h-9 rounded-full bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 flex items-center justify-center active:scale-90"><RotateCcw size={15} /></button>
        <div className="flex bg-warm-200 dark:bg-warm-700 rounded-full p-0.5">
          {(['m', 'w'] as const).map(x => <button key={x} onClick={() => changeSex(x)} className={`px-3 py-1.5 rounded-full text-[12px] font-bold ${sex === x ? 'bg-warm-900 text-white' : 'text-warm-600'}`}>{x === 'm' ? t('builder.male') : t('builder.female')}</button>)}
        </div>
      </div>

      {/* 무대: 캐릭터 + 레일 (높이 고정) */}
      <div className="grid grid-cols-[1fr_128px]" style={{ height: 300 }}>
        <div className="relative flex items-end justify-center pb-2 overflow-hidden">
          <div className="absolute left-1/2 bottom-3 -translate-x-1/2 w-28 h-3 rounded-full" style={{ background: 'radial-gradient(ellipse at center, rgba(28,25,23,.16), rgba(28,25,23,0) 70%)' }} />
          <CharacterCanvas {...scene} width={208} />
        </div>
        <div className="grid grid-cols-2 gap-1.5 px-1.5 pb-2 content-end">
          {RAIL.map(r => {
            const on = focus === r.id, w = worn(r.id), sw = colorOf(r.id)
            return (
              <button key={r.id} onClick={() => { setFocus(r.id); setTab('rec') }}
                className={`relative rounded-2xl flex flex-col items-center justify-center gap-0.5 py-1 border transition-all ${on ? 'bg-white dark:bg-warm-800 border-warm-300 dark:border-warm-600 shadow-warm-sm text-warm-900 dark:text-warm-100' : 'border-transparent text-warm-500'}`} style={{ height: 66 }}>
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-[20px] ${w ? (on ? 'bg-terra-100 dark:bg-terra-900/30' : 'bg-warm-200 dark:bg-warm-700') : 'border border-dashed border-warm-400 text-warm-400 text-[18px]'}`}>{w ? r.icon : '＋'}</span>
                <span className="text-[10.5px] font-semibold leading-none">{t('builder.slot.' + r.id)}</span>
                <span className="w-5 h-1 rounded-full" style={{ background: sw || 'transparent' }} />
              </button>
            )
          })}
        </div>
      </div>

      {/* 서랍 */}
      <div className="flex-1 bg-white dark:bg-warm-800 border-t border-warm-300 dark:border-warm-700 pt-2 pb-24">
        <div className="flex items-center gap-2 px-4 h-7">
          <div className="text-[13px] font-bold text-warm-900 dark:text-warm-100 truncate">
            {t('builder.slot.' + (focus === 'acc' ? acc : focus))}
            {currentPlate() && <span className="ml-1.5 font-medium text-warm-500">{plateName(currentPlate()!)}{cur ? ' · ' + getColorName(cur) : ''}</span>}
          </div>
          <div className="ml-auto text-[10.5px] text-warm-500 truncate max-w-[46%]">{HINTS[colorSlot]?.[ko ? 'ko' : 'en']}</div>
          {optional && worn(focus) && <button onClick={takeOff} className="flex-none text-[11px] font-semibold px-2.5 py-1 rounded-full border border-warm-300 dark:border-warm-600 text-warm-700 dark:text-warm-300">{t('builder.takeOff')}</button>}
        </div>

        {focus === 'acc' && (
          <div className="flex gap-1.5 px-4 mt-1.5">
            {(['scarf', 'hat'] as AccSlot[]).map(a => { const w = a === 'scarf' ? !!s.scarfColor : !!s.hatColor; return (
              <button key={a} onClick={() => setAcc(a)} className={`h-6 px-2.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${acc === a ? 'bg-warm-900 text-white' : 'bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-300'}`}>
                <i className={`w-1.5 h-1.5 rounded-full ${w ? 'bg-terra-500' : 'bg-current opacity-30'}`} />{t('builder.slot.' + a)}
              </button>) })}
          </div>
        )}

        {/* 옷 종류 */}
        <div className="mt-2 px-4 overflow-x-auto [scrollbar-width:none]">
          <div className="grid grid-flow-col gap-1.5" style={{ gridTemplateRows: types.length > 5 ? 'repeat(2, 32px)' : '32px', gridAutoColumns: 'max-content' }}>
            {optional && <button onClick={takeOff} disabled={!worn(focus)} className={`h-8 px-3 rounded-full text-[12.5px] font-semibold border border-dashed whitespace-nowrap ${!worn(focus) ? 'bg-warm-900 text-white border-warm-900' : 'border-warm-400 text-warm-600 dark:text-warm-300'}`}>{t('builder.none')}</button>}
            {types.map(id => { const on = currentPlate() === id; return (
              <button key={id} onClick={() => pickType(id)} className={`h-8 px-3 rounded-full text-[12.5px] font-semibold whitespace-nowrap border transition-all active:scale-95 ${on ? 'bg-warm-900 text-white border-warm-900' : 'bg-[#FAF8F5] dark:bg-warm-900/40 border-warm-300 dark:border-warm-600 text-warm-700 dark:text-warm-300'}`}>{plateName(id)}</button>) })}
          </div>
        </div>

        {/* 색 */}
        {focus === 'hair' ? (
          <div className="mt-3 px-3 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {HAIR_COLORS.map(h => { const on = (s.hairColor || HAIR_COLORS[0].hex) === h.hex; return (
              <button key={h.hex} onClick={() => pickColor(h.hex, 'grid', 0)} className="flex-none w-[54px] flex flex-col items-center gap-1">
                <span className="w-9 h-9 rounded-full border-2 border-white" style={{ background: h.hex, boxShadow: on ? '0 0 0 2px #1C1917' : '0 0 0 1px rgba(28,25,23,.15)' }} />
                <span className={`text-[10px] leading-none ${on ? 'font-semibold text-warm-900 dark:text-warm-100' : 'text-warm-500'}`}>{ko ? h.ko : h.en}</span>
              </button>) })}
          </div>
        ) : (
          <>
            <div className="mt-3 px-4 flex gap-3.5 overflow-x-auto [scrollbar-width:none]">
              {tabs.map(x => <button key={x.id} onClick={() => setTab(x.id)} className={`flex-none text-[12px] font-semibold pb-0.5 border-b-2 whitespace-nowrap ${tab === x.id ? 'text-warm-900 dark:text-warm-100 border-warm-900 dark:border-warm-100' : 'text-warm-500 border-transparent'}`}>{x.id === 'rec' ? <span className="text-terra-600">{x.label}</span> : x.label}</button>)}
            </div>
            <div className="mt-2 px-3 overflow-x-auto [scrollbar-width:none]">
              {chipKeys.length === 0 ? (
                <div className="text-[11px] text-warm-500 px-1 py-3">{t('builder.noRec')}</div>
              ) : (
                <div className="grid grid-flow-col gap-1.5" style={{ gridTemplateRows: 'repeat(2, 56px)', gridAutoColumns: '54px' }}>
                  {chipKeys.map((k, i) => {
                    const c = COLORS_60[k]; if (!c) return null
                    const on = cur === k; const mark = guide?.marks[k]
                    return (
                      <button key={k} onClick={() => pickColor(k, tab === 'rec' ? 'rec' : 'grid', i)} className="w-[54px] flex flex-col items-center gap-1 active:scale-95 transition-transform">
                        <span className="relative w-9 h-9 rounded-full border-2 border-white flex items-center justify-center" style={{ background: c.hex, boxShadow: on ? '0 0 0 2px #1C1917' : '0 0 0 1px rgba(28,25,23,.15)' }}>
                          {on && <Check size={14} className={c.hcl[2] > 60 ? 'text-warm-900' : 'text-white'} />}
                          {mark === 'rec' && !on && <i className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-terra-500 border border-white" />}
                          {mark === 'warn' && !on && <i className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-warm-900 border border-white text-white text-[8px] leading-[10px] text-center not-italic">△</i>}
                        </span>
                        <span className={`text-[10px] leading-none max-w-[54px] truncate ${on ? 'font-semibold text-warm-900 dark:text-warm-100' : 'text-warm-500'}`}>{getColorName(k)}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 발: 점수 + 완성 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white/95 dark:bg-[#1C1917]/95 backdrop-blur-xl border-t border-warm-300 dark:border-warm-700 px-4 py-2.5 z-50 flex items-center gap-3" style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1 text-[12px] text-warm-500">
            <b className="text-[24px] font-extrabold text-warm-900 dark:text-warm-100 tracking-tight tabular-nums">{score > 0 ? score : '--'}</b>{t('builder.pt')}
            {tag && <span className="ml-1.5 text-[12px] font-semibold text-warm-700 dark:text-warm-300 truncate">{tag}</span>}
          </div>
          {reason && <div className="text-[11px] text-warm-500 truncate">{reason}</div>}
        </div>
        <button onClick={() => build.pushStep(s.fabricMode ? 'fabric' : 'result')} disabled={!complete} className="flex-none h-11 px-5 rounded-full bg-terra-500 text-white font-bold text-[14px] disabled:opacity-40 active:scale-[0.98] shadow-terra">{t('builder.done')} →</button>
      </div>

      {/* 접근성: 닫기 없는 X 아이콘 사용 안 함 */}
      <span className="hidden"><X size={1} /></span>
    </div>
  )
}
