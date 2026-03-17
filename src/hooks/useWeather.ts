// @ts-nocheck
import { useState, useEffect } from 'react'
import i18n from '@/i18n'

export interface WeatherData {
  temp: number
  feels: number
  humidity: number
  wind: number
  code: number
}

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

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(() => {
    try { const c = JSON.parse(sessionStorage.getItem('_weather') || 'null'); return c } catch { return null }
  })
  const [loading, setLoading] = useState(!weather)

  useEffect(() => {
    if (weather) { setLoading(false); return }
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`)
        const data = await res.json()
        const c = data.current
        const w = { temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature), humidity: c.relative_humidity_2m, wind: Math.round(c.wind_speed_10m), code: c.weather_code }
        setWeather(w)
        sessionStorage.setItem('_weather', JSON.stringify(w))
      } catch {}
      finally { setLoading(false) }
    }, () => setLoading(false), { timeout: 5000 })
  }, [])

  return { weather, loading }
}
