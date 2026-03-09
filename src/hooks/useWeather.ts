// @ts-nocheck
import { useState, useEffect } from 'react'

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

export function getLayerAdvice(feels: number) {
  if (feels >= 28) return {
    layer: 'simple', emoji: '☀️', title: '한여름 코디',
    desc: '반팔 + 반바지 or 린넨 팬츠',
    detail: '얇고 통기성 좋은 소재를 선택하세요. 린넨, 코튼 저지, 시어서커가 좋아요. 밝은 컬러가 열을 덜 흡수합니다.',
    items: ['반팔 티셔츠', '린넨 셔츠', '숏팬츠', '린넨 팬츠', '샌들/슬리퍼'],
    colorTip: '화이트, 아이보리, 파스텔 톤으로 시원한 인상을',
  }
  if (feels >= 23) return {
    layer: 'simple', emoji: '🌤️', title: '초여름 코디',
    desc: '반팔 + 면바지 · 가벼운 원피스',
    detail: '낮에는 반팔, 실내 냉방 대비 얇은 가디건 하나 챙기면 완벽해요.',
    items: ['반팔 셔츠', '얇은 가디건', '코튼 치노', '면바지', '스니커즈/로퍼'],
    colorTip: '베이지 + 네이비, 화이트 + 카키 조합 추천',
  }
  if (feels >= 17) return {
    layer: 'basic', emoji: '⛅', title: '간절기 코디',
    desc: '긴팔 + 긴바지 · 가벼운 아우터',
    detail: '일교차가 큰 시기. 레이어드하기 좋은 셔츠 + 니트 조합이 활용도 높아요.',
    items: ['옥스포드 셔츠', '얇은 니트', '면바지/데님', '라이트 자켓', '로퍼/더비슈즈'],
    colorTip: '어스톤 계열 — 베이지, 카키, 올리브가 계절감에 맞아요',
  }
  if (feels >= 12) return {
    layer: 'basic', emoji: '🍂', title: '초가을 코디',
    desc: '자켓 or 가디건 + 긴바지',
    detail: '바람막이 역할을 하는 아우터가 필요해요. 맨투맨 위에 자켓을 걸치면 깔끔해요.',
    items: ['블레이저/치노 자켓', '가디건', '맨투맨', '울 팬츠', '첼시 부츠'],
    colorTip: '브라운, 테라코타, 머스타드로 가을 무드를',
  }
  if (feels >= 5) return {
    layer: 'mid_inner', emoji: '🧥', title: '겨울 코디',
    desc: '코트 + 니트 · 머플러 추천',
    detail: '보온이 중요해요. 이너는 얇게 여러 겹, 아우터는 방풍 기능 있는 걸로 선택하세요.',
    items: ['울 코트', '두꺼운 니트', '기모 팬츠', '머플러', '워커/부츠'],
    colorTip: '차콜, 네이비, 캐멀 — 겨울 클래식 3색',
  }
  if (feels >= -5) return {
    layer: 'layered', emoji: '❄️', title: '한겨울 코디',
    desc: '패딩 + 기모 · 방한 필수',
    detail: '발열 내의 → 니트/맨투맨 → 패딩의 3단 레이어링이 기본. 목, 손, 발 보온에 신경 쓰세요.',
    items: ['롱패딩/숏패딩', '기모 맨투맨', '기모 팬츠', '비니/장갑', '방한 부츠'],
    colorTip: '블랙, 네이비 베이스에 머플러로 포인트',
  }
  return {
    layer: 'layered', emoji: '🥶', title: '극한 방한',
    desc: '완전무장 · 노출 최소화',
    detail: '야외 활동을 최소화하고, 나갈 때는 얼굴까지 감싸세요. 방풍 + 방수 소재 필수.',
    items: ['헤비 패딩', '기모 내의', '방풍 바지', '넥워머', '방한화'],
    colorTip: '기능성 우선, 컬러는 자유롭게',
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
