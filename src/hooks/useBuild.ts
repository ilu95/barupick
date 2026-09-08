// @ts-nocheck
// ═══════════════════════════════════════════════════════
// useBuild.ts v2 — 자유형 레이어 빌더 + 자동 슬롯 매핑
// ═══════════════════════════════════════════════════════
import { useState, useCallback, useMemo } from 'react'
import { COLORS_60 } from '@/lib/colors'
import { STYLE_GUIDE, MOOD_GROUPS, ITEMS_CATALOG, type ItemDef } from '@/lib/styles'
import { STYLE_MOODS } from '@/lib/styleMoods'
import { CATEGORY_NAMES } from '@/lib/categories'
import { PERSONAL_COLOR_12 } from '@/lib/personalColor'
import { BODY_GUIDE_DATA } from '@/lib/bodyType'
import { profile } from '@/lib/profile'
import i18n from '@/i18n'
import { evaluationSystem } from '@/lib/evaluation'
import { calculateHarmonyV6 } from '@/lib/recommend'
import { colorGuide, bestMoves, type Move } from '@/lib/guide'

export type BuildMode = 'coord' | 'evaluate'
export type BuildStep = 'outfit' | 'style' | 'builder' | 'fabric' | 'result' | 'improve'
export type SlotKey = 'outer' | 'middleware' | 'top' | 'inner' | 'hidden'
export type EditMode =
  | { type: 'idle' }
  | { type: 'add' }
  | { type: 'edit_upper'; index: number }
  | { type: 'edit_simple'; target: 'bottom' | 'shoes' | 'scarf' | 'hat' }

export interface UpperLayer {
  uid: number
  itemId: string
  colorKey: string
  outerness: number
  /** 1단계에서 고른 캐릭터 판 id (있으면 렌더러가 이 판을 그린다) */
  plate?: string
}

export interface BuildState {
  mode: BuildMode
  style: string | null
  fabricMode: boolean
  upper: UpperLayer[]
  bottomColor: string | null
  shoesColor: string | null
  scarfColor: string | null
  hatColor: string | null
  fabrics: Record<string, string | null>
  /** 1단계에서 고른 하의·신발 판 id (색은 bottomColor/shoesColor) */
  bottomItem?: string | null
  shoesItem?: string | null
  /** 1단계 조합 id (계측·기록용) */
  templateId?: string | null
}

// ═══ 자동 슬롯 매핑 ═══

export function getSlotKey(idx: number, total: number, layer: { outerness: number; itemId: string }): SlotKey {
  if (total === 1) {
    if (layer.outerness >= 90) return 'outer'
    const item = ITEMS_CATALOG.find(i => i.id === layer.itemId)
    if (item?.midType) return 'middleware'
    return 'top'
  }
  if (total === 2) {
    if (idx === 0) {
      if (layer.outerness >= 90) return 'outer'
      const item = ITEMS_CATALOG.find(i => i.id === layer.itemId)
      if (item?.midType) return 'middleware'
      return 'outer'
    }
    return 'top'
  }
  if (idx === 0) return 'outer'
  if (idx === 1) return 'middleware'
  if (idx === 2) return 'top'
  if (idx === 3) return 'inner'
  return 'hidden'
}

export function getSlotLabel(idx: number, total: number, layer: { outerness: number; itemId: string }): string {
  const slot = getSlotKey(idx, total, layer)
  if (total === 1) {
    if (slot === 'outer') return i18n.t('build.slot.outer')
    if (slot === 'middleware') return i18n.t('build.slot.middleware')
    return ''
  }
  const LABELS: Record<string, string> = { outer: i18n.t('build.slot.outer'), middleware: i18n.t('build.slot.middleware'), top: i18n.t('build.slot.top'), inner: i18n.t('build.slot.inner'), hidden: '' }
  return LABELS[slot] || ''
}

export function sortUpper(upper: UpperLayer[]): UpperLayer[] {
  return [...upper].sort((a, b) => b.outerness - a.outerness || a.uid - b.uid)
}

export function upperToOutfit(state: BuildState): Record<string, string | null> {
  const outfit: Record<string, string | null> = {
    outer: null, middleware: null, top: null, inner: null,
    bottom: state.bottomColor, shoes: state.shoesColor,
    scarf: state.scarfColor, hat: state.hatColor,
  }
  const sorted = sortUpper(state.upper)
  sorted.forEach((layer, idx) => {
    const slot = getSlotKey(idx, sorted.length, layer)
    if (slot !== 'hidden') outfit[slot] = layer.colorKey
  })
  return outfit
}

