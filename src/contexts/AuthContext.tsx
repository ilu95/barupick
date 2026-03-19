import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import { trackSocialLogin, trackSignup, setAnalyticsUser } from '@/lib/analytics'


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
  socialLogin: (provider: 'kakao' | 'google' | 'apple') => Promise<void>
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
        if (!data.email && user.email) {
          supabase.from('profiles').update({ email: user.email }).eq('id', user.id)
        }
      }
    } catch (e) {
      console.warn('Profile fetch error:', e)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // user 변경 시 프로필 fetch + analytics 연동
  useEffect(() => {
    if (user) { fetchProfile(); setAnalyticsUser(user.id) }
    else setAnalyticsUser(null)
  }, [user])

  // Deep link 처리 (iOS 소셜 로그인 콜백)
  useEffect(() => {
    const handleDeepLink = async () => {
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1))
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token })
          window.location.hash = ''
        }
      }
    }
    handleDeepLink()

    // Capacitor App URL Open listener
    const setupDeepLink = async () => {
      try {
        // @ts-ignore
        const { App: CapApp } = await import('@capacitor/app') as any
        CapApp.addListener('appUrlOpen', async ({ url }: { url: string }) => {
          if (url.includes('callback') && url.includes('access_token')) {
            // SFSafariViewController 닫기
            try {
              const { Browser } = await import('@capacitor/browser')
              await Browser.close()
            } catch { }
            const hashPart = url.split('#')[1]
            if (hashPart) {
              const params = new URLSearchParams(hashPart)
              const access_token = params.get('access_token')
              const refresh_token = params.get('refresh_token')
              if (access_token && refresh_token) {
                await supabase.auth.setSession({ access_token, refresh_token })
              }
            }
          }
        })
      } catch { }
    }
    setupDeepLink()
  }, [])

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
    trackSignup()
  }

  const socialLogin = async (provider: 'kakao' | 'google' | 'apple') => {
    trackSocialLogin(provider)
    const isNative = !!(window as any).Capacitor?.isNativePlatform?.()

    if (isNative && provider === 'kakao') {
      // ── 카카오: 네이티브 SDK (카카오톡 간편인증) 전용 ──
      const cap = (window as any).Capacitor
      const kakaoPlugin = cap?.Plugins?.Capacitor3KakaoLogin
      if (!kakaoPlugin) throw new Error('KakaoTalk is not available')
      const result = await kakaoPlugin.kakaoLogin()
      const parsed = typeof result.value === 'string' ? JSON.parse(result.value) : result.value
      const idToken = parsed.idToken || parsed.id_token
      if (!idToken) throw new Error('id_token not available')
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'kakao',
        token: idToken,
      })
      if (error) throw error
      return
    }

    // ── 기존 OAuth 플로우 (웹 + fallback) ──
    if (isNative) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'https://barupick.vercel.app/auth/callback.html',
          skipBrowserRedirect: true,
        }
      })
      if (error) throw error
      if (data?.url) {
        try {
          // @capacitor/browser → iOS에서 SFSafariViewController (인앱 브라우저) 사용
          const { Browser } = await import('@capacitor/browser')
          await Browser.open({ url: data.url, presentationStyle: 'popover' })
        } catch {
          // Browser 플러그인 미설치 시 fallback
          window.location.href = data.url
        }
      }
    } else {
      // 웹: Supabase 자동 리다이렉트 (작동 확인된 방식)
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + '/home',
        }
      })
      if (error) throw error
    }
  }

  const logout = async () => {
    // 카카오 네이티브 로그아웃
    try {
      const isNative = !!(window as any).Capacitor?.isNativePlatform?.()
      if (isNative) {
        const kakaoPlugin = (window as any).Capacitor?.Plugins?.Capacitor3KakaoLogin
        if (kakaoPlugin) await kakaoPlugin.kakaoLogout()
      }
    } catch { }
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