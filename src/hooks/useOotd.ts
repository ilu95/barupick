// @ts-nocheck
import { useState, useCallback, useEffect } from 'react'
import { COLORS_60 } from '@/lib/colors'
import { supabase } from '@/lib/supabase'
import { evaluationSystem } from '@/lib/evaluation'
import { profile } from '@/lib/profile'

export interface OotdRecord {
  id: string
  date: string
  colors: Record<string, string | null>
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
  const [colors, setColors] = useState<Record<string, string | null>>({
    top: null, middleware: null, bottom: null, outer: null, shoes: null, scarf: null, hat: null,
  })
  const [photos, setPhotos] = useState<string[]>([])
  const [situation, setSituation] = useState<string | null>(null)
  const [mood, setMood] = useState<string | null>(null)
  const [memo, setMemo] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'friends' | 'public'>('private')
  const [showInstagram, setShowInstagram] = useState(false)
  const [openPicker, setOpenPicker] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [weatherData, setWeatherData] = useState<any>(null)

  // 날씨 자동 로드
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`)
        const data = await res.json()
        const c = data.current
        setWeatherData({ temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature), humidity: c.relative_humidity_2m, wind: Math.round(c.wind_speed_10m), code: c.weather_code })
      } catch {}
    }, () => {}, { timeout: 5000 })
  }, [])

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

    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))

    // 커뮤니티 공유 (public/friends일 때 Supabase에도 저장) (#9, #19)
    if (record.visibility !== 'private') { (async () => {
      try {
        const userId = (await supabase.auth.getUser())?.data?.user?.id
        if (userId) {
          const outfit: Record<string,string> = {}
          Object.entries(record.colors).forEach(([k,v]) => { if(v) outfit[k] = v })
          
          if (record.postId) {
            // 수정
            await supabase.from('posts').update({
              outfit, score: record.score, caption: record.memo || null,
              visibility: record.visibility, show_instagram: record.showInstagram,
            }).eq('id', record.postId)
          } else {
            // 신규
            const { data: inserted } = await supabase.from('posts').insert({
              user_id: userId, title: record.memo?.slice(0,100) || '오늘의 코디',
              outfit, score: record.score, style: null, layer_type: 'basic',
              caption: record.memo?.slice(0,200) || null, photo_urls: record.photos.length > 0 ? record.photos : null,
              status: 'approved', visibility: record.visibility,
              show_instagram: record.showInstagram, hide_counts: false,
            }).select('id').single()
            if (inserted?.id) {
              record.postId = inserted.id
              // localStorage 업데이트
              const recs = JSON.parse(localStorage.getItem('sp_ootd_records') || '[]')
              const ri = recs.findIndex((r: any) => r.id === record.id)
              if (ri >= 0) { recs[ri].postId = inserted.id; localStorage.setItem('sp_ootd_records', JSON.stringify(recs)) }
            }
          }
        }
      } catch(e) { console.warn('Community post error:', e) } })()
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
  }, [colors, photos, situation, mood, memo, visibility, showInstagram, editId, getRecords, weatherData])

  const deleteRecord = useCallback((id: string) => {
    const records = getRecords().filter(r => r.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  }, [getRecords])

  const resetForm = useCallback(() => {
    setColors({ top: null, middleware: null, bottom: null, outer: null, shoes: null, scarf: null, hat: null })
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
    setColors(c)
    setPhotos(record.photos || [])
    setSituation(record.situation)
    setMood(record.mood)
    setMemo(record.memo || '')
    setVisibility(record.visibility || 'private')
    setShowInstagram(record.showInstagram || false)
  }, [])

  const filledCount = Object.values(colors).filter(Boolean).length
  const canSave = filledCount >= 2
  const needsPhoto = visibility === 'public' && photos.length === 0

  return {
    colors, photos, situation, mood, memo, visibility, showInstagram,
    openPicker, editId, filledCount, canSave, needsPhoto, weatherData,
    setOpenPicker, selectColor, clearColor,
    addPhoto, removePhoto, replacePhoto,
    setSituation, setMood, setMemo, setVisibility, setShowInstagram,
    saveRecord, deleteRecord, resetForm, startEdit, getRecords,
    weatherEmoji, weatherText,
  }
}

export { weatherEmoji, weatherText }