export function getFilledOutfit(state: BuildState): Record<string, string> {
  return Object.fromEntries(
    Object.entries(upperToOutfit(state)).filter(([_, v]) => v != null)
  ) as Record<string, string>
}

export function getOuterType(upper: UpperLayer[]): 'coat' | 'jacket' | 'padding' {
  const sorted = sortUpper(upper)
  for (let i = 0; i < sorted.length; i++) {
    if (getSlotKey(i, sorted.length, sorted[i]) === 'outer') {
      const item = ITEMS_CATALOG.find(x => x.id === sorted[i].itemId)
      if (item?.outerType) return item.outerType
    }
  }
  return 'coat'
}

export function getMidType(upper: UpperLayer[]): 'knit' | 'cardigan' | 'vest' {
  const sorted = sortUpper(upper)
  for (let i = 0; i < sorted.length; i++) {
    if (getSlotKey(i, sorted.length, sorted[i]) === 'middleware') {
      const item = ITEMS_CATALOG.find(x => x.id === sorted[i].itemId)
      if (item?.midType) return item.midType
    }
  }
  return 'knit'
}

export function predictSlot(upper: UpperLayer[], tmpItemId: string, editIdx?: number): SlotKey {
  const item = ITEMS_CATALOG.find(i => i.id === tmpItemId)
  if (!item) return 'top'

  if (editIdx !== undefined && editIdx >= 0) {
    const testUpper = upper.map((l, i) =>
      i === editIdx ? { ...l, itemId: item.id, outerness: item.outerness } : l
    )
    const sorted = sortUpper(testUpper)
    const target = sorted.find(l => l.uid === upper[editIdx].uid)
    if (target) {
      const newIdx = sorted.indexOf(target)
      return getSlotKey(newIdx, sorted.length, target)
    }
    return 'top'
  }

  const testUpper: UpperLayer[] = [...upper, { uid: -1, itemId: item.id, outerness: item.outerness, colorKey: '' }]
  const sorted = sortUpper(testUpper)
  const newIdx = sorted.findIndex(l => l.uid === -1)
  return getSlotKey(newIdx, sorted.length, sorted[newIdx])
}

// ═══ 메인 훅 ═══

const initialState = (mode: BuildMode = 'coord'): BuildState => ({
  mode,
  style: null,
  fabricMode: false,
  upper: [],
  bottomColor: null,
  shoesColor: null,
  scarfColor: null,
  hatColor: null,
  fabrics: {},
})

let uidCounter = 0

