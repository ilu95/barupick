// @ts-nocheck
import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MOOD_GROUPS, LAYER_LEVELS, STYLE_GUIDE, ITEMS_CATALOG, type ItemDef } from '@/lib/styles'
import { getDynamicCombos } from '@/lib/recommend'
import { evaluationSystem } from '@/lib/evaluation'
import { profile } from '@/lib/profile'

export type RecStep = 'mood' | 'style' | 'pick' | 'results' | 'detail'

export interface ComboResult {
  outfit: Record<string, string>
  name: string
  score: number
  tags?: string[]
  tip?: string
  style?: string
  evalResult?: any
}

export interface RecState {
  mood: string | null
  style: string | null
  // 아이템 선택 (pick 단계)
  pickedItems: string[]        // ITEMS_CATALOG item ids
  // 자동 산출
  layerType: string
  outerType: 'coat' | 'jacket' | 'padding'
  midType: 'knit' | 'cardigan' | 'vest'
  // 컬러 고정
  pinned: Record<string, string>
  // 결과
  results: ComboResult[]
  weatherLayerLocked: boolean
  detailIdx: number
  fitMode: boolean
}

const initialState: RecState = {
  mood: null,
  style: null,
  pickedItems: [],
  layerType: 'simple',
  outerType: 'coat',
  midType: 'knit',
  pinned: {},
  results: [],
  weatherLayerLocked: false,
  detailIdx: 0,
  fitMode: false,
}

// ─── 아이템 선택 → 레이어/타입 자동 산출 ───
export function itemsToLayerInfo(itemIds: string[]) {
  const items = itemIds.map(id => ITEMS_CATALOG.find(i => i.id === id)).filter(Boolean) as ItemDef[]
  const sorted = [...items].sort((a, b) => b.outerness - a.outerness)

  let hasOuter = false
  let hasMid = false
  let outerType: 'coat' | 'jacket' | 'padding' = 'coat'
  let midType: 'knit' | 'cardigan' | 'vest' = 'knit'

  for (const item of sorted) {
    if (item.outerType) {
      hasOuter = true
      outerType = item.outerType
    } else if (item.midType) {
      hasMid = true
      midType = item.midType
    }
  }

  let layerType = 'simple'
  if (hasOuter && hasMid) layerType = 'layered'
  else if (hasOuter) layerType = 'basic'
  else if (hasMid) layerType = 'mid_inner'

  const partKeys = LAYER_LEVELS[layerType]?.partKeys || ['top', 'bottom', 'shoes']

  return { layerType, outerType, midType, partKeys, hasOuter, hasMid }
}

// 스타일 → 무드그룹 역 매핑
function findMoodForStyle(style: string): string | null {
  for (const [moodKey, group] of Object.entries(MOOD_GROUPS)) {
    if (group.styles.includes(style)) return moodKey
  }
  return null
}

