import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

/**
 * OAuth 콜백 핸들러 (SPA 라우트)
 * - 성공: URL hash에서 access_token 추출 → 세션 설정 → /home 이동
 * - 에러: query param에서 error 추출 → 에러 안내 표시
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const hash = window.location.hash
    const search = window.location.search

    // 1) hash에 access_token이 있으면 성공
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token }).then(() => {
          navigate('/home', { replace: true })
        })
        return
      }
    }

    // 2) query param 또는 hash에 error가 있으면 에러 처리
    const searchParams = new URLSearchParams(search)
    const hashParams = new URLSearchParams(hash.substring(1))
    const errorMsg = searchParams.get('error_description') || hashParams.get('error_description')
      || searchParams.get('error') || hashParams.get('error')

    if (errorMsg) {
      setError(decodeErrorMessage(errorMsg, t))
      return
    }

    // 3) Supabase가 자동 세션 복원하는 경우 대기 후 이동
    const timeout = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          navigate('/home', { replace: true })
        } else {
          setError(t('auth.callbackFailed'))
        }
      })
    }, 2000)

    return () => clearTimeout(timeout)
  }, [])

  if (!error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-terra-300 border-t-terra-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-warm-600">{t('auth.loggingIn')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <div className="max-w-sm mx-auto pt-12">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <h2 className="font-display text-lg font-bold text-warm-900 dark:text-warm-100 mb-2">
            {t('auth.loginFailed')}
          </h2>
          <p className="text-sm text-warm-600 dark:text-warm-400 leading-relaxed whitespace-pre-line mb-8">
            {error}
          </p>
          <button
            onClick={() => navigate('/auth/login', { replace: true })}
            className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
          >
            <ArrowLeft size={16} /> {t('auth.backToLogin')}
          </button>
        </div>
      </div>
    </div>
  )
}

function decodeErrorMessage(raw: string, t: (key: string) => string): string {
  const msg = decodeURIComponent(raw).toLowerCase()
  if (msg.includes('not enabled') || msg.includes('unsupported provider')) {
    return t('auth.providerNotEnabled')
  }
  if (msg.includes('access_denied')) {
    return t('auth.accessDenied')
  }
  return t('auth.callbackFailed')
}
