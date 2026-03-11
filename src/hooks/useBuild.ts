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
import { evaluationSystem } from '@/lib/evaluation'
import { calculateHarmonyV6 } from '@/lib/recommend'

export type BuildMode = 'coord' | 'evaluate'
export type BuildStep = 'style' | 'builder' | 'fabric' | 'result' | 'improve'
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
    if (slot === 'outer') return '바깥'
    if (slot === 'middleware') return '중간'
    return ''
  }
  const LABELS: Record<string, string> = { outer: '바깥', middleware: '중간', top: '안쪽', inner: '안쪽(속)', hidden: '' }
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
  const [step, setStep] = useState<BuildStep>('style')
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
    setStep('style')
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

  // ── 상체 아이템 수정 ──
  const editUpper = useCallback((index: number, itemId: string, colorKey: string) => {
    setState(prev => {
      const item = ITEMS_CATALOG.find(i => i.id === itemId)
      if (!item) return prev
      if (prev.upper.some((l, i) => i !== index && l.itemId === itemId)) return prev
      const newUpper = prev.upper.map((l, i) =>
        i === index ? { ...l, itemId: item.id, colorKey, outerness: item.outerness } : l
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
          recs.push({ key: k, score: 100 + (bm ? 15 : 0), reason: bm ? '퍼스널컬러 + 체형' : '퍼스널컬러', badges: { pc: true, body: bm } })
          seen.add(k)
        })
      }

      if (fitMode && bodyRule && bodyRule !== 'any') {
        Object.keys(COLORS_60).forEach(k => {
          if (seen.has(k) || avoidColors.includes(k)) return
          const bm = checkBodyMatch(bodyRule, k)
          if (bm) { recs.push({ key: k, score: 80 + (COMMON_WARDROBE[k] || 0), reason: '체형 보완', badges: { pc: false, body: true } }); seen.add(k) }
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
            recs.push({ key: k, score: 70 + (pcm ? 15 : 0) + (bm ? 10 : 0) + (COMMON_WARDROBE[k] || 0), reason: '스타일 추천', badges: { pc: pcm, body: bm } })
            seen.add(k)
          })
        }
      }

      Object.entries(COMMON_WARDROBE).forEach(([k, v]) => {
        if (seen.has(k) || avoidColors.includes(k)) return
        const bm = checkBodyMatch(bodyRule, k)
        recs.push({ key: k, score: v + (bm ? 10 : 0), reason: '기본 아이템', badges: { pc: false, body: bm } })
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
      const reason = pcMatch && bm ? '퍼스널컬러 + 체형' : pcMatch ? '퍼스널컬러' : bm ? '체형 보완' : '컬러 조화'
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
    addUpper, editUpper, removeUpper, setSimpleColor,
    getColorRecommendations, getScore, getEvalResult, calcScoreDelta,
    predictSlot: (tmpItemId: string, editIdx?: number) => predictSlot(state.upper, tmpItemId, editIdx),
    outfitHex, isComplete,
    get outerType() { return getOuterType(state.upper) },
    get midType() { return getMidType(state.upper) },
  }
}

export type BuildHook = ReturnType<typeof useBuild>
