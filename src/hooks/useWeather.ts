// ═══════════════════════════════════════════════════════
// useWeather.ts — 위치·날씨 단일 저장소
// - 앱 전체에서 위치 요청은 이 파일에서만 한다 (동시 요청은 하나로 합침)
// - 캐시는 localStorage(30분) → 앱을 껐다 켜도 다시 묻지 않는다
// - 거부(denied)는 24시간 기억하고 자동 요청을 건너뛴다. 유저가 직접 탭하면(requestWeather) 다시 시도
// - 앱 재개 시 캐시가 오래됐으면 조용히 갱신
// ═══════════════════════════════════════════════════════
import { useEffect, useSyncExternalStore } from 'react'
import i18n from '@/i18n'
import { getJSON, setJSON } from '@/lib/storage'
import { isOnline, onAppResume } from '@/lib/appLifecycle'

export interface WeatherData {
  temp: number
  feels: number
  humidity: number
  wind: number
  code: number
  /** 내일 예보 (저녁 알림·내일의 한 벌). feels = 내일 아침 체감(최저), todayMin = 오늘 아침 체감 */
  tomorrow?: { feels: number; hi: number; code: number; rain: number; todayMin: number }
  /** 시간대별(오늘 00시~내일 23시, 48개). time 은 현지 시각 문자열 그대로("2026-09-15T08:00") */
  hourly?: { time: string[]; feels: number[]; code: number[]; rain: number[] }
}

export type WeatherStatus = 'idle' | 'loading' | 'ok' | 'denied' | 'unavailable'

export function weatherEmoji(code: number): string {
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

export function weatherText(code: number): string {
  const t = i18n.t.bind(i18n)
  if (code === 0) return t('weatherText.clear')
  if (code <= 3) return t('weatherText.partlyCloudy')
  if (code <= 48) return t('weatherText.fog')
  if (code <= 57) return t('weatherText.drizzle')
  if (code <= 67) return t('weatherText.rain')
  if (code <= 77) return t('weatherText.snow')
  if (code <= 82) return t('weatherText.shower')
  if (code <= 86) return t('weatherText.heavySnow')
  if (code <= 99) return t('weatherText.thunderstorm')
  return t('weatherText.cloudy')
}

export function getLayerAdvice(feels: number) {
  const t = i18n.t.bind(i18n)
  const adviceKey = feels >= 28 ? 'hotSummer' : feels >= 23 ? 'earlySummer' : feels >= 17 ? 'midSeason' : feels >= 12 ? 'earlyFall' : feels >= 5 ? 'winter' : feels >= -5 ? 'deepWinter' : 'extreme'
  const layerMap: Record<string, string> = { hotSummer: 'simple', earlySummer: 'simple', midSeason: 'mid_inner', earlyFall: 'basic', winter: 'basic', deepWinter: 'layered', extreme: 'full' }
  const emojiMap: Record<string, string> = { hotSummer: '☀️', earlySummer: '🌤️', midSeason: '⛅', earlyFall: '🍂', winter: '🧥', deepWinter: '❄️', extreme: '🥶' }

  return {
    layer: layerMap[adviceKey],
    emoji: emojiMap[adviceKey],
    title: t(`weather.advice.${adviceKey}.title`),
    desc: t(`weather.advice.${adviceKey}.desc`),
    detail: t(`weather.advice.${adviceKey}.detail`),
    items: t(`weather.advice.${adviceKey}.items`, { returnObjects: true }) as string[],
    colorTip: t(`weather.advice.${adviceKey}.colorTip`),
  }
}

// ── 저장소 ──
const CACHE_KEY = 'bp_weather'        // { w, ts }
const DENIED_KEY = 'bp_geo_denied'    // 거부 시각(ms)
const TTL_MS = 30 * 60 * 1000
const DENIED_MEMO_MS = 24 * 60 * 60 * 1000
const GEO_TIMEOUT_MS = 8000

interface Cached { w: WeatherData; ts: number }
interface Store { weather: WeatherData | null; status: WeatherStatus; ts: number }

const cached = getJSON<Cached | null>(CACHE_KEY, null)
let store: Store = { weather: cached?.w ?? null, status: cached ? 'ok' : 'idle', ts: cached?.ts ?? 0 }
const listeners = new Set<() => void>()
let inflight: Promise<WeatherData | null> | null = null

function emit(next: Partial<Store>) {
  store = { ...store, ...next }
  listeners.forEach(l => l())
}
function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } }
function snapshot() { return store }

