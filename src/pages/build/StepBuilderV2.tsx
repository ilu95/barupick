import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, RotateCcw, X, Check } from 'lucide-react'
import CharacterCanvas from '@/components/mannequin/CharacterCanvas'
import { COLORS_60, COLOR_TABS, getColorName } from '@/lib/colors'
import { charSceneFromState, charSex, setCharSex, canWearTie } from '@/lib/char/map'
import { PLATE_NAMES } from '@/lib/outfits'
import { RAIL, TYPES, typesFor, HAIR, HAIR_COLORS, HINTS, HAT_NAMES, DEFAULT_COLOR, layerOf, uiSlotOf, type RailSlot, type UpperSlot, type AccSlot } from '@/lib/builderSlots'
import { getFilledOutfit, type BuildHook } from '@/hooks/useBuild'
import type { ComboCard } from '@/lib/engine'
import { trackColorPick, trackColorConfirm, trackColorTab, trackEvent, trackGuide } from '@/lib/analytics'
import { useWardrobe } from '@/hooks/useWardrobe'
import { loadTaste } from '@/lib/taste'
import { useToast } from '@/components/ui/Toast'

// ═══════════════════════════════════════════════════════
// 만들기 2단계 — 새 디자인 (목업 flow-v5 의 만들기 화면)
// 위: 캐릭터(3:4 고정) + 오른쪽 레일 8칸. 아래: 칸 이름·힌트 → 옷 종류 칩 →
// 색 탭(● 추천 먼저) → 색 칩(이름 아래, ●/△ 표시). 색은 누르는 즉시 입는다.
// 발: 점수 + 이유 한 줄 + 완성.
// ═══════════════════════════════════════════════════════

const UPPER: UpperSlot[] = ['outer', 'middleware', 'top', 'inner']
const isUpper = (s: RailSlot): s is UpperSlot => (UPPER as string[]).includes(s)

/** 하나씩 골라보기 순서: 상의 → 하의 → 신발 → 아우터 → 레이어드 → 악세서리 (헤어·이너는 레일에서 언제든) */
const GUIDE: RailSlot[] = ['top', 'bottom', 'shoes', 'outer', 'middleware', 'acc']

