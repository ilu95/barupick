// @ts-nocheck
import { useState, useCallback, useRef } from 'react'
import { COLORS_60 } from '@/lib/colors'
import { STYLE_GUIDE, MOOD_GROUPS, LAYER_LEVELS } from '@/lib/styles'
import { STYLE_MOODS } from '@/lib/styleMoods'
import { CATEGORY_NAMES } from '@/lib/categories'
import { PERSONAL_COLOR_12 } from '@/lib/personalColor'
import { BODY_GUIDE_DATA } from '@/lib/bodyType'
import { profile } from '@/lib/profile'
import { evaluationSystem } from '@/lib/evaluation'
import { calculateHarmonyV6 } from '@/lib/recommend'

// @ts-nocheck

export type BuildMode = 'coord' | 'evaluate'
export type BuildStep = 'style' | 'item' | 'garment' | 'color' | 'ask' | 'fabric' | 'result' | 'improve'

export interface BuildState {
  mode: BuildMode
  style: string | null
  fabricMode: boolean
  outerType: 'coat' | 'jacket' | 'padding'
  midType: 'knit' | 'cardigan' | 'vest'
  colors: Record<string, string | null>
  fabrics: Record<string, string | null>
  currentItem: string
  startItem: string | null
  itemQueue: (string | { item: string; askFirst: boolean })[]
}

const initialColors = (): Record<string, string | null> => ({
  top: null, bottom: null, outer: null, middleware: null, scarf: null, hat: null, shoes: null,
})

const initialState = (mode: BuildMode = 'coord'): BuildState => ({
  mode,
  style: null,
  fabricMode: false,
  outerType: 'coat',
  midType: 'knit',
  colors: initialColors(),
  fabrics: {},
  currentItem: 'top',
  startItem: null,
  itemQueue: [],
})

