// @ts-nocheck
import { useState, useCallback } from 'react'
import { COLORS_60 } from '@/lib/colors'
import { evaluationSystem } from '@/lib/evaluation'
import { profile } from '@/lib/profile'
import { useAuth } from '@/contexts/AuthContext'
import { useWeather } from '@/hooks/useWeather'
import { setJSON, StorageQuotaError } from '@/lib/storage'
import { enqueuePost } from '@/lib/postQueue'

export interface OotdRecord {
  id: string
  date: string
  colors: Record<string, string | null>
  /** Maps slot (outer, top, etc.) to item id (padding, tshirt, etc.) */
  itemTypes?: Record<string, string>
  photos: string[]
  score: number
  weather: string
  weatherData: any
  situation: string | null
  mood: string | null
  memo: string
  visibility: 'private' | 'friends' | 'public'
  showInstagram: boolean
  postId: string | null
  createdAt: number
}

const STORAGE_KEY = 'sp_ootd_records'

// 날씨 코드 → 이모지
function weatherEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 3) return '⛅'
  if (code <= 48) return '🌫️'
  if (code <= 57) return '🌧️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '❄️'
  if (code <= 82) return '🌧️'
  if (code <= 86) return '❄️'
  if (code <= 99) return '⛈️'
  return '🌤️'
}

/** Returns i18n key for weather code */
function weatherTextKey(code: number): string {
  if (code === 0) return 'clear'
  if (code <= 3) return 'partlyCloudy'
  if (code <= 48) return 'fog'
  if (code <= 57) return 'drizzle'
  if (code <= 67) return 'rain'
  if (code <= 77) return 'snow'
  if (code <= 82) return 'showers'
  if (code <= 86) return 'heavySnow'
  if (code <= 99) return 'thunderstorm'
  return 'cloudy'
}

/** @deprecated For backward compat with old Korean data */
function weatherText(code: number): string {
  if (code === 0) return '맑음'
  if (code <= 3) return '구름 조금'
  if (code <= 48) return '안개'
  if (code <= 57) return '이슬비'
  if (code <= 67) return '비'
  if (code <= 77) return '눈'
  if (code <= 82) return '소나기'
  if (code <= 86) return '폭설'
  if (code <= 99) return '뇌우'
  return '흐림'
}

