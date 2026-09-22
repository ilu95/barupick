// 기온 고르기 — 홈과 코디 카탈로그가 같은 사다리를 탄다.
// 날씨에서 받은 체감기온이 있으면 그걸 쓰고, 없으면 유저가 고른 값, 그것도 없으면 21°.
import { feelsAt, type WeatherData } from './useWeather'

export const TEMP_STEPS = [15, 21, 26]
export const DEFAULT_TEMP = 21

/** 실제 체감 → 유저가 고른 값 → 21° */
export const tempOf = (real: number | null, picked: number | null) => real ?? picked ?? DEFAULT_TEMP
/** 다음 칸 — 15 → 21 → 26 → 15 (목록 밖이면 처음으로) */
export const nextTemp = (temp: number) => { const i = TEMP_STEPS.indexOf(temp); return i < 0 || i === TEMP_STEPS.length - 1 ? TEMP_STEPS[0] : TEMP_STEPS[i + 1] }
/** 지금 이 순간의 체감기온 (날씨가 없으면 null) */
export const nowTemp = (w: WeatherData | null) => feelsAt(w, 'today', 'now')
