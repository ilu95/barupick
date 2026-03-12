// @ts-nocheck
// ═══════════════════════════════════════════════════════
// useWardrobe.ts — 옷장 데이터 공통 훅
// 6대 기능(오늘의코디, 구매시뮬, 상황추천, 활용도, 컴포트존, 등급)의 공통 인프라
// ═══════════════════════════════════════════════════════
import { useState, useCallback, useMemo } from 'react'
import { COLORS_60, hcl } from '@/lib/colors'
import { evaluationSystem } from '@/lib/evaluation'
import { profile } from '@/lib/profile'

// ─── 타입 정의 ───

export interface WardrobeItem {
  id: string
  category: string       // 'outer' | 'middleware' | 'top' | 'bottom' | 'shoes' | 'scarf' | 'hat'
  color: string          // COLORS_60 키
  colorKey?: string      // 레거시 호환
  name?: string
  photoThumb?: string
  createdAt: string | number
  lastWornAt?: number
  wornCount?: number
}

export interface OutfitCombo {
  outfit: Record<string, string>
  score: number
  items?: WardrobeItem[]
}

export interface ColorProfile {
  totalItems: number
  colorCounts: Record<string, number>
  categoryCounts: Record<string, number>
  temperatureBias: 'warm' | 'cool' | 'neutral'
  topColors: { colorKey: string; count: number; percentage: number }[]
  hclDistribution: { avgH: number; avgC: number; avgL: number; stdH: number }
}

const STORAGE_KEY = 'sp_wardrobe'

// ─── 카테고리 정규화 (한글 → 영문 호환) ───
const CAT_MAP: Record<string, string> = {
  '아우터': 'outer', '미들웨어': 'middleware', '상의': 'top',
  '하의': 'bottom', '신발': 'shoes', '목도리': 'scarf', '모자': 'hat',
}

function normalizeCategory(cat: string): string {
  return CAT_MAP[cat] || cat
}

function getItemColor(item: any): string | null {
  return item.color || item.colorKey || null
}

// ─── 퍼센타일 계산 (상대 등급) ───

export function getScorePercentile(score: number): { percentile: number; label: string } | null {
  try {
    const records = JSON.parse(localStorage.getItem('sp_ootd_records') || '[]')
    const savedCoords = JSON.parse(localStorage.getItem('cs_saved') || '[]')
    const scores = [
      ...records.map((r: any) => r.score),
      ...savedCoords.map((s: any) => s.score),
    ].filter((s: number) => s > 0)

    if (scores.length < 5) return null  // 데이터 부족 시 미표시

    const below = scores.filter((s: number) => s < score).length
    const percentile = Math.round((below / scores.length) * 100)
    const topPct = 100 - percentile

    if (topPct <= 50) return { percentile: topPct, label: `상위 ${topPct}%` }
    return null  // 하위 50%는 표시 안 함
  } catch {
    return null
  }
}

// ─── 메인 훅 ───