export function useOotd() {
  const { user } = useAuth()
  const { weather: weatherData } = useWeather()
  const [colors, setColors] = useState<Record<string, string | null>>({
    top: null, middleware: null, bottom: null, outer: null, shoes: null, scarf: null, hat: null,
  })
  const [photos, setPhotos] = useState<string[]>([])
  const [situation, setSituation] = useState<string | null>(null)
  const [mood, setMood] = useState<string | null>(null)
  const [memo, setMemo] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'friends' | 'public'>('private')
  const [showInstagram, setShowInstagram] = useState(false)
  const [itemTypes, setItemTypes] = useState<Record<string, string>>({})
  const [openPicker, setOpenPicker] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const getRecords = useCallback((): OotdRecord[] => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      return raw.map((r: any) => {
        if (!r.id) r.id = r.date + '_' + ((r.createdAt || Date.now()).toString(36))
        return r
      })
    } catch { return [] }
  }, [])

  const selectColor = useCallback((part: string, colorKey: string) => {
    setColors(prev => ({ ...prev, [part]: colorKey }))
    setOpenPicker(null)
  }, [])

  const clearColor = useCallback((part: string) => {
    setColors(prev => ({ ...prev, [part]: null }))
  }, [])

  const addPhoto = useCallback((dataUrl: string) => {
    setPhotos(prev => prev.length < 4 ? [...prev, dataUrl] : prev)
  }, [])

  const removePhoto = useCallback((idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const replacePhoto = useCallback((idx: number, dataUrl: string) => {
    setPhotos(prev => prev.map((p, i) => i === idx ? dataUrl : p))
  }, [])

  // 점수 계산 (evaluationSystem 기반)
  const calcScore = (outfit: Record<string, string>): number => {
    const keys = Object.keys(outfit)
    if (keys.length < 2) return 0
    try {
      const pc = profile.getPersonalColor()
      const result = evaluationSystem.evaluate(outfit, pc)
      return result.total
    } catch (e) {
      console.warn('Evaluation fallback:', e)
      // 폴백: 간이 계산
      let score = 50
      score += Math.min(keys.length * 5, 25)
      return Math.min(100, Math.max(0, Math.round(score)))
    }
  }

  const saveRecord = useCallback(() => {
    const outfit: Record<string, string> = {}
    Object.entries(colors).forEach(([k, v]) => { if (v) outfit[k] = v })
    if (Object.keys(outfit).length < 2) return false

    const now = new Date()
    let dateStr: string
    if (editId) {
      const editRec = getRecords().find(r => r.id === editId)
      dateStr = editRec?.date || now.toISOString().slice(0, 10)
    } else {
      dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
    }

    const score = calcScore(outfit)

    let weatherStr = ''
    if (weatherData) {
      weatherStr = weatherEmoji(weatherData.code) + ' ' + weatherData.temp + '°C ' + weatherText(weatherData.code)
    }

    const record: OotdRecord = {
      id: editId || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
      date: dateStr,
      colors: { ...colors },
      itemTypes: Object.keys(itemTypes).length > 0 ? { ...itemTypes } : undefined,
      photos: [...photos],
      score,
      weather: weatherStr,
      weatherData: weatherData ? { ...weatherData } : null,
      situation,
      mood,
      memo,
      visibility,
      showInstagram,
      postId: null,
      createdAt: Date.now(),
    }

    const records = getRecords()
    if (editId) {
      const idx = records.findIndex(r => r.id === editId)
      if (idx >= 0) {
        record.postId = records[idx].postId
        records[idx] = record
      } else {
        records.unshift(record)
      }
    } else {
      records.unshift(record)
    }

    // 용량 초과(사진 base64 누적)면 저장 자체가 실패한다 — 호출자에게 알린다
    try {
      if (!setJSON(STORAGE_KEY, records)) return false
    } catch (e) {
      if (e instanceof StorageQuotaError) throw e
      return false
    }

    // 커뮤니티 반영은 큐로 (실패해도 잃지 않고, 재개·온라인 복귀 때 다시 시도)
    if (record.visibility !== 'private') {
      enqueuePost({ recordId: record.id, op: 'publish', visibility: record.visibility })
    } else if (record.postId) {
      enqueuePost({ recordId: record.id, op: 'private' })
    }

    // gamification
    try {
      const gd = JSON.parse(localStorage.getItem('sp_gamification') || '{}')
      if (!gd.records) gd.records = []
      gd.records.push({ date: dateStr, colors: Object.values(outfit), score })
      gd.totalXp = (gd.totalXp || 0) + 20
      localStorage.setItem('sp_gamification', JSON.stringify(gd))
    } catch {}

    return record
  }, [colors, photos, situation, mood, memo, visibility, showInstagram, editId, getRecords, weatherData, user])

  const deleteRecord = useCallback((id: string) => {
    const target = getRecords().find(r => r.id === id)
    const records = getRecords().filter(r => r.id !== id)
    try { setJSON(STORAGE_KEY, records) } catch {}
    // 공개했던 기록이면 커뮤니티 게시물도 함께 내린다 (고아 게시물 방지) — 큐로, 실패해도 재시도
    if (target?.postId) enqueuePost({ recordId: id, op: 'delete', postId: target.postId })
  }, [getRecords])

  const resetForm = useCallback(() => {
    setColors({ top: null, middleware: null, bottom: null, outer: null, shoes: null, scarf: null, hat: null })
    setItemTypes({})
    setPhotos([])
    setSituation(null)
    setMood(null)
    setMemo('')
    setVisibility('private')
    setShowInstagram(false)
    setOpenPicker(null)
    setEditId(null)
  }, [])

  // 편집 모드 시작 (#10)
  const startEdit = useCallback((record: OotdRecord) => {
    setEditId(record.id)
    const c: Record<string, string | null> = { top: null, middleware: null, bottom: null, outer: null, shoes: null, scarf: null, hat: null }
    Object.entries(record.colors || {}).forEach(([k, v]) => { if (v) c[k] = v })
    setItemTypes(record.itemTypes || {})
    setColors(c)
    setPhotos(record.photos || [])
    setSituation(record.situation)
    setMood(record.mood)
    setMemo(record.memo || '')
    setVisibility(record.visibility || 'private')
    setShowInstagram(record.showInstagram || false)
  }, [])

  const filledCount = Object.values(colors).filter(Boolean).length
  const hasBottom = !!colors.bottom
  const hasShoes = !!colors.shoes
  const hasUpperItem = Object.entries(colors).some(([k, v]) => v && k !== 'bottom' && k !== 'shoes')
  const canSave = hasBottom && hasShoes && hasUpperItem
  const needsPhoto = visibility === 'public' && photos.length === 0

  return {
    colors, photos, situation, mood, memo, visibility, showInstagram,
    itemTypes, openPicker, editId, filledCount, canSave, needsPhoto, weatherData,
    setOpenPicker, selectColor, clearColor, setItemTypes,
    addPhoto, removePhoto, replacePhoto,
    setSituation, setMood, setMemo, setVisibility, setShowInstagram,
    saveRecord, deleteRecord, resetForm, startEdit, getRecords,
    weatherEmoji, weatherText,
  }
}

export { weatherEmoji, weatherText }