export function useBuild(mode: BuildMode = 'coord') {
  const [step, setStep] = useState<BuildStep>(mode === 'coord' ? 'outfit' : 'style')
  const [state, setState] = useState<BuildState>(initialState(mode))
  const [history, setHistory] = useState<BuildStep[]>([])
  const [vizCollapsed, setVizCollapsed] = useState(false)
  const [editMode, setEditMode] = useState<EditMode>({ type: 'idle' })

  const pushStep = useCallback((next: BuildStep) => {
    setHistory(prev => [...prev, step])
    setStep(next)
  }, [step])

  const goBack = useCallback(() => {
    setHistory(prev => {
      const copy = [...prev]
      const last = copy.pop()
      if (last) setStep(last)
      return copy
    })
  }, [])

  const update = useCallback((partial: Partial<BuildState>) => {
    setState(prev => ({ ...prev, ...partial }))
  }, [])

  const reset = useCallback(() => {
    setState(initialState(mode))
    setStep(mode === 'coord' ? 'outfit' : 'style')
    setHistory([])
    setEditMode({ type: 'idle' })
  }, [mode])

  // ── 스타일 선택 ──
  const selectStyle = useCallback((style: string | null) => {
    update({ style })
    pushStep('builder')
  }, [])

  // ── 상체 아이템 추가 ──
  const addUpper = useCallback((itemId: string, colorKey: string) => {
    setState(prev => {
      if (prev.upper.length >= 4) return prev
      if (prev.upper.some(l => l.itemId === itemId)) return prev
      const item = ITEMS_CATALOG.find(i => i.id === itemId)
      if (!item) return prev
      const newLayer: UpperLayer = {
        uid: uidCounter++,
        itemId: item.id,
        colorKey,
        outerness: item.outerness,
      }
      return { ...prev, upper: sortUpper([...prev.upper, newLayer]) }
    })
    setEditMode({ type: 'idle' })
  }, [])

  // ── 1단계(옷 조합) 결과를 한 번에 올린다 ──
  const applyOutfit = useCallback((o: {
    layers: { itemId: string; plate: string; colorKey: string }[]
    bottom?: { plate: string; colorKey: string }
    shoes?: { plate: string; colorKey: string }
    style?: string | null
    templateId?: string | null
  }) => {
    setState(prev => {
      const upper: UpperLayer[] = []
      for (const l of o.layers) {
        const item = ITEMS_CATALOG.find(i => i.id === l.itemId)
        if (!item || upper.some(x => x.itemId === item.id) || upper.length >= 4) continue
        upper.push({ uid: uidCounter++, itemId: item.id, colorKey: l.colorKey, outerness: item.outerness, plate: l.plate })
      }
      return {
        ...prev,
        style: o.style ?? null,
        upper: sortUpper(upper),
        bottomColor: o.bottom?.colorKey ?? prev.bottomColor,
        shoesColor: o.shoes?.colorKey ?? prev.shoesColor,
        bottomItem: o.bottom?.plate ?? null,
        shoesItem: o.shoes?.plate ?? null,
        templateId: o.templateId ?? null,
      }
    })
    setEditMode({ type: 'idle' })
    pushStep('builder')
  }, [pushStep])

  // ── 상체 아이템 수정 ──
  const editUpper = useCallback((index: number, itemId: string, colorKey: string) => {
    setState(prev => {
      const item = ITEMS_CATALOG.find(i => i.id === itemId)
      if (!item) return prev
      if (prev.upper.some((l, i) => i !== index && l.itemId === itemId)) return prev
      const newUpper = prev.upper.map((l, i) =>
        i === index ? { ...l, itemId: item.id, colorKey, outerness: item.outerness, plate: item.id === l.itemId ? l.plate : undefined } : l
      )
      return { ...prev, upper: sortUpper(newUpper) }
    })
    setEditMode({ type: 'idle' })
  }, [])

  // ── 상체 아이템 제거 ──
  const removeUpper = useCallback((index: number) => {
    setState(prev => ({ ...prev, upper: prev.upper.filter((_, i) => i !== index) }))
    setEditMode({ type: 'idle' })
  }, [])

  // ── 단순 색상 설정 ──
  const setSimpleColor = useCallback((target: string, colorKey: string | null) => {
    setState(prev => {
      if (target === 'bottom') return { ...prev, bottomColor: colorKey }
      if (target === 'shoes') return { ...prev, shoesColor: colorKey }
      if (target === 'scarf') return { ...prev, scarfColor: colorKey }
      if (target === 'hat') return { ...prev, hatColor: colorKey }
      return prev
    })
    setEditMode({ type: 'idle' })
  }, [])

  // ── 점수 ──
  const getScore = useCallback((): number => {
    const outfit = getFilledOutfit(state)
    if (Object.keys(outfit).length < 2) return 0
    try {
      const pc = profile.getPersonalColor()
      return evaluationSystem.evaluate(outfit, pc).total
    } catch { return 0 }
  }, [state])

  // ── 평가 결과 ──
  const getEvalResult = useCallback(() => {
    const outfit = getFilledOutfit(state)
    if (Object.keys(outfit).length < 2) return null
    try {
      const pc = profile.getPersonalColor()
      return evaluationSystem.evaluate(outfit, pc)
    } catch { return null }
  }, [state])

  // ── 점수 변화 미리보기 ──
  const calcScoreDelta = useCallback((slot: string, newColorKey: string): number => {
    const outfit = getFilledOutfit(state)
    if (Object.keys(outfit).length < 1) return 0
    try {
      const pc = profile.getPersonalColor()
      const baseScore = evaluationSystem.evaluate(outfit, pc).total
      const testOutfit = { ...outfit, [slot]: newColorKey }
      const newScore = evaluationSystem.evaluate(testOutfit, pc).total
      return newScore - baseScore
    } catch { return 0 }
  }, [state])

  // ── 색상 추천 ──
  // ── 안내 층: 자리 하나의 ●/△, 최선의 한 수, 한 수 적용(되돌리기 반환) ──
  const getGuide = useCallback((slot: string) => {
    const outfit = getFilledOutfit(state)
    return colorGuide(k => calcScoreDelta(slot, k), outfit[slot] || null)
  }, [state, calcScoreDelta])

  const getBestMoves = useCallback((k = 3): Move[] => {
    const outfit = getFilledOutfit(state)
    if (Object.keys(outfit).length < 2) return []
    try { return bestMoves(outfit, k) } catch { return [] }
  }, [state])

  const applyMove = useCallback((move: { slot: string; to: string }): (() => void) => {
    const prev = state
    setState(p => {
      if (['bottom', 'shoes', 'scarf', 'hat'].includes(move.slot)) return { ...p, [move.slot + 'Color']: move.to }
      const sorted = sortUpper(p.upper)
      const idx = sorted.findIndex((l, i) => getSlotKey(i, sorted.length, l) === move.slot)
      if (idx < 0) return p
      return { ...p, upper: sorted.map((l, i) => i === idx ? { ...l, colorKey: move.to } : l) }
    })
    return () => setState(prev)
  }, [state])

  const getColorRecommendations = useCallback((slotName: string) => {
    if (state.mode === 'evaluate') return []

    const DEPENDENCY_MAP: Record<string, string[]> = {
      outer: ['top', 'middleware', 'bottom'],
      middleware: ['top', 'bottom'],
      top: ['bottom'],
      inner: ['top'],
      bottom: ['top'],
      scarf: ['top', 'middleware', 'outer'],
      hat: ['top', 'outer'],
      shoes: ['bottom'],
    }
    const FACE_NEAR = ['outer', 'middleware', 'top', 'scarf', 'hat']
    const COMMON_WARDROBE: Record<string, number> = {
      black: 20, white: 20, navy: 18, gray: 16, charcoal: 16, beige: 16,
      cream: 14, ivory: 14, camel: 14, brown: 12, olive: 12, burgundy: 12,
      khaki: 12, lightgray: 12, taupe: 10,
    }

    const outfit = getFilledOutfit(state)
    const fitMode = profile.getFitMode()
    const isFaceNear = FACE_NEAR.includes(slotName)
    const pcType = (fitMode && isFaceNear) ? profile.getPersonalColor() : null
    const pcData = pcType ? (PERSONAL_COLOR_12 as any)[pcType] : null
    const bestColors: string[] = (pcData?.bestColors || []).filter((c: string) => COLORS_60[c])
    const avoidColors: string[] = (pcData?.avoidColors || pcData?.worstColors || []).filter((c: string) => COLORS_60[c])

    const bt = fitMode ? profile.getBodyType() : null
    const btData = bt ? (BODY_GUIDE_DATA as any)[bt] : null
    const bodyRule = btData?.colorRules?.[slotName] || null

    const checkBodyMatch = (rule: string | null, colorKey: string) => {
      if (!rule || rule === 'any') return false
      const c = COLORS_60[colorKey]
      if (!c) return false
      const lightness = c.hcl[2]
      if (rule === 'light') return lightness >= 55
      if (rule === 'dark') return lightness <= 45
      if (rule === 'match-shoes') return outfit.shoes ? colorKey === outfit.shoes : false
      if (rule === 'match-bottom') return outfit.bottom ? colorKey === outfit.bottom : false
      return false
    }

    const related = (DEPENDENCY_MAP[slotName] || []).filter(cat => outfit[cat])
    const baseColors = related.map(cat => outfit[cat]!).filter(Boolean)

    if (baseColors.length === 0) {
      const recs: any[] = []
      const seen = new Set<string>()

      if (isFaceNear && bestColors.length > 0) {
        bestColors.forEach(k => {
          const bm = checkBodyMatch(bodyRule, k)
          recs.push({ key: k, score: 100 + (bm ? 15 : 0), reason: bm ? i18n.t('build.reason.pcAndBody') : i18n.t('build.reason.pc'), badges: { pc: true, body: bm } })
          seen.add(k)
        })
      }

      if (fitMode && bodyRule && bodyRule !== 'any') {
        Object.keys(COLORS_60).forEach(k => {
          if (seen.has(k) || avoidColors.includes(k)) return
          const bm = checkBodyMatch(bodyRule, k)
          if (bm) { recs.push({ key: k, score: 80 + (COMMON_WARDROBE[k] || 0), reason: i18n.t('build.reason.body'), badges: { pc: false, body: true } }); seen.add(k) }
        })
      }

      if (state.style) {
        const mood = (STYLE_MOODS as any)[state.style]
        if (mood) {
          const pools = [...(mood.darks || []), ...(mood.mids || []), ...(mood.lights || []), ...(mood.pastels || [])]
          pools.forEach(k => {
            if (seen.has(k) || avoidColors.includes(k) || !COLORS_60[k]) return
            const bm = checkBodyMatch(bodyRule, k)
            const pcm = isFaceNear && bestColors.includes(k)
            recs.push({ key: k, score: 70 + (pcm ? 15 : 0) + (bm ? 10 : 0) + (COMMON_WARDROBE[k] || 0), reason: i18n.t('build.reason.style'), badges: { pc: pcm, body: bm } })
            seen.add(k)
          })
        }
      }

      Object.entries(COMMON_WARDROBE).forEach(([k, v]) => {
        if (seen.has(k) || avoidColors.includes(k)) return
        const bm = checkBodyMatch(bodyRule, k)
        recs.push({ key: k, score: v + (bm ? 10 : 0), reason: i18n.t('build.reason.basic'), badges: { pc: false, body: bm } })
        seen.add(k)
      })

      return recs.sort((a, b) => b.score - a.score).slice(0, 20)
    }

    const recs: any[] = []
    Object.keys(COLORS_60).forEach(targetKey => {
      if (baseColors.includes(targetKey)) return
      let totalScore = 0
      baseColors.forEach(baseKey => {
        try { totalScore += calculateHarmonyV6(baseKey, targetKey).score } catch { totalScore += 50 }
      })
      let avgScore = totalScore / baseColors.length
      const pcMatch = isFaceNear && bestColors.includes(targetKey)
      const pcAvoid = avoidColors.includes(targetKey)
      const bm = checkBodyMatch(bodyRule, targetKey)
      if (pcMatch) avgScore += 15
      if (pcAvoid) avgScore -= 20
      if (bm) avgScore += 10
      avgScore += (COMMON_WARDROBE[targetKey] || 0) * 0.3
      const reason = pcMatch && bm ? i18n.t('build.reason.pcAndBody') : pcMatch ? i18n.t('build.reason.pc') : bm ? i18n.t('build.reason.body') : i18n.t('build.reason.harmony')
      recs.push({ key: targetKey, score: avgScore, reason, badges: { pc: pcMatch, body: bm } })
    })
    return recs.sort((a, b) => b.score - a.score).slice(0, 20)
  }, [state])

  // ── outfitHex for MannequinSVG ──
  const outfitHex = useMemo(() => {
    const hex: Record<string, string> = {}
    const outfit = upperToOutfit(state)
    ;(['outer', 'middleware', 'top'] as const).forEach(slot => {
      if (outfit[slot]) { const c = COLORS_60[outfit[slot]!]; if (c) hex[slot] = c.hex }
    })
    if (!hex.top && state.upper.length === 0) hex.top = '#ffffff'
    if (state.bottomColor) { const c = COLORS_60[state.bottomColor]; if (c) hex.bottom = c.hex } else hex.bottom = '#1C1917'
    if (state.shoesColor) { const c = COLORS_60[state.shoesColor]; if (c) hex.shoes = c.hex }
    if (state.scarfColor) { const c = COLORS_60[state.scarfColor]; if (c) hex.scarf = c.hex }
    if (state.hatColor) { const c = COLORS_60[state.hatColor]; if (c) hex.hat = c.hex }
    return hex
  }, [state])

  const isComplete = useMemo(() => state.upper.length >= 1 && state.bottomColor != null && state.shoesColor != null, [state])

  return {
    step, state, history, vizCollapsed, editMode,
    setVizCollapsed, setEditMode,
    pushStep, goBack, update, reset,
    selectStyle,
    addUpper, editUpper, removeUpper, setSimpleColor, applyOutfit,
    getColorRecommendations, getScore, getEvalResult, calcScoreDelta, getGuide, getBestMoves, applyMove,
    predictSlot: (tmpItemId: string, editIdx?: number) => predictSlot(state.upper, tmpItemId, editIdx),
    outfitHex, isComplete,
    get outerType() { return getOuterType(state.upper) },
    get midType() { return getMidType(state.upper) },
  }
}

export type BuildHook = ReturnType<typeof useBuild>
