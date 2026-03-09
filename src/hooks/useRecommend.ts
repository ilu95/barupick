// @ts-nocheck
import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MOOD_GROUPS, LAYER_LEVELS, STYLE_GUIDE } from '@/lib/styles'
import { getDynamicCombos } from '@/lib/recommend'
import { evaluationSystem } from '@/lib/evaluation'
import { profile } from '@/lib/profile'

export type RecStep = 'mood' | 'style' | 'layer' | 'garment' | 'pin' | 'results' | 'detail'

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
  layerType: string
  outerType: 'coat' | 'jacket' | 'padding'
  midType: 'knit' | 'cardigan' | 'vest'
  pinned: Record<string, string>
  results: ComboResult[]
  weatherLayerLocked: boolean
  detailIdx: number
  fitMode: boolean
}

const initialState: RecState = {
  mood: null,
  style: null,
  layerType: 'basic',
  outerType: 'coat',
  midType: 'knit',
  pinned: {},
  results: [],
  weatherLayerLocked: false,
  detailIdx: 0,
  fitMode: false,
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

  // URL에서 style 파라미터 읽어서 해당 스타일로 바로 진입
  useEffect(() => {
    if (initRef.current) return
    const styleParam = searchParams.get('style')
    if (styleParam && STYLE_GUIDE[styleParam]) {
      initRef.current = true
      const mood = findMoodForStyle(styleParam)
      const newState = { ...initialState, mood, style: styleParam }
      // 바로 레이어 선택 단계로
      setState(newState)
      setStep('layer')
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

  // 무드 선택
  const selectMood = useCallback((mood: string | null) => {
    update({ mood })
    if (mood) {
      pushStep('style')
    } else {
      // "전체에서 추천"
      if (state.weatherLayerLocked) {
        generateAndGo()
      } else {
        pushStep('layer')
      }
    }
  }, [state.weatherLayerLocked])

  // 스타일 선택
  const selectStyle = useCallback((style: string | null) => {
    update({ style })
    if (state.weatherLayerLocked) {
      // 날씨 자동설정 → 바로 결과
      setTimeout(() => generateAndGoWithState({ ...state, style }), 0)
    } else {
      pushStep('layer')
    }
  }, [state])

  // 레이어 선택
  const selectLayer = useCallback((layerType: string) => {
    update({ layerType })
    const pk = LAYER_LEVELS[layerType]?.partKeys || []
    const hasOuter = pk.includes('outer')
    const hasMid = pk.includes('middleware')
    if (hasOuter || hasMid) {
      pushStep('garment')
    } else {
      setTimeout(() => generateAndGoWithState({ ...state, layerType }), 0)
    }
  }, [state])

  // 옷 종류 설정
  const setGarment = useCallback((type: 'outerType' | 'midType', value: string) => {
    update({ [type]: value } as any)
  }, [])

  // 옷 종류 확인 → 결과
  const confirmGarment = useCallback(() => {
    generateAndGoWithState(state)
  }, [state])

  // 핀 토글
  const togglePin = useCallback((part: string, colorKey: string) => {
    setState(prev => {
      const pinned = { ...prev.pinned }
      if (pinned[part] === colorKey) {
        delete pinned[part]
      } else {
        pinned[part] = colorKey
      }
      return { ...prev, pinned }
    })
  }, [])

  const clearPin = useCallback((part: string) => {
    setState(prev => {
      const pinned = { ...prev.pinned }
      delete pinned[part]
      return { ...prev, pinned }
    })
  }, [])

  const clearAllPins = useCallback(() => {
    update({ pinned: {} })
  }, [])

  // 결과에서 재생성
  const regenerate = useCallback(() => {
    generateAndGoWithState(state, true)
  }, [state])

  // 상세 보기
  const openDetail = useCallback((idx: number) => {
    update({ detailIdx: idx })
    pushStep('detail')
  }, [])

  // 핀 화면으로
  const goToPin = useCallback(() => {
    pushStep('pin')
  }, [])

  // 핀에서 추천받기
  const applyPinsAndGenerate = useCallback(() => {
    generateAndGoWithState(state, true)
  }, [state])

  // fitMode 토글
  const toggleFitMode = useCallback(() => {
    setState(prev => {
      const next = { ...prev, fitMode: !prev.fitMode }
      return next
    })
    // fitMode 변경 후 재생성
    setTimeout(() => generateAndGoWithState({ ...state, fitMode: !state.fitMode }, true), 0)
  }, [state])

  // ─── 추천 생성 핵심 로직 ───
  function generateAndGo() {
    generateAndGoWithState(state)
  }

  function generateAndGoWithState(s: RecState, stayOnResults = false) {
    const results = generateRecommendations(s)
    setState(prev => ({ ...prev, ...s, results }))
    if (!stayOnResults) {
      pushStep('results')
    }
  }

  // 리셋
  const reset = useCallback(() => {
    setState(initialState)
    setStep('mood')
    setHistory([])
  }, [])

  return {
    step, state, history,
    pushStep, goBack, update, reset,
    selectMood, selectStyle, selectLayer,
    setGarment, confirmGarment,
    togglePin, clearPin, clearAllPins,
    regenerate, openDetail, goToPin, applyPinsAndGenerate,
    toggleFitMode,
  }
}

// ─── 추천 생성 함수 (recommend.ts 엔진 연결) ───
function generateRecommendations(s: RecState): ComboResult[] {
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

  // 결과 0이면 폴백: 기본 중립색 조합 생성
  if (results.length === 0) {
    results = generateFallbackCombos(s)
  }

  return results.slice(0, 30)
}

// 폴백 조합 생성 (엔진 실패 시)
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
    partKeys.forEach(pk => {
      outfit[pk] = (pinned as any)?.[pk] || pal[pk] || 'white'
    })
    let score = 50
    try {
      const pc = profile.getPersonalColor()
      const evalResult = evaluationSystem.evaluate(outfit, pc)
      score = evalResult?.total || 50
    } catch {}
    return {
      id: `fallback_${i}`,
      name: `기본 코디 ${i + 1}`,
      outfit,
      tags: ['기본'],
      tip: '기본 중립색 조합이에요',
      score,
      evalResult: null,
    }
  })
}