export function useBuild(mode: BuildMode = 'coord') {
  const [step, setStep] = useState<BuildStep>('style')
  const [state, setState] = useState<BuildState>(initialState(mode))
  const [history, setHistory] = useState<BuildStep[]>([])
  const [vizCollapsed, setVizCollapsed] = useState(false)

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

  // ── 스타일 선택 ──
  const selectStyle = useCallback((style: string | null) => {
    update({ style })
    pushStep('item')
  }, [])

  // ── 시작 부위 선택 ──
  const selectStartItem = useCallback((item: string) => {
    const required = ['top', 'bottom'].filter(i => i !== item)
    const allOptional = ['outer', 'middleware', 'scarf', 'hat', 'shoes']
    const optional = allOptional.filter(i => i !== item && !required.includes(i))

    const queue: (string | { item: string; askFirst: boolean })[] = [
      item,
      ...required,
      ...optional.map(i => ({ item: i, askFirst: true })),
    ]

    update({ startItem: item, currentItem: item, itemQueue: queue })

    if (item === 'outer' || item === 'middleware') {
      pushStep('garment')
    } else {
      pushStep('color')
    }
  }, [])

  // ── 옷 종류 설정 ──
  const setGarment = useCallback((type: 'outerType' | 'midType', value: string) => {
    update({ [type]: value } as any)
  }, [])

  const confirmGarment = useCallback(() => {
    pushStep('color')
  }, [])

  // ── 색상 선택 ──
  const selectColor = useCallback((colorKey: string) => {
    setState(prev => {
      const colors = { ...prev.colors, [prev.currentItem]: colorKey }
      return { ...prev, colors }
    })
  }, [])

  // ── 색상 확인 → 다음 아이템 ──
  const confirmColor = useCallback(() => {
    setState(prev => {
      const queue = [...prev.itemQueue]
      queue.shift() // 현재 아이템 제거
      return { ...prev, itemQueue: queue }
    })
    processNext()
  }, [state])

  // ── 다음 아이템 처리 ──
  const processNext = useCallback(() => {
    const queue = [...state.itemQueue]
    queue.shift()

    if (queue.length === 0) {
      // 모든 아이템 처리 완료
      if (state.fabricMode) {
        pushStep('fabric')
      } else {
        pushStep('result')
      }
      return
    }

    const next = queue[0]
    if (typeof next === 'string') {
      update({ currentItem: next, itemQueue: queue })
      if (next === 'outer' || next === 'middleware') {
        pushStep('garment')
      } else {
        pushStep('color')
      }
    } else {
      // 선택적 아이템 → 물어보기
      update({ currentItem: next.item, itemQueue: queue })
      pushStep('ask')
    }
  }, [state])

  // ── 선택적 아이템 응답 ──
  const answerOptional = useCallback((willWear: boolean) => {
    if (willWear) {
      setState(prev => {
        const queue = [...prev.itemQueue]
        queue[0] = prev.currentItem // askFirst 제거
        return { ...prev, itemQueue: queue }
      })
      const item = state.currentItem
      if (item === 'outer' || item === 'middleware') {
        pushStep('garment')
      } else {
        pushStep('color')
      }
    } else {
      // 건너뛰기
      setState(prev => {
        const queue = [...prev.itemQueue]
        queue.shift()
        if (queue.length === 0) {
          if (prev.fabricMode) {
            setTimeout(() => pushStep('fabric'), 0)
          } else {
            setTimeout(() => pushStep('result'), 0)
          }
          return { ...prev, itemQueue: queue }
        }
        const next = queue[0]
        const nextItem = typeof next === 'string' ? next : next.item
        if (typeof next !== 'string') {
          setTimeout(() => pushStep('ask'), 0)
        } else if (nextItem === 'outer' || nextItem === 'middleware') {
          setTimeout(() => pushStep('garment'), 0)
        } else {
          setTimeout(() => pushStep('color'), 0)
        }
        return { ...prev, currentItem: nextItem, itemQueue: queue }
      })
    }
  }, [state])

  // ── 색상 추천 (원본 getColorRecommendations 포팅) ──
  const getColorRecommendations = useCallback((item: string): { key: string; score: number; reason: string; badges: { pc: boolean; body: boolean } }[] => {
    if (state.mode === 'evaluate') return []

    const DEPENDENCY_MAP: Record<string, string[]> = {
      outer: ['top', 'middleware', 'bottom'],
      middleware: ['top', 'bottom'],
      top: ['bottom'],
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

    const fitMode = profile.getFitMode()
    const isFaceNear = FACE_NEAR.includes(item)
    const pcType = (fitMode && isFaceNear) ? profile.getPersonalColor() : null
    const pcData = pcType ? (PERSONAL_COLOR_12 as any)[pcType] : null
    const bestColors: string[] = (pcData?.bestColors || []).filter((c: string) => COLORS_60[c])
    const avoidColors: string[] = (pcData?.avoidColors || pcData?.worstColors || []).filter((c: string) => COLORS_60[c])

    const bt = fitMode ? profile.getBodyType() : null
    const btData = bt ? (BODY_GUIDE_DATA as any)[bt] : null
    const bodyRule = btData?.colorRules?.[item] || null

    const checkBodyMatch = (rule: string | null, colorKey: string) => {
      if (!rule || rule === 'any') return false
      const c = COLORS_60[colorKey]
      if (!c) return false
      const lightness = c.hcl[2]
      if (rule === 'light') return lightness >= 55
      if (rule === 'dark') return lightness <= 45
      if (rule === 'match-shoes') return state.colors.shoes ? colorKey === state.colors.shoes : false
      if (rule === 'match-bottom') return state.colors.bottom ? colorKey === state.colors.bottom : false
      return false
    }

    // 이미 선택된 관련 색상
    const related = (DEPENDENCY_MAP[item] || []).filter(cat => state.colors[cat])
    const baseColors = related.map(cat => state.colors[cat]!).filter(Boolean)

    // ─── 첫 번째 부위 (baseColors 없음): PC + 체형 + 기본 아이템 ───
    if (baseColors.length === 0) {
      const recs: { key: string; score: number; reason: string; badges: { pc: boolean; body: boolean } }[] = []
      const seen = new Set<string>()

      // Phase 1: 퍼스널컬러 Best
      if (isFaceNear && bestColors.length > 0) {
        bestColors.forEach(k => {
          const bm = checkBodyMatch(bodyRule, k)
          recs.push({ key: k, score: 100 + (bm ? 15 : 0), reason: bm ? '퍼스널컬러 + 체형' : '퍼스널컬러', badges: { pc: true, body: bm } })
          seen.add(k)
        })
      }

      // Phase 2: 체형 보완 추천
      if (fitMode && bodyRule && bodyRule !== 'any') {
        Object.keys(COLORS_60).forEach(k => {
          if (seen.has(k) || avoidColors.includes(k)) return
          const bm = checkBodyMatch(bodyRule, k)
          if (bm) {
            recs.push({ key: k, score: 80 + (COMMON_WARDROBE[k] || 0), reason: '체형 보완', badges: { pc: false, body: true } })
            seen.add(k)
          }
        })
      }

      // Phase 3: 스타일 기반 추천
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

      // Phase 4: 기본 아이템
      Object.entries(COMMON_WARDROBE).forEach(([k, v]) => {
        if (seen.has(k) || avoidColors.includes(k)) return
        const bm = checkBodyMatch(bodyRule, k)
        recs.push({ key: k, score: v + (bm ? 10 : 0), reason: '기본 아이템', badges: { pc: false, body: bm } })
        seen.add(k)
      })

      return recs.sort((a, b) => b.score - a.score).slice(0, 20)
    }

    // ─── 2번째 이후 부위: 기존 색상과의 조화도 계산 ───
    const recs: { key: string; score: number; reason: string; badges: { pc: boolean; body: boolean } }[] = []

    Object.keys(COLORS_60).forEach(targetKey => {
      if (baseColors.includes(targetKey)) return

      // calculateHarmonyV6 호출
      let totalScore = 0
      baseColors.forEach(baseKey => {
        try {
          const h = calculateHarmonyV6(baseKey, targetKey)
          totalScore += h.score
        } catch { totalScore += 50 }
      })
      let avgScore = totalScore / baseColors.length

      // 퍼스널컬러 보너스
      let pcMatch = false
      const bodyMatch = fitMode ? checkBodyMatch(bodyRule, targetKey) : false
      if (pcType && isFaceNear) {
        if (bestColors.includes(targetKey)) { pcMatch = true; avgScore += 20 }
        else if (avoidColors.includes(targetKey)) avgScore -= 15
      }

      // 체형 보너스
      if (bodyMatch) avgScore += (isFaceNear ? 4 : 15)

      // 체형 반대 페널티
      if (fitMode && bodyRule && bodyRule !== 'any' && !bodyMatch) {
        const c = COLORS_60[targetKey]
        if (c) {
          const L = c.hcl[2]
          const penalty = isFaceNear ? 3 : 8
          if (bodyRule === 'light' && L < 35) avgScore -= penalty
          if (bodyRule === 'dark' && L > 70) avgScore -= penalty
        }
      }

      avgScore += COMMON_WARDROBE[targetKey] || 0

      if (avgScore >= 45) {
        recs.push({
          key: targetKey,
          score: Math.round(avgScore),
          reason: pcMatch ? '퍼스널컬러' : bodyMatch ? '체형 보완' : '컬러 조화',
          badges: { pc: pcMatch, body: bodyMatch },
        })
      }
    })

    return recs.sort((a, b) => b.score - a.score).slice(0, 20)
  }, [state.style, state.mode, state.colors])

  // ── 결과에서 색상 개선 ──
  const editPart = useCallback((part: string) => {
    update({ currentItem: part })
    pushStep('color')
  }, [])

  // ── 리셋 ──
  const reset = useCallback(() => {
    setState(initialState(mode))
    setStep('style')
    setHistory([])
  }, [mode])

  // ── 점수 계산 (간이) ──
  const getScore = useCallback(() => {
    const outfit: Record<string, string> = {}
    Object.entries(state.colors).forEach(([k, v]) => { if (v) outfit[k] = v })
    if (Object.keys(outfit).length < 2) return 0
    try {
      const pc = profile.getPersonalColor()
      return evaluationSystem.evaluate(outfit, pc).total
    } catch { return 0 }
  }, [state])

  // 전체 평가 결과 (점수 분해도 포함)
  const getEvalResult = useCallback(() => {
    const outfit: Record<string, string> = {}
    Object.entries(state.colors).forEach(([k, v]) => { if (v) outfit[k] = v })
    if (Object.keys(outfit).length < 2) return null
    try {
      const pc = profile.getPersonalColor()
      return evaluationSystem.evaluate(outfit, pc)
    } catch { return null }
  }, [state])

  // 색상 교체 시 점수 변화 미리보기
  const calcScoreDelta = useCallback((part: string, newColorKey: string) => {
    const outfit: Record<string, string> = {}
    Object.entries(state.colors).forEach(([k, v]) => { if (v) outfit[k] = v })
    if (Object.keys(outfit).length < 2) return 0
    try {
      const pc = profile.getPersonalColor()
      const baseScore = evaluationSystem.evaluate(outfit, pc).total
      const testOutfit = { ...outfit, [part]: newColorKey }
      const newScore = evaluationSystem.evaluate(testOutfit, pc).total
      return newScore - baseScore
    } catch { return 0 }
  }, [state])

  // outfitHex for mannequin
  const outfitHex = Object.entries(state.colors).reduce((acc, [k, v]) => {
    if (v) { const c = COLORS_60[v]; if (c) acc[k] = c.hex }
    return acc
  }, {} as Record<string, string>)

  return {
    step, state, history, vizCollapsed,
    setVizCollapsed,
    pushStep, goBack, update, reset,
    selectStyle, selectStartItem,
    setGarment, confirmGarment,
    selectColor, confirmColor, processNext,
    answerOptional,
    getColorRecommendations, editPart, getScore, getEvalResult, calcScoreDelta,
    outfitHex,
  }
}
