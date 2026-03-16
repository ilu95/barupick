// @ts-nocheck
// ═══════════════════════════════════════════════════════
// useTodayCoord.ts — "오늘 뭐 입지?" + 상황 필터 추천
// 옷장 아이템 기반으로 3개 코디를 생성
// ═══════════════════════════════════════════════════════
import { useState, useCallback } from 'react'
import { COLORS_60, getColorName } from '@/lib/colors'
import { evaluationSystem } from '@/lib/evaluation'
import { profile } from '@/lib/profile'
import { getLayerAdvice, type WeatherData } from '@/hooks/useWeather'
import i18n from '@/i18n'

// ─── 상황별 색상 가중치 ───

export type Situation = 'daily' | 'interview' | 'date' | 'workout' | 'travel'

interface SituationWeight {
  bonusColors: string[]
  penaltyColors: string[]
  impressionLabel: string
}

const SITUATION_WEIGHTS: Record<Situation, SituationWeight> = {
  daily: {
    bonusColors: [],
    penaltyColors: [],
    get impressionLabel() { return i18n.t('todayCoord.impression.daily') },
  },
  interview: {
    bonusColors: ['navy', 'charcoal', 'white', 'lightgray', 'gray', 'black', 'cream'],
    penaltyColors: ['red', 'yellow', 'orange', 'pink', 'hotpink', 'coral'],
    get impressionLabel() { return i18n.t('todayCoord.impression.interview') },
  },
  date: {
    bonusColors: ['beige', 'cream', 'softpink', 'lightblue', 'olive', 'camel', 'ivory', 'lavender', 'peach'],
    penaltyColors: [],
    get impressionLabel() { return i18n.t('todayCoord.impression.date') },
  },
  workout: {
    bonusColors: ['black', 'gray', 'navy', 'white', 'charcoal'],
    penaltyColors: ['beige', 'cream', 'ivory', 'camel'],
    get impressionLabel() { return i18n.t('todayCoord.impression.workout') },
  },
  travel: {
    bonusColors: ['olive', 'khaki', 'beige', 'brown', 'navy', 'camel', 'tan', 'taupe'],
    penaltyColors: ['white', 'ivory', 'cream'],
    get impressionLabel() { return i18n.t('todayCoord.impression.travel') },
  },
}

export function getSituationOptions(): { key: Situation; label: string; emoji: string }[] {
  return [
    { key: 'daily', label: i18n.t('todayCoord.situation.daily'), emoji: '☕' },
    { key: 'interview', label: i18n.t('todayCoord.situation.interview'), emoji: '💼' },
    { key: 'date', label: i18n.t('todayCoord.situation.date'), emoji: '💕' },
    { key: 'workout', label: i18n.t('todayCoord.situation.workout'), emoji: '🏃' },
    { key: 'travel', label: i18n.t('todayCoord.situation.travel'), emoji: '✈️' },
  ]
}

// ─── 코디 결과 타입 ───

export interface TodayCoordResult {
  outfit: Record<string, string>
  score: number
  adjustedScore: number
  reasons: string[]
  impressionLabel: string
}

// ─── 날씨 → 아우터/미들웨어 포함 여부 ───

function shouldIncludeOuter(weather?: WeatherData | null): boolean {
  if (!weather) return false
  return weather.feels < 17
}

function shouldIncludeMiddleware(weather?: WeatherData | null): boolean {
  if (!weather) return false
  return weather.feels < 5
}

// ─── 메인 훅 ───

