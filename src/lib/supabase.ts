import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

// 개발: .env.local 또는 fallback
// 프로덕션: Vercel 환경변수
const DEV_URL = 'https://ywqaxxcvzhwhascbkyhp.supabase.co'
const DEV_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cWF4eGN2emh3aGFzY2JreWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjkwNzQsImV4cCI6MjA4ODU0NTA3NH0.J6cG4PRaG0ldNYcXzVOCAvcI1qypjmxh1NRA5Dc2tsw'

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// 프로덕션 빌드가 조용히 개발 DB에 붙는 사고를 막는다.
// - 기본: 빌드 로그에 경고 (vite.config.ts) + 런타임 콘솔 경고
// - VITE_STRICT_ENV=1 (Vercel Production 에 설정 권장): env 없으면 앱 시작 자체를 막는다
if (import.meta.env.PROD && (!envUrl || !envKey)) {
  const msg = '[BaruPick] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 미설정 — 개발 DB로 동작 중'
  if (import.meta.env.VITE_STRICT_ENV === '1') throw new Error(msg)
  console.warn(msg)
}

export const SUPABASE_URL = envUrl || DEV_URL
export const SUPABASE_ANON_KEY = envKey || DEV_KEY

// 프로덕션 감지 로그
if (typeof window !== 'undefined' && SUPABASE_URL !== DEV_URL) {
  console.log('[BaruPick] Production DB connected')
}

// 네이티브 앱(iOS/Android)용 스토리지 어댑터
// Android WebView는 프로세스 종료 시 localStorage가 날아갈 수 있으므로
// Capacitor Preferences를 사용하여 세션을 안정적으로 유지
const capacitorStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const { value } = await Preferences.get({ key })
    return value
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await Preferences.set({ key, value })
  },
  removeItem: async (key: string): Promise<void> => {
    await Preferences.remove({ key })
  },
}

const isNative = Capacitor.isNativePlatform()

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    ...(isNative && { storage: capacitorStorage }),
  },
})

// 프로덕션 전환 시 Vercel 환경변수:
// VITE_SUPABASE_URL=https://kwcogjzwpnvqwmifizce.supabase.co
// VITE_SUPABASE_ANON_KEY=<프로덕션 anon key>