function isFresh() { return !!store.weather && Date.now() - store.ts < TTL_MS }
function deniedRecently() { return Date.now() - getJSON<number>(DENIED_KEY, 0) < DENIED_MEMO_MS }

const ymdOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** 옛 모양(hourly 없음) 이거나 hourly 가 오늘이 아닌 날짜로 시작하면(캐시가 날짜를 넘겨 묵음) 못 쓰는 자료다.
 *  기기 현지 날짜와 문자열로 비교한다 — new Date() 로 문자열을 파싱하면 타임존에 따라 하루씩 밀릴 수 있다. */
function isUsable(w: WeatherData | null): boolean {
  if (!w?.hourly?.time.length) return false
  return w.hourly.time[0].slice(0, 10) === ymdOf(new Date())
}

/** 다시 안 받아도 되는 자료인지 — 신선하고(isFresh) 쓸 수 있어야(isUsable) 한다 */
export function isGood() { return isFresh() && isUsable(store.weather) }

export async function permissionState(): Promise<PermissionState | 'unknown'> {
  try {
    if (!navigator.permissions?.query) return 'unknown'
    const p = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
    return p.state
  } catch { return 'unknown' }
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) { rej(Object.assign(new Error('no geolocation'), { code: 2 })); return }
    navigator.geolocation.getCurrentPosition(res, rej, { timeout: GEO_TIMEOUT_MS, maximumAge: 10 * 60 * 1000 })
  })
}