export function useWardrobe() {
  const [items, setItems] = useState<WardrobeItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch { return [] }
  })

  // 새로고침 (외부에서 localStorage 변경 시)
  const refresh = useCallback(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))
    } catch { setItems([]) }
  }, [])

  // ─── 카테고리별 아이템 ───
  const byCategory = useMemo(() => {
    const map: Record<string, WardrobeItem[]> = {}
    items.forEach(item => {
      const cat = normalizeCategory(item.category)
      const color = getItemColor(item)
      if (!color) return
      if (!map[cat]) map[cat] = []
      map[cat].push({ ...item, category: cat, color })
    })
    return map
  }, [items])

  // ─── 특정 카테고리 아이템 ───
  const getItems = useCallback((category?: string): WardrobeItem[] => {
    if (!category) return items
    return byCategory[normalizeCategory(category)] || []
  }, [items, byCategory])

  // ─── 옷장으로 만들 수 있는 모든 코디 조합 생성 ───
  const generateAllCombos = useCallback((opts?: {
    fixedSlot?: string
    fixedColor?: string
    includeItem?: { category: string; color: string }  // 가상 아이템 추가 (구매 시뮬용)
    maxCombos?: number
  }): OutfitCombo[] => {
    const { fixedSlot, fixedColor, includeItem, maxCombos = 500 } = opts || {}
    const pc = profile.getPersonalColor()

    // 카테고리별 색상 풀 구성
    const pools: Record<string, string[]> = {}
    const workItems = [...items]

    // 가상 아이템 추가 (구매 시뮬레이션)
    if (includeItem) {
      workItems.push({
        id: '_sim_' + Date.now(),
        category: includeItem.category,
        color: includeItem.color,
        createdAt: Date.now(),
      })
    }

    workItems.forEach(item => {
      const cat = normalizeCategory(item.category)
      const color = getItemColor(item)
      if (!color || !COLORS_60[color]) return
      if (!pools[cat]) pools[cat] = []
      if (!pools[cat].includes(color)) pools[cat].push(color)
    })

    // 고정 슬롯 적용
    if (fixedSlot && fixedColor) {
      pools[fixedSlot] = [fixedColor]
    }

    // 필수 슬롯: top, bottom, shoes (최소 조건)
    const requiredSlots = ['top', 'bottom', 'shoes']
    for (const slot of requiredSlots) {
      if (!pools[slot] || pools[slot].length === 0) return []
    }

    // 선택 슬롯: outer, middleware (있으면 포함하되, "없음" 옵션도 추가)
    const optionalSlots = ['outer', 'middleware'].filter(s => pools[s] && pools[s].length > 0)
    // optional 슬롯에는 "미착용" 옵션 추가 → 아우터 없는 조합도 생성됨
    // 단, fixedSlot으로 고정된 슬롯은 제외
    optionalSlots.forEach(s => {
      if (s !== fixedSlot) { pools[s] = ['', ...pools[s]] }
    })
    const activeSlots = [...requiredSlots, ...optionalSlots]

    // 조합 생성 (카테시안 곱)
    let combos: Record<string, string>[] = [{}]

    for (const slot of activeSlots) {
      const pool = pools[slot]
      if (!pool || pool.length === 0) continue
      const next: Record<string, string>[] = []
      for (const combo of combos) {
        // 성능 제한: 조합 수 폭발 방지
        const samplePool = pool.length > 5 ? pool.slice(0, 5) : pool
        for (const color of samplePool) {
          next.push({ ...combo, [slot]: color })
        }
        if (next.length > maxCombos) break
      }
      combos = next.slice(0, maxCombos)
    }

    // 점수 계산
    const results: OutfitCombo[] = combos.map(outfit => {
      try {
        const result = evaluationSystem.evaluate(outfit, pc)
        return { outfit, score: result.total }
      } catch {
        return { outfit, score: 0 }
      }
    }).filter(c => c.score > 0)

    // 점수 내림차순 정렬
    results.sort((a, b) => b.score - a.score)
    return results
  }, [items])

  // ─── 특정 아이템 고정 후 매칭 조합 찾기 (②번 핵심) ───
  const findMatchingOutfits = useCallback((category: string, colorKey: string): OutfitCombo[] => {
    return generateAllCombos({ fixedSlot: normalizeCategory(category), fixedColor: colorKey })
  }, [generateAllCombos])

  // ─── 구매 시뮬레이션 (②번) ───
  const simulatePurchase = useCallback((category: string, colorKey: string): {
    currentCombos: number
    afterCombos: number
    comboDelta: number
    matchingOutfits: OutfitCombo[]
    avgScore: number
    bestScore: number
    verdict: 'strong_buy' | 'buy' | 'weak' | 'skip'
    reason: string
  } => {
    const cat = normalizeCategory(category)
    const threshold = 75

    // 현재 옷장 고점수 조합 수
    const currentAll = generateAllCombos()
    const currentCombos = currentAll.filter(c => c.score >= threshold).length

    // 새 아이템 추가 후 전체 고점수 조합 수
    const afterAll = generateAllCombos({ includeItem: { category: cat, color: colorKey } })
    const afterCombos = afterAll.filter(c => c.score >= threshold).length

    // 새 아이템이 포함된 조합 (결과 표시용)
    const matchingOutfits = afterAll.filter(c => c.outfit[cat] === colorKey)
      .sort((a, b) => b.score - a.score)

    const comboDelta = afterCombos - currentCombos
    const avgScore = matchingOutfits.length > 0
      ? Math.round(matchingOutfits.reduce((s, c) => s + c.score, 0) / matchingOutfits.length)
      : 0
    const bestScore = matchingOutfits.length > 0 ? matchingOutfits[0].score : 0

    let verdict: 'strong_buy' | 'buy' | 'weak' | 'skip'
    let reason: string
    if (comboDelta >= 5 && avgScore >= 80) {
      verdict = 'strong_buy'
      reason = `강력 추천! ${comboDelta}개의 고점수 코디가 새로 가능해요`
    } else if (comboDelta >= 3) {
      verdict = 'buy'
      reason = `좋은 선택! 기존 옷장과 ${comboDelta}개 조합이 잘 어울려요`
    } else if (comboDelta >= 1) {
      verdict = 'weak'
      reason = `어울리는 조합이 ${comboDelta}개로 적어요. 신중하게 고려해보세요`
    } else {
      verdict = 'skip'
      reason = '현재 옷장과 잘 맞지 않아요'
    }

    return { currentCombos, afterCombos, comboDelta, matchingOutfits: matchingOutfits.slice(0, 10), avgScore, bestScore, verdict, reason }
  }, [generateAllCombos])

  // ─── 아이템별 활용도 계산 (④번) ───
  const calculateItemUtility = useCallback((targetItem: WardrobeItem): {
    highScoreCombos: number
    avgScore: number
    grade: 'high' | 'medium' | 'low'
    bestPartner?: { category: string; color: string; score: number }
  } => {
    const cat = normalizeCategory(targetItem.category)
    const color = getItemColor(targetItem)
    if (!color) return { highScoreCombos: 0, avgScore: 0, grade: 'low' }

    const combos = findMatchingOutfits(cat, color)
    const highScore = combos.filter(c => c.score >= 75)

    const avgScore = combos.length > 0
      ? Math.round(combos.reduce((s, c) => s + c.score, 0) / combos.length)
      : 0

    const grade = highScore.length >= 10 ? 'high' : highScore.length >= 4 ? 'medium' : 'low'

    // 가장 잘 어울리는 조합의 파트너
    let bestPartner: { category: string; color: string; score: number } | undefined
    if (combos.length > 0) {
      const best = combos[0]
      const partnerEntry = Object.entries(best.outfit).find(([k, v]) => k !== cat && v)
      if (partnerEntry) {
        bestPartner = { category: partnerEntry[0], color: partnerEntry[1], score: best.score }
      }
    }

    return { highScoreCombos: highScore.length, avgScore, grade, bestPartner }
  }, [findMatchingOutfits])

  // ─── 컬러 프로필 분석 (⑤번) ───
  const getColorProfile = useCallback((): ColorProfile => {
    const colorCounts: Record<string, number> = {}
    const categoryCounts: Record<string, number> = {}
    let warmCount = 0, coolCount = 0
    const hValues: number[] = []
    const cValues: number[] = []
    const lValues: number[] = []

    items.forEach(item => {
      const color = getItemColor(item)
      const cat = normalizeCategory(item.category)
      if (!color || !COLORS_60[color]) return

      colorCounts[color] = (colorCounts[color] || 0) + 1
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1

      // 색온도
      const colorData = COLORS_60[color]
      if (colorData) {
        try {
          const [h, c, l] = hcl(colorData.hex)
          hValues.push(h)
          cValues.push(c)
          lValues.push(l)
        } catch {}
        // 간이 온도 분류
        const warmKeys = ['red', 'orange', 'coral', 'salmon', 'peach', 'yellow', 'gold', 'mustard', 'brown', 'camel', 'beige', 'cream', 'ivory', 'terracotta', 'rust', 'burgundy', 'wine', 'olive', 'khaki', 'tan', 'taupe']
        const coolKeys = ['blue', 'navy', 'skyblue', 'lightblue', 'cobalt', 'indigo', 'purple', 'lavender', 'plum', 'violet', 'mint', 'teal', 'emerald']
        if (warmKeys.includes(color)) warmCount++
        else if (coolKeys.includes(color)) coolCount++
      }
    })

    const total = items.filter(i => getItemColor(i)).length
    const topColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([colorKey, count]) => ({ colorKey, count, percentage: Math.round((count / total) * 100) }))

    const temperatureBias = warmCount > coolCount * 1.5 ? 'warm'
      : coolCount > warmCount * 1.5 ? 'cool' : 'neutral'

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    const std = (arr: number[]) => {
      if (arr.length < 2) return 0
      const m = avg(arr)
      return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length)
    }

    return {
      totalItems: total,
      colorCounts,
      categoryCounts,
      temperatureBias,
      topColors,
      hclDistribution: {
        avgH: Math.round(avg(hValues)),
        avgC: Math.round(avg(cValues)),
        avgL: Math.round(avg(lValues)),
        stdH: Math.round(std(hValues)),
      },
    }
  }, [items])

  // ─── 착용 기록 업데이트 ───
  const markWorn = useCallback((colorKeys: string[]) => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      const now = Date.now()
      let changed = false
      stored.forEach((item: any) => {
        const color = getItemColor(item)
        if (color && colorKeys.includes(color)) {
          item.lastWornAt = now
          item.wornCount = (item.wornCount || 0) + 1
          changed = true
        }
      })
      if (changed) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
        setItems(stored)
      }
    } catch {}
  }, [])

  return {
    items,
    byCategory,
    refresh,
    getItems,
    generateAllCombos,
    findMatchingOutfits,
    simulatePurchase,
    calculateItemUtility,
    getColorProfile,
    markWorn,
  }
}
