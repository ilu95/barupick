// @ts-nocheck
// ═══════════════════════════════════════════════════════
// useQuickRecord.ts — 원탭 코디 기록
// 전체 조합 리스트에서 "오늘 이거 입었어요" / "날짜 선택" 지원
// 기존 sp_ootd_records 포맷 호환
// ═══════════════════════════════════════════════════════
import { useCallback } from 'react'
import { evaluationSystem } from '@/lib/evaluation'
import { profile } from '@/lib/profile'

const STORAGE_KEY = 'sp_ootd_records'

function todayStr(): string {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function formatDate(date: Date): string {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
}

export function useQuickRecord() {
  // 원탭 기록: 오늘 날짜로 저장
  const recordToday = useCallback((outfit: Record<string, string>): { success: boolean; id: string; date: string } => {
    return saveRecord(outfit, todayStr())
  }, [])

  // 날짜 선택 기록
  const recordOnDate = useCallback((outfit: Record<string, string>, date: Date): { success: boolean; id: string; date: string } => {
    return saveRecord(outfit, formatDate(date))
  }, [])

  // 해당 날짜에 이미 같은 컬러 구성의 기록이 있는지 확인
  const isDuplicateOnDate = useCallback((outfit: Record<string, string>, dateStr: string): boolean => {
    try {
      const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      const outfitKey = Object.entries(outfit).filter(([_, v]) => v).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join('/')
      return records.some((r: any) => {
        if (r.date !== dateStr) return false
        const rKey = Object.entries(r.colors || {}).filter(([_, v]) => v).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join('/')
        return rKey === outfitKey
      })
    } catch { return false }
  }, [])

  // 최근 3일 기록의 컬러 키 Set (반복 감지용)
  const getRecentColorKeys = useCallback((): Set<string> => {
    try {
      const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      const threeDaysAgo = Date.now() - 3 * 86400000
      const recent = records.filter((r: any) => new Date(r.date).getTime() > threeDaysAgo)
      const keys = new Set<string>()
      recent.forEach((r: any) => {
        Object.values(r.colors || {}).forEach(c => { if (c) keys.add(c as string) })
      })
      return keys
    } catch { return new Set() }
  }, [])

  return { recordToday, recordOnDate, isDuplicateOnDate, getRecentColorKeys }
}

// ─── 내부 저장 함수 ───
function saveRecord(outfit: Record<string, string>, dateStr: string): { success: boolean; id: string; date: string } {
  try {
    const pc = profile.getPersonalColor()
    const result = evaluationSystem.evaluate(outfit, pc)
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

    // 빈 문자열 제거 (optional slot의 미착용 옵션)
    const cleanOutfit: Record<string, string> = {}
    Object.entries(outfit).forEach(([k, v]) => { if (v) cleanOutfit[k] = v })

    const record = {
      id,
      date: dateStr,
      colors: cleanOutfit,
      photos: [],
      score: result.total,
      weather: '',
      weatherData: null,
      situation: null,
      mood: null,
      memo: '',
      visibility: 'private',
      showInstagram: false,
      postId: null,
      createdAt: Date.now(),
    }

    const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')

    // 기존 useOotd와 동일하게 최신 기록을 맨 앞에 삽입
    records.unshift(record)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))

    return { success: true, id, date: dateStr }
  } catch (e) {
    console.error('QuickRecord save error:', e)
    return { success: false, id: '', date: dateStr }
  }
}
