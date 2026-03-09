import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface Profile {
  id: string
  nickname: string | null
  avatar_url: string | null
  bio: string | null
  email: string | null
  instagram_id: string | null
}

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, nickname: string) => Promise<void>
  socialLogin: (provider: 'kakao' | 'google') => Promise<void>
  logout: () => Promise<void>
  fetchProfile: () => Promise<void>
  updateProfile: (data: Partial<Profile>) => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async () => {
    if (!user) return
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        // email 동기화
        if (!data.email && user.email) {
          supabase.from('profiles').update({ email: user.email }).eq('id', user.id)
        }
      }
    } catch (e) {
      console.warn('Profile fetch error:', e)
    }
  }

  useEffect(() => {
    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // user 변경 시 프로필 fetch
  useEffect(() => {
    if (user) fetchProfile()
  }, [user])

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signup = async (email: string, password: string, nickname: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname } }
    })
    if (error) throw error
  }

  const socialLogin = async (provider: 'kakao' | 'google') => {
    const isNative = !!(window as any).Capacitor?.isNativePlatform?.()
    const redirectTo = isNative
      ? 'com.barupick.app://callback'
      : window.location.origin + window.location.pathname

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        queryParams: provider === 'kakao' ? { prompt: 'login' } : {}
      }
    })
    if (error) throw error
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return
    const { error } = await supabase.from('profiles').update({ ...data, updated_at: new Date().toISOString() }).eq('id', user.id)
    if (error) throw error
    setProfile(prev => prev ? { ...prev, ...data } : null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, signup, socialLogin, logout, fetchProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