export function useTodayCoord() {
  const [results, setResults] = useState<TodayCoordResult[]>([])
  const [loading, setLoading] = useState(false)
  const [situation, setSituation] = useState<Situation>('daily')

  const generate = useCallback((weather?: WeatherData | null, overrideSituation?: Situation) => {
    setLoading(true)
    const activeSituation = overrideSituation || situation

    // requestAnimationFrame으로 UI 블로킹 방지
    requestAnimationFrame(() => {
      try {
        const items = JSON.parse(localStorage.getItem('sp_wardrobe') || '[]')
        if (items.length < 3) {
          setResults([])
          setLoading(false)
          return
        }

        const pc = profile.getPersonalColor()
        const recentRecords = JSON.parse(localStorage.getItem('sp_ootd_records') || '[]').slice(0, 3)
        const recentColors = new Set<string>()
        recentRecords.forEach((r: any) => {
          Object.values(r.colors || {}).forEach((c: any) => { if (c) recentColors.add(c) })
        })

        // 카테고리별 색상 풀
        const pools: Record<string, string[]> = {}
        items.forEach((item: any) => {
          const cat = item.category
          const color = item.color || item.colorKey
          if (!cat || !color || !COLORS_60[color]) return
          if (!pools[cat]) pools[cat] = []
          if (!pools[cat].includes(color)) pools[cat].push(color)
        })

        // 필수 슬롯 체크
        if (!pools.top?.length || !pools.bottom?.length || !pools.shoes?.length) {
          setResults([])
          setLoading(false)
          return
        }

        // 활성 슬롯 결정
        const activeSlots: string[] = []
        if (shouldIncludeOuter(weather) && pools.outer?.length) activeSlots.push('outer')
        if (shouldIncludeMiddleware(weather) && pools.middleware?.length) activeSlots.push('middleware')
        activeSlots.push('top', 'bottom', 'shoes')

        // 조합 생성 (카테시안 곱, 최대 600개)
        let combos: Record<string, string>[] = [{}]
        for (const slot of activeSlots) {
          const pool = pools[slot]
          if (!pool || pool.length === 0) continue
          const sample = pool.length > 6 ? [...pool].sort(() => Math.random() - 0.5).slice(0, 6) : pool
          const next: Record<string, string>[] = []
          for (const combo of combos) {
            for (const color of sample) {
              next.push({ ...combo, [slot]: color })
            }
            if (next.length > 600) break
          }
          combos = next.slice(0, 600)
        }

        // 점수 계산 + 상황 보정
        const sw = SITUATION_WEIGHTS[activeSituation]
        const scored = combos.map(outfit => {
          try {
            const result = evaluationSystem.evaluate(outfit, pc)
            const baseScore = result.total

            // 상황 보정
            let adjust = 0
            const outfitColors = Object.values(outfit)
            outfitColors.forEach(c => {
              if (sw.bonusColors.includes(c)) adjust += 3
              if (sw.penaltyColors.includes(c)) adjust -= 3
            })

            // 최근 착용 감점 (같은 상의 색상이면 -5)
            if (outfit.top && recentColors.has(outfit.top)) adjust -= 5
            if (outfit.outer && recentColors.has(outfit.outer)) adjust -= 3

            const adjustedScore = Math.min(100, Math.max(0, baseScore + adjust))
            return { outfit, score: baseScore, adjustedScore }
          } catch {
            return null
          }
        }).filter(Boolean).sort((a, b) => b.adjustedScore - a.adjustedScore)

        // 상위에서 다양성 확보: 상의 색상이 겹치지 않는 3개
        const picked: typeof scored = []
        const usedTopColors = new Set<string>()

        for (const combo of scored) {
          if (picked.length >= 3) break
          const topColor = combo.outfit.top || ''
          if (usedTopColors.has(topColor) && picked.length > 0) continue
          usedTopColors.add(topColor)
          picked.push(combo)
        }

        // 3개 못 채웠으면 나머지에서 충원
        if (picked.length < 3) {
          for (const combo of scored) {
            if (picked.length >= 3) break
            if (!picked.includes(combo)) picked.push(combo)
          }
        }

        // reason 생성
        const weatherAdvice = weather ? getLayerAdvice(weather.feels) : null
        const finalResults: TodayCoordResult[] = picked.map((combo, idx) => {
          const reasons: string[] = []

          // 날씨
          if (weatherAdvice && idx === 0) {
            reasons.push(`${weatherAdvice.emoji} ${weather!.feels}°C, ${weatherAdvice.title}`)
          }

          // 색상 이론 감지
          try {
            const theories = evaluationSystem.detectTheory(combo.outfit)
            if (theories?.length > 0) reasons.push(`🎨 ${theories[0]}`)

          } catch {}

          // 최근 미착용
          const outfitColors = Object.values(combo.outfit)
          const unusedItem = outfitColors.find(c => !recentColors.has(c))
          if (unusedItem && COLORS_60[unusedItem]) {
            reasons.push(`✨ ${getColorName(unusedItem)}`)
          }

          return {
            outfit: combo.outfit,
            score: combo.score,
            adjustedScore: combo.adjustedScore,
            reasons,
            impressionLabel: sw.impressionLabel,
          }
        })

        setResults(finalResults)
      } catch (e) {
        console.error('TodayCoord generate error:', e)
        setResults([])
      } finally {
        setLoading(false)
      }
    })
  }, [situation])

  return {
    results,
    loading,
    situation,
    setSituation,
    generate,
  }
}