async function fetchOpenMeteo(lat: number, lon: number): Promise<WeatherData> {
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=apparent_temperature_max,apparent_temperature_min,weather_code,precipitation_probability_max&hourly=apparent_temperature,weather_code,precipitation_probability&forecast_days=2&timezone=auto`)
  const data = await res.json()
  const c = data.current
  const w: WeatherData = { temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature), humidity: c.relative_humidity_2m, wind: Math.round(c.wind_speed_10m), code: c.weather_code }
  try {
    const d = data.daily
    if (d && d.apparent_temperature_min && d.apparent_temperature_min.length >= 2) {
      w.tomorrow = { feels: Math.round(d.apparent_temperature_min[1]), hi: Math.round(d.apparent_temperature_max[1]), code: d.weather_code[1], rain: Math.round(d.precipitation_probability_max?.[1] ?? 0), todayMin: Math.round(d.apparent_temperature_min[0]) }
    }
  } catch {}
  try {
    const h = data.hourly
    if (h && h.time && h.time.length) {
      w.hourly = { time: h.time, feels: h.apparent_temperature, code: h.weather_code, rain: h.precipitation_probability }
    }
  } catch {}
  return w
}

const slot = (ymd: string, h: number) => `${ymd}T${String(h).padStart(2, '0')}:00`

/** 오늘/내일의 실제 달력 날짜 문자열 — h.time[0]/[24] 인덱스는 캐시가 날짜를 넘기면 틀린 날을 가리킨다 */
function dayYmd(day: 'today' | 'tomorrow'): string {
  const d = new Date()
  if (day === 'tomorrow') d.setDate(d.getDate() + 1)
  return ymdOf(d)
}

function hourIndex(w: WeatherData | null, day: 'today' | 'tomorrow', hour: number): number {
  const h = w?.hourly
  if (!h || !h.time.length) return -1
  return h.time.indexOf(slot(dayYmd(day), hour))
}

/** 고른 날짜/시간의 체감기온. 시간별 자료가 없으면 null — 화면이 기존 대비책(TEMP_STEPS)으로 넘어간다 */
export function feelsAt(w: WeatherData | null, day: 'today' | 'tomorrow', hour: number | 'now'): number | null {
  if (!w) return null
  if (hour === 'now') return day === 'today' ? w.feels : (w.tomorrow?.feels ?? null)
  const i = hourIndex(w, day, hour)
  return i < 0 ? null : Math.round(w!.hourly!.feels[i])
}

/** 고른 날짜/시간의 날씨 코드(아이콘용). 시간별 자료가 없으면 null */
export function codeAt(w: WeatherData | null, day: 'today' | 'tomorrow', hour: number | 'now'): number | null {
  if (!w) return null
  if (hour === 'now') return day === 'today' ? w.code : (w.tomorrow?.code ?? null)
  const i = hourIndex(w, day, hour)
  return i < 0 ? null : w!.hourly!.code[i]
}

/** 그날 08~20시 체감기온의 최저·최고 */
export function dayRange(w: WeatherData | null, day: 'today' | 'tomorrow'): { lo: number; hi: number } | null {
  const h = w?.hourly
  if (!h || !h.time.length) return null
  const ymd = dayYmd(day)
  const vals: number[] = []
  for (let hr = 8; hr <= 20; hr++) {
    const i = h.time.indexOf(slot(ymd, hr))
    if (i >= 0) vals.push(h.feels[i])
  }
  if (!vals.length) return null
  return { lo: Math.round(Math.min(...vals)), hi: Math.round(Math.max(...vals)) }
}

/**
 * 날씨 갱신. force=false면 캐시가 신선하거나 최근 거부했으면 아무것도 안 한다.
 * 동시에 여러 화면이 불러도 위치 요청은 한 번만 나간다.
 */
export function refreshWeather(force = false): Promise<WeatherData | null> {
  if (inflight) return inflight
  if (!force && isGood()) return Promise.resolve(store.weather)
  if (!isOnline()) return Promise.resolve(store.weather)
  if (!force && deniedRecently()) { if (store.status !== 'ok') emit({ status: 'denied' }); return Promise.resolve(store.weather) }

  inflight = (async () => {
    emit({ status: store.weather ? store.status : 'loading' })
    try {
      const perm = await permissionState()
      if (perm === 'denied' && !force) {
        setJSON(DENIED_KEY, Date.now())
        emit({ status: 'denied' })
        return store.weather
      }
      const pos = await getPosition()
      const w = await fetchOpenMeteo(pos.coords.latitude, pos.coords.longitude)
      const ts = Date.now()
      setJSON(CACHE_KEY, { w, ts })
      try { localStorage.removeItem(DENIED_KEY) } catch {}
      emit({ weather: w, status: 'ok', ts })
      return w
    } catch (e) {
      if ((e as { code?: number })?.code === 1) { // PERMISSION_DENIED
        setJSON(DENIED_KEY, Date.now())
        emit({ status: 'denied' })
      } else {
        emit({ status: store.weather ? 'ok' : 'unavailable' })
      }
      return store.weather
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/** 유저가 직접 "날씨 보기"를 눌렀을 때 — 거부 기억을 무시하고 다시 시도 */
export function requestWeather() { return refreshWeather(true) }

// 앱 재개 시 오래된 캐시는 조용히 갱신 (권한은 이미 허용된 경우에만 실제 요청이 나간다)
let resumeHooked = false
function hookResume() {
  if (resumeHooked || typeof window === 'undefined') return
  resumeHooked = true
  onAppResume(() => { if (!isGood()) refreshWeather(false) })
}

/**
 * 날씨 구독. 마운트 시 캐시가 오래됐으면 갱신한다.
 * 반환값의 loading은 "아직 보여줄 날씨가 하나도 없고 가져오는 중"일 때만 true.
 */
export function useWeather(opts: { auto?: boolean } = {}) {
  const auto = opts.auto !== false
  const s = useSyncExternalStore(subscribe, snapshot, snapshot)
  useEffect(() => { hookResume(); if (auto) refreshWeather(false) }, [auto])
  return {
    weather: s.weather,
    status: s.status,
    loading: !s.weather && s.status === 'loading',
    /** 위치 권한이 거부돼 날씨를 못 가져오는 상태 */
    denied: !s.weather && s.status === 'denied',
    refresh: requestWeather,
  }
}

/** 렌더 없이 현재 값만 필요할 때 (기록 저장 등) */
export function getWeatherNow(): WeatherData | null { return store.weather }

