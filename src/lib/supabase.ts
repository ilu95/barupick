import { createClient } from '@supabase/supabase-js'

// 개발: .env.local 또는 fallback
// 프로덕션: Vercel 환경변수
const DEV_URL = 'https://ywqaxxcvzhwhascbkyhp.supabase.co'
const DEV_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cWF4eGN2emh3aGFzY2JreWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjkwNzQsImV4cCI6MjA4ODU0NTA3NH0.J6cG4PRaG0ldNYcXzVOCAvcI1qypjmxh1NRA5Dc2tsw'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || DEV_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || DEV_KEY

// 프로덕션 감지 로그
if (typeof window !== 'undefined' && SUPABASE_URL !== DEV_URL) {
  console.log('[BaruPick] Production DB connected')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// 프로덕션 전환 시 Vercel 환경변수:
// VITE_SUPABASE_URL=https://kwcogjzwpnvqwmifizce.supabase.co
// VITE_SUPABASE_ANON_KEY=<프로덕션 anon key>