export default function StepBuilderV2({ build, guided = false, onBack, onDone, doneLabel, title }: { build: BuildHook; guided?: boolean; onBack?: () => void; onDone?: () => void; doneLabel?: string; title?: string }) {
  const { t, i18n } = useTranslation()
  const ko = (i18n.language || 'ko').startsWith('ko')
  const [sex, setSex] = useState<'m' | 'w'>(charSex)
  const [focus, setFocus] = useState<RailSlot>(GUIDE[0])
  const [gi, setGi] = useState(0)                        // guided: 지금 몇 번째 자리인지
  const [acc, setAcc] = useState<AccSlot>('scarf')
  const [tab, setTab] = useState<string>('rec')
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const s = build.state

  // 하의·신발은 항상 입고 시작한다 (판은 1단계 것, 없으면 기본)
  useEffect(() => {
    if (!s.bottomColor) build.setSlotColor('bottom', DEFAULT_COLOR.bottom)
    if (!s.shoesColor) build.setSlotColor('shoes', DEFAULT_COLOR.shoes)
  }, [])

  const scene = useMemo(() => charSceneFromState(s, sex), [s, sex])
  const score = build.getScore()
  const ev = build.getEvalResult()
  const tieAllowed = canWearTie(s)
  useEffect(() => { if (acc === 'tie' && !tieAllowed) setAcc('scarf') }, [tieAllowed])

  // 지금 칸의 "옷 자리" 이름: 색·판이 붙는 자리 (acc 는 scarf/hat/tie 로 푼다)
  const colorSlot: string = focus === 'acc' ? acc : focus
  const worn = (slot: RailSlot): boolean => {
    if (slot === 'hair') return true
    if (slot === 'acc') return !!(s.scarfColor || s.hatColor || s.tieColor)
    if (isUpper(slot)) return !!layerOf(s.upper, slot)
    if (slot === 'bottom') return !!s.bottomColor
    return !!s.shoesColor
  }
  const colorOf = (slot: RailSlot): string | null => {
    if (slot === 'hair') return s.hairColor || HAIR_COLORS[0].hex
    if (slot === 'acc') return s.scarfColor ? COLORS_60[s.scarfColor]?.hex : s.hatColor ? COLORS_60[s.hatColor]?.hex : s.tieColor ? COLORS_60[s.tieColor]?.hex : null
    if (isUpper(slot)) { const l = layerOf(s.upper, slot); return l ? COLORS_60[l.colorKey]?.hex || null : null }
    const k = slot === 'bottom' ? s.bottomColor : s.shoesColor
    return k ? COLORS_60[k]?.hex || null : null
  }
  // 이웃 자리의 메인색 (칩 반원 오른쪽 40%): 상의↔하의, 신발→하의, 목도리·모자→아우터(입었으면)/상의, 레이어드·이너·넥타이→상의
  const neighborKeyFor = (slot: string): string | null => {
    if (slot === 'top') return colorOf('bottom')
    if (slot === 'bottom') return colorOf('top')
    if (slot === 'shoes') return colorOf('bottom')
    if (slot === 'scarf' || slot === 'hat') return colorOf('outer') || colorOf('top')
    return colorOf('top')
  }
  const currentKey = (): string | null => {
    if (focus === 'hair') return null
    if (focus === 'acc') return acc === 'scarf' ? s.scarfColor : acc === 'hat' ? s.hatColor : s.tieColor
    if (isUpper(focus)) return layerOf(s.upper, focus)?.colorKey || null
    return focus === 'bottom' ? s.bottomColor : s.shoesColor
  }
  const currentPlate = (): string | null => {
    if (focus === 'hair') return s.hair || null
    if (focus === 'acc') return acc === 'scarf' ? (s.scarfColor ? s.scarfItem || TYPES.scarf[0] : null) : acc === 'hat' ? (s.hatColor ? s.hatItem || TYPES.hat[0] : null) : (s.tieColor ? s.tieItem || TYPES.tie[0] : null)
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
  // 상의는 다른 상체 레이어(아우터·레이어드·이너) 중 하나라도 입고 있어야 벗을 수 있다
  const canTakeOff = (slot: RailSlot): boolean => slot === 'acc' || (isUpper(slot) && (slot !== 'top' || s.upper.some(l => uiSlotOf(l) !== 'top')))
  const showNone = (slot: RailSlot): boolean => slot === 'acc' || isUpper(slot)

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
  const pickColor = (key: string, src: 'grid' | 'rec' | 'mine', pos: number, group?: string) => {
    if (focus === 'hair') { build.setHair(s.hair || HAIR[sex][0].id, key); return }
    const delta = build.calcScoreDelta(colorSlot, key)
    trackColorPick('build', { slot: colorSlot, color: key, src, tab, pos, delta, group })
    trackColorConfirm({ slot: colorSlot, item: currentPlate(), color: key, action: 'v2' as any, score_before: score })
    setTouched(prev => prev.has(colorSlot) ? prev : new Set(prev).add(colorSlot))
    if (focus === 'acc') { build.setAccItem(acc, currentPlate() || TYPES[acc][0], key); return }
    if (isUpper(focus) && !layerOf(s.upper, focus)) { build.setSlotGarment(focus, types[0], key); return }
    build.setSlotColor(colorSlot, key)
  }

  // 안내 층: 이 자리의 세 묶음(무난/어울려요/포인트) / ● / △
  const guide = useMemo(() => focus === 'hair' ? null : build.getGuide(colorSlot), [colorSlot, s])
  useEffect(() => { if (focus !== 'hair') trackColorTab('build', tab, tab === 'rec' ? (guide?.rec.length || 0) : (COLOR_TABS.find(x => x.id === tab)?.keys.length || 0)) }, [tab, focus])

  // 내 옷 색 (sp_wardrobe): 지금 자리 카테고리 색 + 취향 팔레트
  const wardrobe = useWardrobe()
  const tastePal = useMemo(() => new Set(loadTaste()?.pal || []), [])
  const mineCat = colorSlot === 'inner' ? 'top' : colorSlot
  const mineKeys = useMemo(() => Array.from(new Set(wardrobe.getItems(mineCat).map(i => i.color))), [mineCat, wardrobe.items])
  const mineSet = useMemo(() => new Set(mineKeys), [mineKeys])
  const showMineTab = wardrobe.items.length >= 3

  const [sortBright, setSortBright] = useState(false)
  const tabs = [
    { id: 'rec', label: t('colorPicker.recTab') },
    ...COLOR_TABS.map(x => ({ id: x.id, label: x.label })),
    ...(showMineTab ? [{ id: 'mine-all', label: t('builder.mineTab') }] : []),
  ]
  const gridKeys: string[] = (() => {
    const base = COLOR_TABS.find(x => x.id === tab)?.keys || []
    if (sortBright || !guide) return base
    return [...base].sort((a, b) => (guide.delta[b] ?? -999) - (guide.delta[a] ?? -999) || base.indexOf(a) - base.indexOf(b))
  })()
  const chipKeys: string[] = focus === 'hair' || tab === 'rec' || tab === 'mine-all' ? [] : gridKeys
  const cur = currentKey()
  const curReason = cur ? (guide?.why[cur] || HINTS[colorSlot]?.[ko ? 'ko' : 'en'] || '') : ''

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

  // 발: 한 수 (점수 72 미만 + 이득 4 이상일 때만)
  const toast = useToast()
  const footerMove = useMemo(() => {
    if (!score || score >= 72) return null
    const m = build.getBestMoves(1)[0]
    return m && m.gain >= 4 ? m : null
  }, [score, s])
  const applyFooterMove = () => {
    if (!footerMove) return
    const undo = build.applyMove(footerMove)
    trackEvent('move_apply_footer', { slot: footerMove.slot, to: footerMove.to, gain: footerMove.gain })
    toast.toast({
      message: t('build.moves.applied', { part: t('builder.slot.' + footerMove.slot), color: getColorName(footerMove.to), n: footerMove.gain }),
      variant: 'success',
      undoAction: () => { undo(); trackGuide('move_undo', { slot: footerMove.slot, ctx: 'footer' }) },
      undoLabel: t('build.moves.undo'),
    })
  }

  // 하나씩 골라보기: 다음 자리로. 선택 자리(아우터·레이어드·악세서리)는 비워 둔 채 넘어갈 수 있다
  const nextSlot = guided && gi < GUIDE.length - 1 ? GUIDE[gi + 1] : null
  const nextGuide = () => { if (!nextSlot) return; setGi(gi + 1); setFocus(nextSlot); setTab('rec'); trackEvent('guided_next', { from: focus, to: nextSlot }) }

  const changeSex = (x: 'm' | 'w') => { setSex(x); setCharSex(x); const h = HAIR[x][0].id; build.setHair(h, s.hairColor || HAIR_COLORS[0].hex) }

  // 칩: 왼쪽 후보색, 오른쪽 40% 이웃 자리 메인색(반원). 내 옷 👕 · 취향 ♥ 배지
  const neighborHex = focus === 'hair' ? null : neighborKeyFor(colorSlot)
  const chipBg = (hex: string) => neighborHex && neighborHex !== hex ? `linear-gradient(to right, ${hex} 0 60%, ${neighborHex} 60% 100%)` : hex
  const renderChip = (k: string, src: 'grid' | 'rec' | 'mine', pos: number, group?: string) => {
    const c = COLORS_60[k]; if (!c) return null
    const on = cur === k; const mark = src === 'grid' ? guide?.marks[k] : undefined
    return (
      <button key={(group || src) + '-' + k} onClick={() => pickColor(k, src, pos, group)} className="w-[54px] flex-none flex flex-col items-center gap-1 active:scale-95 transition-transform">
        <span className="relative w-9 h-9 rounded-full border-2 border-white flex items-center justify-center" style={{ background: chipBg(c.hex), boxShadow: on ? '0 0 0 2px #1C1917' : '0 0 0 1px rgba(28,25,23,.15)' }}>
          {on && <Check size={14} className={c.hcl[2] > 60 ? 'text-warm-900' : 'text-white'} />}
          {mark === 'rec' && !on && <i className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-terra-500 border border-white" />}
          {mark === 'warn' && !on && <i className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-warm-900 border border-white text-white text-[8px] leading-[10px] text-center not-italic">△</i>}
          {mineSet.has(k) && <i className="absolute -bottom-1 -left-1 text-[10px] leading-none">👕</i>}
          {tastePal.has(k) && <i className="absolute -bottom-1 -right-1 text-[10px] leading-none">♥</i>}
        </span>
        <span className={`text-[10px] leading-none max-w-[54px] truncate ${on ? 'font-semibold text-warm-900 dark:text-warm-100' : 'text-warm-500'}`}>{getColorName(k)}</span>
      </button>
    )
  }
  const groupRows: { id: string; label: string; keys: string[] }[] = guide ? [
    ...(mineKeys.length ? [{ id: 'mine', label: t('builder.group.mine'), keys: mineKeys }] : []),
    { id: 'safe', label: t('builder.group.safe'), keys: guide.groups.safe },
    { id: 'match', label: t('builder.group.match'), keys: guide.groups.match },
    ...(guide.groups.point.length ? [{ id: 'point', label: t('builder.group.point'), keys: guide.groups.point }] : []),
  ].filter(g => g.keys.length) : []
  const mineAllGroups = useMemo(() => {
    if (tab !== 'mine-all') return []
    return (['outer', 'middleware', 'top', 'bottom', 'shoes', 'scarf', 'hat'] as const)
      .map(cat => ({ id: cat, label: t('builder.slot.' + cat), keys: Array.from(new Set(wardrobe.getItems(cat).map(i => i.color))) }))
      .filter(g => g.keys.length)
  }, [tab, wardrobe.items])

  // 조합 카드: 지금 입은 옷은 그대로, 고르지 않은 자리만 6가지 패턴으로 색을 채운다
  const wardrobeBySlot = useMemo(() => Object.fromEntries(
    (['outer', 'middleware', 'top', 'bottom', 'shoes', 'scarf', 'hat'] as const).map(cat => [cat, Array.from(new Set(wardrobe.getItems(cat).map(i => i.color)))])
  ), [wardrobe.items])
  const combos = useMemo(() => guided ? [] : build.getCombos({ fixed: touched, n: 6, wardrobe: wardrobeBySlot, taste: Array.from(tastePal) }), [guided, s, touched, wardrobeBySlot])
  useEffect(() => { if (combos.length) trackEvent('combo_view', { n: combos.length }) }, [combos.length])
  const filled = getFilledOutfit(s)
  const comboActive = (c: ComboCard) => Object.entries(c.outfit).every(([slot, key]) => filled[slot] === key)
  const activeCombo = combos.find(comboActive)
  const comboScene = (c: ComboCard) => charSceneFromState({
    ...s,
    upper: s.upper.map(l => { const slot = uiSlotOf(l); return c.outfit[slot] ? { ...l, colorKey: c.outfit[slot] } : l }),
    bottomColor: c.outfit.bottom || s.bottomColor,
    shoesColor: c.outfit.shoes || s.shoesColor,
    scarfColor: c.outfit.scarf || s.scarfColor,
    hatColor: c.outfit.hat || s.hatColor,
    tieColor: c.outfit.tie || s.tieColor,
  }, sex)
  const applyCombo = (c: ComboCard) => {
    build.applyColors(c.outfit)
    trackEvent('combo_pick', { idx: combos.indexOf(c), kind: c.kind, total: c.total, mine: c.mine })
  }

  // 하나씩 골라보기: 조합 줄 대신 이 자리 후보 3장(무난·어울려요·포인트 1위) — 누르면 그 색 적용 + 다음 자리로
  const previewCards = useMemo(() => {
    if (!guided || !guide) return []
    const cands: { key: string; kind: 'safe' | 'match' | 'point' }[] = []
    if (guide.groups.safe[0]) cands.push({ key: guide.groups.safe[0], kind: 'safe' })
    if (guide.groups.match[0]) cands.push({ key: guide.groups.match[0], kind: 'match' })
    const pointKey = guide.groups.point[0] || guide.groups.match[1]
    if (pointKey) cands.push({ key: pointKey, kind: 'point' })
    const seen = new Set<string>()
    return cands.filter(c => !seen.has(c.key) && seen.add(c.key))
  }, [guided, guide])
  const previewScene = (key: string) => {
    if (focus === 'acc') return charSceneFromState({ ...s, scarfColor: acc === 'scarf' ? key : s.scarfColor, hatColor: acc === 'hat' ? key : s.hatColor, tieColor: acc === 'tie' ? key : s.tieColor }, sex)
    if (isUpper(focus)) return charSceneFromState({ ...s, upper: s.upper.map(l => uiSlotOf(l) === focus ? { ...l, colorKey: key } : l) }, sex)
    return charSceneFromState({ ...s, bottomColor: focus === 'bottom' ? key : s.bottomColor, shoesColor: focus === 'shoes' ? key : s.shoesColor }, sex)
  }
  const pickPreview = (c: { key: string; kind: string }, idx: number) => {
    pickColor(c.key, 'rec', idx, c.kind)
    trackEvent('guided_preview_pick', { slot: colorSlot, idx })
    nextGuide()
  }

  return (
    <div className="-mx-5 -my-4 flex flex-col" style={{ minHeight: 'calc(100dvh - 60px)' }}>
      {/* 머리: 뒤로 · 제목 · 리셋 · 남/여 */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
        <button onClick={() => onBack ? onBack() : build.goBack()} aria-label={t('common.back')} className="w-9 h-9 rounded-full bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 flex items-center justify-center active:scale-90"><ArrowLeft size={16} /></button>
        <div className="flex-1 font-display text-[17px] font-bold text-warm-900 dark:text-warm-100">{title || (guided ? t('builder.guidedTitle') : t('builder.title'))}</div>
        <button onClick={() => { build.reset(); setTouched(new Set()) }} aria-label={t('builder.reset')} className="w-9 h-9 rounded-full bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 flex items-center justify-center active:scale-90"><RotateCcw size={15} /></button>
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
              <button key={r.id} onClick={() => { setFocus(r.id); setTab('rec'); const k = GUIDE.indexOf(r.id); if (k >= 0) setGi(k) }}
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
        {guided ? previewCards.length > 0 && (
          <div className="px-4 pb-2 mb-2 border-b border-warm-200 dark:border-warm-700">
            <div className="text-[10.5px] font-bold text-warm-500 mb-1.5">{t('builder.preview.title')}</div>
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
              {previewCards.map((c, i) => {
                const on = cur === c.key
                return (
                  <button key={c.key} onClick={() => pickPreview(c, i)} className="flex-none w-[72px] flex flex-col items-center gap-0.5 active:scale-95 transition-transform">
                    <span className={`rounded-xl overflow-hidden border-2 ${on ? 'border-warm-900 dark:border-warm-100' : 'border-transparent'}`}>
                      <CharacterCanvas {...previewScene(c.key)} width={72} style={{ contentVisibility: 'auto' } as React.CSSProperties} />
                    </span>
                    <span className="text-[11px] font-bold text-warm-900 dark:text-warm-100 truncate max-w-full">{getColorName(c.key)}</span>
                    <span className="text-[9.5px] text-warm-500 truncate max-w-full">{t('builder.group.' + c.kind)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : combos.length > 0 && (
          <div className="px-4 pb-2 mb-2 border-b border-warm-200 dark:border-warm-700">
            <div className="text-[10.5px] font-bold text-warm-500 mb-1.5">
              {t('builder.combos.title')}
              {touched.size > 0 && <span className="ml-1.5 font-normal text-warm-400">{t('builder.combos.fixed')}</span>}
            </div>
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
              {combos.map((c, i) => {
                const on = comboActive(c)
                return (
                  <button key={i} onClick={() => applyCombo(c)} className="flex-none w-[72px] flex flex-col items-center gap-0.5 active:scale-95 transition-transform">
                    <span className={`rounded-xl overflow-hidden border-2 ${on ? 'border-warm-900 dark:border-warm-100' : 'border-transparent'}`}>
                      <CharacterCanvas {...comboScene(c)} width={72} style={{ contentVisibility: 'auto' } as React.CSSProperties} />
                    </span>
                    <span className="text-[11px] font-bold tabular-nums text-warm-900 dark:text-warm-100">{c.total}{t('builder.pt')}</span>
                    <span className="text-[9.5px] text-warm-500 truncate max-w-full">{t('builder.combos.kind.' + c.kind)}</span>
                  </button>
                )
              })}
            </div>
            {activeCombo?.why && <div className="mt-1 text-[11px] text-warm-500">{activeCombo.why}</div>}
          </div>
        )}
        <div className="flex items-center gap-2 px-4 h-7">
          {guided && <span className="flex-none text-[11px] font-bold px-2 py-0.5 rounded-full bg-terra-100 text-terra-700 dark:bg-terra-900/30 dark:text-terra-300 tabular-nums">{gi + 1}/{GUIDE.length}</span>}
          <div className="text-[13px] font-bold text-warm-900 dark:text-warm-100 truncate">
            {t('builder.slot.' + (focus === 'acc' ? acc : focus))}
            {currentPlate() && <span className="ml-1.5 font-medium text-warm-500">{plateName(currentPlate()!)}{cur ? ' · ' + getColorName(cur) : ''}</span>}
          </div>
          <div className="ml-auto text-[10.5px] text-warm-500 truncate max-w-[46%]">{HINTS[colorSlot]?.[ko ? 'ko' : 'en']}</div>
          {canTakeOff(focus) && worn(focus) && <button onClick={takeOff} className="flex-none text-[11px] font-semibold px-2.5 py-1 rounded-full border border-warm-300 dark:border-warm-600 text-warm-700 dark:text-warm-300">{t('builder.takeOff')}</button>}
        </div>

        {focus === 'acc' && (
          <div className="flex items-center gap-1.5 px-4 mt-1.5">
            {(['scarf', 'hat', 'tie'] as AccSlot[]).map(a => {
              const w = a === 'scarf' ? !!s.scarfColor : a === 'hat' ? !!s.hatColor : !!s.tieColor
              const disabled = a === 'tie' && !tieAllowed
              return (
                <button key={a} onClick={() => !disabled && setAcc(a)} disabled={disabled} className={`h-6 px-2.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${disabled ? 'bg-warm-100 dark:bg-warm-800 text-warm-400 dark:text-warm-600' : acc === a ? 'bg-warm-900 text-white' : 'bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-300'}`}>
                  <i className={`w-1.5 h-1.5 rounded-full ${w ? 'bg-terra-500' : 'bg-current opacity-30'}`} />{t('builder.slot.' + a)}
                </button>
              )
            })}
            {!tieAllowed && <span className="text-[10.5px] text-warm-400">{t('builder.tieNeedsShirt')}</span>}
          </div>
        )}

        {/* 옷 종류 */}
        <div className="mt-2 px-4 overflow-x-auto [scrollbar-width:none]">
          <div className="grid grid-flow-col gap-1.5" style={{ gridTemplateRows: types.length > 5 ? 'repeat(2, 32px)' : '32px', gridAutoColumns: 'max-content' }}>
            {showNone(focus) && <button onClick={takeOff} disabled={!worn(focus) || !canTakeOff(focus)} className={`h-8 px-3 rounded-full text-[12.5px] font-semibold border border-dashed whitespace-nowrap ${!canTakeOff(focus) ? 'opacity-40 border-warm-300 dark:border-warm-600 text-warm-400 dark:text-warm-600' : !worn(focus) ? 'bg-warm-900 text-white border-warm-900' : 'border-warm-400 text-warm-600 dark:text-warm-300'}`}>{t('builder.none')}</button>}
            {types.map(id => { const on = currentPlate() === id; return (
              <button key={id} onClick={() => pickType(id)} className={`h-8 px-3 rounded-full text-[12.5px] font-semibold whitespace-nowrap border transition-all active:scale-95 ${on ? 'bg-warm-900 text-white border-warm-900' : 'bg-[#FAF8F5] dark:bg-warm-900/40 border-warm-300 dark:border-warm-600 text-warm-700 dark:text-warm-300'}`}>{plateName(id)}</button>) })}
          </div>
          {focus === 'top' && !canTakeOff('top') && <div className="mt-1.5 text-[10.5px] text-warm-400">{t('builder.topNeedsUpper')}</div>}
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
            <div className="mt-3 px-4 flex items-center gap-3.5 overflow-x-auto [scrollbar-width:none]">
              {tabs.map(x => <button key={x.id} onClick={() => setTab(x.id)} className={`flex-none text-[12px] font-semibold pb-0.5 border-b-2 whitespace-nowrap ${tab === x.id ? 'text-warm-900 dark:text-warm-100 border-warm-900 dark:border-warm-100' : 'text-warm-500 border-transparent'}`}>{x.id === 'rec' ? <span className="text-terra-600">{x.label}</span> : x.label}</button>)}
              {tab !== 'rec' && tab !== 'mine-all' && (
                <button onClick={() => { const next = !sortBright; setSortBright(next); trackEvent('color_sort', { slot: colorSlot, bright: next }) }} className="flex-none ml-auto text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-300 whitespace-nowrap">{sortBright ? t('builder.sortRec') : t('builder.sortBright')}</button>
              )}
              {tab !== 'rec' && tab !== 'mine-all' && <span className="flex-none text-[10px] text-warm-400 whitespace-nowrap">{t('builder.legend')}</span>}
            </div>

            {tab === 'rec' ? (
              <div className="mt-2 px-3 flex flex-col gap-2.5">
                {groupRows.length === 0 ? (
                  <div className="text-[11px] text-warm-500 px-1 py-3">{t('builder.noRec')}</div>
                ) : groupRows.map(g => (
                  <div key={g.id}>
                    <div className="px-1 mb-1 text-[10.5px] font-bold text-warm-500">{g.label}</div>
                    <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">{g.keys.map((k, i) => renderChip(k, g.id === 'mine' ? 'mine' : 'rec', i, g.id))}</div>
                  </div>
                ))}
              </div>
            ) : tab === 'mine-all' ? (
              <div className="mt-2 px-3 flex flex-col gap-2.5">
                {mineAllGroups.length === 0 ? (
                  <div className="text-[11px] text-warm-500 px-1 py-3">{t('builder.noRec')}</div>
                ) : mineAllGroups.map(g => (
                  <div key={g.id}>
                    <div className="px-1 mb-1 text-[10.5px] font-bold text-warm-500">{g.label}</div>
                    <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">{g.keys.map((k, i) => renderChip(k, 'mine', i, g.id))}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2 px-3 overflow-x-auto [scrollbar-width:none]">
                {chipKeys.length === 0 ? (
                  <div className="text-[11px] text-warm-500 px-1 py-3">{t('builder.noRec')}</div>
                ) : (
                  <div className="grid grid-flow-col gap-1.5" style={{ gridTemplateRows: 'repeat(2, 56px)', gridAutoColumns: '54px' }}>
                    {chipKeys.map((k, i) => renderChip(k, 'grid', i))}
                  </div>
                )}
              </div>
            )}
            {cur && curReason && <div className="mt-1.5 px-4 text-[11px] text-warm-500">{getColorName(cur)} — {curReason}</div>}
          </>
        )}
      </div>

      {/* 발: 점수 + 완성 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white/95 dark:bg-[#1C1917]/95 backdrop-blur-xl border-t border-warm-300 dark:border-warm-700 px-4 py-2.5 z-50 flex items-center gap-3" style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1 text-[12px] text-warm-500">
            <b className="text-[24px] font-extrabold text-warm-900 dark:text-warm-100 tracking-tight tabular-nums">{score > 0 ? score : '--'}</b>{t('builder.pt')}
            {tag && <span className="ml-1.5 text-[12px] font-semibold text-warm-700 dark:text-warm-300 truncate">{tag}</span>}
            {footerMove && (
              <button onClick={applyFooterMove} className="ml-1.5 flex-none text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-terra-100 text-terra-700 dark:bg-terra-900/30 dark:text-terra-300 truncate">
                {t('builder.moveChip', { slot: t('builder.slot.' + footerMove.slot), color: getColorName(footerMove.to), score: footerMove.score })}
              </button>
            )}
          </div>
          {reason && <div className="text-[11px] text-warm-500 truncate">{reason}</div>}
        </div>
        {nextSlot ? (
          <button onClick={nextGuide} disabled={!canTakeOff(focus) && !worn(focus)} className="flex-none h-11 px-4 rounded-full bg-warm-900 dark:bg-warm-100 text-white dark:text-warm-900 font-bold text-[13.5px] disabled:opacity-40 active:scale-[0.98]">{canTakeOff(focus) && !worn(focus) ? t('builder.guided.skip', { slot: t('builder.slot.' + nextSlot) }) : t('builder.guided.next', { slot: t('builder.slot.' + nextSlot) })} →</button>
        ) : (
          <button onClick={() => onDone ? onDone() : build.pushStep(s.fabricMode ? 'fabric' : 'result')} disabled={!complete} className="flex-none h-11 px-5 rounded-full bg-terra-500 text-white font-bold text-[14px] disabled:opacity-40 active:scale-[0.98] shadow-terra">{doneLabel || t('builder.done')} →</button>
        )}
      </div>

      {/* 접근성: 닫기 없는 X 아이콘 사용 안 함 */}
      <span className="hidden"><X size={1} /></span>
    </div>
  )
}