export function useRecommend() {
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState<RecStep>('mood')
  const [state, setState] = useState<RecState>(initialState)
  const [history, setHistory] = useState<RecStep[]>([])
  const initRef = useRef(false)

  // URL에서 style 파라미터 → 바로 pick 단계로
  useEffect(() => {
    if (initRef.current) return
    const styleParam = searchParams.get('style')
    if (styleParam && STYLE_GUIDE[styleParam]) {
      initRef.current = true
      const mood = findMoodForStyle(styleParam)
      setState(prev => ({ ...prev, mood, style: styleParam }))
      setStep('pick')
      setHistory(['mood', 'style'])
    }
  }, [searchParams])

  const pushStep = useCallback((next: RecStep) => {
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

  const update = useCallback((partial: Partial<RecState>) => {
    setState(prev => ({ ...prev, ...partial }))
  }, [])

  // ─── 무드 선택 ───
  const selectMood = useCallback((mood: string | null) => {
    update({ mood })
    if (mood) {
      pushStep('style')
    } else {
      // "전체에서 추천" → pick으로
      pushStep('pick')
    }
  }, [])

  // ─── 스타일 선택 ───
  const selectStyle = useCallback((style: string | null) => {
    update({ style })
    pushStep('pick')
  }, [])

  // ─── 아이템 토글 (pick 단계) ───
  const toggleItem = useCallback((itemId: string) => {
    setState(prev => {
      const picked = prev.pickedItems.includes(itemId)
        ? prev.pickedItems.filter(id => id !== itemId)
        : [...prev.pickedItems, itemId]
      const info = itemsToLayerInfo(picked)
      return { ...prev, pickedItems: picked, ...info }
    })
  }, [])

  // ─── pick에서 추천받기 ───
  const generateFromPick = useCallback(() => {
    const info = itemsToLayerInfo(state.pickedItems)
    const newState = { ...state, ...info }
    const results = generateRecommendations(newState)
    setState(prev => ({ ...prev, ...newState, results }))
    pushStep('results')
  }, [state])

  // ─── 결과에서 아이템 추가/제거 (실시간 재생성) ───
  const toggleItemInResults = useCallback((itemId: string) => {
    setState(prev => {
      const picked = prev.pickedItems.includes(itemId)
        ? prev.pickedItems.filter(id => id !== itemId)
        : [...prev.pickedItems, itemId]
      const info = itemsToLayerInfo(picked)
      const newState = { ...prev, pickedItems: picked, ...info }
      const results = generateRecommendations(newState)
      return { ...newState, results }
    })
  }, [])

  // ─── 컬러 고정 (결과에서) ───
  const togglePin = useCallback((part: string, colorKey: string) => {
    setState(prev => {
      const pinned = { ...prev.pinned }
      if (pinned[part] === colorKey) {
        delete pinned[part]
      } else {
        pinned[part] = colorKey
      }
      const newState = { ...prev, pinned }
      const results = generateRecommendations(newState)
      return { ...newState, results }
    })
  }, [])

  const clearPin = useCallback((part: string) => {
    setState(prev => {
      const pinned = { ...prev.pinned }
      delete pinned[part]
      const newState = { ...prev, pinned }
      const results = generateRecommendations(newState)
      return { ...newState, results }
    })
  }, [])

  const clearAllPins = useCallback(() => {
    setState(prev => {
      const newState = { ...prev, pinned: {} }
      const results = generateRecommendations(newState)
      return { ...newState, results }
    })
  }, [])

  // ─── 셔플 (결과에서 다시 생성) ───
  const regenerate = useCallback(() => {
    setState(prev => {
      const results = generateRecommendations(prev, true)
      return { ...prev, results }
    })
  }, [])

  // ─── 상세 보기 ───
  const openDetail = useCallback((idx: number) => {
    update({ detailIdx: idx })
    pushStep('detail')
  }, [])

  // ─── fitMode 토글 ───
  const toggleFitMode = useCallback(() => {
    setState(prev => {
      const newState = { ...prev, fitMode: !prev.fitMode }
      const results = generateRecommendations(newState, true)
      return { ...newState, results }
    })
  }, [])

  // ─── 리셋 ───
  const reset = useCallback(() => {
    setState(initialState)
    setStep('mood')
    setHistory([])
  }, [])

  return {
    step, state, history,
    pushStep, goBack, update, reset,
    selectMood, selectStyle,
    toggleItem, generateFromPick,
    toggleItemInResults,
    togglePin, clearPin, clearAllPins,
    regenerate, openDetail,
    toggleFitMode,
  }
}

// ─── 추천 생성 함수 ───
function generateRecommendations(s: RecState, shuffle = false): ComboResult[] {
  const { mood, style, layerType, pinned } = s
  let results: ComboResult[] = []

  try {
    if (style) {
      results = getDynamicCombos(style, layerType, 30, pinned)
    } else if (mood && MOOD_GROUPS[mood]) {
      const styles = MOOD_GROUPS[mood].styles || []
      styles.forEach((st: string) => {
        try { results.push(...getDynamicCombos(st, layerType, 8, pinned)) } catch {}
      })
      results.sort((a, b) => b.score - a.score)
    } else {
      Object.keys(STYLE_GUIDE).forEach(st => {
        try { results.push(...getDynamicCombos(st, layerType, 4, pinned)) } catch {}
      })
      results.sort((a, b) => b.score - a.score)
    }
  } catch (e) {
    console.error('Recommendation generation error:', e)
  }

  if (results.length === 0) {
    results = generateFallbackCombos(s)
  }

  if (shuffle) {
    // Fisher-Yates 셔플 (상위 유지하되 약간 섞기)
    for (let i = results.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[results[i], results[j]] = [results[j], results[i]]
    }
  }

  return results.slice(0, 30)
}

function generateFallbackCombos(s: RecState): ComboResult[] {
  const { layerType, pinned } = s
  const layer = LAYER_LEVELS[layerType]
  if (!layer) return []
  const partKeys = layer.partKeys || ['top', 'bottom', 'shoes']

  const palettes = [
    { top: 'white', bottom: 'navy', outer: 'charcoal', shoes: 'brown', middleware: 'gray', scarf: 'beige' },
    { top: 'cream', bottom: 'olive', outer: 'camel', shoes: 'dark_brown', middleware: 'beige', scarf: 'ivory' },
    { top: 'lightgray', bottom: 'charcoal', outer: 'navy', shoes: 'black', middleware: 'white', scarf: 'gray' },
    { top: 'beige', bottom: 'brown', outer: 'olive', shoes: 'cognac', middleware: 'cream', scarf: 'camel' },
    { top: 'ivory', bottom: 'denim', outer: 'burgundy', shoes: 'brown', middleware: 'white', scarf: 'charcoal' },
    { top: 'white', bottom: 'black', outer: 'camel', shoes: 'white', middleware: 'lightgray', scarf: 'ivory' },
    { top: 'navy', bottom: 'khaki', outer: 'charcoal', shoes: 'brown', middleware: 'white', scarf: 'navy' },
    { top: 'cream', bottom: 'charcoal', outer: 'brown', shoes: 'black', middleware: 'beige', scarf: 'taupe' },
  ]

  return palettes.map((pal, i) => {
    const outfit: Record<string, string> = {}
    partKeys.forEach(pk => { outfit[pk] = pinned?.[pk] || pal[pk] || 'white' })
    let score = 50
    try {
      const pc = profile.getPersonalColor()
      const evalResult = evaluationSystem.evaluate(outfit, pc)
      score = evalResult?.total || 50
    } catch {}
    return { id: `fallback_${i}`, name: `기본 코디 ${i + 1}`, outfit, tags: ['기본'], tip: '기본 중립색 조합이에요', score, evalResult: null }
  })
}
